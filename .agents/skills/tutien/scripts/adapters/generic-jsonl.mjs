// Documented generic export format "tutien-generic-v1": one JSON object per
// line. The whole declared schema is validated, not just the event type —
// unknown schemas, unknown types, reserved fields, and malformed values all
// fail closed with the offending file and line.

const KNOWN_TYPES = new Set(['message', 'tool_call', 'tool_result', 'test', 'approval', 'commit']);
const ROLES = new Set(['user', 'assistant', 'tool', 'git']);
const OUTCOMES = new Set(['pass', 'fail']);
const ACCURACIES = new Set(['reported', 'estimated', 'unknown']);
const USAGE_NUMERIC = ['input', 'cachedInput', 'output', 'reasoning', 'total'];
const RESERVED = ['__source', 'source'];

function bad(file, line, msg) {
  throw new Error(`${file}:${line} ${msg}; failing closed`);
}

function validateEvent(obj, file, line) {
  for (const k of RESERVED) {
    if (k in obj) bad(file, line, `reserved field "${k}" is not allowed in export events`);
  }
  for (const k of ['session', 'task', 'label', 'text']) {
    if (obj[k] !== undefined && typeof obj[k] !== 'string') bad(file, line, `field ${k} must be a string`);
  }
  if (obj.role !== undefined && !ROLES.has(obj.role)) bad(file, line, `invalid role "${obj.role}"`);
  if (obj.outcome !== undefined && !OUTCOMES.has(obj.outcome)) bad(file, line, `invalid outcome "${obj.outcome}"`);
  if (obj.ts !== undefined && (typeof obj.ts !== 'string' || !Number.isFinite(Date.parse(obj.ts)))) {
    bad(file, line, `invalid timestamp "${obj.ts}"`);
  }
  if (obj.usage !== undefined) {
    if (typeof obj.usage !== 'object' || obj.usage === null || Array.isArray(obj.usage)) {
      bad(file, line, 'usage must be an object');
    }
    for (const k of USAGE_NUMERIC) {
      const v = obj.usage[k];
      if (v !== undefined && v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
        bad(file, line, `usage.${k} must be a finite non-negative number`);
      }
    }
    if (obj.usage.accuracy !== undefined && !ACCURACIES.has(obj.usage.accuracy)) {
      bad(file, line, `invalid usage.accuracy "${obj.usage.accuracy}"`);
    }
    if (obj.usage.requestId !== undefined && typeof obj.usage.requestId !== 'string') {
      bad(file, line, 'usage.requestId must be a string');
    }
    if (obj.usage.cumulative !== undefined && typeof obj.usage.cumulative !== 'boolean') {
      bad(file, line, 'usage.cumulative must be a boolean');
    }
  }
  if (obj.commit !== undefined) {
    if (typeof obj.commit === 'object' && obj.commit !== null && !Array.isArray(obj.commit)) {
      if (obj.commit.hash !== undefined && typeof obj.commit.hash !== 'string') bad(file, line, 'commit.hash must be a string');
      if (obj.commit.isRevert !== undefined && typeof obj.commit.isRevert !== 'boolean') bad(file, line, 'commit.isRevert must be a boolean');
    } else {
      bad(file, line, 'commit must be an object');
    }
  }
}

export function parseJsonl(content, file = '(jsonl)') {
  const events = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      throw new Error(`${file}:${i + 1} invalid JSON: ${err.message}`);
    }
    if (obj.schema !== undefined) {
      if (obj.schema !== 'tutien-generic-v1') {
        throw new Error(`${file}:${i + 1} unsupported schema "${obj.schema}"; supported: tutien-generic-v1`);
      }
      continue;
    }
    if (!KNOWN_TYPES.has(obj.type)) bad(file, i + 1, `unknown event type "${obj.type}"`);
    validateEvent(obj, file, i + 1);
    events.push(obj);
  }
  return events;
}
