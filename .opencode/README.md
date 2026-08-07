# OpenCode support

Minimal Vibe Coding Kit supports OpenCode through its native project surfaces.

- `AGENTS.md` is the shared project instruction file.
- `.agents/skills/` is the shared native skill registry used by both OpenCode and Codex.
- `.opencode/commands/` contains OpenCode command prompts.
- `opencode.json` is a seed-only, conservative permission baseline. The installer never overwrites an existing project configuration.

No custom OpenCode agents are included. OpenCode's built-in Plan agent and the shared skills cover the kit workflows without introducing a non-portable agent format.

Use the profile explicitly:

```bash
npx --yes minimal-vibe-coding-kit@latest install . --profile opencode
```

See the official OpenCode documentation for [rules](https://opencode.ai/docs/rules/), [skills](https://opencode.ai/docs/skills/), [commands](https://opencode.ai/docs/commands/), and [permissions](https://opencode.ai/docs/permissions/).
