# AGENTS.md

Shared instructions for Claude, Cursor, Codex, OpenCode, Grok, Kimi, and other coding agents.

<!-- BEGIN: minimal-vibe-coding-kit -->
## Minimal Vibe Coding Kit

### Source of truth

- Read `backbone.yml` before changing code.
- If `meta.template_status` is `uninitialized`, follow `.vibekit/init/FIRST_TIME_INIT.md` and wait for approval before writing.
- After init, follow the `conventions` rules in `backbone.yml`; ask before changing broad project patterns.
- Prefer concise root instructions. Put long procedures in skills and docs.

### Work style

- Start with a short plan for multi-file or risky changes.
- Prefer small, reviewable diffs.
- Reuse existing resource, localization, route, config, and generated-definition accessors instead of hardcoding literals when the repo has them.
- Run the validation command listed in `backbone.yml` after relevant changes.
- Summarize changed files, validation results, and remaining risks.

### Response format

- Lead with the outcome: the first one or two sentences state the result, answer, or recommendation. Supporting detail comes after, kept short and scannable.
- When the user must choose, present a decision table with the columns Option, What it does, Cost, Risk, Recommended. Mark exactly one option as recommended and give the reason in one line under the table.
- Use tables for comparable facts only; keep reasoning in prose around the table, not inside cells.
- End every multi-step task response with a status block: Done (what was completed and how it was verified), Next (the next task in order, or "none" when work is complete), Decision needed (only when a blocking choice belongs to the user). When several tasks remain, list them in order and name the one that starts next.

### Writing style

- No emoji in responses, code, docs, commits, or diagrams unless the user explicitly asks.
- No em dashes or en dashes in generated prose; use ASCII punctuation (comma, colon, semicolon, hyphen, parentheses).
- When editing files whose established style already uses these characters, keep existing characters and apply the rule only to new text.
- Plain-language register in every reply language: lead with the outcome, keep sentences short with one idea each, prefer active voice and concrete verbs, put known information before new information, and define project terms at first use.
- Reuse the project's vocabulary from the glossary named in `backbone.yml` `project.context` when present instead of rotating synonyms. When replying in English, keep one meaning per word (ASD-STE100-style simplicity); never apply English-only word lists to other languages.
- Reply in the user's conversation language; quote code identifiers, commands, file paths, and error text verbatim in every language. When a message does not land, the user can invoke `/wait-what` for a plain-language re-pitch.

### Proportional effort

- Triage each request in one line before working: trivial (typo, comment, one-liner: edit, validate, report), small (one file: two-line plan, edit, validate), medium (several files: short plan plus one diff self-review), large or risky (installers, validators, security, agent surfaces: full plan plus the skills and probes the security rules require).
- Review must never cost more than the change itself. Do not launch parallel-analysis, graph orchestration, multi-agent review, visual loops, or e2e suites for trivial or small tasks unless the user asks for them.

### Orchestration preference

- Immediately before the first subagent, child agent, council member, or multi-agent lane is dispatched, follow `.vibekit/docs/ORCHESTRATION_MODES.md`.
- Ask unresolved Default, Auto, or Custom choices through the active parent provider's native structured-question tool when available; otherwise ask one concise plain-text question at a time in the parent conversation.
- Child agents never ask the end user directly. They return `needs_user_input` with bounded options and a recommendation to the parent.
- A remembered provider preference never grants authority, makes multi-agent work proportionate, or changes plan-only, sequential, countercheck, or verified-graph safety topology.

### Visual design loop and e2e gate

Do not run the `visual-design-loop` skill or full e2e suites by default. Score the need first, 0-2 per question: (1) did the change alter a user-visible surface, (2) does the outcome depend on subjective visual judgment such as layout, typography, or color, (3) could a visual regression reach end users unnoticed by existing tests. Report the score and decision in one line, for example "visual gate 2/6: skipped".

- Score 0-2: skip; rely on the validation command in `backbone.yml`.
- Score 3-4: one screenshot check with at most one targeted fix; no loop.
- Score 5-6: propose the loop or e2e run with its budget and estimated cost, then wait for explicit user approval before starting.

When the loop is approved, use the current brief as the source of truth, make one targeted improvement per loop, and track every loop in `/tmp/design-{project_slug}.md`. Each loop entry must include screenshot reviewed, issue found, fix applied, before/after judgment, remaining concerns, and stop/continue decision. Default budget is 3 loops unless the user specifies otherwise.

### Safety

- Never print full secrets.
- Prefer `trash` over `rm` for deletions so they stay recoverable. Check `command -v trash` first; if missing, recommend installing it (macOS 14+ built-in; older macOS `brew install trash`; Linux `sudo apt install trash-cli`; any OS with Node `npm i -g trash-cli`) instead of falling back to `rm`. Permanent deletes require explicit user approval of the exact paths.
- Do not run untrusted hooks, MCP servers, deploy scripts, package lifecycle scripts, migrations, or destructive shell commands just to inspect a repo.
- Do not modify protected paths from `backbone.yml` without explicit approval.
- Before editing or approving shell/deploy/installer/repair logic that uses path variables or destructive commands (`rm`, `mv`, `cp -a`, `rsync --delete`, `find -delete`, `git clean`, checkout replacement), use `path-sensitive-shell-safety` and prove base/folder/repo values are non-empty, contained, quoted, and not broad system paths.
- If a task changes agent surfaces (`CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.opencode/**`, `opencode.json`, `.grok/**`, `.kimi-code/**`, `.codex-plugin/**`, `.vibekit/skills/**`, `.vibekit/commands/**`, `.vibekit/scripts/**`, hooks, MCP config), run the AgentShield probe or explain why it was skipped.

### Skills to prefer

- `vibekit-init`: first-time init and repair.
- `parallel-analysis`: fan out 2-5 read-only analysis lanes for repo-wide questions, large diff reviews, or consistency audits, then merge with a verification pass.
- `autoresearch-coding`: metric-driven experiment loop.
- `agentshield-security-review`: agent-surface security review.
- `path-sensitive-shell-safety`: validate remote base paths, repo folders, branch sync, and destructive shell commands before edits land.
- `daily-workflow-curator`: daily proposal for improving rules, skills, workflows, and docs.
- `visual-design-loop`: screenshot-driven UI polish loop (gated: score the need first and get user approval before running).

### Autoresearch loop contract

Use this when improving a repo over repeated experiments:

1. Define goal, metric command, direction, editable paths, protected paths, budget, and timeout.
2. Run a baseline before edits.
3. Change only editable paths.
4. Log every experiment.
5. Keep only changes that improve the metric or simplify without regression.
6. Discard or revert failed experiments.

### Daily enhance contract

Daily enhancement must propose changes, not silently apply them. The expected output is a report plus a diff proposal for user approval.
<!-- END: minimal-vibe-coding-kit -->
