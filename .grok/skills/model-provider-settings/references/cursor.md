# Cursor settings

Use this reference only for Cursor Agent CLI configuration.

## Official sources

- [CLI configuration](https://cursor.com/docs/cli/reference/configuration)
- [CLI parameters](https://cursor.com/docs/cli/reference/parameters)
- [Slash commands](https://cursor.com/docs/cli/reference/slash-commands)

These sources were verified on 2026-08-23. Re-open them at use time because the CLI-managed schema and model catalog can change.

## Scope

- User CLI configuration: `~/.cursor/cli-config.json`, or the platform-specific path documented by Cursor.
- Project CLI configuration: `.cursor/cli.json`.
- Only permissions can be configured at project scope. All other CLI settings are user-level.
- Some global fields are CLI-managed and may be overwritten. Do not hand-edit a managed model object whose shape is not documented.

## Model and compaction workflow

Select a model from the current authenticated catalog:

```text
/model <verified-catalog-value>
```

For a one-shot CLI invocation, use the installed command's documented `--model` parameter. Never guess a model identifier or provider mapping.

Cursor does not document a Claude-style automatic compaction threshold in CLI configuration. Do not add `autoCompactWindow`, a Codex threshold key, or another invented alias. Use the documented manual command:

```text
/summarize
```

`/compress` is an alias.

## Verification

- Validate changed files as strict JSON.
- Restart Cursor Agent after a user configuration change.
- Use `/model` to confirm the selected catalog entry and `/about` to capture the installed CLI version.
- If the requested automatic threshold remains unsupported in current official documentation, report it as unsupported and preserve the configuration unchanged.
