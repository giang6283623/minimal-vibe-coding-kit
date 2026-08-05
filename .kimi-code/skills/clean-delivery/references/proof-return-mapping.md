# Proof Return mapping

Clean Delivery uses the repository's existing Proofline evidence vocabulary when Proofline is active.

| Clean Delivery evidence | Proofline field |
| --- | --- |
| Story behavior and acceptance criteria | Frozen outcome and acceptance contract |
| Editable paths | Mutation grant |
| Protected verifier assets | Protected oracles |
| Red evidence | Pre-change evidence |
| Proof commands and exit status | Proof Return command evidence |
| Final diff and tree identity | Artifact manifest and tree digest |
| Proof gaps | Unresolved signals or non-final status |

Do not duplicate the Proofline ledger. Add gate labels to the same evidence return. If Proofline is not active, return a concise table with gate, status, command or review evidence, and gap.
