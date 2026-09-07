/**
 * Randarea template-urilor și regula de fallback pentru merge fields.
 *
 * Regula nenegociabilă: un email cu «Bună, {{prenume}}» gol nu pleacă niciodată.
 * Fiecare token are o strategie declarată în config.merge_fields:
 *   value          → se înlocuiește cu o valoare implicită
 *   alternate_line → rândul care îl conține se schimbă complet
 *   omit_sentence  → propoziția care îl conține dispare
 *   block_send     → mesajul nu pleacă și se ridică alertă
 *
 * Valorile financiare și calendaristice (avans, sold, termen, dată plecare) sunt
 * toate block_send prin config: mai bine un mesaj netrimis decât un mesaj cu un
 * sold gol.
 */

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function resolveSource(source, { contact, config }) {
  const fields = contact.customFields || {};
  if (source.startsWith('custom_field.')) return fields[source.slice('custom_field.'.length)];
  if (source.startsWith('contact.')) return contact[source.slice('contact.'.length)];
  if (source.startsWith('config.')) {
    return source.slice('config.'.length).split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), config);
  }
  return undefined;
}

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';

// Intl introduce spații insecabile (U+00A0, U+202F) în sume și date. Arată la
// fel, dar strică potrivirile de text și numărătoarea de segmente SMS.
const despace = (s) => String(s).replace(/[\u00A0\u202F]/g, ' ');

export function formatValue(value, format, config) {
  if (isEmpty(value)) return '';
  if (format === 'currency') {
    const n = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (!Number.isFinite(n)) return String(value);
    return despace(new Intl.NumberFormat(config.client.locale, { style: 'currency', currency: config.client.currency, maximumFractionDigits: 0 }).format(n));
  }
  if (format && /y{2,4}/.test(format)) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return despace(new Intl.DateTimeFormat(config.client.locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: config.client.timezone }).format(d));
  }
  return String(value);
}

/** Elimină propoziția care conține un token, păstrând restul paragrafului. */
function omitSentenceContaining(text, token) {
  const marker = new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`);
  return text
    .split('\n')
    .map((line) => {
      if (!marker.test(line)) return line;
      const sentences = line.split(/(?<=[.!?])\s+/);
      return sentences.filter((s) => !marker.test(s)).join(' ').trim();
    })
    .filter((line, i, arr) => line !== '' || arr[i - 1] === '')
    .join('\n');
}

/**
 * @param {object} args
 * @param {object} args.config
 * @param {object} args.contact  { customFields, firstName, … }
 * @param {object} args.template { subject?, body, channel }
 * @returns {{ok:boolean, subject:string, body:string, blocked:string[], substituted:object, warnings:string[]}}
 */
export function renderTemplate({ config, contact, template }) {
  const byToken = new Map(config.merge_fields.map((mf) => [mf.token, mf]));
  const blocked = [];
  const warnings = [];
  const substituted = {};

  let subject = template.subject || '';
  let body = template.body || '';

  const used = new Set();
  for (const text of [subject, body]) {
    for (const match of text.matchAll(TOKEN_RE)) used.add(match[1]);
  }

  for (const token of used) {
    const mf = byToken.get(token);
    if (!mf) {
      // Un token nedeclarat înseamnă template greșit, nu date lipsă: mai bine
      // oprim trimiterea decât să livrăm „{{ceva}}" clientului.
      blocked.push(token);
      warnings.push(`token "${token}" nu e declarat în config.merge_fields`);
      continue;
    }

    const raw = resolveSource(mf.source, { contact, config });
    const value = formatValue(raw, mf.format, config);
    substituted[token] = value;

    if (!isEmpty(value)) continue;

    switch (mf.fallback_strategy) {
      case 'value':
        substituted[token] = mf.fallback_value;
        break;
      case 'alternate_line': {
        // Rândul care conține tokenul se înlocuiește integral, ca să nu rămână „Bună, !"
        const marker = new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`);
        const swap = (text) => text.split('\n').map((l) => (marker.test(l) ? mf.alternate_line : l)).join('\n');
        subject = swap(subject);
        body = swap(body);
        substituted[token] = mf.fallback_value ?? '';
        break;
      }
      case 'omit_sentence':
        subject = omitSentenceContaining(subject, token);
        body = omitSentenceContaining(body, token);
        substituted[token] = '';
        break;
      case 'block_send':
      default:
        blocked.push(token);
        break;
    }
  }

  if (blocked.length) {
    return { ok: false, subject, body, blocked, substituted, warnings };
  }

  const replace = (text) => text.replace(TOKEN_RE, (whole, token) => (token in substituted ? substituted[token] : whole));
  subject = replace(subject);
  body = replace(body);

  // Ce a mai rămas neînlocuit e o scăpare de template, nu o valoare lipsă.
  const leftovers = [...`${subject}\n${body}`.matchAll(TOKEN_RE)].map((m) => m[1]);
  if (leftovers.length) {
    return { ok: false, subject, body, blocked: [...new Set(leftovers)], substituted, warnings: [...warnings, 'tokens nerezolvate după randare'] };
  }

  if (template.channel === 'sms') {
    const limit = config.content.sms_limits.max_chars_gsm7;
    if (body.length > limit) {
      return { ok: false, subject, body, blocked: [], substituted, warnings: [...warnings, `SMS de ${body.length} caractere, peste limita de ${limit}`] };
    }
    if (config.content.sms_limits.warn_chars && body.length > config.content.sms_limits.warn_chars) {
      warnings.push(`SMS de ${body.length} caractere — mai mult de un segment`);
    }
  }

  return { ok: true, subject, body, blocked: [], substituted, warnings };
}
