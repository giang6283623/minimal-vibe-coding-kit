# Advanced Sequential Thinking Techniques

Maintained by Minimal Vibe Coding Kit. These techniques extend the public-checkpoint contract with kit-native cases. They do not expose private chain-of-thought.

## Spiral Refinement

Revisit one artifact as evidence becomes more precise.

~~~text
Thought 1/6: The package dry-run omits one skill.
Thought 2/6 [VERIFICATION]: The canonical and mirror directories all exist.
Thought 3/7: Refine the scope to package inclusion and manifest derivation.
Thought 4/7 [VERIFICATION]: The manifest is correct; one package path is missing.
Thought 5/6: Contract the plan because mirror edits are unnecessary.
Thought 6/6 [FINAL]: Patch the package path and rerun validation plus the dry-run.
~~~

Each return narrows the problem; it does not restart the investigation.

## Multi-Branch Convergence

Explore distinct designs, then close them with evidence.

~~~text
Thought 2/7 [BRANCH strict-local from Thought 1]: Reject every unresolved documentation link.
Thought 3/7 [BRANCH snapshot-aware from Thought 1]: Preserve upstream links and record their origin.
Thought 4/7 [VERIFICATION]: Operational skill links must resolve locally; snapshot links legitimately point upstream.
Thought 5/7 [CONVERGENCE]: Validate local operational links and convert snapshot-only paths to pinned official URLs.
Thought 6/7 [VERIFICATION]: The link audit reports zero unresolved relative targets.
Thought 7/7 [FINAL]: Keep the hybrid rule and its regression check.
~~~

A branch without CONVERGENCE is unfinished.

## Uncertainty Management

Turn an unknown into a bounded decision.

~~~text
Thought 2/5: Browser rendering availability is unknown.
Thought 3/5 [BRANCH renderer-present from Thought 2]: Capture screenshots and inspect computed colors.
Thought 4/5 [BRANCH renderer-absent from Thought 2]: Parse locally, record the visual limitation, and avoid claiming visual verification.
Thought 5/5 [CONVERGENCE]: Use the first available trusted method; never invent a screenshot result.
~~~

Prefer a result robust to both scenarios. Otherwise identify the smallest fact or permission that resolves the branch.

## Revision Cascade Management

Reassess every conclusion that depended on a corrected fact.

~~~text
Thought 1/6: Assume white text is accessible on the strong red token.
Thought 2/6: Reuse that pairing in the debug heat map.
Thought 3/6 [VERIFICATION]: The measured contrast is 3.28:1, below the 4.5:1 target.
Thought 4/6 [REVISION of Thought 1]: Use ink text on strong red; discard the inherited white-text rule.
Thought 5/6 [VERIFICATION]: Ink on red measures 5.75:1 and the rendered label remains legible.
Thought 6/6 [FINAL]: Keep the accessible pairing and add a contrast assertion.
~~~

The revision names the old claim, the new evidence, and the affected downstream work.

## Meta-Thinking Calibration

Pause speculation when the method stops producing evidence.

~~~text
Thought 4/7 [META]: Rewording the preset cannot prove the stale gallery is fixed. Switch from prose review to a pinned render.
Thought 5/7 [VERIFICATION]: The timeline still shows auto-derived accent colors in the gallery.
Thought 6/7 [REVISION of Thought 3]: Update the executable example, not only the reference recipe.
Thought 7/7 [FINAL]: Screenshot and computed-style checks confirm the gallery now matches the preset.
~~~

META should change the next action, not merely announce difficulty.

## Parallel Constraint Satisfaction

Analyze independent constraints, then intersect the feasible set.

~~~text
Thought 1/7: A preview must satisfy security, reproducibility, and visual fidelity.
Thought 2/7 [BRANCH security from Thought 1]: Pinned official assets and strict rendering only.
Thought 3/7 [BRANCH reproducibility from Thought 1]: Versioned runtime and deterministic example data.
Thought 4/7 [BRANCH fidelity from Thought 1]: Screenshot plus color and contrast assertions.
Thought 5/7 [CONVERGENCE]: A pinned sandbox gallery with no callbacks satisfies all three.
Thought 6/7 [VERIFICATION]: Syntax, security probe, render, and visual checks pass.
Thought 7/7 [FINAL]: Keep the gallery and document its exact test boundary.
~~~

If no option satisfies every hard constraint, name the constraint requiring user direction.

## Adjustment Rules

- Expand the estimated total when new dependencies, affected callers, or verification steps appear.
- Contract only after evidence removes work, and never below the current checkpoint number.
- Keep no more than three branches open.
- Use META after repeated revisions or speculative edits fail to reduce uncertainty.
- Use FINAL only after hypotheses are resolved, branches converge, and validation is explicit.
