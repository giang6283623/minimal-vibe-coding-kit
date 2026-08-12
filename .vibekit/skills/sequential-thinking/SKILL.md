---
name: sequential-thinking
description: Evidence-led step-by-step reasoning for complex coding tasks. Use to decompose work, revise assumptions, compare alternatives, verify hypotheses, and choose the next safe action without exposing private chain-of-thought.
argument-hint: "<task> [mode=implicit|explicit] [format=markdown|json]"
user-invocable: true
effort: high
---

# Sequential Thinking

Use Sequential Thinking when the path is uncertain and decisions must stay connected to observable evidence. It is a reasoning method, not a stateful runtime or hidden-history service.

## Best Use

Use this skill for:

- multi-file implementation planning;
- debugging with uncertain root cause;
- refactors with several dependency paths;
- requirement decomposition;
- comparing materially different approaches;
- revising a plan after code, tests, or user feedback changes the facts.

## Public Reasoning Contract

- Keep private chain-of-thought private.
- Expose only concise checkpoints: claim or decision, observed evidence, owned uncertainty, and next action.
- Never promise automatic persistence, hidden session memory, counters, schema validation, or branch tracking. The agent maintains only the context available on its current surface.
- Never place secret values, credentials, private user data, or unredacted logs in a checkpoint.

## Application Modes

- **Implicit (default):** apply the workflow internally and return the useful conclusion, evidence, and next action.
- **Explicit:** use public numbered checkpoints only when the user explicitly asks for a visible breakdown. Complexity alone does not authorize more detailed reasoning.
- **JSON:** use only when the user explicitly requests JSON; follow references/output-schema.md.

## Inputs

A natural-language task is sufficient:

~~~text
Trace why the package dry-run omits a registered skill.
Compare a central manifest with per-surface registries.
Plan a safe installer-scope repair.
~~~

Optional hints such as mode, output format, estimated total, revision target, or branch ID shape presentation only. They do not invoke an external processor. See references/parameters.md.

## External-controller precedence

When the same task selects or requests an external controller through
`agent-control-center` or `swap-control-center`, resolve controller ownership
before applying this skill. The active host may use Sequential Thinking only to
freeze the objective, authoritative evidence, unknown user decisions, scope,
authorization, budget, and acceptance criteria.

The host must not split the task into work items or lanes, choose workers, make
architecture decisions, or mark the task final. It sends the frozen reasoning
envelope to the external controller. The controller performs the decomposition,
revision, comparison, and convergence steps, then returns bounded work orders
or `ask-user`. The host may relay that question, dispatch approved work orders,
and return unaltered receipts to the same controller session.

Treat an explicit request to use Sequential Thinking as a reasoning method for
the selected external controller, not as authority for the host to plan first.

## Marker Vocabulary

Explicit mode uses this closed marker set:

~~~text
Thought 2/5: <public checkpoint>
Thought 4/6 [REVISION of Thought 1]: <corrected claim, evidence, impact>
Thought 5/7 [BRANCH manifest from Thought 2]: <alternative and trade-off>
Thought 6/8 [HYPOTHESIS]: <testable explanation>
Thought 7/8 [VERIFICATION]: <command or inspection and observed result>
Thought 8/9 [CONVERGENCE]: <comparison result and chosen direction>
Thought 8/9 [META]: <why progress stalled and what evidence is needed>
Thought 9/9 [FINAL]: <verified conclusion and next action>
~~~

No other bracketed reasoning marker is valid.

## Numbering And Dynamic Depth

- Public checkpoint numbers increase monotonically; never reuse a number for parallel branches.
- The total is an estimate, not a promise.
- Expand when new dependencies or verification work appear.
- Contract when evidence removes work, but never below the current checkpoint number.
- When revising a foundation, explicitly reassess every later checkpoint that depended on it.
- Limit open branches to two or three, then converge before opening another.

## Workflow

Apply the external-controller precedence rule above before step 1.

1. Frame the decision and its completion criteria.
2. Gather the smallest relevant evidence before proposing a change.
3. Split work into independently verifiable checkpoints.
4. Mark unknowns and assign each a resolution method.
5. Use branches only when alternatives change the implementation materially.
6. For debugging, alternate HYPOTHESIS and VERIFICATION until observed output confirms or refutes the cause.
7. After a revision, identify downstream conclusions that remain valid, need adjustment, or must be discarded.
8. Mark FINAL only when completion criteria are met, critical uncertainty is owned, and the next action is concrete.

## Debugging Loop

~~~text
[HYPOTHESIS] A mirror is stale because the canonical file was not distributed.
[VERIFICATION] Compare hashes across all declared surfaces.
[REVISION] Hashes match; the missing manifest entry is the actual cause.
[VERIFICATION] Add the entry in a sandbox and rerun validation.
[FINAL] Keep the change only when the targeted check and full validation pass.
~~~

A failed verification is useful evidence. Revise the hypothesis; do not reinterpret the result to preserve it.

## Default Coding Output

~~~markdown
## Reasoning Summary

Current focus: <specific decision>
Evidence:
- <observed fact>
- <observed fact>
Uncertainty:
- <unknown and how it will be resolved>
Decision: <current conclusion>
Next action: <edit, command, or question>
Validation: <command or check>
~~~

## References And Examples

Load only what the task needs:

- references/parameters.md: invocation hints and marker semantics.
- references/output-schema.md: safe public Markdown and JSON shapes.
- references/patterns.md: core evidence-led patterns.
- references/advanced-techniques.md: advanced kit-native cases.
- examples/linear-reasoning.md: ordered package-integrity investigation.
- examples/revision-pattern.md: evidence-driven correction.
- examples/branching-exploration.md: registry-design convergence.
- examples/adaptive-depth.md: installer-scope expansion and contraction.

## Guardrails

- Do not jump from a broad request straight to code.
- Do not expose private chain-of-thought or manufacture hidden reasoning history.
- Do not invent runtime behavior, persistent state, test output, or verification evidence.
- Do not conclude with an unverified hypothesis or an unconverged branch.
- Do not use more checkpoints than the decision needs.
- Stop when the result is actionable and validation is clear.
