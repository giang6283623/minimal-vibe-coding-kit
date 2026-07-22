#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildProjectProfile, inventoryProjectMetadata } from '../../../.vibekit/skills/tutien/scripts/project-profile.mjs';

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

function fixture(pkg, extras = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-profile-'));
  if (pkg) fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  for (const [name, content] of Object.entries(extras)) fs.writeFileSync(path.join(root, name), content);
  return root;
}

check('profile: recognizes a Material UI React TypeScript Vite project', () => {
  const root = fixture({
    name: 'material-kit-react',
    packageManager: 'yarn@1.22.22',
    scripts: { dev: 'vite', lint: 'eslint .', build: 'tsc && vite build' },
    dependencies: { react: '^19.0.0', '@mui/material': '^7.0.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^7.0.0' }
  }, { 'yarn.lock': '# lock\n', 'tsconfig.json': '{}\n' });
  const profile = buildProjectProfile(root);
  assert.equal(profile.projectId, 'material-kit-react');
  assert.equal(profile.projectType, 'web-app');
  assert.equal(profile.primaryLanguage, 'typescript');
  assert.deepEqual(profile.stack, ['react', 'typescript', 'vite', 'material-ui']);
  assert.ok(profile.domains.includes('frontend') && profile.domains.includes('ui'));
  assert.deepEqual(profile.validationCommands, ['yarn lint', 'yarn build']);
  assert.equal(profile.recommendedValidation, 'yarn lint');
});

check('profile: never returns package script bodies or embedded secrets', () => {
  const root = fixture({
    name: 'safe-app',
    scripts: { test: 'TOKEN=SECRETVALUE node private-test.js', 'bad key': 'hunter2' },
    dependencies: { react: '^19.0.0' }
  });
  const serialized = JSON.stringify(buildProjectProfile(root));
  assert.ok(!serialized.includes('SECRETVALUE'));
  assert.ok(!serialized.includes('hunter2'));
  assert.ok(!serialized.includes('private-test.js'));
  assert.match(serialized, /npm run test/);
  assert.ok(!serialized.includes('bad key'));
});

check('profile: metadata inventory is deterministic and content-free', () => {
  const root = fixture({ name: 'inventory-app', scripts: { test: 'SECRET_BODY' } }, { 'yarn.lock': 'SECRET_LOCK\n' });
  const one = inventoryProjectMetadata(root);
  const two = inventoryProjectMetadata(root);
  assert.deepEqual(one, two);
  assert.ok(one.some((item) => item.path === 'package.json' && item.size > 0));
  assert.ok(!JSON.stringify(one).includes('SECRET'));
});

check('profile: symlinked manifests are ignored', () => {
  const targetRoot = fixture({ name: 'outside-secret', scripts: { test: 'SECRETVALUE' } });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-profile-link-'));
  fs.symlinkSync(path.join(targetRoot, 'package.json'), path.join(root, 'package.json'));
  assert.ok(!inventoryProjectMetadata(root).some((item) => item.path === 'package.json'));
  assert.ok(!JSON.stringify(buildProjectProfile(root)).includes('outside-secret'));
});

check('profile: invalid and oversized package metadata fail closed', () => {
  const invalid = fixture(null, { 'package.json': '{not-json}\n' });
  assert.ok(buildProjectProfile(invalid).warnings.some((warning) => warning.code === 'metadata-invalid-json'));
  const oversized = fixture(null, { 'package.json': 'x'.repeat(1024 * 1024 + 1) });
  const profile = buildProjectProfile(oversized);
  assert.ok(profile.warnings.some((warning) => warning.code === 'metadata-too-large'));
  assert.equal(profile.stack.length, 0);
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} project-profile checks passed`);

