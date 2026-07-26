# Evidence-Led Sequential Thinking Patterns

These patterns use kit-native cases and public checkpoints. They are examples of concise reasoning state, not transcripts of private deliberation.

## Linear Evidence Chain

Use when each check depends on the previous result.

~~~text
Thought 1/5: A packaged skill is missing; completion means it appears in the dry-run.
Thought 2/5 [HYPOTHESIS]: The canonical directory is absent.
Thought 3/5 [VERIFICATION]: The directory exists and contains all required files; reject the hypothesis.
Thought 4/5 [HYPOTHESIS]: The package files list omits the surface directory.
Thought 5/5 [FINAL]: The omission is confirmed; patch the list and rerun validation plus the dry-run.
~~~

## Hypothesis And Verification Loop

Use when several causes could explain one symptom.

~~~text
Thought 1/6: The validator reports a mirror mismatch.
Thought 2/6 [HYPOTHESIS]: Distribution skipped the Codex surface.
Thought 3/6 [VERIFICATION]: Codex is current; the Grok copy differs.
Thought 4/6 [REVISION of Thought 2]: The fault is one stale Grok file; no other surface is affected.
Thought 5/6 [VERIFICATION]: Synchronize that file in a sandbox; mirror parity and the full validator pass.
Thought 6/6 [FINAL]: Keep the scoped synchronization and review the diff.
~~~

A verification result can refute the current hypothesis. That is progress.

## Branch And Convergence

Use when alternatives materially change ownership or failure modes.

~~~text
Thought 1/7: Decide where skill registration should live.
Thought 2/7 [BRANCH manifest-driven from Thought 1]: One central manifest derives every surface; lower drift, stronger tooling dependency.
Thought 3/7 [BRANCH surface-local from Thought 1]: Each agent owns a registry; easier local edits, high parity risk.
Thought 4/7 [VERIFICATION]: Current installer already reads the central manifest.
Thought 5/7 [CONVERGENCE]: Manifest-driven registration fits existing architecture and removes duplicate truth.
Thought 6/7 [VERIFICATION]: A fixture added once appears on all declared surfaces.
Thought 7/7 [FINAL]: Keep the manifest-driven design and document the derivation.
~~~

Branches must converge before FINAL.

## Revision Cascade

Use when new evidence invalidates a foundation.

~~~text
Thought 1/6: Assume the release failure comes from a missing mirror.
Thought 2/6: Plan to copy the canonical directory to every surface.
Thought 3/6 [VERIFICATION]: Mirrors already match; the package dry-run excludes an entire parent path.
Thought 4/6 [REVISION of Thought 1]: The packaging rule is wrong. Thought 2 is discarded.
Thought 5/6 [VERIFICATION]: Repair only the package rule; mirror parity remains green and the file appears.
Thought 6/6 [FINAL]: Keep the packaging repair; no mirror rewrite is needed.
~~~

State which downstream checkpoints survive a revision.

## Adaptive Depth

Use when the initial estimate changes after evidence.

~~~text
Thought 1/4: Inspect an installer scope bug.
Thought 2/6 [VERIFICATION]: The same path resolver serves install, repair, and doctor; expand to cover three callers.
Thought 3/6: Define containment and non-empty-path invariants once.
Thought 4/5 [VERIFICATION]: All callers use the shared guard, so a separate doctor patch is unnecessary; contract the total.
Thought 5/5 [FINAL]: Validate the shared guard with empty, root, traversal, and valid project fixtures.
~~~

Totals may expand or contract but never below the current checkpoint number.

## Meta Calibration

Use when checkpoints repeat without reducing uncertainty.

~~~text
Thought 4/7 [META]: Two speculative fixes produced no new evidence. Pause edits and inspect the failing fixture plus call graph.
Thought 5/7 [VERIFICATION]: The fixture bypasses the helper both fixes targeted.
Thought 6/7 [REVISION of Thought 2]: Move the guard to the actual entry point and discard both speculative patches.
Thought 7/7 [FINAL]: Targeted and full validation pass with one smaller change.
~~~

META changes the investigation method; it is not a decorative status.

## Completion Checklist

Before FINAL, confirm:

- the original completion criterion is met;
- every hypothesis is confirmed or rejected by observed evidence;
- every branch has converged;
- revision fallout is reassessed;
- critical uncertainty has an owner or resolution method;
- the next action and validation are concrete.
