# Capability contract

Route work by verified host capabilities, not by provider name, documentation
examples, cached model lists, or a successful login in another product surface.

## Route record

Keep the inventory in memory unless the user explicitly requests a safe local
record. Use this shape when a machine-readable record is needed:

```yaml
provider: current
host: active-host
transport: native
status: ready
verified_at: 2026-01-01T00:00:00Z
expires_at: 2026-01-01T00:10:00Z
capabilities:
  can_invoke_controller: true
  can_spawn_readonly: true
  can_spawn_write_isolated: false
  can_resume: true
  can_cancel: true
  can_run_mcp: false
  can_enforce_scopes: true
  can_attest_model: false
  can_return_receipt: true
constraints:
  mutation: false
  max_workers: 3
  model_binding: requested-not-attested
```

Replace every example value with live evidence. Do not treat this example as a
provider capability claim.

## Status rules

Classify each transport separately:

- `ready`: the route exists, a non-mutating readiness or authentication probe
  succeeds, the invocation contract is known, required boundaries are
  enforceable, and any exact requested model is in a fresh authenticated
  inventory;
- `installed-unverified`: a host, binary, plugin, or configuration exists, but
  authentication, model inventory, safe invocation, or permission enforcement
  cannot be proved;
- `unavailable`: the route is absent, the preflight fails, quota is exhausted,
  the requested capability is missing, or required isolation cannot be
  enforced.

`ready` applies to one transport only. For example, a ready provider app does
not make its CLI, SDK, API, or MCP bridge ready.

## Provider identifiers

Use `current`, `codex`, `claude`, `cursor`, `opencode`, `grok`, and `kimi` with
the existing orchestration helper. Treat an unregistered provider as `current`
for native execution only. Extend the shared manifest and deterministic helper
before storing or routing a new provider identifier.

Do not infer provider identity from a generic executable name. Commands such as
`agent` may belong to different products. Require the executable's own version,
help metadata, signed package metadata, or authenticated host identity before
assigning a provider identifier.

## Safe probes

Allow only bounded, non-mutating checks such as:

- host-exposed capability inventory;
- version or help output that runs no hooks;
- authentication status that prints no credential;
- a fresh model catalog from an already authenticated route;
- sandbox and permission introspection;
- a no-op or read-only request with a bounded timeout.

Version and model guidance must come from current official provider sources and
a fresh authenticated route inventory. Official documentation can establish a
supported command, but it cannot prove that the local account, quota, model, or
transport is ready.

For the bundled Codex CLI controller route, read `codex-cli-bridge.md`. Require
the complete CLI version and model-cache writer version to match exactly,
including prerelease components. Treat a mismatch as
`installed-unverified`; never mutate the user cache or installation to force a
pass. A match establishes only local consistency because the same-user cache is
not an authenticated provider receipt. The bridge's deterministic fake-CLI
suite verifies local adapter logic, not the live provider route.

For a Cursor-hosted Codex CLI route, treat host environment markers, the Cursor
extension registry, and extension manifests as untrusted local candidate-order
evidence. They do not prove OpenAI provenance. Require the selected executable's
real path, stat identity, content SHA-256, CLI surface, login state, cache, and
catalog to pass independently. Never treat an extension-owned app-server as an
available controller session.

Never install packages, run remote installers, open login flows, enable billing,
read credential files, weaken a sandbox, execute repository hooks, or send
repository data to prove readiness.

## Model and receipt claims

- Use an exact model claim only when the authenticated host attests the
  effective model and it matches the fresh request.
- Use `provider-default` when the user accepts provider routing without exact
  model control.
- Use `requested-not-attested` when the route accepted a requested model but
  the host cannot authenticate the effective setting.
- Do not claim provider diversity, strict Custom compliance, or independent
  evaluation from unverified model labels.
- Treat caller-supplied JSON as data, not as an authenticated host receipt.

## Failure handling

- Quota or billing failure: mark that transport unavailable for the current
  task and offer an authorized fallback. Do not bypass the limit.
- Authentication uncertainty: mark installed-unverified. Do not start login.
- Missing isolation: downgrade to read-only or sequential execution, or stop.
- Missing cancel or resume: reduce the budget and avoid long-running fan-out.
- Missing explicit external-controller resume: do not start the relay. Both
  automatic and sequential non-manual external modes require a stateful reply
  path.
- Missing receipt attestation: verify artifacts directly and report
  `requested-not-attested`.
- Conflicting capabilities: use the weaker proven capability and preserve the
  conflict in the final report.
