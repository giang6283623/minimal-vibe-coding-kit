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
2. Run or emulate detection, including repo-specific conventions, project mode, and PRD presence:

```bash
node .vbkit-scripts/init-backbone.mjs . --propose
```

3. Run the project-understanding step below.
4. Propose a unified diff for `backbone.yml`, its `conventions` rules, managed blocks, and any new `.vbkit-docs/PRD.md`.
5. Ask: `Apply this proposed backbone and convention rules? Reply yes, edit, or abort.`
6. Write only after explicit `yes`.
7. Validate after writing.

## Project understanding (PRD)

Detection reports `project.mode` (`greenfield` = no source yet, `brownfield` = existing code) and whether a PRD exists.

- Always offer a short interview, regardless of whether docs already exist: what the project is and who it is for, the core problem and primary focus now, what success looks like, key constraints/non-goals, and (brownfield) which area to improve first.
- If no PRD is found, propose creating `.vbkit-docs/PRD.md` from `.vbkit-docs/templates/PRD_TEMPLATE.md` using the answers, and set `project.prd` to that path.
- If a PRD exists, read it, link it in `project.prd`, and offer to refresh it without overwriting unapproved content.
- Keep the PRD short; it captures intent, not a full spec. Record domain terms in `.vbkit-docs/CONTEXT.md` (scaffold from `.vbkit-docs/templates/CONTEXT_TEMPLATE.md`) and link it in `project.context`.

## Convention detection

- Infer naming, directory layout, architecture, shared resource access, localization/message access, generated definitions, and per-app/package differences from existing files.
- Prefer existing constants, registries, generated APIs, and helper modules over hardcoded literals when the repo already has them.
- If no convention is clear, mark it as not detected and ask before introducing a broad new pattern.
- Store confirmed project rules in `backbone.yml` under `conventions`; later work must follow those rules unless the user edits them.

## Merge policy

- Never overwrite existing `CLAUDE.md` or `AGENTS.md`.
- Replace only content between Minimal Vibe managed markers.
- Preserve user content outside managed markers.
- Keep `CLAUDE.md` and `AGENTS.md` concise.

## Completion

Report initialized status, validation command, validation result, PRD path, and next recommended skill. Once the user confirms setup is complete, offer graduation (`node .vbkit-scripts/vibekit-finalize.mjs . --propose`) to move one-time bootstrap files into the cleanup folder.
