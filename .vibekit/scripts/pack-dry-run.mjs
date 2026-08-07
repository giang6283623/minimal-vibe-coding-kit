#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cache = process.env.MVCK_NPM_CACHE || path.join(os.tmpdir(), 'mvck-npm-cache');
const result = spawnSync(npm, ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    npm_config_cache: cache
  }
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || '');
  process.exit(result.status ?? 1);
}

let packed;
try {
  packed = new Set(JSON.parse(result.stdout)[0].files.map((file) => file.path));
} catch (err) {
  console.error(`FAIL could not parse npm pack --dry-run --json output: ${err.message}`);
  process.exit(1);
}

// Every distributed skill and provider surface present on disk must ship in the
// tarball. A path added without its package.json `files` entry fails here.
const manifest = JSON.parse(fs.readFileSync('.vibekit/skills/skills-manifest.json', 'utf8'));
const manifestSkillRoots = Object.values(manifest.surfaces || {});
const unsafeSkillRoots = manifestSkillRoots.filter((root) =>
  typeof root !== 'string'
  || !root.endsWith('/skills')
  || path.isAbsolute(root)
  || root.includes('\\')
  || root.split('/').includes('..')
);
if (unsafeSkillRoots.length > 0) {
  console.error(`FAIL unsafe skill roots in manifest: ${unsafeSkillRoots.join(', ')}`);
  process.exit(1);
}
const skillRoots = [...new Set(['.vibekit/skills', ...manifestSkillRoots])];
const expected = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else expected.push(rel);
  }
}
for (const root of skillRoots) {
  if (fs.existsSync(root)) walk(root);
}
if (fs.existsSync('.opencode')) walk('.opencode');
if (fs.existsSync('opencode.json')) expected.push('opencode.json');

const missing = expected.filter((rel) => !packed.has(rel));
for (const rel of missing) console.error(`FAIL packaged tarball is missing ${rel}`);
if (missing.length > 0) {
  console.error(`Pack dry-run: ${missing.length} of ${expected.length} on-disk skill files are not packaged.`);
  process.exit(1);
}
console.log(`PASS pack dry-run: all ${expected.length} on-disk skill files are packaged (${packed.size} files in tarball)`);
