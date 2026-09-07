#!/usr/bin/env node
/**
 * Teste pentru logica de runtime inlinată în node-urile Code din n8n.
 *
 *   npm test
 *
 * Fără framework, intenționat: aceleași motive ca la validator — scripturile
 * trebuie să ruleze pe un runner curat, fără `npm install`. Ce se testează aici
 * este exact codul care ajunge în workflow-uri (vezi scripts/build-n8n.mjs).
 */

import { evaluateGuard, journalEntry, nextAllowedWindow } from '../n8n/runtime/guard.mjs';
import { renderTemplate } from '../n8n/runtime/render.mjs';
import { mapPreferences } from '../n8n/runtime/preferences.mjs';
import { validateGeneratedContent } from '../n8n/runtime/content.mjs';
import { loadConfig } from './lib/config.mjs';

const config = loadConfig('dor-travel');
let passed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failures.push(`${name}: ${e.message}`); }
}
function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual); const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what} — am primit ${a}, așteptam ${b}`);
}
function ok(cond, what) { if (!cond) throw new Error(what || 'condiție falsă'); }

const LOG_FIELD = config.sending_rules.log.field_key;
const contactBase = (overrides = {}) => ({
  id: 'contact-test-1',
  tags: ['consim_email', 'consim_sms'],
  customFields: { consim_email: true, consim_sms: true, [LOG_FIELD]: '[]' },
  ...overrides,
});
const req = (overrides = {}) => ({
  flow_id: 'nurturing', step_id: 'nu1', channel: 'email',
  category: 'inspiratie', kind: 'commercial', occurrence_key: '2026-W37',
  ...overrides,
});
// 13:00 în Europe/Bucharest — în interiorul oricărei ferestre.
const NOON = '2026-09-07T10:00:00Z';

// ─── Garda de trimitere ────────────────────────────────────────────────────

test('trimite când totul e în regulă', () => {
  const d = evaluateGuard({ config, contact: contactBase(), request: req(), nowIso: NOON });
  eq(d.action, 'send', 'acțiune');
  ok(d.idempotency_key.includes('dor-travel'), 'cheia de idempotență conține clientul');
});

test('fără consimțământ pe canal nu se trimite', () => {
  const contact = contactBase({ customFields: { consim_email: false, [LOG_FIELD]: '[]' } });
  const d = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq([d.action, d.reason], ['drop', 'no_consent']);
});

test('opt-out bate consimțământul', () => {
  const contact = contactBase({ tags: ['consim_email', 'optout_email'] });
  const d = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq([d.action, d.reason], ['drop', 'opted_out']);
});

test('opt-out pe SMS nu blochează emailul', () => {
  const contact = contactBase({ tags: ['optout_sms'] });
  const d = evaluateGuard({ config, contact, request: req({ channel: 'email' }), nowIso: NOON });
  eq(d.action, 'send');
});

test('același mesaj nu pleacă de două ori la re-rulare', () => {
  const first = evaluateGuard({ config, contact: contactBase(), request: req(), nowIso: NOON });
  const entry = journalEntry({ request: req(), idempotencyKey: first.idempotency_key, nowIso: NOON });
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: JSON.stringify([entry]) } });
  const second = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq([second.action, second.reason], ['drop', 'duplicate']);
});

test('ocurență diferită a aceluiași pas trece', () => {
  const twoDaysAgo = new Date(Date.parse(NOON) - 2 * 86400000).toISOString();
  const entry = journalEntry({ request: req(), idempotencyKey: 'dor-travel:contact-test-1:nurturing:nu1:2026-W36', nowIso: twoDaysAgo });
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: JSON.stringify([entry]) } });
  const d = evaluateGuard({ config, contact, request: req({ occurrence_key: '2026-W37' }), nowIso: NOON });
  eq(d.action, 'send');
});

test('cine e în flux de plecare nu primește comercial', () => {
  const contact = contactBase({ tags: ['consim_email', 'flux_pre_departure'] });
  const d = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq([d.action, d.reason], ['drop', 'suppressed_by_exclusive_flow']);
});

test('cine e în vacanță primește totuși tranzacționalele', () => {
  const contact = contactBase({ tags: ['consim_email', 'flux_in_trip'] });
  const d = evaluateGuard({ config, contact, request: req({ flow_id: 'pre_departure', step_id: 'd14', kind: 'transactional' }), nowIso: NOON });
  eq(d.action, 'send');
});

test('plafonul de frecvență amână, nu pierde mesajul', () => {
  const sent = [0, 1, 2].map((i) => ({
    t: new Date(Date.parse(NOON) - (i + 1) * 86400000).toISOString(),
    f: 'nurturing', s: 'nu1', c: 'email', k: 'commercial', key: `k${i}`,
  }));
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: JSON.stringify(sent) } });
  const d = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq([d.action, d.reason], ['defer', 'frequency_cap']);
  ok(Date.parse(d.defer_until) > Date.parse(NOON), 'amânarea e în viitor');
});

test('tranzacționalele trec peste plafon', () => {
  const sent = [0, 1, 2, 3].map((i) => ({
    t: new Date(Date.parse(NOON) - (i + 1) * 3600000).toISOString(),
    f: 'nurturing', s: 'nu1', c: 'email', k: 'commercial', key: `k${i}`,
  }));
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: JSON.stringify(sent) } });
  const d = evaluateGuard({ config, contact, request: req({ kind: 'transactional', flow_id: 'booking_confirmed', step_id: 'b1' }), nowIso: NOON });
  eq(d.action, 'send');
});

test('se respectă pauza minimă între mesaje comerciale', () => {
  const sent = [{ t: new Date(Date.parse(NOON) - 3600000).toISOString(), f: 'x', s: 'y', c: 'email', k: 'commercial', key: 'k' }];
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: JSON.stringify(sent) } });
  const d = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq([d.action, d.reason], ['defer', 'min_gap_between_commercial']);
});

test('SMS-ul de noapte se amână la 09:00 local', () => {
  const night = '2026-09-07T00:30:00Z'; // 03:30 în București
  const contact = contactBase({ customFields: { consim_sms: true, [LOG_FIELD]: '[]' } });
  const d = evaluateGuard({ config, contact, request: req({ channel: 'sms', kind: 'transactional' }), nowIso: night });
  eq([d.action, d.reason], ['defer', 'outside_sending_window']);
  eq(d.defer_until, '2026-09-07T06:00:00.000Z', 'ora locală 09:00 = 06:00 UTC vara');
});

test('emailul nu are restricție orară', () => {
  const d = evaluateGuard({ config, contact: contactBase(), request: req({ kind: 'transactional' }), nowIso: '2026-09-07T00:30:00Z' });
  eq(d.action, 'send');
});

test('fereastra orară se calculează corect și iarna', () => {
  const w = { enforced: true, start: '09:00', end: '20:00' };
  const winterNight = new Date('2026-01-15T04:00:00Z'); // 06:00 local, EET
  eq(nextAllowedWindow(winterNight, 'Europe/Bucharest', w).toISOString(), '2026-01-15T07:00:00.000Z');
});

test('fereastra orară trece peste schimbarea orei de vară', () => {
  const w = { enforced: true, start: '09:00', end: '20:00' };
  // 29 martie 2026, ora 03:00 locală devine 04:00 — trecerea la ora de vară.
  const beforeSwitch = new Date('2026-03-29T00:30:00Z'); // 02:30 local, încă EET
  eq(nextAllowedWindow(beforeSwitch, 'Europe/Bucharest', w).toISOString(), '2026-03-29T06:00:00.000Z');
});

test('pasul WhatsApp se sare cât timp integrarea nu e activă', () => {
  const d = evaluateGuard({ config, contact: contactBase({ customFields: { consim_whatsapp: true, [LOG_FIELD]: '[]' } }), request: req({ channel: 'whatsapp', kind: 'transactional' }), nowIso: NOON });
  eq([d.action, d.reason], ['drop', 'channel_unavailable']);
});

test('un jurnal corupt nu blochează trimiterea', () => {
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: '{nu e json' } });
  const d = evaluateGuard({ config, contact, request: req({ kind: 'transactional' }), nowIso: NOON });
  eq(d.action, 'send');
});

test('intrările vechi din jurnal nu mai contează la plafon', () => {
  const old = [0, 1, 2].map((i) => ({
    t: new Date(Date.parse(NOON) - (30 + i) * 86400000).toISOString(),
    f: 'nurturing', s: 'nu1', c: 'email', k: 'commercial', key: `old${i}`,
  }));
  const contact = contactBase({ customFields: { consim_email: true, [LOG_FIELD]: JSON.stringify(old) } });
  const d = evaluateGuard({ config, contact, request: req(), nowIso: NOON });
  eq(d.action, 'send');
});

// ─── Randare și fallback ───────────────────────────────────────────────────

const tpl = {
  channel: 'email',
  subject: 'Vacanța ta în {{destinatie_rezervata}}',
  body: 'Bună, {{prenume}}!\nAi achitat {{valoare_avans}}, mai rămâne {{sold_ramas}} până la {{data_limita_plata_finala}}.\n{{consultant_name}}',
};
const fullContact = { id: 'c1', firstName: 'Ana', customFields: {
  destinatie_rezervata: 'Grecia', valoare_avans: '320', sold_ramas: '1280',
  data_limita_plata_finala: '2026-06-15', consultant_alocat: 'Ioana',
} };

test('randează toate merge fields-urile', () => {
  const r = renderTemplate({ config, contact: fullContact, template: tpl });
  ok(r.ok, 'randare reușită');
  ok(!r.body.includes('{{'), 'niciun token rămas');
  ok(r.body.includes('1.280 EUR'), 'sumele sunt formatate în moneda clientului');
  ok(r.body.includes('15 iunie 2026'), 'datele sunt scrise în română');
});

test('«Bună, {{prenume}}» gol nu pleacă niciodată', () => {
  const r = renderTemplate({ config, contact: { ...fullContact, firstName: '' }, template: tpl });
  ok(r.ok, 'mesajul pleacă, dar cu rândul înlocuit');
  ok(r.body.startsWith('Bună!'), `rând alternativ, am primit: ${r.body.split('\n')[0]}`);
  ok(!r.body.includes('Bună, !'), 'fără salut ciuntit');
});

test('lipsa unei valori financiare oprește trimiterea', () => {
  const contact = { id: 'c2', firstName: 'Ana', customFields: { destinatie_rezervata: 'Grecia' } };
  const r = renderTemplate({ config, contact, template: tpl });
  ok(!r.ok, 'blocat');
  eq(r.blocked.sort(), ['data_limita_plata_finala', 'sold_ramas', 'valoare_avans']);
});

test('un token nedeclarat blochează trimiterea', () => {
  const r = renderTemplate({ config, contact: fullContact, template: { channel: 'email', body: 'Salut {{token_inventat}}' } });
  ok(!r.ok && r.blocked.includes('token_inventat'), 'token necunoscut prins');
});

test('SMS-ul prea lung nu pleacă', () => {
  const r = renderTemplate({ config, contact: fullContact, template: { channel: 'sms', body: 'x'.repeat(400) } });
  ok(!r.ok, 'blocat pe lungime');
});

test('consultantul lipsă cade pe valoarea implicită', () => {
  const contact = { ...fullContact, customFields: { ...fullContact.customFields, consultant_alocat: '' } };
  const r = renderTemplate({ config, contact, template: tpl });
  ok(r.ok && r.body.includes('Echipa Dor Travel'), 'fallback pe echipă');
});

// ─── Formularul de preferințe ──────────────────────────────────────────────

test('formularul mapează etichete în tag-uri', () => {
  const r = mapPreferences({ config, payload: {
    email: '  Ana@Example.COM ', first_name: 'Ana',
    oras_plecare: 'Cluj-Napoca', destinatii_favorite: ['Grecia', 'Turcia'],
    buget_estimat: '700–1000€', tip_turist: 'Familie', consent_email: 'da',
  }, nowIso: NOON });
  eq(r.contact.email, 'ana@example.com', 'email normalizat');
  ok(r.tagsToAdd.includes('dest_grecia') && r.tagsToAdd.includes('plecare_cluj'), 'tag-uri de axă');
  ok(r.tagsToAdd.includes('consim_email'), 'tag de consimțământ');
  eq(r.customFields.consim_email_data, '2026-09-07', 'data consimțământului');
});

test('schimbarea bugetului scoate segmentul vechi', () => {
  const r = mapPreferences({ config, existingTags: ['buget_sub_700'], payload: { email: 'a@b.ro', buget_estimat: 'peste 1500€' }, nowIso: NOON });
  eq(r.tagsToAdd, ['buget_peste_1500']);
  eq(r.tagsToRemove, ['buget_sub_700']);
});

test('o destinație ștearsă din formular nu mai primește oferte', () => {
  const r = mapPreferences({ config, existingTags: ['dest_egipt', 'dest_grecia'], payload: { email: 'a@b.ro', destinatii_favorite: ['Grecia'] }, nowIso: NOON });
  eq(r.tagsToRemove, ['dest_egipt']);
});

test('formularul parțial nu șterge axele pe care nu le trimite', () => {
  const r = mapPreferences({ config, existingTags: ['dest_egipt', 'buget_sub_700'], payload: { email: 'a@b.ro', buget_estimat: 'sub 700€' }, nowIso: NOON });
  eq(r.tagsToRemove, [], 'nimic de șters');
});

test('retragerea consimțământului setează opt-out', () => {
  const r = mapPreferences({ config, existingTags: ['consim_sms'], payload: { email: 'a@b.ro', consent_sms: false }, nowIso: NOON });
  ok(r.tagsToRemove.includes('consim_sms') && r.tagsToAdd.includes('optout_sms'), 'opt-out aplicat');
  eq(r.customFields.consim_sms, false);
});

test('valorile nerecunoscute se raportează, nu se scriu', () => {
  const r = mapPreferences({ config, payload: { email: 'a@b.ro', destinatii_favorite: ['Groenlanda'] }, nowIso: NOON });
  eq(r.tagsToAdd, []);
  ok(r.warnings.some((w) => w.includes('Groenlanda')), 'avertisment emis');
});

test('un contact fără email și fără telefon e respins', () => {
  const r = mapPreferences({ config, payload: { first_name: 'Ana' }, nowIso: NOON });
  ok(!r.valid, 'invalid');
});

// ─── Validarea conținutului generat ────────────────────────────────────────

test('textul cu preț inventat e respins', () => {
  const r = validateGeneratedContent({ config, piece: { channel: 'email', category: 'oferta', text: 'Sejur în Grecia de la 499 EUR!' } });
  ok(!r.ok && r.violations.some((v) => v.type === 'forbidden_pattern'), 'preț prins');
});

test('textul cu procent de reducere e respins', () => {
  const r = validateGeneratedContent({ config, piece: { channel: 'email', category: 'oferta', text: 'Rezervi acum cu 20% avans.' } });
  ok(!r.ok, 'procent prins');
});

test('textul cu disponibilitate inventată e respins', () => {
  const r = validateGeneratedContent({ config, piece: { channel: 'email', category: 'oferta', text: 'Mai sunt 3 locuri disponibile.' } });
  ok(!r.ok, 'disponibilitate prinsă');
});

test('textul curat cu merge fields trece', () => {
  const r = validateGeneratedContent({ config, piece: {
    channel: 'email', category: 'inspiratie', subject: 'Grecia, altfel',
    text: 'Bună, {{prenume}}! Grecia în {{numar_nopti}} nopți înseamnă dimineți liniștite și seri lungi.',
  } });
  ok(r.ok, `ar fi trebuit să treacă: ${JSON.stringify(r.violations)}`);
});

test('SMS-ul generat prea lung e respins', () => {
  const r = validateGeneratedContent({ config, piece: { channel: 'sms', category: 'oferta', text: 'a'.repeat(400) } });
  ok(!r.ok && r.violations.some((v) => v.type === 'sms_too_long'), 'lungime prinsă');
});

test('tokenul nedeclarat în textul generat e respins', () => {
  const r = validateGeneratedContent({ config, piece: { channel: 'email', category: 'inspiratie', text: 'Salut {{nume_hotel_inventat}}' } });
  ok(!r.ok && r.violations.some((v) => v.type === 'unknown_merge_field'), 'token prins');
});

// ─── Raport ────────────────────────────────────────────────────────────────

console.log(`\n${passed} teste trecute` + (failures.length ? `, ${failures.length} eșuate:` : ''));
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
