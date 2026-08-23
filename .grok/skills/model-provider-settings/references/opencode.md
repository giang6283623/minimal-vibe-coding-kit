# OpenCode settings

Use this reference only for OpenCode configuration.

## Official sources

Stable documentation:

- [Configuration](https://opencode.ai/docs/config/)
- [Providers](https://opencode.ai/docs/providers/)
- [Models](https://opencode.ai/docs/models/)

V2 documentation:

- [V2 configuration](https://opencode.ai/v2/docs/config)
- [V2 compaction](https://opencode.ai/v2/docs/compaction)
- [V2 providers](https://opencode.ai/v2/docs/providers)
- [V2 models](https://opencode.ai/v2/docs/models)

These sources were verified on 2026-08-23. Re-open the branch matching the installed executable and version at use time. Never mix stable `provider` settings with V2 `providers` settings.

## Scope

- Global: the current official platform path, commonly `~/.config/opencode/opencode.json` or `.jsonc`.
- Project: `opencode.json` or `opencode.jsonc`, plus any documented `.opencode` configuration hierarchy.
- Direct and `.opencode` files merge by documented precedence. Inspect the resolved sources before editing.
- Credentials added through `/connect` are user-local. Never place credentials in a project configuration.

## Stable example

Use exact provider and model IDs from the current model list:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "<verified-provider-id>/<verified-model-id>",
  "compaction": {
    "auto": true,
    "prune": false,
    "reserved": 10000
  }
}
```

`reserved` is a remaining token buffer. It is not a used-token threshold.

## V2 example

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "<verified-provider-id>/<verified-model-id>",
  "compaction": {
    "auto": true,
    "keep": {
      "tokens": 15000
    },
    "buffer": 20000
  }
}
```

In V2, `keep.tokens` retains recent serialized context and `buffer` is a safety reserve below the input limit. V2 starts preflight compaction when its estimate exceeds the context limit minus the larger of requested output tokens or `buffer`. `auto = false` does not disable manual compaction or the documented one-shot overflow recovery.

## Verification

- Detect the executable and version before choosing a schema branch.
- Validate JSON or JSONC against `https://opencode.ai/config.json` with existing local tooling.
- Use the installed version's documented resolved-configuration command when available.
- Confirm the current session model from the authenticated catalog. Treat fallback to another model as failed verification.
