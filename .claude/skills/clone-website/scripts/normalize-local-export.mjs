#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  extensionForImageUrl,
  fail,
  loadValidatedBrief,
  loadValidatedLaunch,
  printFailure,
  readJsonFile,
  resolveExistingFile,
  resolveProjectRoot,
  safeRemoteImageUrl,
  sha256File,
  writeGeneratedJson,
} from './asset-workflow-lib.mjs';

const PLATFORMS = new Set(['generic', 'shopify', 'woocommerce', 'wordpress']);

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--project-root', '--platform', '--input'].includes(key) || value === undefined) {
      fail('usage: normalize-local-export.mjs --project-root <dir> --platform <name> --input <file-under-evidence>');
    }
    values[key.slice(2)] = value;
  }
  if (!values['project-root'] || !values.platform || !values.input) fail('project root, platform, and input are required');
  if (!PLATFORMS.has(values.platform)) fail(`platform must be one of: ${[...PLATFORMS].sort().join(', ')}`);
  return values;
}

function collectionNodes(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.nodes)) return value.nodes;
  if (Array.isArray(value?.edges)) return value.edges.map((edge) => edge?.node).filter(Boolean);
  return [];
}

function platformItems(platform, source) {
  if (platform === 'shopify') {
    return collectionNodes(source?.data?.products ?? source?.products ?? source);
  }
  if (platform === 'wordpress') {
    if (Array.isArray(source)) return source;
    return [...collectionNodes(source?.pages), ...collectionNodes(source?.posts), ...collectionNodes(source?.media)];
  }
  if (platform === 'woocommerce') {
    return collectionNodes(source?.products ?? source?.data?.products ?? source);
  }
  return collectionNodes(source?.items ?? source?.products ?? source?.pages ?? source);
}

function rendered(value) {
  if (typeof value === 'string') return value;
  if (typeof value?.rendered === 'string') return value.rendered;
  return '';
}

function cleanText(value, maximum = 4000) {
  const plain = rendered(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/https?:\/\/\S+/giu, '[external-link-removed]')
    .replace(/[\x00-\x1f\x7f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return plain.slice(0, maximum);
}

function safeSlug(raw, fallback) {
  const value = String(raw ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 60);
  return value || fallback;
}

function shopifyImages(item) {
  return collectionNodes(item?.images ?? item?.media).map((image) => image?.image ?? image?.previewImage ?? image);
}

function wordpressImages(item) {
  const embedded = item?._embedded?.['wp:featuredmedia'];
  const values = [
    ...collectionNodes(embedded),
    item?.featured_media_data,
    item?.featured_media_url ? { source_url: item.featured_media_url } : null,
    item?.source_url ? item : null,
  ];
  return values.filter(Boolean);
}

function genericImages(item) {
  const images = collectionNodes(item?.images ?? item?.media);
  if (images.length > 0) return images;
  return [item?.image, item?.featuredImage, item?.featured_image].filter(Boolean);
}

function rawImages(platform, item) {
  if (platform === 'shopify') return shopifyImages(item);
  if (platform === 'wordpress') return wordpressImages(item);
  return genericImages(item);
}

function imageUrl(image) {
  if (typeof image === 'string') return image;
  return image?.url ?? image?.src ?? image?.source_url ?? image?.guid?.rendered ?? '';
}

function imageAlt(image) {
  if (typeof image !== 'object' || !image) return '';
  return cleanText(image.altText ?? image.alt ?? image.alt_text ?? image.caption, 300);
}

function price(platform, item) {
  if (platform === 'shopify') {
    const value = item?.priceRange?.minVariantPrice ?? collectionNodes(item?.variants)[0]?.price;
    return value ? { amount: String(value.amount ?? ''), currency: String(value.currencyCode ?? '') } : null;
  }
  if (platform === 'woocommerce') {
    const prices = item?.prices;
    if (prices?.price !== undefined) {
      const minor = Number.isInteger(prices.currency_minor_unit) ? prices.currency_minor_unit : 2;
      const numeric = Number(prices.price) / (10 ** minor);
      return { amount: Number.isFinite(numeric) ? numeric.toFixed(minor) : String(prices.price), currency: String(prices.currency_code ?? '') };
    }
    if (item?.price !== undefined) return { amount: String(item.price), currency: String(item.currency ?? '') };
  }
  if (item?.price !== undefined) return { amount: String(item.price), currency: String(item.currency ?? '') };
  return null;
}

function assertBoundCaptureInput(root, inputName, inputFile, normalizedDigest) {
  const launch = loadValidatedLaunch(root);
  const receiptFile = resolveExistingFile(
    root,
    '.replica/evidence/fetch-receipt.json',
    'capture fetch receipt',
    '.replica/evidence/'
  );
  const receipt = readJsonFile(receiptFile, 'capture fetch receipt');
  if (receipt?.version !== 1) fail('capture fetch receipt version must be integer 1');
  if (receipt.normalized_brief_sha256 !== normalizedDigest) {
    fail('capture fetch receipt does not match the validated normalized brief');
  }
  if (receipt.launch_sha256 !== launch.launchDigest) {
    fail('capture fetch receipt does not match the current launch record');
  }
  const expectedOutput = `.replica/evidence/${inputName}`;
  const candidates = [receipt.products, receipt.collections]
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
  const entry = candidates.find((candidate) => candidate.output === expectedOutput);
  if (!entry) fail('--input must be listed in source_inputs or the bound capture fetch receipt');
  const stat = fs.statSync(inputFile);
  if (!Number.isInteger(entry.bytes) || entry.bytes !== stat.size) {
    fail('captured input byte size does not match the capture fetch receipt');
  }
  if (typeof entry.sha256 !== 'string' || entry.sha256 !== sha256File(inputFile)) {
    fail('captured input digest does not match the capture fetch receipt');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolveProjectRoot(args['project-root']);
  const { brief, normalizedDigest } = loadValidatedBrief(root);
  const briefPlatform = brief.replica?.source_platform ?? 'generic';
  if (briefPlatform !== 'generic' && briefPlatform !== args.platform) {
    fail(`platform ${args.platform} does not match validated source platform ${briefPlatform}`);
  }
  const sourceInputPaths = brief.source_inputs.map((entry) => (
    typeof entry === 'string' ? entry : entry?.path
  ));
  const input = resolveExistingFile(root, `.replica/evidence/${args.input}`, 'local export', '.replica/evidence/');
  if (!sourceInputPaths.includes(args.input)) {
    if (brief.version !== 2 || !brief.capture?.enabled) {
      fail('--input must be listed in the validated brief source_inputs');
    }
    assertBoundCaptureInput(root, args.input, input, normalizedDigest);
  }
  const source = readJsonFile(input, 'local export');
  const items = platformItems(args.platform, source);
  if (items.length === 0) fail(`no supported ${args.platform} records were found in the local export`);
  const maximum = brief.limits.max_items;
  if (items.length > maximum) fail(`local export has ${items.length} records, above the validated max_items ${maximum}`);

  const authorizedAssets = ['owned', 'written-permission'].includes(brief.authorization.status)
    && ['owned', 'licensed', 'permission'].includes(brief.authorization.content_rights);
  const assets = [];
  const warnings = [];
  const normalizedItems = items.map((item, itemIndex) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail(`record ${itemIndex + 1} must be an object`);
    const fallback = `item-${String(itemIndex + 1).padStart(4, '0')}`;
    const slug = safeSlug(item.handle ?? item.slug ?? item.id, fallback);
    const images = [];
    for (const [imageIndex, image] of rawImages(args.platform, item).entries()) {
      const rawUrl = imageUrl(image);
      if (!rawUrl) continue;
      if (!/^https?:\/\//iu.test(rawUrl)) {
        if (/^\/(?:assets|images)\//u.test(rawUrl)) {
          images.push({ alt: imageAlt(image), localPath: rawUrl, slot: `${args.platform}.${slug}.${imageIndex + 1}` });
        } else {
          warnings.push(`${slug} image ${imageIndex + 1}: unsupported local path`);
        }
        continue;
      }
      if (!authorizedAssets) fail('public or neutralized work must not contain remote image URLs');
      const url = safeRemoteImageUrl(rawUrl, `${slug} image ${imageIndex + 1}`);
      const extension = extensionForImageUrl(url);
      if (!extension) {
        warnings.push(`${slug} image ${imageIndex + 1}: URL has no supported image extension`);
        continue;
      }
      const filename = `${String(itemIndex + 1).padStart(4, '0')}-${slug}-${imageIndex + 1}${extension}`;
      const localPath = `/assets/imported/${args.platform}/${filename}`;
      const slot = `${args.platform}.${slug}.${imageIndex + 1}`;
      images.push({ alt: imageAlt(image), localPath, slot });
      assets.push({
        expectedHeight: Number.isInteger(image?.height) ? image.height : null,
        expectedWidth: Number.isInteger(image?.width) ? image.width : null,
        output: `public${localPath}`,
        slot,
        url: url.href,
      });
    }
    return {
      description: cleanText(item.description ?? item.excerpt ?? item.content ?? item.short_description),
      id: cleanText(String(item.id ?? item.admin_graphql_api_id ?? fallback), 200) || fallback,
      images,
      price: price(args.platform, item),
      slug,
      title: cleanText(item.title ?? item.name, 500) || `Item ${itemIndex + 1}`,
    };
  });

  const fixture = {
    generatedFrom: path.posix.join('.replica/evidence', args.input),
    items: normalizedItems,
    platform: args.platform,
    version: 1,
    warnings,
  };
  const fixtureText = JSON.stringify(fixture);
  if (/https?:\/\//iu.test(fixtureText)) fail('normalized application fixture contains a remote URL');
  const fixtureResult = writeGeneratedJson(root, '.replica/fixtures/catalog.json', fixture);

  const candidateHosts = [...new Set(assets.map((asset) => new URL(asset.url).hostname.toLowerCase()))].sort();
  const manifest = {
    assets,
    candidate_hosts: candidateHosts,
    fixture_sha256: fixtureResult.sha256,
    limits: {
      max_assets: Math.min(2000, Math.max(1, maximum * 10)),
      max_bytes_per_asset: 25 * 1024 * 1024,
      max_elapsed_ms: 30 * 60 * 1000,
      max_total_bytes: 512 * 1024 * 1024,
      timeout_ms: 15000,
    },
    normalized_brief_sha256: normalizedDigest,
    platform: args.platform,
    source_input: `.replica/evidence/${args.input}`,
    source_sha256: sha256File(input),
    version: 1,
  };
  if (assets.length > manifest.limits.max_assets) fail('asset count exceeds the derived manifest limit');
  const manifestResult = writeGeneratedJson(root, '.replica/manifests/authorized-assets.json', manifest);
  process.stdout.write(`${JSON.stringify({
    asset_count: assets.length,
    candidate_hosts: candidateHosts,
    fixture: '.replica/fixtures/catalog.json',
    fixture_sha256: fixtureResult.sha256,
    item_count: normalizedItems.length,
    manifest: '.replica/manifests/authorized-assets.json',
    manifest_sha256: manifestResult.sha256,
    platform: args.platform,
    status: 'normalized-local-export',
    warnings,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  printFailure(error);
  process.exitCode = 2;
}
