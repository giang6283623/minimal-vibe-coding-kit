#!/usr/bin/env node
// Deterministic Proofline ledger validator and local policy-gateway simulator.
// It validates declarations and exact digest bindings. It does not prove that
// an OS sandbox, provider, MCP server, or remote runtime enforced them.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROLES = new Set(['Keeper', 'Wayfinder', 'Countervoice', 'Maker']);
const MODES = new Set(['plan-only', 'sequential', 'countercheck', 'verified-graph']);
const LIFECYCLES = new Set(['draft', 'frozen', 'active', 'hold', 'closed']);
const SIGNAL_SENDERS = {
  FRAME_CHALLENGE: new Set(['Countervoice']),
  NEED_SIGNAL: new Set(['Keeper', 'Wayfinder', 'Countervoice', 'Maker']),
  HOLD_NOTICE: new Set(['Keeper', 'Wayfinder', 'Countervoice', 'Maker']),
  ASSEMBLY_CALL: new Set(['Keeper', 'Wayfinder', 'Countervoice']),
  PROOF_RETURN: new Set(['Maker', 'Wayfinder']),
  SEAL_PROPOSAL: new Set(['Wayfinder']),
  SEAL_GRANTED: new Set(['Keeper']),
  SEAL_DENIED: new Set(['Keeper', 'Countervoice'])
};
const SIGNAL_STATUSES = new Set(['open', 'accepted', 'refuted', 'risk-owned', 'escalated', 'withdrawn']);
const CONTROL_STATES = new Set(['enforced', 'verified', 'advisory', 'unavailable', 'failed']);
const EVIDENCE_CLASSES = new Set(['public', 'internal', 'confidential', 'restricted']);
const DIGEST_RE = /^[a-f0-9]{64}$/;
const CANONICAL_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const REQUIRED_RESOURCE_CLASSES = ['filesystem', 'semantic', 'credentials', 'network', 'api', 'delegation', 'verifier'];
const READ_ONLY_CANARIES = [
  'filesystemMutationDenied', 'mcpMutationDenied', 'apiMutationDenied',
  'networkMutationDenied', 'credentialMutationDenied', 'delegationMutationDenied'
];
const WRITE_CANARIES = ['outOfScopeWriteDenied', 'protectedWriteDenied', 'externalMutationDenied'];
const BLOCKING_SIGNALS = new Set(['FRAME_CHALLENGE', 'NEED_SIGNAL', 'HOLD_NOTICE', 'SEAL_DENIED']);
const REQUIRED_LIMITATIONS = [
  'correlated-model-failure', 'flawed-oracle', 'compromised-infrastructure',
  'unavailable-dependencies', 'coordination-cost'
];
const LANE_BUDGET_PAIRS = [
  ['wallSeconds', 'maxWallSeconds'], ['tokens', 'maxTokens'],
  ['toolCalls', 'maxToolCalls'], ['costUnits', 'maxCostUnits'], ['retries', 'maxRetries']
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
}

function uniqueStrings(value) {
  return nonEmptyStringArray(value) && new Set(value).size === value.length;
}

export function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonical JSON rejects non-finite numbers');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  throw new Error(`canonical JSON rejects ${typeof value}`);
}

export function digestValue(value) {
  return crypto.createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

export function digestBytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function computeInputDigest(inputManifest) {
  const manifest = clone(inputManifest ?? {});
  delete manifest.digest;
  return digestValue(manifest);
}

export function computeContractDigest(contract) {
  const frozen = clone(contract ?? {});
  delete frozen.digest;
  return digestValue(frozen);
}

export function computeSignalDedupeKey(signal) {
  return digestValue({
    taskId: signal?.taskId,
    contractVersion: signal?.contractVersion,
    contractDigest: signal?.contractDigest,
    inputDigest: signal?.inputDigest,
    type: signal?.type,
    claim: signal?.claim,
    evidenceDigest: digestValue(signal?.evidence ?? [])
  });
}

export function parseScenario(raw) {
  try {
    const value = JSON.parse(raw);
    if (!isPlainObject(value)) throw new Error('root must be an object');
    return value;
  } catch (error) {
    throw new Error(`invalid Proofline scenario JSON: ${error.message}`);
  }
}

function parseTime(value) {
  if (typeof value !== 'string' || !CANONICAL_TIME_RE.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? time : null;
}

function normalizeRelative(value) {
  if (!nonEmptyString(value) || path.posix.isAbsolute(value)) return null;
  const normalized = path.posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//, '');
  if (normalized === '..' || normalized.startsWith('../') || normalized === '.') return null;
  return normalized.replace(/\/$/, '');
}

function within(target, scope) {
  return target === scope || target.startsWith(`${scope}/`);
}

function scopeAllows(target, scopes) {
  const cleanTarget = normalizeRelative(target);
  if (!cleanTarget || !Array.isArray(scopes)) return false;
  return scopes.some((scope) => {
    const cleanScope = normalizeRelative(scope);
    return cleanScope !== null && within(cleanTarget, cleanScope);
  });
}

function normalizedNonEmptyPaths(value) {
  return nonEmptyStringArray(value) && value.every((entry) => normalizeRelative(entry) === entry);
}

function hasSensitiveEvidence(value) {
  const text = JSON.stringify(value ?? '');
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]+|\bsk-[A-Za-z0-9_-]{12,}|(?:password|secret|token)\s*[=:]\s*[^\s\"}]{4,}/i.test(text);
}

function roleByName(scenario, name) {
  return scenario.roles?.find((entry) => entry.role === name);
}

function currentAt(validationTime, issuedAt, expiresAt) {
  const now = parseTime(validationTime);
  const issued = parseTime(issuedAt);
  const expires = parseTime(expiresAt);
  return now !== null && issued !== null && expires !== null && issued <= now && now < expires;
}

function exactPriorEpochs(epoch, revokedEpochs) {
  if (!Number.isInteger(epoch) || !Array.isArray(revokedEpochs)) return false;
  return revokedEpochs.length === epoch - 1 && revokedEpochs.every((value, index) => value === index + 1);
}

function exactTargetActor(scenario, targetRole) {
  if (targetRole === 'Owner') return scenario.authorityGrant?.grantorIdentity;
  return roleByName(scenario, targetRole)?.actorId;
}

function addGrantChecks(check, grant, label, contract, validationTime, options = {}) {
  const prefix = options.prefix ?? 'GRANT';
  check(nonEmptyString(grant.grantId), `${prefix}_ID`, `${label} id is required`);
  check(nonEmptyString(grant.grantorIdentity) && grant.grantorIdentity.startsWith('owner:'), `${prefix}_IDENTITY`, `${label} Owner identity is not authenticated`);
  check(DIGEST_RE.test(grant.identityEvidenceDigest ?? ''), `${prefix}_IDENTITY`, `${label} identity evidence digest is required`);
  check(grant.taskId === contract.taskId && grant.contractVersion === contract.version, `${prefix}_BINDING`, `${label} task/version binding is stale`);
  check(grant.contractDigest === contract.digest && grant.inputDigest === contract.inputDigest, `${prefix}_BINDING`, `${label} digest binding is stale`);
  const issuedMs = parseTime(grant.issuedAt);
  const expiresMs = parseTime(grant.expiresAt);
  const revokedMs = parseTime(grant.revokedAt);
  if (options.closed) {
    check(issuedMs !== null && expiresMs !== null && issuedMs < expiresMs, `${prefix}_EXPIRY`, `${label} lifetime is invalid`);
    check((grant.revokedAt !== null && revokedMs !== null && revokedMs >= issuedMs && revokedMs <= parseTime(validationTime)) || grant.usesRecorded === grant.useLimit, `${prefix}_REVOKED`, `${label} must be revoked or fully consumed before final seal`);
    check(Number.isInteger(grant.useLimit) && grant.useLimit > 0 && Number.isInteger(grant.usesRecorded) && grant.usesRecorded >= 0 && grant.usesRecorded <= grant.useLimit, `${prefix}_USE`, `${label} final use counter is invalid`);
    check(grant.usesRecorded === 0 || (parseTime(grant.lastUsedAt) !== null && parseTime(grant.lastUsedAt) >= issuedMs && parseTime(grant.lastUsedAt) <= parseTime(validationTime)), `${prefix}_USE_TIME`, `${label} last-use time is missing or invalid`);
  } else {
    check(currentAt(validationTime, grant.issuedAt, grant.expiresAt), `${prefix}_EXPIRY`, `${label} is not current`);
    check(grant.revokedAt === null, `${prefix}_REVOKED`, `${label} is revoked`);
    check(Number.isInteger(grant.useLimit) && grant.useLimit > 0 && Number.isInteger(grant.usesRecorded) && grant.usesRecorded >= 0 && grant.usesRecorded < grant.useLimit, `${prefix}_USE`, `${label} use counter is invalid or exhausted`);
  }
  check(nonEmptyString(grant.action) && nonEmptyString(grant.target) && normalizedNonEmptyPaths(grant.scope), `${prefix}_SCOPE`, `${label} exact action, target, and normalized scope are required`);
  check((grant.scope ?? []).every((entry) => scopeAllows(entry, contract.editablePaths) && !scopeAllows(entry, contract.protectedPaths)), `${prefix}_SCOPE`, `${label} scope escapes editable paths`);
  if (options.actorRequired) check(nonEmptyString(grant.actorId), `${prefix}_ACTOR`, `${label} actor is required`);
  if (options.finalState) {
    check(grant.artifactDigest === options.finalState.artifactDigest && grant.treeDigest === options.finalState.treeDigest, `${prefix}_FINAL_STATE`, `${label} final-state binding is stale`);
  }
}

export function freezeContractDraft(rawDraft) {
  const draft = clone(rawDraft);
  const forbidden = ['authorityGrant', 'mutationGrant', 'roles', 'verifier', 'signals', 'proofReturns', 'integrationLease', 'seal'];
  if (draft.lifecycle !== 'draft' || forbidden.some((field) => draft[field] !== undefined)) {
    throw new Error('only an unsigned draft without authority or evidence can be frozen');
  }
  if (!Number.isInteger(draft.contract?.version) || draft.contract.version < 1) {
    throw new Error('draft contract version must be a positive integer');
  }
  draft.contract.inputManifest.digest = computeInputDigest(draft.contract.inputManifest);
  draft.contract.inputDigest = draft.contract.inputManifest.digest;
  draft.contract.digest = computeContractDigest(draft.contract);
  draft.lifecycle = 'frozen';
  return draft;
}

export function validateScenario(scenario) {
  const errors = [];
  const blockers = [];
  let checks = 0;
  const check = (condition, code, message) => {
    checks += 1;
    if (!condition) errors.push({ code, message });
  };
  const finish = (sealEligible = false) => {
    errors.sort((left, right) => left.code.localeCompare(right.code) || left.message.localeCompare(right.message));
    return {
      valid: errors.length === 0,
      sealEligible: errors.length === 0 && sealEligible,
      contractDigest: scenario?.contract?.digest ?? null,
      checks,
      errors,
      blockers,
      limitations: REQUIRED_LIMITATIONS
    };
  };
  const contract = scenario?.contract ?? {};
  const validationTime = scenario?.validationTime;
  const validationMs = parseTime(validationTime);

  check(scenario?.schemaVersion === 'proofline-sandbox-v1', 'SCHEMA_VERSION', 'schemaVersion must be proofline-sandbox-v1');
  check(validationMs !== null, 'VALIDATION_TIME', 'validationTime must use canonical UTC millisecond form');
  check(MODES.has(scenario?.mode), 'MODE', 'mode is not allowlisted');
  check(LIFECYCLES.has(scenario?.lifecycle), 'LIFECYCLE', 'lifecycle is not allowlisted');
  check(['low', 'medium', 'high'].includes(scenario?.risk), 'RISK', 'risk is not allowlisted');
  check(nonEmptyString(contract.taskId), 'TASK_ID', 'contract taskId is required');
  check(Number.isInteger(contract.version) && contract.version > 0, 'CONTRACT_VERSION', 'contract version must be positive');
  check(nonEmptyString(contract.goal), 'GOAL', 'contract goal is required');
  check(nonEmptyString(contract.doneSignal), 'DONE_SIGNAL', 'contract doneSignal is required');
  check(DIGEST_RE.test(contract.digest ?? ''), 'CONTRACT_DIGEST_FORMAT', 'contract digest must be lowercase SHA-256');
  check(contract.digest === computeContractDigest(contract), 'CONTRACT_DIGEST', 'contract digest does not match canonical content');
  const inputDigest = computeInputDigest(contract.inputManifest);
  check(contract.inputDigest === inputDigest && contract.inputManifest?.digest === inputDigest, 'INPUT_DIGEST', 'input manifest digest is stale or mismatched');
  const entries = contract.inputManifest?.entries;
  check(Array.isArray(entries) && entries.length > 0, 'INPUT_MANIFEST', 'input manifest must contain scoped entries');
  for (const entry of entries ?? []) {
    check(isPlainObject(entry) && nonEmptyString(entry.kind) && normalizeRelative(entry.path) === entry.path && DIGEST_RE.test(entry.digest ?? '') && nonEmptyString(entry.version), 'INPUT_ENTRY', 'each input entry needs kind, normalized path, SHA-256 digest, and version');
  }
  const capturedMs = parseTime(contract.inputManifest?.capturedAt);
  const maxAgeMs = Number(contract.inputManifest?.maxAgeSeconds) * 1000;
  check(capturedMs !== null && validationMs !== null && Number.isFinite(maxAgeMs) && maxAgeMs > 0 && validationMs >= capturedMs && validationMs - capturedMs <= maxAgeMs, 'INPUT_FRESHNESS', 'input manifest is expired or future-dated');
  check(normalizedNonEmptyPaths(contract.editablePaths), 'EDITABLE_SCOPE', 'editablePaths must be normalized and non-empty');
  check(normalizedNonEmptyPaths(contract.protectedPaths), 'PROTECTED_SCOPE', 'protectedPaths must be normalized and non-empty');
  for (const editable of contract.editablePaths ?? []) {
    check(!(contract.protectedPaths ?? []).some((protectedPath) => within(editable, protectedPath) || within(protectedPath, editable)), 'SCOPE_OVERLAP', `editable and protected scopes overlap: ${editable}`);
  }

  const safePath = scenario?.mode === 'plan-only' || scenario?.mode === 'sequential' || scenario?.lifecycle === 'hold' || ['not-eligible', 'denied'].includes(scenario?.seal?.state);
  if (safePath) {
    const sealState = scenario?.seal?.state;
    check(['not-eligible', 'denied'].includes(sealState), 'SAFE_SEAL_STATE', 'non-final workflows must explicitly deny or mark seal ineligible');
    check(scenario?.mode !== 'plan-only' || ['draft', 'frozen', 'hold'].includes(scenario?.lifecycle), 'SAFE_PLAN_LIFECYCLE', 'plan-only mode cannot enter an active or closed lifecycle');
    check(scenario?.mode !== 'plan-only' || scenario?.mutationGrant === undefined, 'SAFE_PLAN_AUTHORITY', 'plan-only mode cannot carry mutation authority');
    check(scenario?.integrationLease?.active !== true, 'SAFE_WRITER_LEASE', 'non-final workflows cannot retain an active integration writer');
    check(!(scenario?.signals ?? []).some((signal) => signal.type === 'SEAL_GRANTED'), 'SAFE_SIGNAL', 'non-final workflows cannot contain SEAL_GRANTED');
    const safeSignalIds = new Set();
    const safeDedupeKeys = new Set();
    let safePreviousSequence = 0;
    for (const signal of scenario?.signals ?? []) {
      const sender = roleByName(scenario, signal.senderRole);
      const targetActor = exactTargetActor(scenario, signal.targetRole);
      const issuedMs = parseTime(signal.issuedAt);
      const expiryMs = parseTime(signal.expiresAt);
      const ackMs = parseTime(signal.acknowledgedAt);
      check(SIGNAL_SENDERS[signal.type]?.has(signal.senderRole) === true, 'SAFE_SIGNAL_ENVELOPE', `safe-state signal ${signal.signalId} has an invalid type or sender role`);
      check(nonEmptyString(signal.signalId) && !safeSignalIds.has(signal.signalId), 'SAFE_SIGNAL_ENVELOPE', `safe-state signal id is missing or duplicated`);
      safeSignalIds.add(signal.signalId);
      check(Number.isInteger(signal.sequence) && signal.sequence > safePreviousSequence, 'SAFE_SIGNAL_ENVELOPE', `safe-state signal sequence is invalid`);
      safePreviousSequence = signal.sequence;
      check(signal.senderAuthenticated === true && signal.senderActorId === sender?.actorId && nonEmptyString(targetActor) && signal.dispositionBy === targetActor, 'SAFE_SIGNAL_ENVELOPE', `safe-state signal actor authentication or disposition is invalid`);
      check(signal.taskId === contract.taskId && signal.contractVersion === contract.version && signal.contractDigest === contract.digest && signal.inputDigest === contract.inputDigest, 'SAFE_SIGNAL_ENVELOPE', `safe-state signal binding is stale`);
      check(DIGEST_RE.test(signal.dedupeKey ?? '') && signal.dedupeKey === computeSignalDedupeKey(signal) && !safeDedupeKeys.has(signal.dedupeKey), 'SAFE_SIGNAL_ENVELOPE', `safe-state signal dedupe key is invalid or replayed`);
      safeDedupeKeys.add(signal.dedupeKey);
      check(SIGNAL_STATUSES.has(signal.status) && signal.status !== 'open' && signal.status !== 'escalated', 'SAFE_SIGNAL_ENVELOPE', `safe-state signal status is not terminal`);
      check(currentAt(validationTime, signal.issuedAt, signal.expiresAt) && ackMs !== null && issuedMs !== null && expiryMs !== null && issuedMs <= ackMs && ackMs <= validationMs && ackMs < expiryMs, 'SAFE_SIGNAL_ENVELOPE', `safe-state signal timing is invalid`);
      check(nonEmptyString(signal.claim) && nonEmptyString(signal.requestedAction) && ['none', 'narrows', 'holds'].includes(signal.scopeEffect) && nonEmptyStringArray(signal.evidence) && !hasSensitiveEvidence(signal.evidence), 'SAFE_SIGNAL_ENVELOPE', `safe-state signal proof is incomplete or sensitive`);
    }
    if (scenario?.lifecycle === 'hold') {
      check((scenario?.signals ?? []).some((signal) => signal.type === 'HOLD_NOTICE'), 'SAFE_HOLD_SIGNAL', 'hold lifecycle requires HOLD_NOTICE');
    }
    if (sealState === 'denied') {
      check((scenario?.signals ?? []).some((signal) => signal.type === 'SEAL_DENIED'), 'SAFE_DENIED_SIGNAL', 'denied seal requires SEAL_DENIED');
    }
    blockers.push(scenario?.mode === 'plan-only' ? 'PLAN_ONLY' : scenario?.lifecycle === 'hold' ? 'HOLD' : 'NOT_SEAL_ELIGIBLE');
    return finish(false);
  }

  check(scenario?.lifecycle === 'closed', 'FINAL_LIFECYCLE', 'granted seal requires closed lifecycle');
  check(['countercheck', 'verified-graph'].includes(scenario?.mode), 'FINAL_MODE', 'granted seal requires countercheck or verified-graph mode');
  const grant = scenario.authorityGrant ?? {};
  const mutationGrant = scenario.mutationGrant ?? {};
  addGrantChecks(check, mutationGrant, 'mutation grant', contract, validationTime, { prefix: 'MUTATION_GRANT', actorRequired: true, closed: true });
  addGrantChecks(check, grant, 'authority grant', contract, validationTime, { prefix: 'GRANT', finalState: scenario.observedState ?? {} });
  check(parseTime(mutationGrant.issuedAt) !== null && capturedMs !== null && parseTime(mutationGrant.issuedAt) >= capturedMs, 'MUTATION_GRANT_FRESHNESS', 'mutation grant predates the frozen input snapshot');

  const roles = Array.isArray(scenario.roles) ? scenario.roles : [];
  check(roles.length === 4 && new Set(roles.map((entry) => entry.role)).size === 4 && roles.every((entry) => ROLES.has(entry.role)), 'ROLE_SET', 'exactly one of each Proofline role is required');
  const actorIds = new Set();
  for (const role of roles) {
    check(nonEmptyString(role.actorId) && !actorIds.has(role.actorId), 'ROLE_ACTOR', `role ${role.role} needs a unique actorId`);
    actorIds.add(role.actorId);
    check(role.contractDigest === contract.digest && role.inputDigest === contract.inputDigest, 'ROLE_BINDING', `role ${role.role} binding is stale`);
    check(nonEmptyString(role.contextId) && nonEmptyString(role.parentContextId) && DIGEST_RE.test(role.promptDigest ?? ''), 'ROLE_PROVENANCE', `role ${role.role} context or prompt provenance is missing`);
    check(nonEmptyString(role.provider) && nonEmptyString(role.model), 'ROLE_RUNTIME', `role ${role.role} provider/model provenance is missing`);
    check(REQUIRED_RESOURCE_CLASSES.every((resource) => CONTROL_STATES.has(role.enforcementManifest?.[resource])), 'ROLE_CONTROLS', `role ${role.role} enforcement manifest is incomplete`);
    check(REQUIRED_RESOURCE_CLASSES.every((resource) => role.enforcementManifest?.[resource] === 'enforced'), 'ROLE_ENFORCEMENT', `role ${role.role} has an unenforced resource boundary`);
    const expectedAccess = ['Keeper', 'Countervoice'].includes(role.role) ? 'read-only' : 'workspace-write';
    check(role.access === expectedAccess, 'ROLE_ACCESS', `role ${role.role} access is invalid`);
    const requiredCanaries = expectedAccess === 'read-only' ? READ_ONLY_CANARIES : WRITE_CANARIES;
    check(requiredCanaries.every((name) => role.capabilityProbe?.[name] === true), 'ROLE_CANARY', `role ${role.role} capability canaries did not fail closed`);
    if (expectedAccess === 'workspace-write') {
      check(normalizedNonEmptyPaths(role.assignedPaths), 'ROLE_SCOPE', `role ${role.role} needs normalized assigned paths`);
      for (const assigned of role.assignedPaths ?? []) {
        check(scopeAllows(assigned, contract.editablePaths), 'ROLE_SCOPE', `role ${role.role} scope is outside editable paths: ${assigned}`);
        check(!scopeAllows(assigned, contract.protectedPaths), 'ROLE_PROTECTED', `role ${role.role} scope reaches protected state: ${assigned}`);
      }
    }
  }
  const maker = roleByName(scenario, 'Maker');
  const wayfinder = roleByName(scenario, 'Wayfinder');
  const countervoice = roleByName(scenario, 'Countervoice');
  check(countervoice?.contextId !== maker?.contextId && countervoice?.contextId !== wayfinder?.contextId, 'REVIEW_CONTEXT', 'Countervoice shares mutable-role context');
  check(countervoice?.parentContextId !== maker?.contextId && countervoice?.parentContextId !== wayfinder?.contextId, 'REVIEW_PARENT', 'Countervoice inherits mutable-role context');
  check(mutationGrant.actorId === maker?.actorId || mutationGrant.actorId === wayfinder?.actorId, 'MUTATION_GRANT_ACTOR', 'mutation grant actor is not mutable');

  const verifier = scenario.verifier ?? {};
  const receipt = verifier.receipt ?? {};
  check(nonEmptyString(verifier.actorId) && verifier.actorId !== maker?.actorId && verifier.actorId !== wayfinder?.actorId, 'VERIFIER_OWNER', 'verifier must be distinct from Maker and Wayfinder');
  check(normalizedNonEmptyPaths(verifier.protectedPaths) && verifier.protectedPaths.every((entry) => scopeAllows(entry, contract.protectedPaths)), 'VERIFIER_SCOPE', 'verifier paths must be non-empty, normalized, and protected');
  check(receipt.ownerId === verifier.actorId && receipt.exitCode === 0, 'VERIFIER_RECEIPT', 'verifier receipt owner or exit code is invalid');
  check(nonEmptyStringArray(receipt.argv) && nonEmptyString(receipt.cwd) && isPlainObject(receipt.toolVersions) && Object.keys(receipt.toolVersions).length > 0 && Object.values(receipt.toolVersions).every(nonEmptyString), 'VERIFIER_COMMAND', 'verifier argv, cwd, and tool versions are required');
  const finishedMs = parseTime(receipt.finishedAt);
  check(finishedMs !== null && validationMs !== null && finishedMs <= validationMs, 'VERIFIER_TIME', 'verifier finish time is invalid or future-dated');
  for (const field of ['treeDigest', 'artifactDigest', 'oracleDigest', 'outputDigest']) {
    check(DIGEST_RE.test(receipt[field] ?? '') && receipt[field] === scenario.observedState?.[field], 'VERIFIER_DIGEST', `verifier ${field} does not match observed state`);
  }

  const budgets = contract.budgets ?? {};
  const usage = scenario.usage ?? {};
  const budgetPairs = [
    ...LANE_BUDGET_PAIRS, ['agents', 'maxAgents'], ['concurrency', 'maxConcurrency'], ['rounds', 'maxRounds']
  ];
  for (const [used, maximum] of budgetPairs) {
    check(Number.isFinite(usage[used]) && Number.isFinite(budgets[maximum]) && usage[used] >= 0 && usage[used] <= budgets[maximum], 'BUDGET', `${used} exceeds or lacks ${maximum}`);
  }
  check(Number.isFinite(budgets.verificationReserveTools) && Number.isFinite(usage.verificationReserveRemaining) && usage.verificationReserveRemaining > 0 && usage.verificationReserveRemaining <= budgets.verificationReserveTools, 'VERIFICATION_RESERVE', 'verification reserve is exhausted or invalid');
  check(isPlainObject(budgets.perLane) && roles.every((role) => isPlainObject(budgets.perLane[role.actorId])), 'LANE_BUDGET', 'per-lane budgets are incomplete');
  check(isPlainObject(usage.perLane) && roles.every((role) => isPlainObject(usage.perLane[role.actorId])), 'LANE_USAGE', 'per-lane usage is incomplete');
  for (const role of roles) {
    const limit = budgets.perLane?.[role.actorId] ?? {};
    const used = usage.perLane?.[role.actorId] ?? {};
    for (const [usedField, maximum] of LANE_BUDGET_PAIRS) {
      check(Number.isFinite(used[usedField]) && used[usedField] >= 0 && Number.isFinite(limit[maximum]) && limit[maximum] >= 0 && used[usedField] <= limit[maximum], 'LANE_BUDGET', `lane ${role.actorId} exceeded or lacks ${maximum}`);
    }
    const laneLease = role.laneLease ?? {};
    const issuedMs = parseTime(laneLease.issuedAt);
    const heartbeatMs = parseTime(laneLease.heartbeatAt);
    check(currentAt(validationTime, laneLease.issuedAt, laneLease.expiresAt), 'LANE_LEASE', `lane ${role.actorId} lease is not current`);
    check(issuedMs !== null && capturedMs !== null && issuedMs >= capturedMs, 'LANE_LEASE_FRESHNESS', `lane ${role.actorId} lease predates the frozen input snapshot`);
    check(issuedMs !== null && heartbeatMs !== null && validationMs !== null && issuedMs <= heartbeatMs && heartbeatMs <= validationMs && Number.isFinite(laneLease.maxHeartbeatAgeSeconds) && laneLease.maxHeartbeatAgeSeconds > 0 && validationMs - heartbeatMs <= laneLease.maxHeartbeatAgeSeconds * 1000, 'LANE_HEARTBEAT', `lane ${role.actorId} heartbeat is stale, future, or before issue`);
  }

  const lease = scenario.integrationLease ?? {};
  check(lease.active === false && lease.holderId === wayfinder?.actorId, 'INTEGRATION_OWNER', 'final integration lease must belong to Wayfinder and be inactive');
  check(lease.contractDigest === contract.digest && lease.inputDigest === contract.inputDigest, 'INTEGRATION_BINDING', 'integration lease binding is stale');
  check(Number.isInteger(lease.epoch) && lease.epoch > 0 && nonEmptyString(lease.fencingToken) && lease.fencingToken.length >= 16, 'INTEGRATION_FENCE', 'integration fencing epoch/token is invalid');
  const leaseRevokedMs = parseTime(lease.revokedAt);
  check(parseTime(lease.issuedAt) !== null && parseTime(lease.expiresAt) !== null && parseTime(lease.issuedAt) < parseTime(lease.expiresAt) && leaseRevokedMs !== null && leaseRevokedMs >= parseTime(lease.issuedAt) && leaseRevokedMs <= validationMs, 'INTEGRATION_EXPIRY', 'final integration lease lifetime or revocation is invalid');
  check(parseTime(lease.issuedAt) !== null && capturedMs !== null && parseTime(lease.issuedAt) >= capturedMs, 'INTEGRATION_FRESHNESS', 'integration lease predates the frozen input snapshot');
  check(exactPriorEpochs(lease.epoch, lease.revokedEpochs), 'INTEGRATION_REVOCATION', 'integration lease must list every prior revoked epoch');
  check(normalizedNonEmptyPaths(lease.scope) && lease.scope.every((entry) => scopeAllows(entry, wayfinder?.assignedPaths ?? [])), 'INTEGRATION_SCOPE', 'integration lease scope is invalid');
  check(DIGEST_RE.test(lease.checkpointDigest ?? ''), 'INTEGRATION_CHECKPOINT', 'integration checkpoint digest is missing');
  check(lease.successor === null || (nonEmptyString(lease.successor?.actorId) && lease.successor?.ownerApproved === true), 'INTEGRATION_SUCCESSOR', 'integration successor is not Owner-approved');

  const signals = Array.isArray(scenario.signals) ? scenario.signals : [];
  check(signals.length >= 3, 'SIGNAL_CHAIN', 'granted seal requires a signal chain');
  const ids = new Set();
  const dedupeKeys = new Set();
  let previousSequence = 0;
  const ledgerClosedMs = parseTime(scenario.ledgerClosedAt);
  for (const signal of signals) {
    check(SIGNAL_SENDERS[signal.type]?.has(signal.senderRole) === true, 'SIGNAL_SENDER', `signal ${signal.signalId} has a forbidden sender/type pair`);
    const sender = roleByName(scenario, signal.senderRole);
    check(signal.senderAuthenticated === true && signal.senderActorId === sender?.actorId, 'SIGNAL_AUTH', `signal ${signal.signalId} sender identity is not authenticated`);
    check(signal.taskId === contract.taskId && signal.contractVersion === contract.version && signal.contractDigest === contract.digest && signal.inputDigest === contract.inputDigest, 'SIGNAL_BINDING', `signal ${signal.signalId} is stale`);
    check(SIGNAL_STATUSES.has(signal.status), 'SIGNAL_STATUS', `signal ${signal.signalId} has invalid status`);
    check(nonEmptyString(signal.signalId) && !ids.has(signal.signalId), 'SIGNAL_ID', `signal id is missing or duplicated: ${signal.signalId}`);
    ids.add(signal.signalId);
    check(DIGEST_RE.test(signal.dedupeKey ?? '') && signal.dedupeKey === computeSignalDedupeKey(signal) && !dedupeKeys.has(signal.dedupeKey), 'SIGNAL_REPLAY', `signal dedupe key is invalid or replayed: ${signal.signalId}`);
    dedupeKeys.add(signal.dedupeKey);
    check(Number.isInteger(signal.sequence) && signal.sequence > previousSequence, 'SIGNAL_SEQUENCE', `signal sequence is not monotonic: ${signal.signalId}`);
    previousSequence = signal.sequence;
    const issuedMs = parseTime(signal.issuedAt);
    const expiryMs = parseTime(signal.expiresAt);
    const ackMs = parseTime(signal.acknowledgedAt);
    check(currentAt(validationTime, signal.issuedAt, signal.expiresAt), 'SIGNAL_EXPIRY', `signal ${signal.signalId} is expired or future-dated`);
    check(issuedMs !== null && ledgerClosedMs !== null && issuedMs < ledgerClosedMs, 'SIGNAL_CLOSED', `signal ${signal.signalId} was sent after contract closure`);
    check(signal.status === 'open' || (ackMs !== null && issuedMs !== null && expiryMs !== null && validationMs !== null && issuedMs <= ackMs && ackMs <= validationMs && ackMs < expiryMs), 'SIGNAL_ACK', `signal ${signal.signalId} lacks a timely acknowledgement`);
    const targetActor = exactTargetActor(scenario, signal.targetRole);
    check(nonEmptyString(targetActor) && signal.dispositionBy === targetActor, 'SIGNAL_DISPOSITION', `signal ${signal.signalId} disposition actor is invalid`);
    check(signal.status !== 'risk-owned' || signal.dispositionBy === grant.grantorIdentity, 'SIGNAL_RISK_OWNER', `signal ${signal.signalId} risk was not owned by the Owner`);
    check(nonEmptyString(signal.claim) && nonEmptyString(signal.requestedAction) && ['none', 'narrows', 'holds'].includes(signal.scopeEffect) && nonEmptyStringArray(signal.evidence), 'SIGNAL_EVIDENCE', `signal ${signal.signalId} claim, action, scope effect, or evidence is incomplete`);
    check(!hasSensitiveEvidence(signal.evidence), 'SIGNAL_SECRET', `signal ${signal.signalId} contains sensitive evidence`);
  }
  const requiredTypes = ['PROOF_RETURN', 'SEAL_PROPOSAL', 'SEAL_GRANTED'];
  const typeIndexes = requiredTypes.map((type) => signals.findIndex((signal) => signal.type === type));
  check(typeIndexes.every((index) => index >= 0) && typeIndexes[0] < typeIndexes[1] && typeIndexes[1] < typeIndexes[2], 'SIGNAL_CHAIN', 'Proof Return, seal proposal, and seal grant chain is missing or out of order');
  const proofSignal = signals[typeIndexes[0]];
  const proposalSignal = signals[typeIndexes[1]];
  const grantedSignal = signals[typeIndexes[2]];
  check(proofSignal?.evidence?.includes(`proof-return:${scenario.proofReturns?.[0]?.artifactId}`), 'SIGNAL_CHAIN_EVIDENCE', 'Proof Return signal does not link the artifact');
  check(nonEmptyString(receipt.receiptId) && proposalSignal?.evidence?.includes(`verifier-receipt:${receipt.receiptId}`), 'SIGNAL_CHAIN_EVIDENCE', 'seal proposal does not link the verifier receipt');
  check(grantedSignal?.evidence?.includes(`owner-grant:${grant.grantId}`) && grantedSignal?.issuedAt === scenario.seal?.issuedAt, 'SIGNAL_CHAIN_EVIDENCE', 'seal grant does not link Owner authority and seal time');
  check(proofSignal?.status === 'accepted' && proposalSignal?.status === 'accepted' && grantedSignal?.status === 'accepted', 'SIGNAL_CHAIN_STATUS', 'required final signal chain must be accepted');
  const openBlocking = signals.filter((signal) => BLOCKING_SIGNALS.has(signal.type) && ['open', 'escalated'].includes(signal.status));
  check(openBlocking.length === 0, 'OPEN_BLOCKER', `open blocking signals: ${openBlocking.map((entry) => entry.signalId).join(', ')}`);

  const returns = Array.isArray(scenario.proofReturns) ? scenario.proofReturns : [];
  check(returns.length > 0, 'PROOF_RETURN_SET', 'at least one Proof Return is required');
  for (const handback of returns) {
    const actor = roles.find((role) => role.actorId === handback.actorId);
    check(actor && ['Maker', 'Wayfinder'].includes(actor.role), 'PROOF_ACTOR', `Proof Return ${handback.artifactId} has an invalid actor`);
    check(nonEmptyString(handback.artifactId) && handback.contractDigest === contract.digest && handback.inputDigest === contract.inputDigest, 'PROOF_BINDING', `Proof Return ${handback.artifactId} is stale`);
    check(signals.some((signal) => signal.type === 'PROOF_RETURN' && signal.evidence?.includes(`proof-return:${handback.artifactId}`)), 'PROOF_SIGNAL_LINK', `Proof Return ${handback.artifactId} lacks a linked signal`);
    check(handback.contextId === actor?.contextId && handback.promptDigest === actor?.promptDigest && handback.parentContextId === actor?.parentContextId, 'PROOF_PROVENANCE', `Proof Return ${handback.artifactId} provenance is stale`);
    check(handback.inputSnapshot?.digest === contract.inputDigest && parseTime(handback.inputSnapshot?.capturedAt) !== null && handback.inputSnapshot?.capturedAt === contract.inputManifest?.capturedAt, 'PROOF_INPUT_SNAPSHOT', `Proof Return ${handback.artifactId} input snapshot is stale`);
    const freshnessMs = parseTime(handback.freshnessCheckedAt);
    check(freshnessMs !== null && validationMs !== null && freshnessMs <= validationMs, 'PROOF_FRESHNESS', `Proof Return ${handback.artifactId} freshness time is invalid`);
    check(normalizedNonEmptyPaths(handback.scopeAssigned) && handback.scopeAssigned.every((entry) => actor?.assignedPaths?.includes(entry)), 'PROOF_SCOPE', `Proof Return ${handback.artifactId} assigned scope is invalid`);
    check(normalizedNonEmptyPaths(handback.scopeUsed) && handback.scopeUsed.every((entry) => scopeAllows(entry, handback.scopeAssigned)), 'PROOF_SCOPE_USED', `Proof Return ${handback.artifactId} escaped its scope`);
    check(nonEmptyStringArray(handback.changes), 'PROOF_CHANGES', `Proof Return ${handback.artifactId} change list is empty`);
    check(canonicalize(handback.enforcementManifest) === canonicalize(actor?.enforcementManifest), 'PROOF_ENFORCEMENT', `Proof Return ${handback.artifactId} enforcement receipt is stale`);
    for (const [usedField] of LANE_BUDGET_PAIRS) {
      check(Number.isFinite(handback.budgetUsed?.[usedField]) && handback.budgetUsed[usedField] >= 0, 'PROOF_BUDGET', `Proof Return ${handback.artifactId} budget usage is invalid`);
    }
    check(handback.validation?.ownerId === verifier.actorId && handback.validation?.ownerId !== handback.actorId, 'PROOF_VERIFIER', `Proof Return ${handback.artifactId} was self-verified`);
    for (const field of ['treeDigest', 'artifactDigest', 'oracleDigest', 'outputDigest']) {
      check(DIGEST_RE.test(handback[field] ?? '') && handback[field] === scenario.observedState?.[field] && handback.validation?.[field] === receipt[field], 'PROOF_DIGEST', `Proof Return ${handback.artifactId} ${field} is stale`);
    }
    check(handback.validation?.exitCode === 0 && nonEmptyStringArray(handback.validation?.argv) && nonEmptyString(handback.validation?.cwd) && isPlainObject(handback.validation?.toolVersions) && Object.keys(handback.validation.toolVersions).length > 0 && Object.values(handback.validation.toolVersions).every(nonEmptyString), 'PROOF_COMMAND', `Proof Return ${handback.artifactId} validation receipt is incomplete`);
    check(handback.status === 'accepted' && handback.cleanupStatus === 'clean' && handback.oracleIntegrity === 'protected', 'PROOF_STATUS', `Proof Return ${handback.artifactId} is not accepted, clean, and oracle-protected`);
    check(nonEmptyString(handback.rollback), 'PROOF_ROLLBACK', `Proof Return ${handback.artifactId} lacks rollback guidance`);
    check(Array.isArray(handback.signalsOpen) && handback.signalsOpen.length === 0 && Array.isArray(handback.residualRisk), 'PROOF_RESIDUAL', `Proof Return ${handback.artifactId} has unresolved signals or invalid residual risk`);
    check(Array.isArray(handback.evidence) && handback.evidence.length > 0 && handback.evidence.every((entry) => entry.kind === 'reference' && nonEmptyString(entry.ref)), 'PROOF_EVIDENCE', `Proof Return ${handback.artifactId} evidence must be non-empty references`);
    check(!hasSensitiveEvidence(handback.evidence), 'PROOF_SECRET', `Proof Return ${handback.artifactId} contains sensitive evidence`);
    const policy = handback.evidencePolicy ?? {};
    check(policy.allowSecretValues === false && EVIDENCE_CLASSES.has(policy.classification) && uniqueStrings(policy.allowedReaders) && parseTime(policy.deleteAfter) !== null && parseTime(policy.deleteAfter) > validationMs, 'PROOF_PRIVACY', `Proof Return ${handback.artifactId} evidence policy is invalid`);
  }

  const challenge = scenario.challengePlan ?? {};
  check(challenge.separateContext === true && challenge.reviewClassification === 'independent' && nonEmptyString(challenge.parentContextId), 'CHALLENGE_CONTEXT', 'review is not independently classified or lacks parent provenance');
  check(uniqueStrings(challenge.evidenceSources) && challenge.evidenceSources.length >= 2, 'CHALLENGE_EVIDENCE', 'Countervoice lacks distinct independent evidence sources');
  check(challenge.externalOracle?.deterministic === true && challenge.externalOracle?.ownerId === verifier.actorId, 'CHALLENGE_ORACLE', 'external deterministic oracle is missing');
  check(uniqueStrings(challenge.irreducibleLimits) && REQUIRED_LIMITATIONS.every((item) => challenge.irreducibleLimits.includes(item)), 'IRREDUCIBLE_LIMITS', 'irreducible limitations are incomplete');

  const runtime = scenario.runtimeAttestation ?? {};
  check(DIGEST_RE.test(runtime.controlPlaneDigest ?? '') && runtime.controlPlaneDigest === scenario.observedState?.controlPlaneDigest, 'RUNTIME_DIGEST', 'control-plane digest is stale');
  check(path.isAbsolute(runtime.executable ?? '') && nonEmptyString(runtime.version) && DIGEST_RE.test(runtime.profileDigest ?? '') && DIGEST_RE.test(runtime.executableDigest ?? '') && DIGEST_RE.test(runtime.effectiveConfigDigest ?? '') && DIGEST_RE.test(runtime.probeOutputDigest ?? ''), 'RUNTIME_EXECUTABLE', 'runtime executable or attestation digests are missing');
  check(runtime.governancePathsProtected === true && runtime.verifierPathsProtected === true && runtime.hooksReviewed === true, 'RUNTIME_TRUST', 'runtime governance, verifier, or hook trust is unresolved');
  check(runtime.scopeGateway === 'proofline-policy-simulator-v1' && runtime.effectiveProbe === 'verified' && runtime.gatewayAttestation === 'local-process-only', 'RUNTIME_GATEWAY', 'effective policy-gateway attestation is invalid');

  const seal = scenario.seal ?? {};
  check(seal.state === 'granted' && seal.proposedBy === wayfinder?.actorId && seal.recordedBy === roleByName(scenario, 'Keeper')?.actorId, 'SEAL_TRANSITION', 'seal transition actors or state are invalid');
  check(seal.contractDigest === contract.digest && seal.inputDigest === contract.inputDigest, 'SEAL_BINDING', 'seal contract/input binding is stale');
  check(seal.authorityGrantId === grant.grantId && seal.integrationEpoch === lease.epoch && seal.fencingToken === lease.fencingToken, 'SEAL_AUTHORITY', 'seal authority or fencing binding is stale');
  check(seal.artifactDigest === scenario.observedState?.artifactDigest && seal.treeDigest === scenario.observedState?.treeDigest && seal.oracleDigest === scenario.observedState?.oracleDigest && seal.outputDigest === scenario.observedState?.outputDigest, 'SEAL_DIGEST', 'seal exact-tree evidence is stale');
  check(currentAt(validationTime, seal.issuedAt, seal.expiresAt), 'SEAL_EXPIRY', 'seal is not current');
  const mutationClosedMs = Math.max(parseTime(mutationGrant.revokedAt) ?? Number.NEGATIVE_INFINITY, parseTime(mutationGrant.lastUsedAt) ?? Number.NEGATIVE_INFINITY);
  check(finishedMs !== null && parseTime(proposalSignal?.issuedAt) !== null && parseTime(grant.issuedAt) !== null && parseTime(seal.issuedAt) !== null
    && mutationClosedMs <= finishedMs && leaseRevokedMs !== null && leaseRevokedMs <= finishedMs
    && finishedMs <= parseTime(proposalSignal.issuedAt) && parseTime(proposalSignal.issuedAt) <= parseTime(grant.issuedAt)
    && parseTime(grant.issuedAt) <= parseTime(seal.issuedAt), 'SEAL_ORDER', 'writers, verification, proposal, final grant, and seal order is invalid');
  check(seal.protectedActionGateway === 'policy-simulator', 'SEAL_GATEWAY', 'seal does not declare the policy simulator boundary');
  check(ledgerClosedMs !== null && parseTime(seal.issuedAt) !== null && ledgerClosedMs >= parseTime(seal.issuedAt) && validationMs !== null && ledgerClosedMs <= validationMs, 'LEDGER_TOMBSTONE', 'closed-contract tombstone is missing, future, or precedes the seal');
  return finish(true);
}

function assertGatewayState(state) {
  if (!(state?.grantUses instanceof Map) || !(state?.consumedActions instanceof Set)) {
    throw new Error('gateway requires an explicit shared state store');
  }
}

export function createGatewayState() {
  return { grantUses: new Map(), consumedActions: new Set() };
}

function consumeGrant(state, grant, key) {
  assertGatewayState(state);
  const localUses = state.grantUses.get(grant.grantId) ?? 0;
  const totalUses = grant.usesRecorded + localUses;
  if (totalUses >= grant.useLimit || state.consumedActions.has(key)) throw new Error('grant use limit is exhausted');
  state.grantUses.set(grant.grantId, localUses + 1);
  state.consumedActions.add(key);
  return totalUses + 1;
}

export function authorizeScopedWrite(scenario, request, state) {
  assertGatewayState(state);
  if (scenario?.lifecycle !== 'active') throw new Error('writes require an active contract');
  if (scenario?.mode === 'plan-only' || scenario?.seal?.state === 'denied') throw new Error('workflow mode or seal state forbids writes');
  const contract = scenario?.contract ?? {};
  if (contract.digest !== computeContractDigest(contract) || contract.inputDigest !== computeInputDigest(contract.inputManifest)) throw new Error('contract or input binding is stale');
  const grant = scenario?.mutationGrant ?? {};
  if (!nonEmptyString(grant.grantId) || !nonEmptyString(grant.action) || !nonEmptyString(grant.target)
      || !nonEmptyString(grant.actorId) || !nonEmptyString(grant.grantorIdentity) || !grant.grantorIdentity.startsWith('owner:')
      || !DIGEST_RE.test(grant.identityEvidenceDigest ?? '') || grant.taskId !== contract.taskId
      || grant.contractVersion !== contract.version || grant.contractDigest !== contract.digest
      || grant.inputDigest !== contract.inputDigest || !normalizedNonEmptyPaths(grant.scope)
      || !Number.isInteger(grant.useLimit) || grant.useLimit < 1 || !Number.isInteger(grant.usesRecorded)
      || grant.usesRecorded < 0 || grant.usesRecorded >= grant.useLimit) {
    throw new Error('mutation grant structure or binding is invalid');
  }
  if (!currentAt(request?.trustedNow, grant.issuedAt, grant.expiresAt) || grant.revokedAt !== null) throw new Error('mutation grant is not current');
  const exact = { grantId: grant.grantId, actorId: grant.actorId, action: grant.action, target: grant.target, contractDigest: contract.digest, inputDigest: contract.inputDigest };
  for (const [field, expected] of Object.entries(exact)) {
    if (request?.[field] !== expected) throw new Error(`write ${field} is stale or mismatched`);
  }
  const role = scenario.roles?.find((entry) => entry.actorId === request.actorId);
  if (!role || role.access !== 'workspace-write' || !['Maker', 'Wayfinder'].includes(role.role)) throw new Error('actor has no mutable role');
  if (role.contractDigest !== contract.digest || role.inputDigest !== contract.inputDigest) throw new Error('role binding is stale');
  if (!REQUIRED_RESOURCE_CLASSES.every((resource) => role.enforcementManifest?.[resource] === 'enforced')) throw new Error('mutable controls are not enforced');
  if (!WRITE_CANARIES.every((name) => role.capabilityProbe?.[name] === true)) throw new Error('mutable capability probe failed');
  const targetPath = normalizeRelative(request.path);
  if (!targetPath || !scopeAllows(targetPath, role.assignedPaths) || !scopeAllows(targetPath, grant.scope)) throw new Error('write is outside assigned or granted scope');
  if (scopeAllows(targetPath, contract.protectedPaths)) throw new Error('write reaches protected scope');
  if (!currentAt(request.trustedNow, role.laneLease?.issuedAt, role.laneLease?.expiresAt)) throw new Error('role lane lease is not current');
  const heartbeatMs = parseTime(role.laneLease?.heartbeatAt);
  const trustedMs = parseTime(request.trustedNow);
  if (heartbeatMs === null || trustedMs === null || heartbeatMs > trustedMs || trustedMs - heartbeatMs > role.laneLease.maxHeartbeatAgeSeconds * 1000) throw new Error('role heartbeat is stale or future-dated');
  const laneLimit = contract.budgets?.perLane?.[role.actorId] ?? {};
  const laneUsage = scenario.usage?.perLane?.[role.actorId] ?? {};
  for (const [usedField, maximum] of LANE_BUDGET_PAIRS) {
    if (!Number.isFinite(laneUsage[usedField]) || laneUsage[usedField] < 0 || !Number.isFinite(laneLimit[maximum]) || laneUsage[usedField] > laneLimit[maximum]) throw new Error('role lane budget is invalid or exhausted');
  }
  if ((scenario.signals ?? []).some((signal) => BLOCKING_SIGNALS.has(signal.type) && ['open', 'escalated'].includes(signal.status))) throw new Error('write is blocked by an open signal');
  if (role.role === 'Wayfinder') {
    const lease = scenario.integrationLease;
    if (!currentAt(request.trustedNow, lease?.issuedAt, lease?.expiresAt) || request.epoch !== lease?.epoch || request.fencingToken !== lease?.fencingToken) throw new Error('stale integration fence');
  }
  const use = consumeGrant(state, grant, `${grant.grantId}:${request.action}:${request.target}:${targetPath}`);
  return { authorized: true, actorId: role.actorId, path: targetPath, grantId: grant.grantId, use, contractDigest: contract.digest };
}

export function createFencedLeaseGateway(initialLease) {
  let current = clone(initialLease);
  const authorize = ({ holderId, epoch, fencingToken, trustedNow }) => {
    if (!current.active || holderId !== current.holderId || epoch !== current.epoch || fencingToken !== current.fencingToken) throw new Error('stale or conflicting integration lease');
    if (!currentAt(trustedNow, current.issuedAt, current.expiresAt)) throw new Error('integration lease expired');
    return { holderId, epoch };
  };
  const handoff = ({ fromHolderId, fromEpoch, fromToken, nextHolderId, nextToken, issuedAt, expiresAt, ownerApproved }) => {
    authorize({ holderId: fromHolderId, epoch: fromEpoch, fencingToken: fromToken, trustedNow: issuedAt });
    if (ownerApproved !== true || !nonEmptyString(nextHolderId) || !nonEmptyString(nextToken) || nextToken.length < 16) throw new Error('handoff lacks Owner approval or successor identity');
    current.revokedEpochs = [...new Set([...(current.revokedEpochs ?? []), current.epoch])].sort((a, b) => a - b);
    current = { ...current, holderId: nextHolderId, epoch: current.epoch + 1, fencingToken: nextToken, issuedAt, expiresAt, active: true };
    return clone(current);
  };
  return { authorize, handoff, snapshot: () => clone(current) };
}

export function createProtectedActionGatewaySimulator(scenario, state) {
  assertGatewayState(state);
  return {
    consume(request) {
      const result = validateScenario(scenario);
      if (!result.sealEligible) throw new Error(`seal is not eligible: ${result.errors[0]?.code ?? 'unknown'}`);
      const grant = scenario.authorityGrant;
      const seal = scenario.seal;
      if (!currentAt(request?.trustedNow, grant.issuedAt, grant.expiresAt) || !currentAt(request?.trustedNow, seal.issuedAt, seal.expiresAt)) throw new Error('authority grant or seal is not current');
      const bindings = [
        ['action', grant.action], ['target', grant.target], ['contractDigest', seal.contractDigest],
        ['inputDigest', seal.inputDigest], ['artifactDigest', seal.artifactDigest], ['treeDigest', seal.treeDigest],
        ['authorityGrantId', grant.grantId], ['epoch', seal.integrationEpoch], ['fencingToken', seal.fencingToken]
      ];
      for (const [field, expected] of bindings) {
        if (request[field] !== expected) throw new Error(`protected action ${field} is stale or mismatched`);
      }
      const use = consumeGrant(state, grant, `${grant.grantId}:${grant.action}:${grant.target}:${seal.artifactDigest}:${seal.treeDigest}`);
      return { consumed: true, grantId: grant.grantId, use, action: grant.action, target: grant.target };
    }
  };
}

function usage() {
  console.error('Usage: node run-proofline-sandbox.mjs <scenario.json>');
}

function main(argv) {
  if (argv.length !== 1) {
    usage();
    process.exitCode = 2;
    return;
  }
  try {
    const scenario = parseScenario(fs.readFileSync(argv[0], 'utf8'));
    const result = validateScenario(scenario);
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

const currentFile = fileURLToPath(import.meta.url);
function isDirectRun(argvPath) {
  if (!argvPath) return false;
  try {
    return fs.realpathSync(argvPath) === fs.realpathSync(currentFile);
  } catch {
    return path.resolve(argvPath) === path.resolve(currentFile);
  }
}
if (isDirectRun(process.argv[1])) main(process.argv.slice(2));
