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
  loadValidatedBrief,
  loadValidatedLaunch,
  safeRemoteImageUrl,
  validateAutonomousRunState,
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
const autonomousRunValidator = path.join(
  kitRoot,
  '.vibekit',
  'skills',
  'clone-website',
  'scripts',
  'validate-autonomous-run.mjs'
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

function autonomousExecution({ hosts = [], capture = false } = {}) {
  return {
    mode: 'autonomous-a-to-z',
    routine_stage_prompts: false,
    allowed_actions: [
      ...(capture ? ['capture-approved-hosts'] : []),
      'inspect-local',
      'normalize-local-data',
      'process-local-assets',
      'run-local-validation',
      'start-local-preview',
      'write-project',
    ],
    network: {
      mode: hosts.length > 0 ? 'approved-hosts-only' : 'disabled',
      approved_hosts: hosts,
    },
    credentials: 'never-request-or-store',
    install: 'explicit-approval-required',
    browser: 'user-operated-only',
    deployment: 'prepare-only',
    destructive_action: 'forbidden',
    paid_action: 'forbidden',
    unplanned_change: 'stop-and-report',
    max_retries_per_stage: 2,
  };
}

function customArchitectureReview() {
  return {
    data_boundary: 'Local normalized fixtures define the runtime data boundary.',
    deployment_boundary: 'Only local preview preparation is included.',
    image_boundary: 'Verified local assets are the only runtime image source.',
    routing_boundary: 'Explicit routes are implemented in the selected framework.',
    verification_boundary: 'Focused tests and repository validation define acceptance.',
  };
}

function asV2(fixture, { projectType, projectScale, targetStack, routingMode = 'standard', execution } = {}) {
  const brief = clone(fixture);
  brief.version = 2;
  brief.replica.source_platform ??= 'generic';
  brief.replica.project_type = projectType;
  brief.replica.project_scale = projectScale;
  brief.replica.routing_mode = routingMode;
  brief.replica.local_development ??= {
    mode: 'preserve-existing',
    container_engine: 'none',
  };
  if (targetStack) brief.replica.target_stack = targetStack;
  brief.execution = execution ?? autonomousExecution();
  return brief;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeLaunch(root, {
  actions = [{
    id: 'inspect-1',
    action: 'inspect-local',
    target_path: '.',
    argv: ['git', 'status', '--short'],
    use_limit: 1,
  }],
  hosts = [],
  issuedAt = null,
  expiresAt = null,
} = {}) {
  const current = Date.now();
  const normalizedBytes = fs.readFileSync(path.join(root, '.replica', 'brief.normalized.json'));
  const receipt = JSON.parse(fs.readFileSync(path.join(root, '.replica', 'validation-receipt.json'), 'utf8'));
  const launch = {
    version: 1,
    normalized_brief_sha256: sha256(normalizedBytes),
    source_inputs_sha256: receipt.source_inputs_sha256,
    mode: 'autonomous-a-to-z',
    cost_ceiling_minor: 0,
    issued_at: issuedAt ?? new Date(current - 60 * 60 * 1000).toISOString(),
    expires_at: expiresAt ?? new Date(current + 60 * 60 * 1000).toISOString(),
    owner_approval: {
      status: 'approved',
      channel: 'parent-session',
      evidence_sha256: sha256('bounded owner approval fixture'),
    },
    actions,
    approved_hosts: hosts,
    prohibited: ['credentials', 'destructive cleanup', 'paid actions', 'real payments'],
  };
  const bytes = Buffer.from(`${JSON.stringify(launch, null, 2)}\n`);
  fs.writeFileSync(path.join(root, '.replica', 'launch.json'), bytes);
  return { digest: sha256(bytes), launch };
}

function writeRunState(root, launchDigest, overrides = {}) {
  const normalizedBytes = fs.readFileSync(path.join(root, '.replica', 'brief.normalized.json'));
  const state = {
    version: 1,
    normalized_brief_sha256: sha256(normalizedBytes),
    launch_sha256: launchDigest,
    phase: 'inspect',
    completed_phases: [],
    retry_count: 0,
    terminal_state: null,
    blockers: [],
    last_checkpoint_sha256: sha256('initial checkpoint'),
    ...overrides,
  };
  fs.writeFileSync(path.join(root, '.replica', 'run-state.json'), `${JSON.stringify(state, null, 2)}\n`);
  return state;
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
  expectValid(
    JSON.parse(fs.readFileSync(path.join(
      kitRoot,
      '.vibekit',
      'skills',
      'clone-website',
      'references',
      'replica-brief.example.json'
    ), 'utf8')),
    'published replica brief example'
  );

  const v2Marketing = asV2(publicFixture, {
    projectType: 'marketing-site',
    projectScale: 'small',
    targetStack: 'static-html-css-js',
  });
  const v2MarketingRoot = expectValid(v2Marketing, 'v2 autonomous small marketing site');
  const v2MarketingPlan = fs.readFileSync(path.join(v2MarketingRoot, '.replica', 'plan.md'), 'utf8');
  assert.match(v2MarketingPlan, /Project type: `marketing-site`/);
  assert.match(v2MarketingPlan, /Project scale: `small`/);
  assert.match(v2MarketingPlan, /Mode: `autonomous-a-to-z`/);
  assert.match(v2MarketingPlan, /Routine stage prompts: `False`/);

  const trustedNowMs = Date.now();
  const validLaunch = writeLaunch(v2MarketingRoot);
  assert.equal(loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }).launchDigest, validLaunch.digest);
  writeRunState(v2MarketingRoot, validLaunch.digest);
  assert.equal(validateAutonomousRunState(v2MarketingRoot, { nowMs: trustedNowMs }).state.phase, 'inspect');
  const rawV2MarketingPath = path.join(v2MarketingRoot, '.replica', 'brief.json');
  const rawV2Marketing = fs.readFileSync(rawV2MarketingPath);
  fs.appendFileSync(rawV2MarketingPath, ' ');
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /digest does not match raw brief/,
    'raw brief drift invalidates downstream launch use'
  );
  fs.writeFileSync(rawV2MarketingPath, rawV2Marketing);
  const launchCli = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(launchCli.status, 0, launchCli.stderr);
  assert.match(launchCli.stdout, /"status": "valid"/);

  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'node-version-1',
      action: 'inspect-local',
      target_path: '.',
      argv: ['node', '--version'],
      use_limit: 1,
    }],
  });
  const mismatchedExecution = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--execute-action', 'node-version-1',
    '--', 'node', '--help',
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(mismatchedExecution.status, 2);
  assert.match(mismatchedExecution.stderr, /actual action id, type, target path, and argv must match/i);
  const exactExecution = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--execute-action', 'node-version-1',
    '--', 'node', '--version',
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(exactExecution.status, 0, exactExecution.stderr);
  assert.match(exactExecution.stdout, /^v\d+/m);
  const exhaustedExecution = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--execute-action', 'node-version-1',
    '--', 'node', '--version',
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(exhaustedExecution.status, 2);
  assert.match(exhaustedExecution.stderr, /exhausted its use limit/i);

  fs.writeFileSync(
    path.join(v2MarketingRoot, 'print-action-environment.mjs'),
    "process.stdout.write(process.env.NPM_TOKEN ?? 'credential-not-inherited');\n"
  );
  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'environment-1',
      action: 'inspect-local',
      target_path: '.',
      argv: ['node', 'print-action-environment.mjs'],
      use_limit: 1,
    }],
  });
  const sanitizedEnvironment = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--execute-action', 'environment-1',
    '--', 'node', 'print-action-environment.mjs',
  ], {
    cwd: v2MarketingRoot,
    encoding: 'utf8',
    env: { ...process.env, NPM_TOKEN: 'must-not-reach-child' },
  });
  assert.equal(sanitizedEnvironment.status, 0, sanitizedEnvironment.stderr);
  assert.equal(sanitizedEnvironment.stdout, 'credential-not-inherited');

  writeLaunch(v2MarketingRoot, {
    issuedAt: new Date(trustedNowMs - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(trustedNowMs - 60 * 60 * 1000).toISOString(),
  });
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /expired/,
    'expired launch records are rejected'
  );
  const untrustedClockOverride = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--launch-only',
    '--now', new Date(trustedNowMs - 90 * 60 * 1000).toISOString(),
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(untrustedClockOverride.status, 2);
  assert.match(untrustedClockOverride.stderr, /unknown argument: --now/i);
  const mismatchedLaunch = writeLaunch(v2MarketingRoot);
  mismatchedLaunch.launch.normalized_brief_sha256 = '0'.repeat(64);
  fs.writeFileSync(
    path.join(v2MarketingRoot, '.replica', 'launch.json'),
    `${JSON.stringify(mismatchedLaunch.launch, null, 2)}\n`
  );
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /does not match the validated normalized brief/,
    'launch records are bound to one normalized brief'
  );
  const paidLaunch = writeLaunch(v2MarketingRoot);
  paidLaunch.launch.cost_ceiling_minor = 1;
  fs.writeFileSync(
    path.join(v2MarketingRoot, '.replica', 'launch.json'),
    `${JSON.stringify(paidLaunch.launch, null, 2)}\n`
  );
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /cost_ceiling_minor must be zero/,
    'autonomous launch cannot grant a paid action'
  );
  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'unsafe-validation-1',
      action: 'run-local-validation',
      target_path: '.',
      argv: ['rm', '-rf', 'public'],
      use_limit: 1,
    }],
  });
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /forbidden destructive, network, shell, or deployment executable/,
    'an allowed action label cannot smuggle a destructive command'
  );
  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'unsafe-wrapper-1',
      action: 'run-local-validation',
      target_path: '.',
      argv: ['env', 'rm', '-rf', 'public'],
      use_limit: 1,
    }],
  });
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /forbidden destructive, network, shell, or deployment executable/,
    'command wrappers cannot bypass the executable denylist'
  );
  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'unsafe-write-1',
      action: 'write-project',
      target_path: '.',
      argv: ['node', 'rewrite-project.mjs'],
      use_limit: 1,
    }],
  });
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /write-project must use the host-native write sentinel/,
    'write-project rejects executable command substitution'
  );
  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'write-project-1',
      action: 'write-project',
      target_path: '.',
      argv: ['host-native', 'write-project'],
      use_limit: 1,
    }],
  });
  const nativeWrite = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--consume-native-action', 'write-project-1',
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(nativeWrite.status, 0, nativeWrite.stderr);
  assert.match(nativeWrite.stdout, /"status": "authorized-for-host-native-write"/);
  const exhaustedNativeWrite = spawnSync('node', [
    autonomousRunValidator,
    '--project-root', v2MarketingRoot,
    '--consume-native-action', 'write-project-1',
  ], { cwd: v2MarketingRoot, encoding: 'utf8' });
  assert.equal(exhaustedNativeWrite.status, 2);
  assert.match(exhaustedNativeWrite.stderr, /exhausted its use limit/i);
  writeLaunch(v2MarketingRoot, { hosts: ['outside.example.com'] });
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /host outside the validated execution allowlist/,
    'launch hosts cannot widen the execution policy'
  );
  writeLaunch(v2MarketingRoot, {
    actions: [{
      id: 'download-1',
      action: 'download-approved-assets',
      target_path: '.',
      argv: ['node', 'download-authorized-assets.mjs'],
      use_limit: 1,
    }],
  });
  assert.throws(
    () => loadValidatedLaunch(v2MarketingRoot, { nowMs: trustedNowMs }),
    /action is outside the validated execution allowlist/,
    'launch actions cannot widen the execution policy'
  );
  const restoredLaunch = writeLaunch(v2MarketingRoot);
  writeRunState(v2MarketingRoot, restoredLaunch.digest, {
    phase: 'implement',
    completed_phases: ['inspect'],
  });
  assert.throws(
    () => validateAutonomousRunState(v2MarketingRoot, { nowMs: trustedNowMs }),
    /next incomplete phase/,
    'run state cannot skip autonomous phases'
  );
  writeRunState(v2MarketingRoot, restoredLaunch.digest, {
    terminal_state: 'complete',
  });
  assert.throws(
    () => validateAutonomousRunState(v2MarketingRoot, { nowMs: trustedNowMs }),
    /requires every autonomous phase/,
    'complete cannot be claimed before handoff'
  );
  writeRunState(v2MarketingRoot, restoredLaunch.digest, {
    terminal_state: 'needs-owner-input',
    blockers: ['New authenticated host requires owner authority.'],
  });
  assert.equal(
    validateAutonomousRunState(v2MarketingRoot, { nowMs: trustedNowMs }).state.terminal_state,
    'needs-owner-input'
  );
  writeRunState(v2MarketingRoot, restoredLaunch.digest, {
    phase: 'handoff',
    completed_phases: [
      'inspect',
      'validate',
      'acquire',
      'normalize',
      'architect',
      'implement',
      'verify',
      'harden',
      'handoff',
    ],
    terminal_state: 'complete',
  });
  assert.equal(
    validateAutonomousRunState(v2MarketingRoot, { nowMs: trustedNowMs }).state.terminal_state,
    'complete'
  );

  expectValid(asV2(publicFixture, {
    projectType: 'corporate-site',
    projectScale: 'medium',
    targetStack: 'static-html-css-js',
  }), 'v2 autonomous medium corporate site');

  for (const projectScale of ['small', 'medium', 'large']) {
    expectValid(asV2(ownedFixture, {
      projectType: 'ecommerce',
      projectScale,
      targetStack: 'nextjs-app-router',
    }), `v2 autonomous ${projectScale} ecommerce site`);
  }

  const unknownProjectType = clone(v2Marketing);
  unknownProjectType.replica.project_type = 'unknown-site';
  expectInvalid(unknownProjectType, 'replica.project_type must be one of', 'v2 rejects unknown project type');

  const unknownProjectScale = clone(v2Marketing);
  unknownProjectScale.replica.project_scale = 'global';
  expectInvalid(unknownProjectScale, 'replica.project_scale must be one of', 'v2 rejects unknown project scale');

  const invalidStandardStack = clone(v2Marketing);
  invalidStandardStack.replica.target_stack = 'unrouted-framework';
  expectInvalid(invalidStandardStack, 'use replica.routing_mode custom-review', 'v2 standard routing rejects unknown stack');
  invalidStandardStack.replica.routing_mode = 'custom-review';
  invalidStandardStack.replica.architecture_review = customArchitectureReview();
  expectValid(invalidStandardStack, 'v2 custom review preserves a user-selected stack');

  const invalidStandardBackend = asV2(ownedFixture, {
    projectType: 'ecommerce',
    projectScale: 'large',
    targetStack: 'astro-typescript',
  });
  expectInvalid(
    invalidStandardBackend,
    'replica.backend_level B2 is not standard for astro-typescript',
    'v2 standard routing rejects an incompatible backend'
  );
  invalidStandardBackend.replica.routing_mode = 'custom-review';
  invalidStandardBackend.replica.architecture_review = customArchitectureReview();
  expectValid(invalidStandardBackend, 'v2 custom review records nonstandard backend boundaries');

  const standardWithReview = clone(v2Marketing);
  standardWithReview.replica.architecture_review = customArchitectureReview();
  expectInvalid(
    standardWithReview,
    'replica.architecture_review is allowed only with custom-review routing',
    'standard routing rejects an unnecessary custom review'
  );

  const autonomousWithPrompts = clone(v2Marketing);
  autonomousWithPrompts.execution.routine_stage_prompts = true;
  expectInvalid(autonomousWithPrompts, 'requires execution.routine_stage_prompts false', 'autonomous mode rejects routine prompts');

  const disabledNetworkWithHost = clone(v2Marketing);
  disabledNetworkWithHost.execution.network.approved_hosts = ['example.com'];
  expectInvalid(disabledNetworkWithHost, 'disabled execution network requires an empty approved_hosts list', 'disabled network rejects hosts');

  const planOnlyWrites = clone(v2Marketing);
  planOnlyWrites.execution.mode = 'plan-only';
  expectInvalid(planOnlyWrites, 'plan-only permits only the inspect-local action', 'plan-only rejects mutable actions');

  const v2Capture = asV2(captureFixture, {
    projectType: 'ecommerce',
    projectScale: 'small',
    targetStack: 'astro-typescript',
    execution: autonomousExecution({ hosts: ['store.example.com'], capture: true }),
  });
  const v2CaptureRoot = expectValid(v2Capture, 'v2 capture uses one frozen host allowlist');
  writeLaunch(v2CaptureRoot, {
    hosts: ['store.example.com'],
    actions: [{
      id: 'capture-path-substitution-1',
      action: 'capture-approved-hosts',
      target_path: '.',
      argv: ['node', '/tmp/fetch-public-catalog.mjs'],
      use_limit: 1,
    }],
  });
  assert.throws(
    () => loadValidatedLaunch(v2CaptureRoot, { nowMs: trustedNowMs }),
    /does not match the protected capture-approved-hosts entrypoint/,
    'protected scripts require the exact local basename, not a substituted path'
  );
  const captureHostDrift = clone(v2Capture);
  captureHostDrift.execution.network.approved_hosts = ['assets.example.com'];
  expectInvalid(captureHostDrift, 'capture.approved_hosts are missing', 'v2 capture host must be in execution allowlist');

  const boundSourceBrief = clone(v2Marketing);
  const boundSourceRoot = createProject(boundSourceBrief);
  const boundSourceName = 'content-caf\u00e9-\ud83d\ude00.json';
  const boundSourcePath = path.join(boundSourceRoot, '.replica', 'evidence', boundSourceName);
  const boundSourceBytes = Buffer.from('{"title":"Local fixture"}\n');
  fs.writeFileSync(boundSourcePath, boundSourceBytes);
  boundSourceBrief.source_inputs = [{
    path: boundSourceName,
    kind: 'mock-json',
    rights: 'owned',
    bytes: boundSourceBytes.length,
    sha256: crypto.createHash('sha256').update(boundSourceBytes).digest('hex'),
  }];
  fs.writeFileSync(
    path.join(boundSourceRoot, '.replica', 'brief.json'),
    `${JSON.stringify(boundSourceBrief, null, 2)}\n`
  );
  const nonNeutralPublicSource = runValidator(boundSourceRoot);
  assert.equal(nonNeutralPublicSource.status, 2);
  assert.match(nonNeutralPublicSource.stderr, /public research v2 source_inputs must all use neutralized rights/i);
  boundSourceBrief.source_inputs[0].rights = 'neutralized';
  fs.writeFileSync(
    path.join(boundSourceRoot, '.replica', 'brief.json'),
    `${JSON.stringify(boundSourceBrief, null, 2)}\n`
  );
  const boundSourceValidation = runValidator(boundSourceRoot);
  assert.equal(boundSourceValidation.status, 0, boundSourceValidation.stderr);
  assert.equal(loadValidatedBrief(boundSourceRoot).sourceInputsVerified, 1);
  const boundReceiptPath = path.join(boundSourceRoot, '.replica', 'validation-receipt.json');
  const boundReceipt = JSON.parse(fs.readFileSync(boundReceiptPath, 'utf8'));
  const originalSourceInputsDigest = boundReceipt.source_inputs_sha256;
  boundReceipt.source_inputs_sha256 = '0'.repeat(64);
  fs.writeFileSync(boundReceiptPath, `${JSON.stringify(boundReceipt, null, 2)}\n`);
  assert.throws(
    () => loadValidatedBrief(boundSourceRoot),
    /receipt digest does not match the normalized source input inventory/,
    'downstream consumers recompute the source input inventory digest'
  );
  boundReceipt.source_inputs_sha256 = originalSourceInputsDigest;
  fs.writeFileSync(boundReceiptPath, `${JSON.stringify(boundReceipt, null, 2)}\n`);
  fs.writeFileSync(boundSourcePath, '{"title":"Drifted fixture"}\n');
  assert.throws(
    () => loadValidatedBrief(boundSourceRoot),
    /byte size drifted|digest drifted/,
    'downstream consumers reject source input drift'
  );

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
  const capturedBytes = Buffer.from(`${JSON.stringify(shopifyExport, null, 2)}\n`);
  const capturedPath = path.join(v2CaptureRoot, '.replica', 'evidence', 'products.json');
  fs.writeFileSync(capturedPath, capturedBytes);
  const captureLaunch = writeLaunch(v2CaptureRoot, {
    hosts: ['store.example.com'],
    actions: [{
      id: 'capture-1',
      action: 'capture-approved-hosts',
      target_path: '.',
      argv: ['node', 'fetch-public-catalog.mjs'],
      use_limit: 1,
    }, {
      id: 'screenshots-1',
      action: 'capture-approved-hosts',
      target_path: '.',
      argv: ['node', 'capture-screenshots.mjs'],
      use_limit: 1,
    }],
  });
  const captureLoaded = loadValidatedBrief(v2CaptureRoot);
  fs.writeFileSync(
    path.join(v2CaptureRoot, '.replica', 'evidence', 'fetch-receipt.json'),
    `${JSON.stringify({
      version: 1,
      platform: 'shopify',
      host: 'store.example.com',
      fetched_at: '2026-08-23T08:00:00Z',
      launch_sha256: captureLaunch.digest,
      normalized_brief_sha256: captureLoaded.normalizedDigest,
      pages: [],
      products: {
        bytes: capturedBytes.length,
        count: 1,
        output: '.replica/evidence/products.json',
        sha256: sha256(capturedBytes),
        url: 'https://store.example.com/products.json?limit=20',
      },
    }, null, 2)}\n`
  );
  const capturedNormalization = spawnSync('node', [
    normalizeExport,
    '--project-root', v2CaptureRoot,
    '--platform', 'shopify',
    '--input', 'products.json',
  ], { cwd: v2CaptureRoot, encoding: 'utf8' });
  assert.equal(capturedNormalization.status, 0, capturedNormalization.stderr);
  fs.writeFileSync(capturedPath, `${JSON.stringify({ products: [] })}\n`);
  const tamperedCapture = spawnSync('node', [
    normalizeExport,
    '--project-root', v2CaptureRoot,
    '--platform', 'shopify',
    '--input', 'products.json',
  ], { cwd: v2CaptureRoot, encoding: 'utf8' });
  assert.equal(tamperedCapture.status, 2);
  assert.match(tamperedCapture.stderr, /captured input byte size|captured input digest/i);

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

  const v2AssetBrief = asV2(ownedFixture, {
    projectType: 'ecommerce',
    projectScale: 'medium',
    targetStack: 'nextjs-app-router',
    execution: autonomousExecution({ hosts: ['cdn.shopify.com', 'store.example.com'] }),
  });
  v2AssetBrief.replica.source_platform = 'shopify';
  v2AssetBrief.execution.allowed_actions.push('download-approved-assets');
  const v2AssetRoot = createProject(v2AssetBrief);
  const v2ExportBytes = Buffer.from(`${JSON.stringify(shopifyExport, null, 2)}\n`);
  fs.writeFileSync(path.join(v2AssetRoot, '.replica', 'evidence', 'shopify-products.json'), v2ExportBytes);
  v2AssetBrief.source_inputs = [{
    path: 'shopify-products.json',
    kind: 'api-export',
    rights: 'owned',
    bytes: v2ExportBytes.length,
    sha256: crypto.createHash('sha256').update(v2ExportBytes).digest('hex'),
  }];
  fs.writeFileSync(
    path.join(v2AssetRoot, '.replica', 'brief.json'),
    `${JSON.stringify(v2AssetBrief, null, 2)}\n`
  );
  const v2AssetValidation = runValidator(v2AssetRoot);
  assert.equal(v2AssetValidation.status, 0, v2AssetValidation.stderr);
  const v2Normalization = spawnSync('node', [
    normalizeExport,
    '--project-root', v2AssetRoot,
    '--platform', 'shopify',
    '--input', 'shopify-products.json',
  ], { cwd: v2AssetRoot, encoding: 'utf8' });
  assert.equal(v2Normalization.status, 0, v2Normalization.stderr);
  writeLaunch(v2AssetRoot, {
    hosts: ['store.example.com'],
    actions: [{
      id: 'download-assets-1',
      action: 'download-approved-assets',
      target_path: '.',
      argv: ['node', 'download-authorized-assets.mjs'],
      use_limit: 1,
    }],
  });
  const frozenHostBlock = spawnSync('node', [
    downloadAssets,
    '--project-root', v2AssetRoot,
    '--allow-host', 'cdn.shopify.com',
  ], { cwd: v2AssetRoot, encoding: 'utf8' });
  assert.equal(frozenHostBlock.status, 2);
  assert.match(frozenHostBlock.stderr, /outside the current launch record/i);
  writeLaunch(v2AssetRoot, {
    hosts: ['cdn.shopify.com'],
    actions: [{
      id: 'download-assets-2',
      action: 'download-approved-assets',
      target_path: '.',
      argv: ['node', 'download-authorized-assets.mjs'],
      use_limit: 1,
    }],
  });
  const mismatchedDownloaderInvocation = spawnSync('node', [
    downloadAssets,
    '--project-root', v2AssetRoot,
    '--allow-host', 'cdn.shopify.com',
  ], { cwd: v2AssetRoot, encoding: 'utf8' });
  assert.equal(mismatchedDownloaderInvocation.status, 2);
  assert.match(
    mismatchedDownloaderInvocation.stderr,
    /actual action id, type, target path, and argv must match one launch grant/i
  );

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
