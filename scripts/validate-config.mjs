#!/usr/bin/env node
/**
 * Validează configurația unui client înainte de provisioning.
 *
 *   node scripts/validate-config.mjs dor-travel
 *   node scripts/validate-config.mjs --all
 *
 * Ieșire: 0 = valid, 1 = erori. Avertismentele (TODO/TBD necompletate, volum de
 * conținut de revizuit) nu blochează, dar se raportează — sunt exact lucrurile
 * care trebuie confirmate cu clientul înainte de go-live.
 */

import { validate } from './lib/jsonschema.mjs';
import {
  loadConfig, loadSchema, listClientIds,
  deriveAllTags, deriveCustomFields, deriveContentCells, deriveCustomValues,
} from './lib/config.mjs';

const SECRET_PATTERNS = [
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{10,}/ },
  { name: 'GHL PIT', re: /\bpit-[0-9a-f-]{20,}/i },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./ },
  { name: 'Twilio SID', re: /\bAC[0-9a-f]{32}\b/i },
  { name: 'Bearer inline', re: /Bearer\s+[A-Za-z0-9._-]{20,}/ },
];

function checkConfig(clientId) {
  const config = loadConfig(clientId);
  const errors = [];
  const warnings = [];

  // 1. Schema
  errors.push(...validate(loadSchema(), config).map((e) => `[schema] ${e}`));

  // 2. Niciun secret în config. Credențialele trăiesc doar în credential store-ul n8n.
  const raw = JSON.stringify(config);
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(raw)) errors.push(`[secrete] configul pare să conțină un ${name}. Mută-l în credential store-ul n8n / variabile de mediu.`);
  }

  // 3. Integritate taxonomie ↔ custom fields
  let fields = [];
  try {
    fields = deriveCustomFields(config);
  } catch (e) {
    errors.push(`[taxonomie] ${e.message}`);
  }
  const fieldKeys = new Set(config.custom_fields.map((f) => f.key));
  for (const [axisName, axis] of Object.entries(config.taxonomy.axes)) {
    if (!fieldKeys.has(axis.field_key)) {
      errors.push(`[taxonomie] axa "${axisName}" trimite la field_key "${axis.field_key}", care nu există în custom_fields`);
    }
    const seen = new Set();
    for (const v of axis.values) {
      if (seen.has(v.key)) errors.push(`[taxonomie] axa "${axisName}" are cheia duplicată "${v.key}"`);
      seen.add(v.key);
    }
  }

  // 4. Coliziuni de tag-uri (două axe cu prefixe care se suprapun produc segmentare greșită)
  const tagCounts = new Map();
  for (const t of deriveAllTags(config)) tagCounts.set(t.tag, (tagCounts.get(t.tag) || 0) + 1);
  for (const [tag, count] of tagCounts) {
    if (count > 1) errors.push(`[tag-uri] tag-ul "${tag}" este generat de ${count} surse diferite`);
  }

  // 5. Conformitate: fiecare canal folosit de un flux are câmp de consimțământ și tag de opt-out
  const usedChannels = new Set();
  for (const flow of Object.values(config.flows)) {
    for (const step of flow.steps || []) if (step.channel !== 'task') usedChannels.add(step.channel);
  }
  for (const channel of usedChannels) {
    const consent = config.compliance.consent_fields[channel];
    if (!consent) {
      errors.push(`[conformitate] canalul "${channel}" e folosit de fluxuri, dar nu are consent_fields definit`);
    } else if (!fieldKeys.has(consent.flag)) {
      errors.push(`[conformitate] consent_fields.${channel}.flag = "${consent.flag}" nu există în custom_fields`);
    }
    if (!config.compliance.optout_tags[channel]) {
      errors.push(`[conformitate] canalul "${channel}" nu are tag de opt-out`);
    }
  }

  // 6. Fluxuri
  const flowIds = new Set(Object.keys(config.flows));
  for (const [flowId, flow] of Object.entries(config.flows)) {
    for (const axisName of [...(flow.segmented_by || []), ...(flow.content_varies_by || [])]) {
      if (!config.taxonomy.axes[axisName]) errors.push(`[flux:${flowId}] trimite la axa inexistentă "${axisName}"`);
    }
    for (const axisName of flow.content_varies_by || []) {
      if (!(flow.segmented_by || []).includes(axisName)) {
        errors.push(`[flux:${flowId}] content_varies_by conține "${axisName}", care nu e în segmented_by`);
      }
    }
    // Regula din brief: nicio comunicare generală către segmente comerciale.
    // Se aplică fluxurilor de tip difuzare (campanie manuală sau cron pe toată
    // baza), nu celor declanșate de o dată proprie fiecărui contact
    // (aniversare, inactivitate) — acelea sunt deja 1:1.
    const isBroadcast = ['manual_campaign', 'cron'].includes(flow.trigger.type);
    if (flow.enabled && flow.kind === 'commercial' && isBroadcast && (flow.segmented_by || []).length === 0) {
      errors.push(`[flux:${flowId}] flux comercial de difuzare fără segmentare — regula din brief interzice comunicări generale către segmente comerciale`);
    }
    for (const step of flow.steps || []) {
      if (step.channel === 'whatsapp' && flow.enabled && !config.integrations.whatsapp.enabled) {
        warnings.push(`[flux:${flowId}/${step.id}] folosește WhatsApp, dar integrations.whatsapp.enabled = false — pasul va fi sărit la runtime`);
      }
      if (step.channel !== 'task' && !step.template) {
        errors.push(`[flux:${flowId}/${step.id}] pas fără template`);
      }
    }
    if (flow.enabled && (flow.steps || []).length === 0) {
      errors.push(`[flux:${flowId}] activ, dar fără pași${flow.blocked_by ? ` (blocat de: ${flow.blocked_by})` : ''}`);
    }
  }
  for (const list of ['commercial_flow_ids', 'exclusive_flow_ids']) {
    for (const id of config.sending_rules.suppression[list]) {
      if (!flowIds.has(id)) errors.push(`[suprimare] ${list} conține fluxul inexistent "${id}"`);
    }
  }
  const overlap = config.sending_rules.suppression.commercial_flow_ids
    .filter((id) => config.sending_rules.suppression.exclusive_flow_ids.includes(id));
  if (overlap.length) errors.push(`[suprimare] fluxuri și comerciale și exclusive: ${overlap.join(', ')}`);

  // Un flux marcat exclusive trebuie să fie și în lista de suprimare, altfel garda nu-l vede.
  for (const [flowId, flow] of Object.entries(config.flows)) {
    if (flow.exclusive && !config.sending_rules.suppression.exclusive_flow_ids.includes(flowId)) {
      errors.push(`[suprimare] fluxul "${flowId}" e marcat exclusive, dar lipsește din suppression.exclusive_flow_ids`);
    }
    if (flow.kind === 'commercial' && flow.enabled && !config.sending_rules.suppression.commercial_flow_ids.includes(flowId)) {
      warnings.push(`[suprimare] fluxul comercial "${flowId}" nu e în commercial_flow_ids — nu va fi suprimat în timpul vacanței`);
    }
  }

  // 7. Raportul de conținut trebuie să însumeze 1
  const mixSum = Object.values(config.content.mix_targets).reduce((a, b) => a + b, 0);
  if (Math.abs(mixSum - 1) > 0.001) {
    errors.push(`[conținut] mix_targets însumează ${mixSum.toFixed(2)}, trebuie 1.00`);
  }

  // 8. Merge fields: regexurile de conținut interzis trebuie să compileze
  for (const pattern of config.content.forbidden_in_generated.patterns) {
    try { new RegExp(pattern, 'u'); } catch (e) { errors.push(`[conținut] regex invalid "${pattern}": ${e.message}`); }
  }
  for (const mf of config.merge_fields) {
    if (mf.fallback_strategy === 'value' && (mf.fallback_value === undefined || mf.fallback_value === '')) {
      errors.push(`[merge] "${mf.token}" are strategia "value" fără fallback_value`);
    }
    if (mf.fallback_strategy === 'alternate_line' && !mf.alternate_line) {
      errors.push(`[merge] "${mf.token}" are strategia "alternate_line" fără alternate_line`);
    }
  }

  // 9. Custom values rezolvabile
  for (const cv of deriveCustomValues(config)) {
    if (cv.value === null) errors.push(`[custom_values] "${cv.key}" trimite la calea nerezolvabilă "${cv.from}"`);
  }

  // 10. Consultanți
  const activeConsultants = config.consultants.list.filter((c) => c.active);
  if (activeConsultants.length === 0) errors.push('[consultanți] niciun consultant activ — task-urile nu au cui fi alocate');

  // ---- Avertismente: ce mai e de confirmat cu clientul ----
  const todos = [];
  (function scan(node, pathStr) {
    if (typeof node === 'string') {
      if (/^TBD|^TODO|TBD —|TODO —/.test(node)) todos.push(pathStr);
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) scan(v, `${pathStr}.${k}`);
    }
  })(config, '$');
  if (todos.length) warnings.push(`[necompletat] ${todos.length} valori TBD/TODO: ${todos.slice(0, 12).join(', ')}${todos.length > 12 ? ', …' : ''}`);

  if (!config.integrations.email.dns_verified) warnings.push('[email] dns_verified = false — SPF/DKIM/DMARC neconfirmate, nu porni campanii de volum');
  if (!config.booking.deposit_percent_confirmed) warnings.push('[rezervare] deposit_percent neconfirmat de client');
  if (!config.booking.final_payment_days_confirmed) warnings.push('[rezervare] final_payment_days_before_departure neconfirmat de client');

  let cells = [];
  try { cells = deriveContentCells(config); } catch (e) { errors.push(`[conținut] ${e.message}`); }
  const pieces = cells.length * config.content.generation.variants_per_cell;
  if (pieces > 600) warnings.push(`[conținut] ${pieces} texte de revizuit uman — redu content_varies_by sau variants_per_cell`);

  return { config, errors, warnings, stats: {
    tags: deriveAllTags(config).length,
    custom_fields: fields.length,
    custom_values: (config.custom_values || []).length,
    flows_enabled: Object.values(config.flows).filter((f) => f.enabled).length,
    flows_total: Object.keys(config.flows).length,
    content_cells: cells.length,
    content_pieces: pieces,
  } };
}

const args = process.argv.slice(2);
const ids = args.includes('--all') ? listClientIds() : args.filter((a) => !a.startsWith('--'));
if (ids.length === 0) {
  console.error('Utilizare: node scripts/validate-config.mjs <client-id> | --all');
  process.exit(2);
}

let failed = false;
for (const id of ids) {
  let result;
  try {
    result = checkConfig(id);
  } catch (e) {
    console.error(`\n✗ ${id}: ${e.message}`);
    failed = true;
    continue;
  }
  const { errors, warnings, stats } = result;
  console.log(`\n── ${id} ──`);
  console.log(`   ${stats.custom_fields} custom fields · ${stats.tags} tag-uri · ${stats.custom_values} custom values`);
  console.log(`   ${stats.flows_enabled}/${stats.flows_total} fluxuri active · ${stats.content_cells} celule de conținut (${stats.content_pieces} texte de revizuit)`);
  for (const w of warnings) console.log(`   ! ${w}`);
  for (const e of errors) console.log(`   ✗ ${e}`);
  if (errors.length) { failed = true; console.log(`   ✗ ${errors.length} erori`); }
  else console.log('   ✓ configurație validă');
}
process.exit(failed ? 1 : 0);
