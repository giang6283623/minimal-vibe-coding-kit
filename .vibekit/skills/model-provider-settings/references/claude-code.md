# Claude Code settings

Use this reference only for Claude Code configuration.

## Official sources

- [Settings](https://code.claude.com/docs/en/settings)
- [Model configuration](https://code.claude.com/docs/en/model-config)
- [Environment variables](https://code.claude.com/docs/en/env-vars)
- [Troubleshooting](https://code.claude.com/docs/en/troubleshooting)

These sources were verified on 2026-08-23. Re-open them at use time because settings, model aliases, and precedence can change.

## Scope

- User: `~/.claude/settings.json`.
- Shared project: `.claude/settings.json`.
- Project local: `.claude/settings.local.json`.
- Managed sources are administrator-owned and must not be edited.
- Settings files are strict JSON. Comments and trailing commas are invalid.

Inspect managed, command-line, local, project, user, and environment sources. Auto-compaction has a special precedence rule: `CLAUDE_CODE_AUTO_COMPACT_WINDOW` overrides `/autocompact`, `--autocompact`, and `autoCompactWindow`.

## Model and compaction example

Use a model alias or ID confirmed by the current Claude Code model picker:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "<verified-model-alias-or-id>",
  "autoCompactWindow": 300000
}
```

`autoCompactWindow` sets the effective context capacity used for automatic compaction calculations. The documented range is 100000 to 1000000, and the effective value is capped at the model's actual context window. It is not the same as Codex's absolute used-token trigger.

The equivalent environment override is a plain integer string:

```json
{
  "env": {
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "300000"
  }
}
```

Do not set both forms unless the precedence is intentional and documented in the proposal. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` applies a percentage to the effective window and is a separate setting.

## Verification

- Parse the candidate as strict JSON before replacement.
- Run `claude doctor` or `/doctor` to check settings validity when available in the installed version.
- Use `/status` to inspect loaded sources and `/autocompact` to inspect the active policy when supported.
- Verify the effective model window. A configured `300000` value can be capped on a model with a smaller context window.
