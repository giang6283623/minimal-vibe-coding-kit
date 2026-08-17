#!/usr/bin/env node

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import {
  fail,
  isPublicIp,
  loadValidatedBrief,
  printFailure,
  resolveProjectRoot,
  sha256Bytes,
  WorkflowError,
} from './asset-workflow-lib.mjs';

export { fail, printFailure, resolveProjectRoot, sha256Bytes, WorkflowError };

export const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
export const DEFAULT_PAGE_LOAD_MS = 45000;
export const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
export const SAFE_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
export const CAPTURE_PLATFORMS = new Set(['generic', 'shopify', 'woocommerce', 'wordpress']);

export function parseCli(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      values[key] = true;
      continue;
    }
    values[key] = next;
    index += 1;
  }
  return values;
}

export function requireCli(args, keys) {
  for (const key of keys) {
    if (args[key] === undefined || args[key] === true || String(args[key]).trim() === '') {
      fail(`--${key} is required`);
    }
  }
}

export function hostnameFromUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail('target URL is malformed');
  }
  if (parsed.protocol !== 'https:') fail('target URL must use HTTPS');
  if (parsed.username || parsed.password) fail('target URL must not contain credentials');
  if (parsed.port && parsed.port !== '443') fail('target URL must use the default HTTPS port');
  return parsed.hostname.toLowerCase();
}

export function loadCaptureBrief(root) {
  const loaded = loadValidatedBrief(root);
  const { brief } = loaded;
  if (!brief.capture?.enabled) fail('normalized brief does not enable capture');
  if (!['owned', 'written-permission'].includes(brief.authorization.status)) {
    fail('capture requires owned or written-permission authorization');
  }
  if (brief.capture.interactive_capture_approved !== true) {
    fail('capture.interactive_capture_approved must be true before running capture scripts');
  }
  const targetHost = hostnameFromUrl(brief.target.url);
  const approvedHosts = [...new Set(brief.capture.approved_hosts.map((host) => String(host).toLowerCase()))].sort();
  if (!approvedHosts.includes(targetHost)) {
    fail('capture.approved_hosts must include the target URL hostname');
  }
  return { ...loaded, approvedHosts, targetHost };
}

export function safeHttpsUrl(raw, approvedHosts, label) {
  if (typeof raw !== 'string' || raw.trim() === '') fail(`${label} must be a non-empty URL`);
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    fail(`${label} is malformed`);
  }
  if (parsed.protocol !== 'https:') fail(`${label} must use HTTPS`);
  if (parsed.username || parsed.password) fail(`${label} must not contain URL credentials`);
  if (parsed.port && parsed.port !== '443') fail(`${label} must use the default HTTPS port`);
  const host = parsed.hostname.toLowerCase();
  if (!approvedHosts.includes(host)) fail(`${label} host is not in capture.approved_hosts`);
  parsed.hash = '';
  return parsed;
}

async function resolvePublicAddress(hostname) {
  const answers = await dns.lookup(hostname, { all: true, verbatim: true });
  if (answers.length === 0) fail(`no DNS address found for ${hostname}`);
  if (answers.some((answer) => !isPublicIp(answer.address))) {
    fail(`DNS for ${hostname} includes a local, private, reserved, or unsupported address`);
  }
  return answers[0];
}

export async function fetchBounded(url, options) {
  const parsed = safeHttpsUrl(url, options.approvedHosts, options.label || 'request URL');
  const address = await resolvePublicAddress(parsed.hostname);
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  const maxElapsedMs = options.maxElapsedMs ?? 20000;
  const maxRedirects = options.maxRedirects ?? 3;
  const startedAt = Date.now();
  let current = parsed;
  let redirects = 0;

  while (true) {
    const response = await new Promise((resolve, reject) => {
      const request = https.request({
        headers: {
          Accept: options.accept || '*/*',
          'User-Agent': 'minimal-vibe-clone-capture-tool/1',
        },
        hostname: current.hostname,
        lookup: (_hostname, lookupOptions, callback) => {
          if (lookupOptions?.all) callback(null, [{ address: address.address, family: address.family }]);
          else callback(null, address.address, address.family);
        },
        method: 'GET',
        path: `${current.pathname}${current.search}`,
        port: 443,
        protocol: 'https:',
        rejectUnauthorized: true,
        servername: current.hostname,
      }, (incoming) => {
        if (incoming.statusCode >= 300 && incoming.statusCode < 400 && incoming.headers.location) {
          incoming.resume();
          resolve({ redirect: incoming.headers.location, status: incoming.statusCode });
          return;
        }
        const chunks = [];
        let received = 0;
        incoming.on('data', (chunk) => {
          received += chunk.length;
          if (received > maxBytes) {
            incoming.destroy(new Error(`response exceeds ${maxBytes} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        incoming.on('end', () => {
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(incoming.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase(),
            finalUrl: current.toString(),
            status: incoming.statusCode ?? 0,
          });
        });
        incoming.on('error', reject);
      });
      const deadline = setTimeout(() => request.destroy(new Error(`request exceeded ${maxElapsedMs} ms`)), maxElapsedMs);
      request.setTimeout(maxElapsedMs, () => request.destroy(new Error(`request stalled for ${maxElapsedMs} ms`)));
      request.on('close', () => clearTimeout(deadline));
      request.on('error', reject);
      request.end();
    });

    if (response.redirect) {
      redirects += 1;
      if (redirects > maxRedirects) fail('too many redirects');
      current = safeHttpsUrl(new URL(response.redirect, current).toString(), options.approvedHosts, 'redirect URL');
      continue;
    }

    if (Date.now() - startedAt >= maxElapsedMs) fail('request exceeded max elapsed time');
    return response;
  }
}

export function atomicWrite(file, body) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return sha256Bytes(bytes);
}

export function sanitizeUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  return parsed.toString();
}

export function slugFromPathname(pathname) {
  const slug = pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return slug || 'home';
}

export function decodeXmlText(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim().slice(0, 200) : '';
}

export function nodeWebSocketRequirement() {
  if (typeof WebSocket === 'function') return { flag: '', available: true };
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major >= 22) return { flag: '', available: true };
  return { flag: '--experimental-websocket', available: false };
}

const CHROME_CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
  ],
  win32: [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ],
};

function executableOnPath(command, searchPath) {
  if (typeof searchPath !== 'string' || searchPath.length === 0) return false;
  for (const directory of searchPath.split(path.delimiter)) {
    if (!directory) continue;
    const executable = path.resolve(directory, command);
    try {
      fs.accessSync(executable, fs.constants.X_OK);
      if (fs.statSync(executable).isFile()) return true;
    } catch {
      // Continue through PATH when an entry is missing or not executable.
    }
  }
  return false;
}

export function detectChromeCommand(platform = process.platform, searchPath = process.env.PATH || '') {
  const candidates = CHROME_CANDIDATES[platform] || [];
  for (const candidate of candidates) {
    if (platform === 'linux') {
      if (executableOnPath(candidate, searchPath)) return { command: candidate, platform, source: 'path' };
    } else if (fs.existsSync(candidate)) {
      return { command: candidate, platform, source: 'file' };
    }
  }
  return { command: null, platform, source: 'missing' };
}

export function chromeLaunchCommand(chrome, port = 9222) {
  const userData = process.platform === 'win32'
    ? '%TEMP%\\chrome-clone-debug'
    : '"$(mktemp -d)"';
  if (process.platform === 'win32') {
    return `"${chrome.command}" --remote-debugging-port=${port} --user-data-dir=${userData} --no-first-run --no-default-browser-check about:blank`;
  }
  return `"${chrome.command}" --remote-debugging-port=${port} --user-data-dir=${userData} --no-first-run --no-default-browser-check about:blank`;
}

export function screenshotNodeCommand(scriptRelative, projectRoot, extraArgs = []) {
  const ws = nodeWebSocketRequirement();
  const prefix = ws.flag ? `node ${ws.flag}` : 'node';
  const args = [
    scriptRelative,
    '--project-root',
    projectRoot,
    ...extraArgs,
  ].join(' ');
  return `${prefix} ${args}`;
}

export function mergeCaptureReceipt(existing, incoming) {
  const byKey = new Map();
  for (const entry of existing?.captures || []) {
    byKey.set(`${entry.id}::${entry.viewport}`, entry);
  }
  for (const entry of incoming?.captures || []) {
    byKey.set(`${entry.id}::${entry.viewport}`, entry);
  }
  return {
    captures: [...byKey.values()].sort((left, right) => {
      const routeCompare = left.id.localeCompare(right.id);
      return routeCompare !== 0 ? routeCompare : left.viewport.localeCompare(right.viewport);
    }),
    host: incoming?.host || existing?.host || '',
    taken_at: new Date().toISOString(),
    version: 1,
  };
}

export function completenessReport(routes, viewports, screenshotsDir) {
  const expected = [];
  for (const route of routes) {
    for (const viewport of viewports) {
      expected.push(`${route.id}--${viewport.name}.png`);
    }
  }
  const present = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter((file) => file.endsWith('.png'))
    : [];
  const presentSet = new Set(present);
  const missing = expected.filter((file) => !presentSet.has(file));
  return {
    expected_count: expected.length,
    missing,
    missing_count: missing.length,
    present_count: expected.length - missing.length,
    route_count: routes.length,
    viewport_count: viewports.length,
  };
}

export function createHash() {
  return crypto.createHash('sha256');
}
