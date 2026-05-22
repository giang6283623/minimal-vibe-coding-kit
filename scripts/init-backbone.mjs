#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const target = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const shouldWrite = args.includes('--write');
const yes = args.includes('--yes');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function fileExists(rel) { return fs.existsSync(path.join(target, rel)); }

function walk(dir, limit = 5000) {
  const out = [];
  const skip = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.venv', 'vendor']);
  function inner(current) {
    if (out.length >= limit) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) inner(p);
      else out.push(path.relative(target, p).replaceAll(path.sep, '/'));
      if (out.length >= limit) return;
    }
  }
  try { inner(dir); } catch {}
  return out;
}

function countExt(files) {
  const counts = new Map();
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!ext) continue;
    counts.set(ext, (counts.get(ext) || 0) + 1);
  }
  return counts;
}

function detectLanguage(files) {
  const counts = countExt(files);
  const scores = {
    ts: (counts.get('.ts') || 0) + (counts.get('.tsx') || 0),
    js: (counts.get('.js') || 0) + (counts.get('.jsx') || 0) + (counts.get('.mjs') || 0),
    py: counts.get('.py') || 0,
    go: counts.get('.go') || 0,
    rs: counts.get('.rs') || 0,
    java: counts.get('.java') || 0,
    dotnet: (counts.get('.cs') || 0) + (counts.get('.fs') || 0),
    php: counts.get('.php') || 0,
    ruby: counts.get('.rb') || 0
  };
  for (const marker of ['go.mod', 'Cargo.toml', 'pyproject.toml', 'package.json', 'pom.xml', 'composer.json', 'Gemfile']) {
    if (fileExists(marker)) {
      if (marker === 'go.mod') scores.go += 20;
      if (marker === 'Cargo.toml') scores.rs += 20;
      if (marker === 'pyproject.toml') scores.py += 20;
      if (marker === 'package.json') {
        if (fileExists('tsconfig.json') || scores.ts > 0) scores.ts += 10;
        else scores.js += 10;
      }
      if (marker === 'pom.xml') scores.java += 20;
      if (marker === 'composer.json') scores.php += 20;
      if (marker === 'Gemfile') scores.ruby += 20;
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'unknown';
}

function packageManager() {
  if (fileExists('pnpm-lock.yaml')) return 'pnpm';
  if (fileExists('yarn.lock')) return 'yarn';
  if (fileExists('bun.lockb') || fileExists('bun.lock')) return 'bun';
  if (fileExists('package-lock.json') || fileExists('package.json')) return 'npm';
  if (fileExists('uv.lock')) return 'uv';
  if (fileExists('poetry.lock')) return 'poetry';
  if (fileExists('requirements.txt') || fileExists('pyproject.toml')) return 'pip';
  if (fileExists('go.mod')) return 'go';
  if (fileExists('Cargo.toml')) return 'cargo';
  if (fileExists('pom.xml')) return 'maven';
  if (fileExists('build.gradle') || fileExists('build.gradle.kts')) return 'gradle';
  if (fileExists('composer.json')) return 'composer';
  if (fileExists('Gemfile')) return 'bundler';
  return 'unknown';
}

function projectName() {
  const pkg = readJson(path.join(target, 'package.json'));
  if (pkg?.name) return String(pkg.name).split('/').pop();
  if (fileExists('go.mod')) {
    const text = fs.readFileSync(path.join(target, 'go.mod'), 'utf8');
    const match = text.match(/^module\s+(.+)$/m);
    if (match) return match[1].trim().split('/').pop();
  }
  if (fileExists('pyproject.toml')) {
    const text = fs.readFileSync(path.join(target, 'pyproject.toml'), 'utf8');
    const match = text.match(/^name\s*=\s*["']([^"']+)["']/m);
    if (match) return match[1];
  }
  return path.basename(target);
}

function description() {
  const pkg = readJson(path.join(target, 'package.json'));
  if (pkg?.description) return String(pkg.description);
  const readme = ['README.md', 'readme.md'].find(fileExists);
  if (readme) {
    const lines = fs.readFileSync(path.join(target, readme), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const line = lines.find((x) => !x.startsWith('#') && !x.startsWith('!['));
    if (line) return line.replace(/^>\s*/, '').slice(0, 160);
  }
  return 'TBD';
}

function projectType() {
  const markers = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json', 'go.work'];
  if (markers.some(fileExists)) return 'monorepo';
  return 'single-repo';
}

function commands(pm, lang) {
  const pkg = readJson(path.join(target, 'package.json'));
  const prefix = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun' : 'npm run';
  const c = { install: null, test: null, lint: null, typecheck: null, build: null, validate: null };
  if (pkg?.scripts) {
    c.install = pm === 'pnpm' ? 'pnpm install' : pm === 'yarn' ? 'yarn install' : pm === 'bun' ? 'bun install' : 'npm install';
    if (pkg.scripts.test) c.test = pm === 'npm' ? 'npm test' : `${prefix} test`;
    if (pkg.scripts.lint) c.lint = `${prefix} lint`;
    if (pkg.scripts.typecheck) c.typecheck = `${prefix} typecheck`;
    if (pkg.scripts.build) c.build = `${prefix} build`;
  } else if (lang === 'go') {
    c.test = 'go test ./...'; c.build = 'go build ./...';
  } else if (lang === 'py') {
    c.test = 'pytest -q';
  } else if (lang === 'rs') {
    c.test = 'cargo test'; c.build = 'cargo build';
  } else if (lang === 'java') {
    c.test = fileExists('pom.xml') ? 'mvn test' : 'gradle test';
    c.build = fileExists('pom.xml') ? 'mvn package' : 'gradle build';
  }
  c.validate = c.test || c.build || c.lint || 'echo "No validation command detected"';
  return c;
}

function yamlString(value) {
  if (value === null || value === undefined) return 'null';
  const s = String(value);
  if (/^[a-zA-Z0-9_./:-]+( [a-zA-Z0-9_./:-]+)*$/.test(s)) return s;
  return JSON.stringify(s);
}

function render(data) {
  const cmd = data.commands;
  return `# Minimal Vibe Coding Kit backbone. See docs/BACKBONE_REFERENCE.md for details.\nversion: 2\nmeta:\n  template_status: initialized\n  initialized_at: ${yamlString(data.initializedAt)}\n  template_source: minimal-vibe-coding-kit\n  schema_version: 3\n  init_runbook: FIRST_TIME_INIT.md\n  init_done_marker: .vibekit/INIT_DONE\n\nproject:\n  name: ${yamlString(data.name)}\n  description: ${yamlString(data.description)}\n  type: ${data.type}\n  primary_language: ${data.language}\n  package_manager: ${data.packageManager}\n\npaths:\n  root: .\n  apps:\n    - .\n  source: ${JSON.stringify(data.sourcePaths)}\n  tests: ${JSON.stringify(data.testPaths)}\n  docs: [README.md, docs/]\n  generated: [node_modules/, dist/, build/, coverage/]\n\ncommands:\n  install: ${yamlString(cmd.install)}\n  test: ${yamlString(cmd.test)}\n  lint: ${yamlString(cmd.lint)}\n  typecheck: ${yamlString(cmd.typecheck)}\n  build: ${yamlString(cmd.build)}\n  validate: ${yamlString(cmd.validate)}\n\npolicy:\n  default_branch: main\n  branch_naming: "feat/<short-topic>"\n  commit_style: conventional\n  editable_paths: [.]\n  protected_paths:\n    - .git/\n    - .env*\n    - "**/*secret*"\n    - "**/*token*"\n    - "**/migrations/**"\n    - "**/node_modules/**"\n    - "**/dist/**"\n    - "**/build/**"\n    - "**/coverage/**"\n    - "**/*lock*"\n\nagent_surfaces:\n  claude: .claude/\n  cursor: .cursor/\n  codex: .agents/\n  codex_plugin: .codex-plugin/plugin.json\n  shared_skills: skills/\n  shared_commands: commands/\n\nautomation:\n  autoresearch:\n    results_file: results.tsv\n    logs_dir: .autoresearch/logs\n    default_budget: 3\n    default_timeout_seconds: 600\n  daily_enhance:\n    report_dir: .vibekit/reports\n    write_mode: propose_only\n  security:\n    probe: python skills/agentshield-security-review/scripts/agentshield_repo_probe.py .\n    scan: npx ecc-agentshield scan --path . --format text --min-severity medium\n`;
}

function inferPaths(files) {
  const dirs = new Set(files.map((f) => f.split('/')[0]));
  const sourceCandidates = ['src', 'app', 'lib', 'cmd', 'pkg', 'internal', 'server', 'client', 'packages'];
  const testCandidates = ['test', 'tests', '__tests__', 'spec'];
  return {
    sourcePaths: sourceCandidates.filter((d) => dirs.has(d)),
    testPaths: testCandidates.filter((d) => dirs.has(d))
  };
}

const files = walk(target);
const lang = detectLanguage(files);
const pm = packageManager();
const inferred = {
  initializedAt: new Date().toISOString(),
  name: projectName(),
  description: description(),
  type: projectType(),
  language: lang,
  packageManager: pm,
  commands: commands(pm, lang),
  ...inferPaths(files)
};

const out = render(inferred);
const backbonePath = path.join(target, 'backbone.yml');

if (shouldWrite) {
  if (!yes) {
    console.error('Refusing to write without --yes. Run with --propose first, review, then --write --yes.');
    process.exit(1);
  }
  fs.writeFileSync(backbonePath, out);
  const marker = path.join(target, '.vibekit', 'INIT_DONE');
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, `initialized_at: ${inferred.initializedAt}\nschema_version: 3\ntool: minimal-vibe-coding-kit\n`);
  console.log(`Initialized backbone.yml at ${inferred.initializedAt}`);
} else {
  console.log('Requirements detected:');
  console.log(`- target: ${target}`);
  console.log(`- backbone.yml: ${fileExists('backbone.yml') ? 'found' : 'missing'}`);
  console.log(`- project: ${inferred.name}`);
  console.log(`- language: ${inferred.language}`);
  console.log(`- package manager: ${inferred.packageManager}`);
  console.log(`- validate command: ${inferred.commands.validate}`);
  console.log('\nProposed backbone.yml:\n');
  console.log(out);
  console.log('Review this proposal. To write it after approval, run: node scripts/init-backbone.mjs . --write --yes');
}
