---
name: model-provider-settings
description: Safely inspect, plan, and update model, provider, reasoning, context, and compaction settings for Codex, Claude Code, Cursor, OpenCode, Grok Build, and Kimi Code from current official documentation. Use when setting up, comparing, migrating, or repairing provider configuration. Do not use for controller or worker routing alone.
---

# Model Provider Settings

Configure each supported coding agent through its own documented schema. Preserve provider-specific meaning instead of translating keys by name.

## Route the request

Identify the target product before inspecting or proposing configuration. Read only its provider reference:

- Codex: [references/codex.md](references/codex.md)
- Claude Code: [references/claude-code.md](references/claude-code.md)
- Cursor: [references/cursor.md](references/cursor.md)
- OpenCode: [references/opencode.md](references/opencode.md)
- Grok Build: [references/grok-build.md](references/grok-build.md)
- Kimi Code: [references/kimi-code.md](references/kimi-code.md)

If several products are requested, read each applicable reference and keep their patches separate.

## Required workflow

1. Detect the installed product and version without changing state. Do not install, update, log in, or make a model request during discovery.
2. Record the requested scope, model, provider, reasoning setting, context capacity, and compaction intent. Classify compaction as `used-token-trigger`, `effective-window`, `remaining-token-reserve`, `percentage-trigger`, or `manual-only`.
3. Re-open the linked official documentation at use time. Record the canonical URL, retrieval date, installed version, facts checked, and any mismatch. Official documentation overrides the examples in this skill when the installed version and current schema differ.
4. Inspect the effective configuration sources for the selected scope. Redact secret values. Report managed, environment, command-line, project, local, and user overrides that can change the result.
5. Validate model and effort identifiers through the installed product's current catalog or picker. Never translate a model name or reasoning level across products.
6. Produce one bounded proposal containing the exact target path, minimal patch, precedence effect, verification command, rollback, and unsupported requests. Ask once for the complete mutation scope required by repository policy.
7. After approval, change only the requested keys. Preserve unknown keys, comments when the format permits them, formatting, and unrelated settings. Do not rewrite CLI-managed fields when the provider offers a native command or picker.
8. Validate syntax and use the provider's documented non-paid readback or diagnostic. Start a fresh session only when needed to prove effective settings. A request that can incur model usage, billing, login, or external mutation needs separate approval.
9. Return the changed scope, redacted before and after values, official sources, verification evidence, rollback location or procedure, unsupported items, and residual uncertainty.

## Authority and safety

- Repository approval does not authorize writes to user-global, managed, or enterprise settings. Obtain exact-path approval before any user-global write.
- Never edit managed settings. Report the controlling source and the administrator action required.
- Never put credentials, bearer tokens, cookies, signed URLs, or secret-bearing headers in project files, examples, prompts, logs, diffs, or output.
- Prefer a provider login flow, credential store, or environment-variable name over inline credentials. Do not start login without approval.
- Before a user-global edit, capture a redacted preview and current file digest. Create a recoverable backup without exposing its contents. If shell path operations are required, apply the path-sensitive shell safety workflow first.
- Reject a compaction value that conflicts with the verified model context or input limit. Do not modify capacity metadata merely to force earlier compaction.
- Missing native support is a valid result. State `unsupported` and offer the closest documented manual or semantic alternative.
- Do not claim a configuration is effective when only file syntax was checked.

## Semantic boundary

These controls are not interchangeable:

- Codex uses an absolute token trigger.
- Claude Code uses an effective window for compaction calculations.
- Cursor documents manual compaction only.
- OpenCode uses a remaining reserve, with different stable and V2 schemas.
- Grok Build uses a percentage of context usage.
- Kimi Code uses a remaining-token reserve.

Treat example numbers as provider-local illustrations, never portable defaults.
