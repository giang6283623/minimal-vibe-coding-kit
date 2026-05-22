---
name: clearthought
description: Structured reasoning for complex coding work. Use when requirements are ambiguous, a design/debugging decision has multiple valid paths, or a large request needs to be split into safe implementable tasks.
argument-hint: "[operation] <problem>"
user-invocable: true
effort: high
---

# ClearThought

Use ClearThought to turn complex or ambiguous coding work into an evidence-based implementation plan.

## Best Use

Use this skill when:

- requirements are broad, conflicting, or under-specified;
- a bug needs root-cause analysis before editing;
- an architecture or refactor decision has tradeoffs;
- a task needs to be split into small pull-request sized steps;
- the user asks for deliberate reasoning, ClearThought, or a structured decision.

## Operations

Choose the narrowest operation that fits:

- `sequential_thinking`: decompose a complex request into ordered work.
- `debugging_approach`: isolate a broken behavior with hypotheses and checks.
- `decision_framework`: compare implementation options and choose one.
- `systems_thinking`: map components, contracts, and side effects.
- `scientific_method`: define hypothesis, metric, baseline, experiment, and result.
- `risk_review`: identify safety, security, data, and rollback risks.
- `implementation_plan`: produce an edit plan, validation plan, and review checklist.

If the operation is omitted, infer it from the request. Default to `sequential_thinking`.

## Workflow

1. Read `AGENTS.md` and `backbone.yml` before repo edits.
2. Separate observed facts, assumptions, unknowns, and decisions.
3. Pick one operation and keep the reasoning focused on the next useful action.
4. Split the work into safe tasks with file or module ownership where possible.
5. Define validation commands and risk checks before editing.
6. Revisit the plan when new evidence invalidates an assumption.

## Output

For normal coding work, return this concise structure:

```markdown
## ClearThought Brief

Operation: <operation>
Problem: <one sentence>
Observed facts:
- <facts from files, tests, logs, or user request>
Assumptions:
- <explicit assumptions>
Plan:
1. <small implementable step>
2. <small implementable step>
Validation:
- <commands or checks>
Risks:
- <risk and mitigation>
```

For user-invoked JSON mode, return valid JSON:

```json
{
  "toolOperation": "operation_name",
  "problem": "brief problem statement",
  "observedFacts": [],
  "assumptions": [],
  "plan": [],
  "validation": [],
  "risks": [],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

## References And Examples

Load these only when the active task needs more detail:

- `references/parameter-reference.md`: operation parameters and accepted values.
- `references/output-schemas.md`: JSON response shapes for supported operations.
- `examples/sequential-thinking.md`: decomposition and step-by-step planning examples.
- `examples/decision-framework.md`: option comparison and tradeoff examples.
- `examples/metagame-examples.md`: OODA, Ulysses, and high-stakes reasoning examples.

## Safety

- Do not expose long hidden reasoning. Provide concise rationale and actionable conclusions.
- Do not invent facts. Mark weak evidence as an assumption or unknown.
- Do not run package lifecycle scripts, hooks, deploys, migrations, or destructive commands just to think.
- Prefer reversible changes and small diffs when uncertainty is high.
