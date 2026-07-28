# Proportional effort rules

- Match process weight to task size; review must never cost more than the change itself.
- Triage each request in one line before working:
  - trivial: typo, comment, one-liner, no agent-surface impact. Edit, validate, report. No plan, no subagents, no review loops.
  - small: one file or one skill document. Two-line plan, edit, validate.
  - medium: several files or shared behavior. Short plan, edit, validate, one diff self-review.
  - large or risky: installers, validators, security, agent surfaces, destructive paths. Full plan plus the skills and probes the security rules require.
- Never launch parallel-analysis, graph orchestration, multi-agent review, visual loops, or e2e suites for trivial or small tasks unless the user asks.
- Visual and e2e gate: never run `visual-design-loop` or full e2e suites by default. Score 0-2 per question: (1) user-visible surface changed, (2) outcome depends on subjective visual judgment, (3) a visual regression could reach users unnoticed by existing tests.
- Score 0-2: skip and rely on the `backbone.yml` validation command. Score 3-4: one screenshot check, at most one targeted fix, no loop. Score 5-6: propose the run with budget and estimated cost, then wait for explicit user approval.
- Always report the gate in one line, for example: "visual gate 2/6: skipped".
