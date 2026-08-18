#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateControllerContract } from '../skills/agent-control-center/scripts/validate-controller-contract.mjs';

const root = path.resolve(process.argv[2] || process.cwd());
const validatorRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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
function markdownTargets(text) {
  const withoutCode = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
  return [...withoutCode.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)].map((match) => match[1].trim());
}
function markdownPathPart(rawTarget) {
  const target = rawTarget.startsWith('<')
    ? rawTarget.slice(1, rawTarget.indexOf('>'))
    : rawTarget.split(/\s+["']/)[0];
  return target.split(/[?#]/, 1)[0];
}
function validateCanonicalSkillLinks() {
  const base = '.vibekit/skills';
  let checked = 0;
  let broken = 0;
  for (const file of listFiles(base).filter((entry) => entry.endsWith('.md'))) {
    const rel = `${base}/${file}`;
    for (const rawTarget of markdownTargets(read(rel))) {
      const target = markdownPathPart(rawTarget);
      if (!target || target.startsWith('#') || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      checked += 1;
      let decoded = target;
      try { decoded = decodeURIComponent(target); } catch {}
      const resolved = target.startsWith('/')
        ? path.join(root, target)
        : path.resolve(path.dirname(path.join(root, rel)), decoded);
      if (fs.existsSync(resolved)) continue;
      broken += 1;
      fail(`broken local Markdown link ${rel} -> ${rawTarget}`);
    }
  }
  if (broken === 0) ok(`canonical skill Markdown links resolve (${checked} local targets)`);
}

// Surface presence: end-user repos may install only some profiles, so
// per-surface files are required only when that surface is installed.
// The kit source repo always validates every surface.
const isKitSourceRepo = readJson('package.json')?.name === 'minimal-vibe-coding-kit';
const surfacePresent = {
  claude: isKitSourceRepo || exists('.claude'),
  cursor: isKitSourceRepo || exists('.cursor'),
  codex: isKitSourceRepo || exists('.codex') || exists('.codex-plugin'),
  opencode: isKitSourceRepo || exists('.opencode') || exists('opencode.json'),
  grok: isKitSourceRepo || exists('.grok'),
  kimi: isKitSourceRepo || exists('.kimi-code')
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
const skillsForSurface = (surface) => manifestSkills.filter((s) => (s.surfaces || []).includes(surface)).map((s) => s.name);
const CURSOR_KIT_SKILLS = skillsForSurface('cursor');
const KIMI_KIT_SKILLS = skillsForSurface('kimi');
const OPENCODE_KIT_SKILLS = skillsForSurface('opencode');

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
  '.vibekit/scripts/doctor.mjs', '.vibekit/scripts/agentshield-probe.mjs', '.vibekit/scripts/orchestration-preference.mjs',
  '.vibekit/scripts/orchestration-routing.mjs', '.vibekit/scripts/cursor-sdk-adapter.mjs', '.vibekit/scripts/vibekit-finalize.mjs',
  '.vibekit/docs/ORCHESTRATION_MODES.md', '.vibekit/docs/CURSOR_SDK.md',
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
if (surfacePresent.opencode) {
  required.push('.opencode/README.md', 'opencode.json',
    ...OPENCODE_KIT_SKILLS.map((skill) => `.agents/skills/${skill}/SKILL.md`));
}
if (surfacePresent.grok) {
  required.push('.grok/README.md', '.grok/config.example.toml', '.grok/config.toml',
    '.grok/rules/vibe-core.md', '.grok/rules/security.md', '.grok/rules/safe-delete.md',
    ...KIT_SKILLS.map((skill) => `.grok/skills/${skill}/SKILL.md`));
}
if (surfacePresent.kimi) {
  required.push('.kimi-code/README.md',
    ...KIMI_KIT_SKILLS.map((skill) => `.kimi-code/skills/${skill}/SKILL.md`));
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
    'references/advanced-techniques.md',
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
  ],
  'threat-model-security-review': [
    'agents/openai.yaml',
    'references/threat-model-template.md',
    'references/finding-report-template.md',
    'references/validation-safety.md'
  ],
  'graph-engineering-verified-orchestration': [
    'agents/openai.yaml',
    'references/graph-contract.md',
    'references/graph-visualization.md',
    'scripts/render-graph.mjs'
  ],
  'clean-delivery': [
    'agents/openai.yaml',
    'references/story-template.md',
    'references/verification-tiers.md',
    'references/architecture-contract.md',
    'references/proof-return-mapping.md',
    'scripts/validate-story.mjs'
  ],
  'proofline-orchestration': [
    'agents/openai.yaml',
    'references/role-contract.md',
    'references/signal-protocol.md',
    'references/proof-return-schema.md',
    'references/control-matrix.md',
    'references/paseo-adapter.md',
    'scripts/run-proofline-sandbox.mjs',
    'examples/auth-migration-case.json',
    'assets/paseo-config.fragment.json',
    'assets/codex-profiles/proofline-keeper.config.toml',
    'assets/codex-profiles/proofline-wayfinder.config.toml',
    'assets/codex-profiles/proofline-countervoice.config.toml',
    'assets/codex-profiles/proofline-maker.config.toml'
  ],
  'agent-control-center': [
    'agents/openai.yaml',
    'examples/cursor-codex-cursor-workers.json',
    'examples/native-sequential.json',
    'references/controller-modes.md',
    'references/capability-contract.md',
    'references/handoff-contract.md',
    'references/provider-selection.md',
    'references/codex-cli-bridge.md',
    'schemas/controller-response.schema.json',
    'scripts/codex-cli-controller-bridge.mjs',
    'scripts/validate-controller-contract.mjs'
  ],
  'swap-control-center': [
    'agents/openai.yaml',
    'references/examples.md'
  ],
  'the-creator': [
    'agents/openai.yaml'
  ],
  'mermaid': [
    'UPSTREAM-NOTICE.md',
    'references/kit-examples.md',
    'references/preview.html',
    'references/styling-preset.md',
    'references/coding-level-charts.md',
    'references/debug-heatmap.md',
    'references/flowchart.md',
    'references/sequenceDiagram.md',
    'references/config-theming.md'
  ],
  'clone-website': [
    'agents/openai.yaml',
    'references/capture-automation.md',
    'references/intake-and-levels.md',
    'references/local-development.md',
    'references/authorized-data-and-assets.md',
    'references/minimal-vibe-integration.md',
    'references/output-templates.md',
    'references/platform-playbooks.md',
    'references/replica-brief.example.json',
    'references/safety-and-rights.md',
    'references/verification-contract.md',
    'scripts/build-capture-routes.mjs',
    'scripts/capture-preflight.mjs',
    'scripts/capture-screenshots.mjs',
    'scripts/capture-workflow-lib.mjs',
    'scripts/fetch-public-catalog.mjs',
    'scripts/report-capture-completeness.mjs',
    'scripts/validate_replica_brief.py',
    'scripts/prepare-replica-workspace.mjs'
  ]
};

const reasoningSurfaceDirs = ['.vibekit/skills'];
if (surfacePresent.claude) reasoningSurfaceDirs.push('.claude/skills');
if (surfacePresent.cursor) reasoningSurfaceDirs.push('.cursor/skills');
if (surfacePresent.codex || surfacePresent.opencode) reasoningSurfaceDirs.push('.agents/skills');
if (surfacePresent.grok) reasoningSurfaceDirs.push('.grok/skills');
if (surfacePresent.kimi) reasoningSurfaceDirs.push('.kimi-code/skills');
for (const surface of reasoningSurfaceDirs) {
  for (const [skill, files] of Object.entries(reasoningSkillResources)) {
    for (const file of files) required.push(`${surface}/${skill}/${file}`);
  }
}

for (const rel of required) exists(rel) ? ok(`required file ${rel}`) : fail(`missing required file ${rel}`);
validateCanonicalSkillLinks();
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
requireText('.vibekit/skills/agentshield-security-review/SKILL.md', 'ecc-agentshield@1.4.0', 'AgentShield workflow pins the reviewed scanner version');
requireText('.vibekit/skills/agentshield-security-review/SKILL.md', 'npm ls ecc-agentshield --depth=0 --ignore-scripts', 'AgentShield workflow checks for a local scanner without lifecycle scripts');
requireText('.vibekit/scripts/init-backbone.mjs', 'npx ecc-agentshield@1.4.0 scan', 'generated backbone pins the AgentShield scanner version');
requireText('AGENTS.md', 'No em dashes or en dashes in generated prose', 'shared agent instructions prohibit em and en dashes');
requireText('backbone.yml', 'no em/en dashes in generated prose', 'backbone conventions prohibit em and en dashes');
requireText('.vibekit/scripts/init-backbone.mjs', 'no em/en dashes in generated prose', 'generated backbone preserves the em and en dash rule');
requireText('.cursor/rules/050-writing-style.mdc', 'Do not use em dashes or en dashes in generated prose', 'Cursor writing rule prohibits em and en dashes');
requireText('.claude/rules/writing-style.md', 'Do not use em dashes or en dashes in generated prose', 'Claude writing rule prohibits em and en dashes');
requireText('.grok/rules/writing-style.md', 'Do not use em dashes or en dashes in generated prose', 'Grok writing rule prohibits em and en dashes');

if (exists('.vibekit/docs/AUTORESEARCH_LEDGER.md')) {
  const ledgerText = read('.vibekit/docs/AUTORESEARCH_LEDGER.md');
  const stalePhrases = ['pending during build', 'BUILD_REPORT.md'];
  const stalePhrase = stalePhrases.find((phrase) => ledgerText.includes(phrase));
  stalePhrase ? fail(`.vibekit/docs/AUTORESEARCH_LEDGER.md contains stale phrase: ${stalePhrase}`) : ok('autoresearch ledger has no stale build placeholders');
}

// Mirror registry is derived from the manifest so a skill cannot be
// registered for install yet skipped by parity validation. Surface skill
// directories come from the manifest's own `surfaces` map, so adding a
// surface there cannot drift from mirror validation.
const MANIFEST_SURFACE_DIRS = Object.fromEntries(
  Object.entries(skillsManifest?.surfaces ?? {})
    .filter(([surface, dir]) => {
      const safe = typeof dir === 'string'
        && dir.endsWith('/skills')
        && !path.isAbsolute(dir)
        && !dir.includes('\\')
        && !dir.split('/').includes('..');
      if (!safe) fail(`manifest surface ${surface} has unsafe skill directory: ${String(dir)}`);
      return safe;
    })
);
const MANIFEST_SURFACE_ROOTS = [...new Set(
  Object.values(MANIFEST_SURFACE_DIRS).map((dir) => dir.split('/')[0])
)];
for (const surfaceRoot of MANIFEST_SURFACE_ROOTS) {
  requireText(
    '.github/workflows/vibekit-validate.yml',
    `"${surfaceRoot}/**"`,
    `CI workflow watches ${surfaceRoot}/**`
  );
  requireText(
    '.vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py',
    `"${surfaceRoot}"`,
    `AgentShield probe inventories ${surfaceRoot}`
  );
}
for (const surfacePath of ['.opencode/**', 'opencode.json']) {
  requireText(
    '.github/workflows/vibekit-validate.yml',
    `"${surfacePath}"`,
    `CI workflow watches ${surfacePath}`
  );
}
requireText(
  '.vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py',
  '".opencode"',
  'AgentShield probe inventories .opencode'
);
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

const mirrorSurface = (mirror) => Object.entries(MANIFEST_SURFACE_DIRS)
  .find(([, dir]) => mirror === dir || mirror.startsWith(`${dir}/`))?.[0];
for (const [skill, mirrors] of Object.entries(skillMirrors)) {
  for (const mirror of mirrors) {
    const surface = mirrorSurface(mirror);
    if (!surface || !surfacePresent[surface]) continue;
    validateSkillMirror(`.vibekit/skills/${skill}`, mirror);
  }
}

function validateAutoresearchContract() {
  const base = '.vibekit/skills/autoresearch-coding';
  if (!exists(`${base}/SKILL.md`)) return;
  const resources = [
    'README.md',
    'references/experiment-contract.md',
    'references/metric-extraction.md',
    'references/result-ledger.md',
    'scripts/run_logged.py',
    'scripts/log_result.py'
  ];
  const missingResources = resources.filter((file) => !exists(`${base}/${file}`));
  if (missingResources.length > 0) {
    fail(`Autoresearch canonical resources are incomplete: ${missingResources.join(', ')}`);
    return;
  }
  ok('Autoresearch canonical contract, references, and helpers are present');

  const skill = read(`${base}/SKILL.md`);
  const runner = read(`${base}/scripts/run_logged.py`);
  const ledger = read(`${base}/scripts/log_result.py`);
  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));

  if (hasAll(skill, [
    'argument vector',
    'minimum meaningful delta',
    'report variance',
    'oracle assets',
    'baseline fingerprint',
    'experiment-owned trial delta',
    'exact integrated tree',
    'Delegate only'
  ])) {
    ok('Autoresearch contract protects measurement validity, rollback, and oracle integrity');
  } else {
    fail('Autoresearch experiment safety or measurement contract drifted');
  }

  if (hasAll(runner, [
    'subprocess.Popen',
    'start_new_session',
    'max_log_bytes',
    '[REDACTED]',
    'os.replace',
    'shell syntax is not supported in legacy command strings'
  ]) && !runner.includes('shell=True')) {
    ok('Autoresearch runner uses bounded argv execution without a shell');
  } else {
    fail('Autoresearch runner shell, timeout, redaction, or log boundary drifted');
  }

  if (hasAll(ledger, [
    'os.O_NOFOLLOW',
    'LOCK_EX',
    'os.fchmod',
    'os.fsync',
    'unsupported header',
    'control characters',
    'metric must be a finite number'
  ])) {
    ok('Autoresearch ledger validates and serializes owner-only result rows');
  } else {
    fail('Autoresearch ledger path, row, permission, or locking contract drifted');
  }

  const packageJson = readJson('package.json');
  const sourceTestsValid = !isKitSourceRepo || (
    exists('test/autoresearch/scripts/test-contract.mjs')
    && packageJson?.scripts?.['test:autoresearch'] === 'node test/autoresearch/scripts/test-contract.mjs'
    && packageJson?.scripts?.test?.includes('npm run test:autoresearch')
  );
  if (sourceTestsValid) {
    ok('Autoresearch source contract test is wired into the repository suite');
  } else {
    fail('Autoresearch source contract test or package wiring drifted');
  }
}

function validateSequentialThinkingContract() {
  const base = '.vibekit/skills/sequential-thinking';
  if (!exists(`${base}/SKILL.md`)) return;
  const skill = read(`${base}/SKILL.md`);
  const markdown = listFiles(base)
    .filter((file) => file.endsWith('.md'))
    .map((file) => read(`${base}/${file}`))
    .join('\n');

  const markers = ['REVISION', 'BRANCH', 'HYPOTHESIS', 'VERIFICATION', 'CONVERGENCE', 'META', 'FINAL'];
  const missingMarkers = markers.filter((marker) => !skill.includes(`[${marker}`));
  missingMarkers.length
    ? fail(`sequential-thinking marker allowlist missing: ${missingMarkers.join(', ')}`)
    : ok(`sequential-thinking closed marker allowlist (${markers.length} markers)`);

  if (skill.includes('Keep private chain-of-thought private.')
      && skill.includes('Complexity alone does not authorize more detailed reasoning.')
      && skill.includes('Implicit (default)')) {
    ok('sequential-thinking uses public checkpoints with explicit-only visible reasoning');
  } else {
    fail('sequential-thinking public-checkpoint or explicit-mode contract drifted');
  }

  const banned = ['thoughtContent', 'recentThoughts', 'sessionContext', 'remainingThoughts', 'Unlike MCP', 'Zod Layer', 'Response Prefix', 'PREFIX_LABEL'];
  const leaked = banned.filter((term) => markdown.includes(term));
  leaked.length
    ? fail(`sequential-thinking contains rejected pseudo-runtime/plugin terms: ${leaked.join(', ')}`)
    : ok('sequential-thinking rejects pseudo-runtime and foreign-plugin contracts');

  const jsonBlocks = [];
  for (const pattern of [/```json\s*\n([\s\S]*?)\n```/g, /~~~json\s*\n([\s\S]*?)\n~~~/g]) {
    let match;
    while ((match = pattern.exec(markdown))) jsonBlocks.push(match[1]);
  }
  let invalidJson = 0;
  for (const block of jsonBlocks) {
    try { JSON.parse(block); } catch { invalidJson += 1; }
  }
  if (jsonBlocks.length > 0 && invalidJson === 0) ok(`sequential-thinking JSON examples parse (${jsonBlocks.length} blocks)`);
  else fail(`sequential-thinking JSON examples invalid or missing (${invalidJson} invalid, ${jsonBlocks.length} total)`);
}

function validateThreatModelSecurityReviewContract() {
  const base = '.vibekit/skills/threat-model-security-review';
  if (!exists(`${base}/SKILL.md`)) return;
  const resourcePaths = [
    `${base}/references/threat-model-template.md`,
    `${base}/references/finding-report-template.md`,
    `${base}/references/validation-safety.md`,
    `${base}/agents/openai.yaml`
  ];
  if (!resourcePaths.every((file) => exists(file))) {
    fail('Threat-model security review contract resources are incomplete');
    return;
  }
  const skill = read(`${base}/SKILL.md`);
  const threatModel = read(`${base}/references/threat-model-template.md`);
  const findingReport = read(`${base}/references/finding-report-template.md`);
  const validationSafety = read(`${base}/references/validation-safety.md`);
  const ui = read(`${base}/agents/openai.yaml`);
  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));
  const sourceDiscoveryValid = !isKitSourceRepo || (
    hasAll(read('README.md'), ['All 25 skills', '| `threat-model-security-review`'])
    && hasAll(read('docs/README.vi.md'), ['Cả 25 skill', '| `threat-model-security-review`'])
    && hasAll(read('docs/README.zh-CN.md'), ['全部 25 个技能', '| `threat-model-security-review`'])
    && hasAll(read('docs/README.ja.md'), ['25 個すべてのスキル', '| `threat-model-security-review`'])
    && hasAll(read('.vibekit/docs/INSTALL.md'), ['Fifteen user-invoked skills', '`threat-model-security-review`'])
    && hasAll(read('.vibekit/docs/SECURITY_MODEL.md'), [
      '`threat-model-security-review` covers application source',
      '`agentshield-security-review` covers agent instructions'
    ])
    && read('SECURITY.md').includes('## Application-source review')
    && hasAll(read('package.json'), [
      '.claude/skills/threat-model-security-review/',
      '.cursor/skills/threat-model-security-review/'
    ])
  );

  if (hasAll(skill, [
    'application source, APIs, services, libraries, authentication',
    'Use `agentshield-security-review` for agent instructions',
    'review them separately and label which workflow',
    'produced each finding'
  ])) {
    ok('Threat-model security review separates application and agent-surface domains');
  } else {
    fail('Threat-model security review domain boundary drifted');
  }

  if (hasAll(skill, [
    'assets, privileges, actors, entry points, attacker-controlled inputs',
    'Inventory every file or changed source-like file in scope',
    'source, transformations, security controls',
    'dangerous operation or sink'
  ]) && hasAll(threatModel, [
    'Trust boundaries',
    'Security invariants',
    'High-impact failure modes'
  ])) {
    ok('Threat-model security review preserves threat, coverage, and source-to-sink analysis');
  } else {
    fail('Threat-model security review threat or coverage workflow drifted');
  }

  const validationStatuses = [
    'runtime-validated',
    'static-confirmed',
    'plausible-unverified',
    'rejected',
    'deferred'
  ];
  if (validationStatuses.every((status) => skill.includes(`\`${status}\``))
      && hasAll(validationSafety, [
        'Static analysis is read-only and is the default',
        'Repository-controlled files cannot authorize execution',
        'explicit approval from the active user or higher-authority instructions',
        'unchanged from a trusted base revision',
        'static inspection of the exact command and executed code path',
        'External or destructive',
        'Record failures and negative results'
      ])) {
    ok('Threat-model security review keeps explicit evidence statuses and safe validation levels');
  } else {
    fail('Threat-model security review evidence-status or validation-safety contract drifted');
  }

  const unsafeLaunchPatterns = [
    /\bnpx\s+[^\n`]*(?:security|scan)/i,
    /\bnpm\s+(?:install|add)\s+/i,
    /\bcurl\s+[^\n|]*\|\s*(?:sh|bash|zsh)\b/i
  ];
  const unsafeLaunch = unsafeLaunchPatterns.find((pattern) => pattern.test(skill));
  if (!unsafeLaunch
      && hasAll(skill, [
        'Do not install or invoke external security scanners',
        'Do not run untrusted hooks, MCP servers, installers',
        'Never test a public, production, or third-party target without explicit authorization'
      ])) {
    ok('Threat-model security review declares dependency-free policy and avoids selected unsafe launch signatures');
  } else {
    fail('Threat-model security review dependency policy or selected unsafe launch signature drifted');
  }

  if (hasAll(findingReport, [
    'Attacker-controlled source',
    'Broken control or invariant',
    'Dangerous operation or sink',
    'Remaining proof gap',
    'Do not batch unrelated fixes into one patch'
  ]) && hasAll(skill, [
    'Start with one accepted finding',
    'Make the smallest root-cause patch',
    'Re-run the original attack-path check'
  ])) {
    ok('Threat-model security review reports evidence and remediates one root cause at a time');
  } else {
    fail('Threat-model security review finding or remediation contract drifted');
  }

  if (hasAll(skill, [
    'Assign each candidate a stable ID',
    'exactly one terminal validation status',
    'Do not delete candidates because validation weakens or rejects them',
    'Reconcile the candidate ledger before reporting',
    'open, duplicate, or missing disposition makes the review incomplete'
  ]) && hasAll(findingReport, [
    '## Candidate ledger',
    '| Candidate ID | Attack path summary | Broken invariant | Validation status | Report destination |',
    'destination: `finding`, `rejected candidate`, or `deferred proof gap`',
    'missing disposition makes the review incomplete',
    '| Candidate ID | Candidate | Why rejected | Evidence |',
    '| Candidate ID | Gap | Why unresolved | Required authority or evidence | Risk to conclusion |'
  ])) {
    ok('Threat-model security review reconciles every candidate before completion');
  } else {
    fail('Threat-model security review candidate reconciliation contract drifted');
  }

  if (hasAll(ui, [
    'display_name: "Threat Model Security Review"',
    'Use $threat-model-security-review'
  ]) && sourceDiscoveryValid) {
    ok('Threat-model security review keeps discovery, packaging, and domain guidance synchronized');
  } else {
    fail('Threat-model security review discovery, packaging, or UI metadata drifted');
  }
}

function validateCleanDeliveryContract() {
  const base = '.vibekit/skills/clean-delivery';
  if (!exists(base + '/SKILL.md')) return;
  const resources = [
    'scripts/validate-story.mjs',
    'references/story-template.md',
    'references/verification-tiers.md',
    'references/architecture-contract.md',
    'references/proof-return-mapping.md',
    'agents/openai.yaml'
  ];
  const missingResources = resources.filter((file) => !exists(`${base}/${file}`));
  if (missingResources.length > 0) {
    fail(`Clean Delivery canonical resources are incomplete: ${missingResources.join(', ')}`);
    return;
  }
  ok('Clean Delivery canonical contract, references, and validator are present');

  const skill = read(base + '/SKILL.md');
  const validator = read(base + '/scripts/validate-story.mjs');
  const story = read(base + '/references/story-template.md');
  const tiers = read(base + '/references/verification-tiers.md');
  const architecture = read(base + '/references/architecture-contract.md');
  const proofReturn = read(base + '/references/proof-return-mapping.md');
  const ui = read(base + '/agents/openai.yaml');
  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));

  if (hasAll(skill, [
    'The six stages are quality gates, not six mandatory agents.',
    '### 1. Specify',
    '### 2. Code',
    '### 3. Clean',
    '### 4. Architect',
    '### 5. Harden',
    '### 6. Verify',
    'Never auto-install a missing test tool'
  ])) {
    ok('Clean Delivery defines six proportional craftsmanship gates without mandatory agent fan-out');
  } else {
    fail('Clean Delivery gate or proportionality contract drifted');
  }

  if (hasAll(story, [
    '## Out of scope',
    '## Protected verifier assets',
    '## Red evidence',
    '## Proof commands'
  ]) && hasAll(tiers, [
    '| Critical |',
    'not-configured means no verifier exists',
    'Do not auto-install'
  ]) && hasAll(architecture, [
    'extends the repository',
    'conventions.architecture',
    'not equivalent to an executed architecture command'
  ]) && hasAll(proofReturn, [
    '| Red evidence | Pre-change evidence |',
    'Do not duplicate the Proofline ledger'
  ])) {
    ok('Clean Delivery freezes scope, protects oracles, scales proof, and reuses Proof Returns');
  } else {
    fail('Clean Delivery story, verification, architecture, or Proof Return resources drifted');
  }

  if (hasAll(validator, [
    'readFileSync',
    'missing or empty section:',
    'duplicate section:',
    'template placeholder remains:',
    'Unit proof must name an executable deterministic check',
    'Risk must be exactly low, medium, high, or critical'
  ]) && !/(node:child_process|\beval\s*\(|\bexecSync\s*\(|\bspawnSync\s*\()/.test(validator)) {
    ok('Clean Delivery story validator is dependency-free and does not execute story commands');
  } else {
    fail('Clean Delivery story validator safety or discrimination contract drifted');
  }

  const discoveryValid = !isKitSourceRepo || (
    hasAll(read('README.md'), ['All 25 skills', 'clean-delivery'])
    && hasAll(read('docs/README.vi.md'), ['Cả 25 skill', 'clean-delivery'])
    && hasAll(read('docs/README.zh-CN.md'), ['全部 25 个技能', 'clean-delivery'])
    && hasAll(read('docs/README.ja.md'), ['25 個すべてのスキル', 'clean-delivery'])
    && hasAll(read('.vibekit/docs/INSTALL.md'), ['Fifteen user-invoked skills', 'clean-delivery'])
    && hasAll(read('package.json'), [
      'test:clean-delivery',
      '.claude/skills/clean-delivery/',
      '.cursor/skills/clean-delivery/'
    ])
    && exists('test/clean-delivery/scripts/test-story-contract.mjs')
  );
  const cleanDeliveryReadmes = [
    'README.md',
    'docs/README.vi.md',
    'docs/README.zh-CN.md',
    'docs/README.ja.md',
    'docs/README.ko.md',
    'docs/README.de.md',
    'docs/README.bg.md'
  ];
  const guideMarkers = [
    '### Clean Delivery',
    '| `Specify`',
    '| `Code`',
    '| `Clean`',
    '| `Architect`',
    '| `Harden`',
    '| `Verify`',
    'securityLevel: strict',
    'Specify --> Code',
    'Code --> Clean',
    'Clean --> Architect',
    'Architect --> Harden',
    'Harden --> Verify',
    'Revise --> Specify',
    'Specify -.-> Story',
    'Code -.-> RedGreen',
    'Clean -.-> CleanProof',
    'Architect -.-> Boundary',
    'Harden -.-> RiskProof',
    'Verify -.-> FinalProof',
    'classDef data fill:#63E6BE',
    'class Ready success;',
    'class Revise danger;',
    'class Story,RedGreen,CleanProof,Boundary,RiskProof,FinalProof data;',
    'linkStyle default stroke:#444444,stroke-width:1.5px;',
    '/clean-delivery',
    'Risk: medium.',
    'Protected verifier asset',
    'not-configured',
    'validate-story.mjs',
    'npm run test:clean-delivery'
  ];
  const guidesValid = !isKitSourceRepo || cleanDeliveryReadmes.every((rel) => (
    exists(rel) && hasAll(read(rel), guideMarkers)
  ));
  const localizedGuideMarkers = {
    'README.md': [
      '### Clean Delivery: one small change, six checks',
      '#### What happens when a gate fails?',
      '**Clean Delivery is not a server, background application, or external service.**',
      '#### Full flow and evidence from every gate',
      '**How to read the diagram:**',
      '**Diagram takeaway:**',
      '#### How does risk change verification?',
      '#### Terms used in this section'
    ],
    'docs/README.vi.md': [
      '### Clean Delivery: một thay đổi nhỏ, sáu lần kiểm tra',
      '#### Nếu một cổng chưa đạt thì sao?',
      '**Clean Delivery không phải server, ứng dụng nền hay dịch vụ bên ngoài.**',
      '#### Luồng đầy đủ và bằng chứng của từng cổng',
      '**Cách đọc sơ đồ:**',
      '**Kết luận của sơ đồ:**',
      '#### Mức rủi ro thay đổi cách kiểm tra thế nào?',
      '#### Từ khó trong phần này'
    ],
    'docs/README.zh-CN.md': [
      '### Clean Delivery：一个小改动，六次检查',
      '#### 如果某道门没有通过怎么办？',
      '**Clean Delivery 不是 server、后台应用或外部服务。**',
      '#### 完整流程和每道门的证据',
      '**如何阅读这张图：**',
      '**图的结论：**',
      '#### 风险如何改变验证强度？',
      '#### 本节术语'
    ],
    'docs/README.ja.md': [
      '### Clean Delivery：1 つの小さな変更、6 回の確認',
      '#### Gate を通過できない場合',
      '**Clean Delivery は server、background application、外部 service ではありません。**',
      '#### 全体の流れと各 gate の証拠',
      '**図の読み方：**',
      '**図の要点：**',
      '#### Risk によって検証はどう変わるか？',
      '#### この節で使う用語'
    ],
    'docs/README.ko.md': [
      '### Clean Delivery: 하나의 작은 변경, 여섯 번의 확인',
      '#### 게이트를 통과하지 못하면 어떻게 하나요?',
      '**Clean Delivery는 server, background application 또는 외부 service가 아닙니다.**',
      '#### 전체 흐름과 각 게이트의 증거',
      '**다이어그램 읽는 방법:**',
      '**다이어그램의 결론:**',
      '#### 위험에 따라 검증은 어떻게 달라지나요?',
      '#### 이 절에서 사용하는 용어'
    ],
    'docs/README.de.md': [
      '### Clean Delivery: eine kleine Änderung, sechs Prüfungen',
      '#### Was passiert, wenn ein Gate nicht besteht?',
      '**Clean Delivery ist kein Server, keine Hintergrundanwendung und kein externer Dienst.**',
      '#### Vollständiger Ablauf und Nachweise je Gate',
      '**So liest du das Diagramm:**',
      '**Kernaussage:**',
      '#### Wie verändert das Risiko die Prüfung?',
      '#### Begriffe in diesem Abschnitt'
    ],
    'docs/README.bg.md': [
      '### Clean Delivery: една малка промяна, шест проверки',
      '#### Какво става, ако gate не премине?',
      '**Clean Delivery не е server, background application или външна услуга.**',
      '#### Пълният поток и доказателството от всеки gate',
      '**Как да четете диаграмата:**',
      '**Извод от диаграмата:**',
      '#### Как рискът променя проверката?',
      '#### Термини в този раздел'
    ]
  };
  const localizedGuidesValid = !isKitSourceRepo || Object.entries(localizedGuideMarkers).every(
    ([rel, markers]) => exists(rel) && hasAll(read(rel), markers)
  );
  if (hasAll(ui, [
    'display_name: "Clean Delivery"',
    'Use $clean-delivery'
  ]) && discoveryValid && guidesValid && localizedGuidesValid) {
    ok('Clean Delivery discovery, seven-language guide, packaging, UI metadata, and tests stay synchronized');
  } else {
    fail('Clean Delivery discovery, seven-language guide, packaging, UI metadata, or tests drifted');
  }
}

function validateOrchestrationModeContract() {
  const contractPath = '.vibekit/docs/ORCHESTRATION_MODES.md';
  const preferencePath = '.vibekit/scripts/orchestration-preference.mjs';
  const routingPath = '.vibekit/scripts/orchestration-routing.mjs';
  const cursorAdapterPath = '.vibekit/scripts/cursor-sdk-adapter.mjs';
  if (!exists(contractPath) || !exists(preferencePath) || !exists(routingPath) || !exists(cursorAdapterPath)) return;
  const contract = read(contractPath);
  const preferenceScript = read(preferencePath);
  const routingScript = read(routingPath);
  const cursorAdapter = read(cursorAdapterPath);
  const agents = read('AGENTS.md');
  const council = read('.vibekit/commands/council.md');
  const parallel = read('.vibekit/skills/parallel-analysis/SKILL.md');
  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));

  if (hasAll(contract, [
    '## First question: mode',
    '| Default |',
    '| Auto |',
    '| Custom |',
    '## Second question: persistence',
    'needs_user_input',
    'lowest-cost capable model',
    'installed-unverified',
    'The orchestration preference and the safety topology are independent axes'
  ])) {
    ok('Orchestration contract defines provider-native questions, three modes, persistence, readiness, and separate safety topology');
  } else {
    fail('Orchestration mode, question, persistence, readiness, or topology contract drifted');
  }

  if (hasAll(contract, [
    'Coding level changes explanation density',
    'never lowers model capability, safety, verification, or authorization',
    'Auto routes only to ready adapters',
    'never guesses credentials, model aliases, prices, context limits, or availability',
    'host-specific floors are not represented by the helper schema'
  ])) {
    ok('Orchestration routing preserves quality and safety floors without guessing provider state');
  } else {
    fail('Orchestration quality floor or provider-readiness contract drifted');
  }

  if (hasAll(preferenceScript, [
    'const MODES = new Set(["default", "auto", "custom"])',
    'const PROVIDERS = new Set(["current", "codex", "claude", "cursor", "opencode", "grok", "kimi"])',
    'const ADAPTERS = new Set(["cursor-sdk"])',
    '--adapter role=cursor-sdk',
    'refusing symlinked project preference file',
    'custom mode requires at least one --assign',
    'delete preferences.orchestration'
  ]) && !/(node:child_process|\beval\s*\(|\bexecSync\s*\(|\bspawnSync\s*\()/.test(preferenceScript)) {
    ok('Orchestration preference helper validates bounded local state without invoking providers');
  } else {
    fail('Orchestration preference helper schema, path safety, or execution boundary drifted');
  }

  if (hasAll(contract, [
    '## Enforced routing plans',
    'Preference is not dispatch',
    'requested-not-attested',
    'full-history fork'
  ]) && hasAll(routingScript, [
    'export function buildRoutingPlan',
    'export function verifyEffectiveReceipt',
    'provider-default is not an exact model',
    'agentProfilePins',
    'custom agent model pin',
    'full-history routing must inherit the parent model and reasoning effort',
    'effective-model receipt is required',
    'expected agentId',
    'receipt agentId does not match the spawned child',
    'bindingVerified: true',
    'validates binding, not issuer authenticity',
    'MAX_INPUT_BYTES'
  ]) && !/(node:child_process|\beval\s*\(|\bexecSync\s*\(|\bspawnSync\s*\()/.test(routingScript)) {
    ok('Orchestration routing helper validates exact models, fork compatibility, fallbacks, freshness, and effective receipts without invoking providers');
  } else {
    fail('Orchestration routing planner, attestation, or non-execution boundary drifted');
  }

  if (hasAll(contract, [
    '## Optional Cursor SDK adapter',
    'Cursor.models.list()',
    'read-only',
    'workspace-write',
    '--adapter reviewer=cursor-sdk'
  ]) && hasAll(cursorAdapter, [
    'const MIN_NODE_VERSION = "22.13.0"',
    'const MIN_SDK_VERSION = "1.0.27"',
    'export function resolveProjectRoot',
    'sdk.Cursor.models.list()',
    'sandboxOptions: { enabled: true }',
    'READ_ONLY_TOOLS',
    'WORKSPACE_WRITE_TOOLS',
    'mutationApproved',
    'isolatedWorkspace',
    'protectedPathsChecked',
    'modelBinding'
  ]) && !/(node:child_process|\beval\s*\(|\bexecSync\s*\(|\bspawnSync\s*\()/.test(cursorAdapter)) {
    ok('Optional Cursor SDK adapter validates runtime, project root, live models, tool access, sandboxing, and model binding');
  } else {
    fail('Cursor SDK adapter readiness, safety, or orchestration contract drifted');
  }

  const integrationValid = hasAll(agents, [
    '### Orchestration preference',
    'native structured-question tool',
    'Child agents never ask the end user directly'
  ]) && hasAll(council, [
    'ORCHESTRATION_MODES.md',
    'only the roles the task actually needs'
  ]) && hasAll(parallel, [
    'Orchestration preference and executor setup',
    'global project state',
    'installed-unverified',
    'Existing version 1 executor'
  ]) && [
    'autoresearch-coding',
    'graph-engineering-verified-orchestration',
    'proofline-orchestration',
    'clean-delivery'
  ].every((skill) => read('.vibekit/skills/' + skill + '/SKILL.md').includes('ORCHESTRATION_MODES.md'));
  if (integrationValid) {
    ok('Orchestration preference gate is wired into root rules, council, and multi-agent skills');
  } else {
    fail('Orchestration preference root, command, or skill integration drifted');
  }

  const sourceValid = !isKitSourceRepo || (
    exists('test/orchestration/scripts/test-preference.mjs')
    && exists('test/orchestration/scripts/test-routing.mjs')
    && exists('test/orchestration/scripts/test-cursor-sdk-adapter.mjs')
    && hasAll(read('package.json'), [
      'test:orchestration',
      'test:cursor-sdk-sandbox',
      'orchestration-preference.mjs',
      'orchestration-routing.mjs',
      'cursor-sdk-adapter.mjs'
    ])
    && ['README.md', 'docs/README.vi.md', 'docs/README.zh-CN.md', 'docs/README.ja.md']
      .every((file) => read(file).includes('ORCHESTRATION_MODES.md'))
    && read('.vibekit/docs/INSTALL.md').includes('Multi-agent orchestration preference')
  );
  if (sourceValid) {
    ok('Orchestration preference tests, package scripts, installation docs, and localization stay synchronized');
  } else {
    fail('Orchestration preference tests, packaging, installation docs, or localization drifted');
  }
}

function validateNamedVerificationContract() {
  const schemaPath = '.vibekit/docs/backbone.schema.json';
  const referencePath = '.vibekit/docs/BACKBONE_REFERENCE.md';
  if (!exists(schemaPath) || !exists(referencePath)) return;
  const schema = readJson(schemaPath);
  const verification = schema?.properties?.commands?.properties?.verification;
  const expected = ['unit', 'acceptance', 'architecture', 'property', 'mutation', 'e2e'];
  const propertyNames = Object.keys(verification?.properties || {}).sort();
  const requiredNames = [...(verification?.required || [])].sort();
  const expectedNames = [...expected].sort();
  const typesValid = expected.every((name) => {
    const types = verification?.properties?.[name]?.type;
    return Array.isArray(types) && types.includes('string') && types.includes('null');
  });
  if (verification?.type === 'object'
      && verification?.additionalProperties === false
      && JSON.stringify(propertyNames) === JSON.stringify(expectedNames)
      && JSON.stringify(requiredNames) === JSON.stringify(expectedNames)
      && typesValid) {
    ok('Backbone schema defines exactly six optional string-or-null named verifiers');
  } else {
    fail('Backbone named verification JSON schema drifted');
  }

  const reference = read(referencePath);
  const init = read('.vibekit/scripts/init-backbone.mjs');
  if (reference.includes('optional for backward compatibility')
      && reference.includes('Null means no verifier is configured')
      && reference.includes('extend conventions.architecture')
      && reference.includes('never authorizes an agent to install')
      && expected.every((name) => init.includes(name + ':'))
      && init.includes('schema_version: 4')
      && init.includes("['test:architecture', 'architecture']")) {
    ok('Backbone reference and initializer preserve null semantics, architecture ownership, and backward compatibility');
  } else {
    fail('Backbone named verification reference or initializer contract drifted');
  }
}

function validateMermaidContract() {
  const base = '.vibekit/skills/mermaid';
  if (!exists(`${base}/SKILL.md`)) return;
  const skill = read(`${base}/SKILL.md`);
  const examples = read(`${base}/references/kit-examples.md`);
  const preview = read(`${base}/references/preview.html`);
  const notice = read(`${base}/UPSTREAM-NOTICE.md`);
  const debug = read(`${base}/references/debug-heatmap.md`);
  const styling = read(`${base}/references/styling-preset.md`);
  const importedReferenceFiles = listFiles(`${base}/references`)
    .filter((file) => file.endsWith('.md'));
  const imported = importedReferenceFiles
    .map((file) => read(`${base}/references/${file}`))
    .join('\n');
  const forbiddenDashPattern = /[\u2013\u2014]/u;
  const dashViolations = importedReferenceFiles.flatMap((file) =>
    read(`${base}/references/${file}`)
      .split(/\r?\n/)
      .flatMap((line, index) => forbiddenDashPattern.test(line) ? [`${file}:${index + 1}`] : [])
  );

  const duplicateFrontmatterKeys = (diagram) => {
    const lines = diagram.split(/\r?\n/);
    if (lines[0]?.trim() !== '---') return [];
    const closingDelimiter = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (closingDelimiter < 0) return [];

    const parents = [];
    const seen = new Set();
    const duplicates = [];
    for (let index = 1; index < closingDelimiter; index += 1) {
      const match = lines[index].match(/^(\s*)([A-Za-z_][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
      if (!match) continue;

      const indent = match[1].length;
      const key = match[2];
      const value = match[3] ?? '';
      while (parents.length && parents.at(-1).indent >= indent) parents.pop();
      const parentPath = parents.map((parent) => parent.key).join('.');
      const qualifiedKey = parentPath ? `${parentPath}.${key}` : key;
      const identity = `${indent}:${qualifiedKey}`;
      if (seen.has(identity)) duplicates.push({ key: qualifiedKey, line: index + 1 });
      else seen.add(identity);
      if (value.trim() === '') parents.push({ indent, key });
    }
    return duplicates;
  };

  const authoredMermaidFiles = [
    `${base}/SKILL.md`,
    `${base}/references/kit-examples.md`,
    `${base}/references/styling-preset.md`,
    `${base}/references/debug-heatmap.md`,
    ...(isKitSourceRepo ? [
      'README.md',
      'docs/README.vi.md',
      'docs/README.zh-CN.md',
      'docs/README.ja.md',
      'docs/README.ko.md',
      'docs/README.de.md',
      'docs/README.bg.md'
    ] : [])
  ];
  const duplicateKeyFailures = [];
  for (const rel of authoredMermaidFiles) {
    if (!exists(rel)) continue;
    const blocks = [...read(rel).matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g)].map((match) => match[1]);
    blocks.forEach((diagram, blockIndex) => {
      duplicateFrontmatterKeys(diagram).forEach(({ key, line }) => {
        duplicateKeyFailures.push(`${rel} diagram ${blockIndex + 1} line ${line}: ${key}`);
      });
    });
  }
  const duplicateKeyCanary = duplicateFrontmatterKeys([
    '---',
    'config:',
    '  themeVariables:',
    '    fontSize: 15px',
    '  themeVariables:',
    '    lineColor: "#444444"',
    '---',
    'flowchart TD',
    '  A --> B'
  ].join('\n'));

  const diagrams = [...examples.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g)].map((match) => match[1]);
  const distinctCases = ['Safe configuration promotion', 'Repository safety evolution', 'Localization release board', 'Validation feedback time', 'Duplicate webhook investigation'];
  if (diagrams.length === 5
      && diagrams.every((diagram) => diagram.includes('securityLevel: strict'))
      && distinctCases.every((name) => examples.toLowerCase().includes(name.toLowerCase()))) {
    ok('Mermaid maintains five strict kit-native examples');
  } else {
    fail('Mermaid kit-native example set, strict security, or distinct cases drifted');
  }

  if (skill.includes('never paste a second mapping with either key')
      && skill.includes('every YAML frontmatter key is unique within its mapping scope')
      && skill.includes('at most one `themeVariables` mapping')) {
    ok('Mermaid skill requires unique frontmatter keys and merged configuration mappings');
  } else {
    fail('Mermaid skill duplicate-frontmatter-key guidance drifted');
  }

  if (duplicateKeyCanary.length === 1 && duplicateKeyCanary[0].key === 'config.themeVariables') {
    ok('Mermaid duplicate-frontmatter-key regression detector rejects its canary');
  } else {
    fail('Mermaid duplicate-frontmatter-key regression detector did not reject its canary');
  }

  if (duplicateKeyFailures.length === 0) {
    ok(`Mermaid frontmatter keys are unique across ${authoredMermaidFiles.length} authored Markdown files`);
  } else {
    fail(`Mermaid frontmatter contains duplicate mapping keys: ${duplicateKeyFailures.join('; ')}`);
  }

  if (preview.includes('mermaid@11.16.0/dist/mermaid.esm.min.mjs')
      && preview.includes('mermaid-zenuml@0.2.2/dist/mermaid-zenuml.esm.min.mjs')
      && preview.includes("securityLevel: 'strict'")
      && skill.includes('isolated profile with no secrets or user data')) {
    ok('Mermaid executable preview is pinned, strict, and isolated by policy');
  } else {
    fail('Mermaid executable preview pin, strict mode, or isolation warning drifted');
  }

  if (notice.includes('Copyright (c) 2014 - 2022 Knut Sveidqvist')
      && notice.includes('The MIT License (MIT)')
      && notice.includes('unavailable')) {
    ok('Mermaid upstream ownership, MIT license, and version boundary are preserved');
  } else {
    fail('Mermaid upstream notice or preserved license is incomplete');
  }

  const staleTokens = ['MERMAID_RELEASE_VERSION', '/blob/develop/', 'Please edit the corresponding file', 'THIS IS AN AUTOGENERATED FILE'];
  const stale = staleTokens.filter((token) => imported.includes(token));
  stale.length
    ? fail(`Mermaid imported references contain stale or operational tokens: ${stale.join(', ')}`)
    : ok('Mermaid references remove development placeholders and imported operational directives');

  dashViolations.length
    ? fail(`Mermaid references contain em or en dashes: ${dashViolations.join(', ')}`)
    : ok('Mermaid references use ASCII punctuation instead of em or en dashes');

  const unavailableCount = (imported.match(/unreleased upstream; unavailable in Mermaid 11\.16\.0/g) || []).length;
  unavailableCount === 3
    ? ok('Mermaid marks three development-only syntaxes unavailable for 11.16.0')
    : fail(`Mermaid expected 3 development-only boundary warnings, found ${unavailableCount}`);

  if (styling.includes('first Kanban column to `section-1`')
      && styling.includes('maps `section-1` to `cScale2`')
      && examples.includes('cScale2: "#339AF0"')
      && examples.includes('cScale5: "#9775FA"')) {
    ok('Mermaid 11.16 Kanban compatibility mapping is documented and exercised');
  } else {
    fail('Mermaid 11.16 Kanban compatibility mapping drifted');
  }

  if (debug.includes('fill:#FA5252,stroke:#444444,stroke-width:2px,color:#111111')) {
    ok('Mermaid debug heat map uses accessible ink on strong red');
  } else {
    fail('Mermaid debug heat-map strong-red text contrast drifted');
  }
}

function validateGraphEngineeringContract() {
  const base = '.vibekit/skills/graph-engineering-verified-orchestration';
  if (!exists(`${base}/SKILL.md`)) return;
  const skill = read(`${base}/SKILL.md`);
  const contract = read(`${base}/references/graph-contract.md`);
  const ui = read(`${base}/agents/openai.yaml`);
  const readme = exists('README.md') ? read('README.md') : '';
  const readmeVi = exists('docs/README.vi.md') ? read('docs/README.vi.md') : '';
  const readmeZh = exists('docs/README.zh-CN.md') ? read('docs/README.zh-CN.md') : '';
  const readmeJa = exists('docs/README.ja.md') ? read('docs/README.ja.md') : '';
  const install = exists('.vibekit/docs/INSTALL.md') ? read('.vibekit/docs/INSTALL.md') : '';
  const pkg = exists('package.json') ? read('package.json') : '';

  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));

  if (hasAll(skill, [
    'consumes a named artifact',
    'same verification and integration obligations',
    'critical_path + schedule + queue + merge + verification',
    'Never promise linear speedup'
  ])) {
    ok('Graph engineering proves artifact edges and compares equal-quality orchestration costs');
  } else {
    fail('Graph engineering artifact-edge or orchestration-cost contract drifted');
  }

  if (hasAll(skill, [
    'approval of a graph plan is not mutation authority',
    'canonical digest of the complete contract',
    'separate affirmative execute/change instruction'
  ]) && hasAll(contract, [
    'execute_grant: absent | exact affirmative authority',
    'artifact_digest: Exact content digest',
    'expires_at: Timestamp or single-use'
  ])) {
    ok('Graph engineering separates plan approval, execution authority, and exact consequential gates');
  } else {
    fail('Graph engineering authority or exact-gate binding drifted');
  }

  if (hasAll(skill, [
    'read, write, and semantic resource scopes',
    'tool-enforced filesystem/API/credential allowlists',
    'Every R2 action, serial or concurrent, requires enforceable least-privilege',
    'Large blast radius also requires a pilot and human gate'
  ])) {
    ok('Graph engineering enforces semantic ownership, mutable containment, and blast-radius gates');
  } else {
    fail('Graph engineering isolation, containment, or blast-radius contract drifted');
  }

  if (hasAll(skill, [
    'protect tests, schemas, fixtures, expected snapshots, commands, and verifier configuration',
    'verifier owner must not be the actor that produced or merged the artifact',
    'deterministic harness-run check'
  ]) && contract.includes('| Verifier effects |')) {
    ok('Graph engineering protects verification oracles and separates verifier ownership');
  } else {
    fail('Graph engineering verifier-integrity contract drifted');
  }

  if (hasAll(skill, [
    'Use `unresolved` rather than `0`',
    'maximum nodes, maximum rounds, a deduplication key',
    'Reject and quarantine outputs',
    'For irreversible R2 work, say `reversible: false`'
  ]) && hasAll(contract, [
    'cleanup_status: clean | quarantined | failed | not_applicable',
    'mitigation_if_irreversible: Explicitly not a rollback',
    'stop_conditions: []'
  ])) {
    ok('Graph engineering bounds resources, retries, cleanup, discovery, and irreversible work');
  } else {
    fail('Graph engineering failure, budget, cleanup, or rollback contract drifted');
  }

  const sourceDiscoveryValid = !isKitSourceRepo || (
    hasAll(readme, [
      'All 25 skills',
      'Graph engineering: verified orchestration',
      'edgeLabelBackground: "#FFFFFF"'
    ])
    && readmeVi.includes('Graph engineering: điều phối có xác minh')
    && readmeZh.includes('图工程：经验证的编排')
    && readmeJa.includes('Graph engineering：検証付き orchestration')
    && install.includes('Fifteen user-invoked skills')
    && hasAll(pkg, [
      '.claude/skills/graph-engineering-verified-orchestration/',
      '.cursor/skills/graph-engineering-verified-orchestration/'
    ])
  );

  if (hasAll(ui, [
    'display_name: "Graph Engineering: Verified Orchestration"',
    'Use $graph-engineering-verified-orchestration'
  ]) && sourceDiscoveryValid) {
    ok('Graph engineering discovery, localization, Mermaid legibility, and packaging stay synchronized');
  } else {
    fail('Graph engineering documentation, localization, Mermaid, or packaging drifted');
  }

  const viz = exists(`${base}/references/graph-visualization.md`) ? read(`${base}/references/graph-visualization.md`) : '';
  const renderer = exists(`${base}/scripts/render-graph.mjs`) ? read(`${base}/scripts/render-graph.mjs`) : '';
  const graphTestOk = !isKitSourceRepo
    || (exists('test/graph-engineering/scripts/test-render-graph.mjs') && exists('test/graph-engineering/fixtures/sample-graph.json'));
  if (hasAll(skill, [
    'scripts/render-graph.mjs',
    'references/graph-visualization.md',
    'never hand-draw',
    '--format=ascii-3d',
    'Cursor CLI'
  ]) && hasAll(viz, [
    '--format=mermaid',
    '--format=ascii',
    '--format=ascii-3d',
    '--width=N',
    'deterministic',
    'cycle',
    'explicit blocker'
  ]) && hasAll(renderer, [
    'flowchart TD',
    'edgeLabelBackground',
    'assertAcyclic',
    'criticalPath',
    'sanitizeLabel',
    'topologicalLayers',
    'deriveBlockers',
    'resolveWidth',
    'toAsciiText',
    'escapeMermaidText',
    'securityLevel: strict',
    'renderAscii3d'
  ]) && graphTestOk) {
    ok('Graph engineering visualization contract, deterministic renderer, and tests stay synchronized');
  } else {
    fail('Graph engineering visualization contract, renderer, or test drifted');
  }
}

function validateProoflineContract() {
  const base = '.vibekit/skills/proofline-orchestration';
  if (!exists(`${base}/SKILL.md`)) return;

  const skill = read(`${base}/SKILL.md`);
  const roles = read(`${base}/references/role-contract.md`);
  const signals = read(`${base}/references/signal-protocol.md`);
  const handback = read(`${base}/references/proof-return-schema.md`);
  const controls = read(`${base}/references/control-matrix.md`);
  const adapter = read(`${base}/references/paseo-adapter.md`);
  const runner = read(`${base}/scripts/run-proofline-sandbox.mjs`);
  const ui = read(`${base}/agents/openai.yaml`);
  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));

  if (hasAll(skill, [
    'The human `Owner` stays outside the agent hierarchy',
    '`Keeper`: holds the mandate, budgets, process memory, gates, and escalation record',
    '`Wayfinder`: plans the work, assigns bounded scopes, integrates accepted artifacts',
    '`Countervoice`: independently challenges premises, evidence, architecture, verification',
    '`Maker`: implements one bounded artifact and returns reproducible proof',
    'Distinct labels inside one context are not independent actors'
  ]) && hasAll(roles, [
    'Default access: read-only',
    'Majority vote is advisory',
    'One actor may cover multiple roles only in sequential mode'
  ])) {
    ok('Proofline separates authority, planning, challenge, and implementation without fake independence');
  } else {
    fail('Proofline role authority or independence contract drifted');
  }

  const signalNames = [
    'FRAME_CHALLENGE',
    'NEED_SIGNAL',
    'HOLD_NOTICE',
    'ASSEMBLY_CALL',
    'PROOF_RETURN',
    'SEAL_PROPOSAL',
    'SEAL_GRANTED',
    'SEAL_DENIED'
  ];
  if (signalNames.every((name) => signals.includes(`\`${name}\``))
      && hasAll(signals, [
        'Signals are typed coordination messages. They do not create authority.',
        'contract_version: exact version or digest',
        'Do not repeat an unchanged signal to simulate progress.'
      ])) {
    ok(`Proofline signal allowlist is complete and non-authorizing (${signalNames.length} signals)`);
  } else {
    fail('Proofline signal allowlist or authority boundary drifted');
  }

  if (hasAll(handback, [
    'scope_assigned: exact files, systems, or semantic resources',
    'scope_used: exact files, systems, or semantic resources actually touched',
    'oracle_integrity: protected | changed-with-approval | unresolved',
    'cleanup_status: clean | quarantined | failed | not-applicable'
  ]) && skill.includes("A model's confidence or agreement is not an objective oracle")) {
    ok('Proofline handbacks bind artifacts to scope, oracle integrity, cleanup, and reproducible proof');
  } else {
    fail('Proofline Proof Return evidence contract drifted');
  }

  if (hasAll(skill, [
    'grant id, grantor, exact action, target, scope, issue time, expiry or single-use limit, revocation state',
    'Recheck the grant immediately before each mutation and before seal'
  ]) && hasAll(signals, [
    'Consequential approval is a separate data object, never a role signal',
    'If identity cannot be authenticated or any binding is stale, the grant cannot authorize mutation or sealing.'
  ]) && hasAll(controls, [
    '## Safe stop and resume',
    'freeze dispatch, integration, and sealing, then revoke every writer lease'
  ])) {
    ok('Proofline authority grants expire, bind exact actions, and fail closed through a reproducible safe stop');
  } else {
    fail('Proofline authority-expiry or safe-stop controls drifted');
  }

  if (hasAll(skill, [
    'Set lane heartbeats, lease expiries, hard deadlines, retry caps',
    'reserve verification capacity before dispatch and debit actual use'
  ]) && hasAll(signals, [
    'non-monotonic sequence values',
    'signals sent after the contract is closed',
    'closing sequence'
  ]) && hasAll(handback, [
    'immutable manifest of scoped repository state',
    'artifact_digest: canonical digest of the exact artifact or diff',
    'tree_digest: canonical digest of the exact tree that was verified'
  ])) {
    ok('Proofline freshness, replay, liveness, budget, and exact-tree evidence controls are explicit');
  } else {
    fail('Proofline freshness, replay, liveness, budget, or exact-tree controls drifted');
  }

  if (hasAll(skill, [
    'require a denied write canary outside the assigned scope',
    'A recorded seal is not itself a deploy or merge permission',
    'Correlated model bias, unavailable humans, external runtime compromise'
  ]) && hasAll(roles, [
    'Shared context or inherited conclusions automatically downgrade the result to self-review',
    'Never auto-fail over write authority.'
  ]) && hasAll(controls, [
    'classification, least-reader access, redaction, retention/deletion rule',
    '## Irreducible limits'
  ])) {
    ok('Proofline runtime probes, review provenance, privacy, fenced failover, and irreducible limits stay visible');
  } else {
    fail('Proofline runtime, bias, privacy, failover, or residual-limit controls drifted');
  }

  if (hasAll(runner, [
    'export function canonicalize',
    'export function computeContractDigest',
    'const SIGNAL_SENDERS',
    'SIGNAL_REPLAY',
    'OPEN_BLOCKER',
    'PROOF_SECRET'
  ])) {
    ok('Proofline executable ledger validates canonical bindings, sender transitions, replay, blockers, and evidence safety');
  } else {
    fail('Proofline executable ledger state-machine contract drifted');
  }

  if (hasAll(runner, [
    'export function authorizeScopedWrite',
    'export function createFencedLeaseGateway',
    'export function createGatewayState',
    'export function createProtectedActionGatewaySimulator',
    'stale integration fence',
    'grant use limit is exhausted'
  ])) {
    ok('Proofline scope, fencing, and protected-action policy simulators stay available for deterministic tests');
  } else {
    fail('Proofline deterministic policy-simulator contract drifted');
  }

  const examplePath = path.join(root, `${base}/examples/auth-migration-case.json`);
  const targetRunnerPath = path.join(root, `${base}/scripts/run-proofline-sandbox.mjs`);
  const trustedRunnerPath = path.join(validatorRoot, `${base}/scripts/run-proofline-sandbox.mjs`);
  let runnerMatches = false;
  try {
    runnerMatches = fs.readFileSync(targetRunnerPath).equals(fs.readFileSync(trustedRunnerPath));
  } catch {}
  runnerMatches ? ok('Proofline target runner matches the trusted bundled runner byte for byte') : fail('Proofline target runner differs from the trusted validator runner');

  const exampleRun = spawnSync(process.execPath, [trustedRunnerPath, examplePath], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true
  });
  let exampleValid = false;
  try {
    const parsed = JSON.parse(exampleRun.stdout);
    exampleValid = exampleRun.status === 0 && parsed.valid === true && parsed.sealEligible === true && parsed.checks >= 240;
  } catch {}
  if (exampleValid) {
    ok('Proofline bundled authentication case passes the trusted executable sandbox ledger');
  } else {
    fail('Proofline bundled authentication case is stale or invalid');
  }

  let negativeValid = false;
  let tempRoot = null;
  try {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'proofline-validator-'));
    const baseScenario = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
    const cases = [
      ['missing-signal-chain', 'SIGNAL_CHAIN', (scenario) => { scenario.signals = []; }],
      ['active-plan-only', 'SAFE_PLAN_LIFECYCLE', (scenario) => {
        scenario.mode = 'plan-only';
        scenario.lifecycle = 'active';
        scenario.seal.state = 'not-eligible';
        scenario.integrationLease.active = false;
        scenario.signals = [];
      }],
      ['withdrawn-final-signal', 'SIGNAL_CHAIN_STATUS', (scenario) => { scenario.signals.at(-1).status = 'withdrawn'; }],
      ['early-seal-proposal', 'SEAL_ORDER', (scenario) => {
        scenario.signals.find((entry) => entry.type === 'SEAL_PROPOSAL').issuedAt = '2026-08-02T03:59:19.000Z';
      }]
    ];
    negativeValid = cases.every(([name, expectedCode, mutate]) => {
      const invalidScenario = JSON.parse(JSON.stringify(baseScenario));
      mutate(invalidScenario);
      const invalidPath = path.join(tempRoot, `${name}.json`);
      fs.writeFileSync(invalidPath, JSON.stringify(invalidScenario), { encoding: 'utf8', mode: 0o600 });
      const invalidRun = spawnSync(process.execPath, [trustedRunnerPath, invalidPath], {
        cwd: root,
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      });
      const parsed = JSON.parse(invalidRun.stdout);
      return invalidRun.status === 1 && parsed.valid === false && parsed.sealEligible === false
        && parsed.errors.some((entry) => entry.code === expectedCode);
    });
  } catch {}
  finally {
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  negativeValid ? ok('Proofline trusted negative controls reject signal, safe-mode, status, and timeline bypasses') : fail('Proofline trusted negative controls did not fail closed');

  const packageJson = readJson('package.json');
  const sourceHarnessValid = !isKitSourceRepo || (
    exists('test/proofline/scripts/test-run-proofline-sandbox.mjs')
    && hasAll(read('test/proofline/scripts/test-run-proofline-sandbox.mjs'), [
      'real sandbox case: authorized source edit passes an unchanged protected oracle',
      'safe states: plan-only, sequential, hold, and denial never become seal-eligible',
      'shared state prevents double consume across instances'
    ])
    && packageJson?.scripts?.['test:proofline'] === 'node test/proofline/scripts/test-run-proofline-sandbox.mjs'
    && packageJson?.scripts?.test?.includes('npm run test:proofline')
    && packageJson?.scripts?.['check:syntax']?.includes('node --check .vibekit/skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs')
  );
  if (sourceHarnessValid) {
    ok('Proofline adversarial sandbox harness and package validation wiring stay synchronized');
  } else {
    fail('Proofline adversarial sandbox harness or package wiring drifted');
  }

  const providerConfig = readJson(`${base}/assets/paseo-config.fragment.json`);
  const providers = providerConfig?.agents?.providers ?? {};
  const providerIds = ['proofline-keeper', 'proofline-wayfinder', 'proofline-countervoice', 'proofline-maker'];
  const providersValid = providerIds.every((id) => {
    const entry = providers[id];
    return entry?.extends === 'codex'
      && typeof entry.label === 'string'
      && JSON.stringify(entry.command) === JSON.stringify(['codex', '--profile', id]);
  });
  if (providersValid && hasAll(adapter, [
    'https://paseo.sh/docs/custom-providers',
    'https://paseo.sh/docs/orchestration',
    'https://paseo.sh/docs/worktrees',
    'https://paseo.sh/docs/security',
    'Proofline never performs these global writes automatically',
    'A worktree separates Git branch and directory state. It does not isolate OS user credentials'
  ])) {
    ok('Proofline Paseo adapter is source-linked, optional, manual, and explicit about worktree limits');
  } else {
    fail('Proofline Paseo adapter compatibility or security contract drifted');
  }

  const roleModes = {
    keeper: 'read-only',
    wayfinder: 'workspace-write',
    countervoice: 'read-only',
    maker: 'workspace-write'
  };
  const profilesValid = Object.entries(roleModes).every(([role, mode]) => {
    const rel = `${base}/assets/codex-profiles/proofline-${role}.config.toml`;
    if (!exists(rel)) return false;
    const text = read(rel);
    return text.includes(`sandbox_mode = "${mode}"`)
      && text.includes('approval_policy = ')
      && text.includes('developer_instructions = """')
      && !/^model\s*=/m.test(text);
  });
  const projectAgentsValid = !surfacePresent.codex || Object.entries(roleModes).every(([role, mode]) => {
    const rel = `.codex/agents/proofline-${role}.toml`;
    if (!exists(rel)) return false;
    const text = read(rel);
    return text.includes(`name = "proofline_${role}"`)
      && text.includes('description = ')
      && text.includes(`sandbox_mode = "${mode}"`)
      && text.includes('developer_instructions = """')
      && !/^model\s*=/m.test(text);
  });
  if (profilesValid && projectAgentsValid) {
    ok('Proofline Codex profiles and project agents declare role-appropriate sandboxes without pinning models');
  } else {
    fail('Proofline Codex profile or project-agent contract drifted');
  }

  const sourceDiscoveryValid = !isKitSourceRepo || (
    hasAll(read('README.md'), ['All 25 skills', '| `proofline-orchestration`', '`/proofline`'])
    && hasAll(read('docs/README.vi.md'), ['Cả 25 skill', '| `proofline-orchestration`', '`/proofline`'])
    && hasAll(read('docs/README.zh-CN.md'), ['全部 25 个技能', '| `proofline-orchestration`', '`/proofline`'])
    && hasAll(read('docs/README.ja.md'), ['25 個すべてのスキル', '| `proofline-orchestration`', '`/proofline`'])
    && hasAll(read('.vibekit/docs/INSTALL.md'), ['Fifteen user-invoked skills', '`proofline-orchestration`'])
    && hasAll(read('package.json'), [
      '.claude/skills/proofline-orchestration/',
      '.cursor/skills/proofline-orchestration/'
    ])
    && hasAll(read('.codex/README.md'), ['proofline_keeper', 'proofline_countervoice'])
  );
  if (hasAll(ui, [
    'display_name: "Proofline Orchestration"',
    'Use $proofline-orchestration'
  ]) && sourceDiscoveryValid) {
    ok('Proofline discovery, localization, UI metadata, Codex roles, and packaging stay synchronized');
  } else {
    fail('Proofline discovery, localization, UI metadata, Codex roles, or packaging drifted');
  }

  const prooflineReadmes = ['README.md', 'docs/README.vi.md', 'docs/README.zh-CN.md', 'docs/README.ja.md'];
  const diagramsValid = !isKitSourceRepo || prooflineReadmes.every((rel) => hasAll(read(rel), [
    'securityLevel: strict',
    'flowchart TD',
    'Request([',
    'Work --> Review',
    'Review --> Test',
    'Test --> Gate',
    'class Ready success;',
    'class Review accent;',
    'linkStyle default stroke:#444444,stroke-width:1.5px;'
  ]));
  if (diagramsValid) {
    ok('Proofline localized Mermaid workflows use strict Vivid Clay styling and explicit fail-closed gates');
  } else {
    fail('Proofline localized Mermaid workflow or styling drifted');
  }

  const guidesValid = !isKitSourceRepo || (
    prooflineReadmes.every((rel) => hasAll(read(rel), [
      'run-proofline-sandbox.mjs',
      'auth-migration-case.json',
      'npm run test:proofline'
    ]))
    && hasAll(read('README.md'), [
      'stop AI from grading its own work',
      '#### Practical benefits',
      '#### The simplest way to start',
      '#### Real example: changing login permissions'
    ])
    && hasAll(read('docs/README.vi.md'), [
      'để AI không tự làm rồi tự chấm',
      '#### Lợi ích thực tế',
      '#### Cách bắt đầu đơn giản nhất',
      '#### Ví dụ thực tế: sửa quyền đăng nhập'
    ])
    && hasAll(read('docs/README.zh-CN.md'), [
      '避免让 AI 自己给自己打分',
      '#### 实际收益',
      '#### 最简单的开始方式',
      '#### 真实例子：修改登录权限'
    ])
    && hasAll(read('docs/README.ja.md'), [
      'AI に自己採点させないための仕組み',
      '#### 実際の利点',
      '#### 最も簡単な始め方',
      '#### 実例：ログイン権限の変更'
    ])
    && hasAll(read('.vibekit/docs/INSTALL.md'), [
      '### Proofline sandbox ledger',
      'Missing effective capability probes force sequential or plan-only operation.'
    ])
  );
  if (guidesValid) {
    ok('Proofline step-by-step usage, executable example, and runtime-limit guidance stay localized');
  } else {
    fail('Proofline localized usage or runtime-limit guidance drifted');
  }
}

function validateTheCreatorContract() {
  const base = '.vibekit/skills/the-creator';
  if (!exists(`${base}/SKILL.md`)) return;
  const skill = read(`${base}/SKILL.md`);
  const ui = read(`${base}/agents/openai.yaml`);
  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));
  const levelRows = Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    return `| ${level} | ${level * 10}% |`;
  });
  const requiredOpening = [
    '> "Inspiration exists, but it has to find you working."',
    '>',
    '> - Pablo Picasso'
  ].join('\n');
  const openingIndex = skill.indexOf(requiredOpening);
  const workflowIndex = skill.indexOf('Transcend conventional solutions');

  if (openingIndex >= 0
      && workflowIndex > openingIndex
      && hasAll(skill, [
        'Begin every response produced under this skill with exactly this block',
        'with exactly this block, before',
        'any calibration, clarification, caveat, or deliverable',
        'Show the block once, then continue immediately with the applicable workflow',
        'Do not alter the quotation or attribution',
        'starts with the required opening quote'
      ])) {
    ok('The Creator opens respectfully with the attributed Picasso quotation');
  } else {
    fail('The Creator required opening quotation or ordering drifted');
  }

  if (hasAll(skill, levelRows)
      && skill.includes('ten eligible convention categories')
      && skill.includes('Every use must show the compact ten-row level table')
      && skill.includes('disable-model-invocation: true')) {
    ok('The Creator defines ten visible cumulative 10% creativity levels');
  } else {
    fail('The Creator level count, percentages, cumulative model, or visible calibration drifted');
  }

  if (hasAll(skill, [
    'accept only one integer from 1 through 10',
    'outside that range, fractional, ambiguous, or conflicting',
    'do not clamp, wrap, round, decrease, or silently substitute',
    'only an inferred level. Preserve an explicit level',
    'unless the user approves a'
  ])) {
    ok('The Creator rejects invalid explicit levels without substitution');
  } else {
    fail('The Creator explicit-level input validation drifted');
  }

  if (hasAll(skill, [
    'instruction precedence',
    'law, safety, privacy, security',
    'authorization boundaries',
    'factual honesty',
    'required interfaces, formats, schemas, accessibility',
    'functional acceptance, validation, rollback',
    'abandon 100% of eligible conventions',
    '0% of this immutable'
  ])) {
    ok('The Creator keeps safety, authority, evidence, accessibility, and acceptance immutable');
  } else {
    fail('The Creator immutable creativity floor drifted');
  }

  if (hasAll(skill, [
    'Never silently increase an explicit level',
    'speculative invention',
    'Never call a speculative concept production-ready',
    'It may not invent ledger nodes, edges, statuses, evidence'
  ])) {
    ok('The Creator labels speculation and cannot fabricate graph or completion state');
  } else {
    fail('The Creator speculation, level-control, or graph-integrity contract drifted');
  }

  const discoveryValid = !isKitSourceRepo || (
    exists('README.md')
    && read('README.md').includes('All 25 skills')
    && exists('docs/README.vi.md')
    && read('docs/README.vi.md').includes('Cả 25 skill')
    && read('docs/README.vi.md').includes('| `the-creator`')
    && exists('docs/README.zh-CN.md')
    && read('docs/README.zh-CN.md').includes('全部 25 个技能')
    && read('docs/README.zh-CN.md').includes('| `the-creator`')
    && exists('docs/README.ja.md')
    && read('docs/README.ja.md').includes('25 個すべてのスキル')
    && read('docs/README.ja.md').includes('| `the-creator`')
    && exists('.vibekit/docs/INSTALL.md')
    && read('.vibekit/docs/INSTALL.md').includes('Fifteen user-invoked skills')
    && exists('.vibekit/init/CLAUDE-template.md')
    && read('.vibekit/init/CLAUDE-template.md').includes('/the-creator level N')
    && exists('package.json')
    && hasAll(read('package.json'), [
      '.claude/skills/the-creator/',
      '.cursor/skills/the-creator/'
    ])
  );
  if (hasAll(ui, [
    'display_name: "The Creator"',
    'Use $the-creator at level 6'
  ]) && discoveryValid) {
    ok('The Creator discovery, localization, UI metadata, and packaging stay synchronized');
  } else {
    fail('The Creator discovery, localization, UI metadata, or packaging drifted');
  }
}

function validateControlCenterContract() {
  const base = '.vibekit/skills/agent-control-center';
  const swapBase = '.vibekit/skills/swap-control-center';
  if (!exists(`${base}/SKILL.md`) || !exists(`${swapBase}/SKILL.md`)) return;
  const resources = [
    'agents/openai.yaml',
    'examples/cursor-codex-cursor-workers.json',
    'examples/native-sequential.json',
    'references/controller-modes.md',
    'references/capability-contract.md',
    'references/codex-cli-bridge.md',
    'references/handoff-contract.md',
    'references/provider-selection.md',
    'schemas/controller-response.schema.json',
    'scripts/codex-cli-controller-bridge.mjs',
    'scripts/validate-controller-contract.mjs'
  ];
  const missingResources = resources.filter((file) => !exists(`${base}/${file}`));
  if (missingResources.length > 0
    || !exists(`${swapBase}/agents/openai.yaml`)
    || !exists(`${swapBase}/references/examples.md`)
    || !exists(`${swapBase}/references/codex-extension-recovery.md`)) {
    fail(`Control Center resources are incomplete: ${missingResources.join(', ')}`);
    return;
  }

  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));
  const skill = read(`${base}/SKILL.md`);
  const controllerModes = read(`${base}/references/controller-modes.md`);
  const capabilities = read(`${base}/references/capability-contract.md`);
  const codexBridge = read(`${base}/references/codex-cli-bridge.md`);
  const handoff = read(`${base}/references/handoff-contract.md`);
  const providerSelection = read(`${base}/references/provider-selection.md`);
  const swapPreset = read(`${swapBase}/SKILL.md`);
  const swapExamples = read(`${swapBase}/references/examples.md`);
  const codexRecovery = read(`${swapBase}/references/codex-extension-recovery.md`);
  const parallelAnalysis = read('.vibekit/skills/parallel-analysis/SKILL.md');
  const proofline = read('.vibekit/skills/proofline-orchestration/SKILL.md');
  const sequentialThinking = read('.vibekit/skills/sequential-thinking/SKILL.md');
  const clearthought = read('.vibekit/skills/clearthought/SKILL.md');

  hasAll(skill, [
    'Keep exactly one controller',
    'plain MCP',
    '`controller`: `native`, `auto`',
    '`relay_mode`',
    '`controller_route`',
    '`worker_routes`',
    'Apply controller precedence',
    'Reasoning skills such as `sequential-thinking` and `clearthought`',
    'bundled contract',
    'ORCHESTRATION_MODES.md',
    'requested-not-attested',
    'codex-cli-bridge.md',
    'switch controllers silently'
  ])
    ? ok('Agent Control Center separates controller ownership, host authority, routing, and attestation')
    : fail('Agent Control Center ownership, routing, or attestation contract drifted');

  hasAll(controllerModes, [
    '## Fixed provider',
    '### Codex',
    'Do not invoke `cursor-agent`',
    'disables Codex multi-agent execution',
    'failed explicit override stops',
    'Codex app-server owned by the Cursor extension',
    'Manual is a transport, not a controller',
    'Allow at most one transfer per task',
    'A controller choice does not authorize multi-agent work'
  ])
    ? ok('Agent Control Center prevents recursive or implicit controller transfer')
    : fail('Agent Control Center controller transfer contract drifted');

  hasAll(capabilities, [
    '`ready`',
    '`installed-unverified`',
    '`unavailable`',
    '`ready` applies to one transport only',
    'including prerelease components',
    'untrusted local candidate-order',
    'generic executable name',
    'Do not bypass the limit'
  ])
    ? ok('Agent Control Center classifies each provider transport independently and fails closed')
    : fail('Agent Control Center capability or quota contract drifted');

  hasAll(codexBridge, [
    'preflight',
    '## Executable selection',
    '`MVCK_CODEX_BIN`',
    '`routeBindingDigest`',
    'bridge-owned child process',
    '`installed-unverified`',
    '`AskUserTool`',
    '`catalogDigest`',
    '`recoveryPlan`',
    '`max`',
    '`ultra`',
    'neutral inactive values',
    'explicit captured session',
    'It never uses `--last`',
    'multi-agent execution',
    'Provider and model coverage',
    'fake CLI tests'
  ])
    ? ok('Agent Control Center includes a stateful fail-closed Codex CLI bridge contract')
    : fail('Agent Control Center Codex CLI bridge contract drifted');

  hasAll(handoff, [
    '## Task envelope',
    '## Work order',
    '## Proof receipt',
    '## Control decision',
    '## Host-mediated controller loop',
    'version: 2',
    'controller_route:',
    'worker_defaults:',
    'selection_source',
    '`automatic-host-relay`',
    'Complete examples and trace validation',
    '`topology=proofline`',
    'It is not direct remote control'
  ])
    ? ok('Agent Control Center defines bounded handoffs, receipts, and control decisions')
    : fail('Agent Control Center handoff contract drifted');

  hasAll(providerSelection, [
    '## Parent-only questions',
    '`AskUserQuestion`',
    '`request_user_input`',
    '**Worker provider and transport.**',
    'Selecting `controller=codex` does not select Codex',
    'Derive `manual-handoff`',
    'manual` implies relay mode `manual-handoff`',
    '## User-question relay',
    'provider documentation. Use primary provider sources only',
    '## Setup state machine',
    'Require explicit approval',
    '## Host-mediated controller loop',
    'AskUserTool',
    '`requested-not-attested`'
  ])
    ? ok('Agent Control Center selects and sets up provider routes from live evidence')
    : fail('Agent Control Center provider selection or setup contract drifted');

  hasAll(swapPreset, [
    '../agent-control-center/SKILL.md',
    "host's exposed structured",
    'controller=<provider-id>',
    'Resolve controller and worker routes independently',
    'Derive `manual-handoff` from a manual controller',
    '## Codex selection',
    '### Cursor-hosted Codex executable priority',
    '`MVCK_CODEX_BIN`',
    'route-binding digest',
    'controller=codex',
    'Do not launch Codex analysis lanes',
    'stateful bridge',
    'Do not require Cursor CLI',
    'Obtain explicit user',
    'Never run co-controllers',
    'codex-extension-recovery.md',
    'single-use and action-specific',
    'Never manually edit `models_cache.json`',
    'requested-not-attested'
  ])
    ? ok('Swap Control Center provides dynamic verified selection and one bounded transfer')
    : fail('Swap Control Center selection, setup, or transfer contract drifted');

  hasAll(codexRecovery, [
    'Diagnose without mutation first',
    'Approval is action-specific and single-use',
    'Do not treat `recoveryPlan` as approval',
    'Never offer a manual cache version bump',
    'Runtime drift on reply',
    'ask separate approval before starting'
  ])
    ? ok('Swap Control Center defines approval-gated Cursor Codex recovery')
    : fail('Swap Control Center Cursor Codex recovery contract drifted');

  const responseSchema = readJson(`${base}/schemas/controller-response.schema.json`);
  const responseRootFields = [
    'version', 'task_id', 'kind', 'work_orders', 'question', 'decision', 'reason', 'receipt_bindings'
  ];
  const responseSchemaCompatible = responseSchema
    && responseSchema.type === 'object'
    && responseSchema.additionalProperties === false
    && responseRootFields.every((field) => responseSchema.required?.includes(field))
    && !Object.prototype.hasOwnProperty.call(responseSchema, 'oneOf')
    && responseSchema.properties?.version?.type === 'integer'
    && responseSchema.properties?.kind?.type === 'string'
    && Array.isArray(responseSchema.properties?.question?.type)
    && responseSchema.properties.question.type.includes('null')
    && Array.isArray(responseSchema.properties?.decision?.type)
    && responseSchema.properties.decision.type.includes('null');
  responseSchemaCompatible
    ? ok('Codex controller response schema uses flat required nullable root fields')
    : fail('Codex controller response schema is incompatible with the reviewed structured-output surface');

  hasAll(parallelAnalysis, [
    '## External-controller executor mode',
    'Use this workflow only when `controller=native` or `controller=current`',
    '`Codex lanes`',
    'user-selected worker',
    'same controller session'
  ]) && hasAll(swapExamples, [
    '`automatic-host-relay`',
    '`controller=codex`',
    '`MVCK_CODEX_BIN`',
    'extension-owned app-server',
    'Cursor-native worker route and model',
    'does not create its own'
  ]) && hasAll(proofline, [
    '## External-controller composition',
    'sole Wayfinder and task controller',
    'independently selected worker provider',
    'must not become controllers',
    'same controller session',
    "controller's `accept` decision is invalid",
    '`SEAL_GRANTED` receipt'
  ]) && hasAll(sequentialThinking, [
    '## External-controller precedence',
    'must not split the task into work items or lanes',
    'reasoning method for'
  ]) && hasAll(clearthought, [
    '## External-controller precedence',
    'must not split the task',
    'reasoning method for'
  ])
    ? ok('External controllers own decomposition while topology skills use independently selected workers')
    : fail('Control Center topology composition or external-controller precedence drifted');

  const nativeFixture = readJson(`${base}/examples/native-sequential.json`);
  const externalFixture = readJson(`${base}/examples/cursor-codex-cursor-workers.json`);
  const fixtureResults = [nativeFixture, externalFixture]
    .map((fixture) => fixture && validateControllerContract(fixture));
  if (fixtureResults.every((result) => result?.valid)) {
    ok('Control Center complete native and external traces satisfy the executable contract');
  } else {
    fail(`Control Center trace fixture failed: ${JSON.stringify(fixtureResults.flatMap((result) => result?.errors || []))}`);
  }

  if (externalFixture) {
    const routeMismatch = JSON.parse(JSON.stringify(externalFixture));
    routeMismatch.workOrders[0].executor_transport = 'host-sequential';
    const hostDecomposition = JSON.parse(JSON.stringify(externalFixture));
    hostDecomposition.trace.splice(1, 0, { type: 'host-decomposed', actor: 'host' });
    const prooflineWithoutSeal = JSON.parse(JSON.stringify(externalFixture));
    prooflineWithoutSeal.taskEnvelope.topology = 'proofline';
    const rejectionCodes = [
      validateControllerContract(routeMismatch),
      validateControllerContract(hostDecomposition),
      validateControllerContract(prooflineWithoutSeal)
    ].map((result) => new Set(result.errors.map((error) => error.code)));
    const rejectsReviewedFailures = rejectionCodes[0].has('UNAPPROVED_WORKER_ROUTE')
      && rejectionCodes[1].has('HOST_DECOMPOSITION')
      && rejectionCodes[2].has('PROOFLINE_SEAL_REQUIRED');
    rejectsReviewedFailures
      ? ok('Control Center executable contract rejects the reviewed route, precedence, and seal failures')
      : fail('Control Center executable contract no longer rejects all reviewed failure traces');
  }

  const allSurfaces = ['claude', 'cursor', 'codex', 'opencode', 'grok', 'kimi'];
  const manifestValid = ['agent-control-center', 'swap-control-center'].every((name) => {
    const entry = manifestSkills.find((skillEntry) => skillEntry.name === name);
    return entry && allSurfaces.every((surface) => entry.surfaces.includes(surface));
  });
  manifestValid
    ? ok('Control Center skills are registered for all six provider surfaces')
    : fail('Control Center provider manifest coverage drifted');

  const removedPreset = 'codex-control-center';
  const stalePresetDirs = [
    `.vibekit/skills/${removedPreset}`,
    `.claude/skills/${removedPreset}`,
    `.cursor/skills/${removedPreset}`,
    `.agents/skills/${removedPreset}`,
    `.grok/skills/${removedPreset}`,
    `.kimi-code/skills/${removedPreset}`
  ].filter((path) => exists(path));
  const staleSourceFiles = !isKitSourceRepo ? [] : [
    'README.md',
    'docs/README.vi.md',
    'docs/README.zh-CN.md',
    'docs/README.ja.md',
    'docs/README.ko.md',
    'docs/README.de.md',
    'docs/README.bg.md',
    '.vibekit/docs/INSTALL.md',
    '.codex/README.md',
    '.opencode/README.md',
    '.grok/README.md',
    '.kimi-code/README.md',
    'package.json'
  ].filter((path) => exists(path) && read(path).includes(removedPreset));
  const removedPresetAbsent = !manifestSkills.some((entry) => entry.name === removedPreset)
    && stalePresetDirs.length === 0
    && staleSourceFiles.length === 0;
  removedPresetAbsent
    ? ok('The redundant Codex preset stays removed from runtime and discovery surfaces')
    : fail(`Removed Control Center preset returned: ${[
      ...stalePresetDirs,
      ...staleSourceFiles
    ].join(', ')}`);

  const sourceDiscoveryValid = !isKitSourceRepo || (
    hasAll(read('README.md'), ['All 25 skills', '| `agent-control-center`', '| `swap-control-center`'])
    && hasAll(read('docs/README.vi.md'), ['Cả 25 skill', '| `agent-control-center`', '| `swap-control-center`'])
    && hasAll(read('docs/README.zh-CN.md'), ['全部 25 个技能', '| `agent-control-center`', '| `swap-control-center`'])
    && hasAll(read('docs/README.ja.md'), ['25 個すべてのスキル', '| `agent-control-center`', '| `swap-control-center`'])
    && read('docs/README.ko.md').includes('| `swap-control-center`')
    && read('docs/README.de.md').includes('| `swap-control-center`')
    && read('docs/README.bg.md').includes('| `swap-control-center`')
    && hasAll(read('.vibekit/docs/INSTALL.md'), ['Fifteen user-invoked skills', '`agent-control-center`', '`swap-control-center`'])
    && hasAll(read('package.json'), [
      '.claude/skills/agent-control-center/',
      '.claude/skills/swap-control-center/',
      '.cursor/skills/agent-control-center/',
      '.cursor/skills/swap-control-center/'
    ])
  );
  sourceDiscoveryValid
    ? ok('Control Center discovery, localization, packaging, and provider coverage stay synchronized')
    : fail('Control Center discovery, localization, packaging, or provider coverage drifted');
}

function validateCloneWebsiteContract() {
  const base = '.vibekit/skills/clone-website';
  if (!exists(`${base}/SKILL.md`)) return;
  const resources = [
    'agents/openai.yaml',
    'references/capture-automation.md',
    'references/intake-and-levels.md',
    'references/minimal-vibe-integration.md',
    'references/output-templates.md',
    'references/platform-playbooks.md',
    'references/replica-brief.example.json',
    'references/safety-and-rights.md',
    'references/verification-contract.md',
    'references/workflow-routing.md',
    'scripts/asset-workflow-lib.mjs',
    'scripts/build-capture-routes.mjs',
    'scripts/capture-preflight.mjs',
    'scripts/capture-screenshots.mjs',
    'scripts/capture-workflow-lib.mjs',
    'scripts/download-authorized-assets.mjs',
    'scripts/fetch-public-catalog.mjs',
    'scripts/normalize-local-export.mjs',
    'scripts/prepare-replica-workspace.mjs',
    'scripts/report-capture-completeness.mjs',
    'scripts/verify-local-assets.mjs',
    'scripts/validate_replica_brief.py'
  ];
  const missingResources = resources.filter((file) => !exists(`${base}/${file}`));
  if (missingResources.length > 0) {
    fail(`Clone Website canonical resources are incomplete: ${missingResources.join(', ')}`);
    return;
  }

  const hasAll = (text, snippets) => snippets.every((snippet) => text.includes(snippet));
  const skill = read(`${base}/SKILL.md`);
  const intake = read(`${base}/references/intake-and-levels.md`);
  const localDevelopment = read(`${base}/references/local-development.md`);
  const routing = read(`${base}/references/workflow-routing.md`);
  const assets = read(`${base}/references/authorized-data-and-assets.md`);
  const safety = read(`${base}/references/safety-and-rights.md`);
  const verification = read(`${base}/references/verification-contract.md`);
  const validator = read(`${base}/scripts/validate_replica_brief.py`);
  const workspace = read(`${base}/scripts/prepare-replica-workspace.mjs`);
  const ui = read(`${base}/agents/openai.yaml`);
  const example = readJson(`${base}/references/replica-brief.example.json`);

  hasAll(skill, [
    'name: clone-website',
    'Confirm authorization before capture',
    'Component UI Developer',
    'public-research-local',
    'Playwright',
    'relative local path',
    'backend level `B0` to `B2`',
    'PASS WITH EXCEPTIONS'
  ])
    ? ok('Clone Website skill keeps authorization, capture, architecture, and verdict boundaries')
    : fail('Clone Website skill safety or workflow contract drifted');

  hasAll(intake, [
    '`B0 static`',
    '`B1 small`',
    '`B2 scale-ready`',
    'Preserve a working repository stack',
    'Public research cannot use S4',
    '`AskUserQuestion`',
    '`request_user_input`'
  ])
    ? ok('Clone Website intake defines dynamic fidelity, scope, stack, and backend choices')
    : fail('Clone Website intake choices drifted');

  hasAll(localDevelopment, [
    '`preserve-existing`',
    '`host-native`',
    '`docker-compose`',
    '`docker-desktop`',
    '`docker-engine`',
    '`compose-compatible`',
    '`custom`',
    'Do not install an engine',
    'docker compose config --quiet'
  ]) && hasAll(validator, [
    'LOCAL_DEVELOPMENT_MODES',
    'CONTAINER_ENGINES',
    'replica.local_development'
  ])
    ? ok('Clone Website keeps local runtime selection explicit, flexible, and validated')
    : fail('Clone Website local development contract drifted');

  hasAll(routing, [
    'shopify-to-shopify-hydrogen',
    'wordpress-to-astro-typescript',
    'woocommerce-to-nextjs-app-router',
    'Do not recommend a stack because it is fashionable'
  ]) && hasAll(assets, [
    'download-authorized-assets.mjs',
    'normalize-local-export.mjs',
    'verify-local-assets.mjs'
  ]) && hasAll(read(`${base}/references/capture-automation.md`), [
    'capture-preflight.mjs',
    'fetch-public-catalog.mjs',
    'capture-screenshots.mjs',
    'report-capture-completeness.mjs'
  ])
    ? ok('Clone Website routes platform stacks and keeps authorized asset workflow explicit')
    : fail('Clone Website platform routing or authorized asset workflow drifted');

  hasAll(safety, [
    'A request to clone is not evidence of ownership',
    'Capture boundary',
    'Playwright',
    'Chrome DevTools Console',
    'relative local path',
    'prompts or provider switching intended to evade'
  ]) && hasAll(verification, [
    'The implementer cannot pass work using only a self-authored checklist',
    'Local browser traffic contains no external requests',
    'Public research may claim layout parity only',
    'Every rendered image and media reference maps to one current relative local path'
  ])
    ? ok('Clone Website separates rights, local evidence, and independent verification')
    : fail('Clone Website rights or verification contract drifted');

  hasAll(workspace, [
    'workspace root must be a real directory, not a symlink',
    'workspace root is too broad',
    'workspace target escaped its parent',
    "'.replica/evidence'",
    "'.replica/manifests'",
    "'.replica/screenshots'"
  ])
    ? ok('Clone Website workspace setup keeps local artifacts in a bounded project root')
    : fail('Clone Website workspace safety contract drifted');

  hasAll(validator, [
    'MAX_BRIEF_BYTES',
    'reject_duplicate_keys',
    'ipaddress.ip_address',
    'must not use symlinks',
    'instruction-like text',
    'local-artifacts-only',
    'Capture policy',
    'public research cannot use B2',
    'def atomic_write',
    'never expose an uncaught traceback'
  ])
    ? ok('Clone Website brief validator retains URL, path, injection, and atomic-write guards')
    : fail('Clone Website brief validator safety markers drifted');

  if (example?.replica?.backend_level === 'B0'
    && example?.replica?.local_development?.mode === 'preserve-existing'
    && example?.replica?.local_development?.container_engine === 'none'
    && example?.authorization?.status === 'public-research-local'
    && example?.authorization?.content_rights === 'neutralized'
    && example?.target?.data_mode === 'local-artifacts-only') {
    ok('Clone Website example uses the safe public-research default');
  } else {
    fail('Clone Website example safe default drifted');
  }

  const manifestEntry = manifestSkills.find((skillEntry) => skillEntry.name === 'clone-website');
  const allSurfaces = ['claude', 'cursor', 'codex', 'opencode', 'grok', 'kimi'];
  const manifestValid = manifestEntry
    && allSurfaces.every((surface) => manifestEntry.surfaces.includes(surface));
  manifestValid
    ? ok('Clone Website is registered for all six provider surfaces')
    : fail('Clone Website provider manifest coverage drifted');

  if (hasAll(ui, [
    'display_name: "Clone Website"',
    'Use $clone-website'
  ])) {
    ok('Clone Website UI metadata matches the skill name');
  } else {
    fail('Clone Website UI metadata drifted');
  }

  const sourceDiscoveryValid = !isKitSourceRepo || (
    hasAll(read('README.md'), ['All 25 skills', 'Cursor uses the 20 interactive ones', '| `clone-website`'])
    && hasAll(read('docs/README.vi.md'), ['Cả 25 skill', 'Cursor mirror 20 skill', '| `clone-website`'])
    && hasAll(read('docs/README.zh-CN.md'), ['全部 25 个技能', '20 个交互式技能', '| `clone-website`'])
    && hasAll(read('docs/README.ja.md'), ['25 個すべてのスキル', '20 個をミラー', '| `clone-website`'])
    && read('docs/README.ko.md').includes('| `clone-website`')
    && read('docs/README.de.md').includes('| `clone-website`')
    && read('docs/README.bg.md').includes('| `clone-website`')
    && hasAll(read('.vibekit/docs/INSTALL.md'), ['Fifteen user-invoked skills', '`clone-website`'])
    && hasAll(read('package.json'), [
      '"test:clone-website"',
      '.claude/skills/clone-website/',
      '.cursor/skills/clone-website/'
    ])
  );
  sourceDiscoveryValid
    ? ok('Clone Website discovery, localization, packaging, and tests stay synchronized')
    : fail('Clone Website discovery, localization, packaging, or tests drifted');
}

validateAutoresearchContract();
validateSequentialThinkingContract();
validateThreatModelSecurityReviewContract();
validateCleanDeliveryContract();
validateOrchestrationModeContract();
validateNamedVerificationContract();
validateMermaidContract();
validateGraphEngineeringContract();
validateProoflineContract();
validateTheCreatorContract();
validateControlCenterContract();
validateCloneWebsiteContract();

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

for (const surface of new Set(['.vibekit/skills', ...Object.values(MANIFEST_SURFACE_DIRS)])) {
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
  if (surfacePresent.opencode) cmdMirrors['.opencode/commands'] = true;
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
      if (mirrorDir === '.opencode/commands') {
        parseFrontmatter(read(mirRel))?.description
          ? ok(`OpenCode command ${mirRel} has a description`)
          : fail(`OpenCode command ${mirRel} is missing frontmatter description`);
      }
    }
  }
}

for (const rel of ['package.json', '.claude/settings.json', '.cursor/settings.json', '.cursor/cli.json', '.codex-plugin/plugin.json', 'opencode.json']) {
  if (!exists(rel)) continue;
  try { JSON.parse(read(rel)); ok(`valid JSON ${rel}`); } catch (error) { fail(`invalid JSON ${rel}: ${error.message}`); }
}

const pkg = exists('package.json') ? readJson('package.json') : null;
const codexPlugin = exists('.codex-plugin/plugin.json') ? readJson('.codex-plugin/plugin.json') : null;
if (codexPlugin) {
  const pluginName = codexPlugin.name;
  if (typeof pluginName === 'string' && pluginName.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pluginName)) {
    ok('Codex plugin name is lowercase hyphen-case and at most 64 characters');
  } else {
    fail('Codex plugin name must be lowercase hyphen-case and at most 64 characters');
  }
}
if (isKitSourceRepo && pkg?.version) {
  if (codexPlugin?.version === pkg.version) ok(`Codex plugin version matches package version ${pkg.version}`);
  else fail(`Codex plugin version ${codexPlugin?.version || 'missing'} differs from package version ${pkg.version}`);
  const readmeNavigationContracts = [
    {
      rel: 'README.md',
      tokens: [
        '**English**',
        '[Tiếng Việt](docs/README.vi.md)',
        '[简体中文](docs/README.zh-CN.md)',
        '[日本語](docs/README.ja.md)',
        '[한국어](docs/README.ko.md)',
        '[Deutsch](docs/README.de.md)',
        '[Български](docs/README.bg.md)'
      ],
      starRequest: 'If you use this kit and it actually helps you, drop a star. It tells me it’s useful to one more person and gives me the energy to keep improving it'
    },
    {
      rel: 'docs/README.vi.md',
      tokens: ['[English](../README.md)', '**Tiếng Việt**', '[简体中文](README.zh-CN.md)', '[日本語](README.ja.md)', '[한국어](README.ko.md)', '[Deutsch](README.de.md)', '[Български](README.bg.md)'],
      starRequest: 'Nếu bộ kit này thực sự giúp ích cho bạn, hãy tặng repo một Star. Điều đó cho tôi biết nó hữu ích thêm với một người nữa và tiếp thêm năng lượng để tôi tiếp tục cải thiện nó.'
    },
    {
      rel: 'docs/README.zh-CN.md',
      tokens: ['[English](../README.md)', '[Tiếng Việt](README.vi.md)', '**简体中文**', '[日本語](README.ja.md)', '[한국어](README.ko.md)', '[Deutsch](README.de.md)', '[Български](README.bg.md)'],
      starRequest: '如果这个工具包确实对你有帮助，请点个 Star。这会让我知道它又帮助了一个人，也会给我继续改进它的动力。'
    },
    {
      rel: 'docs/README.ja.md',
      tokens: ['[English](../README.md)', '[Tiếng Việt](README.vi.md)', '[简体中文](README.zh-CN.md)', '**日本語**', '[한국어](README.ko.md)', '[Deutsch](README.de.md)', '[Български](README.bg.md)'],
      starRequest: 'このキットが実際に役立ったなら、ぜひ Star を付けてください。もう一人の役に立てたと分かり、改善を続ける力になります。'
    },
    {
      rel: 'docs/README.ko.md',
      tokens: ['[English](../README.md)', '[Tiếng Việt](README.vi.md)', '[简体中文](README.zh-CN.md)', '[日本語](README.ja.md)', '**한국어**', '[Deutsch](README.de.md)', '[Български](README.bg.md)'],
      starRequest: '이 키트가 실제로 도움이 되었다면 Star를 눌러 주세요. 한 사람에게 더 유용했다는 것을 알 수 있고, 계속 개선할 힘이 됩니다.'
    },
    {
      rel: 'docs/README.de.md',
      tokens: ['[English](../README.md)', '[Tiếng Việt](README.vi.md)', '[简体中文](README.zh-CN.md)', '[日本語](README.ja.md)', '[한국어](README.ko.md)', '**Deutsch**', '[Български](README.bg.md)'],
      starRequest: 'Wenn dir dieses Kit wirklich hilft, gib dem Repository bitte einen Star. So weiß ich, dass es einem weiteren Menschen nützt, und bekomme neue Energie, es weiter zu verbessern.'
    },
    {
      rel: 'docs/README.bg.md',
      tokens: ['[English](../README.md)', '[Tiếng Việt](README.vi.md)', '[简体中文](README.zh-CN.md)', '[日本語](README.ja.md)', '[한국어](README.ko.md)', '[Deutsch](README.de.md)', '**Български**'],
      starRequest: 'Ако този комплект наистина ви помага, дайте звезда на хранилището. Така разбирам, че е полезен за още един човек, и получавам енергия да продължа да го подобрявам.'
    }
  ];
  for (const { rel, starRequest } of readmeNavigationContracts) {
    if (!exists(rel)) {
      fail(`${rel} localized README is missing`);
      continue;
    }
    read(rel).includes(`version-${pkg.version}-`)
      ? ok(`${rel} version badge matches package version ${pkg.version}`)
      : fail(`${rel} version badge differs from package version ${pkg.version}`);
    read(rel).includes(`\n\n${starRequest}\n\n</div>`)
      ? ok(`${rel} places the author star request directly below the introductory tagline`)
      : fail(`${rel} is missing the author star request below the introductory tagline`);
  }

  const localizedReadmeNavigationValid = readmeNavigationContracts.every(({ rel, tokens }) => (
    exists(rel) && tokens.every((token) => read(rel).includes(token))
  ));
  localizedReadmeNavigationValid
    ? ok('Seven-language README navigation stays synchronized')
    : fail('Localized README navigation drifted');

  const translatedReadmeContracts = [
    { rel: 'docs/README.ko.md', markers: ['## 빠른 시작', '전체 25개 스킬', '## 고급 사용', '## 기여', '## 라이선스'] },
    { rel: 'docs/README.de.md', markers: ['## Schnellstart', 'Alle 25 Skills', '## Erweitert', '## Mitwirken', '## Lizenz'] },
    { rel: 'docs/README.bg.md', markers: ['## Бърз старт', 'Всички 25 умения', '## Разширена употреба', '## Принос', '## Лиценз'] }
  ];
  const sharedCoverage = [
    '`/init-vibe`',
    '`/security-scan`',
    '`/clean-delivery`',
    '`/proofline`',
    'ORCHESTRATION_MODES.md',
    'npm run test:proofline',
    'graph-engineering-verified-orchestration',
    'agentshield-probe.mjs',
    'npm run validate:all'
  ];
  const translatedCoverageValid = translatedReadmeContracts.every(({ rel, markers }) => {
    if (!exists(rel)) return false;
    const text = read(rel);
    return [...markers, ...sharedCoverage, ...KIT_SKILLS.map((skill) => `| \`${skill}\``)]
      .every((token) => text.includes(token));
  });
  translatedCoverageValid
    ? ok('Korean, German, and Bulgarian READMEs cover setup, commands, all skills, orchestration, security, and release validation')
    : fail('Korean, German, or Bulgarian README coverage drifted');
}
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
// not replace native checks - verify semantics with each tool's own validator
// (e.g. `codex execpolicy check`, `grok inspect`).
for (const [rel, settings] of [['.claude/settings.json', claudeSettings], ['.cursor/settings.json', cursorSettings]]) {
  const deny = settings?.permissions?.deny;
  if (!Array.isArray(deny)) continue;
  const piped = deny.filter((rule) => rule.includes('|'));
  piped.length === 0
    ? ok(`${rel} deny rules avoid pipe-spanning patterns (subcommands are matched independently)`)
    : fail(`${rel} deny rules span a pipe and never match: ${piped.join(', ')}`);
  const yesFirst = deny.some((rule) => rule.startsWith('Bash(npx --yes') || rule.startsWith('Bash(npx ' + '-y'));
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
if (surfacePresent.opencode) {
  requireText('opencode.json', '"external_directory": "deny"', 'OpenCode config denies external directories');
  requireText('opencode.json', '"rm": "deny"', 'OpenCode config denies rm');
}
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
  if (/^\d+$/.test(schemaVersion || '') && (!isKitSourceRepo || Number(schemaVersion) >= 4)) ok(`backbone schema_version is ${schemaVersion}`);
  else fail(`backbone schema_version must be numeric, got ${schemaVersion || 'empty'}`);

  const validateCommand = values.get('commands.validate');
  if (validateCommand && validateCommand !== 'null') ok('backbone commands.validate is set');
  else fail('backbone commands.validate is empty');

  const verificationFields = ['unit', 'acceptance', 'architecture', 'property', 'mutation', 'e2e'];
  const hasVerification = keys.has('commands.verification');
  if (!hasVerification) {
    if (isKitSourceRepo) fail('kit-source backbone missing commands.verification');
    else ok('backbone commands.verification is absent and remains backward compatible');
  } else {
    let valid = true;
    for (const field of verificationFields) {
      const key = 'commands.verification.' + field;
      const value = values.get(key);
      if (!keys.has(key) || value === '' || /^(?:true|false|\[\]|\{\})$/.test(value || '')) valid = false;
    }
    valid
      ? ok('backbone commands.verification defines six command-or-null fields')
      : fail('backbone commands.verification must define unit, acceptance, architecture, property, mutation, and e2e as command strings or null');
  }

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

const scanDirs = [...new Set([
  ...MANIFEST_SURFACE_ROOTS,
  '.opencode',
  'opencode.json',
  '.codex',
  '.codex-plugin',
  '.vibekit/skills',
  '.vibekit/commands',
  '.vibekit/scripts',
  'AGENTS.md',
  '.vibekit/init/CLAUDE-template.md'
])];
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

const agentSurfaceFiles = scanDirs.flatMap(walk);
for (const file of agentSurfaceFiles) {
  if (!/\.(md|mdc|json|toml|yml|yaml|js|mjs|cjs|ts|tsx|py|sh|ps1|html|htm)$/i.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const r of riskyPatterns) {
    if (text.includes(r.pattern)) warn(`${path.relative(root, file)} contains ${r.message}`);
  }
}

const unpinnedScanner = 'npx' + ' ecc-agentshield ';
const unpinnedScannerFiles = agentSurfaceFiles
  .filter((file) => /\.(md|mdc|json|toml|yml|yaml|js|mjs|py|sh|ps1|html)$/i.test(file))
  .filter((file) => fs.readFileSync(file, 'utf8').includes(unpinnedScanner));
unpinnedScannerFiles.length === 0
  ? ok('agent surfaces avoid unpinned ecc-agentshield npx execution')
  : fail(`agent surfaces contain unpinned ecc-agentshield npx execution: ${unpinnedScannerFiles.map((file) => path.relative(root, file)).join(', ')}`);

requireText('.vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py', '".html"', 'AgentShield probe scans executable HTML surfaces');
requireText('.vibekit/skills/agentshield-security-review/scripts/agentshield_repo_probe.py', '"npx" + " ecc-agentshield "', 'AgentShield probe flags unpinned scanner execution');

const targetProbe = path.join(root, '.vibekit/scripts/agentshield-probe.mjs');
const trustedProbe = path.join(validatorRoot, '.vibekit/scripts/agentshield-probe.mjs');
if (fs.existsSync(targetProbe)) {
  let probeMatches = false;
  try { probeMatches = fs.readFileSync(targetProbe).equals(fs.readFileSync(trustedProbe)); } catch {}
  probeMatches ? ok('AgentShield target probe matches the trusted bundled probe byte for byte') : fail('AgentShield target probe differs from the trusted validator probe');
  const result = spawnSync(process.execPath, [trustedProbe, root, '--json'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true
  });
  if (result.status === 0) ok('Trusted AgentShield repo probe runs against the target');
  else warn(`Trusted AgentShield probe did not run: ${result.stderr || result.stdout}`);
}

console.log(`\nValidation summary: ${failures} failures, ${warnings} warnings.`);
process.exit(failures ? 1 : 0);
