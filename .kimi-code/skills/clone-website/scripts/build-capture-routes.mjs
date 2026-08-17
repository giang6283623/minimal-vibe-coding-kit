#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  atomicWrite,
  fail,
  loadCaptureBrief,
  parseCli,
  printFailure,
  requireCli,
  resolveProjectRoot,
} from './capture-workflow-lib.mjs';
import { readJsonFile } from './asset-workflow-lib.mjs';

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function uniqueRoutes(values) {
  const seen = new Set();
  const routes = [];
  for (const route of values) {
    const normalized = route.startsWith('/') ? route : `/${route}`;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    routes.push(normalized);
  }
  return routes;
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  requireCli(args, ['project-root']);
  const root = resolveProjectRoot(args['project-root']);
  const { brief, targetHost } = loadCaptureBrief(root);
  const maxRoutes = toInt(args['max-routes'], brief.capture.max_routes ?? brief.limits.max_pages);
  const maxProductRoutes = toInt(args['max-product-routes'], Math.max(0, maxRoutes - brief.target.routes.length));

  const routes = uniqueRoutes(['/', ...brief.target.routes]);
  const fetchReceiptPath = path.join(root, '.replica', 'evidence', 'fetch-receipt.json');
  if (fs.existsSync(fetchReceiptPath)) {
    const receipt = readJsonFile(fetchReceiptPath, 'fetch receipt');
    for (const page of receipt.pages || []) {
      routes.push(new URL(page.url).pathname);
    }
    for (const page of receipt.generic_pages || []) {
      routes.push(page.route);
    }
    const productsPath = path.join(root, '.replica', 'evidence', 'products.json');
    if (fs.existsSync(productsPath) && maxProductRoutes > 0) {
      const products = readJsonFile(productsPath, 'products export');
      for (const product of (products.products || []).slice(0, maxProductRoutes)) {
        if (product?.handle) routes.push(`/products/${product.handle}`);
      }
    }
  }

  const bounded = uniqueRoutes(routes).slice(0, maxRoutes);
  if (bounded.length === 0) fail('no routes available to capture');
  const output = {
    generated_at: new Date().toISOString(),
    host: targetHost,
    routes: bounded,
    version: 1,
  };
  atomicWrite(path.join(root, '.replica', 'capture-routes.json'), `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`PASS wrote ${bounded.length} routes to .replica/capture-routes.json\n`);
}

try {
  await main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
