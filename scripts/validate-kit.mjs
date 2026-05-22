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

const required = [
  'AGENTS.md', 'CLAUDE-template.md', 'FIRST_TIME_INIT.md', 'FIRST_PROMPT.md', 'backbone.yml',
  'scripts/mvck.mjs', 'scripts/init-backbone.mjs', 'scripts/daily-enhance.mjs', 'scripts/validate-kit.mjs',
  'scripts/doctor.mjs', 'scripts/test-install.mjs', 'scripts/agentshield-probe.mjs', 'scripts/pack-dry-run.mjs',
  'skills/autoresearch-coding/SKILL.md', 'skills/agentshield-security-review/SKILL.md', 'skills/daily-workflow-curator/SKILL.md', 'skills/vibekit-init/SKILL.md',
  'skills/clearthought/SKILL.md', 'skills/sequential-thinking/SKILL.md', 'skills/reviewing-4p-priorities/SKILL.md',
  '.claude/skills/autoresearch-coding/SKILL.md', '.claude/skills/agentshield-security-review/SKILL.md',
  '.claude/skills/clearthought/SKILL.md', '.claude/skills/sequential-thinking/SKILL.md', '.claude/skills/reviewing-4p-priorities/SKILL.md',
  '.cursor/rules/001-vibe-core.mdc', '.cursor/skills/clearthought/SKILL.md', '.cursor/skills/sequential-thinking/SKILL.md', '.cursor/skills/reviewing-4p-priorities/SKILL.md',
  '.agents/skills/autoresearch-coding/SKILL.md', '.agents/skills/clearthought/SKILL.md', '.agents/skills/sequential-thinking/SKILL.md', '.agents/skills/reviewing-4p-priorities/SKILL.md',
  '.codex-plugin/plugin.json'
];

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
  ]
};

for (const surface of ['skills', '.claude/skills', '.cursor/skills', '.agents/skills']) {
  for (const [skill, files] of Object.entries(reasoningSkillResources)) {
    for (const file of files) required.push(`${surface}/${skill}/${file}`);
  }
}

for (const rel of required) exists(rel) ? ok(`required file ${rel}`) : fail(`missing required file ${rel}`);
if (exists('README.md')) ok('optional README.md present');
else console.log('INFO optional README.md not present in target project');

for (const rel of ['package.json', '.claude/settings.json', '.cursor/settings.json', '.codex-plugin/plugin.json']) {
  if (!exists(rel)) continue;
  try { JSON.parse(read(rel)); ok(`valid JSON ${rel}`); } catch (error) { fail(`invalid JSON ${rel}: ${error.message}`); }
}

const pkg = exists('package.json') ? readJson('package.json') : null;
if (pkg?.name === 'minimal-vibe-coding-kit') {
  for (const rel of ['SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', '.github/dependabot.yml', 'docs/backbone.schema.json']) {
    exists(rel) ? ok(`release safety file ${rel}`) : fail(`missing release safety file ${rel}`);
  }
}

if (exists('CLAUDE-template.md')) {
  const lines = read('CLAUDE-template.md').split(/\r?\n/).length;
  if (lines <= 120) ok(`CLAUDE-template.md is concise (${lines} lines)`);
  else warn(`CLAUDE-template.md is long (${lines} lines); target <= 120`);
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
    'conventions',
    'conventions.review_required_before_write',
    'conventions.resources.rule',
    'conventions.localization.rule',
    'commands.validate',
    'policy.protected_paths',
    'agent_surfaces',
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
  { pattern: 'Bash(*)', message: 'unrestricted Bash permission marker' },
  { pattern: 'curl | sh', message: 'curl pipe to shell marker' },
  { pattern: 'wget | sh', message: 'wget pipe to shell marker' },
  { pattern: 'ignore previous instructions', message: 'prompt injection phrase' }
];

const scanDirs = ['.claude', '.cursor', '.agents', '.codex-plugin', 'skills', 'commands', 'AGENTS.md', 'CLAUDE-template.md'];
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

const probe = path.join(root, 'skills/agentshield-security-review/scripts/agentshield_repo_probe.py');
if (fs.existsSync(probe)) {
  let result = spawnSync('python', [probe, root, '--json'], { encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') result = spawnSync('python3', [probe, root, '--json'], { encoding: 'utf8' });
  if (result.status === 0) ok('AgentShield repo probe runs');
  else warn(`AgentShield probe did not run: ${result.stderr || result.stdout}`);
}

console.log(`\nValidation summary: ${failures} failures, ${warnings} warnings.`);
process.exit(failures ? 1 : 0);
