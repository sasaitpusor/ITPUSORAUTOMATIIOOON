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

import { loadConfig, deriveAllTags, deriveCustomFields, deriveCustomValues } from './lib/config.mjs';
import { GhlClient, norm } from './lib/ghl.mjs';

const args = process.argv.slice(2);
const clientId = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const verbose = args.includes('--verbose');

if (!clientId) {
  console.error('Utilizare: node scripts/provision-ghl.mjs <client-id> [--apply] [--verbose]');
  process.exit(2);
}

const config = loadConfig(clientId);
const token = process.env.GHL_PIT;
const locationId = process.env[config.integrations.ghl.location_id_env];

if (!token) {
  console.error(`Lipsește GHL_PIT. Emite un Private Integration Token cu scopurile:\n  ${config.integrations.ghl.required_pit_scopes.join('\n  ')}`);
  process.exit(2);
}
if (!locationId) {
  console.error(`Lipsește variabila de mediu ${config.integrations.ghl.location_id_env} (id-ul sub-contului GHL).`);
  process.exit(2);
}

const ghl = new GhlClient({
  token,
  locationId,
  apiBase: config.integrations.ghl.api_base,
  apiVersions: config.integrations.ghl.api_versions,
  log: (m) => verbose && console.log(m),
});

const plan = { create: [], update: [], skip: [] };
const record = (kind, action, label, detail) => plan[action].push({ kind, label, detail });

async function provisionCustomFields() {
  const wanted = deriveCustomFields(config);
  const existing = (await ghl.listCustomFields())?.customFields || [];
  const byName = new Map(existing.map((f) => [norm(f.name), f]));

  for (const field of wanted) {
    const current = byName.get(norm(field.name));
    const payload = {
      name: field.name,
      dataType: field.dataType,
      ...(field.options?.length ? { options: field.options } : {}),
    };

    if (!current) {
      record('custom_field', 'create', field.name, `${field.dataType}${field.options?.length ? ` (${field.options.length} opțiuni)` : ''}`);
      if (apply) await ghl.createCustomField(payload);
      continue;
    }

    // Opțiunile se schimbă des (o destinație nouă în config). Tipul, nu — o
    // schimbare de dataType pe un câmp populat pierde date, deci se raportează
    // ca de rezolvat manual, nu se aplică automat.
    if (norm(current.dataType) !== norm(field.dataType)) {
      record('custom_field', 'skip', field.name, `CONFLICT: în GHL e ${current.dataType}, configul cere ${field.dataType} — rezolvă manual`);
      continue;
    }

    const currentOptions = (current.picklistOptions || current.options || []).map(norm).sort();
    const wantedOptions = (field.options || []).map(norm).sort();
    if (JSON.stringify(currentOptions) !== JSON.stringify(wantedOptions) && wantedOptions.length) {
      record('custom_field', 'update', field.name, `opțiuni: ${currentOptions.length} → ${wantedOptions.length}`);
      if (apply) await ghl.updateCustomField(current.id, payload);
    } else {
      record('custom_field', 'skip', field.name, 'există, la zi');
    }
  }
}

async function provisionTags() {
  const wanted = deriveAllTags(config);
  const existing = (await ghl.listTags())?.tags || [];
  const have = new Set(existing.map((t) => norm(t.name)));

  for (const tag of wanted) {
    if (have.has(norm(tag.tag))) {
      record('tag', 'skip', tag.tag, 'există');
      continue;
    }
    record('tag', 'create', tag.tag, tag.label);
    if (apply) await ghl.createTag(tag.tag);
  }
}

async function provisionCustomValues() {
  const wanted = deriveCustomValues(config);
  const existing = (await ghl.listCustomValues())?.customValues || [];
  const byName = new Map(existing.map((v) => [norm(v.name), v]));

  for (const cv of wanted) {
    const current = byName.get(norm(cv.key));
    if (!current) {
      record('custom_value', 'create', cv.key, cv.value);
      if (apply) await ghl.createCustomValue(cv.key, cv.value);
    } else if (String(current.value) !== String(cv.value)) {
      record('custom_value', 'update', cv.key, `"${current.value}" → "${cv.value}"`);
      if (apply) await ghl.updateCustomValue(current.id, cv.key, cv.value);
    } else {
      record('custom_value', 'skip', cv.key, 'la zi');
    }
  }
}

try {
  console.log(`${apply ? 'APLIC' : 'DRY-RUN'} · client "${clientId}" · location ${locationId}\n`);
  await provisionCustomFields();
  await provisionTags();
  await provisionCustomValues();

  for (const action of ['create', 'update', 'skip']) {
    const items = plan[action];
    if (!items.length) continue;
    const label = { create: 'DE CREAT', update: 'DE ACTUALIZAT', skip: 'NESCHIMBAT' }[action];
    console.log(`${label} (${items.length}):`);
    const show = action === 'skip' && !verbose ? items.slice(0, 5) : items;
    for (const i of show) console.log(`  ${i.kind.padEnd(13)} ${i.label}${i.detail ? `  — ${i.detail}` : ''}`);
    if (show.length < items.length) console.log(`  … și încă ${items.length - show.length} (--verbose pentru toate)`);
    console.log('');
  }

  const conflicts = plan.skip.filter((i) => String(i.detail).startsWith('CONFLICT'));
  if (conflicts.length) {
    console.log(`⚠ ${conflicts.length} conflicte de tip de câmp — rezolvă-le manual în GHL înainte de go-live.`);
  }
  if (!apply) console.log('Nimic nu a fost scris. Rulează din nou cu --apply.');
  process.exit(conflicts.length ? 1 : 0);
} catch (error) {
  console.error(`\n✗ ${error.name}: ${error.message}`);
  if (error.status === 401) console.error('  Token invalid sau expirat.');
  if (error.status === 403) console.error('  Token valid, dar fără scopul necesar. Verifică required_pit_scopes din config.');
  if (error.status === 422) console.error('  Payload respins. Cel mai des: header-ul Version lipsă/greșit sau dataType nepermis.');
  if (error.body) console.error(`  Corp: ${JSON.stringify(error.body).slice(0, 500)}`);
  process.exit(1);
}
