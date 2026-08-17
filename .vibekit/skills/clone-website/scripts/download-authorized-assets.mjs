#!/usr/bin/env node

import dns from 'node:dns/promises';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';

import {
  expectedKindFromPath,
  fail,
  imageKind,
  isPublicIp,
  loadValidatedBrief,
  printFailure,
  readJsonFile,
  resolveExistingFile,
  resolveOutputFile,
  resolveProjectRoot,
  safeRemoteImageUrl,
  sha256Bytes,
  writeGeneratedJson,
} from './asset-workflow-lib.mjs';

function parseArgs(argv) {
  let projectRoot = '';
  const allowHosts = [];
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (value === undefined) fail('every argument requires a value');
    if (key === '--project-root') projectRoot = value;
    else if (key === '--allow-host') allowHosts.push(value.toLowerCase());
    else fail('usage: download-authorized-assets.mjs --project-root <dir> --allow-host <exact-host> [--allow-host <exact-host>]');
  }
  if (!projectRoot || allowHosts.length === 0) fail('--project-root and at least one --allow-host are required');
  if (new Set(allowHosts).size !== allowHosts.length) fail('--allow-host values must not repeat');
  for (const host of allowHosts) {
    const probe = safeRemoteImageUrl(`https://${host}/probe.jpg`, '--allow-host');
    if (probe.hostname !== host || probe.port) fail('--allow-host must be one exact lowercase hostname');
  }
  return { allowHosts: allowHosts.sort(), projectRoot };
}

async function resolvePublicAddress(hostname) {
  const answers = await dns.lookup(hostname, { all: true, verbatim: true });
  if (answers.length === 0) fail(`no DNS address found for ${hostname}`);
  if (answers.some((answer) => !isPublicIp(answer.address))) {
    fail(`DNS for ${hostname} includes a local, private, reserved, or unsupported address`);
  }
  return answers[0];
}

function requestImage(url, address, limits) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif',
        'User-Agent': 'minimal-vibe-clone-asset-owner-tool/1',
      },
      hostname: url.hostname,
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [{ address: address.address, family: address.family }]);
        else callback(null, address.address, address.family);
      },
      method: 'GET',
      path: `${url.pathname}${url.search}`,
      port: 443,
      protocol: 'https:',
      rejectUnauthorized: true,
      servername: url.hostname,
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        reject(new Error(`redirects are not allowed (${response.statusCode})`));
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`unexpected HTTP status ${response.statusCode}`));
        return;
      }
      const contentLength = Number(response.headers['content-length']);
      if (Number.isFinite(contentLength) && contentLength > limits.max_bytes_per_asset) {
        response.resume();
        reject(new Error(`content-length exceeds ${limits.max_bytes_per_asset} bytes`));
        return;
      }
      const contentType = String(response.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
      if (!['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        response.resume();
        reject(new Error(`unsupported content-type ${contentType || 'missing'}`));
        return;
      }
      const chunks = [];
      let received = 0;
      response.on('data', (chunk) => {
        received += chunk.length;
        if (received > limits.max_bytes_per_asset) {
          response.destroy(new Error(`response exceeds ${limits.max_bytes_per_asset} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ body: Buffer.concat(chunks), contentType }));
      response.on('error', reject);
    });
    const deadline = setTimeout(
      () => request.destroy(new Error(`request exceeded ${limits.timeout_ms} ms`)),
      limits.timeout_ms
    );
    request.setTimeout(limits.timeout_ms, () => request.destroy(new Error(`request stalled for ${limits.timeout_ms} ms`)));
    request.on('close', () => clearTimeout(deadline));
    request.on('error', reject);
    request.end();
  });
}

function validateExistingAsset(file, output) {
  const bytes = fs.readFileSync(file);
  if (bytes.length === 0) fail(`existing asset is empty: ${output}`);
  const actual = imageKind(bytes);
  const expected = expectedKindFromPath(output);
  if (!actual || actual !== expected) fail(`existing asset signature does not match its path: ${output}`);
  return { bytes: bytes.length, sha256: sha256Bytes(bytes), status: 'skipped-valid-existing' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolveProjectRoot(args.projectRoot);
  const { brief, normalizedDigest } = loadValidatedBrief(root);
  if (!['owned', 'written-permission'].includes(brief.authorization.status)) {
    fail('asset download requires owned or written-permission authorization');
  }
  if (!['owned', 'licensed', 'permission'].includes(brief.authorization.content_rights)) {
    fail('asset download requires owned, licensed, or permitted content rights');
  }
  const manifestPath = resolveExistingFile(
    root,
    '.replica/manifests/authorized-assets.json',
    'asset manifest',
    '.replica/manifests/'
  );
  const manifest = readJsonFile(manifestPath, 'asset manifest');
  if (manifest?.version !== 1 || !Array.isArray(manifest.assets) || !Array.isArray(manifest.candidate_hosts)) {
    fail('asset manifest does not use the supported version 1 contract');
  }
  if (manifest.normalized_brief_sha256 !== normalizedDigest) fail('asset manifest does not match the validated brief');
  if (!Number.isInteger(manifest?.limits?.max_assets) || manifest.assets.length > manifest.limits.max_assets) {
    fail('asset manifest exceeds its max_assets limit');
  }
  if (
    !Number.isInteger(manifest?.limits?.max_bytes_per_asset)
    || manifest.limits.max_bytes_per_asset < 1
    || manifest.limits.max_bytes_per_asset > 25 * 1024 * 1024
    || !Number.isInteger(manifest?.limits?.max_total_bytes)
    || manifest.limits.max_total_bytes < manifest.limits.max_bytes_per_asset
    || manifest.limits.max_total_bytes > 1024 * 1024 * 1024
    || !Number.isInteger(manifest?.limits?.max_elapsed_ms)
    || manifest.limits.max_elapsed_ms < 1000
    || manifest.limits.max_elapsed_ms > 60 * 60 * 1000
    || !Number.isInteger(manifest?.limits?.timeout_ms)
    || manifest.limits.timeout_ms < 1000
    || manifest.limits.timeout_ms > 30000
  ) fail('asset manifest has unsafe byte or timeout limits');

  const candidateHosts = [...new Set(manifest.candidate_hosts.map((host) => String(host).toLowerCase()))].sort();
  if (JSON.stringify(candidateHosts) !== JSON.stringify(args.allowHosts)) {
    fail(`--allow-host values must exactly match candidate_hosts: ${candidateHosts.join(', ')}`);
  }
  const results = [];
  const startedAt = Date.now();
  let totalBytes = 0;
  for (const [index, asset] of manifest.assets.entries()) {
    if (Date.now() - startedAt >= manifest.limits.max_elapsed_ms) fail('download job exceeded max_elapsed_ms');
    if (!asset || typeof asset !== 'object') fail(`asset ${index + 1} must be an object`);
    const url = safeRemoteImageUrl(asset.url, `asset ${index + 1} URL`);
    if (!args.allowHosts.includes(url.hostname.toLowerCase())) fail(`asset ${index + 1} host is not approved`);
    if (typeof asset.output !== 'string' || !asset.output.startsWith('public/assets/imported/')) {
      fail(`asset ${index + 1} output must stay under public/assets/imported/`);
    }
    const output = resolveOutputFile(root, asset.output, `asset ${index + 1} output`, 'public/assets/imported/');
    if (fs.existsSync(output)) {
      const existing = validateExistingAsset(output, asset.output);
      totalBytes += existing.bytes;
      if (totalBytes > manifest.limits.max_total_bytes) fail('download job exceeded max_total_bytes');
      results.push({ output: asset.output, slot: asset.slot, ...existing });
      continue;
    }
    const address = await resolvePublicAddress(url.hostname);
    let response;
    try {
      response = await requestImage(url, address, manifest.limits);
    } catch (error) {
      fail(`asset ${index + 1} download failed: ${error.message}`);
    }
    if (response.body.length === 0) fail(`asset ${index + 1} response is empty`);
    const actual = imageKind(response.body);
    const expected = expectedKindFromPath(asset.output);
    if (!actual || actual !== expected) fail(`asset ${index + 1} image signature does not match output extension`);
    const contentTypeKind = response.contentType === 'image/jpeg' ? 'jpeg' : response.contentType.slice('image/'.length);
    if (contentTypeKind !== actual) fail(`asset ${index + 1} content-type does not match its byte signature`);
    totalBytes += response.body.length;
    if (totalBytes > manifest.limits.max_total_bytes) fail('download job exceeded max_total_bytes');
    if (Date.now() - startedAt >= manifest.limits.max_elapsed_ms) fail('download job exceeded max_elapsed_ms');
    fs.writeFileSync(output, response.body, { flag: 'wx', mode: 0o600 });
    results.push({
      bytes: response.body.length,
      content_type: response.contentType,
      output: asset.output,
      sha256: sha256Bytes(response.body),
      slot: asset.slot,
      status: 'downloaded',
    });
  }
  const receipt = {
    allowed_hosts: args.allowHosts,
    assets: results,
    elapsed_ms: Date.now() - startedAt,
    manifest_sha256: sha256Bytes(fs.readFileSync(manifestPath)),
    normalized_brief_sha256: normalizedDigest,
    status: 'download-complete',
    total_bytes: totalBytes,
    version: 1,
  };
  writeGeneratedJson(root, '.replica/asset-download-receipt.json', receipt);
  process.stdout.write(`${JSON.stringify({ asset_count: results.length, status: receipt.status }, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
