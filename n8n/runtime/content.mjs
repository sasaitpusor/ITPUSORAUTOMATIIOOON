/**
 * Validarea conținutului generat de Claude, înainte de review uman și înainte de
 * încărcarea ca template în GHL.
 *
 * Premisa: modelul scrie partea persuasivă, inspirațională și educațională.
 * Cifrele nu. Prețuri, procente, disponibilități, date calendaristice și nume de
 * hoteluri intră exclusiv ca merge fields alimentate din GHL sau ca text scris
 * de om. Un text generat care conține așa ceva e respins automat — nu ajunge
 * nici măcar la revizuire, ca omul să nu fie pus în situația de a valida o cifră
 * inventată care arată plauzibil.
 */

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * @param {object} args
 * @param {object} args.config
 * @param {object} args.piece  { channel, category, text, subject?, expected_merge_fields? }
 * @returns {{ok:boolean, violations:Array<{type:string, detail:string}>, stats:object}}
 */
export function validateGeneratedContent({ config, piece }) {
  const violations = [];
  const text = [piece.subject, piece.text].filter(Boolean).join('\n');

  // 1. Cifre și fapte inventate.
  for (const pattern of config.content.forbidden_in_generated.patterns) {
    let re;
    try { re = new RegExp(pattern, 'giu'); } catch { continue; }
    // Tokenii sunt legitimi chiar dacă tiparul i-ar prinde: se scot înainte de test.
    const withoutTokens = text.replace(TOKEN_RE, ' ');
    const hit = withoutTokens.match(re);
    if (hit) violations.push({ type: 'forbidden_pattern', detail: `"${hit[0].trim()}" (tipar: ${pattern})` });
  }

  // 2. Toți tokenii folosiți trebuie să fie declarați, altfel ajung ca atare la client.
  const known = new Set(config.merge_fields.map((mf) => mf.token));
  for (const match of text.matchAll(TOKEN_RE)) {
    if (!known.has(match[1])) violations.push({ type: 'unknown_merge_field', detail: match[1] });
  }

  // 3. Merge fields obligatorii pentru pasul respectiv.
  for (const token of piece.expected_merge_fields || []) {
    if (!text.includes(`{{${token}}}`)) violations.push({ type: 'missing_merge_field', detail: token });
  }

  // 4. Limite de canal.
  if (piece.channel === 'sms') {
    const limit = config.content.sms_limits.max_chars_gsm7;
    if (piece.text.length > limit) {
      violations.push({ type: 'sms_too_long', detail: `${piece.text.length} > ${limit}` });
    }
  }
  if (piece.channel === 'email' && !piece.subject) {
    violations.push({ type: 'missing_subject', detail: 'email fără subiect' });
  }

  // 5. Categoria trebuie să fie una dintre cele măsurate în raportul de conținut.
  const categories = Object.keys(config.content.mix_targets);
  if (!categories.includes(piece.category)) {
    violations.push({ type: 'unknown_category', detail: `${piece.category} ∉ {${categories.join(', ')}}` });
  }

  return {
    ok: violations.length === 0,
    violations,
    stats: { chars: piece.text.length, tokens: [...new Set([...text.matchAll(TOKEN_RE)].map((m) => m[1]))] },
  };
}

/**
 * Raportul efectiv de categorii dintr-un set de piese, față de țintele din config.
 * Fără măsurătoare, raportul 40/20/20/20 e o declarație, nu o regulă.
 */
export function measureContentMix({ config, pieces }) {
  const total = pieces.length || 1;
  const counts = {};
  for (const category of Object.keys(config.content.mix_targets)) counts[category] = 0;
  for (const p of pieces) if (p.category in counts) counts[p.category]++;

  const rows = Object.entries(config.content.mix_targets).map(([category, target]) => {
    const actual = counts[category] / total;
    return { category, target, actual, delta: actual - target, count: counts[category] };
  });
  return { total: pieces.length, rows, balanced: rows.every((r) => Math.abs(r.delta) <= 0.05) };
}
