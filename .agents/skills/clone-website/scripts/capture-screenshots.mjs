#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  atomicWrite,
  completenessReport,
  DEFAULT_PAGE_LOAD_MS,
  fail,
  loadCaptureBrief,
  LOOPBACK_HOSTS,
  mergeCaptureReceipt,
  parseCli,
  printFailure,
  requireCli,
  resolveProjectRoot,
  SAFE_ID_RE,
  sha256Bytes,
  slugFromPathname,
} from './capture-workflow-lib.mjs';
import { readJsonFile } from './asset-workflow-lib.mjs';

function safeCdpEndpoint(raw) {
  let endpoint;
  try {
    endpoint = new URL(raw);
  } catch {
    fail('--cdp is malformed');
  }
  if (endpoint.protocol !== 'http:' || !LOOPBACK_HOSTS.has(endpoint.hostname)) {
    fail('--cdp must use HTTP on loopback (127.0.0.1, ::1, or localhost)');
  }
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    fail('--cdp must not contain credentials, query, or fragment');
  }
  endpoint.pathname = endpoint.pathname.replace(/\/$/, '');
  return endpoint;
}

function safeWebSocketUrl(raw) {
  const endpoint = new URL(raw);
  if (endpoint.protocol !== 'ws:' || !LOOPBACK_HOSTS.has(endpoint.hostname)) {
    fail('browser returned a non-loopback WebSocket endpoint');
  }
  if (endpoint.username || endpoint.password) fail('browser WebSocket endpoint contains credentials');
  return endpoint.toString();
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    socket.addEventListener('message', (event) => this.handleMessage(event.data));
    socket.addEventListener('close', () => this.rejectAll(new Error('CDP socket closed')));
    socket.addEventListener('error', () => this.rejectAll(new Error('CDP socket error')));
  }

  static async connect(url, timeoutMs) {
    if (typeof WebSocket !== 'function') {
      fail('WebSocket is unavailable; run with --experimental-websocket on Node versions before 22');
    }
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timed out')), timeoutMs);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP connection failed')); }, { once: true });
    });
    return new CdpClient(socket);
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message || 'CDP error'}`));
      else pending.resolve(message.result || {});
      return;
    }
    const handlerKey = `${message.sessionId || ''}:${message.method}`;
    for (const handler of this.handlers.get(handlerKey) || []) handler(message.params || {});
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  on(method, handler, sessionId = '') {
    const key = `${sessionId}:${method}`;
    const handlers = this.handlers.get(key) || [];
    handlers.push(handler);
    this.handlers.set(key, handlers);
  }

  call(method, params = {}, timeoutMs = 10000, sessionId = '') {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { method, reject, resolve, timer });
      const message = { id, method, params };
      if (sessionId) message.sessionId = sessionId;
      this.socket.send(JSON.stringify(message));
    });
  }

  waitFor(method, timeoutMs, sessionId = '') {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} event timed out`)), timeoutMs);
      const handler = (params) => {
        clearTimeout(timer);
        const key = `${sessionId}:${method}`;
        this.handlers.set(key, (this.handlers.get(key) || []).filter((candidate) => candidate !== handler));
        resolve(params);
      };
      this.on(method, handler, sessionId);
    });
  }

  close() {
    this.socket.close();
  }
}

async function readCdpJson(endpoint, suffix) {
  const url = new URL(suffix, endpoint);
  const response = await fetch(url, { method: 'GET', redirect: 'error' });
  if (!response.ok) fail(`browser DevTools endpoint returned HTTP ${response.status}`);
  const raw = await response.text();
  if (raw.length > 256 * 1024) fail('browser DevTools response is too large');
  try {
    return JSON.parse(raw);
  } catch {
    fail('browser DevTools endpoint returned invalid JSON');
  }
}

async function createIsolatedTarget(client) {
  const context = await client.call('Target.createBrowserContext', { disposeOnDetach: true });
  if (!context.browserContextId) fail('browser did not create an isolated browser context');
  try {
    const target = await client.call('Target.createTarget', {
      browserContextId: context.browserContextId,
      url: 'about:blank',
    });
    if (!target.targetId) fail('browser did not create an isolated page target');
    const attached = await client.call('Target.attachToTarget', { flatten: true, targetId: target.targetId });
    if (!attached.sessionId) fail('browser did not attach to the isolated page target');
    return { browserContextId: context.browserContextId, sessionId: attached.sessionId, targetId: target.targetId };
  } catch (error) {
    await client.call('Target.disposeBrowserContext', { browserContextId: context.browserContextId }).catch(() => {});
    throw error;
  }
}

async function captureRoute(browserWebSocketUrl, screenshotsRoot, approvedHost, entry, viewport, maxElapsedMs) {
  let client;
  let isolated;
  try {
    client = await CdpClient.connect(browserWebSocketUrl, 5000);
    isolated = await createIsolatedTarget(client);
    const { browserContextId, sessionId, targetId } = isolated;
    let documentHost = null;
    client.on('Network.responseReceived', (params) => {
      if (params.type === 'Document' && !documentHost) {
        try {
          documentHost = new URL(params.response.url).hostname;
        } catch {
          documentHost = null;
        }
      }
    }, sessionId);
    await client.call('Network.enable', {}, 10000, sessionId);
    await client.call('Network.setCacheDisabled', { cacheDisabled: true }, 10000, sessionId);
    await client.call('Page.enable', {}, 10000, sessionId);
    await client.call('Browser.setDownloadBehavior', { behavior: 'deny', browserContextId });
    await client.call('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1,
      height: viewport.height,
      mobile: viewport.width < 600,
      width: viewport.width,
    }, 10000, sessionId);
    const loadEvent = client.waitFor('Page.loadEventFired', maxElapsedMs, sessionId);
    const navigation = await client.call('Page.navigate', { url: entry.url }, maxElapsedMs, sessionId);
    if (navigation.errorText) fail(`navigation failed: ${navigation.errorText}`);
    await loadEvent;
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (documentHost && documentHost !== approvedHost) {
      fail(`document response host ${documentHost} does not match approved host ${approvedHost}`);
    }
    const screenshot = await client.call('Page.captureScreenshot', {
      captureBeyondViewport: true,
      format: 'png',
      fromSurface: true,
    }, maxElapsedMs, sessionId);
    if (!screenshot.data) fail('browser returned no screenshot data');
    const bytes = Buffer.from(screenshot.data, 'base64');
    if (!SAFE_ID_RE.test(entry.id) || !SAFE_ID_RE.test(viewport.name)) fail('unsafe screenshot identifier');
    const fileName = `${entry.id}--${viewport.name}.png`;
    await atomicWrite(path.join(screenshotsRoot, fileName), bytes);
    return {
      bytes: bytes.length,
      id: entry.id,
      route: entry.url,
      screenshot: path.posix.join('.replica', 'screenshots', fileName),
      sha256: sha256Bytes(bytes),
      viewport: viewport.name,
    };
  } finally {
    if (client && isolated) {
      await client.call('Target.closeTarget', { targetId: isolated.targetId }).catch(() => {});
      await client.call('Target.disposeBrowserContext', { browserContextId: isolated.browserContextId }).catch(() => {});
    }
    client?.close();
  }
}

function loadRoutesFile(routesFile, host, maxRoutes) {
  const raw = readJsonFile(routesFile, 'routes file');
  const list = Array.isArray(raw) ? raw : raw.routes;
  if (!Array.isArray(list)) fail('routes file must contain a routes array');
  const entries = [];
  for (const item of list.slice(0, maxRoutes)) {
    const url = new URL(String(item), `https://${host}`);
    if (url.hostname !== host || url.protocol !== 'https:') fail(`route ${item} is not on the approved host`);
    entries.push({ id: slugFromPathname(url.pathname), url: url.toString() });
  }
  return entries;
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  requireCli(args, ['project-root', 'cdp']);
  const root = resolveProjectRoot(args['project-root']);
  const { brief, targetHost } = loadCaptureBrief(root);
  const routesFile = args['routes-file']
    ? path.resolve(root, args['routes-file'])
    : path.join(root, '.replica', 'capture-routes.json');
  const maxRoutes = Number.parseInt(args['max-routes'], 10) || brief.capture.max_routes || brief.limits.max_pages;
  const maxElapsedMs = Number.parseInt(args['max-elapsed-ms'], 10)
    || brief.capture.page_load_timeout_ms
    || DEFAULT_PAGE_LOAD_MS;
  const continueOnError = args['continue-on-error'] === true || args['continue-on-error'] === 'true';
  const mergeReceipt = args['merge-receipt'] === true || args['merge-receipt'] === 'true';
  const routes = loadRoutesFile(routesFile, targetHost, maxRoutes);
  const viewports = brief.limits.viewports;
  const screenshotsRoot = path.join(root, '.replica', 'screenshots');
  await fs.mkdir(screenshotsRoot, { recursive: true, mode: 0o700 });

  const endpoint = safeCdpEndpoint(args.cdp);
  const version = await readCdpJson(endpoint, '/json/version');
  if (!version.webSocketDebuggerUrl) fail('browser did not expose the DevTools target');
  const browserWebSocketUrl = safeWebSocketUrl(version.webSocketDebuggerUrl);

  const captures = [];
  const failures = [];
  for (const entry of routes) {
    for (const viewport of viewports) {
      process.stdout.write(`Capturing ${entry.id} (${viewport.name})\n`);
      try {
        captures.push(await captureRoute(browserWebSocketUrl, screenshotsRoot, targetHost, entry, viewport, maxElapsedMs));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ id: entry.id, message, route: entry.url, viewport: viewport.name });
        process.stderr.write(`WARN ${entry.id} (${viewport.name}): ${message}\n`);
        if (!continueOnError) fail(message);
      }
    }
  }

  const receiptPath = path.join(screenshotsRoot, 'screenshot-receipt.json');
  const incoming = { captures, host: targetHost, taken_at: new Date().toISOString(), version: 1 };
  let receipt = incoming;
  if (mergeReceipt && fs.existsSync(receiptPath)) {
    const existing = readJsonFile(receiptPath, 'screenshot receipt');
    receipt = mergeCaptureReceipt(existing, incoming);
  }
  if (failures.length) receipt.failures = failures;
  atomicWrite(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  const report = completenessReport(
    routes,
    viewports,
    screenshotsRoot
  );
  process.stdout.write(
    `PASS captured ${captures.length} screenshots (${report.present_count}/${report.expected_count} expected on disk)\n`
  );
  if (report.missing_count > 0) {
    process.stdout.write(`WARN missing ${report.missing_count} screenshot(s)\n`);
    for (const file of report.missing) process.stdout.write(`- ${file}\n`);
    process.exitCode = failures.length && continueOnError ? 1 : process.exitCode;
  }
}

try {
  await main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
