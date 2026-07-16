---
name: coding-level
description: Set the coding-explanation register. /coding-level N (0=ELI5, 1=Junior, 2=Mid, 3=Senior, 4=Tech Lead, 5=God); active until reinvoked.
disable-model-invocation: true
argument-hint: "[0-5]"
---

## Levels

| N | Register | File |
| --- | --- | --- |
| 0 | ELI5 | `references/level-0.md` |
| 1 | Junior | `references/level-1.md` |
| 2 | Mid-Level | `references/level-2.md` |
| 3 | Senior | `references/level-3.md` |
| 4 | Tech Lead | `references/level-4.md` |
| 5 | God | `references/level-5.md` |

## Steps

1. Read `$ARGUMENTS` as N. If N is not an integer 0–5, reply with the table above and ask for a valid N.
2. Read `references/level-<N>.md`, state once which level is now active, and apply that persona to every reply until `/coding-level` is invoked again.

## Scope

- Tone and explanation depth only — keep following project coding rules.
- Reply in the user's language, not the persona file's.
