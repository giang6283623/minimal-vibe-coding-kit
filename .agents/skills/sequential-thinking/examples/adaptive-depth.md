# Adaptive Depth - Example

## Scenario: Microservices Migration Analysis

**Problem:** Assess feasibility of migrating monolith to microservices

**Pattern:** Adaptive Depth (initially simple, grows as complexity emerges)

**Initial estimate:** 3 thoughts (simple assessment)  
**Final count:** 15 thoughts (complexity discovered during analysis)

---

## Phase 1: Initial Assessment (Thoughts 1-3)

### Thought 1: Problem Statement

**Input:**
```bash
/sequential-thinking "Task: Assess microservices migration for our monolithic application. Initial scope: high-level pros/cons. Estimate: 3 thoughts should suffice." thoughtNumber=1 totalThoughts=3 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 1,
  "thoughtContent": "Task: Assess microservices migration for our monolithic application. Initial scope: high-level pros/cons. Estimate: 3 thoughts should suffice.",
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

### Thought 2: High-Level Benefits

**Input:**
```bash
/sequential-thinking "Microservices benefits: Independent deployment, technology flexibility, better scalability, team autonomy. Seems promising for our growing team (now 20 developers)." thoughtNumber=2 totalThoughts=3 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 2,
  "thoughtContent": "Microservices benefits: Independent deployment, technology flexibility, better scalability, team autonomy. Seems promising for our growing team (now 20 developers).",
  "totalThoughts": 3,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 2,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 98
  }
}
```

---

### Thought 3: Discovery (Complexity Emerges)

**Input:**
```bash
/sequential-thinking "Wait - looking at our codebase... This is more complex than I thought. We have 150+ database tables, 300+ API endpoints, tightly coupled business logic. Simple assessment won't work - need deep analysis of service boundaries, data migration, transaction handling. Adjusting scope." thoughtNumber=3 totalThoughts=3 nextThoughtNeeded=true needsMoreThoughts=true
```

**Output:**
```json
{
  "thoughtNumber": 3,
  "thoughtContent": "Wait - looking at our codebase... This is more complex than I thought. We have 150+ database tables, 300+ API endpoints, tightly coupled business logic. Simple assessment won't work - need deep analysis of service boundaries, data migration, transaction handling. Adjusting scope.",
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 3,
  "totalThoughtsAdjusted": true,
  "originalEstimate": 3,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 97
  }
}
```

---

## Phase 2: Deep Dive (Thoughts 4-8)

### Thought 4: Service Boundary Analysis

**Input:**
```bash
/sequential-thinking "Analyzing service boundaries using Domain-Driven Design. Identified potential bounded contexts: 1) User Management, 2) Product Catalog, 3) Order Processing, 4) Payment, 5) Shipping, 6) Notifications, 7) Analytics. Each context has 15-30 tables." thoughtNumber=4 totalThoughts=6 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 4,
  "thoughtContent": "Analyzing service boundaries using Domain-Driven Design. Identified potential bounded contexts: 1) User Management, 2) Product Catalog, 3) Order Processing, 4) Payment, 5) Shipping, 6) Notifications, 7) Analytics. Each context has 15-30 tables.",
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

### Thought 5: Data Dependency Discovery

**Input:**
```bash
/sequential-thinking "Problem discovered: Cross-context joins everywhere! Order Processing joins Users (for customer info), Products (for inventory), Payment (for status), Shipping (for address). 50+ cross-boundary queries. This will require significant data denormalization and eventual consistency. Complexity way higher than expected." thoughtNumber=5 totalThoughts=6 nextThoughtNeeded=true needsMoreThoughts=true
```

**Output:**
```json
{
  "thoughtNumber": 5,
  "thoughtContent": "Problem discovered: Cross-context joins everywhere! Order Processing joins Users (for customer info), Products (for inventory), Payment (for status), Shipping (for address). 50+ cross-boundary queries. This will require significant data denormalization and eventual consistency. Complexity way higher than expected.",
  "totalThoughts": 9,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 5,
  "totalThoughtsAdjusted": true,
  "originalEstimate": 6,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 95
  }
}
```

---

### Thought 6: Transaction Management

**Input:**
```bash
/sequential-thinking "Transaction analysis: 30 critical workflows require ACID transactions across multiple contexts. Example: CreateOrder needs atomic updates to Orders, Inventory, Payment, Shipping. Monolith uses database transactions. Microservices would need distributed transactions (Saga pattern) or accept eventual consistency. Major architectural challenge." thoughtNumber=6 totalThoughts=9 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 6,
  "thoughtContent": "Transaction analysis: 30 critical workflows require ACID transactions across multiple contexts. Example: CreateOrder needs atomic updates to Orders, Inventory, Payment, Shipping. Monolith uses database transactions. Microservices would need distributed transactions (Saga pattern) or accept eventual consistency. Major architectural challenge.",
  "totalThoughts": 9,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 6,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 94
  }
}
```

---

### Thought 7: Infrastructure Requirements

**Input:**
```bash
/sequential-thinking "Infrastructure needs: 7 services × 3 environments (dev/staging/prod) = 21 deployments, service discovery (Consul/Eureka), API gateway, distributed tracing (Jaeger), centralized logging (ELK), monitoring (Prometheus/Grafana), CI/CD pipelines for each service. DevOps complexity increases 10x." thoughtNumber=7 totalThoughts=9 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 7,
  "thoughtContent": "Infrastructure needs: 7 services × 3 environments (dev/staging/prod) = 21 deployments, service discovery (Consul/Eureka), API gateway, distributed tracing (Jaeger), centralized logging (ELK), monitoring (Prometheus/Grafana), CI/CD pipelines for each service. DevOps complexity increases 10x.",
  "totalThoughts": 9,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 7,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 93
  }
}
```

---

### Thought 8: Team & Timeline

**Input:**
```bash
/sequential-thinking "Team capacity: 20 developers, no microservices experience. Training needed: 2-3 months. Migration strategy: Can't big-bang (too risky), need strangler pattern. Estimated timeline: 18-24 months for full migration. Business wants results in 6 months. Timeline conflict discovered." thoughtNumber=8 totalThoughts=9 nextThoughtNeeded=true needsMoreThoughts=true
```

**Output:**
```json
{
  "thoughtNumber": 8,
  "thoughtContent": "Team capacity: 20 developers, no microservices experience. Training needed: 2-3 months. Migration strategy: Can't big-bang (too risky), need strangler pattern. Estimated timeline: 18-24 months for full migration. Business wants results in 6 months. Timeline conflict discovered.",
  "totalThoughts": 12,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 8,
  "totalThoughtsAdjusted": true,
  "originalEstimate": 9,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 92
  }
}
```

---

## Phase 3: Alternatives & Decision (Thoughts 9-15)

### Thought 9: Alternative Consideration

**Input:**
```bash
/sequential-thinking "Given complexity, considering alternative: Modular Monolith. Benefits: Maintains ACID transactions, simpler deployment, faster delivery (6 months achievable), team already knows stack. Still achieves: clear boundaries, independent modules, future microservices path. Less complexity upfront." thoughtNumber=9 totalThoughts=12 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 9,
  "thoughtContent": "Given complexity, considering alternative: Modular Monolith. Benefits: Maintains ACID transactions, simpler deployment, faster delivery (6 months achievable), team already knows stack. Still achieves: clear boundaries, independent modules, future microservices path. Less complexity upfront.",
  "totalThoughts": 12,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 9,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 91
  }
}
```

---

### Thought 10: Cost Analysis

**Input:**
```bash
/sequential-thinking "Cost comparison: Microservices migration: $2M (infra + dev time + training + tools) over 24 months. Modular Monolith refactoring: $500K over 6 months. Microservices annual ops cost: $200K/year. Modular monolith ops: $80K/year. 4x cost difference for uncertain benefits." thoughtNumber=10 totalThoughts=12 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 10,
  "thoughtContent": "Cost comparison: Microservices migration: $2M (infra + dev time + training + tools) over 24 months. Modular Monolith refactoring: $500K over 6 months. Microservices annual ops cost: $200K/year. Modular monolith ops: $80K/year. 4x cost difference for uncertain benefits.",
  "totalThoughts": 12,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 10,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 90
  }
}
```

---

### Thought 11: Risk Assessment

**Input:**
```bash
/sequential-thinking "Risk analysis: Microservices risks: Data consistency issues, distributed system complexity, team inexperience, timeline overrun (high probability). Modular Monolith risks: Eventual scaling limits (mitigated by vertical scaling), future microservices migration cost (but only if needed). Modular monolith has lower risk profile." thoughtNumber=11 totalThoughts=12 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 11,
  "thoughtContent": "Risk analysis: Microservices risks: Data consistency issues, distributed system complexity, team inexperience, timeline overrun (high probability). Modular Monolith risks: Eventual scaling limits (mitigated by vertical scaling), future microservices migration cost (but only if needed). Modular monolith has lower risk profile.",
  "totalThoughts": 12,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 11,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 89
  }
}
```

---

### Thought 12: Business Value Analysis

**Input:**
```bash
/sequential-thinking "Business value assessment: Key business need is faster feature delivery (current: 2-week cycle, want: 3-day cycle). Microservices enables: parallel team work, independent deployment. Modular Monolith also enables: clear module boundaries, parallel development, faster CI/CD. Both achieve business goal, but modular monolith delivers sooner." thoughtNumber=12 totalThoughts=12 nextThoughtNeeded=true needsMoreThoughts=true
```

**Output:**
```json
{
  "thoughtNumber": 12,
  "thoughtContent": "Business value assessment: Key business need is faster feature delivery (current: 2-week cycle, want: 3-day cycle). Microservices enables: parallel team work, independent deployment. Modular Monolith also enables: clear module boundaries, parallel development, faster CI/CD. Both achieve business goal, but modular monolith delivers sooner.",
  "totalThoughts": 15,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 12,
  "totalThoughtsAdjusted": true,
  "originalEstimate": 12,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 88
  }
}
```

---

### Thought 13: Recommendation

**Input:**
```bash
/sequential-thinking "RECOMMENDATION: Start with Modular Monolith refactoring. Rationale: 1) Meets 6-month timeline, 2) 4x cheaper, 3) Lower risk, 4) Achieves business goals, 5) Keeps microservices option for future. Strategy: Refactor into modules now, extract to microservices later IF needed (not all services, just bottlenecks)." thoughtNumber=13 totalThoughts=15 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 13,
  "thoughtContent": "RECOMMENDATION: Start with Modular Monolith refactoring. Rationale: 1) Meets 6-month timeline, 2) 4x cheaper, 3) Lower risk, 4) Achieves business goals, 5) Keeps microservices option for future. Strategy: Refactor into modules now, extract to microservices later IF needed (not all services, just bottlenecks).",
  "totalThoughts": 15,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 13,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 87
  }
}
```

---

### Thought 14: Implementation Phases

**Input:**
```bash
/sequential-thinking "Implementation plan (6 months): Month 1-2: Define module boundaries (DDD), create module interfaces. Month 3-4: Refactor code into modules, introduce dependency rules. Month 5: Extract database per module (shared DB, separate schemas). Month 6: Independent deployable units (still in one repo), module-level CI/CD." thoughtNumber=14 totalThoughts=15 nextThoughtNeeded=true
```

**Output:**
```json
{
  "thoughtNumber": 14,
  "thoughtContent": "Implementation plan (6 months): Month 1-2: Define module boundaries (DDD), create module interfaces. Month 3-4: Refactor code into modules, introduce dependency rules. Month 5: Extract database per module (shared DB, separate schemas). Month 6: Independent deployable units (still in one repo), module-level CI/CD.",
  "totalThoughts": 15,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 14,
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 86
  }
}
```

---

### Thought 15: Conclusion & Decision Criteria

**Input:**
```bash
/sequential-thinking "Conclusion: What started as 3-thought assessment revealed 15 thoughts of complexity. Key learning: Microservices are not inherently better - context matters. Our context (tight data coupling, inexperienced team, 6-month timeline) favors modular monolith. Future decision point: Extract to microservices only if module hits 100+ req/sec or needs independent scaling. Analysis complete." thoughtNumber=15 totalThoughts=15 nextThoughtNeeded=false
```

**Output:**
```json
{
  "thoughtNumber": 15,
  "thoughtContent": "Conclusion: What started as 3-thought assessment revealed 15 thoughts of complexity. Key learning: Microservices are not inherently better - context matters. Our context (tight data coupling, inexperienced team, 6-month timeline) favors modular monolith. Future decision point: Extract to microservices only if module hits 100+ req/sec or needs independent scaling. Analysis complete.",
  "totalThoughts": 15,
  "nextThoughtNeeded": false,
  "branches": [],
  "thoughtHistoryLength": 15,
  "status": "complete",
  "sessionContext": {
    "sessionId": "conversation",
    "remainingThoughts": 85,
    "adjustmentsMade": 3
  }
}
```

---

## Depth Evolution Visualization

```
PHASE 1: Simple (3 thoughts planned)
Thought 1: Problem statement
Thought 2: Benefits
Thought 3: 🚨 Complexity discovered! → +3 thoughts

PHASE 2: Deep Dive (6→9 thoughts)
Thought 4: Service boundaries
Thought 5: 🚨 Data dependencies! → +3 thoughts
Thought 6: Transactions
Thought 7: Infrastructure
Thought 8: 🚨 Timeline conflict! → +3 thoughts

PHASE 3: Decision (9→15 thoughts)
Thought 9: Alternative (modular monolith)
Thought 10: Cost analysis
Thought 11: Risk assessment
Thought 12: 🚨 Need deeper value analysis → +3 thoughts
Thought 13: Recommendation
Thought 14: Implementation plan
Thought 15: Conclusion
```

---

## Scope Evolution

| Phase | Thoughts | Total | Trigger |
|-------|----------|-------|---------|
| Initial | 1-3 | 3 | Started with simple assessment |
| Expanded 1 | 4-5 | 6 | Discovered data complexity |
| Expanded 2 | 6-8 | 9 | Found transaction issues |
| Expanded 3 | 9-12 | 12 | Timeline & cost concerns |
| Final | 13-15 | 15 | Needed actionable plan |

**Total adjustments:** 4× (5x growth from original estimate)

---

## Analysis

### Why Adaptive Depth Worked

1. ✅ **Started light**: Don't over-commit initially
2. ✅ **Responsive to discovery**: Expanded when complexity emerged
3. ✅ **Natural stopping point**: Complete when decision made
4. ✅ **Avoided premature conclusion**: Didn't stop at thought #3

### Key Decision Points

| Thought | Discovery | Response |
|---------|-----------|----------|
| #3 | Codebase complexity | +3 thoughts |
| #5 | Data dependencies | +3 thoughts |
| #8 | Timeline conflict | +3 thoughts |
| #12 | Need implementation detail | +3 thoughts |

### Outcome

**Original plan:** Simple microservices assessment (3 thoughts)  
**Reality:** Complex analysis revealing modular monolith better (15 thoughts)  
**Value:** Saved $1.5M by avoiding premature microservices migration

---

## When to Use Adaptive Depth

### ✅ Use When:
- Problem scope unclear initially
- Exploratory analysis
- First time tackling problem type
- Unknown unknowns expected
- Learning as you go

### ❌ Don't Use When:
- Scope is well-defined
- Time-boxed analysis required
- Problem is routine/familiar
- Need quick answer (use linear instead)

---

## Adaptive Depth Best Practices

### Do:
- ✅ Start with conservative estimate (3-5 thoughts)
- ✅ Set `needsMoreThoughts=true` when complexity emerges
- ✅ Add +3 thoughts per extension (not +1 or +10)
- ✅ Adapt organically to problem complexity
- ✅ Keep exploring until clarity achieved

### Don't:
- ❌ Over-commit initially (don't start with totalThoughts=20)
- ❌ Under-commit stubbornly (expand when needed)
- ❌ Stop prematurely (3 thoughts rarely enough for complex problems)
- ❌ Expand endlessly (watch for diminishing returns)

---

## Pattern Comparison

| Pattern | Thoughts | Adjustments | Best For |
|---------|----------|-------------|----------|
| Linear | 5-8 | 0 | Clear path |
| Revision | 8-12 | 0 (but revises) | Wrong assumptions |
| Branching | 10-15 | 0 | Compare options |
| **Adaptive** | **5-20** | **3-5** | **Unknown scope** |

**Unique trait:** Adaptive depth is the only pattern that grows dynamically based on discoveries.

---

## Key Takeaways

1. **Don't over-commit early** - Start small, grow as needed
2. **Complexity reveals itself** - Can't predict upfront
3. **3-5 thoughts per extension** - Sustainable growth
4. **Stop when clarity emerges** - Not when estimate reached
5. **Initial estimate was 3, reality was 15** - 5x growth is normal for complex problems

### Lessons Learned

**Before adaptive thinking:**
> "Simple assessment: microservices vs monolith (3 thoughts)"

**After adaptive thinking:**
> "Complex analysis revealing: modular monolith better for our context (15 thoughts, $1.5M saved)"

**Value:** Adaptive depth prevented expensive mistake.

---

**For other patterns:**
- [linear-reasoning.md](linear-reasoning.md) - Straightforward analysis
- [revision-pattern.md](revision-pattern.md) - Correcting assumptions
- [branching-exploration.md](branching-exploration.md) - Multiple approaches
