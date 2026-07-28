# Sequential Thinking Output Contract

Return public reasoning summaries, never private chain-of-thought. Markdown is the default; JSON is opt-in.

## Markdown Shape

~~~markdown
## Reasoning Summary

Current focus: <decision>
Marker: <marker or none>
Evidence:
- <observed fact>
Uncertainty:
- <unknown and resolution method>
Decision: <conclusion>
Next action: <concrete action>
Validation: <command or check>
~~~

Omit empty sections instead of filling them with invented content.

## JSON Shape

Use this shape only when the user asks for JSON:

~~~json
{
  "thoughtNumber": 3,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "marker": "VERIFICATION",
  "summary": "All declared skill mirrors have identical content hashes.",
  "evidence": [
    "Canonical and four surface hashes match."
  ],
  "uncertainties": [
    "Package inclusion has not been checked yet."
  ],
  "branches": [],
  "nextAction": "Run the package dry-run and inspect the file list."
}
~~~

Allowed marker values are:

~~~json
[
  null,
  "REVISION",
  "BRANCH",
  "HYPOTHESIS",
  "VERIFICATION",
  "CONVERGENCE",
  "META",
  "FINAL"
]
~~~

## Field Rules

| Field | Type | Rule |
| --- | --- | --- |
| thoughtNumber | integer | positive and no greater than totalThoughts |
| totalThoughts | integer | positive estimate; may expand or contract |
| nextThoughtNeeded | boolean | false only at a genuine stop |
| marker | string or null | one value from the allowlist |
| summary | string | concise public conclusion, not hidden reasoning |
| evidence | string array | observed facts only |
| uncertainties | string array | owned unknowns and resolution methods |
| branches | string array | currently open branch IDs |
| nextAction | string | edit, check, or question |

## Revision Example

~~~json
{
  "thoughtNumber": 4,
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "marker": "REVISION",
  "summary": "The package manifest, not mirror drift, explains the missing skill.",
  "evidence": [
    "Mirror hashes match.",
    "The package files list omits the skill directory."
  ],
  "uncertainties": [],
  "branches": [],
  "nextAction": "Patch the package list and rerun the dry-run."
}
~~~

## Final Example

~~~json
{
  "thoughtNumber": 5,
  "totalThoughts": 5,
  "nextThoughtNeeded": false,
  "marker": "FINAL",
  "summary": "The manifest repair is validated and ready for review.",
  "evidence": [
    "Targeted package assertion passes.",
    "Full kit validation passes with zero failures."
  ],
  "uncertainties": [],
  "branches": [],
  "nextAction": "Review the diff."
}
~~~

## Invalid Output

Reject or repair output that:

- contains private-thought fields or invented pseudo-session metadata;
- claims persistent state or automatic runtime processing;
- uses an undeclared marker;
- calls a hypothesis verified without observed evidence;
- includes secrets, personal data, or raw sensitive logs;
- leaves open branches when marker is FINAL;
- places thoughtNumber above totalThoughts.

The skill should explain malformed user-supplied hints in plain language rather than inventing a processor error object.
