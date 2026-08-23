# Codex settings

Use this reference only for OpenAI Codex configuration.

## Official sources

- [Configuration basics](https://developers.openai.com/codex/config-basic)
- [Advanced configuration](https://developers.openai.com/codex/config-advanced)
- [Configuration reference](https://developers.openai.com/codex/config-reference/)

These sources were verified on 2026-08-23. Re-open the official OpenAI documentation at use time because keys, supported values, and model catalogs can change.

## Scope

- User: `~/.codex/config.toml`, or `$CODEX_HOME/config.toml` when `CODEX_HOME` is set.
- Project: `.codex/config.toml`, loaded only for a trusted project.
- Project configuration can set model behavior, but Codex ignores machine-local provider keys such as `model_provider` and `model_providers` there. Keep provider definitions in user configuration.
- Command-line and selected profile values can override file defaults. Inspect the requested scope before editing.

## Model and compaction example

Use only model IDs and reasoning levels confirmed by the installed Codex catalog:

```toml
model = "<verified-model-id>"
model_reasoning_effort = "high"
model_auto_compact_token_limit = 300000
model_auto_compact_token_limit_scope = "total"
```

`model_auto_compact_token_limit` is an absolute token threshold. The documented scope values are `total` and `body_after_prefix`. Do not set the example threshold until the selected model's effective context and input limits make it valid. Do not change `model_context_window` to force the threshold.

## Custom provider example

Provider definitions belong in user configuration:

```toml
model_provider = "example"

[model_providers.example]
name = "Example provider"
base_url = "https://api.example.com/v1"
env_key = "EXAMPLE_API_KEY"
wire_api = "responses"
```

The credential stays in the named environment variable. Never add `experimental_bearer_token`, a literal token, or a secret-bearing header. `responses` is the only documented `wire_api` value.

## Verification

- Check TOML syntax with an already-available parser or the installed Codex startup path.
- Re-open the official configuration reference and compare every changed key and value.
- Confirm the selected model and reasoning effort in a fresh Codex session when that can be done without a paid request. If no documented resolved-config command is available, report effective runtime verification as unavailable instead of guessing.
