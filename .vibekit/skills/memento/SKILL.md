---
name: memento
description: Leave yourself a note before closing a multi-day task, then read it back at the start of the next session — it's the only memory that survives the gap.
argument-hint: "'resume' to read it back, or a hint for what's next when writing it"
disable-model-invocation: true
---

Leonard, in *Memento*, can't hold a new memory for more than a few minutes, so he writes down only what his future self must act on, and never trusts a note loose enough to misread later. A session runs out the same way: once it ends, the goal, the plan, and every trap you hit are gone unless they were on paper first. `MEMENTO.md`, at the repo root, is that paper — read and rewritten every session for as long as the task spans days or weeks.

Same file, two moments: ending a session, or watching context run low, means **Wrap up**. Starting one with nothing said yet, or told to resume, means **Resume**.

## Wrap up

Read `MEMENTO.md` first if it exists — you're merging into a running note, not drafting a fresh one. Write back exactly these headers:

- **Goal** — the task this spans, not just what this session touched.
- **Done** — milestones so far. Append; never drop one an earlier session recorded.
- **Stuck** — the current blocker, stated plainly. None? Say so.
- **Next** — the immediate next step, concrete enough to start cold, including which skill to reach for if one applies. Fold in any hint the user gave about what's next.
- **Traps** — every dead end and why it failed. Append — a trap logged three sessions ago still belongs here. A generic summary always loses this section first, and it's the one that costs the most to relearn.

Every section answers one test: could a reader with none of this conversation, and no way to ask you anything, act correctly from the page alone? That's the bar — not length, not polish.

Reference other artifacts (PRDs, ADRs, issues, diffs) by path instead of restating them, and redact secrets or anything personally identifying before you write. If the repo has a `.gitignore` and `MEMENTO.md` isn't in it, add it — this is a scratchpad, not something to ship in a PR.

If **Goal** is now fully done, delete the file instead of writing a fifth version of "nothing left to do" — a stale memento left behind just confuses whatever this repo works on next.

## Resume

Read `MEMENTO.md` at the repo root. Missing? Say so and ask what to work on instead of inventing a goal to fill the gap.

Found it: treat it as ground truth, but not blind faith — the note that undoes Leonard is the one he stops questioning. If it claims a file exists or a step landed and the repo says otherwise, flag the mismatch before building on top of it. Hand the human two or three lines — the goal, the immediate next step — before spending any work, so they can redirect first. Then pick up **Next**, invoking whatever skill it names, and treat every **Traps** entry as a closed door — don't reopen it.

## Not `handoff`

`handoff` and `claude-handoff` pass work to a *different* agent, right now, in parallel. Memento is one worker leaving a note for their own next session, days later, alone. Reach for this one when you're closing the laptop, not when you're spinning up a second agent.
