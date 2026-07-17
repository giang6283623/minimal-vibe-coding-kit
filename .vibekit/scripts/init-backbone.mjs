#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function trashAvailable() {
  const result = spawnSync('trash', ['--help'], { encoding: 'utf8' });
  return !(result.error && result.error.code === 'ENOENT');
}
const shouldWrite = args.includes('--write');
const yes = args.includes('--yes');

function parseArgs(argv, { valueFlags = [] } = {}) {
  const values = new Set(valueFlags);
  const flags = new Set();
  const options = new Map();
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!item.startsWith('--')) {
      positionals.push(item);
      continue;
    }

    const eq = item.indexOf('=');
    if (eq >= 0) {
      const key = item.slice(0, eq);
      flags.add(key);
      options.set(key, item.slice(eq + 1));
    } else {
      flags.add(item);
      if (values.has(item) && argv[i + 1] && !argv[i + 1].startsWith('--')) {
        options.set(item, argv[i + 1]);
        i += 1;
      }
    }
  }

  return { flags, options, positionals };
}

const parsed = parseArgs(args, { valueFlags: ['--preset'] });
const target = path.resolve(parsed.positionals[0] || process.cwd());
const preset = parsed.options.get('--preset') || 'auto';

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

function uniqueLimit(values, limit = 12) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function yamlList(values, indent = 4) {
  if (!values?.length) return ' []';
  const pad = ' '.repeat(indent);
  return `\n${values.map((value) => `${pad}- ${yamlString(value)}`).join('\n')}`;
}

function cleanName(name) {
  return name.replace(/^\.+/, '').replace(/\.[^.]+$/, '');
}

function isKitManagedPath(file) {
  const managedRoots = new Set(['.claude', '.cursor', '.agents', '.codex', '.codex-plugin', '.vibekit']);
  const managedFiles = new Set([
    'AGENTS.md',
    '.vibekit/init/CLAUDE-template.md',
    '.vibekit/init/FIRST_PROMPT.md',
    '.vibekit/init/FIRST_TIME_INIT.md',
    'backbone.yml',
    '.vibekit/scripts/mvck.mjs',
    '.vibekit/scripts/init-backbone.mjs',
    '.vibekit/scripts/daily-enhance.mjs',
    '.vibekit/scripts/validate-kit.mjs',
    '.vibekit/scripts/doctor.mjs',
    '.vibekit/scripts/test-install.mjs',
    '.vibekit/scripts/agentshield-probe.mjs',
    '.vibekit/scripts/pack-dry-run.mjs',
    '.vibekit/scripts/vibekit-finalize.mjs'
  ]);
  const root = file.split('/')[0];
  return managedRoots.has(root) || managedFiles.has(file);
}

function classifyCase(name) {
  const value = cleanName(name);
  if (!value || /^\d+$/.test(value)) return null;
  if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(value)) return 'kebab-case';
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(value)) return 'snake_case';
  if (/^[A-Z][A-Za-z0-9]*$/.test(value)) return 'PascalCase';
  if (/^[a-z][A-Za-z0-9]*$/.test(value) && /[A-Z]/.test(value)) return 'camelCase';
  if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(value)) return 'UPPER_SNAKE_CASE';
  if (/^[a-z0-9]+$/.test(value)) return 'lowercase';
  return 'mixed';
}

function dominantCase(names) {
  const counts = new Map();
  for (const name of names) {
    const style = classifyCase(name);
    if (!style) continue;
    counts.set(style, (counts.get(style) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { style: 'not-detected', evidence: [] };
  const total = ranked.reduce((sum, item) => sum + item[1], 0);
  const [style, count] = ranked[0];
  return {
    style: count / total >= 0.45 ? style : 'mixed',
    evidence: ranked.slice(0, 4).map(([itemStyle, itemCount]) => `${itemStyle}: ${itemCount}`)
  };
}

function detectAppPaths(files) {
  const candidates = [];
  const workspaceRoots = new Set(['apps', 'packages', 'services', 'workspaces']);
  for (const file of files) {
    const parts = file.split('/');
    if (parts.length >= 3 && workspaceRoots.has(parts[0])) candidates.push(`${parts[0]}/${parts[1]}`);
  }
  for (const direct of ['client', 'server', 'frontend', 'backend', 'mobile', 'api', 'web']) {
    if (files.some((file) => file.startsWith(`${direct}/`))) candidates.push(direct);
  }
  return uniqueLimit(candidates, 16).length ? uniqueLimit(candidates, 16) : ['.'];
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

function projectType(files = []) {
  const markers = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json', 'go.work'];
  if (markers.some(fileExists)) return 'monorepo';
  if (fileExists('.gitmodules')) return 'multi-repo';
  const appPaths = detectAppPaths(files);
  if (appPaths.length > 1 && appPaths[0] !== '.') return 'monorepo';
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

function applyPreset(data, presetName) {
  if (presetName === 'auto') return data;
  const pkg = readJson(path.join(target, 'package.json'));
  const hasScript = (name) => Boolean(pkg?.scripts?.[name]);
  const detectedValidate = data.commands.validate && !data.commands.validate.startsWith('echo ');
  const presets = {
    nextjs: {
      language: data.language === 'unknown' ? 'ts' : data.language,
      packageManager: data.packageManager === 'unknown' ? 'npm' : data.packageManager,
      sourcePaths: ['app', 'pages', 'src', 'components'].filter(fileExists),
      testPaths: ['tests', '__tests__', 'e2e'].filter(fileExists),
      commands: {
        install: data.commands.install || 'npm install',
        test: data.commands.test,
        lint: data.commands.lint || (hasScript('lint') ? 'npm run lint' : null),
        typecheck: data.commands.typecheck || (hasScript('typecheck') ? 'npm run typecheck' : null),
        build: data.commands.build || (hasScript('build') ? 'npm run build' : null),
        validate: data.commands.test || data.commands.lint || data.commands.typecheck || data.commands.build || 'echo "Set a Next.js validation command"'
      }
    },
    wordpress: {
      language: 'php',
      packageManager: data.packageManager === 'unknown' ? 'composer' : data.packageManager,
      sourcePaths: ['wp-content', 'app', 'src'].filter(fileExists),
      testPaths: ['tests'].filter(fileExists),
      commands: {
        install: data.commands.install || (fileExists('composer.json') ? 'composer install' : null),
        test: data.commands.test,
        lint: data.commands.lint,
        typecheck: data.commands.typecheck,
        build: data.commands.build,
        validate: data.commands.test || data.commands.lint || 'echo "Set a WordPress validation command"'
      }
    },
    python: {
      language: 'py',
      packageManager: data.packageManager === 'unknown' ? 'pip' : data.packageManager,
      sourcePaths: data.sourcePaths.length ? data.sourcePaths : ['src'].filter(fileExists),
      testPaths: data.testPaths.length ? data.testPaths : ['tests'].filter(fileExists),
      commands: {
        install: data.commands.install || (fileExists('pyproject.toml') ? 'pip install -e .' : fileExists('requirements.txt') ? 'pip install -r requirements.txt' : null),
        test: data.commands.test || 'pytest -q',
        lint: data.commands.lint,
        typecheck: data.commands.typecheck,
        build: data.commands.build,
        validate: data.commands.test || 'pytest -q'
      }
    },
    laravel: {
      language: 'php',
      packageManager: data.packageManager === 'unknown' ? 'composer' : data.packageManager,
      sourcePaths: ['app', 'routes', 'database', 'resources'].filter(fileExists),
      testPaths: ['tests'].filter(fileExists),
      commands: {
        install: data.commands.install || 'composer install',
        test: data.commands.test || 'php artisan test',
        lint: data.commands.lint,
        typecheck: data.commands.typecheck,
        build: data.commands.build || (fileExists('package.json') ? 'npm run build' : null),
        validate: data.commands.test || 'php artisan test'
      }
    },
    docker: {
      language: data.language === 'unknown' ? 'mixed' : data.language,
      packageManager: data.packageManager,
      sourcePaths: data.sourcePaths,
      testPaths: data.testPaths,
      commands: {
        ...data.commands,
        validate: detectedValidate ? data.commands.validate : (fileExists('docker-compose.yml') || fileExists('compose.yml') ? 'docker compose config' : 'echo "Set a Docker validation command"')
      }
    }
  };

  const selected = presets[presetName];
  if (!selected) {
    console.error(`Unknown preset: ${presetName}`);
    console.error('Supported presets: nextjs, wordpress, python, laravel, docker');
    process.exit(1);
  }

  return {
    ...data,
    ...selected,
    commands: {
      ...data.commands,
      ...selected.commands
    }
  };
}

function yamlString(value) {
  if (value === null || value === undefined) return 'null';
  const s = String(value);
  if (/^[a-zA-Z0-9_./:-]+( [a-zA-Z0-9_./:-]+)*$/.test(s)) return s;
  return JSON.stringify(s);
}

function detectNaming(files) {
  const ignoredDirs = new Set(['node_modules', 'dist', 'build', 'coverage', 'vendor']);
  const codeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.rs', '.java', '.cs', '.php', '.rb', '.dart', '.kt', '.swift']);
  const fileNames = [];
  const dirNames = [];
  const symbolNames = [];
  let scannedCodeFiles = 0;
  for (const file of files) {
    const parts = file.split('/');
    if (parts.some((part) => part.startsWith('.') || ignoredDirs.has(part))) continue;
    if (codeExt.has(path.extname(file).toLowerCase())) {
      fileNames.push(path.basename(file, path.extname(file)));
      if (scannedCodeFiles < 300) {
        const text = readSmallFile(file);
        const pattern = /\b(?:class|interface|enum|type|function|const|let|var|def|func|struct|trait|object)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
        for (const match of text.matchAll(pattern)) symbolNames.push(match[1]);
        scannedCodeFiles += 1;
      }
    }
    for (const part of parts.slice(0, -1)) {
      if (!part.startsWith('.') && !ignoredDirs.has(part)) dirNames.push(part);
    }
  }
  const filesCase = dominantCase(fileNames);
  const dirsCase = dominantCase(dirNames);
  const symbolsCase = dominantCase(symbolNames);
  return {
    files: filesCase.style,
    directories: dirsCase.style,
    symbols: symbolsCase.style,
    evidence: uniqueLimit([
      ...filesCase.evidence.map((x) => `files ${x}`),
      ...dirsCase.evidence.map((x) => `dirs ${x}`),
      ...symbolsCase.evidence.map((x) => `symbols ${x}`)
    ], 10)
  };
}

function detectArchitecture(files) {
  const dirs = new Set();
  for (const file of files) {
    for (const part of file.split('/').slice(0, -1)) {
      if (!part.startsWith('.')) dirs.add(part.toLowerCase());
    }
  }

  const patterns = [];
  if (['models', 'views', 'controllers'].every((dir) => dirs.has(dir))) patterns.push('mvc');
  if (dirs.has('viewmodels') || dirs.has('view_models')) patterns.push('mvvm');
  if (['domain', 'application', 'infrastructure'].every((dir) => dirs.has(dir))) patterns.push('clean-architecture');
  if (dirs.has('features') || dirs.has('modules')) patterns.push('feature-modules');
  if (['controllers', 'services', 'repositories'].filter((dir) => dirs.has(dir)).length >= 2) patterns.push('layered-services');
  if (['screens', 'pages', 'routes'].filter((dir) => dirs.has(dir)).length >= 1) patterns.push('route-or-screen-structured');
  if (['cmd', 'internal', 'pkg'].filter((dir) => dirs.has(dir)).length >= 2) patterns.push('go-standard-layout');
  if (['apps', 'packages', 'services'].filter((dir) => dirs.has(dir)).length >= 1) patterns.push('workspace-packages');

  return {
    detected: uniqueLimit(patterns, 8),
    rule: patterns.length
      ? 'Place new code in the nearest existing layer, feature, app, or package that matches the detected architecture.'
      : 'No dominant architecture was detected; ask before adding new top-level layers or broad structural patterns.'
  };
}

function readSmallFile(rel) {
  const file = path.join(target, rel);
  try {
    const stat = fs.statSync(file);
    if (stat.size > 200_000) return '';
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function detectResourceConventions(files) {
  const assetExt = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.avif', '.ico', '.ttf', '.otf']);
  const codeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.dart', '.kt', '.swift', '.java', '.cs', '.php', '.py', '.rb']);
  const assetRoots = uniqueLimit(files
    .filter((file) => assetExt.has(path.extname(file).toLowerCase()))
    .map((file) => path.dirname(file).replaceAll(path.sep, '/'))
    .filter((dir) => /(^|\/)(assets?|images?|icons?|public|static|res|drawable|mipmap)(\/|$)/i.test(dir)), 12);

  const registryFiles = [];
  let scannedCodeFiles = 0;
  for (const file of files.filter((item) => codeExt.has(path.extname(item).toLowerCase()))) {
    const base = path.basename(file);
    const likelyName = /(app[-_]?images|asset[-_]?paths|assets?|images?|resources?|generated[-_]?assets?)/i.test(base);
    const text = likelyName || scannedCodeFiles < 400 ? readSmallFile(file) : '';
    scannedCodeFiles += 1;
    if (likelyName || /\b(AppImages|AssetPaths|AppAssets|AssetRegistry|ImageAssets)\b|(?:\bAssets|\bImages|\bResources)\s*\./.test(text)) registryFiles.push(file);
  }

  return {
    assetRoots,
    registries: uniqueLimit(registryFiles, 12),
    rule: registryFiles.length
      ? 'Use the existing shared resource accessors or generated resource API; do not add raw asset paths in feature code.'
      : assetRoots.length
        ? 'Avoid scattering repeated literal resource paths; ask before introducing a shared registry or generator.'
        : 'No asset/resource convention was detected; ask before adding a project-wide resource abstraction.'
  };
}

function detectLocalizationConventions(files) {
  const codeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.dart', '.kt', '.swift', '.java', '.cs', '.php', '.py', '.rb']);
  const catalogs = uniqueLimit(files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ext === '.arb' || /(^|\/)(i18n|l10n|locales?|translations?|lang|messages)(\/|$)/i.test(file);
  }), 12);

  const accessors = [];
  let scannedCodeFiles = 0;
  for (const file of files.filter((item) => codeExt.has(path.extname(item).toLowerCase()))) {
    const base = path.basename(file);
    const likelyName = /(localizations?|i18n|l10n|intl|messages?|strings?)/i.test(base);
    const text = likelyName || scannedCodeFiles < 400 ? readSmallFile(file) : '';
    scannedCodeFiles += 1;
    if (likelyName || /\b(AppLocalizations|Intl|I18n)\b|\b(t|translate|tr)\s*\(|\bS\.of\b/.test(text)) accessors.push(file);
  }

  return {
    catalogs,
    accessors: uniqueLimit(accessors, 12),
    rule: catalogs.length || accessors.length
      ? 'Use the existing localization catalogs and message accessors for user-facing text; do not hardcode copy in feature code.'
      : 'No localization convention was detected; follow nearby copy patterns and ask before introducing a project-wide i18n layer.'
  };
}

function detectConventions(files, type) {
  const projectFiles = files.filter((file) => !isKitManagedPath(file));
  const naming = detectNaming(projectFiles);
  const architecture = detectArchitecture(projectFiles);
  const resources = detectResourceConventions(projectFiles);
  const localization = detectLocalizationConventions(projectFiles);
  return {
    scope: type === 'monorepo' ? 'per app/package when evidence differs' : 'repo',
    naming,
    architecture,
    resources,
    localization,
    reviewQuestions: [
      `Confirm naming rules: files=${naming.files}, directories=${naming.directories}, symbols=${naming.symbols}.`,
      `Confirm architecture scope: ${architecture.detected.length ? architecture.detected.join(', ') : 'not detected'}.`,
      `Confirm resource rule: ${resources.registries.length ? 'reuse detected accessors' : 'ask before adding a shared registry'}.`,
      `Confirm localization rule: ${localization.catalogs.length || localization.accessors.length ? 'use detected catalogs/accessors' : 'ask before adding i18n conventions'}.`
    ]
  };
}

const PRD_CANDIDATES = [
  'PRD.md', '.vibekit/docs/PRD.md', 'prd.md', '.vibekit/docs/prd.md',
  'REQUIREMENTS.md', '.vibekit/docs/REQUIREMENTS.md',
  'SPEC.md', '.vibekit/docs/SPEC.md', '.vibekit/docs/spec.md',
  'PRODUCT.md', '.vibekit/docs/PRODUCT.md'
];

function countCodeFiles(files) {
  const codeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.cs', '.fs', '.php', '.rb', '.dart', '.kt', '.swift', '.c', '.cc', '.cpp', '.h', '.hpp', '.scala', '.ex', '.exs', '.clj', '.vue', '.svelte']);
  return files.filter((file) => codeExt.has(path.extname(file).toLowerCase())).length;
}

function detectProjectMode(files) {
  return countCodeFiles(files) === 0 ? 'greenfield' : 'brownfield';
}

function detectPrd(files) {
  for (const candidate of PRD_CANDIDATES) {
    if (fileExists(candidate)) return candidate;
  }
  const dirMatch = files.find((file) => /(^|\/)(prd|product|requirements|specs?)\//i.test(file) && /\.(md|mdx|txt)$/i.test(file));
  return dirMatch || 'none';
}

function detectContext() {
  for (const candidate of ['.vibekit/docs/CONTEXT.md', 'CONTEXT.md', '.vibekit/docs/context.md']) {
    if (fileExists(candidate)) return candidate;
  }
  return 'none';
}

function render(data) {
  const cmd = data.commands;
  const rules = data.conventions;
  return `# Minimal Vibe Coding Kit backbone. See .vibekit/docs/BACKBONE_REFERENCE.md for details.\nversion: 2\nmeta:\n  template_status: initialized\n  initialized_at: ${yamlString(data.initializedAt)}\n  template_source: minimal-vibe-coding-kit\n  schema_version: 3\n  init_runbook: .vibekit/init/FIRST_TIME_INIT.md\n  init_done_marker: .vibekit/INIT_DONE\n\nproject:\n  name: ${yamlString(data.name)}\n  description: ${yamlString(data.description)}\n  type: ${data.type}\n  primary_language: ${data.language}\n  package_manager: ${data.packageManager}\n  mode: ${data.mode}\n  prd: ${yamlString(data.prd)}\n  context: ${yamlString(data.context)}\n\npaths:\n  root: .\n  apps:${yamlList(data.appPaths, 4)}\n  source: ${JSON.stringify(data.sourcePaths)}\n  tests: ${JSON.stringify(data.testPaths)}\n  docs: [README.md, .vibekit/docs/]\n  generated: [node_modules/, dist/, build/, coverage/]\n\nconventions:\n  review_required_before_write: true\n  scope: ${yamlString(rules.scope)}\n  naming:\n    files: ${yamlString(rules.naming.files)}\n    directories: ${yamlString(rules.naming.directories)}\n    symbols: follow existing language and framework conventions in nearby code\n    evidence:${yamlList(rules.naming.evidence, 6)}\n  architecture:\n    detected:${yamlList(rules.architecture.detected, 6)}\n    rule: ${yamlString(rules.architecture.rule)}\n  resources:\n    detected_asset_roots:${yamlList(rules.resources.assetRoots, 6)}\n    detected_registries:${yamlList(rules.resources.registries, 6)}\n    rule: ${yamlString(rules.resources.rule)}\n  localization:\n    detected_catalogs:${yamlList(rules.localization.catalogs, 6)}\n    detected_accessors:${yamlList(rules.localization.accessors, 6)}\n    rule: ${yamlString(rules.localization.rule)}\n  custom_rules:\n    - Add team-specific rules here during init review; future agents must follow them.\n\ncommands:\n  install: ${yamlString(cmd.install)}\n  test: ${yamlString(cmd.test)}\n  lint: ${yamlString(cmd.lint)}\n  typecheck: ${yamlString(cmd.typecheck)}\n  build: ${yamlString(cmd.build)}\n  validate: ${yamlString(cmd.validate)}\n\npolicy:\n  default_branch: main\n  branch_naming: "feat/<short-topic>"\n  commit_style: conventional\n  editable_paths: [.]\n  protected_paths:\n    - .git/\n    - .env*\n    - "**/*secret*"\n    - "**/*token*"\n    - "**/migrations/**"\n    - "**/node_modules/**"\n    - "**/dist/**"\n    - "**/build/**"\n    - "**/coverage/**"\n    - "**/*lock*"\n\nagent_surfaces:\n  claude: .claude/\n  cursor: .cursor/\n  codex: .agents/\n  codex_plugin: .codex-plugin/plugin.json\n  shared_skills: .vibekit/skills/\n  shared_commands: .vibekit/commands/\n\nautomation:\n  autoresearch:\n    results_file: results.tsv\n    logs_dir: .autoresearch/logs\n    default_budget: 3\n    default_timeout_seconds: 600\n  daily_enhance:\n    report_dir: .vibekit/reports\n    write_mode: propose_only\n  finalize:\n    cleanup_dir: _vibekit-cleanup\n    marker: .vibekit/FINALIZE_DONE\n    one_time_files: [.vibekit/init/FIRST_TIME_INIT.md, .vibekit/init/FIRST_PROMPT.md, .vibekit/init/PUSH_TO_GITHUB.md, .vibekit/init/CLAUDE-template.md]\n  security:\n    probe: node .vibekit/scripts/agentshield-probe.mjs .\n    scan: npx ecc-agentshield scan --path . --format text --min-severity medium\n`;
}

function inferPaths(files) {
  const dirs = new Set(files.map((f) => f.split('/')[0]));
  const sourceCandidates = ['src', 'app', 'lib', 'cmd', 'pkg', 'internal', 'server', 'client', 'packages'];
  const testCandidates = ['test', 'tests', '__tests__', 'spec'];
  return {
    appPaths: detectAppPaths(files),
    sourcePaths: sourceCandidates.filter((d) => dirs.has(d)),
    testPaths: testCandidates.filter((d) => dirs.has(d))
  };
}

const files = walk(target);
const projectFiles = files.filter((file) => !isKitManagedPath(file));
const lang = detectLanguage(projectFiles);
const pm = packageManager();
const inferred = applyPreset({
  initializedAt: new Date().toISOString(),
  name: projectName(),
  description: description(),
  type: projectType(projectFiles),
  language: lang,
  packageManager: pm,
  mode: detectProjectMode(projectFiles),
  prd: detectPrd(projectFiles),
  context: detectContext(),
  commands: commands(pm, lang),
  ...inferPaths(projectFiles)
}, preset);
inferred.conventions = detectConventions(projectFiles, inferred.type);

const out = render(inferred).replace(
  'symbols: follow existing language and framework conventions in nearby code',
  `symbols: ${yamlString(inferred.conventions.naming.symbols)}`
);
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
  console.log(`- preset: ${preset}`);
  console.log(`- validate command: ${inferred.commands.validate}`);
  console.log(`- project mode: ${inferred.mode} (${inferred.mode === 'greenfield' ? 'no source code yet' : 'existing source code detected'})`);
  console.log(`- PRD: ${inferred.prd === 'none' ? 'not found' : `found at ${inferred.prd}`}`);
  console.log('\nProject understanding (always offer a short interview, then propose a PRD):');
  console.log('- What is this project and who is it for?');
  console.log('- What core problem does it solve, and what is the primary goal/focus right now?');
  console.log('- What does success look like (key outcomes or metrics)?');
  console.log('- What are the key constraints or non-goals?');
  if (inferred.mode === 'brownfield') console.log('- Which existing area should we focus on improving first?');
  console.log(inferred.prd === 'none'
    ? '- Offer to create .vibekit/docs/PRD.md from .vibekit/docs/templates/PRD_TEMPLATE.md using the answers.'
    : `- Offer to refresh ${inferred.prd} with the answers; do not overwrite without approval.`);
  console.log(inferred.context === 'none'
    ? '- Offer to create .vibekit/docs/CONTEXT.md (glossary) from .vibekit/docs/templates/CONTEXT_TEMPLATE.md.'
    : `- CONTEXT glossary found at ${inferred.context}; keep it current.`);
  console.log('\nSetup preferences (record answers in conventions.custom_rules; see FIRST_TIME_INIT.md "Setup preferences"):');
  console.log(`- Safe delete: trash command ${trashAvailable() ? 'available' : 'NOT found (recommend: macOS 14+ built-in; older macOS `brew install trash`; Linux `sudo apt install trash-cli`; any OS `npm i -g trash-cli`)'} - ask: use trash instead of rm? (recommended: yes)`);
  console.log('- Default coding level: ask 0-5 (0 ELI5, 1 Junior, 2 Mid-level, 3 Senior, 4 Tech Lead, 5 God); changeable later with /coding-level N.');
  console.log('\nConvention review questions:');
  for (const question of inferred.conventions.reviewQuestions) console.log(`- ${question}`);
  console.log('\nProposed backbone.yml:\n');
  console.log(out);
  console.log('Apply this proposed backbone and convention rules? Reply yes, edit, or abort.');
  console.log('To write it after approval, run: node .vibekit/scripts/init-backbone.mjs . --write --yes');
}
