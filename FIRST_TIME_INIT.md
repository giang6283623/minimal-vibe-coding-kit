# FIRST_TIME_INIT.md — Bootstrap Runbook

> **Audience:** the AI coding agent (Claude Code, Cursor, etc.) on its very
> first session in a project that just received the Minimal Vibe Coding Kit.
> Humans can paste the [Canonical Prompt](#canonical-prompt) to invoke it.

This file is **idempotent** and **safe to re-run**. It contains four things:

1. The [canonical prompt](#canonical-prompt) you can paste to start init.
2. The [step-by-step procedure](#step-by-step-procedure) the AI must follow.
3. The [guardrails](#guardrails) (CLAUDE.md merge, done-marker, anti-rerun).
4. A [manual override](#manual-override) when you really want to re-init.

---

## Canonical Prompt

Paste this into Claude Code / Cursor on the first session after you copy the
kit into a project. It is also fine to skip it — the trigger block in
`CLAUDE.md` should make the AI run this runbook automatically.

```text
You are bootstrapping this repository with the Minimal Vibe Coding Kit.

Open FIRST_TIME_INIT.md and follow it exactly. In short:

1. Run the DONE-MARKER CHECK first. If init has already been completed
   (meta.template_status == "initialized" AND meta.initialized_at is set),
   STOP and tell me it's already initialized — do not re-run.
2. Otherwise, scan the working tree, infer values for every <<PLACEHOLDER>>
   in backbone.yml, and propose a single unified diff. Do not write yet.
3. CLAUDE.md guardrail: if a CLAUDE.md already exists in this repo, DO NOT
   overwrite it. Append the FIRST-TIME INIT TRIGGER block to the END of the
   existing file inside a clearly marked section. If no CLAUDE.md exists,
   copy CLAUDE-template.md to CLAUDE.md verbatim.
4. Wait for me to reply "yes" / "edit" / "abort" before writing anything.
5. On "yes": apply the diff, set meta.template_status = "initialized",
   meta.initialized_at = today's ISO-8601 timestamp, and create the
   sentinel file .vibekit/INIT_DONE with the same timestamp.
6. After writing, print a one-line "Init complete ✓" confirmation and then
   proceed with whatever I originally asked for.
```

---

## Step-by-Step Procedure

### 0. Pre-flight (must run before anything else)

- [ ] Confirm `backbone.yml` exists at the repo root. If not, abort with: _"Missing backbone.yml — copy it from the Minimal Vibe Coding Kit before continuing."_
- [ ] Confirm `FIRST_TIME_INIT.md` (this file) is at the repo root. (Self-check.)
- [ ] Note which agent trees exist: `.claude/`, `.cursor/`, or both. The init flow must fill the placeholders inside every existing `.<tool>/Init CLaude.md` it finds.

### 1. Done-Marker Check (anti-rerun)

The AI must verify **all three** signals before deciding to skip. They are redundant on purpose so a corrupted state can't silently re-trigger a destructive re-init.

| Signal | Source of truth                       | "Done" value                |
| ------ | ------------------------------------- | --------------------------- |
| A      | `backbone.yml → meta.template_status` | `initialized`               |
| B      | `backbone.yml → meta.initialized_at`  | non-null ISO-8601 timestamp |
| C      | `.vibekit/INIT_DONE` (sentinel file)  | exists and is non-empty     |

Decision table:

| A   | B   | C   | Action                                                                                                                              |
| --- | --- | --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ✅  | ✅  | ✅  | **Skip init.** Print: _"Backbone already initialized on `<initialized_at>`. Skipping init."_ Then continue with the user's request. |
| ✅  | ✅  | ❌  | Sentinel missing. Re-create `.vibekit/INIT_DONE` with the existing `initialized_at` value, then skip init.                          |
| ✅  | ❌  | any | Inconsistent. Treat as `uninitialized` and continue to step 2. Warn the user that `initialized_at` was missing.                     |
| ❌  | any | any | Continue to step 2.                                                                                                                 |

> **Anti-rerun debounce:** if step 1 already ran in this same session (you can verify by checking that `meta.template_status` was read in the last few tool calls), **do not** run a second propose-and-apply cycle. The done-marker is the only source of truth — never re-init within the same conversation.

### 2. Detect the Stack

Use `backbone.yml → detection` to scan the working tree. Prefer the file system over READMEs.

- Languages: presence of lockfiles wins (`go.sum`, `package-lock.json`, `pnpm-lock.yaml`, `bun.lockb`, `poetry.lock`, `Cargo.lock`, `Gemfile.lock`, `composer.lock`).
- Frameworks: match `framework_hints` patterns; also peek inside `go.mod` / `package.json` / `pyproject.toml` for declared dependencies.
- Monorepo: any of `turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `lerna.json`, `go.work`.
- Multi-repo: more than one `package.json` / `go.mod` / etc. in **non-nested** directories.

### 3. Infer Values

Fill every `<<PLACEHOLDER>>` across **all** of these files (those that exist):

- `backbone.yml` — primary manifest.
- `.claude/Init CLaude.md` — per-session entry point for Claude.
- `.cursor/Init CLaude.md` — per-session entry point for Cursor (mirror).

In `backbone.yml`:

| Field                                            | How to infer                                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `project.name`                                   | `package.json:name`, `pyproject.toml:project.name`, `go.mod:module` (last segment), else repo folder name.                       |
| `project.description`                            | First sentence of existing `README.md` if present, else `<<TBD>>`.                                                               |
| `project.type`                                   | `mono-repo` if monorepo marker found; `multi-repo` if multiple top-level repos; else `single-repo`.                              |
| `project.primary_language`                       | Stack with the most source files (`.go`, `.ts`, `.tsx`, `.py`, `.rs`, `.java`, …).                                               |
| `project.repos`                                  | `{ app: . }` for single-repo. One entry per workspace package for mono/multi.                                                    |
| `structure.*`                                    | Keep only the block(s) matching detected stack(s); delete the unused commented examples.                                         |
| `conventions.package_manager`                    | From the present lockfile.                                                                                                       |
| `conventions.default_branch`                     | `git symbolic-ref refs/remotes/origin/HEAD` if available, else `main`.                                                           |
| `conventions.command_checks.*`                   | From `package.json:scripts` (`test`, `typecheck`, `build`, `lint`), `Makefile`, `go test ./...`, `pytest -q`, `cargo test`, etc. |
| `conventions.ports.*`                            | From `vite.config.*`, `next.config.*`, server bootstrap files, `.env.example`. If unknown, leave commented `# TBD`.              |
| `conventions.protected_paths` / `editable_paths` | Keep defaults; add stack-specific extras (e.g. `db/schema.rb`, `prisma/schema.prisma`).                                          |

In every `.<tool>/Init CLaude.md` that exists:

| Placeholder                                                                                       | How to fill                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `<<project.name>>`, `<<project.type>>`, `<<project.primary_language>>`                            | Mirror the same values you just inferred for `backbone.yml`.                                                                  |
| `<<conventions.command_checks.default>>`                                                          | Same string used in `backbone.yml`. If the project is multi-repo, list one bullet per repo (`backend: ...`, `frontend: ...`). |
| `<<conventions.default_branch>>`, `<<conventions.branch_naming>>`, `<<conventions.commit_style>>` | Same values as `backbone.yml`.                                                                                                |

> Keep these two files in sync. `.cursor/Init CLaude.md` is a byte-for-byte mirror of `.claude/Init CLaude.md` — generate one, then copy to the other.

### 4. Propose a Diff (do NOT write yet)

Emit a single fenced unified diff covering every file you intend to write: `backbone.yml`, `.claude/Init CLaude.md`, `.cursor/Init CLaude.md`, and the `CLAUDE.md` change from Guardrail 1. Append a short rationale per non-trivial inference.

Ask the user verbatim:

> **Apply this proposed backbone?** Reply `yes`, `edit`, or `abort`.

### 5. Handle the User's Reply

- **`yes`** → continue to step 6.
- **`edit`** → ask _"Which fields would you like to change?"_, collect, re-propose. Loop until `yes` or `abort`.
- **`abort`** → do not write anything. Warn the user that the backbone remains uninitialized and proceed best-effort with their original request.

### 6. Apply (atomic write order)

Write the following in this order. Each step must succeed before the next.

1. Update `backbone.yml` with the approved diff.
2. Set `meta.template_status: initialized`.
3. Set `meta.initialized_at: <today's ISO-8601 UTC timestamp>` (e.g. `2026-05-16T09:30:00Z`).
4. Fill placeholders in every existing `.<tool>/Init CLaude.md` (`.claude/`, `.cursor/`). Keep both copies identical.
5. Handle `CLAUDE.md` per the [CLAUDE.md merge guardrail](#guardrail-1--claudemd-merge-vs-replace).
6. Create the sentinel file `.vibekit/INIT_DONE` (create the `.vibekit/` directory if missing). Contents:

   ```text
   initialized_at: <same ISO-8601 timestamp>
   schema_version: <copy from backbone.yml meta.schema_version>
   tool: minimal-vibe-coding-kit
   ```

7. Print exactly one confirmation line:

   ```text
   ✓ Init complete — backbone.yml + Init CLaude.md initialized at <timestamp>. Future sessions will skip init.
   ```

8. Resume the user's original request.

### 7. Post-init checklist (offer, do not force)

After confirming, offer to run these (one message, ask permission first):

- Run `conventions.command_checks.default` to verify the build/tests are green.
- Open `backbone.yml` so the user can tighten `editable_paths` / `protected_paths`.
- Commit the new files with message `chore: bootstrap minimal-vibe-coding-kit`.

---

## Guardrails

These are **hard rules**. The agent must not bypass them even if the user asks.

### Guardrail 1 — CLAUDE.md merge vs replace

When step 6.4 runs, branch on whether `CLAUDE.md` already exists:

#### Case A: No existing `CLAUDE.md`

Copy `CLAUDE-template.md` to `CLAUDE.md` verbatim. Done.

#### Case B: `CLAUDE.md` already exists

**Do not overwrite.** Append the trigger block to the **end** of the existing file, wrapped in clearly marked sentinels so a later script can find and update it.

The appended block must look exactly like this:

```markdown
<!-- BEGIN: minimal-vibe-coding-kit (managed) — do not edit between these markers -->

## ⚡ FIRST-TIME INIT TRIGGER (managed by minimal-vibe-coding-kit)

Before doing **any** task in this repository:

1. Open `backbone.yml`.
2. If `meta.template_status` is `initialized` and `.vibekit/INIT_DONE` exists, proceed normally.
3. Otherwise, follow `FIRST_TIME_INIT.md` step-by-step before responding to the user's request.

> Do not silently modify `backbone.yml` or this file. The user must approve every diff.

<!-- END: minimal-vibe-coding-kit (managed) -->
```

If those sentinels are already present in the file (re-init of a forked project), **replace only the content between them** — never duplicate. Do not touch anything outside the sentinels.

### Guardrail 2 — Done-marker is the single source of truth

If `meta.template_status == initialized` **and** `meta.initialized_at` is set **and** `.vibekit/INIT_DONE` exists, the agent **must skip** init even if the user asks to re-run. Direct the user to [Manual Override](#manual-override) instead.

### Guardrail 3 — Anti-rerun in the same session

The init flow runs **at most once per session**. After step 6 completes, the agent must not propose another init diff in the same conversation — even if the user asks. This protects against duplicate writes from impatient retries (the "don't follow in 2 seconds" rule).

### Guardrail 4 — No silent writes

Every write to `backbone.yml`, `CLAUDE.md`, or `.vibekit/` must be preceded by a visible diff and an explicit user `yes`. If the user does not respond, do not infer consent.

### Guardrail 5 — Respect `protected_paths`

The agent must never modify any path matched by `conventions.protected_paths` during init or afterwards, including but not limited to: `.env*`, secrets, lockfiles, migrations.

### Guardrail 6 — `trash`, not `rm`

If init needs to remove a temporary file (e.g. a stale `.vibekit/INIT_DONE.tmp`), use `trash`. Never use `rm`.

---

## Manual Override

You wanted to re-run init on purpose? Do **one** of the following:

```bash
# Option A — flip the flag, agent will propose a fresh diff next session
yq -i '.meta.template_status = "uninitialized" | .meta.initialized_at = null' backbone.yml
trash .vibekit/INIT_DONE

# Option B — nuke and replace from the kit
trash backbone.yml CLAUDE.md .vibekit/
cp /path/to/minimal-vibe-coding-kit/backbone.yml .
cp /path/to/minimal-vibe-coding-kit/CLAUDE-template.md ./CLAUDE.md
```

After either option, start a new AI session and either paste the [Canonical Prompt](#canonical-prompt) or let the trigger block fire automatically.

---

## Definitions

- **Init session** — the single AI conversation in which the propose-and-apply cycle runs to completion.
- **Sentinel file** — `.vibekit/INIT_DONE`, a tiny file whose existence is the third leg of the done-marker check.
- **Managed block** — the markdown region between the two `BEGIN / END: minimal-vibe-coding-kit (managed)` sentinels in `CLAUDE.md`.
- **Diff approval** — explicit user reply `yes` (case-insensitive). Anything else is not approval.

---

## Schema compatibility

This runbook targets `backbone.yml → meta.schema_version: 2`. If the file has a different `schema_version`, stop and ask the user to upgrade the kit before proceeding.
