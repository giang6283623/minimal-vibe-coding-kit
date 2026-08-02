#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  authorizeScopedWrite,
  canonicalize,
  computeContractDigest,
  computeSignalDedupeKey,
  createFencedLeaseGateway,
  createGatewayState,
  createProtectedActionGatewaySimulator,
  digestBytes,
  digestValue,
  freezeContractDraft,
  parseScenario,
  validateScenario
} from '../../../.vibekit/skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const runnerPath = path.join(repoRoot, '.vibekit/skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs');
const fixturePath = path.join(repoRoot, '.vibekit/skills/proofline-orchestration/examples/auth-migration-case.json');
const fixture = parseScenario(fs.readFileSync(fixturePath, 'utf8'));

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

function copy(value = fixture) {
  return JSON.parse(JSON.stringify(value));
}

function expectCode(scenario, code) {
  const result = validateScenario(scenario);
  assert.equal(result.valid, false, `scenario unexpectedly valid; expected ${code}`);
  assert.ok(result.errors.some((error) => error.code === code), JSON.stringify(result.errors, null, 2));
}

function safeScenario({ mode = 'plan-only', lifecycle = 'frozen', sealState = 'not-eligible', signals = [] } = {}) {
  return {
    schemaVersion: fixture.schemaVersion,
    lifecycle,
    validationTime: fixture.validationTime,
    mode,
    risk: fixture.risk,
    contract: copy(fixture.contract),
    roles: signals.length > 0 ? copy(fixture.roles) : undefined,
    integrationLease: { active: false },
    signals,
    seal: { state: sealState }
  };
}

function safeSignal(type) {
  const signal = copy(fixture.signals[0]);
  signal.signalId = type === 'HOLD_NOTICE' ? 'sig-safe-hold' : 'sig-safe-denied';
  signal.type = type;
  signal.claim = type === 'HOLD_NOTICE' ? 'Work is paused before any further mutation' : 'The final acceptance gate remains unmet';
  signal.requestedAction = type === 'HOLD_NOTICE' ? 'Keep all writer authority closed' : 'Preserve the denied outcome';
  signal.scopeEffect = type === 'HOLD_NOTICE' ? 'holds' : 'none';
  signal.dedupeKey = computeSignalDedupeKey(signal);
  return signal;
}

function activeScenario() {
  const scenario = copy();
  scenario.lifecycle = 'active';
  scenario.mutationGrant.usesRecorded = 0;
  scenario.mutationGrant.revokedAt = null;
  scenario.integrationLease.active = true;
  scenario.integrationLease.revokedAt = null;
  return scenario;
}

function mutationRequest(overrides = {}) {
  return {
    trustedNow: fixture.validationTime,
    grantId: fixture.mutationGrant.grantId,
    actorId: fixture.mutationGrant.actorId,
    action: fixture.mutationGrant.action,
    target: fixture.mutationGrant.target,
    path: 'src/auth-policy.mjs',
    contractDigest: fixture.contract.digest,
    inputDigest: fixture.contract.inputDigest,
    ...overrides
  };
}

function protectedRequest(overrides = {}) {
  return {
    trustedNow: fixture.validationTime,
    action: fixture.authorityGrant.action,
    target: fixture.authorityGrant.target,
    contractDigest: fixture.contract.digest,
    inputDigest: fixture.contract.inputDigest,
    artifactDigest: fixture.seal.artifactDigest,
    treeDigest: fixture.seal.treeDigest,
    authorityGrantId: fixture.authorityGrant.grantId,
    epoch: fixture.seal.integrationEpoch,
    fencingToken: fixture.seal.fencingToken,
    ...overrides
  };
}

check('fixture: valid and seal-eligible with explicit residual limits', () => {
  const result = validateScenario(fixture);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.sealEligible, true);
  assert.ok(result.checks >= 240);
  assert.deepEqual(result.limitations, [
    'correlated-model-failure', 'flawed-oracle', 'compromised-infrastructure',
    'unavailable-dependencies', 'coordination-cost'
  ]);
});

check('canonical JSON: stable keys, canonical times, and deterministic digests', () => {
  assert.equal(canonicalize({ z: 1, a: [true, null] }), '{"a":[true,null],"z":1}');
  assert.equal(digestValue({ a: 1, b: 2 }), digestValue({ b: 2, a: 1 }));
  assert.throws(() => canonicalize(Number.POSITIVE_INFINITY), /non-finite/);
  const offsetTime = copy();
  offsetTime.validationTime = '2026-08-02T11:00:00.000+07:00';
  expectCode(offsetTime, 'VALIDATION_TIME');
});

check('parser: rejects malformed and non-object JSON', () => {
  assert.throws(() => parseScenario('{nope'), /invalid Proofline scenario JSON/);
  assert.throws(() => parseScenario('[]'), /root must be an object/);
});

check('contract: rejects content drift, malformed inputs, and path traversal', () => {
  const drift = copy();
  drift.contract.goal = 'silently changed';
  expectCode(drift, 'CONTRACT_DIGEST');
  const emptyEntry = copy();
  emptyEntry.contract.inputManifest.entries = [{}];
  expectCode(emptyEntry, 'INPUT_ENTRY');
  const traversal = copy();
  traversal.contract.protectedPaths = ['../test'];
  expectCode(traversal, 'PROTECTED_SCOPE');
});

check('contract revisions: only an unsigned draft can be frozen', () => {
  const changed = copy();
  changed.contract.goal = 'Changed without renewed evidence';
  expectCode(changed, 'CONTRACT_DIGEST');
  assert.throws(() => freezeContractDraft(changed), /only an unsigned draft/);
  const unsigned = {
    lifecycle: 'draft',
    contract: copy(fixture.contract)
  };
  unsigned.contract.version = 2;
  unsigned.contract.goal = 'Explicitly revised unsigned draft';
  delete unsigned.contract.digest;
  const frozen = freezeContractDraft(unsigned);
  assert.equal(frozen.lifecycle, 'frozen');
  assert.equal(frozen.contract.digest, computeContractDigest(frozen.contract));
  assert.notEqual(frozen.contract.digest, fixture.contract.digest);
  assert.equal(freezeContractDraft(unsigned).contract.digest, frozen.contract.digest);
});

check('safe states: plan-only, sequential, hold, and denial never become seal-eligible', () => {
  for (const scenario of [
    safeScenario(),
    safeScenario({ mode: 'sequential' }),
    safeScenario({ mode: 'countercheck', lifecycle: 'hold', signals: [safeSignal('HOLD_NOTICE')] }),
    safeScenario({ mode: 'countercheck', sealState: 'denied', signals: [safeSignal('SEAL_DENIED')] })
  ]) {
    const result = validateScenario(scenario);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
    assert.equal(result.sealEligible, false);
    assert.ok(result.blockers.length > 0);
  }
});

check('safe states: active writers or grant signals fail closed', () => {
  const writer = safeScenario();
  writer.integrationLease.active = true;
  expectCode(writer, 'SAFE_WRITER_LEASE');
  const grant = safeScenario({ signals: [{ type: 'SEAL_GRANTED' }] });
  expectCode(grant, 'SAFE_SIGNAL');
  const malformedHold = safeScenario({ mode: 'countercheck', lifecycle: 'hold', signals: [{ type: 'HOLD_NOTICE' }] });
  expectCode(malformedHold, 'SAFE_SIGNAL_ENVELOPE');
  const malformedDenied = safeScenario({ mode: 'countercheck', sealState: 'denied', signals: [{ type: 'SEAL_DENIED' }] });
  expectCode(malformedDenied, 'SAFE_SIGNAL_ENVELOPE');
});

check('plan-only is a hard mutation stop in both ledger and simulator', () => {
  const ledger = activeScenario();
  ledger.mode = 'plan-only';
  ledger.seal.state = 'not-eligible';
  ledger.integrationLease.active = false;
  expectCode(ledger, 'SAFE_PLAN_LIFECYCLE');
  expectCode(ledger, 'SAFE_PLAN_AUTHORITY');
  assert.throws(() => authorizeScopedWrite(ledger, mutationRequest(), createGatewayState()), /forbids writes/);
});

check('authority: rejects empty identity fields, expiry, revocation, and invalid counters', () => {
  for (const field of ['grantId', 'action', 'target']) {
    const scenario = copy();
    scenario.authorityGrant[field] = '';
    expectCode(scenario, field === 'grantId' ? 'GRANT_ID' : 'GRANT_SCOPE');
  }
  const identity = copy();
  identity.authorityGrant.identityEvidenceDigest = '';
  expectCode(identity, 'GRANT_IDENTITY');
  const expired = copy();
  expired.authorityGrant.expiresAt = expired.validationTime;
  expectCode(expired, 'GRANT_EXPIRY');
  const revoked = copy();
  revoked.authorityGrant.revokedAt = '2026-08-02T03:59:40.000Z';
  expectCode(revoked, 'GRANT_REVOKED');
  const negative = copy();
  negative.authorityGrant.usesRecorded = -1;
  expectCode(negative, 'GRANT_USE');
});

check('mutation authority: rejects stale binding, bad actor, and scope escape', () => {
  const stale = copy();
  stale.mutationGrant.contractDigest = '9'.repeat(64);
  expectCode(stale, 'MUTATION_GRANT_BINDING');
  const actor = copy();
  actor.mutationGrant.actorId = 'keeper-auth';
  expectCode(actor, 'MUTATION_GRANT_ACTOR');
  const scope = copy();
  scope.mutationGrant.scope = ['test/auth-policy.test.mjs'];
  expectCode(scope, 'MUTATION_GRANT_SCOPE');
});

check('final ledger: mutation and integration writers are closed before seal', () => {
  const mutation = copy();
  mutation.mutationGrant.usesRecorded = 0;
  mutation.mutationGrant.revokedAt = null;
  expectCode(mutation, 'MUTATION_GRANT_REVOKED');
  const lease = copy();
  lease.integrationLease.active = true;
  lease.integrationLease.revokedAt = null;
  expectCode(lease, 'INTEGRATION_OWNER');
  expectCode(lease, 'INTEGRATION_EXPIRY');
});

check('roles: independent contexts and every high-risk boundary must be enforced', () => {
  const shared = copy();
  shared.roles.find((role) => role.role === 'Countervoice').contextId = 'ctx-maker-auth';
  expectCode(shared, 'REVIEW_CONTEXT');
  const unavailable = copy();
  for (const role of unavailable.roles.filter((entry) => entry.access === 'read-only')) {
    for (const resource of Object.keys(role.enforcementManifest)) role.enforcementManifest[resource] = 'unavailable';
  }
  expectCode(unavailable, 'ROLE_ENFORCEMENT');
});

check('roles: rejects failed canaries and protected assigned scope', () => {
  const canary = copy();
  canary.roles.find((role) => role.role === 'Countervoice').capabilityProbe.mcpMutationDenied = false;
  expectCode(canary, 'ROLE_CANARY');
  const protectedScope = copy();
  protectedScope.roles.find((role) => role.role === 'Maker').assignedPaths = ['test/auth-policy.test.mjs'];
  expectCode(protectedScope, 'ROLE_SCOPE');
  expectCode(protectedScope, 'ROLE_PROTECTED');
});

check('verifier: rejects empty command provenance, merge ownership, and digest drift', () => {
  const empty = copy();
  empty.verifier.protectedPaths = [];
  empty.verifier.receipt.argv = [];
  empty.verifier.receipt.cwd = '';
  empty.verifier.receipt.toolVersions = {};
  expectCode(empty, 'VERIFIER_SCOPE');
  expectCode(empty, 'VERIFIER_COMMAND');
  const owner = copy();
  owner.verifier.actorId = 'wayfinder-auth';
  expectCode(owner, 'VERIFIER_OWNER');
  const drift = copy();
  drift.observedState.oracleDigest = '9'.repeat(64);
  expectCode(drift, 'VERIFIER_DIGEST');
});

check('budgets: rejects global, negative lane, retry, and reserve exhaustion', () => {
  const global = copy();
  global.usage.toolCalls = global.contract.budgets.maxToolCalls + 1;
  expectCode(global, 'BUDGET');
  const negative = copy();
  negative.usage.perLane['maker-auth'].tokens = -1;
  expectCode(negative, 'LANE_BUDGET');
  const lane = copy();
  lane.usage.perLane['maker-auth'].retries = 2;
  expectCode(lane, 'LANE_BUDGET');
  const reserve = copy();
  reserve.usage.verificationReserveRemaining = 0;
  expectCode(reserve, 'VERIFICATION_RESERVE');
});

check('liveness: rejects expired lanes and stale or future heartbeats', () => {
  const expired = copy();
  expired.roles[0].laneLease.expiresAt = expired.validationTime;
  expectCode(expired, 'LANE_LEASE');
  const stale = copy();
  stale.roles[0].laneLease.heartbeatAt = '2026-08-02T03:00:00.000Z';
  expectCode(stale, 'LANE_HEARTBEAT');
  const future = copy();
  future.roles[0].laneLease.heartbeatAt = '2026-08-02T04:01:00.000Z';
  expectCode(future, 'LANE_HEARTBEAT');
});

check('integration lease: requires complete epoch history, scope, and approved successor', () => {
  const gap = copy();
  gap.integrationLease.epoch = 3;
  gap.integrationLease.revokedEpochs = [];
  expectCode(gap, 'INTEGRATION_REVOCATION');
  const scope = copy();
  scope.integrationLease.scope = [];
  expectCode(scope, 'INTEGRATION_SCOPE');
  const successor = copy();
  successor.integrationLease.successor = { actorId: 'maker-auth', ownerApproved: false };
  expectCode(successor, 'INTEGRATION_SUCCESSOR');
});

check('signals: empty or reordered final chains cannot seal', () => {
  const empty = copy();
  empty.signals = [];
  expectCode(empty, 'SIGNAL_CHAIN');
  const order = copy();
  order.signals[1].sequence = 4;
  expectCode(order, 'SIGNAL_SEQUENCE');
});

check('signals: required final chain statuses must be accepted', () => {
  for (const [index, status] of [[1, 'withdrawn'], [2, 'refuted'], [3, 'withdrawn']]) {
    const scenario = copy();
    scenario.signals[index].status = status;
    expectCode(scenario, 'SIGNAL_CHAIN_STATUS');
  }
});

check('signals: sender actor, target disposition, and task binding are authenticated', () => {
  const sender = copy();
  sender.signals[1].senderActorId = 'countervoice-auth';
  expectCode(sender, 'SIGNAL_AUTH');
  const target = copy();
  target.signals[2].dispositionBy = 'wayfinder-auth';
  expectCode(target, 'SIGNAL_DISPOSITION');
  const task = copy();
  task.signals[0].taskId = 'other-task';
  expectCode(task, 'SIGNAL_BINDING');
});

check('signals: dedupe keys are recomputed and replay-safe', () => {
  assert.equal(fixture.signals[0].dedupeKey, computeSignalDedupeKey(fixture.signals[0]));
  const forged = copy();
  forged.signals[0].claim = 'changed without recomputing dedupe';
  expectCode(forged, 'SIGNAL_REPLAY');
  const replay = copy();
  replay.signals[1].dedupeKey = replay.signals[0].dedupeKey;
  expectCode(replay, 'SIGNAL_REPLAY');
});

check('signals: expiry, post-close messages, untimely acks, and secrets fail closed', () => {
  const expired = copy();
  expired.signals[0].expiresAt = expired.validationTime;
  expectCode(expired, 'SIGNAL_EXPIRY');
  const closed = copy();
  closed.signals[3].issuedAt = '2026-08-02T03:59:50.000Z';
  expectCode(closed, 'SIGNAL_CLOSED');
  const ack = copy();
  ack.signals[1].acknowledgedAt = '2026-08-02T03:56:30.000Z';
  expectCode(ack, 'SIGNAL_ACK');
  const secret = copy();
  secret.signals[0].evidence = ['Bearer secret-value-123456'];
  expectCode(secret, 'SIGNAL_SECRET');
});

check('signals: open blockers and unowned risk prevent sealing', () => {
  const open = copy();
  open.signals[0].status = 'open';
  expectCode(open, 'OPEN_BLOCKER');
  const risk = copy();
  risk.signals[0].status = 'risk-owned';
  risk.signals[0].dispositionBy = 'wayfinder-auth';
  expectCode(risk, 'SIGNAL_RISK_OWNER');
});

check('Proof Return: non-empty scope, changes, evidence, rollback, and provenance are mandatory', () => {
  for (const [field, value, code] of [
    ['scopeAssigned', [], 'PROOF_SCOPE'],
    ['scopeUsed', [], 'PROOF_SCOPE_USED'],
    ['changes', [], 'PROOF_CHANGES'],
    ['evidence', [], 'PROOF_EVIDENCE'],
    ['rollback', '', 'PROOF_ROLLBACK']
  ]) {
    const scenario = copy();
    scenario.proofReturns[0][field] = value;
    expectCode(scenario, code);
  }
  const parent = copy();
  parent.proofReturns[0].parentContextId = '';
  expectCode(parent, 'PROOF_PROVENANCE');
});

check('Proof Return: rejects self verification, drift, secrets, and privacy bypasses', () => {
  const self = copy();
  self.proofReturns[0].validation.ownerId = 'maker-auth';
  expectCode(self, 'PROOF_VERIFIER');
  const drift = copy();
  drift.observedState.treeDigest = '9'.repeat(64);
  expectCode(drift, 'PROOF_DIGEST');
  const secret = copy();
  secret.proofReturns[0].evidence[0].ref = 'password=supersecret';
  expectCode(secret, 'PROOF_SECRET');
  const privacy = copy();
  privacy.proofReturns[0].evidencePolicy.allowedReaders = [];
  privacy.proofReturns[0].evidencePolicy.deleteAfter = '2026-08-01T00:00:00.000Z';
  expectCode(privacy, 'PROOF_PRIVACY');
});

check('challenge: distinct sources, parent provenance, oracle, and limitations are mandatory', () => {
  const duplicate = copy();
  duplicate.challengePlan.evidenceSources = ['same', 'same'];
  expectCode(duplicate, 'CHALLENGE_EVIDENCE');
  const parent = copy();
  parent.challengePlan.parentContextId = '';
  expectCode(parent, 'CHALLENGE_CONTEXT');
  const limits = copy();
  limits.challengePlan.irreducibleLimits = [];
  expectCode(limits, 'IRREDUCIBLE_LIMITS');
});

check('runtime: executable and effective configuration evidence cannot be empty', () => {
  const empty = copy();
  empty.runtimeAttestation.executable = '';
  empty.runtimeAttestation.profileDigest = '';
  expectCode(empty, 'RUNTIME_EXECUTABLE');
  const gateway = copy();
  gateway.runtimeAttestation.gatewayAttestation = 'external-enforcement-proven';
  expectCode(gateway, 'RUNTIME_GATEWAY');
});

check('seal: actors, exact artifact, authority, current time, and simulator declaration bind', () => {
  const actor = copy();
  actor.seal.recordedBy = 'maker-auth';
  expectCode(actor, 'SEAL_TRANSITION');
  const artifact = copy();
  artifact.seal.artifactDigest = '9'.repeat(64);
  expectCode(artifact, 'SEAL_DIGEST');
  const grant = copy();
  grant.authorityGrant.artifactDigest = '9'.repeat(64);
  expectCode(grant, 'GRANT_FINAL_STATE');
  const tombstone = copy();
  tombstone.ledgerClosedAt = '2026-08-02T04:01:00.000Z';
  expectCode(tombstone, 'LEDGER_TOMBSTONE');
});

check('seal timeline: snapshot, writer closure, verification, proposal, grant, and seal are ordered', () => {
  const oldGrant = copy();
  oldGrant.mutationGrant.issuedAt = '2026-08-02T03:54:59.000Z';
  expectCode(oldGrant, 'MUTATION_GRANT_FRESHNESS');
  const lateMutationClose = copy();
  lateMutationClose.mutationGrant.revokedAt = lateMutationClose.validationTime;
  expectCode(lateMutationClose, 'SEAL_ORDER');
  const lateIntegrationClose = copy();
  lateIntegrationClose.integrationLease.revokedAt = '2026-08-02T03:59:21.000Z';
  expectCode(lateIntegrationClose, 'SEAL_ORDER');
  const earlyProposal = copy();
  earlyProposal.signals[2].issuedAt = '2026-08-02T03:59:19.000Z';
  earlyProposal.signals[2].acknowledgedAt = '2026-08-02T03:59:19.500Z';
  expectCode(earlyProposal, 'SEAL_ORDER');
});

check('scope policy simulator: exact mutation grant permits one assigned write', () => {
  const active = activeScenario();
  const state = createGatewayState();
  assert.equal(authorizeScopedWrite(active, mutationRequest(), state).authorized, true);
  assert.throws(() => authorizeScopedWrite(active, mutationRequest(), state), /use limit/);
});

check('scope policy simulator: rejects protected paths, forged fields, and untrusted time', () => {
  const active = activeScenario();
  assert.throws(() => authorizeScopedWrite(active, mutationRequest({ path: 'test/auth-policy.test.mjs' }), createGatewayState()), /outside assigned or granted scope/);
  assert.throws(() => authorizeScopedWrite(active, mutationRequest({ grantId: 'other' }), createGatewayState()), /grantId/);
  assert.throws(() => authorizeScopedWrite(active, mutationRequest({ action: 'other' }), createGatewayState()), /action/);
  assert.throws(() => authorizeScopedWrite(active, mutationRequest({ trustedNow: '2099-01-01T00:00:00.000Z' }), createGatewayState()), /not current/);
  assert.throws(() => authorizeScopedWrite(active, mutationRequest(), undefined), /shared state/);
  const malformed = activeScenario();
  malformed.mutationGrant.grantId = '';
  assert.throws(() => authorizeScopedWrite(malformed, mutationRequest({ grantId: '' }), createGatewayState()), /structure or binding/);
  const blocked = activeScenario();
  blocked.signals[0].status = 'open';
  assert.throws(() => authorizeScopedWrite(blocked, mutationRequest(), createGatewayState()), /open signal/);
});

check('fenced lease: handoff revokes the prior epoch', () => {
  const gateway = createFencedLeaseGateway(activeScenario().integrationLease);
  assert.equal(gateway.authorize({ holderId: 'wayfinder-auth', epoch: 1, fencingToken: 'auth-fence-token-0001', trustedNow: fixture.validationTime }).epoch, 1);
  const next = gateway.handoff({
    fromHolderId: 'wayfinder-auth', fromEpoch: 1, fromToken: 'auth-fence-token-0001',
    nextHolderId: 'wayfinder-successor', nextToken: 'auth-fence-token-0002',
    issuedAt: '2026-08-02T04:01:00.000Z', expiresAt: '2026-08-02T05:01:00.000Z', ownerApproved: true
  });
  assert.deepEqual(next.revokedEpochs, [1]);
  assert.throws(() => gateway.authorize({ holderId: 'wayfinder-auth', epoch: 1, fencingToken: 'auth-fence-token-0001', trustedNow: '2026-08-02T04:02:00.000Z' }), /stale or conflicting/);
});

check('protected action simulator: shared state prevents double consume across instances', () => {
  const state = createGatewayState();
  const first = createProtectedActionGatewaySimulator(fixture, state);
  const second = createProtectedActionGatewaySimulator(fixture, state);
  assert.equal(first.consume(protectedRequest()).consumed, true);
  assert.throws(() => second.consume(protectedRequest()), /use limit/);
});

check('protected action simulator: exact bindings and trusted current time are mandatory', () => {
  assert.throws(() => createProtectedActionGatewaySimulator(fixture, createGatewayState()).consume(protectedRequest({ artifactDigest: '9'.repeat(64) })), /artifactDigest/);
  assert.throws(() => createProtectedActionGatewaySimulator(fixture, createGatewayState()).consume(protectedRequest({ trustedNow: '2099-01-01T00:00:00.000Z' })), /not current/);
  assert.throws(() => createProtectedActionGatewaySimulator(fixture), /shared state/);
});

check('validator: deterministic across repeated runs', () => {
  assert.deepEqual(validateScenario(copy()), validateScenario(copy()));
});

check('CLI: accepts trusted fixture and rejects a stale lease', () => {
  const valid = spawnSync(process.execPath, [runnerPath, fixturePath], { encoding: 'utf8', timeout: 5000 });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).sealEligible, true);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'proofline-cli-'));
  try {
    const stalePath = path.join(tempRoot, 'stale.json');
    const stale = copy();
    stale.integrationLease.revokedAt = '2026-08-02T05:01:00.000Z';
    fs.writeFileSync(stalePath, JSON.stringify(stale), 'utf8');
    const invalid = spawnSync(process.execPath, [runnerPath, stalePath], { encoding: 'utf8', timeout: 5000 });
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.ok(JSON.parse(invalid.stdout).errors.some((error) => error.code === 'INTEGRATION_EXPIRY'));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

check('real sandbox case: authorized source edit passes an unchanged protected oracle', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'proofline-auth-'));
  try {
    const sourceDir = path.join(tempRoot, 'src');
    const testDir = path.join(tempRoot, 'test');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(testDir, { recursive: true });
    const sourcePath = path.join(sourceDir, 'auth-policy.mjs');
    const oraclePath = path.join(testDir, 'auth-policy.test.mjs');
    const beforeSource = 'export function isAllowed() { return false; }\n';
    const afterSource = "const allowed = new Set(['admin', 'editor']);\nexport function isAllowed(role) { return allowed.has(role); }\n";
    const oracle = [
      "import assert from 'node:assert/strict';",
      "import { isAllowed } from '../src/auth-policy.mjs';",
      "assert.equal(isAllowed('admin'), true);",
      "assert.equal(isAllowed('editor'), true);",
      "assert.equal(isAllowed('unknown'), false);",
      "console.log('protected auth oracle passed');",
      ''
    ].join('\n');
    fs.writeFileSync(sourcePath, beforeSource, 'utf8');
    fs.writeFileSync(oraclePath, oracle, 'utf8');
    const oracleBefore = digestBytes(fs.readFileSync(oraclePath));
    const active = activeScenario();
    assert.equal(authorizeScopedWrite(active, mutationRequest(), createGatewayState()).authorized, true);
    fs.writeFileSync(sourcePath, afterSource, 'utf8');
    const verification = spawnSync(process.execPath, [oraclePath], { cwd: tempRoot, encoding: 'utf8', timeout: 5000 });
    assert.equal(verification.status, 0, verification.stderr);
    assert.equal(digestBytes(fs.readFileSync(oraclePath)), oracleBefore, 'protected oracle changed');
    assert.match(verification.stdout, /protected auth oracle passed/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

if (process.exitCode) {
  console.error(`Proofline sandbox tests failed after ${passed} passing checks.`);
} else {
  console.log(`Proofline sandbox tests passed: ${passed} checks.`);
}
