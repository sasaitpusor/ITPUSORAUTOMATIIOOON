/**
 * Helperi pentru construirea workflow-urilor n8n ca JSON importabil.
 *
 * Workflow-urile sunt GENERATE, nu scrise de mână, din două motive:
 *  - rămân client-agnostice: primesc `client_id` la intrare și își încarcă
 *    configurația la runtime, deci un client nou nu cere editarea niciunui node;
 *  - poziționarea, id-urile și conexiunile sunt deterministe, deci diff-urile din
 *    git arată schimbări de logică, nu mutări de casete pe canvas.
 */

import crypto from 'node:crypto';

/** Id determinist per (workflow, node) — același input dă același JSON. */
const nodeId = (wfName, nodeName) =>
  crypto.createHash('sha1').update(`${wfName}::${nodeName}`).digest('hex').slice(0, 16);

export function makeWorkflow(name) {
  const nodes = [];
  const connections = {};
  let column = 0;

  const api = {
    /**
     * @param {string} nodeName
     * @param {string} type          ex. 'n8n-nodes-base.code'
     * @param {number} typeVersion
     * @param {object} parameters
     * @param {object} [extra]       retryOnFail, onError, notes, alwaysOutputData…
     * @param {number} [row]         0 = linia principală; >0 = ramuri sub ea
     */
    node(nodeName, type, typeVersion, parameters, extra = {}, row = 0) {
      const n = {
        parameters,
        id: nodeId(name, nodeName),
        name: nodeName,
        type,
        typeVersion,
        position: [260 + column * 240, 300 + row * 180],
        ...extra,
      };
      if (row === 0) column += 1;
      nodes.push(n);
      return nodeName;
    },

    /** Marchează începutul unei coloane noi după ce s-au adăugat ramuri. */
    advance(by = 1) { column += by; return api; },

    /** Conectează from → to. `outputIndex` pentru IF (0=true, 1=false) și Switch. */
    connect(from, to, outputIndex = 0) {
      connections[from] ??= { main: [] };
      while (connections[from].main.length <= outputIndex) connections[from].main.push([]);
      connections[from].main[outputIndex].push({ node: to, type: 'main', index: 0 });
      return api;
    },

    /** Conectează o secvență liniară de noduri. */
    chain(...names) {
      for (let i = 0; i < names.length - 1; i++) api.connect(names[i], names[i + 1]);
      return api;
    },

    build({ description, tags = [] } = {}) {
      return {
        name,
        nodes,
        connections,
        settings: { executionOrder: 'v1', saveManualExecutions: true, saveExecutionProgress: true },
        pinData: {},
        tags: tags.map((t) => ({ name: t })),
        meta: { description },
      };
    },
  };
  return api;
}

// ---- Fabrici pentru tipurile de node folosite ----

export const codeNode = (jsCode, mode = 'runOnceForAllItems') => ({
  mode,
  jsCode,
});

export const boolCondition = (leftExpression, operation = 'true') => ({
  options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
  conditions: [{
    id: crypto.createHash('sha1').update(leftExpression + operation).digest('hex').slice(0, 12),
    leftValue: leftExpression,
    rightValue: '',
    operator: { type: 'boolean', operation, singleValue: true },
  }],
  combinator: 'and',
});

/** Referință la alt workflow prin ID luat din mediu — nu prin ID hardcodat în JSON. */
export const workflowRef = (envVar) => ({
  __rl: true,
  mode: 'id',
  value: `={{ $env.${envVar} }}`,
});

export const executeWorkflowParams = (envVar) => ({
  source: 'database',
  workflowId: workflowRef(envVar),
  mode: 'once',
  options: { waitForSubWorkflow: true },
});

/**
 * Datele nu se trec prin parametri de node, ci prin item-ul emis de nodul
 * anterior: Execute Workflow pasează input-ul mai departe. Nodul care pregătește
 * apelul e deci parte din contractul sub-workflow-ului.
 */
