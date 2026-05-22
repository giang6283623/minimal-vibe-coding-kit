# Linear Reasoning - Example

## Scenario: API Performance Optimization

**Problem:** API response times are slow (800ms P95)

**Pattern:** Linear Sequence (straightforward problem with clear steps)

**Estimated thoughts:** 6

---

## Thought Sequence

### Thought 1: Problem Statement

**Input:**
```bash
/sequential-thinking "Problem: API P95 latency is 800ms, users complaining about slowness. Need to optimize." thoughtNumber=1 totalThoughts=6 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 1,
  "thoughtContent": "Problem: API P95 latency is 800ms, users complaining about slowness. Need to optimize.",
  "totalThoughts": 6,
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

### Thought 2: Measurement & Data Collection

**Input:**
```bash
/sequential-thinking "Measured endpoint breakdown: /users takes 650ms, /products takes 120ms, /orders takes 400ms. The /users endpoint is the bottleneck." thoughtNumber=2 totalThoughts=6 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 2,
  "thoughtContent": "Measured endpoint breakdown: /users takes 650ms, /products takes 120ms, /orders takes 400ms. The /users endpoint is the bottleneck.",
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 2,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 98,
    "recentThoughts": [
      {"number": 2, "preview": "Measured endpoint breakdown: /users takes 650ms..."},
      {"number": 1, "preview": "Problem: API P95 latency is 800ms, users comp..."}
    ]
  }
}
```

---

### Thought 3: Root Cause Analysis

**Input:**
```bash
/sequential-thinking "Profiled /users endpoint: 600ms spent in database query. Query analysis shows N+1 problem - fetching user roles individually in a loop instead of batch query." thoughtNumber=3 totalThoughts=6 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 3,
  "thoughtContent": "Profiled /users endpoint: 600ms spent in database query. Query analysis shows N+1 problem - fetching user roles individually in a loop instead of batch query.",
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 3,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 97
  }
}
```

---

### Thought 4: Solution Design

**Input:**
```bash
/sequential-thinking "Solution: Use JOIN query to fetch users with roles in single database roundtrip. Expected improvement: 600ms → 50ms (12x faster). Implementation: Modify UserRepository.getUsers() to use eager loading." thoughtNumber=4 totalThoughts=6 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 4,
  "thoughtContent": "Solution: Use JOIN query to fetch users with roles in single database roundtrip. Expected improvement: 600ms → 50ms (12x faster). Implementation: Modify UserRepository.getUsers() to use eager loading.",
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 4,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 96
  }
}
```

---

### Thought 5: Implementation & Validation

**Input:**
```bash
/sequential-thinking "Implemented eager loading. Testing results: P95 latency reduced from 800ms → 180ms (4.4x improvement). All functionality working correctly. N+1 problem eliminated." thoughtNumber=5 totalThoughts=6 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 5,
  "thoughtContent": "Implemented eager loading. Testing results: P95 latency reduced from 800ms → 180ms (4.4x improvement). All functionality working correctly. N+1 problem eliminated.",
  "totalThoughts": 6,
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

### Thought 6: Conclusion & Next Steps

**Input:**
```bash
/sequential-thinking "Conclusion: Optimization successful. Next steps: 1) Add database indexes on foreign keys for further improvement, 2) Monitor latency metrics for next week, 3) Apply same pattern to /orders endpoint. Analysis complete." thoughtNumber=6 totalThoughts=6 nextThoughtNeeded=false
```

**Output:**
```json
{
  "thoughtNumber": 6,
  "thoughtContent": "Conclusion: Optimization successful. Next steps: 1) Add database indexes on foreign keys for further improvement, 2) Monitor latency metrics for next week, 3) Apply same pattern to /orders endpoint. Analysis complete.",
  "totalThoughts": 6,
  "nextThoughtNeeded": false,
  "branches": [],
  "thoughtHistoryLength": 6,
  "status": "complete",
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 94,
    "recentThoughts": [
      {"number": 6, "preview": "Conclusion: Optimization successful. Next steps..."},
      {"number": 5, "preview": "Implemented eager loading. Testing results: P9..."},
      {"number": 4, "preview": "Solution: Use JOIN query to fetch users with r..."}
    ]
  }
}
```

---

## Analysis Summary

**Pattern Used:** Linear Sequence  
**Total Thoughts:** 6  
**Revisions:** 0  
**Branches:** 0  
**Result:** Clear, actionable solution  

**Thought Breakdown:**
1. Problem identification ✅
2. Data collection ✅
3. Root cause analysis ✅
4. Solution design ✅
5. Implementation & validation ✅
6. Conclusion & next steps ✅

**Time:** ~10 minutes  
**Outcome:** 4.4x performance improvement

---

## Why Linear Pattern Worked

✅ **Clear problem**: Slow API with measurable metrics  
✅ **Predictable steps**: Measure → Analyze → Fix → Validate  
✅ **Single solution**: N+1 problem had clear fix  
✅ **No branches needed**: Solution path was obvious once identified  

**When to use linear:** Problems with clear causation and straightforward solutions.

---

**For other patterns, see:**
- [revision-pattern.md](revision-pattern.md) - Correcting assumptions
- [branching-exploration.md](branching-exploration.md) - Multiple approaches
- [adaptive-depth.md](adaptive-depth.md) - Uncertain scope
