# Authorized local data and asset workflow

Use this workflow only with a validated clone brief and local JSON evidence. It supports Shopify Storefront-style responses, WordPress REST-style exports, WooCommerce Store API or REST-style exports, and a generic item array.

## Boundary

- The normalizer reads local files only and may be run by the agent.
- The downloader performs HTTPS requests. The agent may run it for `owned` or `written-permission` work after reviewing the host allowlist.
- The verifier reads local files only and may be run by the agent after capture or download completes.
- Real source assets require `owned` or `written-permission` authorization plus `owned`, `licensed`, or `permission` content rights.
- Public research uses neutralized local fixtures and synthetic or separately licensed local assets. It never uses the downloader or live capture.

## 1. Prepare and validate

Put the owner-supplied JSON export below `.replica/evidence/` and list its relative path in `source_inputs`. Do not include credentials, cookies, tokens, signed URLs, private records, or restricted content.

Validate `.replica/brief.json` before normalization. New briefs should include `replica.source_platform`. The normalized brief and receipt remain version 1; do not construct another receipt by hand.

## 2. Normalize local export

Run from the clone project root, using the skill path installed in that project:

```bash
node .vibekit/skills/clone-website/scripts/normalize-local-export.mjs \
  --project-root . \
  --platform shopify \
  --input shopify-products.json
```

Supported `--platform` values are `shopify`, `wordpress`, `woocommerce`, and `generic`. The input is relative to `.replica/evidence/`. The script overwrites only these generated files:

- `.replica/fixtures/catalog.json`, which contains no remote URLs;
- `.replica/manifests/authorized-assets.json`, which contains bounded HTTPS image entries for authorized work.

Review the normalized item count, warnings, output paths, and `candidate_hosts`. If the adapter cannot recognize the export shape, stop and write a project-specific local adapter. Do not weaken the generic adapter or pass source content through unchecked.

## 3. Approve asset hosts

Show the exact `candidate_hosts` list. The user must approve each hostname. Do not accept wildcard hosts, IP literals, localhost names, private network targets, credentials in URLs, redirects, or secret-like query parameters.

## 4. Download authorized assets

Run the command with one exact `--allow-host` value for every reviewed host:

```bash
node .vibekit/skills/clone-website/scripts/download-authorized-assets.mjs \
  --project-root . \
  --allow-host cdn.store.example.com
```

The downloader refuses public-research briefs, unknown hosts, redirects, non-HTTPS URLs, private network addresses, oversized responses, unsupported image signatures, symlink paths, and existing output files that do not already contain a valid image. It records `.replica/asset-download-receipt.json`.

## 5. Offline verification

After capture or download completes, the agent may run:

```bash
node .vibekit/skills/clone-website/scripts/verify-local-assets.mjs \
  --project-root .
```

This makes no network request. It checks manifest coverage, containment, symlinks, nonzero size, file signature, digest, and the downloader receipt when present. It writes `.replica/asset-verification.json` and exits nonzero on any missing or invalid asset.

## 6. Framework mapping

- Static HTML, Astro, and Next.js: keep manifest output paths under `public/assets/imported/` and use fixture `localPath` values beginning with `/assets/imported/`.
- Hydrogen: import the normalized catalog first. Replace it with live Storefront API queries only in an owner-approved integration step.
- WordPress or WooCommerce native: use the normalized fixture for parity work. Import media through the platform's owner tools only when the migration scope explicitly includes it.

The app must never read `.replica/manifests/authorized-assets.json` at runtime because it contains source URLs. Only local fixture paths belong in application code.
