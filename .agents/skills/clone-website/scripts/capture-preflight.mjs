#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  chromeLaunchCommand,
  detectChromeCommand,
  loadCaptureBrief,
  nodeWebSocketRequirement,
  parseCli,
  printFailure,
  requireCli,
  resolveProjectRoot,
  screenshotNodeCommand,
} from './capture-workflow-lib.mjs';

function readBriefCaptureState(root) {
  const normalized = path.join(root, '.replica', 'brief.normalized.json');
  const receipt = path.join(root, '.replica', 'validation-receipt.json');
  if (!fs.existsSync(normalized) || !fs.existsSync(receipt)) {
    return { capture_enabled: false, status: 'missing-brief' };
  }
  try {
    const brief = JSON.parse(fs.readFileSync(normalized, 'utf8'));
    const validation = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    if (validation.status !== 'valid') return { capture_enabled: false, status: 'invalid-brief' };
    return {
      capture_enabled: brief.capture?.enabled === true,
      interactive_capture_approved: brief.capture?.interactive_capture_approved === true,
      platform: brief.capture?.platform || brief.replica?.source_platform || 'generic',
      status: 'valid-brief',
      target_url: brief.target?.url || '',
    };
  } catch {
    return { capture_enabled: false, status: 'unreadable-brief' };
  }
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  requireCli(args, ['project-root']);
  const root = resolveProjectRoot(args['project-root']);
  const briefState = readBriefCaptureState(root);
  const chrome = detectChromeCommand();
  const websocket = nodeWebSocketRequirement();
  const projectRoot = args['project-root'];

  const report = {
    brief: briefState,
    chrome,
    commands: {},
    node: {
      version: process.versions.node,
      websocket,
    },
    platform: process.platform,
    status: 'ready',
  };

  if (!chrome.command) report.status = 'missing-chrome';
  if (websocket.flag) report.status = report.status === 'ready' ? 'needs-websocket-flag' : report.status;

  report.commands.fetch_catalog = screenshotNodeCommand(
    '.vibekit/skills/clone-website/scripts/fetch-public-catalog.mjs',
    projectRoot
  );
  report.commands.build_routes = screenshotNodeCommand(
    '.vibekit/skills/clone-website/scripts/build-capture-routes.mjs',
    projectRoot
  );
  if (chrome.command) {
    report.commands.launch_browser = chromeLaunchCommand(chrome);
    report.commands.capture_screenshots = screenshotNodeCommand(
      '.vibekit/skills/clone-website/scripts/capture-screenshots.mjs',
      projectRoot,
      [
        '--cdp',
        'http://127.0.0.1:9222',
        '--routes-file',
        '.replica/capture-routes.json',
        '--continue-on-error',
        '--merge-receipt',
      ]
    );
    report.commands.report_completeness = screenshotNodeCommand(
      '.vibekit/skills/clone-website/scripts/report-capture-completeness.mjs',
      projectRoot
    );
  }

  if (args.json === true || args.json === 'true') {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.status === 'missing-chrome' ? 2 : 0;
    return;
  }

  process.stdout.write(`Platform: ${report.platform}\n`);
  process.stdout.write(`Node: ${report.node.version}${websocket.flag ? ` (use ${websocket.flag} for screenshots)` : ''}\n`);
  process.stdout.write(`Brief: ${briefState.status}${briefState.capture_enabled ? `, capture enabled (${briefState.platform})` : ''}\n`);
  if (chrome.command) {
    process.stdout.write(`PASS browser found: ${chrome.command}\n`);
    process.stdout.write('\nLaunch browser (user-run, keep window open):\n');
    process.stdout.write(`${report.commands.launch_browser}\n`);
    process.stdout.write('\nFetch catalog (agent-run after host approval):\n');
    process.stdout.write(`${report.commands.fetch_catalog}\n`);
    process.stdout.write('\nBuild routes:\n');
    process.stdout.write(`${report.commands.build_routes}\n`);
    process.stdout.write('\nCapture screenshots (user-run in a second terminal):\n');
    process.stdout.write(`${report.commands.capture_screenshots}\n`);
    process.stdout.write('\nCompleteness report:\n');
    process.stdout.write(`${report.commands.report_completeness}\n`);
  } else {
    process.stdout.write('FAIL no supported Chrome, Chromium, or Edge binary was found\n');
    process.exitCode = 2;
  }

  if (briefState.capture_enabled && briefState.interactive_capture_approved) {
    try {
      loadCaptureBrief(root);
      process.stdout.write('PASS capture brief gate satisfied\n');
    } catch (error) {
      process.stdout.write(`WARN capture brief gate: ${error.message}\n`);
    }
  }
}

try {
  await main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
