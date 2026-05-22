#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kitRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function usage() {
  console.log(`Minimal Vibe Coding Kit

Usage:
  mvck install [target] [--profile all|claude,cursor,codex] [--force] [--dry-run]
  mvck init [target] [--propose|--write --yes]
  mvck validate [target]
  mvck daily [target] [--write-report]

Examples:
  node scripts/mvck.mjs install ~/work/my-repo --profile all
  node scripts/mvck.mjs init . --propose
  node scripts/mvck.mjs validate .
`);
}

function hasFlag(flag) {
  return args.includes(flag);
}

function optionValue(name, fallback = null) {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--')) return args[idx + 1];
  const prefix = `${name}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function positionalAfter(command) {
  const out = [];
  let skip = false;
  for (const item of args.slice(1)) {
    if (skip) { skip = false; continue; }
    if (item === '--profile') { skip = true; continue; }
    if (item.startsWith('--')) continue;
    out.push(item);
  }
  return out;
}

function ensureDir(dir, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(srcRel, destRel, target, { force = false, dryRun = false } = {}) {
  const src = path.join(kitRoot, srcRel);
  const dest = path.join(target, destRel ?? srcRel);
  if (!fs.existsSync(src)) throw new Error(`Missing source file: ${srcRel}`);
  if (fs.existsSync(dest) && !force) return { action: 'skip', path: destRel ?? srcRel };
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    const mode = fs.statSync(src).mode;
    fs.chmodSync(dest, mode);
  }
  return { action: fs.existsSync(dest) && force ? 'replace' : 'copy', path: destRel ?? srcRel };
}

function copyDirSafe(srcRel, destRel, target, { force = false, dryRun = false } = {}) {
  const src = path.join(kitRoot, srcRel);
  const destRoot = path.join(target, destRel ?? srcRel);
  if (!fs.existsSync(src)) throw new Error(`Missing source dir: ${srcRel}`);
  let copied = 0;
  let skipped = 0;
  function copyRecursive(from, to) {
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      if (!dryRun) fs.mkdirSync(to, { recursive: true });
      for (const entry of fs.readdirSync(from)) copyRecursive(path.join(from, entry), path.join(to, entry));
      return;
    }
    if (fs.existsSync(to) && !force) { skipped += 1; return; }
    copied += 1;
    if (!dryRun) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      fs.chmodSync(to, fs.statSync(from).mode);
    }
  }
  copyRecursive(src, destRoot);
  const action = force ? 'merge-replace' : copied > 0 && skipped > 0 ? 'merge-copy-missing' : copied > 0 ? 'copy-dir' : 'skip-dir';
  return { action: `${action} (${copied} copied, ${skipped} skipped)`, path: destRel ?? srcRel };
}

function appendManagedBlock(file, block, begin, end, { dryRun = false } = {}) {
  let current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const start = current.indexOf(begin);
  const finish = current.indexOf(end);
  let next;
  if (start >= 0 && finish > start) {
    next = current.slice(0, start).trimEnd() + '\n\n' + block.trim() + '\n' + current.slice(finish + end.length);
  } else if (current.trim()) {
    next = current.trimEnd() + '\n\n' + block.trim() + '\n';
  } else {
    next = block.trim() + '\n';
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, next);
  }
}

function install() {
  const force = hasFlag('--force');
  const dryRun = hasFlag('--dry-run');
  const target = path.resolve(positionalAfter('install')[0] || process.cwd());
  const profileRaw = optionValue('--profile', 'all');
  const profiles = new Set(profileRaw === 'all' ? ['claude', 'cursor', 'codex'] : profileRaw.split(',').map((x) => x.trim()).filter(Boolean));

  if (!fs.existsSync(target)) throw new Error(`Target does not exist: ${target}`);
  const actions = [];
  const opts = { force, dryRun };

  for (const file of ['FIRST_TIME_INIT.md', 'FIRST_PROMPT.md', 'CLAUDE-template.md', 'backbone.yml']) {
    actions.push(copyFileSafe(file, file, target, opts));
  }
  for (const dir of ['skills', 'commands', 'docs']) {
    actions.push(copyDirSafe(dir, dir, target, opts));
  }
  for (const file of ['scripts/mvck.mjs', 'scripts/init-backbone.mjs', 'scripts/daily-enhance.mjs', 'scripts/validate-kit.mjs']) {
    actions.push(copyFileSafe(file, file, target, opts));
  }

  if (profiles.has('claude')) actions.push(copyDirSafe('.claude', '.claude', target, opts));
  if (profiles.has('cursor')) actions.push(copyDirSafe('.cursor', '.cursor', target, opts));
  if (profiles.has('codex')) {
    actions.push(copyDirSafe('.agents', '.agents', target, opts));
    actions.push(copyDirSafe('.codex', '.codex', target, opts));
    actions.push(copyDirSafe('.codex-plugin', '.codex-plugin', target, opts));
  }

  const gitignoreBlock = `# BEGIN: minimal-vibe-coding-kit\n.autoresearch/\nresults.tsv\n.vibekit/INIT_DONE\n.vibekit/reports/\nCLAUDE.local.md\n# END: minimal-vibe-coding-kit`;
  appendManagedBlock(path.join(target, '.gitignore'), gitignoreBlock, '# BEGIN: minimal-vibe-coding-kit', '# END: minimal-vibe-coding-kit', { dryRun });
  actions.push({ action: 'managed-block', path: '.gitignore' });

  if (profiles.has('claude')) {
    const claudeTarget = path.join(target, 'CLAUDE.md');
    if (!fs.existsSync(claudeTarget)) {
      actions.push(copyFileSafe('CLAUDE-template.md', 'CLAUDE.md', target, { force: false, dryRun }));
    } else {
      const block = `<!-- BEGIN: minimal-vibe-coding-kit -->\n@AGENTS.md\n\n## Minimal Vibe Coding Kit\n\n- Read \`backbone.yml\` before changing code.\n- If \`meta.template_status\` is \`uninitialized\`, follow \`FIRST_TIME_INIT.md\` and wait for approval before writing.\n- Prefer project skills for multi-step workflows: \`/autoresearch-coding\`, \`/security-scan\`, \`/daily-enhance\`.\n<!-- END: minimal-vibe-coding-kit -->`;
      appendManagedBlock(claudeTarget, block, '<!-- BEGIN: minimal-vibe-coding-kit -->', '<!-- END: minimal-vibe-coding-kit -->', { dryRun });
      actions.push({ action: 'managed-block', path: 'CLAUDE.md' });
    }
  }

  const agentsTarget = path.join(target, 'AGENTS.md');
  if (!fs.existsSync(agentsTarget)) {
    actions.push(copyFileSafe('AGENTS.md', 'AGENTS.md', target, { force: false, dryRun }));
  } else {
    const block = fs.readFileSync(path.join(kitRoot, 'AGENTS.md'), 'utf8');
    const begin = '<!-- BEGIN: minimal-vibe-coding-kit -->';
    const end = '<!-- END: minimal-vibe-coding-kit -->';
    const managed = block.slice(block.indexOf(begin), block.indexOf(end) + end.length);
    appendManagedBlock(agentsTarget, managed, begin, end, { dryRun });
    actions.push({ action: 'managed-block', path: 'AGENTS.md' });
  }

  console.log(dryRun ? 'Dry-run install plan:' : 'Install complete:');
  for (const a of actions) console.log(`- ${a.action}: ${a.path}`);
  console.log('\nNext prompt:');
  console.log('Read FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit. Print requirements first, propose a diff, and wait for my yes before writing.');
}

function delegate(scriptName) {
  const target = positionalAfter(args[0])[0] || process.cwd();
  const script = path.join(kitRoot, 'scripts', scriptName);
  const childArgs = [script, target, ...args.slice(2)];
  const result = spawnSync(process.execPath, childArgs, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

try {
  const command = args[0];
  if (!command || command === '--help' || command === '-h') {
    usage();
  } else if (command === 'install') {
    install();
  } else if (command === 'init') {
    delegate('init-backbone.mjs');
  } else if (command === 'validate') {
    delegate('validate-kit.mjs');
  } else if (command === 'daily') {
    delegate('daily-enhance.mjs');
  } else {
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
