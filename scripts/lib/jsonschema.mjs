/**
 * Validator minimal pentru subsetul de JSON Schema draft-07 folosit de
 * config/schema/client.config.schema.json.
 *
 * Zero dependențe intenționat: scripturile de provisioning trebuie să ruleze pe
 * orice mașină cu Node >= 18, inclusiv pe un runner curat la onboarding-ul unui
 * client nou, fără `npm install`.
 *
 * Suportă: type (inclusiv listă), required, properties, additionalProperties
 * (bool sau schemă), items, enum, const, pattern, minimum/maximum,
 * minLength/maxLength, minItems, minProperties.
 */

const typeOf = (v) =>
  v === null ? 'null'
    : Array.isArray(v) ? 'array'
      : Number.isInteger(v) ? 'integer'
        : typeof v === 'number' ? 'number'
          : typeof v;

const matchesType = (value, expected) => {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
};

export function validate(schema, data, path = '$', errors = []) {
  if (schema == null || typeof schema !== 'object') return errors;

  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => matchesType(data, t))) {
      errors.push(`${path}: tip ${typeOf(data)}, așteptat ${expected.join('|')}`);
      return errors; // orice altă regulă ar produce zgomot pe un tip greșit
    }
  }

  if (schema.const !== undefined && data !== schema.const) {
    errors.push(`${path}: valoarea trebuie să fie ${JSON.stringify(schema.const)}, este ${JSON.stringify(data)}`);
  }

  if (schema.enum !== undefined && !schema.enum.includes(data)) {
    errors.push(`${path}: ${JSON.stringify(data)} nu este în [${schema.enum.join(', ')}]`);
  }

  if (typeof data === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push(`${path}: "${data}" nu respectă pattern-ul ${schema.pattern}`);
    }
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path}: prea scurt (min ${schema.minLength})`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path}: prea lung (max ${schema.maxLength})`);
    }
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: ${data} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path}: ${data} > maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: ${data.length} elemente, minim ${schema.minItems}`);
    }
    if (schema.items) {
      data.forEach((item, i) => validate(schema.items, item, `${path}[${i}]`, errors));
    }
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const keys = Object.keys(data);

    if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
      errors.push(`${path}: ${keys.length} chei, minim ${schema.minProperties}`);
    }

    for (const req of schema.required || []) {
      if (!(req in data)) errors.push(`${path}: lipsește cheia obligatorie "${req}"`);
    }

    const declared = schema.properties || {};
    for (const [key, value] of Object.entries(data)) {
      if (key in declared) {
        validate(declared[key], value, `${path}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${key}: cheie necunoscută (additionalProperties: false)`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validate(schema.additionalProperties, value, `${path}.${key}`, errors);
      }
    }
  }

  return errors;
}
