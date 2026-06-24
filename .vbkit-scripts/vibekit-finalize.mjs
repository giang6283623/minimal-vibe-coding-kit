#!/usr/bin/env node
// Graduate a consumer project: move one-time bootstrap files into a cleanup
// folder once init and the first prompt are complete. Safe, idempotent, and
// reversible. Refuses to run on the kit source repo so it never deletes the
// kit's own bootstrap files (and never breaks .vbkit-scripts/validate-kit.mjs).
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const target = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const shouldWrite = args.includes('--write');
const yes = args.includes('--yes');
const restore = args.includes('--restore');
const json = args.includes('--json');

const DEFAULTS = {
  cleanupDir: '_vibekit-cleanup',
  marker: '.vibekit/FINALIZE_DONE',
  // CLAUDE-template.md is only graduated once CLAUDE.md exists (see below).
  oneTimeFiles: ['FIRST_TIME_INIT.md', 'FIRST_PROMPT.md', 'PUSH_TO_GITHUB.md', 'CLAUDE-template.md']
};

function exists(rel) { return fs.existsSync(path.join(target, rel)); }
function read(rel) { return fs.readFileSync(path.join(target, rel), 'utf8'); }
function readJson(rel) { try { return JSON.parse(read(rel)); } catch { return null; } }

function backboneValue(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^\\s*${escaped}:\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1].replace(/^["']|["']$/g, '') : null;
}

function backboneList(text, key) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.match(new RegExp(`^\\s*${key}:`)));
  if (idx < 0) return null;
  const inline = lines[idx].split(':').slice(1).join(':').trim();
  if (inline.startsWith('[') && inline.endsWith(']')) {
    return inline.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  const indent = lines[idx].match(/^\s*/)[0].length;
  const out = [];
  for (const line of lines.slice(idx + 1)) {
    if (!line.trim()) continue;
    if (line.match(/^\s*/)[0].length <= indent) break;
    const item = line.match(/^\s*-\s+(.+?)\s*$/);
    if (item) out.push(item[1].replace(/^["']|["']$/g, ''));
  }
  return out.length ? out : null;
}

function loadConfig() {
  const cfg = { ...DEFAULTS };
  if (!exists('backbone.yml')) return cfg;
  const text = read('backbone.yml');
  cfg.cleanupDir = backboneValue(text, 'cleanup_dir') || cfg.cleanupDir;
  cfg.marker = backboneValue(text, 'marker') || cfg.marker;
  cfg.oneTimeFiles = backboneList(text, 'one_time_files') || cfg.oneTimeFiles;
  return cfg;
}

function fail(message) {
  if (json) console.log(JSON.stringify({ status: 'error', error: message }, null, 2));
  else console.error(`Refusing: ${message}`);
  process.exit(1);
}

const pkg = readJson('package.json');
if (pkg?.name === 'minimal-vibe-coding-kit') {
  fail('this is the Minimal Vibe Coding Kit source repo. Graduation only runs in a consumer project.');
}
if (!exists('backbone.yml')) fail('backbone.yml is missing. Install the kit first.');
const status = backboneValue(read('backbone.yml'), 'template_status');
if (status !== 'initialized' && !restore) {
  fail(`backbone.yml template_status is "${status || 'unknown'}". Run init (FIRST_TIME_INIT.md) before graduating.`);
}

const cfg = loadConfig();
const cleanupRoot = path.join(target, cfg.cleanupDir);
const markerPath = path.join(target, cfg.marker);

function graduateFile(rel) {
  if (rel === 'CLAUDE-template.md' && !exists('CLAUDE.md')) return false;
  return exists(rel);
}

// --- restore mode -----------------------------------------------------------
if (restore) {
  if (!fs.existsSync(cleanupRoot)) fail(`no ${cfg.cleanupDir}/ folder to restore from.`);
  const moved = [];
  for (const entry of fs.readdirSync(cleanupRoot)) {
    if (entry === 'RESTORE.md') continue;
    const from = path.join(cleanupRoot, entry);
    const to = path.join(target, entry);
    if (shouldWrite) {
      if (fs.existsSync(to)) { console.error(`Skip ${entry}: already exists at root.`); continue; }
      fs.renameSync(from, to);
    }
    moved.push(entry);
  }
  if (shouldWrite) {
    fs.rmSync(path.join(cleanupRoot, 'RESTORE.md'), { force: true });
    if (fs.readdirSync(cleanupRoot).length === 0) fs.rmdirSync(cleanupRoot);
    fs.rmSync(markerPath, { force: true });
  }
  const result = { status: shouldWrite ? 'restored' : 'restore-preview', restored: moved };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(shouldWrite ? 'Restored one-time files to repo root:' : 'Would restore one-time files:');
    for (const m of moved) console.log(`- ${m}`);
    if (!shouldWrite) console.log('\nRun with --write to apply.');
  }
  process.exit(0);
}

// --- already finalized ------------------------------------------------------
if (fs.existsSync(markerPath)) {
  const result = { status: 'already-finalized', cleanupDir: cfg.cleanupDir, marker: cfg.marker };
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(`Already graduated. One-time files live in ${cfg.cleanupDir}/. Remove that folder when ready, or run --restore to undo.`);
  process.exit(0);
}

const planned = cfg.oneTimeFiles.filter(graduateFile);

// --- propose (default) ------------------------------------------------------
if (!shouldWrite) {
  const result = { status: 'preview', cleanupDir: cfg.cleanupDir, willMove: planned };
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Graduation preview for ${target}`);
    console.log(`These one-time bootstrap files would move into ${cfg.cleanupDir}/ (then you delete that folder):`);
    for (const f of planned) console.log(`- ${f}`);
    if (!planned.length) console.log('- (none found; nothing to graduate)');
    console.log(`\nApply with: node .vbkit-scripts/vibekit-finalize.mjs ${args[0] && !args[0].startsWith('--') ? args[0] : '.'} --write --yes`);
    console.log('Undo later with: --restore --write');
  }
  process.exit(0);
}

// --- write ------------------------------------------------------------------
if (!yes) fail('refusing to write without --yes. Preview first, then re-run with --write --yes.');
if (!planned.length) {
  if (json) console.log(JSON.stringify({ status: 'noop', moved: [] }, null, 2));
  else console.log('Nothing to graduate; no one-time files found.');
  process.exit(0);
}

fs.mkdirSync(cleanupRoot, { recursive: true });
const moved = [];
for (const rel of planned) {
  fs.renameSync(path.join(target, rel), path.join(cleanupRoot, rel));
  moved.push(rel);
}

const restoreDoc = `# Safe to delete

These files were one-time setup helpers for Minimal Vibe Coding Kit. Init and the
first prompt are complete, so they are no longer needed in this project.

Graduated files:
${moved.map((m) => `- ${m}`).join('\n')}

## Options

- Delete this whole \`${cfg.cleanupDir}/\` folder when you are happy with the setup.
- Or restore everything to the repo root:

\`\`\`bash
node .vbkit-scripts/vibekit-finalize.mjs . --restore --write
\`\`\`

The durable project map is \`backbone.yml\`; you do not need these files to keep working.
`;
fs.writeFileSync(path.join(cleanupRoot, 'RESTORE.md'), restoreDoc);
fs.mkdirSync(path.dirname(markerPath), { recursive: true });
fs.writeFileSync(markerPath, `finalized_at: ${new Date().toISOString()}\ncleanup_dir: ${cfg.cleanupDir}\nmoved: ${moved.length}\n`);

const result = { status: 'finalized', cleanupDir: cfg.cleanupDir, moved };
if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Graduated ${moved.length} one-time file(s) into ${cfg.cleanupDir}/:`);
  for (const m of moved) console.log(`- ${m}`);
  console.log(`\nReview ${cfg.cleanupDir}/RESTORE.md, then delete the folder when ready. Undo with --restore --write.`);
}
