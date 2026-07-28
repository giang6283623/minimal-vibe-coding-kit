# Linear Reasoning Example

## Case: Repair A Broken Skill Reference

The validator should reject an operational link that points to a missing local file.

~~~text
Thought 1/5: Completion means every link from SKILL.md resolves inside the packaged skill.
Thought 2/5 [HYPOTHESIS]: A renamed reference left one stale target.
Thought 3/5 [VERIFICATION]: The link audit reports references/old-output.md; the file does not exist.
Thought 4/5: Update the target to references/output-schema.md and add the link audit to validation.
Thought 5/5 [FINAL]: The targeted audit and full kit validation pass; the package dry-run includes the referenced file.
~~~

## Public Summary

~~~markdown
## Reasoning Summary

Current focus: Restore skill-reference integrity.
Evidence:
- references/old-output.md is missing.
- references/output-schema.md is packaged.
Decision: Point the skill at the existing output contract and retain a regression check.
Next action: Review the one-link diff.
Validation: Run the kit validator and package dry-run.
~~~

This is linear because each result determines the next check; no material alternative needs a branch.
