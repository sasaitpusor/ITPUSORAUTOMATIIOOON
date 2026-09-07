/**
 * Planul de provisioning GHL: ce trebuie creat, ce actualizat, ce e deja la zi.
 *
 * Funcție pură, folosită de DOUĂ rulări diferite ale aceleiași logici:
 *  - scripts/provision-ghl.mjs, când ai acces direct la API-ul GHL;
 *  - workflow-ul „WF_SETUP · Provisioning GHL", când n8n e cel care ajunge la GHL
 *    (ex. rețeaua de unde rulezi scriptul nu are voie la leadconnectorhq.com).
 *
 * Aceeași funcție în ambele = același rezultat. Idempotentă prin construcție:
 * compară ce cere configul cu ce există deja și emite doar diferența.
 */

import { deriveAllTags, deriveCustomFields, deriveCustomValues } from './derive.mjs';

export const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * @param {object} args
 * @param {object} args.config
 * @param {object} args.existing
 * @param {Array} args.existing.customFields  ce a returnat GET /locations/{id}/customFields
 * @param {Array} args.existing.tags
 * @param {Array} args.existing.customValues
 * @returns {{operations: Array, summary: object, conflicts: Array}}
 */
export function buildProvisionPlan({ config, existing }) {
  const operations = [];
  const conflicts = [];
  const skipped = [];
  const locationPath = '/locations/{locationId}';

  // ── Custom fields ──
  const wantedFields = deriveCustomFields(config);
  const fieldsByName = new Map((existing.customFields || []).map((f) => [norm(f.name), f]));

  for (const field of wantedFields) {
    const current = fieldsByName.get(norm(field.name));
    const body = {
      name: field.name,
      dataType: field.dataType,
      ...(field.options?.length ? { options: field.options } : {}),
    };

    if (!current) {
      operations.push({
        kind: 'custom_field', action: 'create', label: field.name,
        detail: `${field.dataType}${field.options?.length ? ` · ${field.options.length} opțiuni` : ''}`,
        method: 'POST', path: `${locationPath}/customFields`, body: { ...body, model: 'contact' },
      });
      continue;
    }

    // Tipul unui câmp deja populat nu se schimbă automat: ar pierde date.
    if (norm(current.dataType) !== norm(field.dataType)) {
      conflicts.push({
        kind: 'custom_field', label: field.name,
        detail: `în GHL e ${current.dataType}, configul cere ${field.dataType} — rezolvă manual`,
      });
      continue;
    }

    const currentOptions = (current.picklistOptions || current.options || [])
      .map((o) => norm(typeof o === 'string' ? o : (o?.value ?? o?.name ?? o?.label)))
      .sort();
    const wantedOptions = (field.options || []).map(norm).sort();

    if (wantedOptions.length && JSON.stringify(currentOptions) !== JSON.stringify(wantedOptions)) {
      operations.push({
        kind: 'custom_field', action: 'update', label: field.name,
        detail: `opțiuni: ${currentOptions.length} → ${wantedOptions.length}`,
        method: 'PUT', path: `${locationPath}/customFields/${current.id}`, body,
      });
    } else {
      skipped.push({ kind: 'custom_field', label: field.name });
    }
  }

  // ── Tag-uri ──
  const wantedTags = deriveAllTags(config);
  const haveTags = new Set((existing.tags || []).map((t) => norm(t.name)));

  for (const tag of wantedTags) {
    if (haveTags.has(norm(tag.tag))) {
      skipped.push({ kind: 'tag', label: tag.tag });
      continue;
    }
    operations.push({
      kind: 'tag', action: 'create', label: tag.tag, detail: tag.label,
      method: 'POST', path: `${locationPath}/tags`, body: { name: tag.tag },
    });
  }

  // ── Custom values ──
  const wantedValues = deriveCustomValues(config);
  const valuesByName = new Map((existing.customValues || []).map((v) => [norm(v.name), v]));

  for (const cv of wantedValues) {
    const current = valuesByName.get(norm(cv.key));
    if (!current) {
      operations.push({
        kind: 'custom_value', action: 'create', label: cv.key, detail: cv.value,
        method: 'POST', path: `${locationPath}/customValues`, body: { name: cv.key, value: cv.value },
      });
    } else if (String(current.value) !== String(cv.value)) {
      operations.push({
        kind: 'custom_value', action: 'update', label: cv.key,
        detail: `"${current.value}" → "${cv.value}"`,
        method: 'PUT', path: `${locationPath}/customValues/${current.id}`,
        body: { name: cv.key, value: cv.value },
      });
    } else {
      skipped.push({ kind: 'custom_value', label: cv.key });
    }
  }

  const count = (kind, action) => operations.filter((o) => o.kind === kind && o.action === action).length;
  return {
    operations,
    conflicts,
    skipped,
    summary: {
      to_create: operations.filter((o) => o.action === 'create').length,
      to_update: operations.filter((o) => o.action === 'update').length,
      unchanged: skipped.length,
      conflicts: conflicts.length,
      custom_fields: { create: count('custom_field', 'create'), update: count('custom_field', 'update') },
      tags: { create: count('tag', 'create') },
      custom_values: { create: count('custom_value', 'create'), update: count('custom_value', 'update') },
    },
  };
}
