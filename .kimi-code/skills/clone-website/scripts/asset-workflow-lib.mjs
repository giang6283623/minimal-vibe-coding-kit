#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

export const MAX_JSON_BYTES = 10 * 1024 * 1024;
export const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
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
  const normalizedPath = resolveExistingFile(
    root,
    '.replica/brief.normalized.json',
    'normalized brief',
    '.replica/'
  );
  const receiptPath = resolveExistingFile(
    root,
    '.replica/validation-receipt.json',
    'validation receipt',
    '.replica/'
  );
  const normalizedBytes = fs.readFileSync(normalizedPath);
  const brief = readJsonFile(normalizedPath, 'normalized brief');
  const receipt = readJsonFile(receiptPath, 'validation receipt');
  const digest = sha256Bytes(normalizedBytes);
  if (receipt?.status !== 'valid' || receipt?.version !== 1) fail('validation receipt is not valid version 1');
  if (receipt.normalized_sha256 !== digest) fail('validation receipt digest does not match normalized brief');
  if (brief?.version !== 1 || brief?.target?.data_mode !== 'local-artifacts-only') {
    fail('normalized brief does not use the supported local-artifacts-only v1 contract');
  }
  return { brief, normalizedDigest: digest, receipt };
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
