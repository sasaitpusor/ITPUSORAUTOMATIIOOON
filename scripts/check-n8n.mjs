#!/usr/bin/env node
/**
 * Verifică workflow-urile generate înainte de import în n8n.
 *
 *   npm run check:n8n
 *
 * Trei lucruri care altfel se descoperă abia în producție:
 *  - structura: conexiuni către noduri inexistente, noduri orfane, JS invalid
 *    într-un node Code (n8n îl acceptă la import și crapă abia la rulare);
 *  - secrete: nicio credențială sau token în JSON-ul livrat;
 *  - reutilizabilitate: niciun literal specific unui client în workflow-uri.
 *    Ăsta e testul din brief — dacă un client nou ar cere editarea unui node,
 *    verificarea pică aici, nu peste trei luni la al doilea client.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, loadConfig, listClientIds, deriveAxisTags } from './lib/config.mjs';

const WF_DIR = path.join(ROOT, 'n8n', 'workflows');
const TRIGGER_TYPES = /(Trigger|webhook)$/i;

const SECRET_PATTERNS = [
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{10,}/ },
  { name: 'GHL PIT', re: /\bpit-[0-9a-f-]{20,}/i },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./ },
  { name: 'Twilio SID', re: /\bAC[0-9a-f]{32}\b/i },
  { name: 'Google private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/**
 * Literale specifice unui client care nu au ce căuta într-un workflow.
 * Se derivă din configuri, ca lista să crească singură cu fiecare client nou.
 */
function clientLiterals() {
  const literals = new Map();
  for (const id of listClientIds()) {
    const config = loadConfig(id);
    const add = (value, why) => {
      const v = String(value || '').trim();
      if (v.length >= 4) literals.set(v.toLowerCase(), why);
    };
    add(config.client.id, `client_id al lui ${id}`);
    add(config.client.agency_name, `numele agenției ${id}`);
    add(config.client.product_name, `numele produsului ${id}`);
    for (const t of deriveAxisTags(config)) add(t.label, `valoare de taxonomie (${t.axis}) a lui ${id}`);
    for (const c of config.consultants.list) add(c.name, `nume de consultant al lui ${id}`);
    for (const key of ['from_address', 'sending_domain', 'reply_to']) add(config.integrations.email[key], `email al lui ${id}`);
  }
  // Valorile-marcaj din config nu sunt scurgeri de date.
  for (const placeholder of [...literals.keys()]) {
    if (placeholder.startsWith('tbd') || placeholder.startsWith('todo')) literals.delete(placeholder);
  }
  return literals;
}

const literals = clientLiterals();
const problems = [];
const files = fs.readdirSync(WF_DIR).filter((f) => f.endsWith('.json')).sort();

if (!files.length) {
  console.error('Niciun workflow în n8n/workflows. Rulează întâi `npm run build:n8n`.');
  process.exit(1);
}

for (const file of files) {
  const fail = (msg) => problems.push(`${file}: ${msg}`);
  const raw = fs.readFileSync(path.join(WF_DIR, file), 'utf8');

  let wf;
  try { wf = JSON.parse(raw); } catch (e) { fail(`JSON invalid — ${e.message}`); continue; }

  const names = new Set(wf.nodes.map((n) => n.name));
  if (names.size !== wf.nodes.length) fail('nume de noduri duplicate');

  const ids = new Set(wf.nodes.map((n) => n.id));
  if (ids.size !== wf.nodes.length) fail('id-uri de noduri duplicate');

  // Conexiuni către noduri care există
  const reached = new Set();
  for (const [from, conn] of Object.entries(wf.connections)) {
    if (!names.has(from)) fail(`conexiune pornind din nodul inexistent "${from}"`);
    for (const output of conn.main || []) {
      for (const link of output || []) {
        if (!names.has(link.node)) fail(`"${from}" trimite către nodul inexistent "${link.node}"`);
        reached.add(link.node);
      }
    }
  }

  // Noduri orfane
  for (const node of wf.nodes) {
    const isTrigger = TRIGGER_TYPES.test(node.type);
    if (!isTrigger && !reached.has(node.name) && !node.disabled) {
      fail(`nodul "${node.name}" nu e conectat la nimic`);
    }
  }

  // Cod JS valid în node-urile Code
  for (const node of wf.nodes.filter((n) => n.type === 'n8n-nodes-base.code')) {
    const code = node.parameters?.jsCode;
    if (!code) { fail(`node Code fără cod: "${node.name}"`); continue; }
    try {
      new vm.Script(`(async () => {\n${code}\n})`);
    } catch (e) {
      fail(`JS invalid în "${node.name}" — ${e.message}`);
    }
  }

  // Secrete
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(raw)) fail(`conține ce pare a fi un ${name}`);
  }
  for (const node of wf.nodes) {
    if (node.credentials) {
      for (const [type, cred] of Object.entries(node.credentials)) {
        if (cred && typeof cred === 'object' && Object.keys(cred).some((k) => !['id', 'name'].includes(k))) {
          fail(`nodul "${node.name}" are date de credențial inline (${type})`);
        }
      }
    }
  }

  // Reutilizabilitate: niciun literal de client
  const lower = raw.toLowerCase();
  for (const [literal, why] of literals) {
    // Se caută ca text delimitat, ca „Solo" sau „Familie" să nu dea fals pozitiv
    // în mijlocul unui cuvânt.
    const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9_-])${escaped}([^a-z0-9_-]|$)`).test(lower)) {
      fail(`conține literalul "${literal}" (${why}) — mută-l în config`);
    }
  }
}

console.log(`\nVerificate ${files.length} workflow-uri:`);
for (const file of files) {
  const wf = JSON.parse(fs.readFileSync(path.join(WF_DIR, file), 'utf8'));
  const mine = problems.filter((p) => p.startsWith(`${file}:`));
  console.log(`  ${mine.length ? '✗' : '✓'} ${file.padEnd(34)} ${String(wf.nodes.length).padStart(2)} noduri`);
  for (const p of mine) console.log(`      ${p.slice(file.length + 2)}`);
}

if (problems.length) {
  console.log(`\n${problems.length} probleme.`);
  process.exit(1);
}
console.log(`\n✓ structură validă, fără secrete, fără literale de client (${literals.size} literale verificate)`);
