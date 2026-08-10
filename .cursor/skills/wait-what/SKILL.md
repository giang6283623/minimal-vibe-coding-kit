---
name: wait-what
description: The last message did not land - stop and re-pitch it in plain language, in the user's language, until it lands.
argument-hint: "optional: the part that lost you"
disable-model-invocation: true
---

# Wait What

The user is saying: comprehension failed. This is a repair of the listener's state, not a request for shorter text and not a request for new work. Re-pitch the previous message immediately. Text after the invocation names the part that lost the user; no text means re-pitch the whole previous message.

Rules for the re-pitch:

- Diagnose first, silently: what failed is usually one of a missing premise, an undefined term, a skipped step, the wrong altitude (too abstract or too deep in detail), or a buried outcome. Repair that specific failure. An agent that hears "be brief" writes telegrams; an agent that hears "you lost me" backs up and explains.
- Reply in the user's conversation language (English, Vietnamese, Chinese, or any other). Never switch to English to explain, and never mix registers mid-reply.
- Plain-language register in every language: lead with the outcome, short sentences, one idea per sentence, active voice, concrete verbs, known information before new information, and define each necessary term at first use. Only when the reply language is English, also hold ASD-STE100-style simplicity: one meaning per word, no synonym rotation. The target is shorter and clearer, never shorter and blunter.
- Use the project's own vocabulary: the glossary file named in `backbone.yml` `project.context` when present (in this kit: `.vibekit/docs/CONTEXT.md`). Without a glossary, use the exact names from `backbone.yml` and the code, and offer in one line to scaffold `CONTEXT.md` from `.vibekit/docs/templates/CONTEXT_TEMPLATE.md`. Never invent or localize project terms that the glossary does not define.
- Quote code identifiers, commands, file paths, and error text verbatim in every language; never translate, paraphrase, or rename them.
- Zero new work: same facts, same decisions, same state as the original message. No tool calls, no edits, no new conclusions. If re-explaining exposes an error in the original message, say so in one line and stop; the fix is a new task the user must ask for.
- The register applies to this re-pitch, not to the rest of the session; standing style comes from the project's writing rules.
- End with one short line naming the part most likely still unclear, so the user can aim the next "wait" precisely.

Done when: the re-pitch restores the missing premise in the user's language, is shorter and clearer than the original, and every project term comes from the glossary or the code, not invention.
