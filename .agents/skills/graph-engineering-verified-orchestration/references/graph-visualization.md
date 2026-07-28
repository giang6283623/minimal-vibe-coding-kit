# Graph visualization contract

Render graph plans and wave-status reports with `scripts/render-graph.mjs`. The renderer is deterministic: identical input produces identical output, so reviewers can diff or re-run it as an objective check. Never hand-draw graph diagrams, and never edit renderer output by hand; change the ledger and regenerate.

## When to emit which format

| Surface | Format | Why |
| --- | --- | --- |
| Cursor IDE, Claude/Kimi web apps, GitHub markdown, docs | `--format=mermaid` | Renders as a styled flowchart in markdown previews. |
| Claude Code, Codex CLI, Kimi CLI, plain terminals | `--format=ascii` | Readable in any terminal; no renderer needed. |
| Unknown or mixed | `--format=both` (default) | Safe default for a plan report. |

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

- `id`: unique short identifier (required).
- `label`: display text; emoji and em/en dashes are stripped to follow the kit writing-style rule.
- `status`: `ready`, `running`, `accepted`, `rejected`, or `blocked`; unknown values render as `ready`.
- `wave`: optional integer; nodes sharing a wave render inside one Mermaid subgraph and one ASCII section.
- `risk`: optional `R0`/`R1`/`R2`, shown in the ASCII view.
- `edges[].artifact`: the named artifact consumed by the downstream node, per the edge ledger.

## Usage

```bash
node .vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs graph.json --format=mermaid
node .vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs graph.json --format=ascii
```

The script validates before rendering and exits non-zero with a named error when:

- the JSON is malformed or `nodes` is missing or empty;
- a node `id` is missing or duplicated;
- an edge references an unknown node;
- the graph contains a cycle (the cycle path is printed).

## Status to style mapping

| Status | Mermaid class | ASCII marker |
| --- | --- | --- |
| accepted | success (green) | `[ok]` |
| running | accent (violet) | `[run]` |
| ready | step (blue) | `[pend]` |
| blocked | danger (red) | `[block]` |
| rejected | danger (red) | `[rej]` |

The Mermaid theme follows the kit README conventions (`theme: base`, monospace font stack, `edgeLabelBackground: "#FFFFFF"`) so diagrams stay legible in light and dark previews.

## Reporting rules

- Attach the rendered view to every plan-only report and every wave-acceptance report, next to the text ledgers.
- Keep the ledger JSON as the canonical artifact; the renders are disposable views of it.
- The ASCII view ends with the deterministic critical path (longest path by node count, tie-broken by id), which feeds the benefit check in the main skill.
