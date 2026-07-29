#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildResponseShape,
  RESPONSE_SHAPE_DIMENSIONS,
  responseShapeDifference
} from '../../../.vibekit/skills/tutien/scripts/response-shape.mjs';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

check('shape: identical safe inputs are deterministic', () => {
  const options = { seed: { projectId: 'minimal-vibe-coding-kit', evidenceKey: 'repeat-loop' }, sequence: 1 };
  assert.deepEqual(buildResponseShape(options), buildResponseShape(options));
});

check('shape: four adjacent briefs differ in at least two dimensions', () => {
  const shapes = [];
  let priorShapeSignature = null;
  for (let sequence = 1; sequence <= 4; sequence += 1) {
    const shape = buildResponseShape({
      seed: { projectId: 'minimal-vibe-coding-kit', evidenceKey: 'repeat-loop' },
      sequence,
      priorShapeSignature
    });
    if (priorShapeSignature) assert.ok(responseShapeDifference(shape.shapeSignature, priorShapeSignature) >= 2);
    shapes.push(shape);
    priorShapeSignature = shape.shapeSignature;
  }
  assert.ok(new Set(shapes.map((shape) => shape.shapeSignature)).size >= 3);
});

check('shape: a repeated edge-sequence signature is still forced apart', () => {
  const original = buildResponseShape({
    seed: { projectId: 'minimal-vibe-coding-kit', evidenceKey: 'repeat-loop' },
    sequence: 59
  });
  const next = buildResponseShape({
    seed: { projectId: 'minimal-vibe-coding-kit', evidenceKey: 'repeat-loop' },
    sequence: 59,
    priorShapeSignature: original.shapeSignature
  });
  assert.ok(responseShapeDifference(original.shapeSignature, next.shapeSignature) >= 2);
});

check('shape: every directive belongs to its bounded vocabulary', () => {
  const shape = buildResponseShape({ sequence: 7 });
  for (const [key, value] of Object.entries(shape.directives)) {
    assert.ok(RESPONSE_SHAPE_DIMENSIONS[key].includes(value), `${key}=${value}`);
  }
});

check('shape: unsafe seed text is neither retained nor rendered', () => {
  const serialized = JSON.stringify(buildResponseShape({
    seed: {
      projectId: 'raw user@example.com',
      evidenceKey: 'SECRET=SECRETVALUE/../../outside'
    },
    sequence: 2
  }));
  assert.ok(!serialized.includes('user@example.com'));
  assert.ok(!serialized.includes('SECRETVALUE'));
  assert.ok(!serialized.includes('../'));
});

check('shape: output is abstract guidance, never sentence-bank prose', () => {
  const shape = buildResponseShape({ sequence: 3 });
  assert.equal(shape.kind, 'abstract-composition-guidance');
  assert.equal(shape.containsProse, false);
  assert.equal(shape.containsUserText, false);
  assert.equal(shape.adjacentDifferenceMinimum, 2);
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} response-shape checks passed`);
