// Read a deliberately small, known set of project manifests and reduce them
// to safe metadata. Repo scripts are never executed and their bodies are never
// returned or persisted.

import fs from 'node:fs';
import path from 'node:path';

const MAX_METADATA_BYTES = 1024 * 1024;
const MANIFESTS = Object.freeze([
  'backbone.yml',
  'package.json',
  'yarn.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'tsconfig.json',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'pubspec.yaml',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts'
]);

const STACK_RULES = Object.freeze([
  ['react', ['react']],
  ['typescript', ['typescript']],
  ['vite', ['vite']],
  ['material-ui', ['@mui/material', '@material-ui/core']],
  ['nextjs', ['next']],
  ['vue', ['vue']],
  ['nuxt', ['nuxt']],
  ['angular', ['@angular/core']],
  ['svelte', ['svelte']],
  ['tailwind-css', ['tailwindcss']],
  ['express', ['express']],
  ['nestjs', ['@nestjs/core']]
]);

const SAFE_SCRIPT = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,63}$/;
const VALIDATION_PRIORITY = ['validate', 'check', 'test', 'test:unit', 'lint', 'typecheck', 'build'];

function regularFile(root, relative) {
  const absolute = path.join(path.resolve(root), relative);
  try {
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) return null;
    return { path: relative, absolute, size: stat.size, mtimeMs: Math.trunc(stat.mtimeMs) };
  } catch {
    return null;
  }
}

export function inventoryProjectMetadata(root) {
  return MANIFESTS.map((name) => regularFile(root, name))
    .filter(Boolean)
    .map(({ path: relative, size, mtimeMs }) => ({ path: relative, size, mtimeMs }));
}

function readKnownFile(root, name, warnings) {
  const item = regularFile(root, name);
  if (!item) return null;
  if (item.size > MAX_METADATA_BYTES) {
    warnings.push({ code: 'metadata-too-large', path: name });
    return null;
  }
  try {
    return fs.readFileSync(item.absolute, 'utf8');
  } catch {
    warnings.push({ code: 'metadata-unreadable', path: name });
    return null;
  }
}

function safeSlug(value, fallback = null) {
  const text = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{0,79}$/.test(text) ? text : fallback;
}

function yamlScalar(text, key) {
  const match = text?.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  const value = match[1].trim().replace(/^['"]|['"]$/g, '');
  return value.length <= 160 && !/[\r\n]/.test(value) ? value : null;
}

function packageManager(pkg, files) {
  const declared = String(pkg?.packageManager ?? '').match(/^(npm|yarn|pnpm|bun)@/i)?.[1]?.toLowerCase();
  if (declared) return declared;
  if (files.has('pnpm-lock.yaml')) return 'pnpm';
  if (files.has('yarn.lock')) return 'yarn';
  if (files.has('bun.lock') || files.has('bun.lockb')) return 'bun';
  return 'npm';
}

function scriptCommand(manager, key) {
  if (manager === 'yarn') return `yarn ${key}`;
  if (manager === 'pnpm') return `pnpm ${key}`;
  if (manager === 'bun') return `bun run ${key}`;
  return `npm run ${key}`;
}

function packageFacts(pkg, files) {
  const deps = new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
    ...Object.keys(pkg?.peerDependencies ?? {})
  ]);
  const stack = STACK_RULES.filter(([, names]) => names.some((name) => deps.has(name))).map(([name]) => name);
  if (files.has('tsconfig.json') && !stack.includes('typescript')) stack.push('typescript');

  const manager = packageManager(pkg, files);
  const scripts = Object.keys(pkg?.scripts ?? {}).filter((key) => SAFE_SCRIPT.test(key));
  const validationCommands = VALIDATION_PRIORITY
    .filter((key) => scripts.includes(key))
    .slice(0, 3)
    .map((key) => scriptCommand(manager, key));

  const hasWebFramework = stack.some((name) => ['react', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte'].includes(name));
  const hasLibraryEntry = Boolean(pkg?.main || pkg?.module || pkg?.exports);
  return {
    projectId: safeSlug(pkg?.name),
    packageManager: manager,
    stack,
    primaryLanguage: stack.includes('typescript') ? 'typescript' : 'javascript',
    projectType: hasLibraryEntry ? 'library' : (hasWebFramework ? 'web-app' : 'node-project'),
    validationCommands
  };
}

function uniqueSlugs(values, limit = 16) {
  return [...new Set(values.map((value) => safeSlug(value)).filter(Boolean))].slice(0, limit);
}

export function buildProjectProfile(root, options = {}) {
  const resolvedRoot = path.resolve(root);
  const inventory = inventoryProjectMetadata(resolvedRoot);
  const files = new Set(inventory.map((item) => item.path));
  const warnings = [];
  const profile = {
    projectId: safeSlug(path.basename(resolvedRoot), 'repo'),
    description: null,
    primaryLanguage: null,
    projectType: null,
    domains: [],
    stack: [],
    packageManager: null,
    validationCommands: [],
    recommendedValidation: null,
    metadataSources: inventory.map((item) => item.path),
    kitInstalled: files.has('backbone.yml') && fs.existsSync(path.join(resolvedRoot, '.vibekit', 'skills')),
    authorization: options.authorization ?? null,
    declared: { faction: options.faction, affiliation: options.affiliation, paths: options.paths },
    warnings
  };

  const backbone = readKnownFile(resolvedRoot, 'backbone.yml', warnings);
  if (backbone) {
    profile.description = yamlScalar(backbone, 'description');
    profile.primaryLanguage = safeSlug(yamlScalar(backbone, 'primary_language'));
    profile.projectType = safeSlug(yamlScalar(backbone, 'type'));
  }

  const packageText = readKnownFile(resolvedRoot, 'package.json', warnings);
  if (packageText) {
    try {
      const pkg = JSON.parse(packageText);
      const facts = packageFacts(pkg, files);
      Object.assign(profile, {
        projectId: facts.projectId ?? profile.projectId,
        packageManager: facts.packageManager,
        stack: facts.stack,
        primaryLanguage: profile.primaryLanguage ?? facts.primaryLanguage,
        projectType: profile.projectType ?? facts.projectType,
        validationCommands: facts.validationCommands
      });
    } catch {
      warnings.push({ code: 'metadata-invalid-json', path: 'package.json' });
    }
  }

  if (!profile.primaryLanguage) {
    if (files.has('pyproject.toml')) profile.primaryLanguage = 'python';
    else if (files.has('go.mod')) profile.primaryLanguage = 'go';
    else if (files.has('Cargo.toml')) profile.primaryLanguage = 'rust';
    else if (files.has('pubspec.yaml')) profile.primaryLanguage = 'dart';
  }
  if (!profile.projectType) profile.projectType = files.has('package.json') ? 'node-project' : 'software-project';

  const domains = [...(options.domains ?? [])];
  if (profile.stack.some((name) => ['react', 'nextjs', 'vue', 'nuxt', 'angular', 'svelte'].includes(name))) domains.push('frontend', 'application', 'interface');
  if (profile.stack.includes('material-ui')) domains.push('ui', 'design', 'component');
  if (profile.projectType === 'library') domains.push('library', 'framework');
  profile.domains = uniqueSlugs(domains, 12);
  profile.stack = uniqueSlugs(profile.stack, 12);
  profile.recommendedValidation = profile.validationCommands[0] ?? null;
  return profile;
}

