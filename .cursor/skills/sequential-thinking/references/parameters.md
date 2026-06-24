# Sequential Thinking - Parameter Reference

Complete documentation for all 9 parameters.

## Required Parameters (4)

### `thought` (string)
**Description:** Your current thinking step

**Format:** Natural language text describing your reasoning

**Usage:**
```bash
/sequential-thinking "Step 1: Identify the core problem - slow API responses"
```

**Guidelines:**
- Be specific and detailed
- Include reasoning, not just conclusions
- Can span multiple sentences
- No length limit (but keep under 1000 chars for readability)

---

### `thoughtNumber` (number)
**Description:** Current thought number in sequence (1-100)

**Type:** Integer, minimum 1, maximum 100

**Default:** 1 (first thought)

**Usage:**
```bash
/sequential-thinking "Second thought..." thoughtNumber=2
```

**Validation:**
- Must be positive integer
- Must be sequential (1, 2, 3, ...)
- Auto-adjusts `totalThoughts` if exceeded

**Common patterns:**
```bash
# First thought
thoughtNumber=1

# Sequential continuation
thoughtNumber=2, thoughtNumber=3, ...

# Dynamic extension (beyond initial estimate)
thoughtNumber=6 totalThoughts=5  # Auto-adjusts to totalThoughts=6
```

---

### `totalThoughts` (number)
**Description:** Estimated total thoughts needed

**Type:** Integer, minimum 1

**Default:** 3

**Usage:**
```bash
/sequential-thinking "Starting..." thoughtNumber=1 totalThoughts=5
```

**Behavior:**
- Initial estimate (can be adjusted)
- Auto-increases if `thoughtNumber` exceeds it
- Used to calculate `remainingThoughts = 100 - totalThoughts`

**Patterns:**
```bash
# Short analysis (3-5 thoughts)
totalThoughts=3

# Medium analysis (5-10 thoughts)
totalThoughts=8

# Deep exploration (10-20 thoughts)
totalThoughts=15

# Let it grow dynamically
totalThoughts=3 → auto-adjusts to 6, 9, 12...
```

---

### `nextThoughtNeeded` (boolean)
**Description:** Whether another thought step is needed

**Type:** Boolean (true/false)

**Default:** true (continue thinking)

**Usage:**
```bash
# Continue thinking
/sequential-thinking "Analyzing..." nextThoughtNeeded=true

# Final thought
/sequential-thinking "Conclusion..." nextThoughtNeeded=false
```

**Flow control:**
- `true` → LLM should generate another thought
- `false` → Analysis complete, no more thoughts

**When to set false:**
- Reached satisfactory conclusion
- All branches explored
- Problem fully analyzed
- Solution identified and validated

---

## Optional Parameters (5)

### `isRevision` (boolean, optional)
**Description:** Whether this thought revises previous thinking

**Type:** Boolean

**Default:** false (regular thought)

**Usage:**
```bash
/sequential-thinking "Correcting my earlier assumption..." isRevision=true revisesThought=2
```

**When to use:**
- Realized earlier assumption was wrong
- New information contradicts previous thought
- Need to backtrack and correct course
- Found error in previous reasoning

**Visual indicator:**
- Regular: 💭 (blue)
- Revision: 🔄 (yellow)

---

### `revisesThought` (number, optional)
**Description:** Which thought number is being reconsidered

**Type:** Integer ≥ 1

**Required if:** `isRevision = true`

**Usage:**
```bash
/sequential-thinking "My thought #2 was incorrect..." isRevision=true revisesThought=2 thoughtNumber=5
```

**Validation:**
- Should reference existing thought
- Must be less than current `thoughtNumber`
- Can be chained (revising a revision)

**Example chain:**
```
Thought 1: "Use approach A"
Thought 2: "Implementing A..."
Thought 3: "A won't work, revise thought 1" (isRevision=true, revisesThought=1)
Thought 4: "Implementing revised approach..."
```

---

### `branchFromThought` (number, optional)
**Description:** Branching point thought number

**Type:** Integer ≥ 1

**Required if:** Using branching

**Usage:**
```bash
/sequential-thinking "Alternative approach..." branchFromThought=3 branchId="alternative"
```

**Branching patterns:**
```bash
# Single branch point
Thought 1 → Thought 2 → Thought 3 (branch point)
                          ├→ Branch A
                          ├→ Branch B
                          └→ Branch C

# Multiple branch points
Thought 1 → Thought 2 (branch) → Thought 3
              ├→ Branch X → Branch X.1 (sub-branch)
              └→ Branch Y
```

**Must be paired with:** `branchId`

---

### `branchId` (string, optional)
**Description:** Branch identifier

**Type:** String (any format, recommended: kebab-case)

**Required if:** Using branching

**Usage:**
```bash
/sequential-thinking "Exploring async..." branchFromThought=2 branchId="async-approach"
```

**Naming conventions:**
```bash
# Descriptive approach names
branchId="caching-layer"
branchId="microservices"
branchId="optimization-path"

# Alternative labels
branchId="option-a"
branchId="hypothesis-2"
branchId="fallback-plan"

# Hierarchical (if nesting)
branchId="main.sub-branch"
branchId="approach-a.variant-1"
```

**Tracking:**
- All branch IDs returned in `branches[]` array
- Deduplicated automatically
- Persists for session lifetime

---

### `needsMoreThoughts` (boolean, optional)
**Description:** If more thoughts are needed beyond current estimate

**Type:** Boolean

**Default:** false

**Usage:**
```bash
/sequential-thinking "This is more complex than expected..." thoughtNumber=5 totalThoughts=5 needsMoreThoughts=true
```

**Effect:**
- Signals that `totalThoughts` should increase
- Typically triggers +3 adjustment
- Used when hitting original estimate but not done

**Pattern:**
```
Initial: totalThoughts=5
Thought 5: needsMoreThoughts=true
Result: totalThoughts → 8
```

---

## Parameter Combinations

### Pattern 1: Simple Linear Sequence
```bash
/sequential-thinking "Thought 1" 1 3 true
/sequential-thinking "Thought 2" 2 3 true
/sequential-thinking "Thought 3" 3 3 false
```

---

### Pattern 2: With Revision
```bash
/sequential-thinking "Original idea" 1 3 true
/sequential-thinking "Building on idea..." 2 3 true
/sequential-thinking "Wait, revising original" 3 3 true isRevision=true revisesThought=1
/sequential-thinking "Corrected approach" 4 4 false
```

---

### Pattern 3: With Branching
```bash
/sequential-thinking "Main approach" 1 5 true
/sequential-thinking "Continuing main" 2 5 true
/sequential-thinking "Branch A: Alternative" 3 5 true branchFromThought=2 branchId="alt-a"
/sequential-thinking "Branch B: Another option" 4 5 true branchFromThought=2 branchId="alt-b"
/sequential-thinking "Synthesis of branches" 5 5 false
```

---

### Pattern 4: Dynamic Extension
```bash
/sequential-thinking "Starting..." 1 3 true
/sequential-thinking "Deeper than expected..." 3 3 true needsMoreThoughts=true
# System adjusts totalThoughts=6
/sequential-thinking "Continuing..." 4 6 true
```

---

## Validation Rules

### Type Validation (Zod Layer)
```typescript
thought: z.string()                          // Any string
thoughtNumber: z.number().int().min(1)       // Integer ≥ 1
totalThoughts: z.number().int().min(1)       // Integer ≥ 1
nextThoughtNeeded: z.boolean()               // true/false
isRevision: z.boolean().optional()           // Optional boolean
revisesThought: z.number().int().min(1).optional()
branchFromThought: z.number().int().min(1).optional()
branchId: z.string().optional()
needsMoreThoughts: z.boolean().optional()
```

### Runtime Validation (Processing Layer)
```typescript
// Auto-adjust if exceeded
if (thoughtNumber > totalThoughts) {
  totalThoughts = thoughtNumber;
}

// Require both for branching
if (branchFromThought && !branchId) {
  // Branch ignored (silently)
}

// Extension request
if (needsMoreThoughts) {
  totalThoughts += 3;
}
```

---

## Boolean String Coercion

**Why needed:** Standard `Boolean("false")` returns `true` (bug!)

**Custom handling:**
```typescript
// Correctly handles:
"true" / "True" / "TRUE" → true
"false" / "False" / "FALSE" → false
true / false → passthrough

// Rejects (throws error):
"yes", "no", "1", "0", 1, 0, null, undefined
```

---

## Default Values

| Parameter | Default | Used When |
|-----------|---------|-----------|
| `thoughtNumber` | 1 | First thought |
| `totalThoughts` | 3 | Initial estimate |
| `nextThoughtNeeded` | true | Continue by default |
| `isRevision` | false | Regular thought |
| `revisesThought` | undefined | Not a revision |
| `branchFromThought` | undefined | Not a branch |
| `branchId` | undefined | Not a branch |
| `needsMoreThoughts` | false | No extension |

---

## Common Mistakes

### ❌ Mistake 1: Missing branchId
```bash
# Won't track branch!
/sequential-thinking "Branch" branchFromThought=2
```

**Fix:**
```bash
/sequential-thinking "Branch" branchFromThought=2 branchId="my-branch"
```

---

### ❌ Mistake 2: Revision without target
```bash
# Which thought is being revised?
/sequential-thinking "Revising..." isRevision=true
```

**Fix:**
```bash
/sequential-thinking "Revising..." isRevision=true revisesThought=2
```

---

### ❌ Mistake 3: Thought number gaps
```bash
/sequential-thinking "Thought 1" 1 5
/sequential-thinking "Thought 5" 5 5  # Skip 2, 3, 4
```

**Fix:**
```bash
/sequential-thinking "Thought 1" 1 5
/sequential-thinking "Thought 2" 2 5
/sequential-thinking "Thought 3" 3 5
```

---

### ❌ Mistake 4: Not adjusting after needsMoreThoughts
```bash
/sequential-thinking "Need more..." 5 5 needsMoreThoughts=true
/sequential-thinking "Continuing..." 6 5  # Should be totalThoughts=8
```

**Fix:**
```bash
/sequential-thinking "Need more..." 5 5 needsMoreThoughts=true
# System auto-adjusts totalThoughts=8
/sequential-thinking "Continuing..." 6 8
```

---

## Quick Reference

### Minimal Invocation
```bash
/sequential-thinking "Your thought here"
# Uses defaults: thoughtNumber=1, totalThoughts=3, nextThoughtNeeded=true
```

### Full Explicit Invocation
```bash
/sequential-thinking thought="Full analysis" thoughtNumber=5 totalThoughts=10 nextThoughtNeeded=true isRevision=false
```

### Revision
```bash
/sequential-thinking "Correcting earlier" isRevision=true revisesThought=2
```

### Branch
```bash
/sequential-thinking "Alternative path" branchFromThought=3 branchId="alt-approach"
```

### Final Thought
```bash
/sequential-thinking "Conclusion reached" nextThoughtNeeded=false
```

---

**For more details:**
- [output-schema.md](output-schema.md) - Response structure
- [patterns.md](patterns.md) - Usage patterns
- [../examples/](../examples/) - Real examples
