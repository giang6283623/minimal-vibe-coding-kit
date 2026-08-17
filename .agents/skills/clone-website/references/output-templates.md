# Output templates

## Brief

Store the intake at `.replica/brief.json`:

```json
{
  "version": 1,
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
    "fidelity": "F2",
    "scope": "S1",
    "backend_level": "B0",
    "target_stack": "static-html-css-js",
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
  "source_inputs": [],
  "exclusions": ["source identity", "source content", "sensitive interactions"]
}
```

All paths in `source_inputs` are relative to `.replica/evidence/`. Do not place credentials or private exports there without an approved secure-data plan. Record exact user-approved routes, deployment, features, and data in `authorization.scope`; its routes, deployment, and features must match the requested behavior exactly.

`target.url` identifies the site under study. For `public-research-local`, do not fetch it. For `owned` or `written-permission`, capture only within `authorization.scope`. `target.data_mode` must be `local-artifacts-only`, meaning captured artifacts are stored locally before implementation.

`replica.source_platform` is optional for legacy briefs and defaults to `generic`. New briefs must record one of `existing-repository`, `static-site`, `shopify`, `wordpress`, `woocommerce`, or `generic`. The validator derives `replica.workflow_id` from the source platform and target stack. Do not hand-edit the derived field into the input brief.

`replica.local_development` is optional for legacy briefs and defaults to `preserve-existing` with `container_engine: none`. New briefs must record it. Allowed modes are `preserve-existing`, `host-native`, `docker-compose`, and `custom`. Docker Compose requires `docker-desktop`, `docker-engine`, `compose-compatible`, or `custom` as its engine. Other modes require `none`. When either value is `custom`, add a short `custom_runtime` description. Do not add `custom_runtime` for standard choices.

## Local input inventory

Record each supplied file before implementation:

```json
[
  {
    "path": ".replica/evidence/products.json",
    "kind": "mock-json",
    "rights": "neutralized",
    "sha256": "<digest>"
  },
  {
    "path": "public/images/product-1.jpg",
    "kind": "image",
    "rights": "owned",
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

## User handoff

Keep the handoff short:

1. prerequisites;
2. one install command only when dependencies already belong to the project;
3. one local run command;
4. one validation command;
5. configuration path for backend, stack, local runtime, source, and model choices;
6. how to change those choices later.
