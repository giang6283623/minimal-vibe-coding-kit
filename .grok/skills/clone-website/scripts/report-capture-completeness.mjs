#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  completenessReport,
  loadCaptureBrief,
  parseCli,
  printFailure,
  requireCli,
  resolveProjectRoot,
  screenshotNodeCommand,
  slugFromPathname,
} from './capture-workflow-lib.mjs';
import { readJsonFile } from './asset-workflow-lib.mjs';

async function main() {
  const args = parseCli(process.argv.slice(2));
  requireCli(args, ['project-root']);
  const root = resolveProjectRoot(args['project-root']);
  const { brief, targetHost } = loadCaptureBrief(root);
  const routesFile = args['routes-file']
    ? path.resolve(root, args['routes-file'])
    : path.join(root, '.replica', 'capture-routes.json');
  const raw = readJsonFile(routesFile, 'routes file');
  const list = Array.isArray(raw) ? raw : raw.routes;
  const routes = list.map((route) => ({
    id: slugFromPathname(new URL(String(route), `https://${targetHost}`).pathname),
  }));
  const viewports = brief.limits.viewports;
  const screenshotsRoot = path.join(root, '.replica', 'screenshots');
  const report = completenessReport(routes, viewports, screenshotsRoot);
  const fetchReceiptPath = path.join(root, '.replica', 'evidence', 'fetch-receipt.json');
  const dataSummary = fs.existsSync(fetchReceiptPath)
    ? readJsonFile(fetchReceiptPath, 'fetch receipt')
    : null;

  const output = {
    data: dataSummary
      ? {
          collections: dataSummary.collections?.count ?? null,
          pages: (dataSummary.pages?.length ?? 0) + (dataSummary.generic_pages?.length ?? 0),
          platform: dataSummary.platform ?? null,
          products: dataSummary.products?.count ?? null,
        }
      : null,
    host: targetHost,
    screenshots: report,
    status: report.missing_count === 0 ? 'complete' : 'incomplete',
    version: 1,
  };

  if (args.json === true || args.json === 'true') {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`Host: ${targetHost}\n`);
    if (output.data) {
      process.stdout.write(
        `Data: ${output.data.products ?? 0} catalog items, ${output.data.collections ?? 0} collections, ${output.data.pages ?? 0} pages\n`
      );
    }
    process.stdout.write(
      `Screenshots: ${report.present_count}/${report.expected_count} (${report.route_count} routes x ${report.viewport_count} viewports)\n`
    );
    if (report.missing_count > 0) {
      process.stdout.write('Missing:\n');
      for (const file of report.missing) process.stdout.write(`- ${file}\n`);
      process.stdout.write('\nRetry missing routes with a smaller routes file and:\n');
      process.stdout.write(
        `${screenshotNodeCommand('.vibekit/skills/clone-website/scripts/capture-screenshots.mjs', args['project-root'], [
          '--cdp',
          'http://127.0.0.1:9222',
          '--routes-file',
          path.relative(root, routesFile),
          '--continue-on-error',
          '--merge-receipt',
          '--max-elapsed-ms',
          String(brief.capture.page_load_timeout_ms || 45000),
        ])}\n`
      );
      process.exitCode = 1;
    } else {
      process.stdout.write('PASS capture completeness check\n');
    }
  }
}

try {
  await main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
