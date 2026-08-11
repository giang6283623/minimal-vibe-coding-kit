# Output templates

## Brief

Store the intake at `.replica/brief.json`:

```json
{
  "version": 1,
  "target": {
    "url": "https://example.com/products",
    "routes": ["/products"],
    "capture_mode": "static-capture",
    "interactive_capture_approved": false,
    "approved_capture_hosts": ["example.com"]
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
    "fidelity": "F2",
    "scope": "S1",
    "backend_level": "B0",
    "target_stack": "static-html-css-js",
    "deployment": "local-only"
  },
  "limits": {
    "max_pages": 1,
    "max_items": 8,
    "max_redirects": 3,
    "max_response_bytes": 5242880,
    "max_elapsed_ms": 30000,
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
Final tree digest:
Verifier:
Commands:
Viewports:
Network result:
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
5. configuration path for backend, stack, source, and model choices;
6. how to change those choices later.
