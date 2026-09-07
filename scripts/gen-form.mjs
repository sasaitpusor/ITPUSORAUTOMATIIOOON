#!/usr/bin/env node
/**
 * Generează formularul de preferințe din configul clientului.
 *
 *   node scripts/gen-form.mjs dor-travel
 *
 * Un singur fișier HTML, fără dependințe, care postează către webhook-ul
 * WF00 (/webhook/preferinte/<client-id>). Câmpurile și opțiunile vin din
 * taxonomia din config: o destinație nouă apare în formular fără să atingă
 * nimeni HTML-ul.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig } from './lib/config.mjs';

const clientId = process.argv[2];
if (!clientId) {
  console.error('Utilizare: node scripts/gen-form.mjs <client-id>');
  process.exit(2);
}
const config = loadConfig(clientId);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const axisOrder = ['departure_city', 'destination', 'period', 'duration', 'budget', 'hotel_category', 'meal_plan', 'luggage', 'tourist_type'];
const axisLabel = {
  departure_city: 'Din ce oraș pleci cel mai ușor?',
  destination: 'Unde ți-ar plăcea să ajungi?',
  period: 'În ce perioadă ai vrea să pleci?',
  duration: 'Câte nopți ți se par potrivite?',
  budget: 'La ce buget de persoană te gândești?',
  hotel_category: 'Ce categorie de resort preferi?',
  meal_plan: 'Ce regim de masă vrei?',
  luggage: 'Bagaj',
  tourist_type: 'Cu cine călătorești de obicei?',
};

const fields = axisOrder
  .filter((name) => config.taxonomy.axes[name])
  .map((name) => {
    const axis = config.taxonomy.axes[name];
    const label = axisLabel[name] || name;
    const options = axis.values.map((v) => ({ key: v.key, label: v.label }));

    if (axis.multi) {
      return `      <fieldset>
        <legend>${esc(label)}</legend>
        <div class="chips">
${options.map((o) => `          <label class="chip"><input type="checkbox" name="${esc(axis.field_key)}" value="${esc(o.label)}"><span>${esc(o.label)}</span></label>`).join('\n')}
        </div>
      </fieldset>`;
    }
    return `      <label class="field">
        <span>${esc(label)}</span>
        <select name="${esc(axis.field_key)}">
          <option value="">— alege —</option>
${options.map((o) => `          <option value="${esc(o.label)}">${esc(o.label)}</option>`).join('\n')}
        </select>
      </label>`;
  })
  .join('\n');

const consentRows = Object.keys(config.compliance.consent_fields).map((channel) => {
  const labels = { email: 'pe email', sms: 'prin SMS', whatsapp: 'pe WhatsApp' };
  return `        <label class="consent"><input type="checkbox" name="consent_${esc(channel)}" value="da"><span>Vreau să primesc propuneri de vacanță ${esc(labels[channel] || channel)}.</span></label>`;
}).join('\n');

const html = `<!doctype html>
<html lang="${esc(config.client.locale.split('-')[0])}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preferințele tale de călătorie — ${esc(config.client.agency_name)}</title>
<!--
  Generat de scripts/gen-form.mjs din config/clients/${esc(clientId)}.json.
  Nu edita manual: modifică taxonomia din config și regenerează.
  Endpoint-ul și secretul se completează la publicare (vezi docs/04).
-->
<style>
  :root { color-scheme: light; --ink:#1c1a17; --muted:#6b645c; --line:#e3ded7; --bg:#faf8f5; --accent:#1f6f5c; }
  * { box-sizing: border-box; }
  body { margin:0; padding:2rem 1rem 4rem; font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); }
  main { max-width: 42rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .4rem; }
  .lead { color: var(--muted); margin: 0 0 2rem; }
  fieldset { border:1px solid var(--line); border-radius:10px; padding:1rem 1.1rem 1.2rem; margin:0 0 1.1rem; background:#fff; }
  legend { padding: 0 .4rem; font-weight:600; font-size:.95rem; }
  .field { display:block; margin:0 0 1.1rem; }
  .field > span { display:block; font-weight:600; font-size:.95rem; margin-bottom:.35rem; }
  select, input[type=text], input[type=email], input[type=tel] {
    width:100%; padding:.6rem .7rem; border:1px solid var(--line); border-radius:8px; background:#fff; font:inherit; }
  .chips { display:flex; flex-wrap:wrap; gap:.5rem; }
  .chip { display:inline-flex; align-items:center; gap:.4rem; padding:.4rem .7rem; border:1px solid var(--line); border-radius:999px; background:#fff; cursor:pointer; font-size:.93rem; }
  .chip:has(input:checked) { border-color:var(--accent); background:#eef6f3; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
  .consent { display:flex; gap:.55rem; align-items:flex-start; margin:.5rem 0; font-size:.93rem; color:var(--muted); }
  button { margin-top:.5rem; padding:.8rem 1.4rem; border:0; border-radius:8px; background:var(--accent); color:#fff; font:inherit; font-weight:600; cursor:pointer; }
  button[disabled] { opacity:.55; cursor:default; }
  .note { font-size:.85rem; color:var(--muted); margin-top:1.2rem; }
  .status { margin-top:1rem; padding:.8rem 1rem; border-radius:8px; display:none; }
  .status.ok { display:block; background:#eef6f3; border:1px solid #bcded2; }
  .status.err { display:block; background:#fdf0ee; border:1px solid #f0c9c2; }
  @media (max-width:520px) { .row { grid-template-columns:1fr; } }
</style>
</head>
<body>
<main>
  <h1>Ce fel de vacanță ți se potrivește?</h1>
  <p class="lead">${esc(config.brand_voice.positioning_statement)}</p>

  <form id="preferinte" novalidate>
    <fieldset>
      <legend>Cum te găsim</legend>
      <div class="row">
        <label class="field"><span>Prenume</span><input type="text" name="first_name" autocomplete="given-name"></label>
        <label class="field"><span>Nume</span><input type="text" name="last_name" autocomplete="family-name"></label>
      </div>
      <div class="row">
        <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
        <label class="field"><span>Telefon</span><input type="tel" name="phone" autocomplete="tel"></label>
      </div>
    </fieldset>

${fields}

    <fieldset>
      <legend>Pe ce canale vrei să vorbim</legend>
${consentRows}
      <p class="note">Îți poți retrage acordul oricând, separat pe fiecare canal.</p>
    </fieldset>

    <button type="submit">Trimite preferințele</button>
    <div class="status" id="status"></div>
    <p class="note">Datele tale rămân la ${esc(config.client.agency_name)} și sunt folosite doar ca să îți trimitem propuneri relevante.</p>
  </form>
</main>

<script>
  // Se completează la publicare: URL-ul webhook-ului WF00 și secretul de formular.
  const ENDPOINT = window.PREFERINTE_ENDPOINT || '/webhook/preferinte/${esc(clientId)}';
  const FORM_SECRET = window.PREFERINTE_SECRET || '';

  const form = document.getElementById('preferinte');
  const status = document.getElementById('status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = { source: location.href };

    for (const key of new Set(data.keys())) {
      const values = data.getAll(key).filter((v) => v !== '');
      if (!values.length) continue;
      // Câmpurile multi-select trimit listă, restul o singură valoare.
      payload[key] = form.querySelectorAll('[name="' + key + '"]').length > 1 && form.querySelector('[name="' + key + '"]').type === 'checkbox'
        ? values
        : values[0];
    }

    if (!payload.email && !payload.phone) {
      status.className = 'status err';
      status.textContent = 'Avem nevoie de un email sau de un telefon ca să te putem contacta.';
      return;
    }

    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, FORM_SECRET ? { 'X-Form-Secret': FORM_SECRET } : {}),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      status.className = 'status ok';
      status.textContent = 'Gata — am notat preferințele tale. Îți scriem cu propuneri care chiar ți se potrivesc.';
      form.querySelector('button').textContent = 'Trimis';
    } catch (error) {
      button.disabled = false;
      status.className = 'status err';
      status.textContent = 'Nu am putut trimite formularul. Mai încearcă o dată sau scrie-ne direct.';
    }
  });
</script>
</body>
</html>
`;

const out = path.join(ROOT, 'forms', `${clientId}.html`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Scris ${path.relative(ROOT, out)} — ${Object.keys(config.taxonomy.axes).filter((a) => axisOrder.includes(a)).length} axe, ${Object.keys(config.compliance.consent_fields).length} consimțăminte`);
