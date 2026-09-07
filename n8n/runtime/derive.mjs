/**
 * Derivările din config: tag-uri, custom fields cu opțiuni, custom values.
 *
 * Funcții pure, fără I/O, ca aceeași logică să ruleze și în scripturi (Node) și
 * într-un node Code din n8n. Sursa unică: dacă scriptul și workflow-ul ar calcula
 * separat lista de tag-uri, ar diverge exact când doare — la al doilea client.
 */

/** Toate tag-urile derivate din axele de taxonomie. */
export function deriveAxisTags(config) {
  const out = [];
  for (const [axisName, axis] of Object.entries(config.taxonomy.axes)) {
    for (const value of axis.values) {
      out.push({ tag: `${axis.tag_prefix}${value.key}`, axis: axisName, key: value.key, label: value.label });
    }
  }
  return out;
}

/** Tag-urile de sistem: consimțământ, opt-out, stare de flux, ciclu de viață. */
export function deriveSystemTags(config) {
  const p = config.taxonomy.system_tag_prefixes;
  const out = [];
  for (const channel of Object.keys(config.compliance.consent_fields)) {
    out.push({ tag: `${p.consent}${channel}`, axis: '_consent', key: channel, label: `Consimțământ ${channel}` });
  }
  for (const [channel, tag] of Object.entries(config.compliance.optout_tags)) {
    out.push({ tag, axis: '_optout', key: channel, label: `Opt-out ${channel}` });
  }
  for (const flowId of Object.keys(config.flows)) {
    out.push({ tag: `${p.flow_state}${flowId}`, axis: '_flow_state', key: flowId, label: `În fluxul ${flowId}` });
  }
  for (const lifecycle of ['import', 'lead', 'client', 'client_fidel', 'inactiv']) {
    out.push({ tag: `${p.lifecycle}${lifecycle}`, axis: '_lifecycle', key: lifecycle, label: `Ciclu de viață: ${lifecycle}` });
  }
  return out;
}

export function deriveAllTags(config) {
  return [...deriveAxisTags(config), ...deriveSystemTags(config)];
}

/**
 * Custom fields cu opțiunile completate din axa asociată.
 * Opțiunile nu se scriu de două ori în config: axa e sursa unică.
 */
export function deriveCustomFields(config) {
  return config.custom_fields.map((field) => {
    if (!field.axis) return { ...field, options: field.options || [] };
    const axis = config.taxonomy.axes[field.axis];
    if (!axis) throw new Error(`custom_field "${field.key}" trimite la axa inexistentă "${field.axis}"`);
    return { ...field, options: axis.values.map((v) => v.label) };
  });
}

export function resolvePath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Custom values GHL, cu valorile rezolvate din config. */
export function deriveCustomValues(config) {
  return (config.custom_values || []).map(({ key, from }) => {
    const value = resolvePath(config, from);
    return { key, from, value: value === undefined ? null : String(value) };
  });
}

/**
 * Celulele de conținut de generat: flux × variantă de text × canal.
 *
 * Distincția care ține volumul sub control: `segmented_by` spune CINE primește
 * (filtru de audiență), `content_varies_by` spune pe ce axe se scrie text DIFERIT.
 * Fără separarea asta, cele 5 axe cerute pentru ofertele personalizate produc
 * peste 10.000 de texte de revizuit uman.
 */
export function deriveContentCells(config) {
  const cells = [];
  for (const [flowId, flow] of Object.entries(config.flows)) {
    if (!flow.enabled) continue;
    const varyBy = flow.content_varies_by || [];
    const axes = varyBy.map((name) => {
      const axis = config.taxonomy.axes[name];
      if (!axis) throw new Error(`flow "${flowId}".content_varies_by trimite la axa inexistentă "${name}"`);
      return { name, values: axis.values };
    });

    let combos = [{}];
    for (const axis of axes) {
      combos = combos.flatMap((combo) => axis.values.map((v) => ({ ...combo, [axis.name]: v.key })));
    }

    for (const step of flow.steps) {
      if (step.channel === 'task') continue;
      for (const segment of combos) {
        cells.push({
          flow_id: flowId, step_id: step.id, channel: step.channel,
          category: step.category, template: step.template, segment,
        });
      }
    }
  }
  return cells;
}
