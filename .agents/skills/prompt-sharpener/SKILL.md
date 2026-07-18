---
name: prompt-sharpener
description: Sharpen a rough prompt into a precise one — same intent, sharper not longer — then execute the sharpened version immediately in the same turn.
argument-hint: "the rough prompt to sharpen and execute"
disable-model-invocation: true
---

# Prompt Sharpener

The text the user types after the invocation is the **raw prompt**. Upgrade it into a prompt that is **sharper, not longer** — keep the original intent, constraints, and language — then execute the upgraded version immediately in the same turn. No text after the invocation → ask the user what they want and stop.

## Step 1 — Diagnose the raw prompt

Scan for every ailment below; each ailment found gets its cure applied directly in the upgraded prompt. Cure silently; call out a cure only when it could shift the user's intent.

- Vague verbs or adjectives ("help me", "make it nicer") → concrete, measurable operations and parameters.
- Two tasks in one prompt → split into an explicit execution order.
- No success criteria → add a binary pass/fail `Done when`.
- Emotional description ("everything is broken") → extract the specific technical symptom.
- "The whole app" scope → pin exact files/functions/directories; coding tasks always get a **scope lock** (edit only inside X, leave the rest untouched).
- Relies on memory of an old session → copy the decisions already settled in this conversation (stack, architecture, what was tried and failed) into the `Context` block.
- Invitation to fabricate ("what do experts say about X?") → anchor grounding: state only what can be verified; when unsure, say so explicitly.
- No output format → fix the structure and length; when the format is hard to describe in words, include 2-3 sample examples (including an edge case) in the `Output Contract`.

Done when: the raw prompt has been checked against the full list and no ailment is left without its cure in the upgraded prompt.

## Step 2 — Build the upgraded prompt

Classify the task (coding / research / writing / analysis / planning / review), then assemble blocks in this order — add a block only when it raises precision; small tasks need just 2-3 blocks:

`Objective` → `Context` → `Work Style` → `Tool Rules` → `Output Contract` → `Verification` → `Done Criteria`

Focus per task type:

- Coding: scope lock, smallest correct change, validation after the edit — default to the `validate` command in `backbone.yml` when the repo has one.
- Research: source quality, citations, explicit uncertainty.
- Writing: audience, voice, length.
- Review: group findings by severity, name the failure mode.

Construction rules:

- Write constraints with the strongest signal words: MUST instead of "should", NEVER instead of "avoid".
- Missing information → state the assumption in `Context` and keep going; stop to ask only when the task is destructive or irreversible.
- Say _what_ to verify; let the model regulate its own depth of thought.
- Repo work MUST respect `backbone.yml` conventions and protected paths; when the upgraded task is a large decomposition or a risky decision, its `Work Style` block may direct Step 3 to open with the `sequential-thinking` or `clearthought` skill.
- Closing audit: reread every sentence; if cutting it would not change the output, cut it — every remaining word is **load-bearing**.

Done when the upgraded prompt scores on all 6 points: intent preserved — ambiguity reduced — right depth — clear output — has verification — has a stopping point.

## Step 3 — Present and execute

Print the upgraded prompt in a single code block, with at most 2 sentences on the key changes. Then treat it as the user's official request: start executing immediately in the same turn, researching and editing according to its own `Tool Rules`.

Done when the upgraded prompt's `Done Criteria` are satisfied.
