#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  acceptHeaderForImageKind,
  imageKind,
  isPublicIp,
  safeRemoteImageUrl,
} from '../../../.vibekit/skills/clone-website/scripts/asset-workflow-lib.mjs';
import {
  detectChromeCommand,
} from '../../../.vibekit/skills/clone-website/scripts/capture-workflow-lib.mjs';

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
const prepareWorkspace = path.join(
  kitRoot,
  '.vibekit',
  'skills',
  'clone-website',
  'scripts',
  'prepare-replica-workspace.mjs'
);
const normalizeExport = path.join(
  kitRoot,
  '.vibekit',
  'skills',
  'clone-website',
  'scripts',
  'normalize-local-export.mjs'
);
const downloadAssets = path.join(
  kitRoot,
  '.vibekit',
  'skills',
  'clone-website',
  'scripts',
  'download-authorized-assets.mjs'
);
const verifyAssets = path.join(
  kitRoot,
  '.vibekit',
  'skills',
  'clone-website',
  'scripts',
  'verify-local-assets.mjs'
);
const publicFixture = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, 'safe-public-f2-s1-b0.json'), 'utf8')
);
const ownedFixture = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, 'safe-owned-f4-s4-b2.json'), 'utf8')
);
const captureFixture = JSON.parse(
  fs.readFileSync(path.join(fixtureRoot, 'safe-owned-capture.json'), 'utf8')
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
  const fakeChromeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-website-browser-path-'));
  tempRoots.push(fakeChromeRoot);
  fs.writeFileSync(path.join(fakeChromeRoot, 'google-chrome'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  assert.deepEqual(detectChromeCommand('linux', fakeChromeRoot), {
    command: 'google-chrome',
    platform: 'linux',
    source: 'path',
  });
  assert.deepEqual(detectChromeCommand('linux', ''), {
    command: null,
    platform: 'linux',
    source: 'missing',
  });
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('127.0.0.1'), false);
  assert.equal(isPublicIp('10.0.0.1'), false);
  assert.equal(isPublicIp('::1'), false);
  assert.equal(isPublicIp('ff02::1'), false);
  assert.throws(() => safeRemoteImageUrl('http://example.com/a.jpg', 'test URL'), /HTTPS/);
  assert.throws(() => safeRemoteImageUrl('https://127.0.0.1/a.jpg', 'test URL'), /private|IP-literal/);
  assert.throws(() => safeRemoteImageUrl('https://example.com/a.jpg?access_token=secret', 'test URL'), /secret-like/);
  assert.equal(imageKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpeg');

  const publicRoot = expectValid(publicFixture, 'safe public F2/S1/B0 brief');
  expectValid(ownedFixture, 'safe owned F4/S4/B2 brief');

  const legacyNormalized = JSON.parse(
    fs.readFileSync(path.join(publicRoot, '.replica', 'brief.normalized.json'), 'utf8')
  );
  assert.deepEqual(legacyNormalized.replica.local_development, {
    container_engine: 'none',
    mode: 'preserve-existing',
  });

  const dockerDesktopFixture = clone(publicFixture);
  dockerDesktopFixture.replica.local_development = {
    mode: 'docker-compose',
    container_engine: 'docker-desktop',
  };
  const dockerDesktopRoot = expectValid(dockerDesktopFixture, 'Docker Desktop local development');
  assert.match(
    fs.readFileSync(path.join(dockerDesktopRoot, '.replica', 'plan.md'), 'utf8'),
    /Local development: `docker-compose`[\s\S]*Container engine: `docker-desktop`/
  );

  const customRuntimeFixture = clone(publicFixture);
  customRuntimeFixture.replica.local_development = {
    mode: 'custom',
    container_engine: 'none',
    custom_runtime: 'Project-approved Devbox workflow',
  };
  expectValid(customRuntimeFixture, 'custom local development');

  const customContainerEngineFixture = clone(publicFixture);
  customContainerEngineFixture.replica.local_development = {
    mode: 'docker-compose',
    container_engine: 'custom',
    custom_runtime: 'Project-approved compatible container provider',
  };
  expectValid(customContainerEngineFixture, 'custom Docker Compose provider');

  const dockerWithoutEngine = clone(publicFixture);
  dockerWithoutEngine.replica.local_development = {
    mode: 'docker-compose',
    container_engine: 'none',
  };
  expectInvalid(
    dockerWithoutEngine,
    'docker-compose local development requires a container engine',
    'Docker Compose requires an engine'
  );

  const nativeWithEngine = clone(publicFixture);
  nativeWithEngine.replica.local_development = {
    mode: 'host-native',
    container_engine: 'docker-desktop',
  };
  expectInvalid(
    nativeWithEngine,
    'only docker-compose local development may select a container engine',
    'host-native rejects a container engine'
  );

  const customWithoutDescription = clone(publicFixture);
  customWithoutDescription.replica.local_development = {
    mode: 'custom',
    container_engine: 'none',
  };
  expectInvalid(
    customWithoutDescription,
    'custom local development requires replica.local_development.custom_runtime',
    'custom runtime requires a description'
  );

  const standardWithCustomDescription = clone(publicFixture);
  standardWithCustomDescription.replica.local_development = {
    mode: 'preserve-existing',
    container_engine: 'none',
    custom_runtime: 'Unexpected override',
  };
  expectInvalid(
    standardWithCustomDescription,
    'custom_runtime is allowed only for a custom runtime',
    'standard runtime rejects a custom description'
  );

  const markdownBreakingDescription = clone(publicFixture);
  markdownBreakingDescription.replica.local_development = {
    mode: 'custom',
    container_engine: 'none',
    custom_runtime: 'Unsafe `inline` Markdown',
  };
  expectInvalid(
    markdownBreakingDescription,
    'custom_runtime contains unsafe Markdown',
    'custom runtime rejects Markdown delimiters'
  );

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

  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-workspaces-'));
  tempRoots.push(workspaceRoot);
  const workspace = spawnSync('node', [
    prepareWorkspace,
    '--workspace-root', workspaceRoot,
    '--slug', 'sample-site',
  ], { encoding: 'utf8' });
  assert.equal(workspace.status, 0, workspace.stderr);
  assert.ok(fs.existsSync(path.join(workspaceRoot, 'sample-site', '.replica', 'evidence')));
  assert.match(fs.readFileSync(path.join(workspaceRoot, 'sample-site', '.gitignore'), 'utf8'), /\.replica\/manifests\//);
  const collision = spawnSync('node', [
    prepareWorkspace,
    '--workspace-root', workspaceRoot,
    '--slug', 'sample-site',
  ], { encoding: 'utf8' });
  assert.equal(collision.status, 2);
  const traversal = spawnSync('node', [
    prepareWorkspace,
    '--workspace-root', workspaceRoot,
    '--slug', '../escape',
  ], { encoding: 'utf8' });
  assert.equal(traversal.status, 2);

  const shopifyExport = {
    data: {
      products: {
        nodes: [
          {
            description: '<p>Local owner export</p>',
            handle: 'sample-product',
            id: 'gid://shopify/Product/1',
            images: {
              nodes: [
                {
                  altText: 'Sample product',
                  height: 800,
                  url: 'https://cdn.shopify.com/s/files/1/0001/products/sample.jpg?width=1200',
                  width: 1200,
                },
              ],
            },
            priceRange: { minVariantPrice: { amount: '12.00', currencyCode: 'USD' } },
            title: 'Sample product',
          },
        ],
      },
    },
  };
  const adapterBrief = clone(ownedFixture);
  adapterBrief.replica.source_platform = 'shopify';
  adapterBrief.source_inputs = ['shopify-products.json'];
  const adapterRoot = createProject(adapterBrief);
  fs.writeFileSync(
    path.join(adapterRoot, '.replica', 'evidence', 'shopify-products.json'),
    `${JSON.stringify(shopifyExport, null, 2)}\n`
  );
  const adapterValidation = runValidator(adapterRoot);
  assert.equal(adapterValidation.status, 0, adapterValidation.stderr);
  const normalizedBrief = JSON.parse(
    fs.readFileSync(path.join(adapterRoot, '.replica', 'brief.normalized.json'), 'utf8')
  );
  assert.equal(normalizedBrief.replica.workflow_id, 'shopify-to-nextjs-typescript');
  const normalization = spawnSync('node', [
    normalizeExport,
    '--project-root', adapterRoot,
    '--platform', 'shopify',
    '--input', 'shopify-products.json',
  ], { cwd: adapterRoot, encoding: 'utf8' });
  assert.equal(normalization.status, 0, normalization.stderr);
  const catalogText = fs.readFileSync(path.join(adapterRoot, '.replica', 'fixtures', 'catalog.json'), 'utf8');
  assert.doesNotMatch(catalogText, /https?:\/\//i);
  const assetManifest = JSON.parse(
    fs.readFileSync(path.join(adapterRoot, '.replica', 'manifests', 'authorized-assets.json'), 'utf8')
  );
  assert.deepEqual(assetManifest.candidate_hosts, ['cdn.shopify.com']);
  assert.equal(assetManifest.assets.length, 1);
  assert.match(assetManifest.assets[0].output, /^public\/assets\/imported\/shopify\//);

  assert.equal(acceptHeaderForImageKind('jpeg'), 'image/jpeg');
  assert.equal(acceptHeaderForImageKind('png'), 'image/png');
  assert.doesNotMatch(
    fs.readFileSync(downloadAssets, 'utf8'),
    /Accept: 'image\/avif,image\/webp,image\/png,image\/jpeg,image\/gif'/
  );

  const wrongHost = spawnSync('node', [
    downloadAssets,
    '--project-root', adapterRoot,
    '--allow-host', 'example.com',
  ], { cwd: adapterRoot, encoding: 'utf8' });
  assert.equal(wrongHost.status, 2);
  assert.match(wrongHost.stderr, /must exactly match candidate_hosts/i);

  const localAsset = path.join(adapterRoot, assetManifest.assets[0].output);
  fs.mkdirSync(path.dirname(localAsset), { recursive: true });
  fs.writeFileSync(localAsset, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const verification = spawnSync('node', [
    verifyAssets,
    '--project-root', adapterRoot,
  ], { cwd: adapterRoot, encoding: 'utf8' });
  assert.equal(verification.status, 0, verification.stderr);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(adapterRoot, '.replica', 'asset-verification.json'), 'utf8')).status,
    'pass'
  );

  const publicRemoteBrief = clone(publicFixture);
  publicRemoteBrief.replica.source_platform = 'shopify';
  publicRemoteBrief.source_inputs = ['shopify-products.json'];
  const publicRemoteRoot = createProject(publicRemoteBrief);
  fs.writeFileSync(
    path.join(publicRemoteRoot, '.replica', 'evidence', 'shopify-products.json'),
    `${JSON.stringify(shopifyExport, null, 2)}\n`
  );
  const publicRemoteValidation = runValidator(publicRemoteRoot);
  assert.equal(publicRemoteValidation.status, 0, publicRemoteValidation.stderr);
  const publicNormalization = spawnSync('node', [
    normalizeExport,
    '--project-root', publicRemoteRoot,
    '--platform', 'shopify',
    '--input', 'shopify-products.json',
  ], { cwd: publicRemoteRoot, encoding: 'utf8' });
  assert.equal(publicNormalization.status, 2);
  assert.match(publicNormalization.stderr, /must not contain remote image URLs/i);

  const captureRoot = expectValid(captureFixture, 'owned capture brief');
  const captureBlocked = clone(captureFixture);
  captureBlocked.capture.interactive_capture_approved = false;
  expectInvalid(captureBlocked, 'interactive_capture_approved must be true', 'capture approval gate');

  const capturePreflight = path.join(
    kitRoot,
    '.vibekit',
    'skills',
    'clone-website',
    'scripts',
    'capture-preflight.mjs'
  );
  const preflight = spawnSync('node', [capturePreflight, '--project-root', captureRoot, '--json'], {
    cwd: kitRoot,
    encoding: 'utf8',
  });
  assert.equal(preflight.status, 0, preflight.stderr);
  const preflightJson = JSON.parse(preflight.stdout);
  assert.ok(preflightJson.commands.fetch_catalog);
  assert.ok(preflightJson.commands.launch_browser || preflightJson.chrome.command);

  console.log('PASS clone-website local artifact contract');
} finally {
  for (const root of tempRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
