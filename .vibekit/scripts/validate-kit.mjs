#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || process.cwd());
let failures = 0;
let warnings = 0;

function ok(msg) { console.log(`PASS ${msg}`); }
function warn(msg) { warnings += 1; console.log(`WARN ${msg}`); }
function fail(msg) { failures += 1; console.log(`FAIL ${msg}`); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function readJson(rel) {
  try { return JSON.parse(read(rel)); } catch { return null; }
}
function requireText(rel, snippet, msg) {
  if (!exists(rel)) return;
  read(rel).includes(snippet) ? ok(msg) : fail(`${rel} missing ${msg}`);
}
function listFiles(rel) {
  const base = path.join(root, rel);
  const out = [];
  function inner(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) inner(child);
      else out.push(path.relative(base, child).replaceAll(path.sep, '/'));
    }
  }
  try { inner(base); } catch {}
  return out.sort();
}

// Surface presence: end-user repos may install only some profiles, so
// per-surface files are required only when that surface is installed.
// The kit source repo always validates every surface.
const isKitSourceRepo = readJson('package.json')?.name === 'minimal-vibe-coding-kit';
const surfacePresent = {
  claude: isKitSourceRepo || exists('.claude'),
  cursor: isKitSourceRepo || exists('.cursor'),
  codex: isKitSourceRepo || exists('.agents') || exists('.codex') || exists('.codex-plugin'),
  grok: isKitSourceRepo || exists('.grok')
};
for (const [surface, present] of Object.entries(surfacePresent)) {
  if (!present) console.log(`INFO surface ${surface} not installed; skipping its checks`);
}

// Skill registries come from the central distribution manifest shared with
// the installer; validation fails closed when the manifest is missing.
const MANIFEST_REL = '.vibekit/skills/skills-manifest.json';
const skillsManifest = readJson(MANIFEST_REL);
if (!skillsManifest || !Array.isArray(skillsManifest.skills)) {
  fail(`missing or invalid ${MANIFEST_REL}; installer and validator registries derive from it`);
}
const manifestSkills = skillsManifest?.skills ?? [];
const KIT_SKILLS = manifestSkills.map((s) => s.name);
const CURSOR_KIT_SKILLS = manifestSkills.filter((s) => (s.surfaces || []).includes('cursor')).map((s) => s.name);

// Fail closed: a canonical skill directory that is not in the manifest would
// otherwise escape mirror, package, and install validation entirely.
const canonicalSkillDirs = exists('.vibekit/skills')
  ? fs.readdirSync(path.join(root, '.vibekit/skills'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];
for (const dir of canonicalSkillDirs) {
  if (KIT_SKILLS.includes(dir)) continue;
  const msg = `canonical skill dir .vibekit/skills/${dir} is not registered in ${MANIFEST_REL}`;
  if (isKitSourceRepo) fail(msg);
  else warn(`${msg}; register it to get mirror, package, and install validation`);
}
for (const skill of KIT_SKILLS) {
  if (!canonicalSkillDirs.includes(skill)) fail(`manifest skill ${skill} has no canonical dir .vibekit/skills/${skill}`);
}

const required = [
  'AGENTS.md', '.vibekit/init/CLAUDE-template.md', '.vibekit/init/FIRST_TIME_INIT.md', '.vibekit/init/FIRST_PROMPT.md', 'backbone.yml',
  '.vibekit/scripts/mvck.mjs', '.vibekit/scripts/init-backbone.mjs', '.vibekit/scripts/daily-enhance.mjs', '.vibekit/scripts/validate-kit.mjs',
  '.vibekit/scripts/doctor.mjs', '.vibekit/scripts/agentshield-probe.mjs', '.vibekit/scripts/vibekit-finalize.mjs',
  ...KIT_SKILLS.map((skill) => `.vibekit/skills/${skill}/SKILL.md`),
  '.vibekit/docs/templates/PRD_TEMPLATE.md', '.vibekit/docs/templates/CONTEXT_TEMPLATE.md'
];
if (surfacePresent.claude) {
  required.push(...KIT_SKILLS.map((skill) => `.claude/skills/${skill}/SKILL.md`));
}
if (surfacePresent.cursor) {
  required.push('.cursor/rules/001-vibe-core.mdc', '.cursor/cli.json',
    ...CURSOR_KIT_SKILLS.map((skill) => `.cursor/skills/${skill}/SKILL.md`));
}
if (surfacePresent.codex) {
  required.push('.codex/README.md', '.codex/config.example.toml', '.codex/rules/vibekit.rules', '.codex-plugin/plugin.json',
    ...KIT_SKILLS.map((skill) => `.agents/skills/${skill}/SKILL.md`));
}
if (surfacePresent.grok) {
  required.push('.grok/README.md', '.grok/config.example.toml', '.grok/config.toml',
    '.grok/rules/vibe-core.md', '.grok/rules/security.md', '.grok/rules/safe-delete.md',
    ...KIT_SKILLS.map((skill) => `.grok/skills/${skill}/SKILL.md`));
}

const reasoningSkillResources = {
  'clearthought': [
    'references/output-schemas.md',
    'references/parameter-reference.md',
    'examples/sequential-thinking.md',
    'examples/decision-framework.md',
    'examples/metagame-examples.md'
  ],
  'sequential-thinking': [
    'references/output-schema.md',
    'references/parameters.md',
    'references/patterns.md',
    'examples/linear-reasoning.md',
    'examples/revision-pattern.md',
    'examples/branching-exploration.md',
    'examples/adaptive-depth.md'
  ],
  'reviewing-4p-priorities': [
    'examples.md'
  ],
  'path-sensitive-shell-safety': [
    'references/workflow.md'
  ]
};

const reasoningSurfaceDirs = ['.vibekit/skills'];
if (surfacePresent.claude) reasoningSurfaceDirs.push('.claude/skills');
if (surfacePresent.cursor) reasoningSurfaceDirs.push('.cursor/skills');
if (surfacePresent.codex) reasoningSurfaceDirs.push('.agents/skills');
if (surfacePresent.grok) reasoningSurfaceDirs.push('.grok/skills');
for (const surface of reasoningSurfaceDirs) {
  for (const [skill, files] of Object.entries(reasoningSkillResources)) {
    for (const file of files) required.push(`${surface}/${skill}/${file}`);
  }
}

for (const rel of required) exists(rel) ? ok(`required file ${rel}`) : fail(`missing required file ${rel}`);
if (exists('README.md')) ok('optional README.md present');
else console.log('INFO optional README.md not present in target project');

// Kit-maintainer files: required in the kit source repo, intentionally absent in end-user installs.
if (isKitSourceRepo) {
  for (const rel of ['.vibekit/scripts/test-install.mjs', '.vibekit/scripts/pack-dry-run.mjs', '.vibekit/docs/RESEARCH_NOTES.md', '.vibekit/docs/AUTORESEARCH_LEDGER.md']) {
    exists(rel) ? ok(`kit-source file ${rel}`) : fail(`missing kit-source file ${rel}`);
  }
}

requireText('.github/workflows/vibekit-validate.yml', 'npm test', 'CI workflow runs npm test');
requireText('.github/workflows/vibekit-validate.yml', 'npm run security:probe', 'CI workflow runs AgentShield probe');
requireText('.github/workflows/vibekit-validate.yml', 'npm run pack:dry-run', 'CI workflow verifies npm package contents');
requireText('.vibekit/docs/AUTORESEARCH_LEDGER.md', 'node .vibekit/scripts/validate-kit.mjs .', 'autoresearch ledger documents validation command');
requireText('.cursor/rules/020-security-agentshield.mdc', 'node .vibekit/scripts/agentshield-probe.mjs .', 'Cursor security rule uses Node AgentShield probe wrapper');
requireText('.vibekit/scripts/doctor.mjs', '.vibekit/scripts/agentshield-probe.mjs', 'doctor uses Node AgentShield probe wrapper');

if (exists('.vibekit/docs/AUTORESEARCH_LEDGER.md')) {
  const ledgerText = read('.vibekit/docs/AUTORESEARCH_LEDGER.md');
  const stalePhrases = ['pending during build', 'BUILD_REPORT.md'];
  const stalePhrase = stalePhrases.find((phrase) => ledgerText.includes(phrase));
  stalePhrase ? fail(`.vibekit/docs/AUTORESEARCH_LEDGER.md contains stale phrase: ${stalePhrase}`) : ok('autoresearch ledger has no stale build placeholders');
}

// Mirror registry is derived from the manifest so a skill cannot be
// registered for install yet skipped by parity validation.
const MANIFEST_SURFACE_DIRS = { claude: '.claude/skills', cursor: '.cursor/skills', codex: '.agents/skills', grok: '.grok/skills' };
const skillMirrors = {};
for (const skill of manifestSkills) {
  skillMirrors[skill.name] = (skill.surfaces || [])
    .filter((surface) => MANIFEST_SURFACE_DIRS[surface])
    .map((surface) => `${MANIFEST_SURFACE_DIRS[surface]}/${skill.name}`);
}

function validateSkillMirror(sourceRel, mirrorRel) {
  if (!exists(sourceRel)) { fail(`missing canonical skill dir ${sourceRel}`); return; }
  if (!exists(mirrorRel)) { fail(`missing skill mirror dir ${mirrorRel}`); return; }

  const sourceFiles = listFiles(sourceRel);
  const mirrorFiles = listFiles(mirrorRel);
  const sourceSet = new Set(sourceFiles);
  const mirrorSet = new Set(mirrorFiles);
  let mismatches = 0;

  for (const file of sourceFiles) {
    if (!mirrorSet.has(file)) {
      mismatches += 1;
      fail(`skill mirror ${mirrorRel} missing ${file}`);
      continue;
    }
    const sourceText = fs.readFileSync(path.join(root, sourceRel, file), 'utf8');
    const mirrorText = fs.readFileSync(path.join(root, mirrorRel, file), 'utf8');
    if (sourceText !== mirrorText) {
      mismatches += 1;
      fail(`skill mirror ${mirrorRel}/${file} differs from ${sourceRel}/${file}`);
    }
  }

  for (const file of mirrorFiles) {
    if (!sourceSet.has(file)) {
      mismatches += 1;
      fail(`skill mirror ${mirrorRel} has extra file ${file}`);
    }
  }

  if (mismatches === 0) ok(`skill mirror ${mirrorRel} matches ${sourceRel} (${sourceFiles.length} files)`);
}

const mirrorSurface = (mirror) => mirror.startsWith('.claude/') ? 'claude'
  : mirror.startsWith('.cursor/') ? 'cursor'
  : mirror.startsWith('.agents/') ? 'codex'
  : 'grok';
for (const [skill, mirrors] of Object.entries(skillMirrors)) {
  for (const mirror of mirrors) {
    if (!surfacePresent[mirrorSurface(mirror)]) continue;
    validateSkillMirror(`.vibekit/skills/${skill}`, mirror);
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

for (const surface of ['.vibekit/skills', '.claude/skills', '.cursor/skills', '.agents/skills', '.grok/skills']) {
  if (!exists(surface)) continue;
  for (const file of listFiles(surface).filter((f) => f.endsWith('SKILL.md'))) {
    const rel = `${surface}/${file}`;
    const fm = parseFrontmatter(read(rel));
    if (fm && fm.name && fm.description) ok(`skill frontmatter has name + description: ${rel}`);
    else fail(`skill frontmatter missing name/description: ${rel}`);
    const skillDir = path.dirname(file);
    if (fm && fm.name === skillDir) ok(`skill name matches directory: ${rel}`);
    else fail(`skill name "${fm?.name ?? ''}" does not match directory "${skillDir}": ${rel}`);
  }
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

if (exists('.vibekit/commands')) {
  const canonicalCmds = listFiles('.vibekit/commands').filter((f) => f.endsWith('.md'));
  const cmdMirrors = {};
  if (surfacePresent.claude) cmdMirrors['.claude/commands'] = true;
  if (surfacePresent.cursor) cmdMirrors['.cursor/commands'] = true;
  for (const [mirrorDir, stripFm] of Object.entries(cmdMirrors)) {
    if (!exists(mirrorDir)) { warn(`command mirror dir missing: ${mirrorDir}`); continue; }
    for (const file of canonicalCmds) {
      const srcRel = `.vibekit/commands/${file}`;
      const mirRel = `${mirrorDir}/${file}`;
      if (!exists(mirRel)) { fail(`command mirror ${mirRel} missing`); continue; }
      const srcText = read(srcRel).trim();
      const mirText = stripFm ? stripFrontmatter(read(mirRel)) : read(mirRel).trim();
      if (srcText === mirText) ok(`command mirror ${mirRel} matches`);
      else fail(`command mirror ${mirRel} differs from ${srcRel}`);
    }
  }
}

for (const rel of ['package.json', '.claude/settings.json', '.cursor/settings.json', '.cursor/cli.json', '.codex-plugin/plugin.json']) {
  if (!exists(rel)) continue;
  try { JSON.parse(read(rel)); ok(`valid JSON ${rel}`); } catch (error) { fail(`invalid JSON ${rel}: ${error.message}`); }
}

const pkg = exists('package.json') ? readJson('package.json') : null;
if (pkg?.bin && typeof pkg.bin === 'object') {
  for (const [name, target] of Object.entries(pkg.bin)) {
    if (typeof target !== 'string') { fail(`package bin ${name} target must be a string`); continue; }
    exists(target) ? ok(`package bin ${name} target exists: ${target}`) : fail(`package bin ${name} target missing: ${target}`);
  }
}

if (Array.isArray(pkg?.files)) {
  for (const entry of pkg.files) {
    if (typeof entry !== 'string') { fail('package files entry must be a string'); continue; }
    const cleanEntry = entry.replace(/\/+$/, '');
    exists(cleanEntry) ? ok(`package files entry exists: ${entry}`) : fail(`package files entry missing: ${entry}`);
  }
}

if (pkg?.scripts && typeof pkg.scripts === 'object') {
  const scriptTargetRe = /node\s+(?:--check\s+)?((?:\.\/)?(?:\.vibekit\/scripts|bin)\/[A-Za-z0-9._-]+\.(?:mjs|js))/g;
  const targets = new Set();
  for (const command of Object.values(pkg.scripts)) {
    if (typeof command !== 'string') continue;
    let match;
    while ((match = scriptTargetRe.exec(command))) targets.add(match[1].replace(/^\.\//, ''));
  }
  for (const target of [...targets].sort()) {
    exists(target) ? ok(`package script target exists: ${target}`) : fail(`package script references missing file: ${target}`);
  }
}

function extractDenyCategories(denyList) {
  const cats = new Set();
  for (const rule of denyList) {
    const match = rule.match(/^Bash\(([a-z][a-z -]*)/);
    if (match) cats.add(match[1].trim());
  }
  return cats;
}

const claudeSettings = readJson('.claude/settings.json');
const cursorSettings = readJson('.cursor/settings.json');
if (claudeSettings?.permissions?.deny && cursorSettings?.permissions?.deny) {
  const claudeCats = extractDenyCategories(claudeSettings.permissions.deny);
  const cursorCats = extractDenyCategories(cursorSettings.permissions.deny);
  let parity = true;
  for (const cat of claudeCats) {
    if (!cursorCats.has(cat)) { warn(`deny list parity: .claude blocks "${cat}" but .cursor does not`); parity = false; }
  }
  for (const cat of cursorCats) {
    if (!claudeCats.has(cat)) { warn(`deny list parity: .cursor blocks "${cat}" but .claude does not`); parity = false; }
  }
  if (parity) ok(`deny list category parity across .claude and .cursor (${claudeCats.size} categories)`);
}

// Guardrail lint: catches known-dead deny patterns at the syntax level. It does
// not replace native checks — verify semantics with each tool's own validator
// (e.g. `codex execpolicy check`, `grok inspect`).
for (const [rel, settings] of [['.claude/settings.json', claudeSettings], ['.cursor/settings.json', cursorSettings]]) {
  const deny = settings?.permissions?.deny;
  if (!Array.isArray(deny)) continue;
  const piped = deny.filter((rule) => rule.includes('|'));
  piped.length === 0
    ? ok(`${rel} deny rules avoid pipe-spanning patterns (subcommands are matched independently)`)
    : fail(`${rel} deny rules span a pipe and never match: ${piped.join(', ')}`);
  const yesFirst = deny.some((rule) => rule.startsWith('Bash(npx --yes') || rule.startsWith('Bash(npx -y'));
  yesFirst
    ? ok(`${rel} denies leading npx --yes/-y forms`)
    : fail(`${rel} missing deny for leading npx --yes/-y forms`);
}
if (surfacePresent.cursor && exists('.cursor/cli.json')) {
  const cursorCli = readJson('.cursor/cli.json');
  Array.isArray(cursorCli?.permissions?.deny) && cursorCli.permissions.deny.includes('Shell(rm)')
    ? ok('.cursor/cli.json denies Shell(rm)')
    : fail('.cursor/cli.json missing permissions.deny entry Shell(rm)');
}
if (surfacePresent.codex) requireText('.codex/rules/vibekit.rules', 'decision = "forbidden"', 'Codex rules include forbidden decisions');
if (surfacePresent.grok) {
  requireText('.grok/config.toml', '[permission]', 'Grok project config declares [permission] rules');
  requireText('.grok/config.toml', '"Bash(rm *)"', 'Grok project config denies rm');
}

if (pkg?.name === 'minimal-vibe-coding-kit') {
  for (const rel of ['SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.github/dependabot.yml', '.github/workflows/vibekit-validate.yml', '.vibekit/docs/backbone.schema.json']) {
    exists(rel) ? ok(`release safety file ${rel}`) : fail(`missing release safety file ${rel}`);
  }
}

if (exists('.vibekit/init/CLAUDE-template.md')) {
  const lines = read('.vibekit/init/CLAUDE-template.md').split(/\r?\n/).length;
  if (lines <= 120) ok(`.vibekit/init/CLAUDE-template.md is concise (${lines} lines)`);
  else warn(`.vibekit/init/CLAUDE-template.md is long (${lines} lines); target <= 120`);
}

if (exists('backbone.yml')) {
  const text = read('backbone.yml');
  if (text.split(/\r?\n/).length <= 120) ok('backbone.yml template is concise');
  else warn('backbone.yml template is longer than target');
  if (text.includes('template_status:')) ok('backbone.yml has template_status'); else fail('backbone.yml missing template_status');
  validateBackboneSchema(text);
}

function collectYamlKeys(text) {
  const keys = new Set();
  const values = new Map();
  const stack = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim() || line.trimStart().startsWith('- ')) continue;
    const match = line.match(/^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;
    const indent = match[1].length;
    const key = match[2];
    const value = (match[3] || '').trim();
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const full = [...stack.map((item) => item.key), key].join('.');
    keys.add(full);
    values.set(full, value);
    stack.push({ indent, key });
  }
  return { keys, values };
}

function hasListItems(text, keyPath) {
  const parts = keyPath.split('.');
  const key = parts[parts.length - 1];
  const lines = text.split(/\r?\n/);
  const matches = [];
  const stack = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].replace(/\s+#.*$/, '');
    const match = line.match(/^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;
    const indent = match[1].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const full = [...stack.map((item) => item.key), match[2]].join('.');
    if (full === keyPath && match[2] === key) matches.push({ line: i, indent, value: (match[3] || '').trim() });
    stack.push({ indent, key: match[2] });
  }
  if (!matches.length) return false;
  const item = matches[0];
  if (item.value.startsWith('[')) return item.value !== '[]';
  for (const line of lines.slice(item.line + 1)) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= item.indent) return false;
    if (/^\s*-\s+\S/.test(line)) return true;
  }
  return false;
}

function validateBackboneSchema(text) {
  const { keys, values } = collectYamlKeys(text);
  const requiredKeys = [
    'version',
    'meta.template_status',
    'meta.schema_version',
    'project.name',
    'project.primary_language',
    'project.mode',
    'project.context',
    'conventions',
    'conventions.review_required_before_write',
    'conventions.resources.rule',
    'conventions.localization.rule',
    'commands.validate',
    'policy.protected_paths',
    'agent_surfaces',
    'automation.finalize.cleanup_dir',
    'automation.security.probe'
  ];
  for (const key of requiredKeys) keys.has(key) ? ok(`backbone schema key ${key}`) : fail(`backbone missing schema key ${key}`);

  const templateStatus = values.get('meta.template_status');
  if (['initialized', 'uninitialized'].includes(templateStatus)) ok(`backbone template_status is ${templateStatus}`);
  else fail(`backbone template_status must be initialized or uninitialized, got ${templateStatus || 'empty'}`);

  const schemaVersion = values.get('meta.schema_version');
  if (/^\d+$/.test(schemaVersion || '')) ok(`backbone schema_version is ${schemaVersion}`);
  else fail(`backbone schema_version must be numeric, got ${schemaVersion || 'empty'}`);

  const validateCommand = values.get('commands.validate');
  if (validateCommand && validateCommand !== 'null') ok('backbone commands.validate is set');
  else fail('backbone commands.validate is empty');

  hasListItems(text, 'policy.protected_paths') ? ok('backbone protected_paths is non-empty') : fail('backbone protected_paths must be non-empty');

  for (const key of [...keys].filter((k) => k.startsWith('agent_surfaces.') && !k.includes('.', 'agent_surfaces.'.length))) {
    const surfacePath = values.get(key);
    if (!surfacePath || surfacePath === 'null') continue;
    const cleanPath = surfacePath.replace(/^["']|["']$/g, '');
    if (exists(cleanPath)) ok(`agent_surfaces path exists: ${cleanPath}`);
    else if (isKitSourceRepo) fail(`agent_surfaces path missing: ${cleanPath}`);
    else warn(`agent_surfaces path missing: ${cleanPath} (profile-scoped install?)`);
  }
}

for (const rel of ['AGENTS.md', 'CLAUDE.md', '.gitignore']) {
  if (!exists(rel)) continue;
  const text = read(rel);
  const begins = (text.match(/BEGIN: minimal-vibe-coding-kit/g) || []).length;
  const ends = (text.match(/END: minimal-vibe-coding-kit/g) || []).length;
  if (begins === ends && begins <= 1) ok(`${rel} managed block markers are balanced`);
  else fail(`${rel} has duplicate or unbalanced managed block markers (${begins} begin, ${ends} end)`);
}

const riskyPatterns = [
  { pattern: 'Bash' + '(*)', message: 'unrestricted Bash permission marker' },
  { pattern: 'curl' + ' | sh', message: 'curl pipe to shell marker' },
  { pattern: 'wget' + ' | sh', message: 'wget pipe to shell marker' },
  { pattern: 'ignore previous' + ' instructions', message: 'prompt injection phrase' }
];

const scanDirs = ['.claude', '.cursor', '.agents', '.grok', '.codex-plugin', '.vibekit/skills', '.vibekit/commands', '.vibekit/scripts', 'AGENTS.md', '.vibekit/init/CLAUDE-template.md'];
function walk(item) {
  const p = path.join(root, item);
  if (!fs.existsSync(p)) return [];
  const stat = fs.statSync(p);
  if (stat.isFile()) return [p];
  const out = [];
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const child = path.join(p, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.relative(root, child)));
    else out.push(child);
  }
  return out;
}

for (const file of scanDirs.flatMap(walk)) {
  if (!/\.(md|mdc|json|toml|yml|yaml|js|mjs|py|sh)$/i.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const r of riskyPatterns) {
    if (text.includes(r.pattern)) warn(`${path.relative(root, file)} contains ${r.message}`);
  }
}

const probe = path.join(root, '.vibekit/scripts/agentshield-probe.mjs');
if (fs.existsSync(probe)) {
  const result = spawnSync(process.execPath, [probe, root, '--json'], { encoding: 'utf8' });
  if (result.status === 0) ok('AgentShield repo probe runs');
  else warn(`AgentShield probe did not run: ${result.stderr || result.stdout}`);
}

console.log(`\nValidation summary: ${failures} failures, ${warnings} warnings.`);
process.exit(failures ? 1 : 0);
