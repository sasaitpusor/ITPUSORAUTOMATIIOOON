#!/usr/bin/env node
/**
 * Generează docs/01-ghl-schema-si-taguri.md din configul clientului.
 *
 *   node scripts/gen-docs.mjs dor-travel
 *
 * Documentul e generat, nu scris de mână, ca lista de custom fields și tag-uri
 * să nu poată diverge de ce creează efectiv scripts/provision-ghl.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig, deriveCustomFields, deriveAxisTags, deriveSystemTags, deriveCustomValues, deriveContentCells } from './lib/config.mjs';

const clientId = process.argv[2];
if (!clientId) {
  console.error('Utilizare: node scripts/gen-docs.mjs <client-id>');
  process.exit(2);
}

const config = loadConfig(clientId);
const fields = deriveCustomFields(config);
const axisTags = deriveAxisTags(config);
const systemTags = deriveSystemTags(config);
const customValues = deriveCustomValues(config);
const cells = deriveContentCells(config);

const groups = [...new Set(fields.map((f) => f.group || 'Fără grup'))];
const lines = [];
const w = (s = '') => lines.push(s);

w(`# Schema GHL — custom fields și tag-uri`);
w();
w(`> Generat din \`config/clients/${clientId}.json\` de \`scripts/gen-docs.mjs\`. **Nu edita manual** — modifică`);
w(`> configul și regenerează cu \`npm run docs -- ${clientId}\`.`);
w();
w(`Client: **${config.client.agency_name}** · produs: *${config.client.product_name}* · fus orar: \`${config.client.timezone}\``);
w();
w(`| | |`);
w(`|---|---|`);
w(`| Custom fields | ${fields.length} |`);
w(`| Tag-uri de segmentare | ${axisTags.length} |`);
w(`| Tag-uri de sistem | ${systemTags.length} |`);
w(`| Custom values | ${customValues.length} |`);
w(`| Fluxuri active | ${Object.values(config.flows).filter((f) => f.enabled).length} din ${Object.keys(config.flows).length} |`);
w(`| Celule de conținut de generat | ${cells.length} (× ${config.content.generation.variants_per_cell} variante = ${cells.length * config.content.generation.variants_per_cell} texte de revizuit) |`);
w();

w(`## 1. Custom fields`);
w();
w(`Se creează automat cu \`npm run provision -- ${clientId} --apply\`. Opțiunile câmpurilor de tip`);
w(`select se derivă din axele de taxonomie — nu se scriu de două ori.`);
for (const group of groups) {
  w();
  w(`### ${group}`);
  w();
  w(`| Cheie | Nume în GHL | Tip | Opțiuni |`);
  w(`|---|---|---|---|`);
  for (const f of fields.filter((x) => (x.group || 'Fără grup') === group)) {
    const opts = f.options?.length ? f.options.join(' · ') : '—';
    w(`| \`${f.key}\` | ${f.name} | ${f.dataType} | ${opts} |`);
  }
}
w();

w(`## 2. Tag-uri de segmentare`);
w();
w(`Convenție: prefix pe axă, \`lower_snake\`. Prefixul permite filtrare programatică`);
w(`(«toate tag-urile care încep cu \`dest_\`») fără liste hardcodate în workflow-uri.`);
w();
for (const [axisName, axis] of Object.entries(config.taxonomy.axes)) {
  const tags = axisTags.filter((t) => t.axis === axisName);
  const flags = [axis.multi ? 'multi-select' : 'single-select', axis.exclusive ? 'exclusiv (o valoare elimină restul)' : null].filter(Boolean);
  w(`**\`${axis.tag_prefix}*\`** — axa \`${axisName}\`, câmp \`${axis.field_key}\`, ${flags.join(', ')}`);
  w();
  w(tags.map((t) => `\`${t.tag}\` (${t.label})`).join(' · '));
  w();
}

w(`## 3. Tag-uri de sistem`);
w();
const sysGroups = {
  _consent: ['Consimțământ pe canal', 'Se setează la opt-in. Fără el, niciun mesaj comercial nu pleacă pe acel canal.'],
  _optout: ['Opt-out pe canal', 'Setat de dezabonare email sau de STOP pe SMS. Oprește toate fluxurile comerciale pe canalul respectiv.'],
  _flow_state: ['Stare de flux', 'Marchează contactul ca fiind într-un flux. Baza gărzii de suprimare între fluxuri.'],
  _lifecycle: ['Ciclu de viață', 'Poziția contactului în relația cu agenția.'],
};
for (const [key, [title, note]] of Object.entries(sysGroups)) {
  const tags = systemTags.filter((t) => t.axis === key);
  if (!tags.length) continue;
  w(`**${title}** — ${note}`);
  w();
  w(tags.map((t) => `\`${t.tag}\``).join(' · '));
  w();
}

w(`## 4. Custom values`);
w();
w(`Valori de brand injectate în template-urile GHL, ca textele să nu conțină numele agenției hardcodat.`);
w();
w(`| Nume în GHL | Sursă în config | Valoare curentă |`);
w(`|---|---|---|`);
for (const cv of customValues) w(`| \`${cv.key}\` | \`${cv.from}\` | ${cv.value ?? '_(nerezolvat)_'} |`);
w();

w(`## 5. Merge fields și fallback-uri`);
w();
w(`Regula: un email cu «Bună, {{prenume}}» gol nu pleacă niciodată.`);
w();
w(`| Token | Sursă | Dacă lipsește |`);
w(`|---|---|---|`);
const fallbackLabel = {
  value: (mf) => `se folosește "${mf.fallback_value}"`,
  alternate_line: (mf) => `se înlocuiește rândul cu "${mf.alternate_line}"`,
  omit_sentence: () => 'se elimină propoziția care îl conține',
  block_send: () => '**mesajul nu pleacă** și se ridică alertă',
};
for (const mf of config.merge_fields) {
  w(`| \`{{${mf.token}}}\` | \`${mf.source}\` | ${fallbackLabel[mf.fallback_strategy](mf)} |`);
}
w();

w(`## 6. Fluxuri`);
w();
w(`| Flux | Fază | Tip | Trigger | Canale | Segmentare audiență | Variație text |`);
w(`|---|---|---|---|---|---|---|`);
for (const [id, flow] of Object.entries(config.flows)) {
  const channels = [...new Set((flow.steps || []).map((s) => s.channel))].join(', ') || '—';
  const trigger = flow.trigger.type + (flow.trigger.tag ? ` \`${flow.trigger.tag}\`` : '') + (flow.trigger.anchor_field ? ` pe \`${flow.trigger.anchor_field}\`` : '') + (flow.trigger.cron ? ` \`${flow.trigger.cron}\`` : '');
  const seg = (flow.segmented_by || []).join(', ') || '—';
  const vary = (flow.content_varies_by || []).join(', ') || '—';
  const name = flow.enabled ? `\`${id}\`` : `~~\`${id}\`~~`;
  w(`| ${name}${flow.exclusive ? ' 🔒' : ''} | ${flow.phase} | ${flow.kind} | ${trigger} | ${channels} | ${seg} | ${vary} |`);
}
w();
w(`🔒 = flux exclusiv: cât e activ, suprimă orice mesaj comercial către acel contact.`);
w();
const disabled = Object.entries(config.flows).filter(([, f]) => !f.enabled);
if (disabled.length) {
  w(`Fluxuri dezactivate: ${disabled.map(([id, f]) => `\`${id}\`${f.blocked_by ? ` (${f.blocked_by})` : ''}`).join(', ')}`);
  w();
}

w(`## 7. Reguli de trimitere aplicate de garda comună`);
w();
const q = config.sending_rules.quiet_hours;
for (const [channel, rule] of Object.entries(q.per_channel)) {
  w(`- **${channel}**: ${rule.enforced ? `ferestre orare ${rule.start}–${rule.end} (${config.client.timezone}); în afara lor mesajul se amână la ${q.defer_strategy === 'next_window_start' ? 'începutul următoarei ferestre' : 'niciodată — se renunță'}` : 'fără restricție orară'}`);
}
const fc = config.sending_rules.frequency_cap;
w(`- **Plafon comercial**: max ${fc.commercial.max_messages} mesaje / ${fc.commercial.rolling_days} zile rulante, minim ${fc.min_hours_between_commercial}h între ele.`);
w(`- **Tranzacționale**: ${fc.transactional_bypasses_cap ? 'trec peste plafon, nu se suprimă niciodată' : 'respectă plafonul'}.`);
w(`- **Suprimare**: cât timp contactul e în ${config.sending_rules.suppression.exclusive_flow_ids.map((f) => `\`${f}\``).join(', ')}, fluxurile comerciale nu trimit.`);
w(`- **Idempotență**: cheie \`${config.sending_rules.idempotency.key_template}\`, stocată în \`${config.sending_rules.idempotency.store}\`.`);
w();

const out = path.join(ROOT, 'docs', '01-ghl-schema-si-taguri.md');
fs.writeFileSync(out, lines.join('\n'));
console.log(`Scris ${path.relative(ROOT, out)} (${lines.length} linii)`);
