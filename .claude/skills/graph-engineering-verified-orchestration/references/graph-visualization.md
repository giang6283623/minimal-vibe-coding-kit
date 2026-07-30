# Graph visualization contract

Render graph plans and wave-status reports with `scripts/render-graph.mjs`.
Output is deterministic for the same ledger, format, and resolved width, so
reviewers can diff or re-run it as an objective check. Never hand-draw graph
diagrams, and never edit renderer output by hand; change the ledger and
regenerate.

## When to emit which format

| Surface | Format | Why |
| --- | --- | --- |
| Cursor IDE, Claude/Kimi web apps, GitHub markdown, docs | `--format=mermaid` | Renders as a styled flowchart in markdown previews. |
| Cursor CLI, Claude Code, Codex CLI, Grok CLI, Kimi CLI, plain terminals | `--format=ascii-3d` | Shows topological depth, dependencies, status, blockers, and schedule with portable ASCII. |
| Low-density schedule-only report | `--format=ascii` | Preserves the legacy wave list and flat edge ledger. |
| Unknown or mixed | `--format=both` (default) | Emits Mermaid followed by ASCII 3D. |

## Ledger JSON input

```json
{
  "goal": "one measurable outcome",
  "graph_version": "v1",
  "nodes": [
    { "id": "N1", "label": "blind-spot report", "status": "accepted", "wave": 1, "risk": "R0" },
    { "id": "N2", "label": "writing-style rule", "status": "running", "wave": 2, "risk": "R1" }
  ],
  "edges": [
    { "from": "N1", "to": "N2", "artifact": "blind-spot report" }
  ]
}
```

- `id`: unique 1-24 character ASCII identifier (required); use letters,
  digits, dot, underscore, colon, or dash.
- `label`: display text; control characters, bidi overrides, emoji, and em/en
  dashes are sanitized. Mermaid metacharacters are encoded and Mermaid emits
  `securityLevel: strict`. ASCII output decomposes readable Latin text and
  escapes every remaining non-ASCII code point.
- `status`: exactly `ready`, `running`, `accepted`, `rejected`, or `blocked`;
  unknown values fail closed.
- `wave`: optional integer; nodes sharing a wave render inside one Mermaid subgraph and one ASCII section.
- `risk`: optional exact `R0`/`R1`/`R2`; unknown values fail closed.
- `edges[].artifact`: the named artifact consumed by the downstream node, per the edge ledger.

## Usage

```bash
node .vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs graph.json --format=mermaid
node .vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs graph.json --format=ascii-3d --width=80
node .vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs graph.json --format=ascii
```

`--width=N` accepts 40 through 160 columns. An explicit width is stable across
all hosts. Without it, a TTY uses its bounded column count and non-TTY output
uses 80 columns. ASCII 3D falls back to the compact topology ledger below 64
columns, above 24 nodes, or above 8 nodes in one layer.

## Performance and reuse

- Request only the format required by the known surface. Use `both` only when
  the destination is genuinely unknown or mixed, because it doubles renderer
  output and host-side layout work.
- A caller may reuse a disposable render only when the canonical ledger digest,
  renderer digest, format, and resolved width all match. Any change to one of
  those inputs requires regeneration.
- Reuse applies only to the view. Validate the full canonical ledger before
  mutable execution, and never treat cached output as the source of truth.
- Diagnose latency in separate layers: process startup, JSON parsing and graph
  validation, renderer CPU time, output bytes, transport, and host-side Mermaid
  layout. Optimize the measured bottleneck and retain a byte-stable output
  fingerprint as the correctness oracle.

The script validates before rendering and exits non-zero with a named error when:

- the JSON is malformed or `nodes` is missing or empty;
- a node `id` is missing or duplicated;
- an id is not a short ASCII identifier;
- a status or risk value is unknown;
- a supplied wave is not a positive integer;
- an edge references an unknown node;
- an exact edge and artifact tuple is duplicated;
- the graph contains a cycle (the cycle path is printed).

## ASCII 3D topology

The ASCII 3D view derives topological layers from the edges, not from scheduled
waves. It renders:

- one pseudo-3D box per node, offset by dependency depth;
- every dependency exactly once in a sorted, numbered bridge;
- the consumed artifact under its edge;
- `*` on structural critical-path nodes and edges;
- schedule waves as a separate roster;
- explicit blocker and waiting-on reasons;
- the structural critical path as a final text line.

The depth cue is decorative. All topology, state, and blocker semantics are
repeated as plain text, so narrow terminals, copied transcripts, search,
screen readers, and hosts that collapse spaces retain the graph meaning.
The compact fallback wraps rather than truncates dependency and blocker data.

The renderer uses printable ASCII only for the CLI view. It emits no ANSI
color, Unicode box drawing, cursor controls, hyperlinks, timestamps, network
requests, or provider-specific terminal commands.

## Status to style mapping

| Status | Mermaid class | ASCII marker |
| --- | --- | --- |
| accepted | success (green) | `[ok]` |
| running | accent (violet) | `[run]` |
| ready | step (blue) | `[pend]` |
| blocked | danger (red) | `[block]` |
| rejected | danger (red) | `[rej]` |

The Mermaid view follows the mermaid skill's Vivid Clay preset
(`.vibekit/skills/mermaid/references/styling-preset.md`): the universal
frontmatter block (`theme: base`, mono font stack, primary/secondary/tertiary
tokens), rounded status-colored nodes with 2px ink borders, a paper-tint `wave`
class on every wave cluster, and `linkStyle default` on edges. Status and wave
classes are emitted inline so the styling survives hosts that ignore
frontmatter themeVariables (for example forced dark themes). Node labels wrap
with `<br/>` per the preset's anti-overflow rules, and unused classDefs are
dropped. Do not restyle renderer output by hand; if the style must change,
change the renderer so it stays aligned with the preset.

## Reporting rules

- Attach the rendered view to every plan-only report and every wave-acceptance report, next to the text ledgers.
- Keep the ledger JSON as the canonical artifact; the renders are disposable views of it.
- The ASCII views end with the deterministic structural critical path (longest path by node count, tie-broken by id). Do not treat this node-count path as a duration estimate.
