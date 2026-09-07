/**
 * Client HTTP pentru GoHighLevel API v2.
 *
 * De ce există: node-ul nativ „HighLevel" din n8n acoperă doar
 * Contact / Opportunity / Task / Calendar — nu are resursă pentru Tags sau
 * Custom Values, adică exact ce ține segmentarea. În plus e doar OAuth2, iar
 * refresh token-ul cade silențios în producție. Toate operațiunile critice trec
 * pe aici, cu Private Integration Token.
 *
 * Contract respectat de fiecare apel:
 *  - header-ul `Version` este OBLIGATORIU (fără el request-ul e respins),
 *    iar versiunea diferă pe resurse: conversations cere altă valoare decât restul;
 *  - retry cu backoff exponențial + jitter pe 429 și 5xx, cu respectarea
 *    `Retry-After` când serverul îl trimite;
 *  - eșecurile sunt zgomotoase: aruncă GhlApiError cu status, corp și request id.
 */

export class GhlApiError extends Error {
  constructor(message, { status, body, method, path, requestId } = {}) {
    super(message);
    this.name = 'GhlApiError';
    this.status = status;
    this.body = body;
    this.method = method;
    this.path = path;
    this.requestId = requestId;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class GhlClient {
  /**
   * @param {object} opts
   * @param {string} opts.token       Private Integration Token. Vine din mediu, niciodată din config.
   * @param {string} opts.locationId
   * @param {string} opts.apiBase
   * @param {{default: string, conversations?: string}} opts.apiVersions
   * @param {number} [opts.maxRetries]
   * @param {(msg: string) => void} [opts.log]
   */
  constructor({ token, locationId, apiBase, apiVersions, maxRetries = 4, log = () => {} }) {
    if (!token) throw new Error('GhlClient: token lipsă. Setează variabila de mediu indicată de integrations.ghl.location_id_env / GHL_PIT.');
    if (!locationId) throw new Error('GhlClient: locationId lipsă.');
    this.token = token;
    this.locationId = locationId;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.apiVersions = apiVersions;
    this.maxRetries = maxRetries;
    this.log = log;
  }

  versionFor(path) {
    return path.includes('/conversations')
      ? (this.apiVersions.conversations || this.apiVersions.default)
      : this.apiVersions.default;
  }

  async request(method, path, { body, query, versionOverride } = {}) {
    const url = new URL(this.apiBase + path);
    for (const [k, v] of Object.entries(query || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    const headers = {
      Authorization: `Bearer ${this.token}`,
      Version: versionOverride || this.versionFor(path),
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      let response;
      try {
        response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (networkError) {
        lastError = new GhlApiError(`Eroare de rețea: ${networkError.message}`, { method, path });
        if (attempt === this.maxRetries) throw lastError;
        await sleep(this.backoff(attempt));
        continue;
      }

      const text = await response.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }

      if (response.ok) return parsed;

      const requestId = response.headers.get('x-request-id') || undefined;
      const retryable = response.status === 429 || response.status >= 500;
      lastError = new GhlApiError(
        `GHL ${method} ${path} → ${response.status}${parsed?.message ? `: ${JSON.stringify(parsed.message)}` : ''}`,
        { status: response.status, body: parsed, method, path, requestId },
      );

      if (!retryable || attempt === this.maxRetries) throw lastError;

      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : this.backoff(attempt);
      this.log(`  ↻ ${response.status} pe ${method} ${path}, reîncerc peste ${Math.round(waitMs)}ms (${attempt + 1}/${this.maxRetries})`);
      await sleep(waitMs);
    }
    throw lastError;
  }

  backoff(attempt) {
    const base = 500 * 2 ** attempt;          // 0.5s, 1s, 2s, 4s
    return base + Math.random() * 250;        // jitter, ca să nu se sincronizeze retry-urile
  }

  // ---- Custom fields ----
  listCustomFields() {
    return this.request('GET', `/locations/${this.locationId}/customFields`, { query: { model: 'contact' } });
  }
  createCustomField(payload) {
    return this.request('POST', `/locations/${this.locationId}/customFields`, { body: { ...payload, model: 'contact' } });
  }
  updateCustomField(id, payload) {
    return this.request('PUT', `/locations/${this.locationId}/customFields/${id}`, { body: payload });
  }

  // ---- Custom values ----
  listCustomValues() {
    return this.request('GET', `/locations/${this.locationId}/customValues`);
  }
  createCustomValue(name, value) {
    return this.request('POST', `/locations/${this.locationId}/customValues`, { body: { name, value } });
  }
  updateCustomValue(id, name, value) {
    return this.request('PUT', `/locations/${this.locationId}/customValues/${id}`, { body: { name, value } });
  }

  // ---- Tags ----
  listTags() {
    return this.request('GET', `/locations/${this.locationId}/tags`);
  }
  createTag(name) {
    return this.request('POST', `/locations/${this.locationId}/tags`, { body: { name } });
  }

  // ---- Contacts ----
  upsertContact(payload) {
    return this.request('POST', '/contacts/upsert', { body: { locationId: this.locationId, ...payload } });
  }
  getContact(contactId) {
    return this.request('GET', `/contacts/${contactId}`);
  }
  addContactTags(contactId, tags) {
    return this.request('POST', `/contacts/${contactId}/tags`, { body: { tags } });
  }
  removeContactTags(contactId, tags) {
    return this.request('DELETE', `/contacts/${contactId}/tags`, { body: { tags } });
  }
}

/** Normalizare pentru comparații idempotente între ce e în GHL și ce cere configul. */
export const norm = (s) => String(s ?? '').trim().toLowerCase();
