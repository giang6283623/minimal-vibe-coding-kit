#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(here, '..', '..', '..');
const fixtureRoot = path.join(kitRoot, 'test', 'clone-website', 'fixtures');
const validator = path.join(
  kitRoot,
  '.vibekit',
  'skills',
  'clone-website',
  'scripts',
  'validate_replica_brief.py'
);
const publicFixture = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, 'safe-public-f2-s1-b0.json'), 'utf8')
);
const ownedFixture = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, 'safe-owned-f4-s4-b2.json'), 'utf8')
);
const unsafeCases = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, 'unsafe-cases.json'), 'utf8')
);
const tempRoots = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setAtPath(target, parts, value) {
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = current[parts[index]];
  }
  current[parts.at(-1)] = value;
}

function createProject(brief) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-website-validator-'));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, '.replica', 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(root, '.replica', 'brief.json'), `${JSON.stringify(brief, null, 2)}\n`);
  return root;
}

function createRawProject(raw) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-website-validator-'));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, '.replica', 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(root, '.replica', 'brief.json'), raw);
  return root;
}

function runValidator(root, overrides = {}) {
  const brief = overrides.brief ?? '.replica/brief.json';
  const normalized = overrides.normalized ?? '.replica/brief.normalized.json';
  const plan = overrides.plan ?? '.replica/plan.md';
  const receipt = overrides.receipt ?? '.replica/validation-receipt.json';
  return spawnSync(
    'python3',
    [
      validator,
      brief,
      '--project-root',
      root,
      '--normalized-out',
      normalized,
      '--plan-out',
      plan,
      '--receipt-out',
      receipt,
    ],
    { cwd: root, encoding: 'utf8' }
  );
}

function expectValid(fixture, label) {
  const root = createProject(fixture);
  const result = runValidator(root);
  assert.equal(result.status, 0, `${label}: ${result.stderr}`);
  assert.match(result.stdout, /PASS clone-website brief valid/);
  assert.ok(fs.existsSync(path.join(root, '.replica', 'brief.normalized.json')));
  assert.ok(fs.existsSync(path.join(root, '.replica', 'plan.md')));
  const receipt = JSON.parse(fs.readFileSync(path.join(root, '.replica', 'validation-receipt.json'), 'utf8'));
  assert.equal(receipt.status, 'valid');
  assert.equal(
    receipt.normalized_sha256,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.replica', 'brief.normalized.json'))).digest('hex')
  );
  assert.equal(
    receipt.plan_sha256,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.replica', 'plan.md'))).digest('hex')
  );
  return root;
}

function expectInvalid(fixture, error, label) {
  const root = createProject(fixture);
  const result = runValidator(root);
  assert.equal(result.status, 2, `${label}: expected status 2, got ${result.status}`);
  assert.match(result.stderr, new RegExp(error.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), label);
  assert.doesNotMatch(result.stderr, /Traceback/);
  assert.equal(fs.existsSync(path.join(root, '.replica', 'brief.normalized.json')), false);
  assert.equal(fs.existsSync(path.join(root, '.replica', 'plan.md')), false);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(root, '.replica', 'validation-receipt.json'), 'utf8')).status,
    'invalid'
  );
}

try {
  assert.ok(fs.existsSync(validator), 'canonical validator exists');

  const publicRoot = expectValid(publicFixture, 'safe public F2/S1/B0 brief');
  expectValid(ownedFixture, 'safe owned F4/S4/B2 brief');

  const broadApproval = clone(ownedFixture);
  broadApproval.authorization.scope.features = [];
  expectInvalid(broadApproval, 'authorization.scope.features must match enabled features', 'generic ownership does not approve sensitive features');

  const firstNormalized = fs.readFileSync(
    path.join(publicRoot, '.replica', 'brief.normalized.json'),
    'utf8'
  );
  const firstPlan = fs.readFileSync(path.join(publicRoot, '.replica', 'plan.md'), 'utf8');
  const second = runValidator(publicRoot);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(
    fs.readFileSync(path.join(publicRoot, '.replica', 'brief.normalized.json'), 'utf8'),
    firstNormalized,
    'normalization is byte-stable'
  );
  assert.equal(
    fs.readFileSync(path.join(publicRoot, '.replica', 'plan.md'), 'utf8'),
    firstPlan,
    'generated plan is byte-stable'
  );

  for (const unsafeCase of unsafeCases) {
    const fixture = clone(publicFixture);
    setAtPath(fixture, unsafeCase.path, unsafeCase.value);
    expectInvalid(fixture, unsafeCase.error, unsafeCase.name);
  }

  const publicCheckout = clone(publicFixture);
  publicCheckout.features.checkout = true;
  publicCheckout.authorization.scope.features = ['checkout'];
  expectInvalid(publicCheckout, 'public research cannot enable active features', 'public research rejects scoped checkout');

  const outsideRoot = createProject(publicFixture);
  const outside = runValidator(outsideRoot, { normalized: '../escape.json' });
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /inside the project root/i);
  assert.equal(fs.existsSync(path.join(path.dirname(outsideRoot), 'escape.json')), false);

  const outputSymlinkRoot = createProject(publicFixture);
  const outsideFile = path.join(outputSymlinkRoot, 'outside.json');
  fs.writeFileSync(outsideFile, 'unchanged\n');
  fs.symlinkSync(outsideFile, path.join(outputSymlinkRoot, '.replica', 'linked.json'));
  const outputSymlink = runValidator(outputSymlinkRoot, { normalized: '.replica/linked.json' });
  assert.equal(outputSymlink.status, 2);
  assert.match(outputSymlink.stderr, /must not use symlinks/i);
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), 'unchanged\n');

  const inputSymlinkFixture = clone(publicFixture);
  inputSymlinkFixture.source_inputs = ['linked-source.txt'];
  const inputSymlinkRoot = createProject(inputSymlinkFixture);
  const externalSource = path.join(inputSymlinkRoot, 'external-source.txt');
  fs.writeFileSync(externalSource, 'public fixture\n');
  fs.symlinkSync(
    externalSource,
    path.join(inputSymlinkRoot, '.replica', 'evidence', 'linked-source.txt')
  );
  const inputSymlink = runValidator(inputSymlinkRoot);
  assert.equal(inputSymlink.status, 2);
  assert.match(inputSymlink.stderr, /escapes|symlinks/i);

  const evidenceCollisionFixture = clone(publicFixture);
  evidenceCollisionFixture.source_inputs = ['source.txt'];
  const evidenceCollisionRoot = createProject(evidenceCollisionFixture);
  const evidencePath = path.join(evidenceCollisionRoot, '.replica', 'evidence', 'source.txt');
  fs.writeFileSync(evidencePath, 'source evidence\n');
  const evidenceCollision = runValidator(evidenceCollisionRoot, { normalized: '.replica/evidence/source.txt' });
  assert.equal(evidenceCollision.status, 2);
  assert.match(evidenceCollision.stderr, /normalized output must be \.replica\/brief\.normalized\.json/i);
  assert.equal(fs.readFileSync(evidencePath, 'utf8'), 'source evidence\n');

  const staleRoot = expectValid(publicFixture, 'stale output baseline');
  const staleBrief = clone(publicFixture);
  staleBrief.version = true;
  fs.writeFileSync(path.join(staleRoot, '.replica', 'brief.json'), `${JSON.stringify(staleBrief, null, 2)}\n`);
  const staleResult = runValidator(staleRoot);
  assert.equal(staleResult.status, 2);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(staleRoot, '.replica', 'validation-receipt.json'), 'utf8')).status,
    'invalid'
  );

  const partialRoot = createProject(publicFixture);
  fs.mkdirSync(path.join(partialRoot, '.replica', 'plan.md'));
  const partialResult = runValidator(partialRoot);
  assert.equal(partialResult.status, 2);
  assert.equal(fs.existsSync(path.join(partialRoot, '.replica', 'brief.normalized.json')), true);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(partialRoot, '.replica', 'validation-receipt.json'), 'utf8')).status,
    'invalid'
  );

  const rawCases = [
    ['{"version":1,', /invalid JSON/i, 'malformed JSON'],
    ['{"version":1,"version":1}', /duplicate JSON key/i, 'duplicate JSON key'],
    [Buffer.from([0xff, 0xfe, 0xfd]), /cannot read UTF-8 brief/i, 'invalid UTF-8'],
    [Buffer.alloc(256 * 1024 + 1, 0x20), /brief exceeds/i, 'oversized brief'],
  ];
  for (const [raw, error, label] of rawCases) {
    const rawRoot = createRawProject(raw);
    const rawResult = runValidator(rawRoot);
    assert.equal(rawResult.status, 2, label);
    assert.match(rawResult.stderr, error, label);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(rawRoot, '.replica', 'validation-receipt.json'), 'utf8')).status,
      'invalid',
      label
    );
  }

  console.log('PASS clone-website brief validator contract');
} finally {
  for (const root of tempRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
