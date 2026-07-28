# Sequential Thinking Invocation Reference

This skill accepts natural language. The fields below are optional presentation hints, not parameters to a stateful service.

## Minimal Invocation

~~~text
/sequential-thinking Trace why a packaged skill is missing.
~~~

The task text is the only required input.

## Optional Hints

| Hint | Meaning | Constraint |
| --- | --- | --- |
| mode | implicit or explicit | implicit is the default; explicit requires a user request |
| format | markdown or json | markdown is the default |
| thoughtNumber | current public checkpoint | positive integer; explicit mode only |
| totalThoughts | current estimate | at least thoughtNumber |
| nextThoughtNeeded | whether another checkpoint is useful | true or false |
| isRevision | marks a correction | pair with revisesThought |
| revisesThought | earlier checkpoint being corrected | lower than thoughtNumber |
| branchFromThought | checkpoint where an alternative begins | lower than thoughtNumber |
| branchId | short branch identifier | pair with branchFromThought |
| needsMoreThoughts | signals that the estimate must expand | true or false |

Hints may be written as key-value text:

~~~text
/sequential-thinking Compare registry designs mode=explicit thoughtNumber=1 totalThoughts=5
~~~

Legacy positional hints may be interpreted when unambiguous, but the skill must not claim they are parsed or persisted by a runtime.

## Marker Allowlist

| Marker | Purpose | Required public content |
| --- | --- | --- |
| none | normal checkpoint | claim or decision plus evidence |
| REVISION of Thought N | correct an earlier checkpoint | old claim, new evidence, downstream impact |
| BRANCH id from Thought N | explore a material alternative | option, constraint, trade-off |
| HYPOTHESIS | state a falsifiable explanation | expected observation and test |
| VERIFICATION | report a real check | command or inspection plus observed result |
| CONVERGENCE | close open branches | comparison and chosen direction |
| META | recalibrate the method | stalled pattern and missing evidence |
| FINAL | close the sequence | verified conclusion and next action |

Bracketed markers outside this table are invalid.

## Numbering Rules

- Number emitted public checkpoints in one increasing sequence.
- A branch receives a unique checkpoint number even when it shares a source.
- Expand totalThoughts when evidence reveals more work.
- Contract totalThoughts only to a value at or above thoughtNumber.
- A revision can name one earlier checkpoint in its marker and list other affected checkpoints in its impact summary.
- nextThoughtNeeded=false is valid only for FINAL or for an explicit stop caused by missing authority or evidence.

## Branch Rules

Use branchFromThought and branchId together. Keep at most three branches open. A sequence with branches must include CONVERGENCE before FINAL.

Good branch IDs describe the decision:

~~~text
branchId=manifest-driven
branchId=surface-local
branchId=sandbox-render
~~~

## Revision Rules

A revision must be evidence-led:

~~~text
Thought 4/6 [REVISION of Thought 1]
Previous claim: The mirror is stale.
New evidence: All five hashes match.
Impact: Discard Thought 2; retain the package-file inspection from Thought 3.
~~~

Do not label a preference change as a revision unless new evidence changed the conclusion.

## Debugging Rules

HYPOTHESIS and VERIFICATION form a loop:

1. State a cause that could be disproved.
2. Name the smallest safe check.
3. Report the observed result.
4. Confirm, revise, or reject the hypothesis.
5. Verify the fix with both a targeted check and the relevant project validation.

Never write “verified” for an unexecuted command.

## State And Privacy

- No automatic history, deduplication, counters, or cross-session persistence is promised.
- Do not emit private deliberation, full internal thought text, secrets, or raw sensitive logs.
- Summaries should be short enough for the user to audit without reconstructing hidden reasoning.
