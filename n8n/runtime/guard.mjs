/**
 * Garda de trimitere — singurul loc în care se decide dacă un mesaj pleacă.
 *
 * Rulează identic în Node (pentru teste) și într-un node Code din n8n: scriptul
 * de build îl inlinează în workflow, deci logica testată aici este exact logica
 * din producție.
 *
 * Funcție pură: primește configul, contactul și cererea; nu face I/O. Toate
 * datele de contact vin de la apelant (SW01 · GHL API), ca să poată fi testată
 * pe scenarii fără să atingă GHL.
 *
 * Ordinea verificărilor contează: conformitatea are prioritate absolută, apoi
 * idempotența (ieftină, previne dublurile), apoi regulile de business.
 */

/** Părțile datei în fusul orar dat, fără dependințe. */
export function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  if (parts.hour === 24) parts.hour = 0;
  return parts;
}

/** Decalajul fusului față de UTC, în minute, la momentul dat. */
export function offsetMinutes(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

/**
 * Instantul UTC pentru o oră locală dintr-o zi locală dată.
 * Două treceri, ca să prindem corect zilele de schimbare a orei.
 */
export function utcFromLocal(year, month, day, hour, minute, timeZone) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 2; i++) {
    const off = offsetMinutes(guess, timeZone);
    guess = new Date(Date.UTC(year, month - 1, day, hour, minute) - off * 60000);
  }
  return guess;
}

/** Următorul moment în care canalul are voie să trimită. null = acum e în regulă. */
export function nextAllowedWindow(now, timeZone, window) {
  if (!window || !window.enforced) return null;
  const [startH, startM] = window.start.split(':').map(Number);
  const [endH, endM] = window.end.split(':').map(Number);
  const p = zonedParts(now, timeZone);
  const minutesNow = p.hour * 60 + p.minute;
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (minutesNow >= startMin && minutesNow < endMin) return null;

  if (minutesNow < startMin) return utcFromLocal(p.year, p.month, p.day, startH, startM, timeZone);
  // După fereastră: prima fereastră de mâine.
  const tomorrow = new Date(utcFromLocal(p.year, p.month, p.day, 12, 0, timeZone).getTime() + 24 * 3600 * 1000);
  const tp = zonedParts(tomorrow, timeZone);
  return utcFromLocal(tp.year, tp.month, tp.day, startH, startM, timeZone);
}

export function parseJournal(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Un jurnal corupt nu are voie să blocheze trimiterile tranzacționale, dar
    // nici să deschidă porțile la spam: se tratează ca jurnal gol și se
    // raportează, ca să fie vizibil în alertare.
    return [];
  }
}

export function buildIdempotencyKey(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));
}

export function pruneJournal(journal, now, retentionDays) {
  const cutoff = now.getTime() - retentionDays * 86400000;
  return journal.filter((e) => {
    const t = Date.parse(e.t);
    return Number.isFinite(t) && t >= cutoff;
  });
}

/**
 * @param {object} args
 * @param {object} args.config   configul clientului
 * @param {object} args.contact  { id, tags: string[], customFields: Record<string,any> }
 * @param {object} args.request  { flow_id, step_id, channel, category, kind, occurrence_key }
 * @param {string} [args.nowIso]
 * @returns {{action:'send'|'defer'|'drop', allowed:boolean, reason:string, defer_until:string|null,
 *            idempotency_key:string, journal_kept:number, detail?:object}}
 */
export function evaluateGuard({ config, contact, request, nowIso }) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const rules = config.sending_rules;
  const timeZone = config.client.timezone;
  const tags = (contact.tags || []).map((t) => String(t).toLowerCase());
  const fields = contact.customFields || {};

  const idempotencyKey = buildIdempotencyKey(rules.idempotency.key_template, {
    client_id: config.client.id,
    contact_id: contact.id,
    flow_id: request.flow_id,
    step_id: request.step_id,
    occurrence_key: request.occurrence_key ?? '',
  });

  const journal = pruneJournal(parseJournal(fields[rules.log.field_key]), now, rules.log.retention_days);
  const deny = (action, reason, detail) => ({
    action, allowed: false, reason, detail,
    defer_until: detail?.defer_until ?? null,
    idempotency_key: idempotencyKey,
    journal_kept: journal.length,
  });

  const isCommercial = request.kind === 'commercial';

  // 1. Canalul trebuie să fie efectiv disponibil. WhatsApp fără BSP aprobat nu
  //    e o eroare de rulare, e un pas care încă nu poate exista.
  if (request.channel === 'whatsapp' && !config.integrations.whatsapp.enabled) {
    return deny('drop', 'channel_unavailable', { channel: 'whatsapp' });
  }

  // 2. Conformitate: opt-out bate orice flux, inclusiv tranzacțional comercial.
  const optoutTag = (config.compliance.optout_tags || {})[request.channel];
  if (optoutTag && tags.includes(optoutTag.toLowerCase())) {
    return deny('drop', 'opted_out', { tag: optoutTag });
  }

  // 3. Consimțământ pe canalul respectiv. Fără el nu se trimite, indiferent de flux.
  if (config.compliance.consent_required_per_channel) {
    const consent = (config.compliance.consent_fields || {})[request.channel];
    const value = consent ? fields[consent.flag] : undefined;
    const granted = value === true || value === 'true' || value === 1 || value === '1' || value === 'yes';
    if (!granted) return deny('drop', 'no_consent', { field: consent?.flag, value: value ?? null });
  }

  // 4. Idempotență: re-rularea unui workflow nu retrimite același mesaj.
  if (journal.some((e) => e.key === idempotencyKey)) {
    return deny('drop', 'duplicate', { idempotency_key: idempotencyKey });
  }

  // 5. Suprimare între fluxuri: cine e în plecare / în vacanță / la întoarcere
  //    nu primește Early Booking, Last Minute sau nurturing.
  if (isCommercial) {
    const flowPrefix = config.taxonomy.system_tag_prefixes.flow_state;
    const blocking = rules.suppression.exclusive_flow_ids
      .map((flowId) => `${flowPrefix}${flowId}`.toLowerCase())
      .filter((tag) => tags.includes(tag));
    if (blocking.length) return deny('drop', 'suppressed_by_exclusive_flow', { tags: blocking });
  }

  // 6. Plafonul de frecvență. Tranzacționalele trec peste el prin definiție.
  if (isCommercial || !rules.frequency_cap.transactional_bypasses_cap) {
    const cap = rules.frequency_cap.commercial;
    const windowStart = now.getTime() - cap.rolling_days * 86400000;
    const recent = journal
      .filter((e) => e.k === 'commercial' && Date.parse(e.t) >= windowStart)
      .sort((a, b) => Date.parse(a.t) - Date.parse(b.t));

    if (recent.length >= cap.max_messages) {
      // Se amână până iese cel mai vechi mesaj din fereastra rulantă, nu se pierde.
      const oldest = Date.parse(recent[0].t);
      const freeAt = new Date(oldest + cap.rolling_days * 86400000);
      return deny('defer', 'frequency_cap', {
        defer_until: freeAt.toISOString(),
        sent_in_window: recent.length,
        max: cap.max_messages,
      });
    }

    const minGapHours = rules.frequency_cap.min_hours_between_commercial || 0;
    if (minGapHours > 0 && recent.length) {
      const last = Date.parse(recent[recent.length - 1].t);
      const nextOk = last + minGapHours * 3600000;
      if (now.getTime() < nextOk) {
        return deny('defer', 'min_gap_between_commercial', {
          defer_until: new Date(nextOk).toISOString(),
          min_hours: minGapHours,
        });
      }
    }
  }

  // 7. Ferestre orare. Se aplică pe canal, în fusul clientului.
  const window = rules.quiet_hours.per_channel[request.channel];
  const nextWindow = nextAllowedWindow(now, timeZone, window);
  if (nextWindow) {
    if (rules.quiet_hours.defer_strategy === 'drop') {
      return deny('drop', 'outside_sending_window', { window });
    }
    return deny('defer', 'outside_sending_window', { defer_until: nextWindow.toISOString(), window });
  }

  return {
    action: 'send',
    allowed: true,
    reason: 'ok',
    defer_until: null,
    idempotency_key: idempotencyKey,
    journal_kept: journal.length,
  };
}

/** Intrarea de adăugat în jurnal după o trimitere reușită. */
export function journalEntry({ request, idempotencyKey, nowIso }) {
  return {
    t: nowIso || new Date().toISOString(),
    f: request.flow_id,
    s: request.step_id,
    c: request.channel,
    k: request.kind,
    cat: request.category,
    key: idempotencyKey,
  };
}
