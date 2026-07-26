# Minimal Vibe Coding Kit Mermaid Examples

These examples are authored for this kit. Their cases and labels intentionally differ
from the imported Mermaid documentation and the source clone. They target Mermaid
11.16.0, use strict security, and follow the Vivid Clay preset.

## Safe Configuration Promotion

Use a flowchart when the important story is ordered checks and rollback behavior.

```mermaid
---
title: Safe configuration promotion
config:
  securityLevel: strict
  theme: base
  themeVariables:
    fontFamily: cascadia mono, consolas, noto sans mono, menlo, monospace
    fontSize: 15px
    lineColor: "#444444"
    textColor: "#111111"
    edgeLabelBackground: "#FFFFFF"
---
flowchart TD
  Change([Config change]) --> Schema(Validate schema)
  Schema --> Sandbox(Run sandbox tests)
  Sandbox --> Ready{Checks pass?}
  Ready -->|yes| Approval(Request approval)
  Ready -->|no| Repair(Fix configuration)
  Repair --> Schema
  Approval --> Publish(Publish change)
  Publish --> Smoke{Smoke test?}
  Smoke -->|pass| Promoted([Promoted])
  Smoke -->|fail| Rollback(Roll back)
  Rollback --> Restored([Previous restored])

  classDef terminal fill:#111111,stroke:#444444,stroke-width:2px,color:#FFFFFF
  classDef step fill:#8ECAFF,stroke:#444444,stroke-width:2px,color:#111111
  classDef decision fill:#FFD43B,stroke:#444444,stroke-width:2px,color:#111111
  classDef success fill:#8CE99A,stroke:#444444,stroke-width:2px,color:#111111
  classDef danger fill:#FF8787,stroke:#444444,stroke-width:2px,color:#111111
  linkStyle default stroke:#444444,stroke-width:1.5px

  class Change,Promoted,Restored terminal
  class Schema,Sandbox,Approval step
  class Ready,Smoke decision
  class Publish success
  class Repair,Rollback danger
```

## Repository Safety Evolution

The strong section palette survives Mermaid's timeline tinting; every inverse accent is
pinned to the same ink color.

```mermaid
---
title: Repository safety evolution
config:
  securityLevel: strict
  theme: base
  themeVariables:
    fontFamily: cascadia mono, consolas, noto sans mono, menlo, monospace
    fontSize: 15px
    textColor: "#111111"
    cScale0: "#339AF0"
    cScale1: "#FAB005"
    cScale2: "#40C057"
    cScale3: "#9775FA"
    cScaleLabel0: "#111111"
    cScaleLabel1: "#111111"
    cScaleLabel2: "#111111"
    cScaleLabel3: "#111111"
    cScaleInv0: "#444444"
    cScaleInv1: "#444444"
    cScaleInv2: "#444444"
    cScaleInv3: "#444444"
---
timeline
  title Repository safety evolution
  section Source of truth
    Backbone contract : Define project boundaries
  section Path guardrails
    Containment checks : Reject broad targets
  section Verification
    Mirror parity : Compare every surface
  section Feedback loop
    Evidence ledger : Keep or discard changes
```

## Localization Release Board

Kanban columns use the strong scale. Priority metadata carries ticket risk without
overriding neutral card fills.

```mermaid
---
title: Localization release board
config:
  securityLevel: strict
  theme: base
  themeVariables:
    fontFamily: cascadia mono, consolas, noto sans mono, menlo, monospace
    fontSize: 15px
    textColor: "#111111"
    # Mermaid 11.16 maps Kanban column 1 to cScale2.
    cScale2: "#339AF0"
    cScale3: "#FAB005"
    cScale4: "#40C057"
    cScale5: "#9775FA"
    cScaleLabel2: "#111111"
    cScaleLabel3: "#111111"
    cScaleLabel4: "#111111"
    cScaleLabel5: "#111111"
---
kanban
  extract[Extract]
    strings[Extract interface strings]@{ ticket: KIT-241, assigned: 'Lan', priority: 'High' }
  verify[Verify]
    glyphs[Check Vietnamese glyphs]@{ ticket: KIT-244, assigned: 'Minh', priority: 'Very High' }
    keys[Validate catalog keys]@{ ticket: KIT-245, assigned: 'An', priority: 'High' }
  review[Review]
    translations[Review translations]@{ ticket: KIT-249, assigned: 'Hoa', priority: 'Low' }
  ship[Ship]
    catalogs[Publish language catalogs]@{ ticket: KIT-252, assigned: 'Vy', priority: 'Very Low' }
```

## Validation Feedback Time

The observed bars are blue, the target line is orange, and bar values are visible.

```mermaid
---
title: Validation feedback time
config:
  securityLevel: strict
  theme: base
  xyChart:
    showDataLabel: true
    showDataLabelOutsideBar: true
  themeVariables:
    fontFamily: cascadia mono, consolas, noto sans mono, menlo, monospace
    fontSize: 15px
    xyChart:
      backgroundColor: "#FFFFFF"
      titleColor: "#111111"
      dataLabelColor: "#111111"
      legendTextColor: "#111111"
      xAxisLabelColor: "#111111"
      xAxisTitleColor: "#111111"
      xAxisTickColor: "#444444"
      xAxisLineColor: "#444444"
      yAxisLabelColor: "#111111"
      yAxisTitleColor: "#111111"
      yAxisTickColor: "#444444"
      yAxisLineColor: "#444444"
      plotColorPalette: "#339AF0, #FD7E14, #40C057, #FA5252"
---
xychart
  x-axis [Syntax, Install, Mirrors, Security, Pack]
  y-axis "Feedback seconds" 0 --> 40
  bar "Observed" [8, 31, 12, 14, 24]
  line "Target" [20, 20, 20, 20, 20]
```

## Duplicate Webhook Investigation

Red is reserved for the evidence-ranked prime suspect. Ink text on the strong red reaches
5.75:1 contrast; green nodes are ruled out only by observed checks.

```mermaid
---
title: Duplicate webhook investigation
config:
  securityLevel: strict
  theme: base
  themeVariables:
    fontFamily: cascadia mono, consolas, noto sans mono, menlo, monospace
    fontSize: 15px
    lineColor: "#444444"
    textColor: "#111111"
    edgeLabelBackground: "#FFFFFF"
---
flowchart TD
  Incoming([Webhook received]) --> Signature{Signature valid?}
  Signature -->|no| Rejected([Reject request])
  Signature -->|yes| Dedupe(Build dedupe key)
  Dedupe --> Seen{Key already seen?}
  Seen -->|yes| Accepted([Acknowledge])
  Seen -->|no| Queue(Enqueue event)
  Queue --> Ledger(Write delivery ledger)
  Ledger --> Worker(Process event)
  Worker --> Complete([Complete])

  classDef terminal fill:#111111,stroke:#444444,stroke-width:2px,color:#FFFFFF
  classDef riskHigh fill:#FA5252,stroke:#444444,stroke-width:2px,color:#111111
  classDef riskMed fill:#FFA94D,stroke:#444444,stroke-width:2px,color:#111111
  classDef normal fill:#8ECAFF,stroke:#444444,stroke-width:2px,color:#111111
  classDef verified fill:#8CE99A,stroke:#444444,stroke-width:2px,color:#111111
  linkStyle default stroke:#444444,stroke-width:1.5px

  class Incoming,Rejected,Accepted,Complete terminal
  class Signature verified
  class Dedupe riskHigh
  class Queue riskMed
  class Seen,Ledger,Worker normal
```

Evidence note: request logs show different deliveries producing an empty deduplication key;
signature verification passes. Queue visibility is not yet tested, so it remains amber.
