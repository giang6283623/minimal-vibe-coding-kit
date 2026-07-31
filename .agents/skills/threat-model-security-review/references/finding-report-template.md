# Finding Report Template

Create one record per distinct root cause and vulnerable path.

## Review summary

- Target and revision:
- Mode and scope:
- Authorization boundary:
- Overall coverage:
- Commands run:

## Threat-model summary

- Assets and privileges:
- Attacker position:
- Entry points:
- Trust boundaries:
- Security invariants:
- Important assumptions:

## Coverage

| Surface or path | Status | Evidence reviewed | Reason or follow-up |
|---|---|---|---|

Allowed statuses: `reviewed`, `excluded`, `deferred`, `not-applicable`.

## Candidate ledger

| Candidate ID | Attack path summary | Broken invariant | Validation status | Report destination |
|---|---|---|---|---|

Each candidate ID must have exactly one terminal validation status and one report
destination: `finding`, `rejected candidate`, or `deferred proof gap`. An open,
duplicate, or missing disposition makes the review incomplete.

## Findings

### `<finding-id>`: `<title>`

- Severity: `critical | high | medium | low`
- Confidence: `high | medium | low`
- Validation: `runtime-validated | static-confirmed | plausible-unverified`
- Affected path and symbol:
- Attacker-controlled source:
- Broken control or invariant:
- Dangerous operation or sink:
- Realistic impact:
- Root cause:

Attack path:

```text
attacker -> entry point -> transformations -> failed control -> sink -> impact
```

Evidence:

- Source locations:
- Observed behavior:
- Contradictory evidence checked:
- Validation command or inspection:
- Result:
- Remaining proof gap:

Remediation:

- Smallest root-cause fix:
- Legitimate behavior to preserve:
- Regression validation:
- Nearby bypasses to check:
- Rollback:

## Rejected candidates

| Candidate ID | Candidate | Why rejected | Evidence |
|---|---|---|---|

## Deferred work and proof gaps

| Candidate ID | Gap | Why unresolved | Required authority or evidence | Risk to conclusion |
|---|---|---|---|---|

## Remediation order

Order accepted findings by realistic impact, reachability, confidence, and fix dependency.
Do not batch unrelated fixes into one patch.
