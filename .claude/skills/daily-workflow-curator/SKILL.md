---
name: daily-workflow-curator
description: Propose daily improvements to project AI rules, skills, workflows, prompts, AgentShield posture, and backbone.yml. Use when the user asks to auto-enhance, update workflow, improve rules, or keep the vibe coding kit current. Propose diffs only; do not silently write.
argument-hint: target path; focus; write report yes/no
---

# Daily Workflow Curator

Run a daily improvement pass that proposes changes, not silent edits.

## Steps

1. Read `backbone.yml`, `AGENTS.md`, and active tool folders.
2. Run:

```bash
node scripts/daily-enhance.mjs . --write-report
```

3. Run validation:

```bash
node scripts/validate-kit.mjs .
```

4. Run AgentShield read-only probe if present:

```bash
python skills/agentshield-security-review/scripts/agentshield_repo_probe.py .
```

5. Identify stale, duplicated, or overly broad rules.
6. Propose a small diff that improves exactly one theme at a time:
   - init clarity
   - Claude skills
   - Cursor rules
   - Codex skills or AGENTS.md
   - AgentShield security
   - validation and CI
   - docs and first prompt
7. Wait for explicit approval before writing.

## Output

Return:

- Report path.
- Validation result.
- AgentShield probe result.
- Proposed diff.
- Risk notes.
- One recommended next daily focus.
