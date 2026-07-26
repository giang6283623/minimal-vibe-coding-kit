# Coding-Level Chart Adaptation

Maintained by Minimal Vibe Coding Kit. The kit's `/coding-level` skill sets an explanation register from 0 (ELI5) to 5 (God). Diagrams must match that register the same way prose does: a beginner needs one small picture with a takeaway; an expert wants density and zero hand-holding.

## Resolving the active level

1. A `/coding-level N` invocation in this session wins.
2. Otherwise use the `Default coding level: N` entry in `backbone.yml` `conventions.custom_rules`, if present.
3. Otherwise apply the level 2–3 row (standard density).

## Level table

| Level | Register | Diagram budget | Preferred types | Annotation |
| ----- | -------- | -------------- | --------------- | ---------- |
| 0 | ELI5 | ≤ 6 nodes, 1 idea per diagram | flowchart TD, pie, simple timeline | Every shape explained; add a one-line takeaway sentence under the diagram; no jargon in labels |
| 1 | Junior | ≤ 10 nodes | flowchart, sequence (≤ 4 actors), kanban, pie | Legend of the color roles; short takeaway under the diagram |
| 2 | Mid | ≤ 15 nodes | full type range except C4/architecture | Brief caption; label edge cases explicitly |
| 3 | Senior | standard density | full type range | Caption only when non-obvious; assume pattern knowledge |
| 4 | Tech Lead | dense allowed; split by concern | C4, architecture, ER, state, sequence with alt/loop frames | System boundaries and ownership called out; link related diagrams |
| 5 | God | no fixed node ceiling; split when legibility drops | anything, including gitgraph internals, packet, railroad | Minimal — the diagram is the annotation |

## Rules that hold at every level

- Semantic color roles from the Vivid Clay preset always apply — level changes density, never styling.
- Splitting one oversized diagram into two small ones beats shrinking labels.
- If the resolved level makes the requested diagram type unreadable (e.g. C4 at level 0), say so and propose the nearest simpler type instead of silently downgrading.
- Takeaway lines and captions are written in the user's language.
