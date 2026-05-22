---
name: vibekit-init
description: Initialize or repair Minimal Vibe Coding Kit in an existing project. Use for first prompt, backbone.yml setup, CLAUDE.md merge, AGENTS.md merge, Cursor rules setup, or Codex skill setup. Always show requirements and a diff before writing.
disable-model-invocation: true
argument-hint: target path; profiles claude,cursor,codex; write yes/no
---

# Vibe Kit Init

Initialize the kit safely.

## Required behavior

1. Print the requirements checklist from `FIRST_TIME_INIT.md`.
2. Run or emulate detection:

```bash
node scripts/init-backbone.mjs . --propose
```

3. Propose a unified diff for `backbone.yml` and managed blocks.
4. Ask: `Apply this proposed backbone? Reply yes, edit, or abort.`
5. Write only after explicit `yes`.
6. Validate after writing.

## Merge policy

- Never overwrite existing `CLAUDE.md` or `AGENTS.md`.
- Replace only content between Minimal Vibe managed markers.
- Preserve user content outside managed markers.
- Keep `CLAUDE.md` and `AGENTS.md` concise.

## Completion

Report initialized status, validation command, validation result, and next recommended skill.
