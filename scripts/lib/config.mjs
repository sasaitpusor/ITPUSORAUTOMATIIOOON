/**
 * Încărcarea configurației de client de pe disc.
 *
 * Derivările (tag-uri, opțiuni de custom field, celule de conținut) NU trăiesc
 * aici: sunt în n8n/runtime/derive.mjs, funcții pure fără I/O, ca aceeași logică
 * să ruleze și în scripturi și în node-urile Code din n8n. Modulul ăsta doar le
 * re-exportă, ca apelanții să aibă un singur import.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CLIENTS_DIR = path.join(ROOT, 'config', 'clients');
export const SCHEMA_PATH = path.join(ROOT, 'config', 'schema', 'client.config.schema.json');

export function listClientIds() {
  return fs.readdirSync(CLIENTS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

export function loadConfig(clientId) {
  const file = path.join(CLIENTS_DIR, `${clientId}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Nu există config pentru "${clientId}". Clienți disponibili: ${listClientIds().join(', ') || '(niciunul)'}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

export {
  deriveAxisTags,
  deriveSystemTags,
  deriveAllTags,
  deriveCustomFields,
  deriveCustomValues,
  deriveContentCells,
  resolvePath,
} from '../../n8n/runtime/derive.mjs';

export function isCommercialFlow(config, flowId) {
  return config.sending_rules.suppression.commercial_flow_ids.includes(flowId);
}
