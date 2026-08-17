#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

import {
  expectedKindFromPath,
  fail,
  imageKind,
  loadValidatedBrief,
  printFailure,
  readJsonFile,
  resolveExistingFile,
  resolveProjectRoot,
  sha256Bytes,
  writeGeneratedJson,
} from './asset-workflow-lib.mjs';

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--project-root' || !argv[1]) {
    fail('usage: verify-local-assets.mjs --project-root <dir>');
  }
  return { projectRoot: argv[1] };
}

function optionalDownloadReceipt(root) {
  const relative = '.replica/asset-download-receipt.json';
  const absolute = `${root}/${relative}`;
  if (!fs.existsSync(absolute)) return null;
  return readJsonFile(resolveExistingFile(root, relative, 'download receipt', '.replica/'), 'download receipt');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolveProjectRoot(args.projectRoot);
  const { normalizedDigest } = loadValidatedBrief(root);
  const manifestPath = resolveExistingFile(
    root,
    '.replica/manifests/authorized-assets.json',
    'asset manifest',
    '.replica/manifests/'
  );
  const manifest = readJsonFile(manifestPath, 'asset manifest');
  if (manifest?.version !== 1 || !Array.isArray(manifest.assets)) fail('asset manifest is not supported version 1');
  if (manifest.normalized_brief_sha256 !== normalizedDigest) fail('asset manifest does not match the validated brief');
  const downloadReceipt = optionalDownloadReceipt(root);
  if (downloadReceipt && downloadReceipt.normalized_brief_sha256 !== normalizedDigest) {
    fail('download receipt does not match the validated brief');
  }
  const receiptByOutput = new Map((downloadReceipt?.assets ?? []).map((asset) => [asset.output, asset]));
  const findings = [];
  for (const [index, asset] of manifest.assets.entries()) {
    const result = { output: asset?.output, slot: asset?.slot, status: 'pass' };
    try {
      if (typeof asset?.output !== 'string' || !asset.output.startsWith('public/assets/imported/')) {
        fail('output is outside public/assets/imported/');
      }
      const file = resolveExistingFile(root, asset.output, `asset ${index + 1}`, 'public/assets/imported/');
      const bytes = fs.readFileSync(file);
      if (bytes.length === 0) fail('file is empty');
      const kind = imageKind(bytes);
      if (!kind || kind !== expectedKindFromPath(asset.output)) fail('file signature does not match output extension');
      const digest = sha256Bytes(bytes);
      const downloaded = receiptByOutput.get(asset.output);
      if (downloaded && (downloaded.sha256 !== digest || downloaded.bytes !== bytes.length)) {
        fail('file digest or size does not match the download receipt');
      }
      Object.assign(result, { bytes: bytes.length, image_kind: kind, sha256: digest });
    } catch (error) {
      result.status = 'fail';
      result.error = error.message;
    }
    findings.push(result);
  }
  const failed = findings.filter((finding) => finding.status === 'fail');
  const verification = {
    assets: findings,
    download_receipt_checked: Boolean(downloadReceipt),
    failed: failed.length,
    manifest_sha256: sha256Bytes(fs.readFileSync(manifestPath)),
    normalized_brief_sha256: normalizedDigest,
    passed: findings.length - failed.length,
    status: failed.length === 0 ? 'pass' : 'fail',
    version: 1,
  };
  writeGeneratedJson(root, '.replica/asset-verification.json', verification);
  if (failed.length > 0) fail(`${failed.length} asset verification checks failed`);
  process.stdout.write(`${JSON.stringify({ asset_count: findings.length, status: 'pass' }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
