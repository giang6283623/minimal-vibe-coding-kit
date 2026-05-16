# CLAUDE.md — Project Memory (Template)

> Copy this file to `CLAUDE.md` at the repo root the first time you drop the
> vibe-coding kit into a project. It is intentionally short: the _real_
> per-project configuration lives in `backbone.yml`, and the bootstrap
> procedure lives in `FIRST_TIME_INIT.md`.
>
> **If the project already has a `CLAUDE.md`, do NOT overwrite it.** Append
> only the managed block shown in `FIRST_TIME_INIT.md` § Guardrail 1 to the
> end of the existing file.

---

<!-- BEGIN: minimal-vibe-coding-kit (managed) — do not edit between these markers -->

## ⚡ FIRST-TIME INIT TRIGGER (managed by minimal-vibe-coding-kit)

Before doing **any** task in this repository, run the **Done-Marker Check**:

1. Open `backbone.yml`.
2. Init is considered **DONE** if **all three** are true:
   - `meta.template_status` equals `initialized`
   - `meta.initialized_at` is a non-null ISO-8601 timestamp
   - the file at `meta.init_done_marker` (default `.vibekit/INIT_DONE`) exists
3. If DONE → proceed normally with the user's request.
4. If NOT DONE → open [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) and follow it **step by step** before responding. Do not invent your own bootstrap. Do not write any file without first showing a diff and getting an explicit `yes` from the user.

**Anti-rerun:** never run the init flow more than once per session. The done-marker is the single source of truth.

> Do not silently modify `backbone.yml` or this file. The user must approve every diff.

<!-- END: minimal-vibe-coding-kit (managed) -->

---

## Initialization Order (every session, after init is DONE)

1. `backbone.yml` — project facts.
2. `.claude/Init CLaude.md` _(only if listed under `structure.claude.init`)_.
3. The rule files under `structure.claude.rules`.
4. The workflow files under `structure.claude.workflows` _(load lazily, only when a task matches)_.

For complex tasks use the reasoning skills shipped with this kit:

- `.claude/skills/sequential-thinking/SKILL.md`
- `.claude/skills/clearthought/SKILL.md`

---

## Critical File Operations Rule

🚫 **NEVER use `rm` for file deletion — ALWAYS use `trash` instead.**

- ✅ `trash file.txt`, `trash /path/to/file`, `trash directory/`
- ❌ `rm file.txt`, `rm -rf directory/`, any `rm` variant

`trash` moves files to the OS Trash so they remain recoverable. This rule applies to all shells the agent invokes.

---

## Autoresearch Coding Rules

When running an autoresearch-style coding loop:

- Work from a clean git tree unless the user explicitly permits dirty-state experimentation.
- Create a branch named `autoresearch/<YYYY-MM-DD>-<slug>` for experiments.
- Run a baseline before changing code.
- Record every experiment in the file at `automation.autoresearch.results_file` (default `results.tsv`).
- Keep commits only when the metric improves, or when an equal metric comes with simpler, safer code.
- Reset discarded or crashed experiment commits after logging the result.
- Keep `.autoresearch/` and `results.tsv` local unless the user asks to commit them.
- Modify only paths listed under `conventions.editable_paths`.
- Never touch paths listed under `conventions.protected_paths` (secrets, `.env*`, migrations, generated files, lockfiles, infra) without explicit user approval.
- Do not deploy, delete data, rotate secrets, or rewrite remote history.

### Useful invocations

```text
/autoresearch-coding <goal>; metric command: <cmd>; direction: <lower|higher>; editable paths: <paths>; budget: <n>
```

```bash
claude --agent research-coordinator
```

---

## Project-specific notes

<!--
  Add anything below this line that is unique to THIS project and not
  expressible via backbone.yml: domain glossary, gotchas, on-call info,
  feature flags, etc. Keep it terse — backbone.yml is the source of truth
  for structure and conventions.

  Anything you add here will be preserved on re-init: only the managed
  block above (between the BEGIN / END markers) gets touched.
-->

_(none yet — fill in after init)_
