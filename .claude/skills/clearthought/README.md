# Clear Thought Skill - MCP Conversion

This skill replicates the Clear Thought MCP server functionality as a Claude Code Skill, providing 37 reasoning operations for systematic thinking and problem-solving.

## What Changed from MCP

### Output Format
- **MCP:** JSON responses via Model Context Protocol
- **Skill:** JSON responses as Claude output (same structure)

### State Management
- **MCP:** Server-side `SessionState` with optional file persistence
- **Skill:** Conversation context (lightweight) or optional file-based session via `${CLAUDE_SESSION_ID}`

### Resources
- **MCP:** `guide://`, `examples://`, `notebook:///` URIs
- **Skill:** Local files in `reference/`, `examples/` folders

### Invocation
- **MCP:** `mcp.callTool("clear_thought", { operation: "...", prompt: "..." })`
- **Skill:** `/clearthought operation_name problem statement`

## Operations Coverage

### Core Thinking (7)
✅ sequential_thinking, mental_model, debugging_approach, creative_thinking, visual_reasoning, metacognitive_monitoring, scientific_method

### Collaborative (5)
✅ collaborative_reasoning, decision_framework, socratic_method, structured_argumentation, systems_thinking

### Analysis (9)
✅ statistical_reasoning, simulation, optimization, causal_analysis, analogical_reasoning, ethical_analysis, research, mdp_planning, decision_networks

### Patterns (5)
✅ tree_of_thought, beam_search, mcts, graph_of_thought, orchestration_suggest

### Special (3)
✅ pdr_reasoning, code_execution (via Bash if needed)

### UI (2)
✅ visual_dashboard, custom_framework

### Session (3)
✅ session_info, session_export, session_import

### Metagame (2)
✅ ooda_loop, ulysses_protocol

### Notebooks (4)
✅ notebook_create, notebook_add_cell, notebook_run_cell, notebook_export

**Total: 37 operations** (100% coverage)

## Usage Examples

### Explicit Mode (Recommended)
```bash
# Specify operation explicitly
/clearthought sequential_thinking How to optimize database queries?
/clearthought debugging_approach API returns 500 errors
/clearthought decision_framework Choose database: PostgreSQL vs MongoDB
```

### Auto-Detect Mode (NEW! v2.1.0)
```bash
# Let skill choose operation from keywords
/clearthought How to optimize database queries?
/clearthought Debug API returns 500 errors
/clearthought Choose between PostgreSQL and MongoDB
```

**Note:** Auto-detect analyzes keywords and selects the best operation automatically!

### With Patterns
```bash
/clearthought sequential_thinking pattern=tree depth=3 Complex architecture decision
```

### Multi-perspective Analysis
```bash
/clearthought collaborative_reasoning Should we migrate to microservices?

# Or auto-detect:
/clearthought Different perspectives on migrating to microservices
```

### Statistical Analysis
```bash
/clearthought statistical_reasoning mode=descriptive Analyze API response times: [120, 145, 98, 203, 156]

# Or auto-detect:
/clearthought Analyze data: [120, 145, 98, 203, 156]
```

### High-Stakes Debugging
```bash
/clearthought ulysses_protocol action=start Critical production bug in payment system

# Or auto-detect:
/clearthought CRITICAL: Payment system down, $10k/hour loss
```

## File Structure

```
.claude/skills/clearthought/
├── SKILL.md                         # Main skill (< 500 lines)
├── README.md                        # This file
├── THOUGHT_CONTENT_ANALYSIS.md     # Where thought content goes (detailed)
├── THOUGHT_CONTENT_FLOW.md         # Visual flow diagrams
├── THOUGHT_CONTENT_QUICKREF.md     # Quick reference card
├── reference/
│   ├── parameter-reference.md      # All parameters documented
│   └── output-schemas.md           # Response structures
├── examples/
│   ├── sequential-thinking.md      # Core examples
│   ├── decision-framework.md       # Decision examples
│   └── metagame-examples.md        # OODA & Ulysses examples
└── docs/
    └── THOUGHT_NUMBERING_SYSTEM.md  # Numbering system deep-dive
```

## Differences from MCP Server

### What's the Same
- All 37 operations supported
- JSON output format (authentic MCP structure)
- Parameter contracts
- Error handling patterns
- Operation behavior and logic

### What's Different
- **No server process**: Runs in Claude's context
- **No persistent session**: Uses conversation or optional files
- **No telemetry**: No Shinzo integration
- **No Python VM**: Code execution via Bash subprocess (if enabled)
- **No MCP resources**: Uses local file references

### What's Better
- **Simpler setup**: No MCP server to install/run
- **Integrated**: Works directly in Claude Code
- **Conversational**: Easier to chain operations
- **Transparent**: Full source in SKILL.md

### What's Limited
- **No cross-conversation state**: Unless file-based session added
- **No real-time features**: No session timeout/cleanup
- **No resource URIs**: Use file paths instead

## Migration from MCP

### For Users
1. Remove MCP server from Claude Desktop config
2. Invoke operations with `/clearthought` instead of tool calls
3. Output format is identical (JSON structure)
4. Session state lives in conversation context

### For Developers
1. Tool calls: `mcp.callTool("clear_thought", {...})` → `/clearthought operation ...`
2. Resources: `guide://...` → Read `reference/...` files
3. Examples: `examples://...` → Read `examples/...` files
4. Session: Server-side → Conversation or file-based

## Advanced Features

### File-Based Sessions (Optional)
Add to frontmatter:
```yaml
allowed-tools: Read Write Bash
```

Then implement:
```bash
# Save session
echo "$sessionData" > .ct-session/${CLAUDE_SESSION_ID}/state.json

# Load session
cat .ct-session/${CLAUDE_SESSION_ID}/state.json
```

### Subagent Execution (Heavy Operations)
For computationally intensive operations, consider:
```yaml
context: fork
agent: Explore
```

## Support

- **Documentation**: See `reference/` and `docs/` folders
  - **[Thought Content Quick Reference](./THOUGHT_CONTENT_QUICKREF.md)** - **START HERE** - Where thought content goes (1-page)
  - [Thought Content Analysis](./THOUGHT_CONTENT_ANALYSIS.md) - Detailed analysis of thought storage & retrieval
  - [Thought Content Flow](./THOUGHT_CONTENT_FLOW.md) - Visual diagrams and examples
  - [Parameter Reference](./reference/parameter-reference.md) - All operation parameters
  - [Output Schemas](./reference/output-schemas.md) - JSON response structures
  - [Thought Numbering System](./docs/THOUGHT_NUMBERING_SYSTEM.md) - Deep-dive on numbering rules
  - [MCP SDK Documentation Index](./reference/mcp-sdk-documentation-index.md) - MCP SDK learning path
  - [MCP SDK Quick Reference](./reference/mcp-sdk-quick-reference.md) - Quick lookup guide
  - [MCP SDK Analysis Summary](./reference/mcp-sdk-analysis-summary.md) - Answers to 5 key questions
  - [MCP SDK Complete Patterns](./reference/mcp-sdk-patterns.md) - Deep dive guide
  - [MCP Architecture Diagrams](./reference/mcp-architecture-diagram.md) - Visual reference
  - [MCP Implementation Alternatives](./reference/mcp-implementation-alternatives.md) - Compare approaches
  - **[MCP I/O Quick Reference](./reference/mcp-io-quick-reference.md)** - **Why `console.error` vs `console.log`** (1-page)
  - [MCP I/O Separation Strategy](./reference/mcp-io-separation-strategy.md) - Complete analysis of stdio separation
  - [MCP I/O Flow Diagrams](./reference/mcp-io-flow-diagrams.md) - Visual guide to stream separation
  - [MCP vs Skill Decision Matrix](./reference/mcp-vs-skill-decision-matrix.md) - When to use MCP vs Skill
  - **[Formatting Style Guide](./reference/formatting-style-guide.md)** - **Chalk colors, emojis, box-drawing analysis** (complete)
  - [MCP vs Skill Formatting](./reference/mcp-vs-skill-formatting.md) - Side-by-side visual comparison
- **Examples**: See `examples/` folder
- **Issues**: Based on Clear Thought MCP v0.2.1
- **MCP Source**: https://github.com/waldzellai/clear-thought-onepointfive

## License

MIT License (same as MCP server)

---

**Last Updated:** 2026-04-05  
**Skill Version:** 2.0.0 (MCP parity)  
**Claude Code Skills Standard:** Agent Skills + Claude Code extensions
