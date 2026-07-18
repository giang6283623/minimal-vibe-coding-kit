---
name: reviewing-4p-priorities
description: P0-P4 issue and task triage for vibe coding. Use when reviewing bugs, risks, feature requests, agent-surface changes, or deciding which work must happen first.
argument-hint: "<issue, review finding, or task list>"
user-invocable: true
effort: medium
---

# Reviewing 4P Priorities

Use this skill to classify work from P0 to P4 and convert review findings into a practical fix order.

## Priority Scale

| Priority | Meaning | Response |
| --- | --- | --- |
| P0 | Critical outage, data loss, security exposure, or all users blocked | Stop and fix immediately |
| P1 | Major user-facing or release-blocking failure for many users | Fix before other planned work |
| P2 | Important bug, maintainability risk, or strategic enhancement | Schedule in the current cycle |
| P3 | Local polish, minor edge case, or narrow productivity improvement | Routine backlog |
| P4 | Nice-to-have, exploratory idea, or low-confidence request | Capture, defer, or discard |

## Vibe Coding Review Flow

1. Identify the affected user, workflow, or agent surface.
2. Separate evidence from guesses.
3. Classify the current impact, not hypothetical worst cases.
4. Explain why the item is not one level higher or lower.
5. Convert each P0-P2 item into a small fix task and validation check.
6. Leave P3-P4 items as optional follow-up unless they reduce risk cheaply.

## Output

```markdown
## 4P Review

Classification: P<0-4>
Issue: <short description>
Evidence:
- <observed fact>
Impact:
- Users/workflows affected: <scope>
- Failure mode: <what breaks>
Rationale:
- Why this priority:
- Why not higher:
- Why not lower:
Fix order:
1. <small task>
2. <small task>
Validation:
- <command or manual check>
```

## Priority Boundaries

- P0 requires immediate action because harm is happening now or secrets/data are exposed.
- P1 is urgent but does not require emergency response for every user.
- P2 is important and should be planned, but users have a workaround or impact is bounded.
- P3 improves quality but does not materially block the workflow.
- P4 is a candidate for a note, not an implementation commitment.

## Examples

Use `examples.md` when a priority boundary is ambiguous, especially P0 vs P1, P1 vs P2, security edge cases, or agent-surface risk classification.

## Guardrails

- Do not classify without impact evidence.
- Do not use P0 for personal urgency.
- Do not expand scope while triaging. Classify the current issue first.
- For agent-surface changes, include security and prompt-injection risk in the impact section.
