#!/usr/bin/env node
/**
 * Generează workflow-urile n8n în n8n/workflows/*.json.
 *
 *   npm run build:n8n
 *
 * Workflow-urile NU conțin nimic specific unui client: primesc `client_id` la
 * intrare și își încarcă configurația la runtime (SW00). Adăugarea unui client
 * nou înseamnă un fișier de config și niște variabile de mediu — niciun node
 * atins. Nicio credențială nu ajunge în JSON: token-urile se citesc din `$env`
 * direct în expresia header-ului, deci nu trec nici măcar prin datele execuției.
 *
 * Logica de business (garda de trimitere, randarea, maparea formularului) nu se
 * scrie aici: se inlinează din n8n/runtime/*.mjs, aceleași fișiere pe care le
 * acoperă `npm test`. Ce e testat este ce rulează.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/config.mjs';
import { makeWorkflow, codeNode, boolCondition, executeWorkflowParams } from './lib/n8n.mjs';

const WORKFLOWS_ROOT = path.join(ROOT, 'n8n', 'workflows');
const RUNTIME_DIR = path.join(ROOT, 'n8n', 'runtime');

/**
 * Ținta de rulare. Aceeași sursă, trei ieșiri, fiindcă n8n expune setările de
 * instanță diferit după unde rulează:
 *
 *  self-hosted   `$env` — varianta pentru care e gândit sistemul: căutare
 *                dinamică după client_id, deci un client nou nu cere editat
 *                niciun node.
 *  cloud-pro     `$vars` — Variables există pe Pro; se comportă la fel ca $env,
 *                inclusiv la căutarea dinamică. Multi-client funcționează.
 *  cloud-starter nici `$env`, nici `$vars`. Setările de instanță devin
 *                marcaje de completat o dată la import, iar tokenul GHL o
 *                credențială Header Auth. Consecință: O SINGURĂ agenție per
 *                instanță — nu există cum să alegi credențiala după client.
 */
const VALID_TARGETS = ['self-hosted', 'cloud-pro', 'cloud-starter'];
const requested = (process.argv.find((a) => a.startsWith('--target=')) || '--target=all').split('=')[1];
const TARGETS = requested === 'all' ? VALID_TARGETS : [requested];
for (const t of TARGETS) {
  if (!VALID_TARGETS.includes(t)) {
    console.error(`Țintă necunoscută "${t}". Alege una din: ${VALID_TARGETS.join(', ')} sau "all".`);
    process.exit(2);
  }
}

const GHL_CREDENTIAL_NAME = 'GHL Private Integration Token';

// Starea de build, resetată la fiecare țintă.
let TARGET = TARGETS[0];
let IS_STARTER = false;
let PLACEHOLDERS = [];
let OUT_DIR = path.join(WORKFLOWS_ROOT, TARGET);

const placeholder = (name, what) => {
  if (!PLACEHOLDERS.some((p) => p.name === name)) PLACEHOLDERS.push({ name, what });
  return `__COMPLETEAZA_${name}__`;
};

const CODE = 'n8n-nodes-base.code';
const HTTP = 'n8n-nodes-base.httpRequest';
const IF = 'n8n-nodes-base.if';
const SWITCH = 'n8n-nodes-base.switch';
const NOOP = 'n8n-nodes-base.noOp';
const EXEC_WF = 'n8n-nodes-base.executeWorkflow';
const EXEC_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';

/**
 * Inlinează unul sau mai multe module de runtime într-un node Code.
 * Ordinea contează: un modul care depinde de altul se pune după el, fiindcă
 * liniile de import se scot (într-un node Code nu există sistem de module).
 */
function inline(...moduleNames) {
  return moduleNames.map((moduleName) => {
    const src = fs.readFileSync(path.join(RUNTIME_DIR, moduleName), 'utf8');
    return src
      .replace(/^export function /gm, 'function ')
      .replace(/^export const /gm, 'const ')
      .replace(/^import .*$/gm, '')
      .trimEnd();
  }).join('\n\n');
}

/** Aplică o transformare pe fiecare șir din structură, oricât de adânc. */
function mapStrings(value, fn) {
  if (typeof value === 'string') return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return value;
}

/**
 * Traduce workflow-ul scris pentru `$env` în forma cerută de ținta aleasă.
 *
 * Sursa se scrie o singură dată, în varianta self-hosted. Restul sunt
 * transformări mecanice, ca să nu existe trei copii ale acelorași noduri care
 * să se despartă în timp.
 */
function retarget(workflow) {
  if (TARGET === 'self-hosted') return workflow;

  // Pe Pro, Variables se comportă exact ca variabilele de mediu, inclusiv la
  // căutarea dinamică după client_id — deci o simplă redenumire.
  if (TARGET === 'cloud-pro') {
    return mapStrings(workflow, (text) => text.replaceAll('$env', '$vars'));
  }

  // Pe Starter nu există niciuna dintre ele. Setările de instanță devin marcaje
  // de completat o dată la import; tokenul devine credențială.
  const rules = [
    // Verificarea tokenului nu mai are sens: el vine din credențială, nu din mediu.
    [/\n?if \(!ghl\.token_env \|\| !\$env\[ghl\.token_env\]\) \{[\s\S]*?\n\}\n/,
      "\n// Tokenul vine din credențiala Header Auth a nodului HTTP, nu din mediu.\n"],
    [/\$env\[ghl\.location_id_env\]/g,
      () => `'${placeholder('GHL_LOCATION_ID', 'id-ul sub-contului GHL — SW01, nodul „Pregătește apelul"')}'`],
    [/\$env\.CONFIG_BASE_URL/g,
      () => `'${placeholder('CONFIG_BASE_URL', 'URL-ul de unde n8n citește config/clients/<id>.json — SW00, nodul „Pregătește sursa configului"')}'`],
    [/\$env\.CONFIG_CACHE_TTL_SECONDS/g, '300'],
    [/\$env\['FORM_SECRET_' \+ clientId\.toUpperCase\(\)\.replace\(\/-\/g, '_'\)\]/g,
      () => `'${placeholder('FORM_SECRET', 'secretul formularului de preferințe — WF00, nodul „Validează cererea"')}'`],
    [/\$env\.ALERT_EMAIL\b/g,
      () => `'${placeholder('ALERT_EMAIL', 'adresa care primește alertele — WF_ERR, nodul „Construiește alerta"')}'`],
    [/\$env\.ALERT_FROM_EMAIL/g,
      () => `'${placeholder('ALERT_FROM_EMAIL', 'expeditorul alertelor — WF_ERR, nodul „Trimite alerta"')}'`],
    [/\$env\.KPI_SPREADSHEET_ID/g,
      () => `'${placeholder('KPI_SPREADSHEET_ID', 'foaia de raportare — SW03, nodul „Scrie în raportare"')}'`],
    // Id-urile sub-workflow-urilor: literal, completat după import.
    [/=\{\{ \$env\.(WF_ID_\w+) \}\}/g,
      (_, name) => placeholder(name, `id-ul workflow-ului ${name.replace('WF_ID_', '')} (din URL, după import)`)],
  ];

  const translated = mapStrings(workflow, (text) => {
    let out = text;
    for (const [pattern, replacement] of rules) out = out.replace(pattern, replacement);
    return out;
  });

  // Tokenul GHL: credențială Header Auth în loc de expresie pe $env.
  for (const node of translated.nodes) {
    const params = node.parameters || {};
    const headers = params.headerParameters?.parameters;
    if (!headers) continue;
    const authIndex = headers.findIndex((h) => h.name === 'Authorization');
    if (authIndex === -1) continue;
    headers.splice(authIndex, 1);
    params.authentication = 'genericCredentialType';
    params.genericAuthType = 'httpHeaderAuth';
    // Doar numele credențialei, niciodată valoarea.
    node.credentials = { httpHeaderAuth: { name: GHL_CREDENTIAL_NAME } };
  }

  return translated;
}

const header = (title, note) =>
  `// ${title}\n// ${note}\n// Generat de scripts/build-n8n.mjs — nu edita în n8n, modifică sursa.\n`;

const RETRY = { retryOnFail: true, maxTries: 4, waitBetweenTries: 2500 };

// ═══════════════════════════════════════════════════════════════════════════
// SW00 — Încarcă configul clientului
// ═══════════════════════════════════════════════════════════════════════════
function buildLoadConfig() {
  const wf = makeWorkflow('SW00 · Încarcă configul clientului');

  wf.node('Când primește cererea', EXEC_TRIGGER, 1, {});

  wf.node('Pregătește sursa configului', CODE, 2, codeNode(`${header('SW00 · sursa configului', 'Cache în static data ca să nu descărcăm configul la fiecare mesaj.')}
const clientId = $input.first().json.client_id;
if (!clientId) throw new Error('SW00: client_id lipsă în intrare.');

const base = ($env.CONFIG_BASE_URL || '').replace(/\\/$/, '');
if (!base) throw new Error('SW00: variabila de mediu CONFIG_BASE_URL nu e setată. Vezi n8n/README.md.');

const ttlMs = Number($env.CONFIG_CACHE_TTL_SECONDS || 300) * 1000;
const staticData = $getWorkflowStaticData('global');
const hit = staticData['cfg:' + clientId];
const fresh = Boolean(hit && (Date.now() - hit.at) < ttlMs);

return [{ json: {
  client_id: clientId,
  cached: fresh,
  config: fresh ? hit.config : null,
  config_url: base + '/' + clientId + '.json',
} }];`));

  wf.node('Config în cache?', IF, 2.2, { conditions: boolCondition('={{ $json.cached }}'), options: {} });

  wf.node('Din cache', NOOP, 1, {}, { notes: 'Configul e deja în static data și încă valid.' }, 1);

  wf.node('Descarcă configul', HTTP, 4.2, {
    url: '={{ $json.config_url }}',
    authentication: 'none',
    options: { response: { response: { neverError: false } }, timeout: 15000 },
  }, { ...RETRY, notes: 'CONFIG_BASE_URL trebuie să indice un director cu <client-id>.json accesibil de n8n.' }, 2);

  wf.node('Pune în cache', CODE, 2, codeNode(`${header('SW00 · validare și cache', 'Un config greșit descărcat aici ar strica toate fluxurile — se validează minimal înainte de a fi folosit.')}
const clientId = $('Pregătește sursa configului').first().json.client_id;
const config = $input.first().json;

if (!config || !config.client) throw new Error('SW00: răspunsul de la CONFIG_BASE_URL nu e un config valid.');
if (config.client.id !== clientId) {
  throw new Error('SW00: configul descărcat e pentru "' + config.client.id + '", cerut "' + clientId + '".');
}
for (const key of ['taxonomy', 'sending_rules', 'compliance', 'merge_fields', 'flows', 'integrations']) {
  if (!config[key]) throw new Error('SW00: configul lui ' + clientId + ' nu are secțiunea "' + key + '".');
}

const staticData = $getWorkflowStaticData('global');
staticData['cfg:' + clientId] = { at: Date.now(), config };

return [{ json: { client_id: clientId, config } }];`), {}, 2);

  wf.advance();
  wf.node('Config', NOOP, 1, {}, { notes: 'Ieșire: { client_id, config }' });

  wf.chain('Când primește cererea', 'Pregătește sursa configului', 'Config în cache?');
  wf.connect('Config în cache?', 'Din cache', 0);
  wf.connect('Config în cache?', 'Descarcă configul', 1);
  wf.chain('Descarcă configul', 'Pune în cache');
  wf.connect('Din cache', 'Config');
  wf.connect('Pune în cache', 'Config');

  return wf.build({
    description: 'Încarcă și cachează configul unui client. Intrare: { client_id }. Ieșire: { client_id, config }.',
    tags: ['fundatie', 'sub-workflow'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SW01 — Apel GHL API v2
// ═══════════════════════════════════════════════════════════════════════════
function buildGhlApi() {
  const wf = makeWorkflow('SW01 · Apel GHL API v2');

  wf.node('Când primește cererea', EXEC_TRIGGER, 1, {}, {
    notes: 'Intrare: { client_id, method, path, body?, query?, version_override? }. În path, {locationId} se înlocuiește automat.',
  });

  wf.node('Încarcă configul', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW00_LOAD_CONFIG'), RETRY);

  wf.node('Pregătește apelul', CODE, 2, codeNode(`${header('SW01 · pregătirea apelului', 'Header-ul Version e obligatoriu pe GHL API v2 și diferă pe resurse — fără el request-ul e respins.')}
const request = $('Când primește cererea').first().json;
const config = $input.first().json.config;
const ghl = config.integrations.ghl;

const method = (request.method || 'GET').toUpperCase();
if (!request.path) throw new Error('SW01: path lipsă.');

const locationId = $env[ghl.location_id_env];
if (!locationId) throw new Error('SW01: lipsește variabila de mediu ' + ghl.location_id_env + ' (id-ul sub-contului GHL).');
if (!ghl.token_env || !$env[ghl.token_env]) {
  throw new Error('SW01: lipsește variabila de mediu ' + ghl.token_env + ' (Private Integration Token).');
}

// Conversations cere altă valoare de Version decât restul resurselor.
const version = request.version_override
  || (request.path.includes('/conversations') ? (ghl.api_versions.conversations || ghl.api_versions.default) : ghl.api_versions.default);

const resolvedPath = request.path.replace(/\\{locationId\\}/g, locationId);
const hasBody = request.body !== undefined && request.body !== null;

return [{ json: {
  method,
  url: ghl.api_base.replace(/\\/$/, '') + resolvedPath,
  version,
  token_env: ghl.token_env,
  query: request.query || {},
  body: hasBody ? request.body : null,
  has_body: hasBody,
  location_id: locationId,
  client_id: config.client.id,
  label: method + ' ' + resolvedPath,
} }];`));

  wf.node('Are corp?', IF, 2.2, { conditions: boolCondition('={{ $json.has_body }}'), options: {} });

  const httpParams = (withBody) => ({
    method: '={{ $json.method }}',
    url: '={{ $json.url }}',
    authentication: 'none',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        // Tokenul se citește direct din mediu în expresie: nu trece prin datele
        // execuției, deci nu apare în istoricul de execuții și nici în exporturi.
        { name: 'Authorization', value: '={{ "Bearer " + $env[$json.token_env] }}' },
        { name: 'Version', value: '={{ $json.version }}' },
        { name: 'Accept', value: 'application/json' },
      ],
    },
    sendQuery: true,
    specifyQuery: 'json',
    jsonQuery: '={{ JSON.stringify($json.query) }}',
    ...(withBody ? {
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.body) }}',
    } : {}),
    options: { timeout: 20000, response: { response: { fullResponse: true, neverError: false } } },
  });

  wf.node('Apel GHL (cu corp)', HTTP, 4.2, httpParams(true), { ...RETRY, onError: 'continueErrorOutput' }, 1);
  wf.node('Apel GHL (fără corp)', HTTP, 4.2, httpParams(false), { ...RETRY, onError: 'continueErrorOutput' }, 2);

  wf.advance();
  wf.node('Normalizează răspunsul', CODE, 2, codeNode(`${header('SW01 · răspuns', 'Ieșire uniformă indiferent de ramura HTTP folosită.')}
const prepared = $('Pregătește apelul').first().json;
const raw = $input.first().json;
const status = raw.statusCode ?? 200;
const payload = raw.body ?? raw;

return [{ json: {
  ok: true,
  status,
  label: prepared.label,
  client_id: prepared.client_id,
  data: payload,
} }];`));

  wf.node('Ridică eroare descriptivă', CODE, 2, codeNode(`${header('SW01 · eroare', 'Eșecurile nu sunt silențioase: mesajul spune ce a picat și de ce, ca alerta să fie acționabilă.')}
const prepared = $('Pregătește apelul').first().json;
const err = $input.first().json;
const status = err.statusCode ?? err.error?.statusCode ?? err.httpCode ?? 'necunoscut';

const hint = {
  401: 'Private Integration Token invalid sau expirat.',
  403: 'Token valid, dar fără scopul necesar. Vezi integrations.ghl.required_pit_scopes.',
  404: 'Resursa nu există pe acest sub-cont. Verifică location_id.',
  422: 'Payload respins. Cel mai des: header Version lipsă/greșit sau dataType nepermis.',
  429: 'Rate limit atins după toate reîncercările.',
}[Number(status)] || 'Vezi corpul răspunsului.';

throw new Error(
  'SW01 ' + prepared.label + ' a eșuat cu status ' + status + '. ' + hint +
  ' Detalii: ' + JSON.stringify(err.error ?? err.body ?? err).slice(0, 800)
);`), {}, 1);

  wf.chain('Când primește cererea', 'Încarcă configul', 'Pregătește apelul', 'Are corp?');
  wf.connect('Are corp?', 'Apel GHL (cu corp)', 0);
  wf.connect('Are corp?', 'Apel GHL (fără corp)', 1);
  wf.connect('Apel GHL (cu corp)', 'Normalizează răspunsul', 0);
  wf.connect('Apel GHL (cu corp)', 'Ridică eroare descriptivă', 1);
  wf.connect('Apel GHL (fără corp)', 'Normalizează răspunsul', 0);
  wf.connect('Apel GHL (fără corp)', 'Ridică eroare descriptivă', 1);

  return wf.build({
    description: 'Wrapper peste GHL API v2: auth din mediu, header Version corect pe resursă, retry cu backoff, erori descriptive. Acoperă tag-uri și custom values, pe care node-ul nativ HighLevel nu le are.',
    tags: ['fundatie', 'sub-workflow'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SW02 — Garda de trimitere
// ═══════════════════════════════════════════════════════════════════════════
function buildSendGuard() {
  const wf = makeWorkflow('SW02 · Garda de trimitere');

  wf.node('Când primește cererea', EXEC_TRIGGER, 1, {}, {
    notes: 'Intrare: { client_id, contact: { id, tags[], customFields{} }, request: { flow_id, step_id, channel, category, kind, occurrence_key }, now? }',
  });

  wf.node('Încarcă configul', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW00_LOAD_CONFIG'), RETRY);

  wf.node('Evaluează garda', CODE, 2, codeNode(`${header('SW02 · garda de trimitere', 'Consimțământ, opt-out, idempotență, suprimare între fluxuri, plafon de frecvență, ferestre orare.')}
${inline('guard.mjs')}

// ── glue n8n ──
const input = $('Când primește cererea').first().json;
const config = $input.first().json.config;

if (!input.contact || !input.contact.id) throw new Error('SW02: contact.id lipsă.');
if (!input.request || !input.request.channel) throw new Error('SW02: request.channel lipsă.');

const decision = evaluateGuard({
  config,
  contact: input.contact,
  request: input.request,
  nowIso: input.now,
});

return [{ json: {
  ...decision,
  client_id: config.client.id,
  contact_id: input.contact.id,
  request: input.request,
} }];`));

  wf.chain('Când primește cererea', 'Încarcă configul', 'Evaluează garda');

  return wf.build({
    description: 'Decide dacă un mesaj pleacă, se amână sau se renunță. Ieșire: { action: send|defer|drop, allowed, reason, defer_until, idempotency_key }. Logica e n8n/runtime/guard.mjs, acoperită de npm test.',
    tags: ['fundatie', 'sub-workflow', 'conformitate'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SW03 — Trimite mesaj
// ═══════════════════════════════════════════════════════════════════════════
function buildSendMessage() {
  const wf = makeWorkflow('SW03 · Trimite mesaj');

  wf.node('Când primește cererea', EXEC_TRIGGER, 1, {}, {
    notes: 'Intrare: { client_id, contact, request: {flow_id, step_id, channel, category, kind, occurrence_key}, template: {subject?, body} }',
  });

  wf.node('Încarcă configul', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW00_LOAD_CONFIG'), RETRY);

  wf.node('Pregătește garda', CODE, 2, codeNode(`${header('SW03 · intrare pentru gardă', 'Numărul de amânări e limitat, ca un mesaj amânat repetat să nu circule la nesfârșit.')}
const input = $('Când primește cererea').first().json;
const config = $input.first().json.config;

return [{ json: {
  client_id: config.client.id,
  contact: input.contact,
  request: input.request,
  now: input.now,
  template: input.template,
  defer_count: input.defer_count || 0,
} }];`));

  wf.node('Verifică garda', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW02_SEND_GUARD'), RETRY);

  wf.node('Are voie să plece?', IF, 2.2, { conditions: boolCondition('={{ $json.allowed }}'), options: {} });

  // ── Ramura „nu pleacă acum" ──
  wf.node('Amânat sau oprit?', SWITCH, 3, {
    rules: {
      values: [
        { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
          conditions: [{ id: 'defer', leftValue: '={{ $json.action }}', rightValue: 'defer', operator: { type: 'string', operation: 'equals' } }],
          combinator: 'and' }, outputKey: 'defer' },
      ],
    },
    options: { fallbackOutput: 'extra', renameFallbackOutput: 'drop' },
  }, {}, 1);

  wf.node('Mai are rost să amânăm?', CODE, 2, codeNode(`${header('SW03 · limită de amânări', 'Trei amânări înseamnă că mesajul nu mai e relevant; se renunță și se loghează, nu se reia la infinit.')}
const decision = $input.first().json;
const prepared = $('Pregătește garda').first().json;
const attempts = (prepared.defer_count || 0) + 1;
const MAX_DEFERS = 3;

return [{ json: {
  ...prepared,
  defer_count: attempts,
  decision,
  give_up: attempts > MAX_DEFERS,
  resume_at: decision.defer_until,
} }];`), {}, 1);

  wf.node('Renunțăm?', IF, 2.2, { conditions: boolCondition('={{ $json.give_up }}'), options: {} }, {}, 1);

  wf.node('Așteaptă fereastra', 'n8n-nodes-base.wait', 1.1, {
    resume: 'specificTime',
    dateTime: '={{ $json.resume_at }}',
  }, { notes: 'Reia trimiterea când plafonul sau fereastra orară permite.' }, 2);

  wf.node('Reia cererea', CODE, 2, codeNode(`${header('SW03 · reluare după amânare', 'Se reintră în gardă cu contorul de amânări păstrat.')}
const item = $input.first().json;
return [{ json: {
  client_id: item.client_id,
  contact: item.contact,
  request: item.request,
  template: item.template,
  defer_count: item.defer_count,
  now: new Date().toISOString(),
} }];`), {}, 2);

  // ── Ramura „pleacă" ──
  wf.advance();
  wf.node('Randează mesajul', CODE, 2, codeNode(`${header('SW03 · randare', 'Merge fields și fallback-uri. Un mesaj cu o valoare financiară lipsă nu pleacă.')}
${inline('render.mjs')}

// ── glue n8n ──
const decision = $input.first().json;
const prepared = $('Pregătește garda').first().json;
const config = $('Încarcă configul').first().json.config;

const rendered = renderTemplate({
  config,
  contact: prepared.contact,
  template: { ...prepared.template, channel: prepared.request.channel },
});

return [{ json: {
  ...prepared,
  decision,
  rendered,
  can_send: rendered.ok,
} }];`));

  wf.node('Randare validă?', IF, 2.2, { conditions: boolCondition('={{ $json.can_send }}'), options: {} });

  wf.node('Canal', SWITCH, 3, {
    rules: {
      values: ['email', 'sms', 'whatsapp'].map((channel) => ({
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
          conditions: [{ id: channel, leftValue: '={{ $json.request.channel }}', rightValue: channel, operator: { type: 'string', operation: 'equals' } }],
          combinator: 'and',
        },
        outputKey: channel,
      })),
    },
    options: {},
  });

  wf.node('Construiește mesajul GHL', CODE, 2, codeNode(`${header('SW03 · payload GHL', 'Email și SMS pleacă prin canalul nativ GHL; sub-contul e sursa de adevăr pentru conversații.')}
const item = $input.first().json;
const config = $('Încarcă configul').first().json.config;
const channel = item.request.channel;

const body = {
  type: channel === 'sms' ? 'SMS' : 'Email',
  contactId: item.contact.id,
  message: item.rendered.body,
};
if (channel === 'email') {
  body.subject = item.rendered.subject;
  body.html = item.rendered.body.replace(/\\n/g, '<br>');
  body.emailFrom = config.integrations.email.from_name + ' <' + config.integrations.email.from_address + '>';
  if (config.integrations.email.reply_to) body.emailReplyTo = config.integrations.email.reply_to;
}

return [{ json: {
  client_id: item.client_id,
  method: 'POST',
  path: '/conversations/messages',
  body,
  _context: item,
} }];`), {}, 1);

  wf.node('WhatsApp — de conectat la BSP', NOOP, 1, {}, {
    notes: 'Blocat de întrebarea 3 din docs/02: nu există încă provider WhatsApp Business API. Garda oprește deja pașii WhatsApp cât timp integrations.whatsapp.enabled = false; nodul rămâne ca punct de racord, cu template-uri aprobate și fereastra de 24h de respectat.',
    disabled: true,
  }, 2);

  wf.advance();
  wf.node('Trimite prin GHL', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW01_GHL_API'), RETRY);

  wf.node('Actualizează jurnalul', CODE, 2, codeNode(`${header('SW03 · jurnal de trimiteri', 'Jurnalul de pe contact este ce face idempotența și plafonul de frecvență să funcționeze.')}
${inline('guard.mjs')}

// ── glue n8n ──
const sendResult = $input.first().json;
const item = $('Construiește mesajul GHL').first().json._context;
const config = $('Încarcă configul').first().json.config;
const rules = config.sending_rules;
const nowIso = new Date().toISOString();

const journal = pruneJournal(
  parseJournal(item.contact.customFields?.[rules.log.field_key]),
  new Date(nowIso),
  rules.log.retention_days,
);
journal.push(journalEntry({
  request: item.request,
  idempotencyKey: item.decision.idempotency_key,
  nowIso,
}));

const commercialInWindow = journal.filter((e) =>
  e.k === 'commercial' && Date.parse(e.t) >= Date.now() - rules.frequency_cap.commercial.rolling_days * 86400000
).length;

const human = rules.log.human_readable_fields || {};
const customFields = [{ key: rules.log.field_key, field_value: JSON.stringify(journal) }];
if (human.count_rolling) customFields.push({ key: human.count_rolling, field_value: commercialInWindow });
if (human.last_commercial && item.request.kind === 'commercial') {
  customFields.push({ key: human.last_commercial, field_value: nowIso });
}

return [{ json: {
  client_id: item.client_id,
  method: 'PUT',
  path: '/contacts/' + item.contact.id,
  // Forma exactă a customFields la update diferă între conturi GHL
  // ({key, field_value} vs {id, value}); se confirmă la primul test end-to-end
  // pe sub-contul real — vezi docs/05, scenariul T0.4.
  body: { customFields },
  _log: {
    client_id: item.client_id,
    contact_id: item.contact.id,
    flow_id: item.request.flow_id,
    step_id: item.request.step_id,
    channel: item.request.channel,
    category: item.request.category,
    kind: item.request.kind,
    status: 'sent',
    reason: 'ok',
    idempotency_key: item.decision.idempotency_key,
    timestamp: nowIso,
    provider_response: JSON.stringify(sendResult.data ?? {}).slice(0, 500),
  },
} }];`));

  wf.node('Scrie jurnalul în GHL', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW01_GHL_API'), RETRY);

  wf.advance();
  wf.node('Log trimitere', CODE, 2, codeNode(`${header('SW03 · linie de log', 'Fiecare trimitere se loghează cu contact, flux, canal, timestamp și status.')}
return [{ json: $('Actualizează jurnalul').first().json._log }];`));

  // ── Ramuri care nu trimit, dar se loghează ──
  wf.node('Log oprire', CODE, 2, codeNode(`${header('SW03 · linie de log pentru mesaj oprit', 'Un mesaj suprimat e la fel de important de urmărit ca unul trimis.')}
const decision = $input.first().json.decision || $input.first().json;
const prepared = $('Pregătește garda').first().json;
return [{ json: {
  client_id: prepared.client_id,
  contact_id: prepared.contact.id,
  flow_id: prepared.request.flow_id,
  step_id: prepared.request.step_id,
  channel: prepared.request.channel,
  category: prepared.request.category,
  kind: prepared.request.kind,
  status: decision.action === 'defer' ? 'given_up_after_defers' : 'blocked',
  reason: decision.reason,
  idempotency_key: decision.idempotency_key,
  timestamp: new Date().toISOString(),
  detail: JSON.stringify(decision.detail ?? {}),
} }];`), {}, 1);

  wf.node('Log randare blocată', CODE, 2, codeNode(`${header('SW03 · linie de log pentru randare blocată', 'Merge field lipsă = mesaj netrimis + alertă, nu email cu spații goale.')}
const item = $input.first().json;
return [{ json: {
  client_id: item.client_id,
  contact_id: item.contact.id,
  flow_id: item.request.flow_id,
  step_id: item.request.step_id,
  channel: item.request.channel,
  category: item.request.category,
  kind: item.request.kind,
  status: 'blocked',
  reason: 'merge_fields_lipsa',
  idempotency_key: item.decision.idempotency_key,
  timestamp: new Date().toISOString(),
  detail: JSON.stringify({ blocked: item.rendered.blocked, warnings: item.rendered.warnings }),
} }];`), {}, 2);

  wf.advance();
  wf.node('Scrie în raportare', 'n8n-nodes-base.googleSheets', 4.5, {
    operation: 'append',
    documentId: { __rl: true, mode: 'id', value: '={{ $env.KPI_SPREADSHEET_ID }}' },
    sheetName: { __rl: true, mode: 'name', value: 'send_log' },
    columns: { mappingMode: 'autoMapInputData', matchingColumns: [], schema: [] },
    options: {},
  }, { ...RETRY, onError: 'continueRegularOutput', notes: 'Raportarea nu are voie să blocheze trimiterea: la eșec, execuția continuă și eroarea ajunge în workflow-ul de alertare.' });

  // conexiuni
  wf.chain('Când primește cererea', 'Încarcă configul', 'Pregătește garda', 'Verifică garda', 'Are voie să plece?');
  wf.connect('Are voie să plece?', 'Randează mesajul', 0);
  wf.connect('Are voie să plece?', 'Amânat sau oprit?', 1);

  wf.connect('Amânat sau oprit?', 'Mai are rost să amânăm?', 0);
  wf.connect('Amânat sau oprit?', 'Log oprire', 1);
  wf.connect('Mai are rost să amânăm?', 'Renunțăm?');
  wf.connect('Renunțăm?', 'Log oprire', 0);
  wf.connect('Renunțăm?', 'Așteaptă fereastra', 1);
  wf.chain('Așteaptă fereastra', 'Reia cererea', 'Verifică garda');

  wf.chain('Randează mesajul', 'Randare validă?');
  wf.connect('Randare validă?', 'Canal', 0);
  wf.connect('Randare validă?', 'Log randare blocată', 1);

  wf.connect('Canal', 'Construiește mesajul GHL', 0);
  wf.connect('Canal', 'Construiește mesajul GHL', 1);
  wf.connect('Canal', 'WhatsApp — de conectat la BSP', 2);

  wf.chain('Construiește mesajul GHL', 'Trimite prin GHL', 'Actualizează jurnalul', 'Scrie jurnalul în GHL', 'Log trimitere', 'Scrie în raportare');
  wf.connect('Log oprire', 'Scrie în raportare');
  wf.connect('Log randare blocată', 'Scrie în raportare');

  return wf.build({
    description: 'Singura cale prin care pleacă un mesaj. Verifică garda, randează, trimite pe canalul potrivit, actualizează jurnalul de pe contact și loghează rezultatul — inclusiv când mesajul nu pleacă.',
    tags: ['fundatie', 'sub-workflow'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WF00 — Formularul de preferințe
// ═══════════════════════════════════════════════════════════════════════════
function buildPreferencesIntake() {
  const wf = makeWorkflow('WF00 · Formular preferințe → GHL');

  wf.node('Formular trimis', 'n8n-nodes-base.webhook', 2, {
    httpMethod: 'POST',
    path: 'preferinte/:client_id',
    responseMode: 'responseNode',
    options: {},
  }, { webhookId: 'preferinte-intake', notes: 'Un singur endpoint pentru toți clienții: client_id vine din URL, nu din node.' });

  wf.node('Validează cererea', CODE, 2, codeNode(`${header('WF00 · validare', 'Endpoint public: nu are voie să scrie în GHL pe baza a orice primește.')}
const req = $input.first().json;
const clientId = req.params?.client_id;
const payload = req.body || {};

if (!clientId) throw new Error('WF00: client_id lipsă din URL.');

// Secret partajat, ca formularul să nu poată fi trimis de oricine.
const expected = $env['FORM_SECRET_' + clientId.toUpperCase().replace(/-/g, '_')];
if (expected && req.headers?.['x-form-secret'] !== expected) {
  throw new Error('WF00: secret de formular invalid pentru ' + clientId + '.');
}

return [{ json: { client_id: clientId, payload, source: payload.source || req.headers?.referer || 'formular_preferinte' } }];`));

  wf.node('Încarcă configul', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW00_LOAD_CONFIG'), RETRY);

  wf.node('Caută contactul', CODE, 2, codeNode(`${header('WF00 · căutare contact', 'Avem nevoie de tag-urile actuale ca să știm ce preferințe au dispărut.')}
const input = $('Validează cererea').first().json;
const identifier = input.payload.email || input.payload.phone;
if (!identifier) throw new Error('WF00: formularul nu conține nici email, nici telefon.');

return [{ json: {
  client_id: input.client_id,
  method: 'GET',
  path: '/contacts/',
  query: { locationId: '{locationId}', query: identifier, limit: 1 },
} }];`));

  wf.node('Contact existent', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW01_GHL_API'), { ...RETRY, onError: 'continueRegularOutput' });

  wf.node('Mapează preferințele', CODE, 2, codeNode(`${header('WF00 · mapare preferințe', 'Etichete din formular → chei de axă → tag-uri și custom fields. Fără liste hardcodate.')}
${inline('preferences.mjs')}

// ── glue n8n ──
const input = $('Validează cererea').first().json;
const config = $('Încarcă configul').first().json.config;
const found = $input.first().json?.data?.contacts?.[0];

const mapped = mapPreferences({
  config,
  payload: input.payload,
  existingTags: found?.tags || [],
  source: input.source,
});

if (!mapped.valid) throw new Error('WF00: ' + mapped.warnings.join('; '));

const customFieldsArray = Object.entries(mapped.customFields).map(([key, value]) => ({
  key,
  field_value: Array.isArray(value) ? value : value,
}));

return [{ json: {
  client_id: config.client.id,
  existing_contact_id: found?.id || null,
  mapped,
  method: 'POST',
  path: '/contacts/upsert',
  body: {
    ...mapped.contact,
    customFields: customFieldsArray,
  },
} }];`));

  wf.node('Salvează contactul', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW01_GHL_API'), RETRY);

  wf.node('Pregătește tag-urile', CODE, 2, codeNode(`${header('WF00 · tag-uri', 'Adăugarea și ștergerea tag-urilor nu există în node-ul nativ HighLevel — trec prin SW01.')}
const saved = $input.first().json;
const context = $('Mapează preferințele').first().json;
const contactId = saved.data?.contact?.id || saved.data?.id || context.existing_contact_id;
if (!contactId) throw new Error('WF00: nu am obținut id-ul contactului după upsert.');

const out = [];
if (context.mapped.tagsToAdd.length) {
  out.push({ json: { client_id: context.client_id, contact_id: contactId, op: 'add',
    method: 'POST', path: '/contacts/' + contactId + '/tags', body: { tags: context.mapped.tagsToAdd } } });
}
if (context.mapped.tagsToRemove.length) {
  out.push({ json: { client_id: context.client_id, contact_id: contactId, op: 'remove',
    method: 'DELETE', path: '/contacts/' + contactId + '/tags', body: { tags: context.mapped.tagsToRemove } } });
}
if (!out.length) {
  out.push({ json: { client_id: context.client_id, contact_id: contactId, op: 'noop',
    method: 'GET', path: '/contacts/' + contactId } });
}
return out;`));

  wf.node('Aplică tag-urile', EXEC_WF, 1.2, { ...executeWorkflowParams('WF_ID_SW01_GHL_API'), mode: 'each' }, RETRY);

  wf.node('Pregătește confirmarea', CODE, 2, codeNode(`${header('WF00 · confirmare', 'Fluxul „actualizare preferințe": email scurt care confirmă ce am înregistrat.')}
const context = $('Mapează preferințele').first().json;
const contactId = $('Pregătește tag-urile').first().json.contact_id;
const config = $('Încarcă configul').first().json.config;

const flow = config.flows.preferences_update;
const step = flow.steps[0];

return [{ json: {
  client_id: context.client_id,
  contact: {
    id: contactId,
    tags: [...(context.mapped.tagsToAdd || [])],
    customFields: context.mapped.customFields,
    firstName: context.mapped.contact.firstName,
  },
  request: {
    flow_id: 'preferences_update',
    step_id: step.id,
    channel: step.channel,
    category: step.category,
    kind: flow.kind,
    occurrence_key: new Date().toISOString().slice(0, 10),
  },
  template: {
    subject: 'Am înregistrat preferințele tale',
    body: 'Bună, {{prenume}}!\\n\\nAm notat ce fel de vacanță ți se potrivește. De acum primești de la noi doar propuneri care se apropie de ce ți-ai dorit, nu tot ce apare.\\n\\nDacă se schimbă ceva, scrie-ne oricând.\\n\\n{{consultant_name}} — {{agency_name}}',
  },
} }];`), { notes: 'Textul rămâne aici doar până când workflow-ul de generare conținut (faza 2) încarcă template-urile aprobate în GHL.' });

  wf.node('Trimite confirmarea', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW03_SEND_MESSAGE'), { ...RETRY, onError: 'continueRegularOutput' });

  wf.node('Răspunde formularului', 'n8n-nodes-base.respondToWebhook', 1.1, {
    respondWith: 'json',
    responseBody: '={{ JSON.stringify({ ok: true, tags_added: $(\'Mapează preferințele\').first().json.mapped.tagsToAdd.length, warnings: $(\'Mapează preferințele\').first().json.mapped.warnings }) }}',
    options: {},
  });

  wf.chain(
    'Formular trimis', 'Validează cererea', 'Încarcă configul', 'Caută contactul', 'Contact existent',
    'Mapează preferințele', 'Salvează contactul', 'Pregătește tag-urile', 'Aplică tag-urile',
    'Pregătește confirmarea', 'Trimite confirmarea', 'Răspunde formularului',
  );

  return wf.build({
    description: 'Colectarea și actualizarea preferințelor. Un endpoint pentru toți clienții (client_id în URL), scrie custom fields + tag-uri prin SW01 și confirmă prin SW03.',
    tags: ['faza-1', 'flux'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WF_ERR — Alertare la eșec
// ═══════════════════════════════════════════════════════════════════════════
function buildErrorWorkflow() {
  const wf = makeWorkflow('WF_ERR · Alertare la eșec');

  wf.node('Când un workflow eșuează', 'n8n-nodes-base.errorTrigger', 1, {});

  wf.node('Construiește alerta', CODE, 2, codeNode(`${header('WF_ERR · alertă', 'Niciun eșec silențios: fiecare execuție picată produce un mesaj cu context suficient pentru diagnostic.')}
const e = $input.first().json;
const wfName = e.workflow?.name || 'necunoscut';
const node = e.execution?.lastNodeExecuted || 'necunoscut';
const message = e.execution?.error?.message || e.trigger?.error?.message || 'fără mesaj';
const url = e.execution?.url || '';

// Contextul de client, când eroarea vine dintr-un flux care îl are.
const clientId = e.execution?.error?.context?.client_id || 'necunoscut';

return [{ json: {
  subject: '[n8n] ' + wfName + ' a eșuat — ' + node,
  text: [
    'Workflow: ' + wfName,
    'Node: ' + node,
    'Client: ' + clientId,
    'Execuție: ' + (e.execution?.id || '—'),
    'Moment: ' + new Date().toISOString(),
    '',
    'Eroare:',
    message,
    '',
    url,
  ].join('\\n'),
  to: $env.ALERT_EMAIL || '',
} }];`));

  wf.node('Trimite alerta', 'n8n-nodes-base.emailSend', 2.1, {
    fromEmail: '={{ $env.ALERT_FROM_EMAIL }}',
    toEmail: '={{ $json.to }}',
    subject: '={{ $json.subject }}',
    emailFormat: 'text',
    text: '={{ $json.text }}',
    options: {},
  }, { notes: 'Cere o credențială SMTP în n8n. Vezi checklist-ul de onboarding.' });

  wf.chain('Când un workflow eșuează', 'Construiește alerta', 'Trimite alerta');

  return wf.build({
    description: 'Workflow de eroare comun. Se setează în Settings → Error Workflow la fiecare workflow din sistem.',
    tags: ['fundatie', 'operare'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// WF_SETUP — Provisioning GHL (custom fields, tag-uri, custom values)
// ═══════════════════════════════════════════════════════════════════════════
function buildProvisioning() {
  const wf = makeWorkflow('WF_SETUP · Provisioning GHL');

  wf.node('Formular de provisioning', 'n8n-nodes-base.formTrigger', 2.2, {
    path: 'provisioning-ghl',
    formTitle: 'Provisioning GHL',
    formDescription: 'Creează în sub-contul GHL custom fields-urile, tag-urile și custom values-urile cerute de configul clientului. Idempotent: ce există deja nu se recreează.',
    formFields: {
      values: [
        { fieldLabel: 'Client', fieldType: 'text', placeholder: 'id-ul clientului, ex. numele-agentiei', requiredField: true },
        {
          fieldLabel: 'Mod',
          fieldType: 'dropdown',
          fieldOptions: { values: [{ option: 'Doar planul (nu scrie nimic)' }, { option: 'Aplică' }] },
          requiredField: true,
        },
      ],
    },
    options: {},
  }, { notes: 'Client nou = deschizi formularul și scrii id-ul. Niciun node de editat.' });

  wf.node('Citește parametrii', CODE, 2, codeNode(`${header('WF_SETUP · parametri', 'Modul implicit e dry-run: aplicarea se cere explicit.')}
const form = $input.first().json;
const clientId = (form.Client || '').trim();
if (!clientId) throw new Error('WF_SETUP: id-ul clientului lipsește.');

return [{ json: { client_id: clientId, apply: String(form.Mod || '').toLowerCase().startsWith('aplic') } }];`));

  wf.node('Încarcă configul', EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW00_LOAD_CONFIG'), RETRY);

  // Trei citiri, ca să știm ce există deja. Fără ele planul n-ar fi idempotent.
  const read = (label, resource, query) => {
    wf.node(`Cere ${label}`, CODE, 2, codeNode(`${header(`WF_SETUP · citire ${label}`, 'Ce există deja în sub-cont.')}
const clientId = $('Citește parametrii').first().json.client_id;
return [{ json: {
  client_id: clientId,
  method: 'GET',
  path: '/locations/{locationId}/${resource}',
  query: ${JSON.stringify(query || {})},
} }];`));
    wf.node(`Citește ${label}`, EXEC_WF, 1.2, executeWorkflowParams('WF_ID_SW01_GHL_API'), RETRY);
  };

  read('custom fields', 'customFields', { model: 'contact' });
  read('tag-urile', 'tags');
  read('custom values', 'customValues');

  wf.node('Construiește planul', CODE, 2, codeNode(`${header('WF_SETUP · plan', 'Aceeași funcție folosită de scripts/provision-ghl.mjs — un singur loc de întreținut.')}
${inline('derive.mjs', 'provision.mjs')}

// ── glue n8n ──
const params = $('Citește parametrii').first().json;
const config = $('Încarcă configul').first().json.config;

const existing = {
  customFields: $('Citește custom fields').first().json?.data?.customFields || [],
  tags: $('Citește tag-urile').first().json?.data?.tags || [],
  customValues: $('Citește custom values').first().json?.data?.customValues || [],
};

const plan = buildProvisionPlan({ config, existing });

return [{ json: {
  client_id: params.client_id,
  apply: params.apply,
  summary: plan.summary,
  conflicts: plan.conflicts,
  operations: plan.operations,
} }];`));

  wf.node('Aplicăm?', IF, 2.2, { conditions: boolCondition('={{ $json.apply }}'), options: {} });

  wf.node('Desfășoară operațiunile', CODE, 2, codeNode(`${header('WF_SETUP · execuție', 'Un item per operațiune; SW01 le execută secvențial, ca un 429 să nu lase sub-contul pe jumătate provisionat.')}
const plan = $input.first().json;
if (!plan.operations.length) return [{ json: { client_id: plan.client_id, nothing_to_do: true } }];

return plan.operations.map((operation) => ({ json: {
  client_id: plan.client_id,
  method: operation.method,
  path: operation.path,
  body: operation.body,
  _op: { kind: operation.kind, action: operation.action, label: operation.label },
} }));`), {}, 1);

  wf.node('Creează în GHL', EXEC_WF, 1.2, { ...executeWorkflowParams('WF_ID_SW01_GHL_API'), mode: 'each' }, RETRY, 1);

  wf.advance();
  wf.node('Raport', CODE, 2, codeNode(`${header('WF_SETUP · raport', 'Ce s-a făcut, ce a rămas de rezolvat manual.')}
const plan = $('Construiește planul').first().json;
const applied = plan.apply ? $input.all().length : 0;

const lines = [
  plan.apply ? \`Aplicat pe "\${plan.client_id}": \${applied} operațiuni.\` : \`Plan pentru "\${plan.client_id}" (nu s-a scris nimic).\`,
  \`  de creat:      \${plan.summary.to_create}\`,
  \`  de actualizat: \${plan.summary.to_update}\`,
  \`  neschimbate:   \${plan.summary.unchanged}\`,
  \`  custom fields: +\${plan.summary.custom_fields.create} ~\${plan.summary.custom_fields.update}\`,
  \`  tag-uri:       +\${plan.summary.tags.create}\`,
  \`  custom values: +\${plan.summary.custom_values.create} ~\${plan.summary.custom_values.update}\`,
];
if (plan.conflicts.length) {
  lines.push('', \`\${plan.conflicts.length} conflicte de rezolvat manual în GHL:\`);
  for (const c of plan.conflicts) lines.push(\`  \${c.label} — \${c.detail}\`);
}

return [{ json: { client_id: plan.client_id, applied_operations: applied, summary: plan.summary, conflicts: plan.conflicts, report: lines.join('\\n') } }];`));

  wf.chain(
    'Formular de provisioning', 'Citește parametrii', 'Încarcă configul',
    'Cere custom fields', 'Citește custom fields',
    'Cere tag-urile', 'Citește tag-urile',
    'Cere custom values', 'Citește custom values',
    'Construiește planul', 'Aplicăm?',
  );
  wf.connect('Aplicăm?', 'Desfășoară operațiunile', 0);
  wf.connect('Aplicăm?', 'Raport', 1);
  wf.chain('Desfășoară operațiunile', 'Creează în GHL', 'Raport');

  return wf.build({
    description: 'Creează în GHL tot ce cere configul unui client. Idempotent. Alternativa la scripts/provision-ghl.mjs pentru cazul în care rețeaua de unde rulezi scriptul nu are acces la API-ul GHL — logica de plan e aceeași funcție.',
    tags: ['fundatie', 'setup'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════

function buildAll() {
  return [
    ['SW00_load_client_config.json', buildLoadConfig(), 'WF_ID_SW00_LOAD_CONFIG'],
    ['SW01_ghl_api_request.json', buildGhlApi(), 'WF_ID_SW01_GHL_API'],
    ['SW02_send_guard.json', buildSendGuard(), 'WF_ID_SW02_SEND_GUARD'],
    ['SW03_send_message.json', buildSendMessage(), 'WF_ID_SW03_SEND_MESSAGE'],
    ['WF00_preferences_intake.json', buildPreferencesIntake(), 'WF_ID_WF00_PREFERENCES'],
    ['WF_ERR_alerting.json', buildErrorWorkflow(), 'WF_ID_WF_ERR_ALERTING'],
    ['WF_SETUP_provisioning.json', buildProvisioning(), 'WF_ID_WF_SETUP_PROVISIONING'],
  ];
}

for (const target of TARGETS) {
  TARGET = target;
  IS_STARTER = target === 'cloud-starter';
  PLACEHOLDERS = [];
  OUT_DIR = path.join(WORKFLOWS_ROOT, target);

  const workflows = buildAll();
  const settingNames = workflows.map(([, , envVar]) => envVar);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\n── ${target} ──`);
  for (const [file, workflow] of workflows) {
    const emitted = retarget(workflow);
    fs.writeFileSync(path.join(OUT_DIR, file), `${JSON.stringify(emitted, null, 2)}\n`);
    console.log(`  ${file.padEnd(34)} ${emitted.nodes.length} noduri`);
  }

  if (IS_STARTER) {
    // Pe Starter nu există variabile: se completează manual, o dată pe instanță.
    const lines = [
      '# Import în n8n Cloud Starter',
      '',
      'Generat de `npm run build:n8n`. Nu edita manual.',
      '',
      'Starter nu are nici variabile de mediu, nici Variables (`$vars` e pe Pro). De aceea',
      'setările de instanță apar în workflow-uri ca marcaje `__COMPLETEAZA_...__` pe care le',
      'completezi o singură dată, la import.',
      '',
      '**Consecință de arhitectură:** pe Starter merge o singură agenție per instanță, fiindcă',
      'tokenul GHL e o credențială fixă pe node, nu una aleasă după `client_id`. Când adaugi a',
      'doua agenție, treci pe Pro și folosești workflow-urile din `../cloud-pro/` — marcajele',
      'dispar și multi-client funcționează fără să atingi vreun node.',
      '',
      '## 1. Importă workflow-urile',
      '',
      ...workflows.map(([file]) => `- [ ] \`${file}\``),
      '',
      '## 2. Credențiale',
      '',
      `- [ ] Header Auth, numită exact **${GHL_CREDENTIAL_NAME}** — Name: \`Authorization\`, Value: \`Bearer pit-...\``,
      '- [ ] SMTP, pentru workflow-ul de alertare',
      '- [ ] Google Sheets, pentru raportare',
      '',
      '## 3. Completează marcajele',
      '',
      'Caută fiecare marcaj în workflow-ul indicat și înlocuiește-l cu valoarea reală.',
      '',
      '| Marcaj | Ce pui în loc |',
      '|---|---|',
      ...PLACEHOLDERS.map((p) => `| \`__COMPLETEAZA_${p.name}__\` | ${p.what} |`),
      '',
      'Id-urile de workflow se iau din URL după import: `.../workflow/<ID>`.',
      '',
      '## 4. Error workflow',
      '',
      '- [ ] La fiecare workflow: Settings → Error Workflow → `WF_ERR · Alertare la eșec`',
      '',
      '## 5. Provisioning GHL',
      '',
      '- [ ] Deschide formularul workflow-ului `WF_SETUP · Provisioning GHL`',
      '- [ ] Scrie id-ul clientului, alege „Doar planul", verifică raportul',
      '- [ ] Rulează din nou cu „Aplică"',
      '',
      '## Atenție la cota de execuții',
      '',
      'Starter are 2.500 execuții/lună și **se oprește** când o atingi, nu te avertizează.',
      'Urmărește-o în primele săptămâni: fluxurile tranzacționale consumă puțin, campaniile',
      'trimise per contact consumă mult.',
      '',
    ];
    fs.writeFileSync(path.join(OUT_DIR, 'IMPORT.md'), lines.join('\n'));
    console.log(`  IMPORT.md                          ${PLACEHOLDERS.length} marcaje de completat`);
  } else {
    const isVars = target === 'cloud-pro';
    const example = [
      `# ${isVars ? 'Variables n8n Cloud Pro (Settings → Variables)' : 'Variabile de mediu n8n'}`,
      '# Se completează o dată pe instanță + o dată pe client.',
      '# Niciun secret nu intră în JSON-urile de workflow.',
      isVars ? '' : '# Necesită N8N_BLOCK_ENV_ACCESS_IN_NODE=false.',
      '',
      '# ── Pe instanță ──',
      '# De unde citește n8n config/clients/<client-id>.json',
      'CONFIG_BASE_URL=',
      'CONFIG_CACHE_TTL_SECONDS=300',
      'ALERT_EMAIL=',
      'ALERT_FROM_EMAIL=',
      'KPI_SPREADSHEET_ID=',
      '',
      '# Id-urile workflow-urilor după import (din URL: .../workflow/<ID>).',
      ...settingNames.map((name) => `${name}=`),
      '',
      '# ── Pe client (sufix = client_id cu majuscule și _ în loc de -) ──',
      '# Numele exacte vin din config: integrations.ghl.token_env și location_id_env.',
      'GHL_PIT_<CLIENT>=',
      'GHL_LOCATION_ID_<CLIENT>=',
      'FORM_SECRET_<CLIENT>=',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(OUT_DIR, 'SETTINGS.example'), example);
    console.log(`  SETTINGS.example                   ${settingNames.length} id-uri de workflow`);
  }
}
