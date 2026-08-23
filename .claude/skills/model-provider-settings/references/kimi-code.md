# Kimi Code settings

Use this reference only for Kimi Code CLI configuration.

## Official sources

- [Configuration files](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/config-files)
- [Providers and models](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/providers.html)
- [Configuration overrides](https://www.kimi.com/code/docs/en/kimi-code-cli/configuration/overrides.html)
- [`kimi` command](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/kimi-command)

These sources were verified on 2026-08-23. Re-open them at use time because the configuration path, provider types, and model metadata can change.

## Scope

- User: `~/.kimi-code/config.toml`, or `$KIMI_CODE_HOME/config.toml`.
- Kimi Code currently reads one user-level runtime configuration and has no project-level model or provider configuration mechanism.
- Do not use the legacy `~/.kimi/config.toml` path for current Kimi Code without installed-version evidence.
- Provider credentials in `config.toml` are plaintext. Prefer `/login` or `kimi login` for supported providers, and require approval before starting authentication.

## Model and compaction example

Use aliases and capabilities from the installed catalog or a provider definition verified against official documentation:

```toml
default_model = "<verified-model-alias>"

[models."<verified-model-alias>"]
provider = "<verified-provider-name>"
model = "<verified-provider-model-id>"
max_context_size = 262144

[thinking]
enabled = true
effort = "<verified-effort>"

[loop_control]
reserved_context_size = 50000
```

`reserved_context_size` reserves output capacity and triggers automatic compaction when the remaining context falls below it. It is not an absolute used-token threshold. Confirm it is smaller than the effective input and context limits. Set `max_context_size` and optional `max_input_size` only from verified provider capabilities.

Do not include `api_key` in a project file, example, diff, prompt, log, or output. For a third-party provider that cannot use an approved login flow, collect the credential through a secure user-only mechanism and never echo it.

## Verification

- Validate a candidate before replacement with `kimi doctor config <candidate-path>`.
- Validate the active file with `kimi doctor config`.
- Use `/reload` when the installed version documents it, then confirm the effective model and effort.
- Do not start a model request merely to validate syntax. A paid smoke request needs separate approval.
