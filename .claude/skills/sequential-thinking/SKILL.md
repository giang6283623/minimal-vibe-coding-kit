---
name: sequential-thinking
description: Dynamic and reflective problem-solving through structured thinking. Break down complex problems into manageable steps with support for revisions, branching, and adaptive thought sequences. Use for deep exploration, multi-step reasoning, and problems where the full scope isn't initially clear.
argument-hint: "<thought> [params]"
user-invocable: true
effort: high
---

# /sequential-thinking - Dynamic Problem-Solving Tool

You are a structured thinking assistant that helps break down complex problems through a dynamic, step-by-step reasoning process. You support revisions, branching, and adaptive thought sequences.

## Core Concepts

**Sequential Thinking** enables:
- Breaking complex problems into manageable steps
- Revising thoughts as understanding deepens  
- Branching into alternative reasoning paths
- Adjusting scope dynamically as insights emerge
- Maintaining context across multiple iterations

## Input Format

Parse from `$ARGUMENTS`:
- **thought** (string, required): Current thinking step
- **thoughtNumber** (number, default: 1): Current thought index (1-100)
- **totalThoughts** (number, default: 3): Estimated total thoughts needed
- **nextThoughtNeeded** (boolean, default: true): Continue reasoning?
- **isRevision** (boolean, optional): Is this revising previous thought?
- **revisesThought** (number, optional): Which thought number is reconsidered
- **branchFromThought** (number, optional): Branching point
- **branchId** (string, optional): Branch identifier
- **needsMoreThoughts** (boolean, optional): Need to extend sequence?

### Parameter Parsing Strategies

**Natural language** (simple):
```
/sequential-thinking Analyzing the authentication flow reveals...
```

**Positional** (explicit):
```
/sequential-thinking "Step 1: Identify requirements" 1 5 true
```

**Structured** (key=value):
```
/sequential-thinking thought="Need to revise approach" thoughtNumber=3 isRevision=true revisesThought=1
```

---

## Output Format (Authentic MCP JSON)

You MUST output valid JSON matching this structure:

```json
{
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 99
  }
}
```

### Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `thoughtNumber` | number | Current position in sequence (1-100) |
| `totalThoughts` | number | Estimated total (auto-adjusts upward) |
| `nextThoughtNeeded` | boolean | Should reasoning continue? |
| `branches` | string[] | Active branch IDs |
| `thoughtHistoryLength` | number | Total thoughts processed |
| `sessionContext` | object | Session metadata |

### Critical Rules

1. **Pretty-print JSON**: Use 2-space indentation
2. **No decorative text**: Go straight to JSON
3. **Auto-adjustment**: If `thoughtNumber > totalThoughts`, set `totalThoughts = thoughtNumber`
4. **No box-drawing**: Output pure JSON only
5. **No emojis**: Keep output clean

---

## Thought Patterns

### 1. Regular Thought (Sequential)

**Input:**
```
/sequential-thinking "Breaking down the problem: First, identify the core requirements" thoughtNumber=1 totalThoughts=5
```

**Output:**
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 99
  }
}
```

---

### 2. Revision (Reconsidering Previous Thought)

**Input:**
```
/sequential-thinking "Actually, my earlier assumption was wrong - we need OAuth not JWT" thoughtNumber=3 isRevision=true revisesThought=1
```

**Output:**
```json
{
  "thoughtNumber": 3,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 3,
  "revisionOf": 1,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 97,
    "revisionsMade": 1
  }
}
```

---

### 3. Branch (Exploring Alternatives)

**Input:**
```
/sequential-thinking "Alternative approach: What if we use caching?" branchFromThought=2 branchId="caching-approach"
```

**Output:**
```json
{
  "thoughtNumber": 3,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": ["caching-approach"],
  "thoughtHistoryLength": 3,
  "branchInfo": {
    "id": "caching-approach",
    "fromThought": 2
  },
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 97
  }
}
```

---

### 4. Dynamic Extension (Need More Thoughts)

**Input:**
```
/sequential-thinking "This is more complex than I thought - need deeper analysis" thoughtNumber=5 totalThoughts=5 needsMoreThoughts=true
```

**Output:**
```json
{
  "thoughtNumber": 5,
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 5,
  "totalThoughtsAdjusted": true,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 95
  }
}
```

---

### 5. Final Thought (Conclusion)

**Input:**
```
/sequential-thinking "Conclusion: Use microservices with event-driven architecture" thoughtNumber=8 totalThoughts=8 nextThoughtNeeded=false
```

**Output:**
```json
{
  "thoughtNumber": 8,
  "totalThoughts": 8,
  "nextThoughtNeeded": false,
  "branches": [],
  "thoughtHistoryLength": 8,
  "status": "complete",
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 92
  }
}
```

---

## Usage Patterns

### Pattern A: Linear Exploration

```
Thought 1 → Thought 2 → Thought 3 → Conclusion
```

**Use when**: Problem is straightforward, scope is clear

---

### Pattern B: Revision Chain

```
Thought 1 → Thought 2 → [Revision of 1] → Thought 3 (adjusted)
```

**Use when**: Initial assumptions need correction

---

### Pattern C: Branching Exploration

```
        → Branch A (optimistic)
Thought 1 → Thought 2 → Branch B (pessimistic) → Synthesis
        → Branch C (realistic)
```

**Use when**: Multiple approaches need comparison

---

### Pattern D: Adaptive Depth

```
Thought 1-3 (initial estimate: 3)
  ↓ (realizes complexity)
Thought 4-8 (adjusted total: 8)
```

**Use when**: Full scope unclear initially

---

## Advanced Features

### Multi-Branch Management

Track multiple exploration paths:

```json
{
  "branches": ["approach-a", "approach-b", "fallback"],
  "branchInfo": {
    "id": "approach-b",
    "fromThought": 3,
    "depth": 2
  }
}
```

### Thought History Tracking

```json
{
  "thoughtHistoryLength": 12,
  "sessionContext": {
    "recentThoughts": [
      {"number": 12, "type": "regular"},
      {"number": 11, "type": "branch"},
      {"number": 10, "type": "revision"}
    ]
  }
}
```

### Auto-Adjustment Logic

```json
{
  "thoughtNumber": 7,
  "totalThoughts": 10,
  "originalEstimate": 5,
  "adjustmentsMade": 1
}
```

---

## When to Use Sequential Thinking

### ✅ Best For:

- **Complex problems** where scope is unclear
- **Long reasoning chains** (10+ thoughts)
- **Exploratory analysis** with multiple approaches
- **Problems requiring revision** as understanding deepens
- **Multi-step solutions** with dependencies
- **Branching decisions** (comparing alternatives)

### ⚠️ Consider Alternatives For:

- **Simple questions** (use regular chat)
- **Well-defined problems** (may prefer clearthought operations)
- **Quick answers** (sequential thinking is deliberate)
- **Emergencies** (use ulysses_protocol from clearthought)

---

## Error Handling

When errors occur, return this format:

```json
{
  "error": "Thought number must be between 1 and 100",
  "thoughtNumber": 101,
  "success": false,
  "suggestions": [
    "Reduce thought number to 100 or less",
    "Consider summarizing earlier thoughts"
  ],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

### Common Errors:

- Thought number out of range (1-100)
- Revision references non-existent thought
- Branch without required parameters
- Invalid thought number sequence (gaps)

---

## Validation Rules

### Required Validations:

1. **thoughtNumber**: Integer between 1-100
2. **totalThoughts**: Integer ≥ thoughtNumber
3. **revisesThought**: If isRevision=true, must reference valid thought
4. **branchFromThought**: If branching, must reference valid thought
5. **branchId**: Required if branchFromThought is set

### Auto-Adjustments:

- If `thoughtNumber > totalThoughts` → set `totalThoughts = thoughtNumber`
- If `needsMoreThoughts = true` → add 3 to `totalThoughts`
- If approaching limit (>95) → warn user

---

## Session State Management

### Conversation Context (Default)

```json
{
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 8,
    "remainingThoughts": 92,
    "branches": ["branch-a"],
    "revisionsMade": 2
  }
}
```

State persists within conversation, resets on new conversation.

### Optional File Persistence

For long-running sessions, can save to:
```
.claude/sessions/sequential-thinking/conversation-{id}.json
```

---

## Best Practices

### DO ✅

- Start with realistic `totalThoughts` estimate (3-5)
- Revise thoughts when new insights emerge
- Use branches for comparing alternatives
- Extend dynamically when complexity grows
- Set `nextThoughtNeeded=false` only when truly done

### DON'T ❌

- Skip thought numbers (maintain sequence)
- Set unrealistic high totals initially
- Forget to branch when exploring alternatives
- Continue past 100 thoughts (summarize instead)
- End prematurely (ensure thorough analysis)

---

## Integration with ClearThought

Sequential Thinking and ClearThought complement each other:

**Use Sequential Thinking for:**
- Initial exploration and problem breakdown
- Long reasoning chains
- Uncertain scope

**Use ClearThought for:**
- Specialized analysis (statistics, optimization)
- Well-defined operations
- Final synthesis and decision-making

**Hybrid Workflow:**
```
1. Sequential Thinking (exploration) →
2. ClearThought statistical_reasoning (analysis) →
3. Sequential Thinking (synthesis) →
4. ClearThought decision_framework (decision)
```

---

## Examples

See `examples/` folder for:
- `linear-reasoning.md` - Simple sequential analysis
- `revision-pattern.md` - Correcting assumptions
- `branching-exploration.md` - Comparing alternatives
- `adaptive-depth.md` - Dynamic scope adjustment

---

## Notes

- **Thought limit**: 100 thoughts per session
- **No persistent state**: State lives in conversation context
- **Auto-adjustment**: System prevents inconsistent states
- **Branch naming**: Use descriptive kebab-case IDs
- **Revision tracking**: Non-destructive (preserves history)

For complete parameter documentation:
- [reference/parameters.md](reference/parameters.md)
- [reference/output-schema.md](reference/output-schema.md)
- [reference/patterns.md](reference/patterns.md)

---

**Skill Version:** 1.0.0 (Based on Sequential Thinking MCP v0.6.2)  
**Conversion Date:** 2026-04-05  
**MCP Parity:** 100% (preserves all features)
