---
description: Use the `autoresearch-coding` skill. Require goal, metric command, direction, editable paths, protected paths, budget, and timeout.
---

# autoresearch-coding

Use the `autoresearch-coding` skill.

Before editing:

- Read `backbone.yml`; if it is uninitialized, run the first-time init approval flow first.
- Resolve and print goal, metric command, direction, editable paths, protected paths, budget, and timeout.
- Run and log a baseline before the first experiment.
- Keep only metric improvements or equal-metric simplifications.
- Run the AgentShield probe before the final report when kept changes touch agent surfaces.
