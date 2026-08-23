# Grok Build settings

Use this reference only for Grok Build configuration.

## Official sources

- [Settings](https://docs.x.ai/build/settings)
- [Settings reference](https://docs.x.ai/build/settings/reference)
- [CLI reference](https://docs.x.ai/build/cli/reference)
- [Modes and commands](https://docs.x.ai/build/modes-and-commands)

These sources were verified on 2026-08-23. Re-open them at use time because the model catalog and settings can change.

## Scope

- User: `~/.grok/config.toml`, or `$GROK_HOME/config.toml`.
- Project: `.grok/config.toml`, limited to MCP servers, plugins, and permissions.
- Model, provider, reasoning, context, and session compaction settings belong in user configuration.
- Managed and requirements files are administrator-owned and must not be edited.

## Model and compaction example

Use an ID from `grok models` or the current picker:

```toml
[models]
default = "<verified-model-id>"
default_reasoning_effort = "<verified-effort>"

[session]
auto_compact_threshold_percent = 85
```

`auto_compact_threshold_percent` accepts 0 through 100 and triggers automatic compaction when context usage reaches that percentage. It is not an absolute token threshold.

For a reviewed custom provider, keep credentials in an environment variable:

```toml
[model.example]
model = "<verified-provider-model-id>"
base_url = "https://api.example.com/v1"
name = "Example provider model"
env_key = "EXAMPLE_API_KEY"
api_backend = "responses"
context_window = 200000
```

Set `context_window` only from verified provider capability data because it drives compaction timing. The documented `api_backend` values are `chat_completions`, `responses`, and `messages`.

## Verification

- Run `grok inspect` to confirm loaded configuration sources.
- Run `grok models` to confirm model availability.
- Use `/context` and `/compact [context]` for context inspection and manual compaction.
- A paid headless request such as `grok -p` needs separate approval and is not part of configuration validation by default.
