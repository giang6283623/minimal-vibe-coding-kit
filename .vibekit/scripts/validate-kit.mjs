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
  codex: isKitSourceRepo || exists('.agents') || exists('.codex') || exists('.codex-plugin'),
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
  'graph-engineering-verified-orchestration': [
    'agents/openai.yaml',
    'references/graph-contract.md',
    'references/graph-visualization.md',
    'scripts/render-graph.mjs'
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
  ]
};

const reasoningSurfaceDirs = ['.vibekit/skills'];
if (surfacePresent.claude) reasoningSurfaceDirs.push('.claude/skills');
if (surfacePresent.cursor) reasoningSurfaceDirs.push('.cursor/skills');
if (surfacePresent.codex) reasoningSurfaceDirs.push('.agents/skills');
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

function validateMermaidContract() {
  const base = '.vibekit/skills/mermaid';
  if (!exists(`${base}/SKILL.md`)) return;
  const skill = read(`${base}/SKILL.md`);
  const examples = read(`${base}/references/kit-examples.md`);
  const preview = read(`${base}/references/preview.html`);
  const notice = read(`${base}/UPSTREAM-NOTICE.md`);
  const debug = read(`${base}/references/debug-heatmap.md`);
  const styling = read(`${base}/references/styling-preset.md`);
  const imported = listFiles(`${base}/references`)
    .filter((file) => file.endsWith('.md'))
    .map((file) => read(`${base}/references/${file}`))
    .join('\n');

  const diagrams = [...examples.matchAll(/```mermaid\s*\n([\s\S]*?)\n```/g)].map((match) => match[1]);
  const distinctCases = ['Safe configuration promotion', 'Repository safety evolution', 'Localization release board', 'Validation feedback time', 'Duplicate webhook investigation'];
  if (diagrams.length === 5
      && diagrams.every((diagram) => diagram.includes('securityLevel: strict'))
      && distinctCases.every((name) => examples.toLowerCase().includes(name.toLowerCase()))) {
    ok('Mermaid maintains five strict kit-native examples');
  } else {
    fail('Mermaid kit-native example set, strict security, or distinct cases drifted');
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
      'All 18 skills',
      'Graph engineering: verified orchestration',
      'edgeLabelBackground: "#FFFFFF"'
    ])
    && readmeVi.includes('Graph engineering: điều phối có xác minh')
    && readmeZh.includes('图工程：经验证的编排')
    && install.includes('Eight user-invoked skills')
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

  if (hasAll(skill, levelRows)
      && skill.includes('ten eligible convention categories')
      && skill.includes('Every use must show the compact ten-row level table')
      && skill.includes('disable-model-invocation: true')) {
    ok('The Creator defines ten visible cumulative 10% creativity levels');
  } else {
    fail('The Creator level count, percentages, cumulative model, or visible calibration drifted');
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
    && read('README.md').includes('All 18 skills')
    && exists('docs/README.vi.md')
    && read('docs/README.vi.md').includes('Cả 18 skill')
    && read('docs/README.vi.md').includes('| `the-creator`')
    && exists('docs/README.zh-CN.md')
    && read('docs/README.zh-CN.md').includes('全部 18 个技能')
    && read('docs/README.zh-CN.md').includes('| `the-creator`')
    && exists('.vibekit/docs/INSTALL.md')
    && read('.vibekit/docs/INSTALL.md').includes('Eight user-invoked skills')
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

validateSequentialThinkingContract();
validateMermaidContract();
validateGraphEngineeringContract();
validateTheCreatorContract();

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

for (const surface of ['.vibekit/skills', ...Object.values(MANIFEST_SURFACE_DIRS)]) {
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

const scanDirs = [...new Set([
  ...MANIFEST_SURFACE_ROOTS,
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

const probe = path.join(root, '.vibekit/scripts/agentshield-probe.mjs');
if (fs.existsSync(probe)) {
  const result = spawnSync(process.execPath, [probe, root, '--json'], { encoding: 'utf8' });
  if (result.status === 0) ok('AgentShield repo probe runs');
  else warn(`AgentShield probe did not run: ${result.stderr || result.stdout}`);
}

console.log(`\nValidation summary: ${failures} failures, ${warnings} warnings.`);
process.exit(failures ? 1 : 0);
