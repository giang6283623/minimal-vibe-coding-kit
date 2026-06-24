# Sequential Thinking - Output Schema Reference

Complete JSON response structure documentation.

## Base Response Structure

```typescript
{
  thoughtNumber: number;           // Current position (1-100)
  totalThoughts: number;           // Estimated total (auto-adjusts)
  nextThoughtNeeded: boolean;      // Continue flag
  branches: string[];              // Active branch IDs
  thoughtHistoryLength: number;    // Total processed
  sessionContext: {                // Session metadata
    sessionId: string;
    remainingThoughts: number;
    [key: string]: any;
  }
}
```

---

## Field Descriptions

### `thoughtNumber` (number)
**Current position in thought sequence**

**Range:** 1-100
**Behavior:** Increments by 1 for each thought
**Auto-adjustment:** If exceeds `totalThoughts`, adjusts it upward

**Examples:**
```json
{"thoughtNumber": 1}   // First thought
{"thoughtNumber": 15}  // Fifteenth thought
{"thoughtNumber": 100} // Maximum (limit reached)
```

---

### `totalThoughts` (number)
**Estimated total thoughts needed for complete analysis**

**Range:** 1-100 (matches `thoughtNumber`)
**Behavior:** Can increase dynamically, never decreases
**Auto-adjustment:** Matches `thoughtNumber` if exceeded

**Examples:**
```json
// Initial estimate
{"totalThoughts": 5}

// After auto-adjustment
{"thoughtNumber": 7, "totalThoughts": 7}

// After needsMoreThoughts
{"totalThoughts": 8}  // Was 5, added 3
```

---

### `nextThoughtNeeded` (boolean)
**Whether another thought step is needed**

**Values:** `true` (continue) or `false` (complete)
**Purpose:** Flow control for reasoning loop
**Decision:** Set by LLM based on problem completeness

**Examples:**
```json
// Continuing analysis
{"nextThoughtNeeded": true}

// Analysis complete
{"nextThoughtNeeded": false}
```

---

### `branches` (string[])
**Array of active branch IDs**

**Type:** Array of strings
**Content:** Unique branch identifiers created during exploration
**Deduplication:** Automatic (no duplicates)

**Examples:**
```json
// No branches
{"branches": []}

// Single branch
{"branches": ["alternative-approach"]}

// Multiple branches
{"branches": ["approach-a", "approach-b", "fallback"]}
```

---

### `thoughtHistoryLength` (number)
**Total number of thoughts processed in session**

**Type:** Integer ≥ 1
**Behavior:** Increments by 1 with each thought
**Includes:** Regular thoughts + revisions + branch thoughts

**Examples:**
```json
// First thought
{"thoughtHistoryLength": 1}

// After 8 thoughts
{"thoughtHistoryLength": 8}

// With branches and revisions
{"thoughtHistoryLength": 15}  // Main:8, Branches:5, Revisions:2
```

---

### `sessionContext` (object)
**Session metadata and statistics**

**Required fields:**
- `sessionId`: Session identifier (default: "conversation")
- `remainingThoughts`: 100 - totalThoughts

**Optional fields:**
- `recentThoughts`: Preview of last 3 thoughts
- `revisionsMade`: Count of revisions
- `revisedThoughts`: Array of thought numbers revised
- `branchDepth`: Deepest branch depth
- Any custom metadata

**Example:**
```json
{
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 92,
    "recentThoughts": [
      {"number": 8, "preview": "Synthesizing findings..."},
      {"number": 7, "preview": "Branch B shows promise..."},
      {"number": 6, "preview": "Analyzing Branch A..."}
    ],
    "revisionsMade": 1,
    "revisedThoughts": [2]
  }
}
```

---

## Response Examples

### Example 1: First Thought
```json
{
  "thoughtNumber": 1,
  "totalThoughts": 3,
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

### Example 2: Mid-Sequence
```json
{
  "thoughtNumber": 5,
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 5,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 95,
    "recentThoughts": [
      {"number": 5, "preview": "Current thought..."},
      {"number": 4, "preview": "Previous thought..."},
      {"number": 3, "preview": "Earlier thought..."}
    ]
  }
}
```

---

### Example 3: With Revision
```json
{
  "thoughtNumber": 6,
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 6,
  "revisionOf": 3,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 94,
    "revisionsMade": 1,
    "revisedThoughts": [3]
  }
}
```

---

### Example 4: With Branches
```json
{
  "thoughtNumber": 7,
  "totalThoughts": 10,
  "nextThoughtNeeded": true,
  "branches": ["caching", "optimization", "scaling"],
  "thoughtHistoryLength": 12,
  "branchInfo": {
    "currentBranch": "optimization",
    "fromThought": 4,
    "branchDepth": 2
  },
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 90
  }
}
```

---

### Example 5: Auto-Adjusted
```json
{
  "thoughtNumber": 8,
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 8,
  "totalThoughtsAdjusted": true,
  "originalEstimate": 5,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 92
  }
}
```

---

### Example 6: Final Thought
```json
{
  "thoughtNumber": 10,
  "totalThoughts": 10,
  "nextThoughtNeeded": false,
  "branches": ["explored-a", "explored-b"],
  "thoughtHistoryLength": 15,
  "status": "complete",
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 90,
    "branchesExplored": 2,
    "revisionsM ade": 2
  }
}
```

---

## Error Response Structure

```json
{
  "error": "Thought number must be between 1 and 100",
  "thoughtNumber": 101,
  "success": false,
  "errorType": "validation",
  "suggestions": [
    "Use thought number between 1-100",
    "Consider summarizing earlier thoughts"
  ],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

### Error Fields

| Field | Type | Description |
|-------|------|-------------|
| `error` | string | Error message |
| `success` | boolean | Always false for errors |
| `errorType` | string | Category: validation, runtime, configuration |
| `suggestions` | string[] | Recovery suggestions |
| `sessionContext` | object | Session info (even on error) |

---

## Enhanced Response Features (Skill-Specific)

### Include Thought Content

Unlike MCP (metadata-only), skill responses include full thought:

```json
{
  "thoughtNumber": 5,
  "thoughtContent": "Analyzing the authentication flow reveals three key components...",
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 5,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 95
  }
}
```

---

### Recent Thoughts Preview

```json
{
  "sessionContext": {
    "recentThoughts": [
      {
        "number": 5,
        "content": "Full content of thought 5...",
        "type": "regular",
        "timestamp": "2026-04-05T10:30:00Z"
      },
      {
        "number": 4,
        "content": "Full content of thought 4...",
        "type": "branch",
        "branchId": "alt-a"
      },
      {
        "number": 3,
        "content": "Full content of thought 3...",
        "type": "revision",
        "revisedThought": 1
      }
    ]
  }
}
```

---

### Branch Summary

```json
{
  "branches": ["approach-a", "approach-b"],
  "branchSummary": {
    "approach-a": {
      "fromThought": 3,
      "thoughtCount": 4,
      "lastThought": 7
    },
    "approach-b": {
      "fromThought": 3,
      "thoughtCount": 2,
      "lastThought": 5
    }
  }
}
```

---

## Status Fields

### `status` (string, optional)

Added when thought sequence reaches specific states:

```json
// Approaching limit
{"status": "approaching_limit"}  // thoughtNumber > 90

// Limit reached
{"status": "limit_reached"}      // thoughtNumber = 100

// Analysis complete
{"status": "complete"}           // nextThoughtNeeded = false

// Error state
{"status": "failed"}             // Error occurred
```

---

## Metadata Tracking

### Adjustment Tracking
```json
{
  "totalThoughtsAdjusted": true,
  "originalEstimate": 5,
  "currentEstimate": 8,
  "adjustmentsMade": 1
}
```

### Revision Tracking
```json
{
  "revisionOf": 3,
  "sessionContext": {
    "revisionsMade": 2,
    "revisedThoughts": [2, 3]
  }
}
```

### Branch Tracking
```json
{
  "branches": ["a", "b"],
  "sessionContext": {
    "totalBranches": 2,
    "activeBranches": 2,
    "branchDepth": 3
  }
}
```

---

## Comparison: MCP vs Skill Output

### MCP Server Output (Metadata Only)
```json
{
  "thoughtNumber": 5,
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": ["alt-a"],
  "thoughtHistoryLength": 12
}
```

### Skill Output (Enhanced)
```json
{
  "thoughtNumber": 5,
  "thoughtContent": "Full thought text here...",
  "totalThoughts": 8,
  "nextThoughtNeeded": true,
  "branches": ["alt-a"],
  "thoughtHistoryLength": 12,
  "branchInfo": {
    "currentBranch": "alt-a",
    "fromThought": 3
  },
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 95,
    "recentThoughts": [...]
  }
}
```

**Enhancement:** Skill includes full context for transparency.

---

**For usage patterns, see:** [patterns.md](patterns.md)  
**For examples, see:** [../examples/](../examples/)  
**For parameters, see:** [parameters.md](parameters.md)
