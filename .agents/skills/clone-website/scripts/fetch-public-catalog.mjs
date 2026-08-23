#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import {
  atomicWrite,
  canonicalNodeInvocation,
  consumeLaunchAction,
  decodeXmlText,
  extractTitle,
  fail,
  fetchBounded,
  loadCaptureBrief,
  parseCli,
  printFailure,
  requireCli,
  resolveProjectRoot,
  sanitizeUrl,
  slugFromPathname,
} from './capture-workflow-lib.mjs';

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchJson(url, approvedHosts, limits) {
  const response = await fetchBounded(url, {
    accept: 'application/json',
    approvedHosts,
    label: 'catalog JSON URL',
    maxBytes: limits.maxBytes,
    maxElapsedMs: limits.maxElapsedMs,
    maxRedirects: limits.maxRedirects,
  });
  if (response.status < 200 || response.status >= 300) fail(`${url} returned HTTP ${response.status}`);
  if (!response.contentType.includes('json')) {
    fail(`${url} returned unexpected content type ${response.contentType || 'missing'}`);
  }
  return response;
}

async function fetchText(url, approvedHosts, accept, limits) {
  const response = await fetchBounded(url, {
    accept,
    approvedHosts,
    label: 'page URL',
    maxBytes: limits.maxBytes,
    maxElapsedMs: limits.maxElapsedMs,
    maxRedirects: limits.maxRedirects,
  });
  if (response.status < 200 || response.status >= 300) fail(`${url} returned HTTP ${response.status}`);
  return response;
}

async function discoverPageRoutes(host, approvedHosts, maxPages, limits) {
  const { body } = await fetchText(`https://${host}/sitemap.xml`, approvedHosts, 'application/xml,text/xml,text/plain', limits);
  const xml = body.toString('utf8');
  const pagesSitemapMatch = xml.match(/<loc>(https:\/\/[^<]*sitemap_pages[^<]*\.xml[^<]*)<\/loc>/i);
  if (!pagesSitemapMatch) return [];
  const pagesSitemapUrl = decodeXmlText(pagesSitemapMatch[1]);
  const { body: pagesXmlBody } = await fetchText(pagesSitemapUrl, approvedHosts, 'application/xml,text/xml,text/plain', limits);
  const pagesXml = pagesXmlBody.toString('utf8');
  const routes = [];
  for (const match of pagesXml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    if (routes.length >= maxPages) break;
    const url = decodeXmlText(match[1].trim());
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (parsed.hostname !== host) continue;
    routes.push(parsed.toString());
  }
  return routes;
}

async function fetchShopifyCatalog(host, approvedHosts, limits, maxCatalogItems, maxContentPages) {
  const receipt = { fetched_at: new Date().toISOString(), host, pages: [], platform: 'shopify', version: 1 };

  const products = await fetchJson(`https://${host}/products.json?limit=${maxCatalogItems}`, approvedHosts, limits);
  const collections = await fetchJson(`https://${host}/collections.json?limit=${maxCatalogItems}`, approvedHosts, limits);

  return {
    collections,
    pageUrls: await discoverPageRoutes(host, approvedHosts, maxContentPages, limits),
    products,
    receipt,
  };
}

async function fetchGenericCatalog(host, approvedHosts, limits, brief, maxContentPages) {
  const receipt = { fetched_at: new Date().toISOString(), host, pages: [], platform: 'generic', version: 1 };
  const routes = brief.target.routes.slice(0, maxContentPages);
  const pages = [];
  for (const route of routes) {
    const url = new URL(route, `https://${host}`).toString();
    pages.push(await fetchText(url, approvedHosts, 'text/html', limits));
  }
  return { collections: null, genericPages: pages, genericRoutes: routes, pageUrls: [], products: null, receipt };
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  requireCli(args, ['project-root']);
  const root = resolveProjectRoot(args['project-root']);
  const { approvedHosts, brief, launchDigest, normalizedDigest, targetHost } = loadCaptureBrief(root);
  if (brief.version === 2) {
    consumeLaunchAction(root, {
      actionName: 'capture-approved-hosts',
      argv: canonicalNodeInvocation(process.argv[1], process.argv.slice(2)),
      targetPath: '.',
    });
  }
  const platform = brief.capture.platform || brief.replica.source_platform || 'generic';
  const maxCatalogItems = toInt(args['max-catalog-items'], brief.capture.max_catalog_items ?? 20);
  const maxContentPages = toInt(args['max-content-pages'], brief.capture.max_content_pages ?? brief.limits.max_pages);
  const limits = {
    maxBytes: brief.capture.max_response_bytes ?? 8 * 1024 * 1024,
    maxElapsedMs: brief.capture.request_timeout_ms ?? 20000,
    maxRedirects: brief.capture.max_redirects ?? 3,
  };

  const evidenceRoot = path.join(root, '.replica', 'evidence');
  const pagesRoot = path.join(evidenceRoot, 'pages');
  let bundle;

  if (platform === 'shopify') {
    bundle = await fetchShopifyCatalog(targetHost, approvedHosts, limits, maxCatalogItems, maxContentPages);
  } else if (platform === 'generic') {
    bundle = await fetchGenericCatalog(targetHost, approvedHosts, limits, brief, maxContentPages);
  } else {
    fail(`fetch-public-catalog supports platform shopify or generic; got ${platform}`);
  }

  const { receipt } = bundle;
  if (brief.version === 2) {
    receipt.launch_sha256 = launchDigest;
    receipt.normalized_brief_sha256 = normalizedDigest;
  }

  if (bundle.products) {
    const digest = await atomicWrite(path.join(evidenceRoot, 'products.json'), bundle.products.body);
    receipt.products = {
      bytes: bundle.products.body.length,
      count: JSON.parse(bundle.products.body.toString('utf8')).products?.length ?? 0,
      output: '.replica/evidence/products.json',
      sha256: digest,
      url: sanitizeUrl(bundle.products.finalUrl),
    };
    process.stdout.write(`PASS saved ${receipt.products.count} catalog items -> ${receipt.products.output}\n`);
  }

  if (bundle.collections) {
    const digest = await atomicWrite(path.join(evidenceRoot, 'collections.json'), bundle.collections.body);
    receipt.collections = {
      bytes: bundle.collections.body.length,
      count: JSON.parse(bundle.collections.body.toString('utf8')).collections?.length ?? 0,
      output: '.replica/evidence/collections.json',
      sha256: digest,
      url: sanitizeUrl(bundle.collections.finalUrl),
    };
    process.stdout.write(`PASS saved ${receipt.collections.count} collections -> ${receipt.collections.output}\n`);
  }

  if (bundle.genericPages) {
    receipt.generic_pages = [];
    for (const [index, page] of bundle.genericPages.entries()) {
      const route = bundle.genericRoutes[index];
      const slug = slugFromPathname(new URL(route, `https://${targetHost}`).pathname);
      const outputRelative = path.posix.join('.replica', 'evidence', 'pages', `${slug}.html`);
      const digest = await atomicWrite(path.join(pagesRoot, `${slug}.html`), page.body);
      receipt.generic_pages.push({
        bytes: page.body.length,
        output: outputRelative,
        route,
        sha256: digest,
        title: extractTitle(page.body.toString('utf8')),
        url: sanitizeUrl(page.finalUrl),
      });
      process.stdout.write(`PASS saved page ${slug} -> ${outputRelative}\n`);
    }
  }

  for (const url of bundle.pageUrls) {
    const slug = slugFromPathname(new URL(url).pathname);
    const page = await fetchText(url, approvedHosts, 'text/html', limits);
    const outputRelative = path.posix.join('.replica', 'evidence', 'pages', `${slug}.html`);
    const digest = await atomicWrite(path.join(pagesRoot, `${slug}.html`), page.body);
    receipt.pages.push({
      bytes: page.body.length,
      output: outputRelative,
      sha256: digest,
      title: extractTitle(page.body.toString('utf8')),
      url: sanitizeUrl(page.finalUrl),
    });
    process.stdout.write(`PASS saved page ${slug} -> ${outputRelative}\n`);
  }

  await atomicWrite(path.join(evidenceRoot, 'fetch-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write('PASS wrote .replica/evidence/fetch-receipt.json\n');
}

try {
  await main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
