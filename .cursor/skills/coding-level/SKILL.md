---
name: coding-level
description: Set the coding-explanation register. /coding-level N (0=ELI5, 1=Junior, 2=Mid, 3=Senior, 4=Tech Lead, 5=God); active until reinvoked. A project default may be recorded in backbone.yml conventions.custom_rules.
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
3. Ask once: "Save level N as the project default?" If yes, add or update the `Default coding level: N` entry in `backbone.yml` `conventions.custom_rules` (show the diff and wait for approval, per kit rules).

## Project default

- First-time init records a default as a `backbone.yml` `conventions.custom_rules` entry: `Default coding level: N (<Register>)`.
- Sessions without an explicit `/coding-level` start from that default level.
- `/coding-level N` overrides the default for the current session only, unless the user saves it in step 3.

## Scope

- Tone and explanation depth only — keep following project coding rules.
- Reply in the user's language, not the persona file's.
