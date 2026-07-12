#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const kitRoot = path.resolve(path.dirname(__filename), '..');
const node = process.execPath;
const keep = process.argv.includes('--keep');
const temps = [];

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `mvck-${label}-`));
  temps.push(dir);
  return dir;
}

function run(args, { cwd = kitRoot, expect = 0 } = {}) {
  const result = spawnSync(node, args, { cwd, encoding: 'utf8' });
  if (result.status !== expect) {
    console.error(`Command failed: ${node} ${args.join(' ')}`);
    console.error(`cwd: ${cwd}`);
    console.error(`exit: ${result.status}`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
  console.log(`PASS ${message}`);
}

function count(text, marker) {
  return (text.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

try {
  const clean = tempDir('clean');
  run(['.vbkit-scripts/mvck.mjs', 'install', clean, '--profile', 'all']);
  run(['.vbkit-scripts/validate-kit.mjs', clean]);
  assert(fs.existsSync(path.join(clean, 'AGENTS.md')), 'clean install creates AGENTS.md');
  assert(fs.existsSync(path.join(clean, '.vbkit-commands')), 'clean install creates .vbkit-commands');
  assert(fs.existsSync(path.join(clean, '.vbkit-scripts')), 'clean install creates .vbkit-scripts');
  assert(fs.existsSync(path.join(clean, '.vbkit-docs')), 'clean install creates .vbkit-docs');
  assert(!fs.existsSync(path.join(clean, 'commands')), 'clean install does not create root commands');
  assert(!fs.existsSync(path.join(clean, 'scripts')), 'clean install does not create root scripts');
  assert(!fs.existsSync(path.join(clean, 'docs')), 'clean install does not create root docs');

  const existing = tempDir('existing');
  fs.writeFileSync(path.join(existing, 'AGENTS.md'), '# Existing\n');
  fs.writeFileSync(path.join(existing, 'CLAUDE.md'), '# Existing Claude\n');
  run(['.vbkit-scripts/mvck.mjs', 'install', existing, '--profile', 'all']);
  run(['.vbkit-scripts/mvck.mjs', 'install', existing, '--profile', 'all']);

  const agents = fs.readFileSync(path.join(existing, 'AGENTS.md'), 'utf8');
  const claude = fs.readFileSync(path.join(existing, 'CLAUDE.md'), 'utf8');
  assert(agents.includes('# Existing'), 'AGENTS.md preserves existing content');
  assert(claude.includes('# Existing Claude'), 'CLAUDE.md preserves existing content');
  assert(count(agents, 'BEGIN: minimal-vibe-coding-kit') === 1, 'AGENTS.md has one managed begin marker');
  assert(count(agents, 'END: minimal-vibe-coding-kit') === 1, 'AGENTS.md has one managed end marker');
  assert(count(claude, 'BEGIN: minimal-vibe-coding-kit') === 1, 'CLAUDE.md has one managed begin marker');
  assert(count(claude, 'END: minimal-vibe-coding-kit') === 1, 'CLAUDE.md has one managed end marker');

  const cwdTarget = tempDir('cwd-target');
  run([path.join(kitRoot, '.vbkit-scripts/mvck.mjs'), 'install', '--profile', 'all'], { cwd: cwdTarget });
  assert(fs.existsSync(path.join(cwdTarget, 'backbone.yml')), 'install without target uses current working directory');

  const proposed = run([path.join(kitRoot, '.vbkit-scripts/mvck.mjs'), 'init', '--propose'], { cwd: cwdTarget });
  assert(proposed.stdout.includes('Proposed backbone.yml'), 'init --propose without target preserves flag');

  const jsonPlan = run(['.vbkit-scripts/mvck.mjs', 'install', clean, '--dry-run', '--json']);
  const parsed = JSON.parse(jsonPlan.stdout);
  assert(parsed.status === 'dry-run' && parsed.dryRun === true, 'install --dry-run --json returns machine-readable plan');

  const upd = tempDir('update');
  run(['.vbkit-scripts/mvck.mjs', 'install', upd, '--profile', 'all']);
  assert(fs.existsSync(path.join(upd, '.vibekit/KIT_VERSION')), 'install stamps .vibekit/KIT_VERSION');
  fs.appendFileSync(path.join(upd, 'backbone.yml'), '# user-custom-line\n');
  fs.writeFileSync(path.join(upd, 'skills/memento/SKILL.md'), '# stale kit file\n');
  fs.rmSync(path.join(upd, '.claude/skills/coding-level'), { recursive: true, force: true });

  run(['.vbkit-scripts/mvck.mjs', 'update', upd]);
  assert(fs.readFileSync(path.join(upd, 'skills/memento/SKILL.md'), 'utf8').includes('name: memento'), 'update refreshes stale kit files');
  assert(fs.existsSync(path.join(upd, '.claude/skills/coding-level/SKILL.md')), 'update re-adds missing kit skill mirrors');
  assert(fs.readFileSync(path.join(upd, 'backbone.yml'), 'utf8').includes('# user-custom-line'), 'update preserves user-modified backbone.yml');
  const backupRoot = path.join(upd, '.vibekit', 'update-backup');
  assert(fs.existsSync(backupRoot) && fs.readdirSync(backupRoot).length >= 1, 'update backs up replaced kit files');
  run(['.vbkit-scripts/validate-kit.mjs', upd]);

  const updAgents = fs.readFileSync(path.join(upd, 'AGENTS.md'), 'utf8');
  assert(count(updAgents, 'BEGIN: minimal-vibe-coding-kit') === 1, 'update keeps one managed begin marker in AGENTS.md');

  const emptyTarget = tempDir('update-empty');
  run(['.vbkit-scripts/mvck.mjs', 'update', emptyTarget], { expect: 1 });
  assert(true, 'update refuses a target without the kit installed');

  const updPlan = run(['.vbkit-scripts/mvck.mjs', 'update', upd, '--dry-run', '--json']);
  const updParsed = JSON.parse(updPlan.stdout);
  assert(updParsed.status === 'dry-run' && typeof updParsed.toVersion === 'string', 'update --dry-run --json returns machine-readable plan');

  console.log('\nInstall behavior tests passed.');
} finally {
  if (!keep) {
    for (const dir of temps) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  } else {
    console.log(`Kept temp dirs:\n${temps.join('\n')}`);
  }
}
