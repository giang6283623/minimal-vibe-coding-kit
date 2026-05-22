---
name: sequential-thinking
description: Step-by-step reasoning for complex coding tasks. Use to break broad requirements into ordered implementation steps, revise assumptions, branch alternatives, and decide the next safe edit.
argument-hint: "<thought or task> [thoughtNumber] [totalThoughts] [nextThoughtNeeded]"
user-invocable: true
effort: high
---

# Sequential Thinking

Use Sequential Thinking when the path is not obvious and the work needs explicit progression.

## Best Use

Use this skill for:

- multi-file implementation planning;
- debugging with uncertain root cause;
- refactors with several dependency paths;
- requirement decomposition into small tasks;
- comparing branches such as "minimal fix" vs "larger redesign";
- revising an earlier plan after tests or code reading change the facts.

## Inputs

Accept natural language, positional values, or key-value style:

```text
Break this feature into safe implementation steps
"Inspect installer behavior" 1 5 true
thought="Revise the test plan" thoughtNumber=3 isRevision=true revisesThought=1
```

Supported fields:

- `thought`
- `thoughtNumber`
- `totalThoughts`
- `nextThoughtNeeded`
- `isRevision`
- `revisesThought`
- `branchFromThought`
- `branchId`
- `needsMoreThoughts`

## Workflow

1. State the current step and what evidence it depends on.
2. Keep each step small enough to implement or validate independently.
3. Use revisions when new evidence invalidates an earlier assumption.
4. Use branches only when alternatives materially change implementation.
5. End with the next concrete edit, validation command, or question.

## Coding Output

For repository work, produce:

```markdown
## Sequential Plan

Step: <n>/<total>
Current focus: <specific focus>
Evidence:
- <observed facts>
Task split:
1. <small task>
2. <small task>
Validation:
- <command or check>
Continue: <yes/no and why>
```

If the user explicitly asks for JSON, use:

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 99
  }
}
```

## References And Examples

Load these only when the current task needs the extra detail:

- `references/parameters.md`: full parameter meanings and validation rules.
- `references/output-schema.md`: JSON fields, optional fields, and error shape.
- `references/patterns.md`: linear, revision, branching, and adaptive-depth patterns.
- `examples/linear-reasoning.md`: simple ordered reasoning example.
- `examples/revision-pattern.md`: example of correcting an earlier assumption.
- `examples/branching-exploration.md`: example of comparing alternatives.
- `examples/adaptive-depth.md`: example of expanding scope when complexity grows.

## Guardrails

- Do not skip from broad requirements straight to code.
- Do not bury uncertainty. Mark unknowns and decide how to resolve them.
- Do not create long visible chains of thought. Summarize the useful reasoning state.
- Stop when the plan is actionable and validation is clear.
