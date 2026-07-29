// Deterministic abstract composition guidance for the agent-authored Tutien
// response. It selects no prose and carries no user text. Facts remain in the
// response brief; this module varies only the literary shape around them.

import crypto from 'node:crypto';

export const RESPONSE_SHAPE_DIMENSIONS = Object.freeze({
  openingDevice: ['action-first', 'dialogue-first', 'evidence-first', 'consequence-first', 'in-medias-res'],
  pointOfView: ['close-third', 'tribunal-observer', 'antagonist-glimpse', 'field-chronicler'],
  sceneLocation: ['formation-court', 'artifact-forge', 'archive-tower', 'mountain-pass', 'alchemy-hall'],
  humorMechanism: ['villain-overconfidence', 'procedural-irony', 'reversal', 'literalized-bug'],
  dialogueDensity: ['sparse', 'balanced', 'high'],
  technicalDensity: ['concise', 'balanced', 'dense'],
  closingConsequence: ['unresolved-gesture', 'villain-retreat', 'discipline-seal', 'changed-environment']
});

const DIMENSION_KEYS = Object.keys(RESPONSE_SHAPE_DIMENSIONS);
const SAFE_TOKEN = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
const safeToken = (value, fallback) => SAFE_TOKEN.test(String(value ?? '')) ? String(value) : fallback;

function digestBytes(seed) {
  return crypto.createHash('sha256').update(JSON.stringify(seed)).digest();
}

function parseSignature(signature) {
  if (typeof signature !== 'string') return {};
  const result = {};
  for (const part of signature.split('|')) {
    const at = part.indexOf('=');
    if (at > 0) result[part.slice(0, at)] = part.slice(at + 1);
  }
  return result;
}

export function responseShapeDifference(left, right) {
  const a = typeof left === 'string' ? parseSignature(left) : (left ?? {});
  const b = typeof right === 'string' ? parseSignature(right) : (right ?? {});
  return DIMENSION_KEYS.filter((key) => a[key] !== b[key]).length;
}

export function buildResponseShape(options = {}) {
  const sequence = Number.isSafeInteger(options.sequence) && options.sequence >= 0 ? options.sequence : 0;
  const seed = {
    projectId: safeToken(options.seed?.projectId, 'repo'),
    evidenceKey: safeToken(options.seed?.evidenceKey, 'aggregate'),
    sequence
  };
  const bytes = digestBytes(seed);
  const directives = {};
  DIMENSION_KEYS.forEach((key, index) => {
    const values = RESPONSE_SHAPE_DIMENSIONS[key];
    directives[key] = values[bytes[index] % values.length];
  });

  const prior = parseSignature(options.priorShapeSignature);
  let differences = responseShapeDifference(directives, prior);
  for (let index = 0; Object.keys(prior).length && differences < 2 && index < DIMENSION_KEYS.length; index += 1) {
    const key = DIMENSION_KEYS[index];
    if (directives[key] !== prior[key]) continue;
    const values = RESPONSE_SHAPE_DIMENSIONS[key];
    const current = values.indexOf(directives[key]);
    const nonZeroOffset = 1 + (sequence % (values.length - 1));
    directives[key] = values[(current + nonZeroOffset) % values.length];
    differences = responseShapeDifference(directives, prior);
  }

  const shapeSignature = DIMENSION_KEYS.map((key) => `${key}=${directives[key]}`).join('|');
  return {
    kind: 'abstract-composition-guidance',
    shapeSignature,
    directives,
    adjacentDifferenceMinimum: 2,
    containsProse: false,
    containsUserText: false
  };
}
