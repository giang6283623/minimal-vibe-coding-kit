#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export const MAX_JSON_BYTES = 10 * 1024 * 1024;
export const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
export const HOST_NATIVE_WRITE_ARGV = Object.freeze(['host-native', 'write-project']);
const SECRET_QUERY_PARTS = [
  'auth',
  'bearer',
  'code',
  'cookie',
  'credential',
  'key',
  'password',
  'secret',
  'session',
  'sig',
  'signature',
  'token',
];

export class WorkflowError extends Error {}

export function fail(message) {
  throw new WorkflowError(message);
}

export function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function canonicalJsonAscii(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJsonAscii).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${canonicalJsonAscii(key)}:${canonicalJsonAscii(value[key])}`
    )).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) fail('source input inventory contains an unsupported value');
  return encoded.replace(/[^\x00-\x7f]/g, (character) => (
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  ));
}

function contained(root, candidate) {
  const relation = path.relative(root, candidate);
  return relation !== '' && !path.isAbsolute(relation) && relation !== '..' && !relation.startsWith(`..${path.sep}`);
}

export function resolveProjectRoot(rawRoot) {
  if (typeof rawRoot !== 'string' || rawRoot.trim() === '') fail('--project-root is required');
  const input = path.resolve(rawRoot);
  const stat = fs.lstatSync(input);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail('project root must be a real directory, not a symlink');
  }
  const real = fs.realpathSync(input);
  const broad = new Set([
    '/',
    '/Users',
    '/home',
    '/private',
    '/tmp',
    '/usr',
    '/var',
    path.resolve(os.homedir()),
  ]);
  if (broad.has(real)) fail(`project root is too broad: ${real}`);
  return real;
}

export function safeRelativePath(raw, label) {
  if (typeof raw !== 'string' || raw.trim() === '') fail(`${label} must be a non-empty relative path`);
  if (raw.includes('\\') || /[\x00-\x1f\x7f]/u.test(raw)) fail(`${label} contains unsafe characters`);
  const pure = raw.trim();
  if (path.posix.isAbsolute(pure)) fail(`${label} must be relative`);
  const parts = pure.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..' || part.startsWith('-'))) {
    fail(`${label} contains an unsafe path segment`);
  }
  if (path.posix.normalize(pure) !== pure) fail(`${label} is not normalized`);
  return pure;
}

function walkExistingPath(root, relative, label) {
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) break;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) fail(`${label} must not use symlinks`);
  }
}

export function resolveExistingFile(root, relative, label, requiredPrefix = '') {
  const safe = safeRelativePath(relative, label);
  if (requiredPrefix && !safe.startsWith(requiredPrefix)) fail(`${label} must stay under ${requiredPrefix}`);
  const candidate = path.resolve(root, safe);
  if (!contained(root, candidate)) fail(`${label} escapes the project root`);
  walkExistingPath(root, safe, label);
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a real file`);
  const real = fs.realpathSync(candidate);
  if (!contained(root, real)) fail(`${label} escapes the project root`);
  return real;
}

function ensureSafeDirectory(root, relative, label) {
  const safe = safeRelativePath(relative, label);
  let current = root;
  for (const part of safe.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`${label} contains a non-directory or symlink`);
    } else {
      fs.mkdirSync(current, { mode: 0o700 });
    }
  }
  const real = fs.realpathSync(current);
  if (!contained(root, real)) fail(`${label} escapes the project root`);
  return real;
}

export function resolveOutputFile(root, relative, label, requiredPrefix = '') {
  const safe = safeRelativePath(relative, label);
  if (requiredPrefix && !safe.startsWith(requiredPrefix)) fail(`${label} must stay under ${requiredPrefix}`);
  const parent = path.posix.dirname(safe);
  ensureSafeDirectory(root, parent, `${label} parent`);
  const candidate = path.resolve(root, safe);
  if (!contained(root, candidate)) fail(`${label} escapes the project root`);
  if (fs.existsSync(candidate)) {
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a real file when it exists`);
  }
  return candidate;
}

export function readJsonFile(file, label, maximum = MAX_JSON_BYTES) {
  const stat = fs.statSync(file);
  if (stat.size > maximum) fail(`${label} exceeds ${maximum} bytes`);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
  return value;
}

export function writeGeneratedJson(root, relative, value) {
  const file = resolveOutputFile(root, relative, relative, '.replica/');
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return { file, sha256: sha256Bytes(Buffer.from(content)) };
}

export function loadValidatedBrief(root) {
  const projectRoot = resolveProjectRoot(root);
  const briefPath = resolveExistingFile(
    projectRoot,
    '.replica/brief.json',
    'raw brief',
    '.replica/'
  );
  const normalizedPath = resolveExistingFile(
    projectRoot,
    '.replica/brief.normalized.json',
    'normalized brief',
    '.replica/'
  );
  const receiptPath = resolveExistingFile(
    projectRoot,
    '.replica/validation-receipt.json',
    'validation receipt',
    '.replica/'
  );
  const normalizedBytes = fs.readFileSync(normalizedPath);
  const brief = readJsonFile(normalizedPath, 'normalized brief');
  const receipt = readJsonFile(receiptPath, 'validation receipt');
  const digest = sha256Bytes(normalizedBytes);
  if (receipt?.status !== 'valid' || receipt?.version !== 1) fail('validation receipt is not valid version 1');
  if (receipt.brief_sha256 !== sha256File(briefPath)) fail('validation receipt digest does not match raw brief');
  if (receipt.normalized_sha256 !== digest) fail('validation receipt digest does not match normalized brief');
  if (![1, 2].includes(brief?.version) || brief?.target?.data_mode !== 'local-artifacts-only') {
    fail('normalized brief does not use the supported local-artifacts-only v1 or v2 contract');
  }
  if (!Array.isArray(brief.source_inputs)) fail('normalized brief source_inputs must be an array');
  const sourceInputsDigest = sha256Bytes(Buffer.from(canonicalJsonAscii(brief.source_inputs), 'utf8'));
  if (receipt.source_inputs_sha256 !== sourceInputsDigest) {
    fail('validation receipt digest does not match the normalized source input inventory');
  }
  let sourceInputsVerified = 0;
  if (brief.version === 2) {
    for (const [index, entry] of brief.source_inputs.entries()) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        fail(`source_inputs[${index}] must be a bound source object`);
      }
      const relative = safeRelativePath(entry.path, `source_inputs[${index}].path`);
      const file = resolveExistingFile(
        projectRoot,
        `.replica/evidence/${relative}`,
        `source_inputs[${index}]`,
        '.replica/evidence/'
      );
      const stat = fs.statSync(file);
      if (!Number.isInteger(entry.bytes) || entry.bytes !== stat.size) {
        fail(`source_inputs[${index}] byte size drifted after brief validation`);
      }
      if (typeof entry.sha256 !== 'string' || entry.sha256 !== sha256File(file)) {
        fail(`source_inputs[${index}] digest drifted after brief validation`);
      }
      sourceInputsVerified += 1;
    }
  }
  return { brief, normalizedDigest: digest, receipt, sourceInputsDigest, sourceInputsVerified };
}

const DIGEST_RE = /^[a-f0-9]{64}$/u;
const LAUNCH_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/u;
export const AUTONOMOUS_PHASES = [
  'inspect',
  'validate',
  'acquire',
  'normalize',
  'architect',
  'implement',
  'verify',
  'harden',
  'handoff',
];
export const AUTONOMOUS_TERMINAL_STATES = new Set([
  'complete',
  'complete-with-exceptions',
  'needs-owner-input',
  'failed',
]);

function exactObjectKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} fields must be exactly: ${wanted.join(', ')}`);
  }
}

function boundedText(value, label, maximum = 500) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty string`);
  const normalized = value.trim();
  if (normalized.length > maximum || /[\x00-\x1f\x7f]/u.test(normalized)) {
    fail(`${label} contains invalid or oversized text`);
  }
  return normalized;
}

function digestText(value, label) {
  const digest = boundedText(value, label, 64);
  if (!DIGEST_RE.test(digest)) fail(`${label} must be a lowercase SHA-256 digest`);
  return digest;
}

function exactStringList(value, label, maximum = 50) {
  if (!Array.isArray(value) || value.length > maximum) fail(`${label} must be an array with at most ${maximum} entries`);
  const normalized = value.map((item, index) => boundedText(item, `${label}[${index}]`, 253));
  if (new Set(normalized).size !== normalized.length) fail(`${label} must not contain duplicates`);
  return normalized;
}

function timestampMs(value, label) {
  const normalized = boundedText(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(normalized)) {
    fail(`${label} must be an ISO-8601 UTC timestamp`);
  }
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) fail(`${label} is not a valid timestamp`);
  return parsed;
}

function validateLaunchArgvPolicy(actionName, argv, label) {
  const executable = path.basename(argv[0]).toLowerCase().replace(/\.exe$/u, '');
  const forbiddenExecutables = new Set([
    'aria2c',
    'az',
    'bash',
    'busybox',
    'bunx',
    'chown',
    'chmod',
    'command',
    'cp',
    'csh',
    'curl',
    'dash',
    'dd',
    'doas',
    'env',
    'firebase',
    'find',
    'fish',
    'flyctl',
    'ftp',
    'gcloud',
    'helm',
    'http',
    'httpie',
    'ksh',
    'kubectl',
    'ln',
    'mkfs',
    'mount',
    'mv',
    'nc',
    'ncat',
    'netlify',
    'nice',
    'nohup',
    'npx',
    'pnpx',
    'powershell',
    'pwsh',
    'railway',
    'rm',
    'rmdir',
    'scp',
    'sftp',
    'sh',
    'shopify',
    'shred',
    'socat',
    'ssh',
    'sudo',
    'tcsh',
    'telnet',
    'terraform',
    'time',
    'timeout',
    'trash',
    'truncate',
    'umount',
    'unlink',
    'vercel',
    'watch',
    'wget',
    'wrangler',
    'xargs',
    'zsh',
  ]);
  if (forbiddenExecutables.has(executable)) {
    fail(`${label}.argv uses a forbidden destructive, network, shell, or deployment executable`);
  }
  const forbiddenVerbs = new Set([
    'add',
    'checkout',
    'ci',
    'clean',
    'delete',
    'deploy',
    'destroy',
    'exec',
    'install',
    'migrate',
    'publish',
    'pull',
    'push',
    'release',
    'remove',
    'reset',
    'uninstall',
    'update',
    'upgrade',
  ]);
  if (argv.slice(1).some((item) => forbiddenVerbs.has(item.toLowerCase()))) {
    fail(`${label}.argv requests an install, destructive, migration, network, or deployment verb`);
  }
  if (executable === 'node' && argv.some((item) => ['-e', '--eval', '-p', '--print'].includes(item))) {
    fail(`${label}.argv must not execute inline Node code`);
  }
  if (executable === 'yarn' && argv[1]?.toLowerCase() === 'dlx') {
    fail(`${label}.argv must not use an unbounded package runner`);
  }
  if (executable.startsWith('python') && argv.includes('-c')) {
    fail(`${label}.argv must not execute inline Python code`);
  }
  if (executable === 'git') {
    const allowedGit = new Set(['branch', 'diff', 'log', 'ls-files', 'rev-parse', 'show', 'status']);
    if (!allowedGit.has(argv[1])) fail(`${label}.argv uses a non-read-only git operation`);
  }
  if (actionName === 'write-project' && JSON.stringify(argv) !== JSON.stringify(HOST_NATIVE_WRITE_ARGV)) {
    fail(`${label}.argv for write-project must use the host-native write sentinel`);
  }
  const requiredScripts = {
    'capture-approved-hosts': new Set(['capture-screenshots.mjs', 'fetch-public-catalog.mjs']),
    'download-approved-assets': new Set(['download-authorized-assets.mjs']),
    'normalize-local-data': new Set(['normalize-local-export.mjs']),
  };
  const allowedScripts = requiredScripts[actionName];
  if (allowedScripts && (executable !== 'node' || !allowedScripts.has(argv[1] ?? ''))) {
    fail(`${label}.argv does not match the protected ${actionName} entrypoint`);
  }
}

export function loadValidatedLaunch(root, { nowMs = Date.now() } = {}) {
  if (!Number.isFinite(nowMs)) fail('trusted current time must be finite');
  const projectRoot = resolveProjectRoot(root);
  const loaded = loadValidatedBrief(projectRoot);
  const { brief, normalizedDigest, receipt } = loaded;
  if (brief.version !== 2 || brief.execution?.mode !== 'autonomous-a-to-z') {
    fail('launch validation requires a v2 autonomous-a-to-z brief');
  }
  const launchPath = resolveExistingFile(projectRoot, '.replica/launch.json', 'launch record', '.replica/');
  const launchBytes = fs.readFileSync(launchPath);
  const launch = readJsonFile(launchPath, 'launch record');
  exactObjectKeys(launch, [
    'actions',
    'approved_hosts',
    'cost_ceiling_minor',
    'expires_at',
    'issued_at',
    'mode',
    'normalized_brief_sha256',
    'owner_approval',
    'prohibited',
    'source_inputs_sha256',
    'version',
  ], 'launch record');
  if (launch.version !== 1) fail('launch record version must be integer 1');
  if (launch.mode !== 'autonomous-a-to-z') fail('launch record mode must be autonomous-a-to-z');
  if (launch.cost_ceiling_minor !== 0) fail('autonomous launch cost_ceiling_minor must be zero');
  if (digestText(launch.normalized_brief_sha256, 'launch normalized_brief_sha256') !== normalizedDigest) {
    fail('launch record does not match the validated normalized brief');
  }
  if (digestText(launch.source_inputs_sha256, 'launch source_inputs_sha256') !== receipt.source_inputs_sha256) {
    fail('launch record does not match the validated source input inventory');
  }
  const issuedAt = timestampMs(launch.issued_at, 'launch issued_at');
  const expiresAt = timestampMs(launch.expires_at, 'launch expires_at');
  if (issuedAt > nowMs) fail('launch record is not active yet');
  if (expiresAt <= issuedAt || expiresAt <= nowMs) fail('launch record is expired');
  if (expiresAt - issuedAt > 24 * 60 * 60 * 1000) fail('launch record lifetime must not exceed 24 hours');

  exactObjectKeys(launch.owner_approval, ['channel', 'evidence_sha256', 'status'], 'launch owner_approval');
  if (launch.owner_approval.status !== 'approved') fail('launch owner approval status must be approved');
  if (launch.owner_approval.channel !== 'parent-session') fail('launch owner approval channel must be parent-session');
  digestText(launch.owner_approval.evidence_sha256, 'launch owner approval evidence_sha256');

  const executionHosts = brief.execution.network.approved_hosts;
  const approvedHosts = exactStringList(launch.approved_hosts, 'launch approved_hosts', 20)
    .map((host) => host.toLowerCase())
    .sort();
  if (new Set(approvedHosts).size !== approvedHosts.length) fail('launch approved_hosts must not contain duplicates');
  if (approvedHosts.some((host) => !executionHosts.includes(host))) {
    fail('launch record contains a host outside the validated execution allowlist');
  }
  const prohibited = exactStringList(launch.prohibited, 'launch prohibited', 20);
  const requiredProhibitions = ['credentials', 'destructive cleanup', 'paid actions', 'real payments'];
  if (requiredProhibitions.some((item) => !prohibited.includes(item))) {
    fail(`launch prohibited must include: ${requiredProhibitions.join(', ')}`);
  }

  if (!Array.isArray(launch.actions) || launch.actions.length < 1 || launch.actions.length > 50) {
    fail('launch actions must contain 1 to 50 entries');
  }
  const actionIds = new Set();
  const actions = launch.actions.map((action, index) => {
    const label = `launch actions[${index}]`;
    exactObjectKeys(action, ['action', 'argv', 'id', 'target_path', 'use_limit'], label);
    const id = boundedText(action.id, `${label}.id`, 64);
    if (!LAUNCH_ID_RE.test(id) || actionIds.has(id)) fail(`${label}.id must be a unique lowercase identifier`);
    actionIds.add(id);
    const actionName = boundedText(action.action, `${label}.action`, 64);
    if (!brief.execution.allowed_actions.includes(actionName)) {
      fail(`${label}.action is outside the validated execution allowlist`);
    }
    const targetPath = boundedText(action.target_path, `${label}.target_path`, 512);
    if (targetPath !== '.') safeRelativePath(targetPath, `${label}.target_path`);
    if (!Array.isArray(action.argv) || action.argv.length < 1 || action.argv.length > 64) {
      fail(`${label}.argv must contain 1 to 64 exact arguments`);
    }
    const argv = action.argv.map((item, argvIndex) => boundedText(item, `${label}.argv[${argvIndex}]`, 1024));
    validateLaunchArgvPolicy(actionName, argv, label);
    if (!Number.isInteger(action.use_limit) || action.use_limit < 1 || action.use_limit > 20) {
      fail(`${label}.use_limit must be an integer from 1 to 20`);
    }
    return { action: actionName, argv, id, target_path: targetPath, use_limit: action.use_limit };
  });
  return {
    ...loaded,
    actions,
    approvedHosts,
    launch,
    launchDigest: sha256Bytes(launchBytes),
    projectRoot,
  };
}

export function canonicalNodeInvocation(scriptPath, argv) {
  return ['node', path.basename(scriptPath), ...argv];
}

export function consumeLaunchAction(root, {
  actionId = null,
  actionName = null,
  argv,
  targetPath = null,
  nowMs = Date.now(),
} = {}) {
  if (!Array.isArray(argv) || argv.length === 0) fail('protected action requires exact argv');
  const loaded = loadValidatedLaunch(root, { nowMs });
  const matches = loaded.actions.filter((action) => (
    (actionId === null || action.id === actionId)
    && (actionName === null || action.action === actionName)
    && (targetPath === null || action.target_path === targetPath)
    && JSON.stringify(action.argv) === JSON.stringify(argv)
  ));
  if (matches.length !== 1) fail('actual action id, type, target path, and argv must match one launch grant');
  const action = matches[0];
  const usesRelative = `.replica/action-uses/${loaded.launchDigest}.json`;
  const lockRelative = `.replica/action-uses/.${loaded.launchDigest}.lock`;
  const lockPath = resolveOutputFile(loaded.projectRoot, lockRelative, 'action use lock', '.replica/');
  let lockDescriptor;
  try {
    lockDescriptor = fs.openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') fail('action use ledger is locked by another process');
    throw error;
  }
  try {
    const usesPath = path.join(loaded.projectRoot, usesRelative);
    let receipt;
    if (fs.existsSync(usesPath)) {
      const existing = resolveExistingFile(
        loaded.projectRoot,
        usesRelative,
        'action use receipt',
        '.replica/'
      );
      receipt = readJsonFile(existing, 'action use receipt');
      exactObjectKeys(receipt, ['launch_sha256', 'uses', 'version'], 'action use receipt');
      if (receipt.version !== 1 || receipt.launch_sha256 !== loaded.launchDigest) {
        fail('action use receipt does not match the current launch');
      }
      exactObjectKeys(receipt.uses, loaded.actions.map((item) => item.id), 'action use receipt uses');
    } else {
      receipt = {
        version: 1,
        launch_sha256: loaded.launchDigest,
        uses: Object.fromEntries(loaded.actions.map((item) => [item.id, 0])),
      };
    }
    for (const grant of loaded.actions) {
      if (!Number.isInteger(receipt.uses[grant.id]) || receipt.uses[grant.id] < 0 || receipt.uses[grant.id] > grant.use_limit) {
        fail(`action use receipt has an invalid count for ${grant.id}`);
      }
    }
    if (receipt.uses[action.id] >= action.use_limit) fail(`launch action ${action.id} exhausted its use limit`);
    receipt.uses[action.id] += 1;
    writeGeneratedJson(loaded.projectRoot, usesRelative, receipt);
    return { ...loaded, action, uses: receipt.uses[action.id] };
  } finally {
    fs.closeSync(lockDescriptor);
    fs.unlinkSync(lockPath);
  }
}

export function validateAutonomousRunState(root, options = {}) {
  const loaded = loadValidatedLaunch(root, options);
  const statePath = resolveExistingFile(loaded.projectRoot, '.replica/run-state.json', 'run state', '.replica/');
  const state = readJsonFile(statePath, 'run state');
  exactObjectKeys(state, [
    'blockers',
    'completed_phases',
    'last_checkpoint_sha256',
    'launch_sha256',
    'normalized_brief_sha256',
    'phase',
    'retry_count',
    'terminal_state',
    'version',
  ], 'run state');
  if (state.version !== 1) fail('run state version must be integer 1');
  if (digestText(state.normalized_brief_sha256, 'run state normalized_brief_sha256') !== loaded.normalizedDigest) {
    fail('run state does not match the validated normalized brief');
  }
  if (digestText(state.launch_sha256, 'run state launch_sha256') !== loaded.launchDigest) {
    fail('run state does not match the current launch record');
  }
  digestText(state.last_checkpoint_sha256, 'run state last_checkpoint_sha256');
  if (!Number.isInteger(state.retry_count) || state.retry_count < 0 || state.retry_count > loaded.brief.execution.max_retries_per_stage) {
    fail('run state retry_count exceeds the validated stage retry budget');
  }
  const completed = exactStringList(state.completed_phases, 'run state completed_phases', AUTONOMOUS_PHASES.length);
  const expectedPrefix = AUTONOMOUS_PHASES.slice(0, completed.length);
  if (JSON.stringify(completed) !== JSON.stringify(expectedPrefix)) {
    fail('run state completed_phases must be an ordered phase prefix');
  }
  const phase = boundedText(state.phase, 'run state phase', 40);
  if (!AUTONOMOUS_PHASES.includes(phase)) fail('run state phase is unknown');
  const blockers = exactStringList(state.blockers, 'run state blockers', 20);
  const terminal = state.terminal_state;
  if (terminal === null) {
    if (completed.length >= AUTONOMOUS_PHASES.length || phase !== AUTONOMOUS_PHASES[completed.length]) {
      fail('non-terminal run state phase must be the next incomplete phase');
    }
  } else {
    if (!AUTONOMOUS_TERMINAL_STATES.has(terminal)) fail('run state terminal_state is unknown');
    if (terminal === 'complete' || terminal === 'complete-with-exceptions') {
      if (completed.length !== AUTONOMOUS_PHASES.length || phase !== 'handoff') {
        fail(`${terminal} requires every autonomous phase to be completed`);
      }
      if (terminal === 'complete' && blockers.length > 0) fail('complete run state must not contain blockers');
    } else {
      const expectedPhase = AUTONOMOUS_PHASES[Math.min(completed.length, AUTONOMOUS_PHASES.length - 1)];
      if (phase !== expectedPhase || blockers.length === 0) {
        fail(`${terminal} requires the current phase and at least one blocker`);
      }
    }
  }
  return { ...loaded, state };
}

export function safeRemoteImageUrl(raw, label) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') fail(`${label} must use HTTPS`);
  if (url.username || url.password) fail(`${label} must not contain URL credentials`);
  if (url.port && url.port !== '443') fail(`${label} must use the default HTTPS port`);
  const hostname = url.hostname.toLowerCase();
  if (
    net.isIP(hostname)
    || hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
  ) {
    fail(`${label} uses a local, private, or IP-literal host`);
  }
  for (const [key] of url.searchParams) {
    const normalized = key.toLowerCase();
    if (SECRET_QUERY_PARTS.some((part) => normalized.includes(part))) {
      fail(`${label} contains a secret-like query parameter`);
    }
  }
  url.hash = '';
  return url;
}

export function extensionForImageUrl(url) {
  const extension = path.posix.extname(url.pathname).toLowerCase();
  return IMAGE_EXTENSIONS.has(extension) ? extension : null;
}

export function imageKind(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a') return 'gif';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brands = bytes.subarray(8, Math.min(bytes.length, 40)).toString('ascii');
    if (brands.includes('avif') || brands.includes('avis')) return 'avif';
  }
  return null;
}

export function expectedKindFromPath(relative) {
  const extension = path.posix.extname(relative).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'jpeg';
  return extension.slice(1);
}

export function acceptHeaderForImageKind(kind) {
  const map = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return map[kind] ?? '*/*';
}

export function isPublicIp(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    if (
      a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19 || b === 51))
      || (a === 203 && b === 0)
    ) return false;
    return true;
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (
      normalized === '::' || normalized === '::1'
      || normalized.startsWith('fc') || normalized.startsWith('fd')
      || /^fe[89ab]/u.test(normalized)
      || normalized.startsWith('ff')
      || normalized.startsWith('2001:db8:')
      || normalized.startsWith('::ffff:')
    ) return false;
    return true;
  }
  return false;
}

export function printFailure(error) {
  const message = error instanceof WorkflowError ? error.message : `${error.name}: ${error.message}`;
  process.stderr.write(`FAIL ${message}\n`);
}
