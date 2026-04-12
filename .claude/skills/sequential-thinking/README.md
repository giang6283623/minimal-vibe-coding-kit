# Sequential Thinking Skill - MCP Conversion

This skill replicates the Sequential Thinking MCP server functionality as a Claude Code Skill, providing dynamic and reflective problem-solving through structured thinking.

## What is Sequential Thinking?

Sequential Thinking is a reasoning tool that helps break down complex problems into manageable steps with support for:

- **Step-by-step reasoning**: Progressive problem analysis
- **Revisions**: Correct assumptions as understanding deepens
- **Branching**: Explore alternative approaches simultaneously
- **Dynamic scope**: Adjust thought count as complexity emerges
- **Context maintenance**: Build on previous thoughts

## What Changed from MCP

### Output Format
- **MCP:** JSON responses via Model Context Protocol
- **Skill:** JSON responses as Claude output (same structure)

### State Management
- **MCP:** Server-side thought history (in-memory)
- **Skill:** Conversation context (automatic isolation)

### Display
- **MCP:** Colored console output with box-drawing (stderr)
- **Skill:** JSON responses only (no terminal formatting)

### Invocation
- **MCP:** `mcp.callTool("sequential_thinking", {...})`
- **Skill:** `/sequential-thinking <thought>`

## Usage Examples

### Basic Linear Reasoning
```bash
/sequential-thinking "Step 1: Identify the problem - API is slow"
/sequential-thinking "Step 2: Measure response times" thoughtNumber=2
/sequential-thinking "Step 3: Analyze bottleneck - database queries" thoughtNumber=3
```

### With Revision
```bash
/sequential-thinking "Initial thought: Use caching" thoughtNumber=1
/sequential-thinking "Actually, optimize queries first" isRevision=true revisesThought=1 thoughtNumber=2
```

### With Branching
```bash
/sequential-thinking "Main approach: Microservices" thoughtNumber=1
/sequential-thinking "Alternative: Modular monolith" branchFromThought=1 branchId="alternative"
/sequential-thinking "Comparison: Both have merit" thoughtNumber=3
```

### Adaptive Depth
```bash
/sequential-thinking "Starting analysis..." thoughtNumber=1 totalThoughts=3
/sequential-thinking "This is more complex than expected" thoughtNumber=3 needsMoreThoughts=true
# Auto-adjusts totalThoughts from 3 → 6
```

## Key Features

### ✅ Auto-Adjustment
- System prevents `thoughtNumber > totalThoughts` inconsistencies
- Automatically increases `totalThoughts` when needed
- Tracks adjustments in session context

### ✅ Non-Destructive Revisions
- Original thoughts preserved in history
- Revisions create new thoughts that reference originals
- Complete audit trail maintained

### ✅ Multi-Branch Support
- Explore multiple approaches simultaneously
- Track all branches in `branches[]` array
- Branch naming helps organize exploration

### ✅ Conversation-Scoped State
- Automatic session isolation (no shared state)
- State persists within conversation
- Clean reset on new conversation

## When to Use

### Use Sequential Thinking For:
- ✅ Problems with unclear initial scope
- ✅ Long reasoning chains (5-20+ thoughts)
- ✅ Analysis requiring revision
- ✅ Comparing multiple approaches (branching)
- ✅ Step-by-step solution development

### Use ClearThought Instead For:
- Statistical analysis → `statistical_reasoning`
- Decision-making → `decision_framework`
- Debugging → `debugging_approach`
- Emergency situations → `ulysses_protocol`
- Specialized operations → 37 operations available

### Use Both Together:
1. **Sequential Thinking** for exploration
2. **ClearThought** for specialized analysis
3. **Sequential Thinking** for synthesis

## File Structure

```
.claude/skills/sequential-thinking/
├── SKILL.md                    # Main skill
├── README.md                   # This file
├── SYNTHESIS.md                # Analysis synthesis (30 subagents)
├── CONVERSION_PLAN.md          # Conversion strategy
├── reference/
│   ├── parameters.md           # Complete parameter reference
│   ├── output-schema.md        # Response structure
│   ├── patterns.md             # Usage patterns
│   └── mcp-comparison.md       # MCP vs Skill differences
└── examples/
    ├── linear-reasoning.md     # Simple sequential
    ├── revision-pattern.md     # Correcting thoughts
    ├── branching-exploration.md # Alternative paths
    └── adaptive-depth.md       # Dynamic scope
```

## Differences from MCP Server

### What's the Same ✅
- All parameters supported
- JSON output structure
- Thought history tracking
- Revision and branching logic
- Auto-adjustment behavior
- Validation rules

### What's Different ⚠️
- **No server process**: Runs in Claude's context
- **No colored output**: JSON only (no chalk/emojis)
- **Conversation state**: Automatic isolation vs shared server state
- **No stderr logs**: All info in JSON response
- **Better isolation**: No multi-user state mixing

### What's Better 🎯
- **Simpler setup**: No server installation
- **Automatic cleanup**: State resets per conversation
- **Better privacy**: No shared state between sessions
- **More transparent**: Full reasoning in responses

## Migration from MCP

### For Users
1. Remove MCP server from Claude Desktop config
2. Use `/sequential-thinking` instead of tool calls
3. Output format is identical (JSON structure)
4. State automatically scoped to conversation

### For Developers
1. Tool calls: `mcp.callTool("sequential_thinking", {...})` → `/sequential-thinking ...`
2. No server process needed
3. Conversation-scoped state (better isolation)
4. Same JSON response structure

## Technical Details

### State Tracking

**Thought History:**
```json
{
  "sessionContext": {
    "thoughtHistoryLength": 15,
    "recentThoughts": [
      {"number": 15, "type": "regular"},
      {"number": 14, "type": "branch"},
      {"number": 13, "type": "revision"}
    ]
  }
}
```

### Branch Management

```json
{
  "branches": ["approach-a", "approach-b", "verification"],
  "branchInfo": {
    "id": "approach-b",
    "fromThought": 5,
    "depth": 3
  }
}
```

### Revision Tracking

```json
{
  "revisionOf": 3,
  "sessionContext": {
    "revisionsMade": 2,
    "revisedThoughts": [1, 3]
  }
}
```

## Comparison: Sequential Thinking vs ClearThought

| Aspect | Sequential Thinking | ClearThought |
|--------|-------------------|--------------|
| **Tools** | 1 (deep iteration) | 37 operations |
| **Best for** | Exploration, long chains | Specialized analysis |
| **State** | Thought history | Operation history |
| **Branching** | Built-in | Via tree_of_thought |
| **Revisions** | Built-in | Via thoughtNumber |
| **Learning curve** | Low (1 tool) | Medium (37 operations) |
| **Use case** | Unknown scope | Well-defined problems |

**Recommendation:** Use Sequential Thinking for exploration, then ClearThought for specialized analysis!

## License

MIT License (same as Sequential Thinking MCP)

---

**Last Updated:** 2026-04-05  
**Skill Version:** 1.0.0 (Based on MCP v0.6.2)  
**Analysis Method:** 30 parallel subagents  
**Lines of Code:** ~300 (main SKILL.md)
