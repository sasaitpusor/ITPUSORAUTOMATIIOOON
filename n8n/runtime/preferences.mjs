/**
 * Traducerea formularului de preferințe în scrieri GHL.
 *
 * Formularul trimite etichetele afișate utilizatorului, nu chei interne. Aici se
 * face maparea etichetă → cheie → tag, folosind exclusiv axele din config: o
 * destinație nouă apare în formular și în tag-uri doar completând configul.
 *
 * Pe axele pentru care formularul trimite o valoare, submisia e autoritară:
 * tag-urile vechi care nu mai apar se scot. Altfel un contact care își schimbă
 * bugetul rămâne în două segmente de buget simultan și primește două comunicări,
 * iar cine șterge o destinație din preferințe continuă să primească oferte pentru ea.
 */

const norm = (v) => String(v ?? '').trim().toLowerCase();

/** Etichetă sau cheie → cheia canonică a axei. null dacă nu se recunoaște. */
export function toAxisKey(axis, input) {
  const wanted = norm(input);
  if (!wanted) return null;
  const hit = axis.values.find((v) => norm(v.key) === wanted || norm(v.label) === wanted);
  return hit ? hit.key : null;
}

export function axisTagsOf(config, contactTags) {
  const map = {};
  for (const [axisName, axis] of Object.entries(config.taxonomy.axes)) {
    map[axisName] = contactTags.filter((t) => norm(t).startsWith(norm(axis.tag_prefix)));
  }
  return map;
}

/**
 * @param {object} args
 * @param {object} args.config
 * @param {object} args.payload   corpul formularului
 * @param {string[]} [args.existingTags]
 * @param {string} [args.source]  de unde vine consimțământul (url formular, import etc.)
 * @param {string} [args.nowIso]
 */
export function mapPreferences({ config, payload, existingTags = [], source = 'formular_preferinte', nowIso }) {
  const now = nowIso || new Date().toISOString();
  const today = now.slice(0, 10);
  const warnings = [];
  const customFields = {};
  const tagsToAdd = [];
  const tagsToRemove = [];
  const current = existingTags.map(String);
  const currentByAxis = axisTagsOf(config, current);

  for (const [axisName, axis] of Object.entries(config.taxonomy.axes)) {
    // Formularul poate trimite fie sub numele axei, fie sub cheia câmpului GHL.
    const raw = payload[axis.field_key] ?? payload[axisName];
    if (raw === undefined || raw === null || raw === '') continue;

    const inputs = Array.isArray(raw) ? raw : [raw];
    if (!axis.multi && inputs.length > 1) {
      warnings.push(`axa "${axisName}" acceptă o singură valoare, formularul a trimis ${inputs.length}; se ia prima`);
    }
    const considered = axis.multi ? inputs : inputs.slice(0, 1);

    const keys = [];
    for (const input of considered) {
      const key = toAxisKey(axis, input);
      if (key) keys.push(key);
      else warnings.push(`valoare nerecunoscută pe axa "${axisName}": ${JSON.stringify(input)}`);
    }
    if (!keys.length) continue;

    const labels = keys.map((k) => axis.values.find((v) => v.key === k).label);
    customFields[axis.field_key] = axis.multi ? labels : labels[0];

    const wantedTags = keys.map((k) => `${axis.tag_prefix}${k}`);
    for (const tag of wantedTags) if (!current.some((t) => norm(t) === norm(tag))) tagsToAdd.push(tag);

    // Când formularul trimite o valoare pentru o axă, submisia e autoritară pe
    // acea axă: tag-urile vechi care nu mai apar se scot. Axele absente din
    // payload rămân neatinse, ca un formular parțial să nu șteargă preferințe.
    for (const stale of currentByAxis[axisName]) {
      if (!wantedTags.some((t) => norm(t) === norm(stale))) tagsToRemove.push(stale);
    }
  }

  // Câmpuri simple, fără axă (nume, oraș de reședință, dată naștere…).
  const plainFields = config.custom_fields.filter((f) => !f.axis).map((f) => f.key);
  for (const key of plainFields) {
    if (payload[key] !== undefined && payload[key] !== '') customFields[key] = payload[key];
  }

  // Consimțământ pe canal: valoarea, data și sursa se scriu împreună — un
  // consimțământ fără dată și sursă nu e utilizabil la o verificare GDPR.
  for (const [channel, def] of Object.entries(config.compliance.consent_fields)) {
    const given = payload[`consent_${channel}`] ?? payload[def.flag];
    if (given === undefined) continue;
    const granted = given === true || norm(given) === 'true' || norm(given) === 'da' || norm(given) === 'yes' || given === 1 || norm(given) === '1';
    customFields[def.flag] = granted;
    if (def.date) customFields[def.date] = today;
    if (def.source) customFields[def.source] = source;

    const consentTag = `${config.taxonomy.system_tag_prefixes.consent}${channel}`;
    const optoutTag = config.compliance.optout_tags[channel];
    if (granted) {
      if (!current.some((t) => norm(t) === norm(consentTag))) tagsToAdd.push(consentTag);
      if (optoutTag && current.some((t) => norm(t) === norm(optoutTag))) tagsToRemove.push(optoutTag);
    } else {
      if (current.some((t) => norm(t) === norm(consentTag))) tagsToRemove.push(consentTag);
      if (optoutTag && !current.some((t) => norm(t) === norm(optoutTag))) tagsToAdd.push(optoutTag);
    }
  }

  customFields.data_ultima_interactiune = today;

  const contact = {
    ...(payload.email ? { email: String(payload.email).trim().toLowerCase() } : {}),
    ...(payload.phone ? { phone: String(payload.phone).trim() } : {}),
    ...(payload.first_name ? { firstName: payload.first_name } : {}),
    ...(payload.last_name ? { lastName: payload.last_name } : {}),
    ...(payload.city ? { city: payload.city } : {}),
  };

  if (!contact.email && !contact.phone) {
    warnings.push('payload fără email și fără telefon — contactul nu poate fi identificat');
  }

  return {
    contact,
    customFields,
    tagsToAdd: [...new Set(tagsToAdd)],
    tagsToRemove: [...new Set(tagsToRemove)],
    warnings,
    valid: Boolean(contact.email || contact.phone),
  };
}
