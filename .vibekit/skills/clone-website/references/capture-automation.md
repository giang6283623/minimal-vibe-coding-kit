# Capture automation

Use this workflow for authorized `owned` or `written-permission` clones when local evidence is missing and the user approves bounded live capture.

The kit stays brand-neutral. Every hostname, route, and asset host comes from the user's validated brief and explicit approval answers. Do not hardcode a customer domain inside skill files.

## Agent questions (structured approval)

Use the active parent runtime's structured-question tool when available (Ask Question in Cursor, `AskUserQuestion` in Claude and Kimi, `request_user_input` in Codex). Ask one to three questions per batch.

1. **Authorization:** owned, written permission, or public research (local files only).
2. **Capture scope:** catalog JSON, content pages, screenshots, or all three.
3. **Approved hosts:** show the exact hostname list from `capture.approved_hosts` and require explicit approval before any network script runs.

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

## Step 2: Fetch public catalog data (agent-run)

After the user approves every hostname in `capture.approved_hosts`:

```bash
node .vibekit/skills/clone-website/scripts/fetch-public-catalog.mjs --project-root .
```

Supported capture platforms today:

- `shopify`: public catalog JSON, collections JSON, and sitemap content pages.
- `generic`: bounded HTML fetch for routes listed in the brief.

Outputs land under `.replica/evidence/` with `.replica/evidence/fetch-receipt.json`.

## Step 3: Build screenshot routes

```bash
node .vibekit/skills/clone-website/scripts/build-capture-routes.mjs --project-root .
```

Writes `.replica/capture-routes.json`.

## Step 4: Screenshots (user-run browser)

The agent must not start Chrome or attach to an existing personal browser profile.

1. Ask the user to confirm they are ready to launch a throwaway browser session.
2. Print the OS-specific launch command from preflight.
3. Ask the user to run the screenshot script in a second terminal after the browser is open.

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

After capture, add new evidence files to `source_inputs` if needed, re-validate the brief, then continue with `references/authorized-data-and-assets.md`.

## Platform notes

- **macOS:** preflight checks `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and Chromium or Edge alternatives.
- **Linux:** preflight checks `google-chrome`, `chromium`, or `microsoft-edge` on PATH.
- **Windows:** preflight checks standard Program Files install paths.

Asset downloads for remote images still use `download-authorized-assets.mjs` with user-approved `--allow-host` values from the normalized asset manifest. Those hosts are chosen by the user during intake, not embedded in the kit.

## Safety

- Public research briefs cannot enable capture.
- Capture scripts refuse to run without `interactive_capture_approved: true`.
- HTTPS-only requests, public DNS resolution, redirect caps, and response byte caps are enforced in `capture-workflow-lib.mjs`.
- Screenshot capture connects only to a loopback DevTools port the user opened.
