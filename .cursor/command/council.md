Use this command to spawn multiple agents to deeply explore a codebase area before acting.

1. Start with a quick local scan of the requested area to gather keywords, modules, and architecture signals.
2. Spawn `n=10` task agents by default (or use the user-provided `n`) to investigate the area in parallel from different angles.
3. Synthesize findings from all agents, then proceed with the user request using evidence from that exploration.

Tip:
Use params like `n=10` to control agent count.

Example:
`use /council n=15, how does authentication work?`
