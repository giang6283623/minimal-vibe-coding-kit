#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const target = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const json = args.includes('--json');
const writeReport = args.includes('--write-report');

function exists(rel) { return fs.existsSync(path.join(target, rel)); }
function read(rel) { return fs.readFileSync(path.join(target, rel), 'utf8'); }
function readJson(rel) {
  try { return JSON.parse(read(rel)); } catch { return null; }
}

function listFiles(dir) {
  const root = path.join(target, dir);
  if (!fs.existsSync(root)) return [];
  const out = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.push(path.relative(target, child).replaceAll(path.sep, '/'));
    }
  }
  walk(root);
  return out;
}

function matchValue(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^\\s*${escaped}:\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1].replace(/^["']|["']$/g, '') : null;
}

function parseBackbone() {
  if (!exists('backbone.yml')) return null;
  const text = read('backbone.yml');
  return {
    text,
    templateStatus: matchValue(text, 'template_status'),
    validate: matchValue(text, 'validate'),
    protectedPaths: listUnderKey(text, 'protected_paths'),
    editablePaths: listUnderKey(text, 'editable_paths')
  };
}

function listUnderKey(text, key) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.match(new RegExp(`^\\s*${key}:`)));
  if (idx < 0) return [];
  const indent = lines[idx].match(/^\s*/)[0].length;
  const inline = lines[idx].split(':').slice(1).join(':').trim();
  if (inline.startsWith('[') && inline.endsWith(']')) {
    return inline.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
  }
  const out = [];
  for (const line of lines.slice(idx + 1)) {
    if (!line.trim()) continue;
    const currentIndent = line.match(/^\s*/)[0].length;
    if (currentIndent <= indent) break;
    const item = line.match(/^\s*-\s+(.+?)\s*$/);
    if (item) out.push(item[1].replace(/^["']|["']$/g, ''));
  }
  return out;
}

function countManaged(rel) {
  if (!exists(rel)) return null;
  const text = read(rel);
  const begin = (text.match(/BEGIN: minimal-vibe-coding-kit/g) || []).length;
  const end = (text.match(/END: minimal-vibe-coding-kit/g) || []).length;
  return { begin, end, ok: begin <= 1 && end <= 1 && begin === end };
}

function commandMap() {
  const pkg = readJson('package.json');
  const scripts = pkg?.scripts || {};
  const out = {};
  for (const name of ['install', 'test', 'lint', 'typecheck', 'build']) {
    if (name === 'install') out.install = exists('package.json') ? 'package manager install' : null;
    else out[name] = scripts[name] ? `npm run ${name}` : null;
  }
  const backbone = parseBackbone();
  if (backbone?.validate) out.validate = backbone.validate;
  else if (scripts.validate) out.validate = 'npm run validate';
  else out.validate = null;
  return out;
}

function detectStack() {
  const pkg = readJson('package.json');
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const stack = [];
  if (deps.next || exists('next.config.js') || exists('next.config.mjs')) stack.push('Next.js');
  if (exists('wp-config.php') || exists('wp-content')) stack.push('WordPress');
  if (deps.react) stack.push('React');
  if (exists('pyproject.toml') || exists('requirements.txt')) stack.push('Python');
  if (exists('composer.json')) {
    const composer = readJson('composer.json');
    if (composer?.require?.['laravel/framework']) stack.push('Laravel');
    else stack.push('PHP/Composer');
  }
  if (exists('go.mod')) stack.push('Go');
  if (exists('Cargo.toml')) stack.push('Rust');
  if (exists('Dockerfile') || exists('docker-compose.yml') || exists('compose.yml')) stack.push('Docker');
  if (!stack.length && pkg) stack.push('Node.js');
  return stack.length ? stack : ['unknown'];
}

function runNodeScript(rel, extra = []) {
  const script = path.join(target, rel);
  if (!fs.existsSync(script)) return { found: false, status: null, output: 'missing' };
  const result = spawnSync(process.execPath, [script, target, ...extra], { encoding: 'utf8' });
  return {
    found: true,
    status: result.status ?? 1,
    output: (result.stdout || result.stderr || '').trim()
  };
}

function runProbe() {
  const nodeProbeRel = '.vibekit/scripts/agentshield-probe.mjs';
  const nodeProbe = path.join(target, nodeProbeRel);
  if (fs.existsSync(nodeProbe)) {
    const result = spawnSync(process.execPath, [nodeProbe, target, '--json'], { encoding: 'utf8' });
    return {
      found: true,
      command: `node ${nodeProbeRel}`,
      status: result.status ?? 1,
      output: (result.stdout || result.stderr || '').trim()
    };
  }

  const probe = path.join(target, '.vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py');
  if (!fs.existsSync(probe)) return { found: false, status: null, output: 'missing' };
  for (const python of ['python', 'python3']) {
    const result = spawnSync(python, [probe, target, '--json'], { encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') continue;
    return {
      found: true,
      command: python,
      status: result.status ?? 1,
      output: (result.stdout || result.stderr || '').trim()
    };
  }
  return { found: true, command: 'python/python3', status: 1, output: 'python executable not found' };
}

function statusLine(ok, label, detail) {
  return `${ok ? 'PASS' : 'WARN'} ${label}${detail ? ` - ${detail}` : ''}`;
}

const TRASH_INSTALL_HINT = 'macOS 14+ has it built in; older macOS: brew install trash; Linux: sudo apt install trash-cli; any OS with Node: npm i -g trash-cli';

function trashAvailable() {
  const result = spawnSync('trash', ['--help'], { encoding: 'utf8' });
  return !(result.error && result.error.code === 'ENOENT');
}

const backbone = parseBackbone();
const packageJson = readJson('package.json');
const isKitTemplate = packageJson?.name === 'minimal-vibe-coding-kit';
const kitVersion = isKitTemplate
  ? packageJson?.version || 'unknown'
  : exists('.vibekit/KIT_VERSION') ? read('.vibekit/KIT_VERSION').trim() : 'unknown';
const surfaces = {
  agents: exists('AGENTS.md'),
  claude: exists('CLAUDE.md') || exists('.vibekit/init/CLAUDE-template.md') || exists('.claude'),
  cursor: exists('.cursor/rules'),
  codex: exists('.agents') || exists('.codex-plugin/plugin.json'),
  grok: exists('.grok')
};
const managedBlocks = {
  AGENTS: countManaged('AGENTS.md'),
  CLAUDE: countManaged('CLAUDE.md'),
  gitignore: countManaged('.gitignore')
};
const protectedNeedles = ['.env', 'secret', 'token', 'node_modules', 'dist', 'build', 'coverage', 'lock'];
const protectedSane = protectedNeedles.every((needle) => (backbone?.protectedPaths || []).some((item) => item.includes(needle)));
const legacySurfaces = [
  '.claude/agent',
  '.claude/command',
  '.cursor/agent',
  '.cursor/command'
].filter(exists);
const nativeReasoningSkills = ['clearthought', 'sequential-thinking', 'reviewing-4p-priorities'];
const nativeSkillSurfaces = {
  shared: '.vibekit/skills',
  claude: '.claude/skills',
  codex: '.agents/skills',
  cursor: '.cursor/skills',
  grok: '.grok/skills'
};
const missingNativeSkills = [];
for (const [surface, dir] of Object.entries(nativeSkillSurfaces)) {
  for (const skill of nativeReasoningSkills) {
    if (!exists(`${dir}/${skill}/SKILL.md`)) missingNativeSkills.push(`${surface}:${skill}`);
  }
}
const commands = commandMap();
const validation = runNodeScript('.vibekit/scripts/validate-kit.mjs');
const probe = runProbe();
const hasTrash = trashAvailable();
const risks = [];

if (!hasTrash) risks.push(`trash command not found; agents fall back to asking before rm. Install it for recoverable deletes (${TRASH_INSTALL_HINT}).`);

if (!backbone) risks.push('backbone.yml is missing.');
else if (backbone.templateStatus !== 'initialized' && !isKitTemplate) risks.push(`backbone.yml is ${backbone.templateStatus || 'unknown'}; run init before relying on it.`);
if (!Object.values(surfaces).some(Boolean)) risks.push('No AI agent surfaces were detected.');
if (missingNativeSkills.length) risks.push(`Native reasoning skill mirrors are missing: ${missingNativeSkills.join(', ')}.`);
if (legacySurfaces.length) risks.push(`Legacy local agent/command folders remain but are excluded from install/package: ${legacySurfaces.join(', ')}.`);
for (const [name, result] of Object.entries(managedBlocks)) {
  if (result && !result.ok) risks.push(`${name} has duplicated or unbalanced managed block markers.`);
}
if (!protectedSane) risks.push('protected_paths is missing one or more common secret/generated path guards.');
if (validation.found && validation.status !== 0) risks.push('validation command failed.');
if (probe.found && probe.status !== 0) risks.push('AgentShield probe failed.');
if (!risks.length) risks.push('No immediate structural risks detected by mvck doctor.');

const report = {
  generatedAt: new Date().toISOString(),
  target,
  projectSummary: {
    name: packageJson?.name || path.basename(target),
    stack: detectStack(),
    backboneStatus: backbone?.templateStatus || 'missing',
    kitTemplate: isKitTemplate,
    kitVersion
  },
  safeCommands: commands,
  editablePaths: backbone?.editablePaths || [],
  protectedPaths: backbone?.protectedPaths || [],
  agentSurfaces: surfaces,
  managedBlocks,
  legacySurfaces,
  nativeReasoningSkills: {
    names: nativeReasoningSkills,
    missing: missingNativeSkills
  },
  validation: {
    found: validation.found,
    status: validation.status
  },
  agentShieldProbe: {
    found: probe.found,
    command: probe.command,
    status: probe.status
  },
  safeDelete: {
    trashAvailable: hasTrash,
    installHint: hasTrash ? null : TRASH_INSTALL_HINT
  },
  aiRulesLoaded: {
    sharedSkills: listFiles('.vibekit/skills').filter((f) => f.endsWith('SKILL.md')).length,
    claudeSkills: listFiles('.claude/skills').filter((f) => f.endsWith('SKILL.md')).length,
    codexSkills: listFiles('.agents/skills').filter((f) => f.endsWith('SKILL.md')).length,
    cursorSkills: listFiles('.cursor/skills').filter((f) => f.endsWith('SKILL.md')).length,
    cursorRules: listFiles('.cursor/rules').filter((f) => f.endsWith('.mdc')).length,
    grokSkills: listFiles('.grok/skills').filter((f) => f.endsWith('SKILL.md')).length,
    grokRules: listFiles('.grok/rules').filter((f) => f.endsWith('.md')).length
  },
  recommendedFirstPrompt: 'Read AGENTS.md and backbone.yml, run mvck doctor ., then propose a small safe plan before editing.',
  knownRisks: risks
};

function renderMarkdown(data) {
  const checks = [
    statusLine(Boolean(backbone), 'backbone.yml exists', data.projectSummary.backboneStatus),
    statusLine(data.projectSummary.backboneStatus === 'initialized' || data.projectSummary.kitTemplate, 'backbone initialized or kit template', data.projectSummary.backboneStatus),
    statusLine(Boolean(commands.validate), 'validation command detected', commands.validate || 'missing'),
    statusLine(protectedSane, 'protected paths are sane', `${data.protectedPaths.length} entries`),
    statusLine(validation.found && validation.status === 0, 'validation runs', validation.found ? `exit ${validation.status}` : 'missing'),
    statusLine(probe.found && probe.status === 0, 'AgentShield probe runs', probe.found ? `exit ${probe.status}` : 'missing'),
    statusLine(hasTrash, 'trash command available for safe deletes', hasTrash ? 'deletions are recoverable' : TRASH_INSTALL_HINT)
  ];

  return `# Vibe Report

Generated: ${data.generatedAt}

## Project summary

- Name: ${data.projectSummary.name}
- Detected stack: ${data.projectSummary.stack.join(', ')}
- Backbone status: ${data.projectSummary.backboneStatus}
- Kit template source: ${data.projectSummary.kitTemplate ? 'yes' : 'no'}
- Kit version: ${data.projectSummary.kitVersion} (update with: npx --yes minimal-vibe-coding-kit@latest update .)

## Doctor checks

${checks.map((line) => `- ${line}`).join('\n')}

## Safe commands

${Object.entries(data.safeCommands).map(([name, command]) => `- ${name}: ${command || 'not detected'}`).join('\n')}

## Editable paths

${(data.editablePaths.length ? data.editablePaths : ['not declared']).map((item) => `- ${item}`).join('\n')}

## Protected paths

${(data.protectedPaths.length ? data.protectedPaths : ['not declared']).map((item) => `- ${item}`).join('\n')}

## AI rules loaded

- AGENTS.md: ${data.agentSurfaces.agents ? 'yes' : 'no'}
- Claude surface: ${data.agentSurfaces.claude ? 'yes' : 'no'}
- Cursor surface: ${data.agentSurfaces.cursor ? 'yes' : 'no'}
- Codex surface: ${data.agentSurfaces.codex ? 'yes' : 'no'}
- Grok surface: ${data.agentSurfaces.grok ? 'yes' : 'no'}
- Shared skills: ${data.aiRulesLoaded.sharedSkills}
- Claude skills: ${data.aiRulesLoaded.claudeSkills}
- Codex skills: ${data.aiRulesLoaded.codexSkills}
- Cursor skills: ${data.aiRulesLoaded.cursorSkills}
- Cursor rules: ${data.aiRulesLoaded.cursorRules}
- Grok skills: ${data.aiRulesLoaded.grokSkills}
- Grok rules: ${data.aiRulesLoaded.grokRules}

## Native reasoning skills

${data.nativeReasoningSkills.names.map((skill) => `- ${skill}: ${data.nativeReasoningSkills.missing.some((item) => item.endsWith(`:${skill}`)) ? 'missing on one or more surfaces' : 'available on shared, Claude, Codex, Cursor, and Grok'}`).join('\n')}

## Recommended first prompt

${data.recommendedFirstPrompt}

## Known risks

${data.knownRisks.map((risk) => `- ${risk}`).join('\n')}
`;
}

if (json) console.log(JSON.stringify(report, null, 2));
else console.log(renderMarkdown(report));

if (writeReport) {
  const out = path.join(target, 'VIBE_REPORT.md');
  fs.writeFileSync(out, renderMarkdown(report));
  if (!json) console.log(`\nWrote ${path.relative(target, out)}`);
}
