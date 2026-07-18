@AGENTS.md

# Claude Code

This file is intentionally small. Shared rules live in `AGENTS.md`, project facts live in `backbone.yml`, and long procedures live in `.claude/skills/`.

## Startup

1. Read `backbone.yml`.
2. If `meta.template_status` is `uninitialized`, follow `.vibekit/init/FIRST_TIME_INIT.md` before other work.
3. If initialized, follow `backbone.yml` `conventions` and continue with the user's task.

## Useful skills

- `/init-vibe` - initialize or repair the kit setup.
- `/autoresearch-coding` - run a metric-driven improvement loop.
- `/security-scan` - run AgentShield-style review.
- `/daily-enhance` - propose rule, skill, and workflow improvements.
- `/coding-level N` - set explanation depth 0-5; the project default lives in `backbone.yml` `conventions.custom_rules`.
- `/prompt-sharpener <rough prompt>` - sharpen a rough prompt into a precise one, then execute it in the same turn.

## Hard rules

- Show a diff and wait for explicit approval before changing root instruction files, `backbone.yml`, rules, skills, or workflows.
- Do not deploy, rotate secrets, run migrations, delete data, or rewrite remote history without explicit approval.
- Prefer `trash` over `rm` for deletions; permanent deletes need explicit approval of the exact paths (see `.claude/rules/safe-delete.md`).
- Keep `.autoresearch/`, `results.tsv`, and `.vibekit/reports/` local unless the user asks to commit them.

## English Learning & Grammar Correction

### Grammar Correction Protocol

When the user sends a message, **ALWAYS start by correcting their English grammar first** before providing the main response:

1. **Quote their original message** in a blockquote
2. **Provide the corrected version** with proper grammar
3. **List the grammar fixes made** with brief explanations
4. **Then proceed** with answering their request

This helps the user learn English while getting assistance with their technical work.

**Example Format:**

```
**Your original message:**
> "now please using sequential thinking to helpme has instruction"

**Corrected version:**
> "Now please use sequential thinking to help me add an instruction"

**Grammar fixes made:**
- "using" → "use" (imperative form)
- "helpme" → "help me" (two words)
- "has instruction" → "add an instruction" (verb agreement)
```
