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

const required = [
  'AGENTS.md', 'CLAUDE-template.md', 'FIRST_TIME_INIT.md', 'FIRST_PROMPT.md', 'backbone.yml',
  'scripts/mvck.mjs', 'scripts/init-backbone.mjs', 'scripts/daily-enhance.mjs', 'scripts/validate-kit.mjs',
  'skills/autoresearch-coding/SKILL.md', 'skills/agentshield-security-review/SKILL.md', 'skills/daily-workflow-curator/SKILL.md', 'skills/vibekit-init/SKILL.md',
  '.claude/skills/autoresearch-coding/SKILL.md', '.claude/skills/agentshield-security-review/SKILL.md',
  '.cursor/rules/001-vibe-core.mdc', '.agents/skills/autoresearch-coding/SKILL.md', '.codex-plugin/plugin.json'
];

for (const rel of required) exists(rel) ? ok(`required file ${rel}`) : fail(`missing required file ${rel}`);
if (exists('README.md')) ok('optional README.md present');
else console.log('INFO optional README.md not present in target project');

for (const rel of ['package.json', '.claude/settings.json', '.codex-plugin/plugin.json']) {
  if (!exists(rel)) continue;
  try { JSON.parse(read(rel)); ok(`valid JSON ${rel}`); } catch (error) { fail(`invalid JSON ${rel}: ${error.message}`); }
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
  const result = spawnSync('python', [probe, root, '--json'], { encoding: 'utf8' });
  if (result.status === 0) ok('AgentShield repo probe runs');
  else warn(`AgentShield probe did not run: ${result.stderr || result.stdout}`);
}

console.log(`\nValidation summary: ${failures} failures, ${warnings} warnings.`);
process.exit(failures ? 1 : 0);
