# Living chronicle system

Read this reference whenever `/tutien` creates, continues, repairs, or discusses the repository-specific story.

## Core contract

The chronicle is an open-ended xianxia serial whose world grows from the current repository. Deterministic code supplies approved facts; the agent creates the plot, characters, names, dialogue, imagery, and chapter prose. Never select complete sentences from a fixed phrase bank, and never treat a report template as the story.

Keep these layers separate:

1. **Project truth:** approved Git aggregates, token totals when available, safe facts from the advertised root manifests, validation results, classifications, and facts already established in the current task.
2. **Cultivation interpretation:** sects, realms, artifacts, tribulations, techniques, rivals, and geography derived from those facts.
3. **Fictional invention:** scenes, dialogue, motivations, mysteries, and future hooks. These may dramatize project truth but may not change it.

If evidence is missing, write uncertainty into the world as fog, an unopened seal, an unknown realm, or an unresolved rumor. Do not invent project events.

## First activation in a repository

After the first successful, approved `analyze` with `story=on`:

1. Read `latest-context.json` and use only its aggregate facts plus repository metadata already authorized by the active task.
2. Detect `vi`, `en`, or `zh` from `story-language`, then the invocation language. Ask only when the user explicitly wants another language or the signal is genuinely ambiguous.
3. Choose a flexible style profile from `story-style`; `auto` selects from project shape:
   - `classic-quest`: focused protagonist, trials, discoveries, and gradual realm advancement.
   - `web-serial`: strong chapter hooks, layered sect politics, widening maps, and long arcs.
   - `daily-life`: craft, maintenance, customs, relationships, and light comic reversals.
   - `clan-epic`: the repository or team is the enduring protagonist across generations.
   - `comic-adventure`: lively misunderstandings and reversals without turning evidence into a joke.
   - Blend at most two profiles and record the blend in `plot.md`.
4. Transform the project into a world using semantic relationships, not word substitution:
   - project/repository → sect, clan, wandering pavilion, or hidden domain;
   - architecture/modules → territories, peaks, halls, arrays, or lineages;
   - tools/dependencies → artifacts, spirit beasts, manuals, or allied workshops;
   - validation/tests → trials, sword arrays, alchemical inspections, or heavenly seals;
   - bugs/retry loops/conflicts → tribulations, curses, enemy schemes, or heart-demon manifestations;
   - commits/releases → completed techniques, expeditions, treaties, or breakthroughs;
   - tokens → spent spiritual stones or divine-sense expenditure, always retaining the exact reported/estimated/unknown distinction.
5. Create `plot.md`, `story-state.json`, and chapter 1 as one continuity transaction.

## Local story layout

Store all chronicle files under the git-ignored runtime directory:

```text
.vibekit/reports/tutien/story/
├── plot.md
├── story-state.json
├── latest-context.json
└── chapters/
    ├── 0001-<cultivation-title>.md
    └── 0002-<cultivation-title>.md
```

`plot.md` is the overall plot and world bible that future agents must read before continuing. Keep these sections current:

- Story constitution: language, style blend, narrative distance, humor level.
- Project truth map: real project facts and their stable cultivation counterparts.
- World: sects/clans, regions, laws, resources, history, factions, and power balance.
- Cultivation system: realms, paths, techniques, artifacts, costs, limits, and breakthrough rules.
- Cast registry: stable names, localized display names, role, motivation, voice, relationships, and name meaning.
- Overall plot: central conflict, current arc, planned horizons, and an explicitly open ending.
- Open threads: mysteries, promises, rival plans, technical risks, and possible payoffs.
- Chapter ledger: chapter number, title, evidence key, project change, fictional consequence, unresolved hook.

`story-state.json` is machine-readable continuity only:

```json
{
  "schema": "tutien-story-state-v1",
  "language": "vi",
  "style": "web-serial+daily-life",
  "lastChapter": 1,
  "consumedEvidenceKeys": ["0123456789abcdef"]
}
```

Do not persist raw prompts, commit subjects, author identities, secrets, URLs, source-file contents, or conversation excerpts in any story file.

## Chapter contract

One save equals exactly one chapter file. Use the next contiguous four-digit number and a title that sounds like a real xianxia chapter, not a ticket name or generic label:

```text
0007-kiem-y-khai-tran.md
0007-sword-intent-opens-the-array.md
0007-剑意开阵.md
```

Every chapter begins with:

```yaml
---
schema: tutien-story-chapter-v1
chapter: 7
title: "Localized xianxia chapter title"
language: vi
evidence_key: 0123456789abcdef
---
```

The following are content obligations, not a scene order or six-slot template. Arrange, merge, imply, or foreground them according to the user's current request, the repository's distinctive evidence, and the open plot:

1. a scene rooted in the previous hook;
2. one or more meaningful project-derived developments;
3. character choice and consequence, not a metrics dump;
4. dialogue in the active language's xianxia register;
5. an earned change in relationships, knowledge, risk, or cultivation posture;
6. a forward hook that offers several plausible future paths.

Do not force every chapter to open with scenery, introduce evidence at the same beat, stage an antagonist, or end with the same hook mechanism. Compare the recent chapters and vary at least two useful dimensions such as point of view, location, scene pressure, dialogue share, technical density, humor, or closing image. Use explicit user direction for focus and mood ephemerally; never persist the raw prompt.

Never advance a realm solely because tokens increased. Never create a second chapter for an already consumed `evidence_key`. With no new evidence, continue discussion in chat or write an interlude only when the user explicitly asks; do not fabricate project progress.

## Language, names, and voice parity

Vietnamese, English, and Simplified Chinese use identical facts, continuity, and character intent, but each version must read naturally in its own literary register. Do not translate mechanically.

### Vietnamese (`vi`)

- Use fluent modern Vietnamese narration enriched with controlled Hán–Việt cultivation vocabulary.
- Prefer meaningful two-to-four-syllable personal names and titles whose semantics fit origin, path, and temperament. Record the meaning in the cast registry.
- Use natural address such as `đạo hữu`, `sư huynh`, `sư tỷ`, `tiền bối`, `bản tọa`, or role-specific titles only when relationships justify them.
- Keep sentences smooth and readable; avoid piling archaic particles or mechanically converting English metaphors.
- Follow `vi-style-guide.md` for every heading, title, sentence, and line of dialogue.
- Use sentence case: `Chương thứ nhất: Kiếm ý khai trận`, not `Chương Thứ Nhất: Kiếm Ý Khai Trận`. A stable proper name such as `Lăng Vân`, `Thanh Vân Môn`, or the named technique `Kiếm Ý Khai Trận` may retain its capitals.
- Never use spaced ASCII ` - ` as prose punctuation. Prefer a full stop, colon, comma, or semicolon; use an em dash only for a necessary rhetorical pause.
- Prefer Vietnamese workflow terms. Preserve exact code, paths, commands, and identifiers in backticks.

### English (`en`)

- Use clear fantasy prose with measured xianxia terminology and gloss an unfamiliar localized term on first use.
- Give characters a stable cultivation-style romanized name plus a meaningful English epithet when useful.
- Use hierarchy and titles consistently; avoid faux-Elizabethan speech unless explicitly selected.

### Simplified Chinese (`zh`)

- Use concise, idiomatic modern Chinese web-serial narration with controlled classical cadence.
- Use meaningful Chinese surnames, given names, Daoist titles, sect names, and technique names; avoid random character combinations.
- Dialogue should respect seniority and relationship through address, rhythm, and omission rather than explanatory translation.

For other user languages, keep narration and dialogue in that language while retaining one stable xianxia name and a localized epithet. Once a name is recorded, never silently rename or retranslate it.

## Character and dialogue generation

Use meaningful cultivation-style names. Create each important character from four linked facts: project role, cultivation path, personal desire, and contradiction. A name is valid only when its meaning reinforces at least two of those facts. Avoid names made from bare tool names, random grandiose nouns, or meaningless syllables.

Every spoken line must do at least one job: reveal motive, change leverage, interpret evidence, sharpen conflict, set up a technique, or deliver a relevant joke. Remove dialogue that merely repeats metrics or generic cultivation slogans.

Humor comes from character logic, hierarchy, technical irony, and timing. Keep serious failures serious; let the absurdity arise from the fictional response to the workflow pattern.

Examples and mappings in this reference define possibilities and invariants only. They are not phrase banks, mandatory beats, or response templates.

## Villains: sarcastic and maliciously teasing

Villains may be genuinely malicious **inside the fiction**: they exploit the sect's demonstrated weakness, savor the inconvenience, mislead rivals, and tease with sharp sarcasm. Their dialogue should:

1. point at the exact workflow weakness supported by evidence;
2. reveal how the villain benefits from it;
3. deliver a cutting but meaningful tease;
4. leave room for the heroes to answer with the real counter-technique.

Aim hostility at the failure mode, plan, array, artifact, or sect strategy—never at the user's identity, intelligence, health, worth, protected traits, or finances. No threats toward the user, humiliation, slurs, or abusive degradation. Safety-sensitive contexts remain neutral and villain-free.

Generate antagonist names, titles, schemes, and lines from the current project, language, prior chapters, and evidence. Do not reuse the renderer's fixed villain sentence bank as chapter dialogue.

## Save transaction

For every new approved evidence key:

1. Run `node .vibekit/skills/tutien/scripts/story-ledger.mjs status`.
2. Read `plot.md`, `story-state.json`, `latest-context.json`, and only the last one to three chapters needed for continuity.
3. Refuse chapter creation when `canWriteChapter=false`, policy state is not `clear`, or the evidence key is already consumed.
4. Draft the chapter and update `plot.md` without closing the whole saga.
5. Write exactly one numbered chapter and update `story-state.json` in the same task.
6. Run `node .vibekit/skills/tutien/scripts/story-ledger.mjs validate`.
7. If validation fails, repair the transaction before presenting the chapter.
