#!/usr/bin/env node
/**
 * Creează în GHL tot ce cere configul unui client: custom fields, tag-uri,
 * custom values. Idempotent — ce există deja nu se recreează.
 *
 *   GHL_PIT=... GHL_LOCATION_ID_DOR_TRAVEL=... node scripts/provision-ghl.mjs dor-travel --dry-run
 *   GHL_PIT=... GHL_LOCATION_ID_DOR_TRAVEL=... node scripts/provision-ghl.mjs dor-travel --apply
 *
 * Fără --apply rulează în dry-run: afișează planul, nu scrie nimic.
 * Token-ul vine EXCLUSIV din mediu; nu se citește și nu se scrie niciodată în config.
 */

import { loadConfig } from './lib/config.mjs';
import { buildProvisionPlan } from '../n8n/runtime/provision.mjs';
import { GhlClient } from './lib/ghl.mjs';

const args = process.argv.slice(2);
const clientId = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const verbose = args.includes('--verbose');

if (!clientId) {
  console.error('Utilizare: node scripts/provision-ghl.mjs <client-id> [--apply] [--verbose]');
  process.exit(2);
}

const config = loadConfig(clientId);
// Tokenul vine doar din mediu. Id-ul sub-contului nu e secret, deci configul
// poate servi ca sursă de rezervă — util când rulezi provisioning-ul de pe altă mașină.
const token = process.env.GHL_PIT || process.env[config.integrations.ghl.token_env];
const locationId = process.env[config.integrations.ghl.location_id_env] || config.integrations.ghl.location_id;

if (!token) {
  console.error(`Lipsește tokenul. Setează GHL_PIT sau ${config.integrations.ghl.token_env}.`);
  console.error(`Emite un Private Integration Token pe sub-contul GHL, cu scopurile:\n  ${config.integrations.ghl.required_pit_scopes.join('\n  ')}`);
  process.exit(2);
}
if (!locationId) {
  console.error(`Lipsește id-ul sub-contului: nici ${config.integrations.ghl.location_id_env} în mediu, nici integrations.ghl.location_id în config.`);
  process.exit(2);
}

const ghl = new GhlClient({
  token,
  locationId,
  apiBase: config.integrations.ghl.api_base,
  apiVersions: config.integrations.ghl.api_versions,
  log: (m) => verbose && console.log(m),
});

/**
 * Planul se calculează cu aceeași funcție pe care o folosește și workflow-ul
 * „WF_SETUP · Provisioning GHL" din n8n. Un singur loc de întreținut, același
 * rezultat indiferent cine ajunge la API.
 */
async function readExisting() {
  const [customFields, tags, customValues] = await Promise.all([
    ghl.listCustomFields(),
    ghl.listTags(),
    ghl.listCustomValues(),
  ]);
  return {
    customFields: customFields?.customFields || [],
    tags: tags?.tags || [],
    customValues: customValues?.customValues || [],
  };
}

function describe(operation) {
  return `  ${operation.kind.padEnd(13)} ${operation.label}${operation.detail ? `  — ${operation.detail}` : ''}`;
}

try {
  console.log(`${apply ? 'APLIC' : 'DRY-RUN'} · client "${clientId}" · location ${locationId}\n`);

  const existing = await readExisting();
  const { operations, conflicts, summary } = buildProvisionPlan({ config, existing });

  for (const action of ['create', 'update']) {
    const items = operations.filter((o) => o.action === action);
    if (!items.length) continue;
    console.log(`${action === 'create' ? 'DE CREAT' : 'DE ACTUALIZAT'} (${items.length}):`);
    const show = verbose ? items : items.slice(0, 8);
    for (const item of show) console.log(describe(item));
    if (show.length < items.length) console.log(`  … și încă ${items.length - show.length} (--verbose pentru toate)`);
    console.log('');
  }

  if (conflicts.length) {
    console.log(`CONFLICTE (${conflicts.length}) — de rezolvat manual în GHL:`);
    for (const c of conflicts) console.log(describe({ ...c, action: 'conflict' }));
    console.log('');
  }

  console.log(`Rezumat: ${summary.to_create} de creat · ${summary.to_update} de actualizat · ${summary.unchanged} neschimbate · ${summary.conflicts} conflicte`);
  console.log(`  custom fields: +${summary.custom_fields.create} ~${summary.custom_fields.update}`);
  console.log(`  tag-uri:       +${summary.tags.create}`);
  console.log(`  custom values: +${summary.custom_values.create} ~${summary.custom_values.update}\n`);

  if (!apply) {
    console.log('Nimic nu a fost scris. Rulează din nou cu --apply.');
    process.exit(conflicts.length ? 1 : 0);
  }

  let done = 0;
  for (const operation of operations) {
    // Secvențial, nu în paralel: GHL are rate limits, iar un 429 la mijlocul
    // provisioning-ului lasă sub-contul într-o stare greu de citit.
    await ghl.request(operation.method, operation.path.replace('{locationId}', locationId), { body: operation.body });
    done++;
    if (done % 20 === 0) console.log(`  … ${done}/${operations.length}`);
  }
  console.log(`\n✓ ${done} operațiuni aplicate.`);
  if (conflicts.length) console.log(`⚠ ${conflicts.length} conflicte rămân de rezolvat manual.`);
  process.exit(conflicts.length ? 1 : 0);
} catch (error) {
  console.error(`\n✗ ${error.name}: ${error.message}`);
  if (error.status === 401) console.error('  Token invalid sau expirat.');
  if (error.status === 403) console.error('  Token valid, dar fără scopul necesar. Verifică required_pit_scopes din config.');
  if (error.status === 422) console.error('  Payload respins. Cel mai des: header-ul Version lipsă/greșit sau dataType nepermis.');
  if (error.body) console.error(`  Corp: ${JSON.stringify(error.body).slice(0, 500)}`);
  process.exit(1);
}
