# Capture automation

Use this workflow for authorized `owned` or `written-permission` clones when local evidence is missing and the user approves bounded live capture.

The kit stays brand-neutral. Every hostname, route, and asset host comes from the user's validated brief and explicit approval answers. Do not hardcode a customer domain inside skill files.

## Front-loaded capture intake

Use the active parent runtime's structured-question tool when available (Ask Question in Cursor, `AskUserQuestion` in Claude and Kimi, `request_user_input` in Codex). Question-tool limits may require several small batches, but complete the capture intake before launch.

1. **Authorization:** owned, written permission, or public research (local files only).
2. **Capture scope:** catalog JSON, content pages, screenshots, or all three.
3. **Approved hosts:** show the exact hostname list from `capture.approved_hosts`, copy it into the v2 execution network allowlist, and require explicit approval before launch.
4. **Browser participation:** explain during intake that screenshot capture requires one throwaway browser session. Record whether the user will open it before the autonomous run reaches capture.

Record answers in `.replica/brief.json`, including:

```json
"capture": {
  "enabled": true,
  "platform": "shopify",
  "approved_hosts": ["store.example.com"],
  "interactive_capture_approved": true,
  "max_catalog_items": 20,
  "max_content_pages": 6,
  "max_routes": 20,
  "page_load_timeout_ms": 45000
}
```

`interactive_capture_approved` must be true only after the user confirms they will launch the browser for screenshots.

## Preflight

Run from the clone project root:

```bash
node .vibekit/skills/clone-website/scripts/capture-preflight.mjs --project-root .
```

Preflight reports:

- Node version and whether `--experimental-websocket` is needed (Node versions before 22).
- Detected Chrome, Chromium, or Edge path for the current OS.
- Whether the validated brief enables capture.
- Copy-paste commands for the next steps.

Add `--json` for machine-readable output.

## Step 1: Validate the brief

```bash
python3 .vibekit/skills/clone-website/scripts/validate_replica_brief.py \
  .replica/brief.json \
  --project-root . \
  --normalized-out .replica/brief.normalized.json \
  --plan-out .replica/plan.md \
  --receipt-out .replica/validation-receipt.json
```

Continue only when `.replica/validation-receipt.json` has `status: valid`.

## Step 2: Fetch authorized catalog data (agent-run)

After the launch record approves every hostname in `capture.approved_hosts` and the v2 execution policy includes `capture-approved-hosts`:

```bash
node .vibekit/skills/clone-website/scripts/fetch-public-catalog.mjs --project-root .
```

For v2, record this fetch command and the later screenshot command as separate `capture-approved-hosts` launch actions. Each entrypoint compares its actual argv and consumes its own use count before network or browser work.

Supported capture platforms today:

- `shopify`: public catalog JSON, collections JSON, and sitemap content pages.
- `generic`: bounded HTML fetch for routes listed in the brief.

Outputs land under `.replica/evidence/` with `.replica/evidence/fetch-receipt.json`.

## Step 3: Build screenshot routes

```bash
node .vibekit/skills/clone-website/scripts/build-capture-routes.mjs --project-root .
```

Writes `.replica/capture-routes.json`.

## Step 4: Screenshots (one user-run browser session)

The agent must not start Chrome or attach to an existing personal browser profile.

1. During intake, tell the user that a throwaway browser session is required and print the OS-specific launch command from preflight.
2. The user opens that session before capture starts.
3. The agent runs the screenshot script after the loopback DevTools port is ready.

Do not insert another routine confirmation between these steps. If the browser is unavailable, finish safe local work, set `needs-owner-input`, and include this with any other blockers in one consolidated question.

Screenshot capture:

```bash
node .vibekit/skills/clone-website/scripts/capture-screenshots.mjs \
  --project-root . \
  --cdp http://127.0.0.1:9222 \
  --routes-file .replica/capture-routes.json \
  --continue-on-error \
  --merge-receipt
```

On Node versions before 22, add `--experimental-websocket` before the script path.

Screenshots are stored under `.replica/screenshots/` with `.replica/screenshots/screenshot-receipt.json`.

Behavior:

- `--continue-on-error` keeps going when one route times out.
- `--merge-receipt` merges retries instead of overwriting prior captures.
- Default page load timeout is 45 seconds unless the brief sets `capture.page_load_timeout_ms`.

## Step 5: Completeness report

```bash
node .vibekit/skills/clone-website/scripts/report-capture-completeness.mjs --project-root .
```

This compares expected route-viewport PNGs with files on disk and prints a retry command for missing captures.

## Step 6: Normalize and verify

For v2 runs, the fetch receipt binds newly generated catalog evidence to the normalized brief and current launch digests, plus each output path, byte size, and SHA-256. The local normalizer verifies that receipt so approved capture can continue without changing the original source inventory. If an operator adds any other source input, update its v2 bytes and digest, re-validate the brief, invalidate the old launch record, and return to the launch gate.

## Platform notes

- **macOS:** preflight checks `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and Chromium or Edge alternatives.
- **Linux:** preflight checks `google-chrome`, `chromium`, or `microsoft-edge` on PATH.
- **Windows:** preflight checks standard Program Files install paths.

Asset downloads for remote images still use `download-authorized-assets.mjs` with `--allow-host` values from the normalized asset manifest. Those hosts must also exist in the execution allowlist frozen during intake. They are never embedded in the kit.

## Safety

- Public research briefs cannot enable capture.
- Capture scripts refuse to run without `interactive_capture_approved: true`.
- HTTPS-only requests, public DNS resolution, redirect caps, and response byte caps are enforced in `capture-workflow-lib.mjs`.
- Screenshot capture connects only to a loopback DevTools port the user opened.
