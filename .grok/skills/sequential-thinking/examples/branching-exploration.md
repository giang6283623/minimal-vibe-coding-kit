# Branching Exploration Example

## Case: Maintain Imported Syntax Documentation

The kit needs complete Mermaid syntax coverage without pretending upstream documentation is kit-authored.

~~~text
Thought 1/7: Choose how to maintain syntax references.
Thought 2/7 [BRANCH rewrite-all from Thought 1]: Rewrite every page locally; strongest voice consistency, highest drift and maintenance cost.
Thought 3/7 [BRANCH snapshot-plus-overlay from Thought 1]: Keep pinned upstream snapshots and add kit-authored workflow, style, safety, and examples.
Thought 4/7 [VERIFICATION]: Most imported pages are verbatim Mermaid documentation, while the kit behavior lives in a small overlay.
Thought 5/7 [CONVERGENCE]: Use snapshot-plus-overlay with a third-party notice and pinned source links.
Thought 6/7 [VERIFICATION]: Operational links resolve locally, upstream ownership is explicit, and the package includes the notice.
Thought 7/7 [FINAL]: Keep the hybrid structure and validate provenance plus link integrity.
~~~

## Comparison

| Option | Strength | Cost |
| --- | --- | --- |
| rewrite-all | unified wording | likely syntax drift and large maintenance burden |
| snapshot-plus-overlay | faithful syntax plus clear kit behavior | requires provenance and link boundaries |

CONVERGENCE closes both branches with repository evidence rather than preference alone.
