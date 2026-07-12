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
  mvck install [target] [--profile all|claude,cursor,codex] [--force] [--dry-run] [--json]
  mvck update [target] [--profile all|claude,cursor,codex] [--dry-run] [--json] [--no-backup]
  mvck init [target] [--propose|--write --yes] [--preset nextjs|wordpress|python|laravel|docker]
  mvck validate [target]
  mvck doctor [target] [--write-report] [--json]
  mvck daily [target] [--write-report]
  mvck finalize [target] [--write --yes] [--restore] [--json]

Examples:
  node .vbkit-scripts/mvck.mjs install ~/work/my-repo --profile all
  npx --yes minimal-vibe-coding-kit@latest update .
  node .vbkit-scripts/mvck.mjs init . --propose
  node .vbkit-scripts/mvck.mjs doctor .
  node .vbkit-scripts/mvck.mjs validate .
  node .vbkit-scripts/mvck.mjs finalize .

update refreshes kit-owned files (skills, commands, rules, scripts, docs, agent
mirrors) to the running kit version. It never overwrites user-owned files
(backbone.yml, CLAUDE.md, AGENTS.md content, settings.json) and backs up any
changed kit file under .vibekit/update-backup/ before replacing it.
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

function parseTargetAndFlags(command, { valueFlags = [] } = {}) {
  const values = new Set(valueFlags);
  const flags = [];
  const positionals = [];
  const rest = args[0] === command ? args.slice(1) : args.slice();

  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (item === '--') {
      positionals.push(...rest.slice(i + 1));
      break;
    }
    if (!item.startsWith('--')) {
      positionals.push(item);
      continue;
    }

    flags.push(item);
    if (!item.includes('=') && values.has(item) && rest[i + 1] && !rest[i + 1].startsWith('--')) {
      flags.push(rest[i + 1]);
      i += 1;
    }
  }

  return {
    target: path.resolve(positionals[0] || process.cwd()),
    flags,
    positionals
  };
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

function managedBlockFromTemplate(block, begin, end) {
  const start = block.indexOf(begin);
  const finish = block.indexOf(end);
  if (start >= 0 && finish > start) return block.slice(start, finish + end.length);
  return `${begin}\n${block.trim()}\n${end}`;
}

const KIT_SEED_FILES = ['FIRST_TIME_INIT.md', 'FIRST_PROMPT.md', 'CLAUDE-template.md', 'backbone.yml'];
const KIT_SHARED_DIRS = ['skills', '.vbkit-commands', '.vbkit-docs'];
const KIT_SCRIPTS = [
  '.vbkit-scripts/mvck.mjs', '.vbkit-scripts/init-backbone.mjs', '.vbkit-scripts/daily-enhance.mjs', '.vbkit-scripts/validate-kit.mjs',
  '.vbkit-scripts/doctor.mjs', '.vbkit-scripts/test-install.mjs', '.vbkit-scripts/agentshield-probe.mjs', '.vbkit-scripts/pack-dry-run.mjs', '.vbkit-scripts/vibekit-finalize.mjs'
];
const CLAUDE_DIRS = ['.claude/agents', '.claude/commands', '.claude/rules'];
const CLAUDE_SKILLS = [
  'autoresearch-coding', 'agentshield-security-review', 'daily-workflow-curator', 'vibekit-init', 'visual-design-loop',
  'clearthought', 'sequential-thinking', 'reviewing-4p-priorities', 'memento', 'coding-level'
];
const CURSOR_DIRS = ['.cursor/rules', '.cursor/commands'];
const CURSOR_SKILLS = ['clearthought', 'sequential-thinking', 'reviewing-4p-priorities', 'memento', 'coding-level'];
const CODEX_DIRS = ['.agents', '.codex', '.codex-plugin'];
const GITIGNORE_BLOCK = `# BEGIN: minimal-vibe-coding-kit\n.autoresearch/\nresults.tsv\n.vibekit/INIT_DONE\n.vibekit/FINALIZE_DONE\n.vibekit/reports/\n.vibekit/update-backup/\n_vibekit-cleanup/\nCLAUDE.local.md\n# END: minimal-vibe-coding-kit`;

function kitVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8')).version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function writeKitVersion(target, dryRun) {
  if (dryRun) return;
  const markerDir = path.join(target, '.vibekit');
  fs.mkdirSync(markerDir, { recursive: true });
  fs.writeFileSync(path.join(markerDir, 'KIT_VERSION'), `${kitVersion()}\n`);
}

function applyManagedBlocks(target, profiles, actions, { dryRun = false } = {}) {
  appendManagedBlock(path.join(target, '.gitignore'), GITIGNORE_BLOCK, '# BEGIN: minimal-vibe-coding-kit', '# END: minimal-vibe-coding-kit', { dryRun });
  actions.push({ action: 'managed-block', path: '.gitignore' });

  if (profiles.has('claude')) {
    const claudeTarget = path.join(target, 'CLAUDE.md');
    if (!fs.existsSync(claudeTarget)) {
      actions.push(copyFileSafe('CLAUDE-template.md', 'CLAUDE.md', target, { force: false, dryRun }));
    } else {
      const block = `<!-- BEGIN: minimal-vibe-coding-kit -->\n@AGENTS.md\n\n## Minimal Vibe Coding Kit\n\n- Read \`backbone.yml\` before changing code.\n- If \`meta.template_status\` is \`uninitialized\`, follow \`FIRST_TIME_INIT.md\` and wait for approval before writing.\n- After init, follow \`backbone.yml\` \`conventions\` before adding new project patterns.\n- Prefer project skills for multi-step workflows: \`/autoresearch-coding\`, \`/security-scan\`, \`/daily-enhance\`.\n<!-- END: minimal-vibe-coding-kit -->`;
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
    const managed = managedBlockFromTemplate(block, begin, end);
    appendManagedBlock(agentsTarget, managed, begin, end, { dryRun });
    actions.push({ action: 'managed-block', path: 'AGENTS.md' });
  }
}

function install() {
  const force = hasFlag('--force');
  const dryRun = hasFlag('--dry-run');
  const json = hasFlag('--json');
  const target = parseTargetAndFlags('install', { valueFlags: ['--profile'] }).target;
  const profileRaw = optionValue('--profile', 'all');
  const profiles = new Set(profileRaw === 'all' ? ['claude', 'cursor', 'codex'] : profileRaw.split(',').map((x) => x.trim()).filter(Boolean));

  if (!fs.existsSync(target)) throw new Error(`Target does not exist: ${target}`);
  const actions = [];
  const opts = { force, dryRun };

  for (const file of KIT_SEED_FILES) {
    actions.push(copyFileSafe(file, file, target, opts));
  }
  for (const dir of KIT_SHARED_DIRS) {
    actions.push(copyDirSafe(dir, dir, target, opts));
  }
  for (const file of KIT_SCRIPTS) {
    actions.push(copyFileSafe(file, file, target, opts));
  }

  if (profiles.has('claude')) {
    for (const dir of CLAUDE_DIRS) {
      actions.push(copyDirSafe(dir, dir, target, opts));
    }
    for (const skill of CLAUDE_SKILLS) {
      actions.push(copyDirSafe(`.claude/skills/${skill}`, `.claude/skills/${skill}`, target, opts));
    }
    actions.push(copyFileSafe('.claude/settings.json', '.claude/settings.json', target, opts));
  }
  if (profiles.has('cursor')) {
    for (const dir of CURSOR_DIRS) {
      actions.push(copyDirSafe(dir, dir, target, opts));
    }
    for (const skill of CURSOR_SKILLS) {
      actions.push(copyDirSafe(`.cursor/skills/${skill}`, `.cursor/skills/${skill}`, target, opts));
    }
    actions.push(copyFileSafe('.cursor/settings.json', '.cursor/settings.json', target, opts));
  }
  if (profiles.has('codex')) {
    for (const dir of CODEX_DIRS) {
      actions.push(copyDirSafe(dir, dir, target, opts));
    }
  }

  applyManagedBlocks(target, profiles, actions, { dryRun });
  writeKitVersion(target, dryRun);
  actions.push({ action: 'version-marker', path: '.vibekit/KIT_VERSION' });

  const nextPrompt = 'Read FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit. Print requirements first, infer project conventions, propose a diff, and wait for my yes before writing.';
  if (json) {
    console.log(JSON.stringify({
      status: dryRun ? 'dry-run' : 'installed',
      target,
      profiles: [...profiles].sort(),
      force,
      dryRun,
      actions,
      nextPrompt
    }, null, 2));
    return;
  }

  console.log(dryRun ? 'Dry-run install plan:' : 'Install complete:');
  for (const a of actions) console.log(`- ${a.action}: ${a.path}`);
  console.log('\nNext prompt:');
  console.log(nextPrompt);
}

function updateFileSafe(srcRel, destRel, target, { dryRun = false, backup = null } = {}) {
  const src = path.join(kitRoot, srcRel);
  const dest = path.join(target, destRel ?? srcRel);
  if (!fs.existsSync(src)) throw new Error(`Missing source file: ${srcRel}`);

  if (!fs.existsSync(dest)) {
    if (!dryRun) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, fs.statSync(src).mode);
    }
    return { action: 'add', path: destRel ?? srcRel };
  }

  if (fs.readFileSync(src).equals(fs.readFileSync(dest))) {
    return { action: 'unchanged', path: destRel ?? srcRel };
  }

  if (!dryRun) {
    if (backup) {
      const backupPath = path.join(backup.dir, destRel ?? srcRel);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(dest, backupPath);
      backup.count += 1;
    }
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, fs.statSync(src).mode);
  }
  return { action: 'update', path: destRel ?? srcRel };
}

function updateDirSafe(srcRel, target, opts) {
  const src = path.join(kitRoot, srcRel);
  if (!fs.existsSync(src)) throw new Error(`Missing source dir: ${srcRel}`);
  const results = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child);
      else {
        const rel = path.join(srcRel, path.relative(src, child)).replaceAll(path.sep, '/');
        results.push(updateFileSafe(rel, rel, target, opts));
      }
    }
  }
  walk(src);
  return results;
}

function update() {
  const dryRun = hasFlag('--dry-run');
  const json = hasFlag('--json');
  const noBackup = hasFlag('--no-backup');
  const target = parseTargetAndFlags('update', { valueFlags: ['--profile'] }).target;
  const profileRaw = optionValue('--profile', 'all');
  const profiles = new Set(profileRaw === 'all' ? ['claude', 'cursor', 'codex'] : profileRaw.split(',').map((x) => x.trim()).filter(Boolean));

  if (!fs.existsSync(target)) throw new Error(`Target does not exist: ${target}`);
  if (fs.realpathSync(kitRoot) === fs.realpathSync(target)) {
    throw new Error('Update source and target are the same directory. Run the update from a newer kit, e.g.: npx --yes minimal-vibe-coding-kit@latest update .');
  }
  if (!fs.existsSync(path.join(target, 'backbone.yml')) && !fs.existsSync(path.join(target, '.vbkit-scripts'))) {
    throw new Error('Kit not detected in target (no backbone.yml or .vbkit-scripts). Run mvck install first.');
  }

  const previousVersionFile = path.join(target, '.vibekit', 'KIT_VERSION');
  const previousVersion = fs.existsSync(previousVersionFile) ? fs.readFileSync(previousVersionFile, 'utf8').trim() : 'unknown';
  const finalized = fs.existsSync(path.join(target, '.vibekit', 'FINALIZE_DONE'));
  const stamp = new Date().toISOString().replaceAll(':', '-').slice(0, 19);
  const backup = noBackup || dryRun ? null : { dir: path.join(target, '.vibekit', 'update-backup', stamp), count: 0 };
  const opts = { dryRun, backup };
  const actions = [];

  // Kit-owned surfaces: refresh to the running kit version, never delete extras.
  for (const dir of KIT_SHARED_DIRS) actions.push(...updateDirSafe(dir, target, opts));
  for (const file of KIT_SCRIPTS) actions.push(updateFileSafe(file, file, target, opts));
  if (profiles.has('claude')) {
    for (const dir of CLAUDE_DIRS) actions.push(...updateDirSafe(dir, target, opts));
    for (const skill of CLAUDE_SKILLS) actions.push(...updateDirSafe(`.claude/skills/${skill}`, target, opts));
  }
  if (profiles.has('cursor')) {
    for (const dir of CURSOR_DIRS) actions.push(...updateDirSafe(dir, target, opts));
    for (const skill of CURSOR_SKILLS) actions.push(...updateDirSafe(`.cursor/skills/${skill}`, target, opts));
  }
  if (profiles.has('codex')) {
    for (const dir of CODEX_DIRS) actions.push(...updateDirSafe(dir, target, opts));
  }

  // User-owned files: seed only when missing, never overwrite. Finalized
  // projects removed the one-time files on purpose, so skip re-seeding them.
  const seedFiles = finalized ? ['backbone.yml'] : KIT_SEED_FILES;
  for (const file of seedFiles) actions.push(copyFileSafe(file, file, target, { force: false, dryRun }));
  if (profiles.has('claude')) actions.push(copyFileSafe('.claude/settings.json', '.claude/settings.json', target, { force: false, dryRun }));
  if (profiles.has('cursor')) actions.push(copyFileSafe('.cursor/settings.json', '.cursor/settings.json', target, { force: false, dryRun }));

  applyManagedBlocks(target, profiles, actions, { dryRun });
  writeKitVersion(target, dryRun);

  const summary = { add: 0, update: 0, unchanged: 0, skip: 0, 'managed-block': 0 };
  for (const a of actions) summary[a.action] = (summary[a.action] || 0) + 1;
  const backupInfo = backup && backup.count > 0 ? path.relative(target, backup.dir) : null;
  const preserved = ['backbone.yml', 'CLAUDE.md', 'AGENTS.md content outside the managed block', '.claude/settings.json', '.cursor/settings.json'];

  if (json) {
    console.log(JSON.stringify({
      status: dryRun ? 'dry-run' : 'updated',
      target,
      profiles: [...profiles].sort(),
      fromVersion: previousVersion,
      toVersion: kitVersion(),
      summary,
      backupDir: backupInfo,
      preserved,
      actions: actions.filter((a) => a.action !== 'unchanged')
    }, null, 2));
    return;
  }

  console.log(dryRun ? 'Dry-run update plan:' : 'Update complete:');
  console.log(`- kit version: ${previousVersion} -> ${kitVersion()}`);
  for (const a of actions) {
    if (a.action === 'unchanged') continue;
    console.log(`- ${a.action}: ${a.path}`);
  }
  console.log(`\nSummary: ${summary.add} added, ${summary.update} updated, ${summary.unchanged} unchanged.`);
  if (backupInfo) console.log(`Backups of replaced files: ${backupInfo}/`);
  console.log(`Preserved (never overwritten by update): ${preserved.join(', ')}.`);
}

function delegate(scriptName, { valueFlags = [] } = {}) {
  const { target, flags } = parseTargetAndFlags(args[0], { valueFlags });
  const script = path.join(kitRoot, '.vbkit-scripts', scriptName);
  const childArgs = [script, target, ...flags];
  const result = spawnSync(process.execPath, childArgs, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

try {
  const command = args[0];
  if (!command || command === '--help' || command === '-h') {
    usage();
  } else if (command === 'install') {
    install();
  } else if (command === 'update') {
    update();
  } else if (command === 'init') {
    delegate('init-backbone.mjs', { valueFlags: ['--preset'] });
  } else if (command === 'validate') {
    delegate('validate-kit.mjs');
  } else if (command === 'doctor') {
    delegate('doctor.mjs');
  } else if (command === 'daily') {
    delegate('daily-enhance.mjs');
  } else if (command === 'finalize') {
    delegate('vibekit-finalize.mjs');
  } else {
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
