#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  consumeLaunchAction,
  HOST_NATIVE_WRITE_ARGV,
  loadValidatedLaunch,
  resolveProjectRoot,
  validateAutonomousRunState,
  WorkflowError,
} from './asset-workflow-lib.mjs';

function fail(message) {
  throw new WorkflowError(message);
}

const ACTION_TIMEOUT_MS = 30 * 60 * 1000;
const SAFE_ENVIRONMENT_KEYS = new Set([
  'CI',
  'COLORTERM',
  'COMSPEC',
  'FORCE_COLOR',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'NO_COLOR',
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'TEMP',
  'TERM',
  'TMP',
  'TMPDIR',
  'WINDIR',
]);

function actionEnvironment(source = process.env) {
  return Object.fromEntries(Object.entries(source).filter(([key]) => (
    SAFE_ENVIRONMENT_KEYS.has(key.toUpperCase())
  )));
}

function parseArgs(argv) {
  const separator = argv.indexOf('--');
  const options = separator === -1 ? argv : argv.slice(0, separator);
  const command = separator === -1 ? [] : argv.slice(separator + 1);
  const result = { actionId: null, command, launchOnly: false, nativeActionId: null, projectRoot: null };
  for (let index = 0; index < options.length; index += 1) {
    const argument = options[index];
    if (argument === '--launch-only') {
      result.launchOnly = true;
      continue;
    }
    if (argument === '--project-root' || argument === '--execute-action' || argument === '--consume-native-action') {
      const value = options[index + 1];
      if (!value) fail(`${argument} requires a value`);
      index += 1;
      if (argument === '--project-root') result.projectRoot = value;
      else if (argument === '--execute-action') result.actionId = value;
      else result.nativeActionId = value;
      continue;
    }
    fail(`unknown argument: ${argument}`);
  }
  if (!result.projectRoot) fail('--project-root is required');
  if (result.actionId && result.command.length === 0) fail('--execute-action requires exact argv after --');
  if (!result.actionId && result.command.length > 0) fail('argv after -- requires --execute-action');
  if (result.nativeActionId && result.command.length > 0) fail('--consume-native-action does not accept argv');
  if (result.actionId && result.nativeActionId) fail('--execute-action and --consume-native-action are mutually exclusive');
  if ((result.actionId || result.nativeActionId) && result.launchOnly) {
    fail('action consumption and --launch-only are mutually exclusive');
  }
  return result;
}

function resolveActionDirectory(projectRoot, targetPath) {
  const candidate = targetPath === '.' ? projectRoot : path.resolve(projectRoot, targetPath);
  const relation = path.relative(projectRoot, candidate);
  if (path.isAbsolute(relation) || relation === '..' || relation.startsWith(`..${path.sep}`)) {
    fail('launch action target path escapes the project root');
  }
  const stat = fs.lstatSync(candidate);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('launch action target path must be a real directory');
  const real = fs.realpathSync(candidate);
  const realRelation = path.relative(projectRoot, real);
  if (path.isAbsolute(realRelation) || realRelation === '..' || realRelation.startsWith(`..${path.sep}`)) {
    fail('launch action target path escapes the project root');
  }
  return real;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.actionId) {
    const projectRoot = resolveProjectRoot(args.projectRoot);
    const loaded = loadValidatedLaunch(projectRoot);
    const action = loaded.actions.find((candidate) => candidate.id === args.actionId);
    if (!action) fail(`launch action ${args.actionId} does not exist`);
    if (action.action === 'write-project') {
      fail('write-project is host-native; use --consume-native-action immediately before the bounded write batch');
    }
    const cwd = resolveActionDirectory(projectRoot, action.target_path);
    const consumed = consumeLaunchAction(args.projectRoot, {
      actionId: args.actionId,
      actionName: action.action,
      argv: args.command,
    });
    const child = spawnSync(args.command[0], args.command.slice(1), {
      cwd,
      env: actionEnvironment(),
      shell: false,
      stdio: ['ignore', 'inherit', 'inherit'],
      timeout: ACTION_TIMEOUT_MS,
    });
    if (child.error) fail(`cannot execute protected action: ${child.error.message}`);
    process.exitCode = child.status ?? 1;
  } else if (args.nativeActionId) {
    const projectRoot = resolveProjectRoot(args.projectRoot);
    const loaded = loadValidatedLaunch(projectRoot);
    const action = loaded.actions.find((candidate) => candidate.id === args.nativeActionId);
    if (!action) fail(`launch action ${args.nativeActionId} does not exist`);
    if (action.action !== 'write-project') fail('--consume-native-action accepts only write-project grants');
    const target = resolveActionDirectory(projectRoot, action.target_path);
    const consumed = consumeLaunchAction(projectRoot, {
      actionId: args.nativeActionId,
      actionName: 'write-project',
      argv: HOST_NATIVE_WRITE_ARGV,
      targetPath: action.target_path,
    });
    process.stdout.write(`${JSON.stringify({
      action: consumed.action.action,
      action_id: consumed.action.id,
      status: 'authorized-for-host-native-write',
      target_path: path.relative(projectRoot, target) || '.',
      use: consumed.uses,
    }, null, 2)}\n`);
  } else {
    const loaded = args.launchOnly
      ? loadValidatedLaunch(args.projectRoot)
      : validateAutonomousRunState(args.projectRoot);
    process.stdout.write(`${JSON.stringify({
      action_count: loaded.actions.length,
      approved_hosts: loaded.approvedHosts,
      launch_sha256: loaded.launchDigest,
      mode: loaded.brief.execution.mode,
      phase: loaded.state?.phase ?? null,
      status: 'valid',
      terminal_state: loaded.state?.terminal_state ?? null,
    }, null, 2)}\n`);
  }
} catch (error) {
  if (error instanceof WorkflowError || error?.code === 'ENOENT') {
    process.stderr.write(`FAIL ${error.message}\n`);
    process.exitCode = 2;
  } else {
    throw error;
  }
}
