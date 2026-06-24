# Sequential Thinking - Usage Patterns

Comprehensive guide to reasoning patterns with Sequential Thinking.

## Core Patterns

### Pattern 1: Linear Sequence

**Use for:** Straightforward problems with clear progression

**Structure:**
```
Thought 1 → Thought 2 → Thought 3 → ... → Conclusion
```

**Example:**
```bash
/sequential-thinking "Problem: Slow API performance" 1 5 true
/sequential-thinking "Measure: P95 latency is 800ms" 2 5 true
/sequential-thinking "Analyze: Database queries are bottleneck" 3 5 true
/sequential-thinking "Solution: Add database indexes" 4 5 true
/sequential-thinking "Validation: Latency reduced to 120ms" 5 5 false
```

**When to use:**
- Clear problem statement
- Predictable analysis steps
- Sequential dependencies

---

### Pattern 2: Revision Chain

**Use for:** Problems where initial assumptions may be wrong

**Structure:**
```
Thought 1 → Thought 2 → [Revision of 1] → Thought 3 (corrected path)
```

**Example:**
```bash
/sequential-thinking "Hypothesis: Caching will solve it" 1 5 true
/sequential-thinking "Implementing Redis cache..." 2 5 true
/sequential-thinking "Testing shows no improvement - cache wasn't the issue" 3 5 true isRevision=true revisesThought=1
/sequential-thinking "Real cause: N+1 query problem" 4 5 true
/sequential-thinking "Solution: Eager loading relationships" 5 5 false
```

**When to use:**
- Hypothesis-driven analysis
- Uncertain root cause
- Trial-and-error exploration

---

### Pattern 3: Branching Exploration

**Use for:** Comparing multiple approaches

**Structure:**
```
        ├→ Branch A (approach 1)
Thought 1 → Thought 2 ├→ Branch B (approach 2) → Synthesis
        └→ Branch C (approach 3)
```

**Example:**
```bash
/sequential-thinking "Need to choose state management" 1 8 true
/sequential-thinking "Options: Redux, MobX, Context API" 2 8 true

# Branch A: Redux
/sequential-thinking "Redux: Predictable, great DevTools" 3 8 true branchFromThought=2 branchId="redux"
/sequential-thinking "Redux: More boilerplate needed" 4 8 true branchFromThought=2 branchId="redux"

# Branch B: MobX
/sequential-thinking "MobX: Simple, reactive" 5 8 true branchFromThought=2 branchId="mobx"
/sequential-thinking "MobX: Magic can be confusing" 6 8 true branchFromThought=2 branchId="mobx"

# Branch C: Context
/sequential-thinking "Context: Built-in, no deps" 7 8 true branchFromThought=2 branchId="context"

# Synthesis
/sequential-thinking "Decision: Redux for large apps, Context for small" 8 8 false
```

**When to use:**
- Multiple valid approaches
- Need to compare pros/cons
- Uncertain best path

---

### Pattern 4: Adaptive Depth

**Use for:** Problems where scope isn't initially clear

**Structure:**
```
Initial estimate → Discovery → Adjustment → Extended analysis
(totalThoughts=3)              (needsMore)  (totalThoughts=6)
```

**Example:**
```bash
/sequential-thinking "Analyzing microservices migration" 1 3 true
/sequential-thinking "Identifying services..." 2 3 true
/sequential-thinking "This is more complex than expected - many dependencies" 3 3 true needsMoreThoughts=true
# Auto-adjusts: totalThoughts=6
/sequential-thinking "Mapping service boundaries" 4 6 true
/sequential-thinking "Planning data migration strategy" 5 6 true
/sequential-thinking "Conclusion with migration plan" 6 6 false
```

**When to use:**
- Uncertain problem complexity
- Exploratory analysis
- Open-ended questions

---

### Pattern 5: Hybrid (Revision + Branching)

**Use for:** Complex problems requiring both correction and exploration

**Structure:**
```
Thought 1 → Thought 2 (revise 1) → Thought 3 (branch point)
                                      ├→ Branch A
                                      └→ Branch B → Synthesis
```

**Example:**
```bash
/sequential-thinking "Approach: Optimize with caching" 1 8 true
/sequential-thinking "Actually, profiling shows DB is fast" 2 8 true isRevision=true revisesThought=1
/sequential-thinking "Real bottleneck: API serialization" 3 8 true

# Explore solutions
/sequential-thinking "Option: Use MessagePack" 4 8 true branchFromThought=3 branchId="messagepack"
/sequential-thinking "Option: Stream responses" 5 8 true branchFromThought=3 branchId="streaming"
/sequential-thinking "Option: Optimize JSON" 6 8 true branchFromThought=3 branchId="json-opt"

# Decide
/sequential-thinking "Comparison: Streaming has best ROI" 7 8 true
/sequential-thinking "Implementation plan: Use HTTP streaming" 8 8 false
```

**When to use:**
- Complex problems
- Multiple uncertainties
- Need both correction and comparison

---

## Advanced Patterns

### Pattern 6: Depth-First Branch Exploration

**Structure:**
```
Main → Branch A → Branch A.1 → Branch A.2
                    └→ Branch A.1.x
```

**Example:**
```bash
/sequential-thinking "Root problem" 1 10 true
/sequential-thinking "Exploring authentication" 2 10 true branchFromThought=1 branchId="auth"
/sequential-thinking "JWT sub-option" 3 10 true branchFromThought=2 branchId="auth.jwt"
/sequential-thinking "OAuth sub-option" 4 10 true branchFromThought=2 branchId="auth.oauth"
/sequential-thinking "Back to main: Decision made" 5 10 false
```

**When to use:**
- Hierarchical problem breakdown
- Nested decision trees
- Deep exploration of one path

---

### Pattern 7: Breadth-First Branch Exploration

**Structure:**
```
Main → Branch A (shallow)
     → Branch B (shallow)
     → Branch C (shallow)
     → Synthesis
```

**Example:**
```bash
/sequential-thinking "Identify options" 1 7 true
/sequential-thinking "Quick check: Option A" 2 7 true branchFromThought=1 branchId="a"
/sequential-thinking "Quick check: Option B" 3 7 true branchFromThought=1 branchId="b"
/sequential-thinking "Quick check: Option C" 4 7 true branchFromThought=1 branchId="c"
/sequential-thinking "All explored, comparing..." 5 7 true
/sequential-thinking "Option B best fits requirements" 6 7 true
/sequential-thinking "Recommendation: Proceed with B" 7 7 false
```

**When to use:**
- Survey multiple options
- Rapid comparison
- Time-constrained analysis

---

### Pattern 8: Iterative Refinement

**Structure:**
```
Hypothesis → Test → Revise → Test → Revise → Validate
```

**Example:**
```bash
/sequential-thinking "Hypothesis: Algorithm is O(n²)" 1 8 true
/sequential-thinking "Test: Small input works fine" 2 8 true
/sequential-thinking "Test: Large input times out" 3 8 true
/sequential-thinking "Revision: Actually O(n³) nested loops" 4 8 true isRevision=true revisesThought=1
/sequential-thinking "Fix: Remove inner loop" 5 8 true
/sequential-thinking "Test: Performance improved 10x" 6 8 true
/sequential-thinking "Validation: Complexity now O(n)" 7 8 true
/sequential-thinking "Confirmed: Problem solved" 8 8 false
```

**When to use:**
- Hypothesis testing
- Performance optimization
- Iterative debugging

---

## Integration Patterns

### Pattern 9: Sequential → ClearThought → Sequential

**Hybrid workflow for comprehensive analysis:**

```bash
# Phase 1: Explore with Sequential Thinking
/sequential-thinking "Problem: Choose database" 1 3 true
/sequential-thinking "Options: PostgreSQL vs MongoDB" 2 3 true
/sequential-thinking "Need structured decision framework" 3 3 false

# Phase 2: Analyze with ClearThought
/clearthought decision_framework framework=decision_matrix PostgreSQL vs MongoDB

# Phase 3: Synthesize with Sequential Thinking
/sequential-thinking "Based on decision analysis: PostgreSQL wins" 4 5 true
/sequential-thinking "Implementation plan: Setup PostgreSQL cluster" 5 5 false
```

**When to use:**
- Complex decisions
- Need both exploration and structured analysis
- Combining qualitative and quantitative reasoning

---

### Pattern 10: ClearThought → Sequential → ClearThought

**Specialized → Exploration → Specialized:**

```bash
# Phase 1: Initial analysis with ClearThought
/clearthought statistical_reasoning mode=descriptive Analyze API response times: [120, 145, 203, ...]

# Phase 2: Deep dive with Sequential Thinking
/sequential-thinking "Stats show high variance - investigating..." 1 5 true
/sequential-thinking "Hypothesis: Database connection pool issues" 2 5 true
/sequential-thinking "Verified: Pool size is 5, need 20" 3 5 false

# Phase 3: Optimization with ClearThought
/clearthought optimization type=gradient_descent Optimize pool size vs latency
```

**When to use:**
- Data-driven problems
- Need exploration after initial analysis
- Optimization scenarios

---

## Anti-Patterns (Don't Do This)

### ❌ Anti-Pattern 1: Skipping Thought Numbers

```bash
/sequential-thinking "Thought 1" 1 5
/sequential-thinking "Thought 5" 5 5  # Skip 2,3,4
```

**Why bad:** Breaks sequence integrity, confuses history tracking

**Fix:** Use sequential numbers (1, 2, 3, 4, 5)

---

### ❌ Anti-Pattern 2: Premature Conclusion

```bash
/sequential-thinking "Problem identified" 1 10 true
/sequential-thinking "Conclusion: Fix it" 2 10 false  # Too early!
```

**Why bad:** Incomplete analysis, missing insights

**Fix:** Use realistic `totalThoughts`, explore thoroughly

---

### ❌ Anti-Pattern 3: Orphan Branches

```bash
/sequential-thinking "Main thought" 1 5
/sequential-thinking "Branch A" branchFromThought=1 branchId="a"
/sequential-thinking "Branch B" branchFromThought=1 branchId="b"
/sequential-thinking "Conclusion" 4 5 nextThoughtNeeded=false
# Never synthesized branches!
```

**Why bad:** Wasted exploration, no synthesis

**Fix:** Always synthesize/compare branches before concluding

---

### ❌ Anti-Pattern 4: Meaningless Revisions

```bash
/sequential-thinking "Thought 1" 1 5
/sequential-thinking "Revising for no reason" 2 5 isRevision=true revisesThought=1
```

**Why bad:** Revision without new insight

**Fix:** Only revise when new information contradicts previous thought

---

## Best Practices

### ✅ Do:
1. Start with realistic estimate (3-5 thoughts)
2. Revise when new insights contradict assumptions
3. Branch when multiple approaches merit exploration
4. Extend dynamically when complexity emerges
5. Synthesize branches before concluding
6. Set `nextThoughtNeeded=false` only when truly done

### ❌ Don't:
1. Skip thought numbers
2. Set unrealistic high totals initially
3. Create orphan branches (explore but don't synthesize)
4. Revise without clear reason
5. End prematurely
6. Exceed 100 thoughts (summarize instead)

---

## Pattern Selection Guide

```
Start here: What's your problem?
  │
  ├─ Clear steps known? → Pattern 1: Linear Sequence
  │
  ├─ Assumptions might be wrong? → Pattern 2: Revision Chain
  │
  ├─ Multiple approaches to compare? → Pattern 3: Branching
  │
  ├─ Scope unclear? → Pattern 4: Adaptive Depth
  │
  └─ Complex with unknowns? → Pattern 5: Hybrid
```

---

## Real-World Examples

### Example 1: System Architecture Decision

**Problem:** "Should we use microservices or monolith?"

**Pattern:** Branching Exploration (Pattern 3)

**Flow:**
1. Problem statement
2. List criteria (scalability, complexity, team size)
3. Branch A: Analyze microservices
4. Branch B: Analyze monolith
5. Branch C: Analyze modular monolith
6. Compare branches
7. Decide based on criteria
8. Conclusion with recommendation

---

### Example 2: Bug Investigation

**Problem:** "API randomly returns 500 errors"

**Pattern:** Revision Chain (Pattern 2)

**Flow:**
1. Hypothesis: Load balancer issue
2. Test: Check load balancer logs
3. Revision: Not load balancer - database connection timeouts
4. Hypothesis 2: Connection pool too small
5. Test: Increase pool size
6. Validation: Errors eliminated
7. Conclusion: Pool size was 5, needed 20

---

### Example 3: Feature Planning

**Problem:** "Plan authentication feature implementation"

**Pattern:** Linear Sequence (Pattern 1)

**Flow:**
1. Requirements gathering
2. Technology selection (JWT vs OAuth)
3. Database schema design
4. API endpoint design
5. Security considerations
6. Testing strategy
7. Rollout plan
8. Documentation needs

---

### Example 4: Research Paper Analysis

**Problem:** "Understand and critique research paper"

**Pattern:** Adaptive Depth (Pattern 4)

**Flow:**
1. Read abstract (estimate 5 thoughts)
2. Read methodology
3. Realize complexity → needsMoreThoughts (now 8)
4. Analyze results section
5. Statistical validation deep dive
6. Related work comparison
7. Critical evaluation
8. Summary and implications

---

## Workflow Integration

### With ClearThought Operations

**Exploration → Analysis → Decision:**

```bash
# 1. Sequential Thinking: Break down problem
/sequential-thinking "What factors matter for database choice?" 1 3

# 2. ClearThought: Structured decision
/clearthought decision_framework framework=decision_matrix Options: PostgreSQL, MongoDB, DynamoDB

# 3. Sequential Thinking: Synthesize
/sequential-thinking "Based on analysis, PostgreSQL best for ACID requirements" 4 5 false
```

---

### With Multiple Tools

**Complex workflow:**

```bash
# 1. Sequential: Initial exploration
/sequential-thinking "Performance issue analysis" 1 5

# 2. ClearThought: Statistical analysis
/clearthought statistical_reasoning mode=descriptive data=[response_times]

# 3. Sequential: Interpret statistics
/sequential-thinking "Stats show bimodal distribution..." 6 10

# 4. ClearThought: Debug approach
/clearthought debugging_approach binary_search Isolate slow requests

# 5. Sequential: Conclusion
/sequential-thinking "Root cause identified: Uncached queries" 10 10 false
```

---

## Pattern Templates

### Template 1: Problem Breakdown

```
1. Problem statement (what, why, who affected)
2. Context and constraints
3. Requirements gathering
4. Options identification
5. Analysis of each option
6. Comparison and ranking
7. Decision with rationale
8. Implementation plan
```

---

### Template 2: Root Cause Analysis

```
1. Symptom description
2. Data gathering
3. Hypothesis generation
4. Test hypothesis
5. [Revision if wrong] New hypothesis
6. [Repeat 4-5 until found]
7. Root cause identified
8. Solution proposed and validated
```

---

### Template 3: Design Exploration

```
1. Design goals and constraints
2. Brainstorm approaches
3. Branch A: First approach detailed
4. Branch B: Second approach detailed
5. Branch C: Third approach detailed
6. Evaluation criteria
7. Comparison across branches
8. Recommended design with justification
```

---

### Template 4: Research Synthesis

```
1. Topic and research question
2. Key papers/sources identified
3. Summary of source 1
4. Summary of source 2
5. Summary of source 3
6. Common themes across sources
7. Contradictions and debates
8. Synthesis and conclusions
```

---

## Thought Progression Strategies

### Strategy A: Start Small, Grow Organically

```
Initial: totalThoughts=3
Reality: Grows to 5, then 8, then 12 as complexity emerges
```

**Benefits:** Flexible, responsive to problem complexity

---

### Strategy B: Conservative Estimate

```
Initial: totalThoughts=10
Reality: Finish at thought 7, extrathoughts unused
```

**Benefits:** Room for exploration, no premature conclusions

---

### Strategy C: Fixed Depth

```
Initial: totalThoughts=8 (fixed)
Reality: Exactly 8 thoughts, no more, no less
```

**Benefits:** Structured, time-boxed, disciplined

---

## Debugging Patterns

### Pattern: Binary Search with Revisions

```bash
/sequential-thinking "Bug: API fails on large requests" 1 10 true
/sequential-thinking "Hypothesis: Request size limit" 2 10 true
/sequential-thinking "Test: Small request (100 items) works" 3 10 true
/sequential-thinking "Test: Large request (10k items) fails" 4 10 true
/sequential-thinking "Test: Medium (1k items) fails" 5 10 true
/sequential-thinking "Revision: Not size, but timeout" 6 10 true isRevision=true revisesThought=2
/sequential-thinking "Test: Increase timeout" 7 10 true
/sequential-thinking "Validation: Works with 60s timeout" 8 10 true
/sequential-thinking "Root cause: Default 30s too short" 9 10 true
/sequential-thinking "Solution: Set timeout to 60s" 10 10 false
```

---

## Optimization Patterns

### Pattern: Explore → Measure → Optimize

```bash
/sequential-thinking "Performance bottleneck identification" 1 8 true
/sequential-thinking "Profiling shows database queries take 80% time" 2 8 true

# Branch: Different optimization approaches
/sequential-thinking "Approach: Add indexes" 3 8 true branchFromThought=2 branchId="indexes"
/sequential-thinking "Approach: Query optimization" 4 8 true branchFromThought=2 branchId="queries"
/sequential-thinking "Approach: Caching layer" 5 8 true branchFromThought=2 branchId="cache"

/sequential-thinking "Measuring each: Indexes give 10x improvement" 6 8 true
/sequential-thinking "Decision: Indexes first, cache later" 7 8 true
/sequential-thinking "Implementation plan for indexes" 8 8 false
```

---

## When to Stop

### Stop When:
✅ Problem fully analyzed
✅ All branches explored and synthesized
✅ Solution identified and validated
✅ No more insights to gain
✅ Diminishing returns on additional thoughts

### Don't Stop When:
❌ Approaching thought estimate (keep going if needed)
❌ Branches not synthesized
❌ Solution untested
❌ Uncertainty remains
❌ Stakeholder concerns unaddressed

---

## Pattern Metrics

| Pattern | Avg Thoughts | Time Estimate | Complexity |
|---------|-------------|---------------|------------|
| Linear Sequence | 5-8 | 5-10 min | Low |
| Revision Chain | 8-12 | 10-15 min | Medium |
| Branching | 10-15 | 15-25 min | High |
| Adaptive Depth | 5-20 | Variable | Medium |
| Hybrid | 12-20 | 20-30 min | High |

---

**For complete examples, see:** [../examples/](../examples/)  
**For parameters, see:** [parameters.md](parameters.md)  
**For output format, see:** [output-schema.md](output-schema.md)
