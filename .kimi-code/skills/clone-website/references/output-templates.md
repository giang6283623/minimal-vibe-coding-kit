# Output templates

## Brief

Store the intake at `.replica/brief.json`:

```json
{
  "version": 2,
  "target": {
    "url": "https://example.com/products",
    "routes": ["/products"],
    "data_mode": "local-artifacts-only"
  },
  "authorization": {
    "status": "public-research-local",
    "evidence": "User requested a bounded local research exercise.",
    "content_rights": "neutralized",
    "scope": {
      "routes": ["/products"],
      "deployment": "local-only",
      "features": [],
      "data": []
    }
  },
  "replica": {
    "source_platform": "generic",
    "project_type": "marketing-site",
    "project_scale": "small",
    "fidelity": "F2",
    "scope": "S1",
    "backend_level": "B0",
    "target_stack": "static-html-css-js",
    "routing_mode": "standard",
    "local_development": {
      "mode": "preserve-existing",
      "container_engine": "none"
    },
    "deployment": "local-only"
  },
  "limits": {
    "max_pages": 1,
    "max_items": 8,
    "viewports": [
      { "name": "desktop", "width": 1440, "height": 900 },
      { "name": "mobile", "width": 390, "height": 844 }
    ]
  },
  "features": {
    "identity": false,
    "cart": false,
    "checkout": false,
    "payments": false,
    "external_forms": false,
    "live_customer_data": false
  },
  "execution": {
    "mode": "autonomous-a-to-z",
    "routine_stage_prompts": false,
    "allowed_actions": [
      "inspect-local",
      "normalize-local-data",
      "process-local-assets",
      "run-local-validation",
      "start-local-preview",
      "write-project"
    ],
    "network": {
      "mode": "disabled",
      "approved_hosts": []
    },
    "credentials": "never-request-or-store",
    "install": "explicit-approval-required",
    "browser": "user-operated-only",
    "deployment": "prepare-only",
    "destructive_action": "forbidden",
    "paid_action": "forbidden",
    "unplanned_change": "stop-and-report",
    "max_retries_per_stage": 2
  },
  "source_inputs": [],
  "exclusions": ["source identity", "source content", "sensitive interactions"]
}
```

Optional authorized capture block (only for `owned` or `written-permission`):

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

See `references/capture-automation.md` for the full wizard. Hostnames always come from the user's site, never from the kit.

Version 2 `source_inputs` entries use the inventory object below. Paths are relative to `.replica/evidence/`; the validator checks the current file size and digest. Do not place credentials or private exports there without an approved secure-data plan. Record exact user-approved routes, deployment, features, and data in `authorization.scope`; its routes, deployment, and features must match the requested behavior exactly.

`target.url` identifies the site under study. For `public-research-local`, do not fetch it. For `owned` or `written-permission`, capture only within `authorization.scope`. `target.data_mode` must be `local-artifacts-only`, meaning captured artifacts are stored locally before implementation.

`replica.source_platform` is optional for legacy v1 briefs and defaults to `generic`. New v2 briefs record a supported platform identifier, `replica.project_type`, `replica.project_scale`, and `replica.routing_mode`. The validator derives `replica.workflow_id` from the source platform and target stack. Do not hand-edit the derived field into the input brief. Use `custom-review` routing when the requested stack is outside the standard source-to-target table.

When `replica.routing_mode` is `custom-review`, add this required block. Do not add it for standard routing:

```json
"architecture_review": {
  "data_boundary": "How source data becomes bounded runtime data.",
  "image_boundary": "How image rights, processing, and local paths are enforced.",
  "routing_boundary": "How routes and direct loads are implemented.",
  "deployment_boundary": "What local, preview, or production actions are included.",
  "verification_boundary": "Which commands and evidence define acceptance."
}
```

`replica.local_development` is optional for legacy briefs and defaults to `preserve-existing` with `container_engine: none`. New briefs must record it. Allowed modes are `preserve-existing`, `host-native`, `docker-compose`, and `custom`. Docker Compose requires `docker-desktop`, `docker-engine`, `compose-compatible`, or `custom` as its engine. Other modes require `none`. When either value is `custom`, add a short `custom_runtime` description. Do not add `custom_runtime` for standard choices.

## Local input inventory

Record each supplied file before implementation:

```json
[
  {
    "path": "products.json",
    "kind": "mock-json",
    "rights": "neutralized",
    "bytes": 1234,
    "sha256": "<digest>"
  },
  {
    "path": "product-1.jpg",
    "kind": "image",
    "rights": "owned",
    "bytes": 45678,
    "sha256": "<digest>"
  }
]
```

## Architecture recommendation

```text
Recommended stack:
Backend level:
Why it fits:
Main advantage:
Main disadvantage:
Change trigger:
Rejected alternatives:
```

## Parity matrix

| Route or state | Fidelity | Source evidence | Deterministic checks | Visual check | Exceptions | Verdict |
| --- | --- | --- | --- | --- | --- | --- |

## Final verification receipt

```text
Brief digest:
Validation receipt digest:
Source evidence digest:
Local input inventory digest:
Local asset mapping digest:
Final tree digest:
Verifier:
Commands:
Viewports:
Network result:
Local asset inventory:
Static safety scan:
Neutralization inventory:
Unaffiliated demo notice:
Screenshot method:
Masked regions:
Verdict:
Exceptions:
Remaining risks:
```

## Launch record

Create `.replica/launch.json` only after the Owner approves the exact launch table:

```json
{
  "version": 1,
  "normalized_brief_sha256": "<normalized brief digest>",
  "source_inputs_sha256": "<source input inventory digest>",
  "mode": "autonomous-a-to-z",
  "cost_ceiling_minor": 0,
  "issued_at": "<trusted timestamp>",
  "expires_at": "<trusted timestamp>",
  "owner_approval": {
    "status": "approved",
    "channel": "parent-session",
    "evidence_sha256": "<digest of the exact approval answer>"
  },
  "actions": [
    {
      "id": "local-validation-1",
      "action": "run-local-validation",
      "target_path": ".",
      "argv": ["npm", "test"],
      "use_limit": 3
    },
    {
      "id": "project-write-1",
      "action": "write-project",
      "target_path": ".",
      "argv": ["host-native", "write-project"],
      "use_limit": 1
    }
  ],
  "approved_hosts": [],
  "prohibited": [
    "credentials",
    "paid actions",
    "real payments",
    "destructive cleanup"
  ]
}
```

The launch record is evidence of the exact approval answer, not a self-granted permission. Its lifetime cannot exceed 24 hours and its cost ceiling is zero. The validator rejects common shell, wrapper, privilege, filesystem mutation, deployment, and network clients; install and migration verbs; inline Node or Python code; mutating Git operations; and mismatched protected capture, download, or normalization scripts. Executable actions receive ignored standard input, a reduced non-credential environment, and a 30-minute timeout. `write-project` uses the non-executable `["host-native", "write-project"]` sentinel. Invalidate the record when the normalized brief, source-input manifest, action, argv, host, target path, cost, expiry, or use count changes.

Validate only the launch record before creating run state:

```bash
node .vibekit/skills/clone-website/scripts/validate-autonomous-run.mjs \
  --project-root . \
  --launch-only
```

Execute an approved action through the gateway. Do not run the underlying command a second time:

```bash
node .vibekit/skills/clone-website/scripts/validate-autonomous-run.mjs \
  --project-root . \
  --execute-action local-validation-1 \
  -- npm test
```

Consume a `write-project` grant immediately before one bounded parent-host write batch:

```bash
node .vibekit/skills/clone-website/scripts/validate-autonomous-run.mjs \
  --project-root . \
  --consume-native-action project-write-1
```

This command records authorization but does not execute the sentinel. The parent host must keep its native file edits under the recorded target path. The write batch must not change `.replica/brief.json`, `.replica/brief.normalized.json`, `.replica/validation-receipt.json`, `.replica/launch.json`, `.replica/action-uses/`, or the validator scripts.

Use counts are stored under `.replica/action-uses/<launch-sha256>.json`. A use is consumed before process start or native write so a failed action cannot be retried beyond the approved limit. Treat the ledger as protected evidence. It detects normal overuse but is not tamper-proof against a host that can rewrite `.replica/`. Each network capture, browser capture, and asset download needs its own launch action with the exact actual argv.

## Run state

Maintain `.replica/run-state.json` during autonomous execution:

```json
{
  "version": 1,
  "normalized_brief_sha256": "<normalized brief digest>",
  "launch_sha256": "<launch record digest>",
  "phase": "implement",
  "completed_phases": ["inspect", "validate", "acquire", "normalize", "architect"],
  "retry_count": 0,
  "terminal_state": null,
  "blockers": [],
  "last_checkpoint_sha256": "<tree or artifact digest>"
}
```

Allowed terminal states are `complete`, `complete-with-exceptions`, `needs-owner-input`, and `failed`.

The completed phase list must be an ordered prefix of `inspect`, `validate`, `acquire`, `normalize`, `architect`, `implement`, `verify`, `harden`, and `handoff`. Validate each checkpoint with:

```bash
node .vibekit/skills/clone-website/scripts/validate-autonomous-run.mjs \
  --project-root .
```

## User handoff

Keep the handoff short:

1. prerequisites;
2. one install command only when dependencies already belong to the project;
3. one local run command;
4. one validation command;
5. configuration path for backend, stack, local runtime, source, and model choices;
6. how to change those choices later.
