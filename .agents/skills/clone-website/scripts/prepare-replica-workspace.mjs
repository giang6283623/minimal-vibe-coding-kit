#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$/;

class WorkspaceError extends Error {}

function safeWorkspaceSlug(value) {
  if (typeof value !== 'string' || !SLUG_RE.test(value)) {
    throw new WorkspaceError('workspace slug must be lowercase kebab-case');
  }
  return value;
}

function resolveWorkspaceRoot(rawRoot) {
  const input = path.resolve(rawRoot);
  const stat = fs.lstatSync(input);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new WorkspaceError('workspace root must be a real directory, not a symlink');
  }
  const real = fs.realpathSync(input);
  const broad = new Set(['/', '/Users', '/home', '/private', '/tmp', '/var', '/usr', path.resolve(os.homedir())]);
  if (broad.has(real)) throw new WorkspaceError(`workspace root is too broad: ${real}`);
  return real;
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--workspace-root', '--slug'].includes(key) || value === undefined) {
      throw new WorkspaceError('usage: prepare-replica-workspace.mjs --workspace-root <existing-dir> --slug <kebab-case>');
    }
    values[key.slice(2)] = value;
  }
  if (!values['workspace-root'] || !values.slug) {
    throw new WorkspaceError('--workspace-root and --slug are required');
  }
  return values;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspaceRoot = resolveWorkspaceRoot(args['workspace-root']);
  const slug = safeWorkspaceSlug(args.slug);
  const target = path.join(workspaceRoot, slug);
  const relation = path.relative(workspaceRoot, target);
  if (relation !== slug || path.isAbsolute(relation)) throw new WorkspaceError('workspace target escaped its parent');
  if (fs.existsSync(target) || fs.lstatSync(workspaceRoot).isSymbolicLink()) {
    throw new WorkspaceError(`workspace target already exists or is unsafe: ${target}`);
  }

  const directories = [
    '.replica/assets',
    '.replica/evidence',
    '.replica/fixtures',
    '.replica/manifests',
    '.replica/screenshots',
  ];
  fs.mkdirSync(target, { mode: 0o700 });
  for (const directory of directories) {
    fs.mkdirSync(path.join(target, directory), { recursive: true, mode: 0o700 });
  }
  const ignore = [
    '.replica/assets/',
    '.replica/evidence/',
    '.replica/manifests/',
    '.replica/screenshots/',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(target, '.gitignore'), ignore, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: 'created', project_root: target, slug }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof WorkspaceError ? error.message : `${error.name}: ${error.message}`;
  process.stderr.write(`FAIL ${message}\n`);
  process.exitCode = 2;
}
