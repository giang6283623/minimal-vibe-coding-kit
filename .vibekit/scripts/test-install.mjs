#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const kitRoot = path.resolve(path.dirname(__filename), '..', '..');
const node = process.execPath;
const keep = process.argv.includes('--keep');
const temps = [];

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `mvck-${label}-`));
  temps.push(dir);
  return dir;
}

function run(args, { cwd = kitRoot, expect = 0 } = {}) {
  const result = spawnSync(node, args, { cwd, encoding: 'utf8' });
  if (result.status !== expect) {
    console.error(`Command failed: ${node} ${args.join(' ')}`);
    console.error(`cwd: ${cwd}`);
    console.error(`exit: ${result.status}`);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }
  return result;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
  console.log(`PASS ${message}`);
}

function count(text, marker) {
  return (text.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

try {
  const clean = tempDir('clean');
  run(['.vibekit/scripts/mvck.mjs', 'install', clean, '--profile', 'all']);
  run(['.vibekit/scripts/validate-kit.mjs', clean]);
  for (const [resource, expected, label] of [
    [
      '.vibekit/skills/autoresearch-coding/scripts/run_logged.py',
      'Autoresearch canonical resources are incomplete: scripts/run_logged.py',
      'validator reports an incomplete Autoresearch install without an uncaught exception'
    ],
    [
      '.vibekit/skills/clean-delivery/references/story-template.md',
      'Clean Delivery canonical resources are incomplete: references/story-template.md',
      'validator reports an incomplete Clean Delivery install without an uncaught exception'
    ],
    [
      '.vibekit/skills/clone-website/scripts/validate_replica_brief.py',
      'Clone Website canonical resources are incomplete: scripts/validate_replica_brief.py',
      'validator reports an incomplete Clone Website install without an uncaught exception'
    ]
  ]) {
    const resourcePath = path.join(clean, resource);
    const heldPath = path.join(clean, '.vibekit', `held-${path.basename(resource)}`);
    fs.renameSync(resourcePath, heldPath);
    const incomplete = run(['.vibekit/scripts/validate-kit.mjs', clean], { expect: 1 });
    assert(
      incomplete.stdout.includes(expected)
        && incomplete.stdout.includes('Validation summary:')
        && !/(?:ENOENT|node:fs)/.test(incomplete.stderr),
      label
    );
    fs.renameSync(heldPath, resourcePath);
  }
  run(['.vibekit/scripts/validate-kit.mjs', clean]);
  const cleanProbePath = path.join(clean, '.vibekit/scripts/agentshield-probe.mjs');
  const cleanProbeOriginal = fs.readFileSync(cleanProbePath, 'utf8');
  const probeSentinel = path.join(clean, 'target-probe-executed');
  fs.writeFileSync(cleanProbePath, `import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(probeSentinel)}, 'unsafe');\n`);
  run(['.vibekit/scripts/validate-kit.mjs', clean], { expect: 1 });
  assert(!fs.existsSync(probeSentinel), 'validator rejects but never executes a target-modified AgentShield probe');
  fs.writeFileSync(cleanProbePath, cleanProbeOriginal);
  run(['.vibekit/scripts/validate-kit.mjs', clean]);
  const cleanRunnerPath = path.join(clean, '.vibekit/skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs');
  const cleanRunnerOriginal = fs.readFileSync(cleanRunnerPath, 'utf8');
  const runnerSentinel = path.join(clean, 'target-runner-executed');
  fs.writeFileSync(cleanRunnerPath, `import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(runnerSentinel)}, 'unsafe');\n`);
  run(['.vibekit/scripts/validate-kit.mjs', clean], { expect: 1 });
  assert(!fs.existsSync(runnerSentinel), 'validator rejects but never executes a target-modified Proofline runner');
  fs.writeFileSync(cleanRunnerPath, cleanRunnerOriginal);
  run(['.vibekit/scripts/validate-kit.mjs', clean]);
  assert(fs.existsSync(path.join(clean, 'AGENTS.md')), 'clean install creates AGENTS.md');
  assert(fs.existsSync(path.join(clean, '.vibekit/commands')), 'clean install creates .vibekit/commands');
  assert(fs.existsSync(path.join(clean, '.vibekit/scripts')), 'clean install creates .vibekit/scripts');
  assert(fs.existsSync(path.join(clean, '.vibekit/docs')), 'clean install creates .vibekit/docs');
  assert(
    fs.existsSync(path.join(clean, '.vibekit/scripts/orchestration-preference.mjs')),
    'clean install includes the orchestration preference helper'
  );
  assert(
    fs.existsSync(path.join(clean, '.vibekit/scripts/orchestration-routing.mjs')),
    'clean install includes the orchestration routing helper'
  );
  assert(
    fs.existsSync(path.join(clean, '.vibekit/scripts/cursor-sdk-adapter.mjs')),
    'clean install includes the optional Cursor SDK adapter'
  );
  assert(
    fs.existsSync(path.join(clean, '.vibekit/docs/ORCHESTRATION_MODES.md')),
    'clean install includes the orchestration mode contract'
  );
  assert(
    fs.existsSync(path.join(clean, '.vibekit/docs/CURSOR_SDK.md')),
    'clean install includes the Cursor SDK setup guide'
  );
  assert(!fs.existsSync(path.join(clean, 'commands')), 'clean install does not create root commands');
  assert(!fs.existsSync(path.join(clean, 'scripts')), 'clean install does not create root scripts');
  assert(!fs.existsSync(path.join(clean, 'docs')), 'clean install does not create root docs');
  assert(fs.existsSync(path.join(clean, '.vibekit/skills/vibekit-init/SKILL.md')), 'clean install creates .vibekit/skills');
  assert(fs.existsSync(path.join(clean, '.vibekit/skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs')), 'clean install includes the canonical Proofline sandbox validator');
  assert(fs.existsSync(path.join(clean, '.vibekit/skills/proofline-orchestration/examples/auth-migration-case.json')), 'clean install includes the Proofline authentication case');
  assert(fs.existsSync(path.join(clean, '.vibekit/skills/clone-website/scripts/validate_replica_brief.py')), 'clean install includes the canonical Clone Website brief validator');
  for (const mirror of ['.claude', '.cursor', '.agents', '.grok', '.kimi-code']) {
    assert(
      fs.existsSync(path.join(clean, mirror, 'skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs')),
      `clean install includes the Proofline sandbox validator in ${mirror}`
    );
    assert(
      fs.existsSync(path.join(clean, mirror, 'skills/clone-website/scripts/validate_replica_brief.py')),
      `clean install includes the Clone Website brief validator in ${mirror}`
    );
  }
  assert(fs.existsSync(path.join(clean, '.vibekit/init/FIRST_TIME_INIT.md')), 'clean install seeds init files under .vibekit/init');
  assert(
    fs.readFileSync(path.join(clean, '.vibekit/init/FIRST_TIME_INIT.md'), 'utf8').includes("3. Don't show this again"),
    'clean install includes the three-choice Codex init preference'
  );
  assert(
    fs.readFileSync(path.join(clean, '.codex/config.example.toml'), 'utf8').includes('default_mode_request_user_input = true'),
    'clean install documents the Codex Default-mode feature'
  );
  assert(
    fs.readFileSync(path.join(clean, '.gitignore'), 'utf8').includes('.vibekit/preferences.json'),
    'clean install ignores local project preference state'
  );
  assert(
    fs.readFileSync(path.join(clean, '.gitignore'), 'utf8').includes('.vibekit/parallel-analysis.json'),
    'clean install ignores the parallel-analysis adapter cache'
  );
  assert(!fs.existsSync(path.join(clean, 'skills')), 'clean install does not create root skills');
  assert(!fs.existsSync(path.join(clean, '.vbkit-scripts')), 'clean install does not create legacy .vbkit-scripts');
  assert(!fs.existsSync(path.join(clean, '.vbkit-commands')), 'clean install does not create legacy .vbkit-commands');
  assert(!fs.existsSync(path.join(clean, '.vbkit-docs')), 'clean install does not create legacy .vbkit-docs');
  assert(!fs.existsSync(path.join(clean, 'FIRST_TIME_INIT.md')), 'clean install does not seed root FIRST_TIME_INIT.md');
  assert(!fs.existsSync(path.join(clean, '.vibekit/scripts/test-install.mjs')), 'clean install omits kit-dev test-install.mjs');
  assert(!fs.existsSync(path.join(clean, '.vibekit/scripts/pack-dry-run.mjs')), 'clean install omits kit-dev pack-dry-run.mjs');
  assert(!fs.existsSync(path.join(clean, '.vibekit/docs/RESEARCH_NOTES.md')), 'clean install omits maintainer RESEARCH_NOTES.md');
  assert(!fs.existsSync(path.join(clean, '.vibekit/docs/AUTORESEARCH_LEDGER.md')), 'clean install omits maintainer AUTORESEARCH_LEDGER.md');
  assert(fs.existsSync(path.join(clean, '.vibekit/docs/INSTALL.md')), 'clean install keeps end-user docs like INSTALL.md');

  const legacyVerification = tempDir('legacy-verification');
  run(['.vibekit/scripts/mvck.mjs', 'install', legacyVerification, '--profile', 'all']);
  const legacyBackbonePath = path.join(legacyVerification, 'backbone.yml');
  const legacyBackbone = fs.readFileSync(legacyBackbonePath, 'utf8')
    .replace('schema_version: 4', 'schema_version: 3')
    .replace(/\n  verification:\n(?:    (?:unit|acceptance|architecture|property|mutation|e2e):.*\n){6}/, '\n');
  fs.writeFileSync(legacyBackbonePath, legacyBackbone);
  run(['.vibekit/scripts/validate-kit.mjs', legacyVerification]);
  assert(true, 'schema version 3 backbone without commands.verification remains valid');

  const cleanSlug = path.basename(clean).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const cleanPlugin = JSON.parse(fs.readFileSync(path.join(clean, '.codex-plugin/plugin.json'), 'utf8'));
  assert(cleanPlugin.name === `mvck-${cleanSlug}`, 'install writes a project-scoped Codex plugin name');
  assert(cleanPlugin.name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanPlugin.name), 'install writes a bounded valid Codex plugin name');
  assert(cleanPlugin.description.includes(path.basename(clean)), 'install writes a project-scoped Codex plugin description');
  const sourcePlugin = JSON.parse(fs.readFileSync(path.join(kitRoot, '.codex-plugin/plugin.json'), 'utf8'));
  assert(sourcePlugin.name === 'minimal-vibe-coding-kit', 'kit source repo keeps the canonical Codex plugin name');
  run(['.vibekit/scripts/mvck.mjs', 'install', clean, '--profile', 'bogus'], { expect: 1 });
  assert(true, 'install rejects an unknown --profile value');

  const existing = tempDir('existing');
  fs.writeFileSync(path.join(existing, 'AGENTS.md'), '# Existing\n');
  fs.writeFileSync(path.join(existing, 'CLAUDE.md'), '# Existing Claude\n');
  run(['.vibekit/scripts/mvck.mjs', 'install', existing, '--profile', 'all']);
  run(['.vibekit/scripts/mvck.mjs', 'install', existing, '--profile', 'all']);

  const agents = fs.readFileSync(path.join(existing, 'AGENTS.md'), 'utf8');
  const claude = fs.readFileSync(path.join(existing, 'CLAUDE.md'), 'utf8');
  assert(agents.includes('# Existing'), 'AGENTS.md preserves existing content');
  assert(claude.includes('# Existing Claude'), 'CLAUDE.md preserves existing content');
  assert(count(agents, 'BEGIN: minimal-vibe-coding-kit') === 1, 'AGENTS.md has one managed begin marker');
  assert(count(agents, 'END: minimal-vibe-coding-kit') === 1, 'AGENTS.md has one managed end marker');
  assert(count(claude, 'BEGIN: minimal-vibe-coding-kit') === 1, 'CLAUDE.md has one managed begin marker');
  assert(count(claude, 'END: minimal-vibe-coding-kit') === 1, 'CLAUDE.md has one managed end marker');

  const cwdTarget = tempDir('cwd-target');
  run([path.join(kitRoot, '.vibekit/scripts/mvck.mjs'), 'install', '--profile', 'all'], { cwd: cwdTarget });
  assert(fs.existsSync(path.join(cwdTarget, 'backbone.yml')), 'install without target uses current working directory');

  const proposed = run([path.join(kitRoot, '.vibekit/scripts/mvck.mjs'), 'init', '--propose'], { cwd: cwdTarget });
  assert(proposed.stdout.includes('Proposed backbone.yml'), 'init --propose without target preserves flag');
  assert(proposed.stdout.includes('  opencode: .opencode/'), 'generated backbone registers the OpenCode surface');
  assert(proposed.stdout.includes('  grok: .grok/'), 'generated backbone registers the Grok surface');
  assert(proposed.stdout.includes('  kimi: .kimi-code/'), 'generated backbone registers the Kimi surface');
  assert(proposed.stdout.includes('Writing style: no emoji'), 'generated backbone seeds the writing-style rule');
  assert(proposed.stdout.includes('  schema_version: 4'), 'generated backbone uses schema version 4');
  assert(proposed.stdout.includes('  verification:'), 'generated backbone includes the named verification contract');
  for (const verifier of ['unit', 'acceptance', 'architecture', 'property', 'mutation', 'e2e']) {
    assert(
      new RegExp('^    ' + verifier + ': (?:null|.+)$', 'm').test(proposed.stdout),
      'generated backbone names the ' + verifier + ' verifier as a command or null'
    );
  }

  const jsonPlan = run(['.vibekit/scripts/mvck.mjs', 'install', clean, '--dry-run', '--json']);
  const parsed = JSON.parse(jsonPlan.stdout);
  assert(parsed.status === 'dry-run' && parsed.dryRun === true, 'install --dry-run --json returns machine-readable plan');

  const longName = tempDir(`plugin-${'a'.repeat(80)}`);
  run(['.vibekit/scripts/mvck.mjs', 'install', longName, '--profile', 'codex']);
  const longPlugin = JSON.parse(fs.readFileSync(path.join(longName, '.codex-plugin/plugin.json'), 'utf8'));
  assert(longPlugin.name.length === 64 && /^mvck-[a-z0-9-]+-[a-f0-9]{8}$/.test(longPlugin.name), 'long project folders get bounded deterministic plugin names');

  const unicodeParent = tempDir('unicode-plugin');
  const unicodeTarget = path.join(unicodeParent, '项目');
  fs.mkdirSync(unicodeTarget);
  run(['.vibekit/scripts/mvck.mjs', 'install', unicodeTarget, '--profile', 'codex']);
  const unicodePlugin = JSON.parse(fs.readFileSync(path.join(unicodeTarget, '.codex-plugin/plugin.json'), 'utf8'));
  assert(/^mvck-project-[a-f0-9]{8}$/.test(unicodePlugin.name), 'non-ASCII project folders get deterministic plugin names');

  const customPluginTarget = tempDir('custom-plugin');
  const customPluginDir = path.join(customPluginTarget, '.codex-plugin');
  fs.mkdirSync(customPluginDir);
  const customPluginText = '{\n  "name": "project-owned-plugin",\n  "version": "1.0.0"\n}\n';
  fs.writeFileSync(path.join(customPluginDir, 'plugin.json'), customPluginText);
  run(['.vibekit/scripts/mvck.mjs', 'install', customPluginTarget, '--profile', 'codex']);
  assert(fs.readFileSync(path.join(customPluginDir, 'plugin.json'), 'utf8') === customPluginText, 'install preserves a project-owned Codex plugin manifest');
  run(['.vibekit/scripts/mvck.mjs', 'update', customPluginTarget, '--profile', 'codex']);
  assert(fs.readFileSync(path.join(customPluginDir, 'plugin.json'), 'utf8') === customPluginText, 'update preserves a project-owned Codex plugin manifest');

  const forcedPluginTarget = tempDir('forced-plugin');
  const forcedPluginDir = path.join(forcedPluginTarget, '.codex-plugin');
  fs.mkdirSync(forcedPluginDir);
  fs.writeFileSync(path.join(forcedPluginDir, 'plugin.json'), customPluginText);
  run(['.vibekit/scripts/mvck.mjs', 'install', forcedPluginTarget, '--profile', 'codex', '--force']);
  const forcedPlugin = JSON.parse(fs.readFileSync(path.join(forcedPluginDir, 'plugin.json'), 'utf8'));
  assert(forcedPlugin.name.startsWith('mvck-'), 'install --force may replace a project-owned Codex plugin manifest');

  const upd = tempDir('update');
  run(['.vibekit/scripts/mvck.mjs', 'install', upd, '--profile', 'all']);
  assert(fs.existsSync(path.join(upd, '.vibekit/KIT_VERSION')), 'install stamps .vibekit/KIT_VERSION');
  fs.appendFileSync(path.join(upd, 'backbone.yml'), '# user-custom-line\n');
  fs.writeFileSync(path.join(upd, '.vibekit/skills/memento/SKILL.md'), '# stale kit file\n');
  fs.rmSync(path.join(upd, '.claude/skills/coding-level'), { recursive: true, force: true });

  fs.writeFileSync(path.join(upd, '.codex-plugin/plugin.json'), `${JSON.stringify(sourcePlugin, null, 2)}\n`);

  run(['.vibekit/scripts/mvck.mjs', 'update', upd]);
  assert(fs.readFileSync(path.join(upd, '.vibekit/skills/memento/SKILL.md'), 'utf8').includes('name: memento'), 'update refreshes stale kit files');
  const updSlug = path.basename(upd).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const updPlugin = JSON.parse(fs.readFileSync(path.join(upd, '.codex-plugin/plugin.json'), 'utf8'));
  assert(updPlugin.name === `mvck-${updSlug}`, 'update re-applies the project-scoped Codex plugin name');
  assert(fs.existsSync(path.join(upd, '.claude/skills/coding-level/SKILL.md')), 'update re-adds missing kit skill mirrors');
  assert(fs.readFileSync(path.join(upd, 'backbone.yml'), 'utf8').includes('# user-custom-line'), 'update preserves user-modified backbone.yml');
  const backupRoot = path.join(upd, '.vibekit', 'update-backup');
  assert(fs.existsSync(backupRoot) && fs.readdirSync(backupRoot).length >= 1, 'update backs up replaced kit files');
  assert(
    fs.readdirSync(backupRoot).some((stamp) => fs.existsSync(path.join(backupRoot, stamp, '.codex-plugin/plugin.json'))),
    'update backs up a replaced MVCK Codex plugin manifest'
  );
  run(['.vibekit/scripts/validate-kit.mjs', upd]);

  const updAgents = fs.readFileSync(path.join(upd, 'AGENTS.md'), 'utf8');
  assert(count(updAgents, 'BEGIN: minimal-vibe-coding-kit') === 1, 'update keeps one managed begin marker in AGENTS.md');

  const emptyTarget = tempDir('update-empty');
  run(['.vibekit/scripts/mvck.mjs', 'update', emptyTarget], { expect: 1 });
  assert(true, 'update refuses a target without the kit installed');

  const updPlan = run(['.vibekit/scripts/mvck.mjs', 'update', upd, '--dry-run', '--json']);
  const updParsed = JSON.parse(updPlan.stdout);
  assert(updParsed.status === 'dry-run' && typeof updParsed.toVersion === 'string', 'update --dry-run --json returns machine-readable plan');

  const codexNo = tempDir('codex-default-no');
  run(['.vibekit/scripts/mvck.mjs', 'install', codexNo, '--profile', 'codex']);
  run(['.vibekit/scripts/mvck.mjs', 'update', codexNo, '--profile', 'codex', '--codex-default-mode', 'no']);
  assert(!fs.existsSync(path.join(codexNo, '.codex/config.toml')), 'Codex No leaves project config unchanged');
  assert(!fs.existsSync(path.join(codexNo, '.vibekit/preferences.json')), 'Codex No does not persist a preference');
  run(['.vibekit/scripts/mvck.mjs', 'update', codexNo, '--profile', 'codex', '--codex-default-mode', 'yes']);
  assert(
    fs.readFileSync(path.join(codexNo, '.codex/config.toml'), 'utf8').includes('[features]\ndefault_mode_request_user_input = true'),
    'Codex Yes remains available after a temporary No and enables the project feature'
  );
  assert(
    JSON.parse(fs.readFileSync(path.join(codexNo, '.vibekit/preferences.json'), 'utf8')).codex.default_mode_request_user_input === 'enabled',
    'Codex Yes persists the enabled preference'
  );

  const codexDryRun = tempDir('codex-default-dry-run');
  run(['.vibekit/scripts/mvck.mjs', 'install', codexDryRun, '--profile', 'codex']);
  const codexDryPlan = JSON.parse(run([
    '.vibekit/scripts/mvck.mjs', 'update', codexDryRun, '--profile', 'codex', '--dry-run', '--json', '--codex-default-mode', 'yes'
  ]).stdout);
  assert(
    codexDryPlan.actions.some((action) => action.action === 'codex-feature-enable'),
    'Codex dry-run reports the planned feature change'
  );
  assert(!fs.existsSync(path.join(codexDryRun, '.codex/config.toml')), 'Codex dry-run does not write project config');
  assert(!fs.existsSync(path.join(codexDryRun, '.vibekit/preferences.json')), 'Codex dry-run does not persist a preference');

  const codexDismissed = tempDir('codex-default-dismissed');
  run(['.vibekit/scripts/mvck.mjs', 'install', codexDismissed, '--profile', 'codex']);
  run(['.vibekit/scripts/mvck.mjs', 'update', codexDismissed, '--profile', 'codex', '--codex-default-mode', 'never']);
  assert(!fs.existsSync(path.join(codexDismissed, '.codex/config.toml')), "Codex Don't show this again leaves the feature disabled");
  assert(
    JSON.parse(fs.readFileSync(path.join(codexDismissed, '.vibekit/preferences.json'), 'utf8')).codex.default_mode_request_user_input === 'dismissed',
    "Codex Don't show this again persists the dismissal"
  );
  run(['.vibekit/scripts/mvck.mjs', 'update', codexDismissed, '--profile', 'codex']);
  assert(
    JSON.parse(fs.readFileSync(path.join(codexDismissed, '.vibekit/preferences.json'), 'utf8')).codex.default_mode_request_user_input === 'dismissed',
    'a later update preserves the Codex dismissal'
  );

  const codexMerge = tempDir('codex-default-merge');
  run(['.vibekit/scripts/mvck.mjs', 'install', codexMerge, '--profile', 'codex']);
  const codexMergeConfig = [
    'model = "gpt-test"',
    '',
    '[features]',
    'shell_snapshot = true',
    'default_mode_request_user_input = false # preserve this comment',
    '',
    '[[skills.config]]',
    'path = "/tmp/example-skill/SKILL.md"',
    'enabled = false',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(codexMerge, '.codex/config.toml'), codexMergeConfig);
  run(['.vibekit/scripts/mvck.mjs', 'update', codexMerge, '--profile', 'codex', '--codex-default-mode=yes']);
  const mergedCodexConfig = fs.readFileSync(path.join(codexMerge, '.codex/config.toml'), 'utf8');
  assert(mergedCodexConfig.includes('model = "gpt-test"'), 'Codex enable preserves root config keys');
  assert(mergedCodexConfig.includes('shell_snapshot = true'), 'Codex enable preserves other feature flags');
  assert(mergedCodexConfig.includes('[[skills.config]]'), 'Codex enable preserves later TOML array tables');
  assert(
    mergedCodexConfig.includes('default_mode_request_user_input = true # preserve this comment'),
    'Codex enable changes only the approved feature value'
  );
  const codexMergeBackupRoot = path.join(codexMerge, '.vibekit/update-backup');
  assert(
    fs.readdirSync(codexMergeBackupRoot).some((stamp) => fs.existsSync(path.join(codexMergeBackupRoot, stamp, '.codex/config.toml'))),
    'Codex enable backs up an existing project config'
  );

  const codexMisplaced = tempDir('codex-default-misplaced');
  run(['.vibekit/scripts/mvck.mjs', 'install', codexMisplaced, '--profile', 'codex']);
  fs.writeFileSync(
    path.join(codexMisplaced, '.codex/config.toml'),
    'default_mode_request_user_input = true # misplaced root key\nmodel = "gpt-test"\n'
  );
  run(['.vibekit/scripts/mvck.mjs', 'update', codexMisplaced, '--profile', 'codex', '--codex-default-mode', 'yes']);
  const migratedCodexConfig = fs.readFileSync(path.join(codexMisplaced, '.codex/config.toml'), 'utf8');
  assert(
    migratedCodexConfig.includes('features.default_mode_request_user_input = true # misplaced root key'),
    'Codex enable corrects a misplaced root-level feature key'
  );
  assert(!/^default_mode_request_user_input\s*=/m.test(migratedCodexConfig), 'Codex enable removes the ineffective root-level key');

  run(['.vibekit/scripts/mvck.mjs', 'update', codexMerge, '--profile', 'codex', '--codex-default-mode', 'sometimes'], { expect: 1 });
  assert(true, 'update rejects an unknown Codex default-mode choice');

  if (process.platform !== 'win32') {
    const codexSymlink = tempDir('codex-default-symlink');
    const codexOutside = tempDir('codex-default-outside');
    run(['.vibekit/scripts/mvck.mjs', 'install', codexSymlink, '--profile', 'codex']);
    const outsideConfig = path.join(codexOutside, 'config.toml');
    fs.writeFileSync(outsideConfig, 'model = "outside"\n');
    fs.symlinkSync(outsideConfig, path.join(codexSymlink, '.codex/config.toml'));
    run(['.vibekit/scripts/mvck.mjs', 'update', codexSymlink, '--profile', 'codex', '--codex-default-mode', 'yes'], { expect: 1 });
    assert(fs.readFileSync(outsideConfig, 'utf8') === 'model = "outside"\n', 'Codex enable refuses a symlinked config without changing its target');
  }

  const openCodeExisting = tempDir('opencode-existing-config');
  const existingOpenCodeConfig = '{\n  "permission": {\n    "bash": "allow"\n  }\n}\n';
  fs.writeFileSync(path.join(openCodeExisting, 'opencode.json'), existingOpenCodeConfig);
  run(['.vibekit/scripts/mvck.mjs', 'install', openCodeExisting, '--profile', 'opencode']);
  assert(fs.readFileSync(path.join(openCodeExisting, 'opencode.json'), 'utf8') === existingOpenCodeConfig, 'OpenCode install preserves an existing project config');
  run(['.vibekit/scripts/mvck.mjs', 'update', openCodeExisting, '--profile', 'opencode']);
  assert(fs.readFileSync(path.join(openCodeExisting, 'opencode.json'), 'utf8') === existingOpenCodeConfig, 'OpenCode update preserves an existing project config');

  const openCodeUpdate = tempDir('opencode-update');
  run(['.vibekit/scripts/mvck.mjs', 'install', openCodeUpdate, '--profile', 'opencode']);
  const missingOpenCodeCommand = path.join(openCodeUpdate, '.opencode/commands/proofline.md');
  fs.rmSync(missingOpenCodeCommand);
  const unknownOpenCodeCommand = path.join(openCodeUpdate, '.opencode/commands/project-command.md');
  fs.writeFileSync(unknownOpenCodeCommand, 'project-owned command\n');
  run(['.vibekit/scripts/mvck.mjs', 'update', openCodeUpdate, '--profile', 'opencode']);
  assert(fs.existsSync(missingOpenCodeCommand), 'OpenCode update restores a missing kit command');
  assert(fs.readFileSync(unknownOpenCodeCommand, 'utf8') === 'project-owned command\n', 'OpenCode update preserves unknown project commands');

  if (process.platform !== 'win32') {
    const openCodeDanglingConfig = tempDir('opencode-dangling-config');
    const openCodeDanglingConfigOutside = tempDir('opencode-dangling-config-outside');
    const escapedConfig = path.join(openCodeDanglingConfigOutside, 'escaped-opencode.json');
    fs.symlinkSync(escapedConfig, path.join(openCodeDanglingConfig, 'opencode.json'));
    run(['.vibekit/scripts/mvck.mjs', 'install', openCodeDanglingConfig, '--profile', 'opencode'], { expect: 1 });
    assert(!fs.existsSync(escapedConfig), 'OpenCode install refuses a dangling config symlink without creating its outside target');

    const openCodeSymlink = tempDir('opencode-command-symlink');
    const openCodeOutside = tempDir('opencode-command-outside');
    const outsideSentinel = path.join(openCodeOutside, 'outside-sentinel');
    fs.writeFileSync(outsideSentinel, 'unchanged\n');
    fs.mkdirSync(path.join(openCodeSymlink, '.opencode'), { recursive: true });
    fs.symlinkSync(openCodeOutside, path.join(openCodeSymlink, '.opencode/commands'));
    run(['.vibekit/scripts/mvck.mjs', 'install', openCodeSymlink, '--profile', 'opencode'], { expect: 1 });
    assert(fs.readFileSync(outsideSentinel, 'utf8') === 'unchanged\n', 'OpenCode install refuses a symlinked command directory without changing its target');

    const openCodeUpdateSymlink = tempDir('opencode-update-command-symlink');
    const openCodeUpdateOutside = tempDir('opencode-update-command-outside');
    const updateOutsideSentinel = path.join(openCodeUpdateOutside, 'outside-sentinel');
    fs.writeFileSync(updateOutsideSentinel, 'unchanged\n');
    run(['.vibekit/scripts/mvck.mjs', 'install', openCodeUpdateSymlink, '--profile', 'opencode']);
    fs.rmSync(path.join(openCodeUpdateSymlink, '.opencode/commands'), { recursive: true, force: true });
    fs.symlinkSync(openCodeUpdateOutside, path.join(openCodeUpdateSymlink, '.opencode/commands'));
    run(['.vibekit/scripts/mvck.mjs', 'update', openCodeUpdateSymlink, '--profile', 'opencode'], { expect: 1 });
    assert(fs.readFileSync(updateOutsideSentinel, 'utf8') === 'unchanged\n', 'OpenCode update refuses a symlinked command directory without changing its target');

    const openCodeDanglingUpdate = tempDir('opencode-dangling-update');
    const openCodeDanglingUpdateOutside = tempDir('opencode-dangling-update-outside');
    run(['.vibekit/scripts/mvck.mjs', 'install', openCodeDanglingUpdate, '--profile', 'opencode']);
    const danglingCommand = path.join(openCodeDanglingUpdate, '.opencode/commands/proofline.md');
    const escapedCommand = path.join(openCodeDanglingUpdateOutside, 'escaped-proofline.md');
    fs.rmSync(danglingCommand);
    fs.symlinkSync(escapedCommand, danglingCommand);
    run(['.vibekit/scripts/mvck.mjs', 'update', openCodeDanglingUpdate, '--profile', 'opencode'], { expect: 1 });
    assert(!fs.existsSync(escapedCommand), 'OpenCode update refuses a dangling command symlink without creating its outside target');
  }

  // Single-profile installs must pass validation on their own.
  for (const profile of ['claude', 'cursor', 'codex', 'opencode', 'grok', 'kimi']) {
    const solo = tempDir(`profile-${profile}`);
    run(['.vibekit/scripts/mvck.mjs', 'install', solo, '--profile', profile]);
    run(['.vibekit/scripts/validate-kit.mjs', solo]);
    assert(true, `${profile}-only install passes validation`);
    const skillRoot = profile === 'claude'
      ? '.claude'
      : profile === 'cursor'
        ? '.cursor'
        : profile === 'grok'
          ? '.grok'
          : profile === 'kimi'
            ? '.kimi-code'
            : '.agents';
    assert(
      fs.existsSync(path.join(solo, skillRoot, 'skills/clone-website/SKILL.md')),
      `${profile}-only install includes clone-website`
    );
    if (profile === 'kimi') {
      const doctor = JSON.parse(run(['.vibekit/scripts/doctor.mjs', solo, '--json']).stdout);
      assert(doctor.agentSurfaces.kimi === true, 'doctor detects a Kimi-only install');
      assert(doctor.aiRulesLoaded.kimiSkills > 0, 'doctor counts Kimi skills');
      assert(
        doctor.nativeReasoningSkills.missing.every((item) => !item.startsWith('kimi:')),
        'doctor validates Kimi native reasoning skills'
      );
    }
    if (profile === 'opencode') {
      assert(fs.existsSync(path.join(solo, 'AGENTS.md')), 'OpenCode-only install creates AGENTS.md');
      assert(fs.existsSync(path.join(solo, '.agents/skills/clearthought/SKILL.md')), 'OpenCode-only install creates the shared skill registry');
      assert(fs.existsSync(path.join(solo, '.opencode/commands/proofline.md')), 'OpenCode-only install creates native commands');
      assert(!fs.existsSync(path.join(solo, '.codex')), 'OpenCode-only install does not create a Codex config directory');
      assert(!fs.existsSync(path.join(solo, '.codex-plugin')), 'OpenCode-only install does not create a Codex plugin');
      const doctor = JSON.parse(run(['.vibekit/scripts/doctor.mjs', solo, '--json']).stdout);
      assert(doctor.agentSurfaces.opencode === true, 'doctor detects an OpenCode-only install');
      assert(doctor.agentSurfaces.codex === false, 'doctor does not misclassify an OpenCode-only install as Codex');
      assert(doctor.aiRulesLoaded.codexSkills === 0, 'doctor does not count shared OpenCode skills as active Codex skills');
      assert(doctor.aiRulesLoaded.opencodeSkills > 0, 'doctor counts shared skills for an active OpenCode surface');
      assert(doctor.aiRulesLoaded.opencodeCommands > 0, 'doctor counts OpenCode commands');
      assert(
        doctor.nativeReasoningSkills.missing.every((item) => !item.startsWith('opencode:')),
        'doctor validates OpenCode native reasoning skills'
      );
    }
    if (profile === 'codex') {
      const doctor = JSON.parse(run(['.vibekit/scripts/doctor.mjs', solo, '--json']).stdout);
      assert(doctor.aiRulesLoaded.codexSkills > 0, 'doctor counts shared skills for an active Codex surface');
      assert(doctor.aiRulesLoaded.opencodeSkills === 0, 'doctor does not count shared Codex skills as active OpenCode skills');
    }
  }

  console.log('\nInstall behavior tests passed.');
} finally {
  if (!keep) {
    for (const dir of temps) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  } else {
    console.log(`Kept temp dirs:\n${temps.join('\n')}`);
  }
}
