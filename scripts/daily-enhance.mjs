#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const target = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const writeReport = args.includes('--write-report');
const now = new Date();

function exists(rel) { return fs.existsSync(path.join(target, rel)); }
function list(dir) {
  const p = path.join(target, dir);
  if (!fs.existsSync(p)) return [];
  const out = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.push(path.relative(target, child).replaceAll(path.sep, '/'));
    }
  }
  walk(p);
  return out;
}

const checks = [];
for (const rel of ['backbone.yml', 'AGENTS.md', 'FIRST_TIME_INIT.md', 'skills/autoresearch-coding/SKILL.md', 'skills/agentshield-security-review/SKILL.md']) {
  checks.push(`- ${rel}: ${exists(rel) ? 'found' : 'missing'}`);
}

const skills = list('skills').filter((f) => f.endsWith('SKILL.md'));
const claudeSkills = list('.claude/skills').filter((f) => f.endsWith('SKILL.md'));
const codexSkills = list('.agents/skills').filter((f) => f.endsWith('SKILL.md'));
const cursorRules = list('.cursor/rules').filter((f) => f.endsWith('.mdc'));

let validation = 'not run';
const validator = path.join(target, 'scripts/validate-kit.mjs');
if (fs.existsSync(validator)) {
  const result = spawnSync(process.execPath, [validator, target], { encoding: 'utf8' });
  validation = result.stdout.trim() || result.stderr.trim() || `exit ${result.status}`;
}

const suggestions = [];
if (!exists('.claude/skills/agentshield-security-review/SKILL.md')) suggestions.push('Add Claude AgentShield skill shim.');
if (!exists('.agents/skills/agentshield-security-review/SKILL.md')) suggestions.push('Add Codex AgentShield skill shim.');
if (!exists('.cursor/rules/020-security-agentshield.mdc')) suggestions.push('Add Cursor AgentShield security rule.');
if (skills.length > 12) suggestions.push('Review skill descriptions for progressive disclosure; keep trigger text concise.');
if (!exists('.github/workflows/vibekit-validate.yml')) suggestions.push('Add CI validation for agent surfaces.');
if (!suggestions.length) suggestions.push('No structural gaps found. Review docs for stale project-specific examples and run AgentShield full scan when npm is available.');

const report = `# Daily Minimal Vibe Coding Kit report\n\nGenerated: ${now.toISOString()}\n\n## Required files\n\n${checks.join('\n')}\n\n## Surface counts\n\n- Shared skills: ${skills.length}\n- Claude skill shims: ${claudeSkills.length}\n- Codex skill shims: ${codexSkills.length}\n- Cursor rules: ${cursorRules.length}\n\n## Validation output\n\n\`\`\`text\n${validation}\n\`\`\`\n\n## Suggested next improvements\n\n${suggestions.map((s) => `- ${s}`).join('\n')}\n\n## Write policy\n\nThis report is propose-only. An agent may turn suggestions into a diff, but must wait for explicit user approval before writing.\n`;

console.log(report);

if (writeReport) {
  const dir = path.join(target, '.vibekit', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const name = `daily-${now.toISOString().slice(0, 10)}.md`;
  fs.writeFileSync(path.join(dir, name), report);
  console.log(`\nWrote ${path.relative(target, path.join(dir, name))}`);
}
