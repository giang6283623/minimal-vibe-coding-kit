# Metagame Operations - Examples

Advanced frameworks for high-stakes problem-solving and rapid iteration.

---

## OODA Loop Examples

### Example 1: Product Feature Development

**Turn 1: Start**
```
/clearthought ooda_loop action=start We need to improve checkout conversion rate
```

**Output:**
```json
{
  "toolOperation": "ooda_loop",
  "action": "start",
  "currentPhase": "observe",
  "loopNumber": 1,
  "nodes": [],
  "hypotheses": {},
  "metrics": {
    "completedLoops": 0,
    "avgLoopTimeMs": 0,
    "evidenceQuality": 0,
    "learningRate": 0
  },
  "phaseChecklist": {
    "observe": ["data_collected", "anomalies_noted", "baseline_established"],
    "orient": ["patterns_identified", "context_analyzed", "assumptions_listed"],
    "decide": ["options_generated", "criteria_defined", "decision_made"],
    "act": ["action_planned", "execution_started", "feedback_mechanism"]
  },
  "config": {
    "maxLoopTimeMs": 300000,
    "autoAdvance": true,
    "minEvidence": 3,
    "carryForwardHypotheses": true
  },
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

**Turn 2: Observe**
```
/clearthought ooda_loop action=continue evidence=["data_collected: 67% cart abandonment", "anomalies_noted: spike at payment step", "baseline_established: 15% conversion"]
```

**Output:**
```json
{
  "toolOperation": "ooda_loop",
  "action": "continue",
  "currentPhase": "observe",
  "loopNumber": 1,
  "nodes": [
    {
      "phase": "observe",
      "content": "Collected: 67% cart abandonment at payment step, current 15% conversion",
      "timestamp": "2026-04-05T10:30:00Z",
      "evidence": ["data_collected", "anomalies_noted", "baseline_established"]
    }
  ],
  "metrics": {
    "completedLoops": 0,
    "avgLoopTimeMs": 0,
    "evidenceQuality": 0.8,
    "learningRate": 0
  },
  "autoAdvancing": true,
  "nextPhase": "orient",
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

**Turn 3: Orient (Auto-Advanced)**
```
/clearthought ooda_loop action=continue evidence=["patterns_identified: users confused by payment form", "context_analyzed: mobile checkout broken", "assumptions_listed: form too long"]
```

**Turn 4: Decide**
```
/clearthought ooda_loop action=continue decision={"options": ["Simplify form", "Fix mobile", "Add express checkout"], "selected": "Fix mobile", "rationale": "Highest impact, affects 70% of users"}
```

**Turn 5: Act**
```
/clearthought ooda_loop action=continue action={"action": "Fix mobile checkout", "outcome": "Deployed fix, monitoring conversion", "metrics": {"conversion": "21%", "improvement": "+6%"}}
```

**Turn 6: Complete Loop & Advance**
```
/clearthought ooda_loop action=advance
```

**Output (Loop Completed):**
```json
{
  "toolOperation": "ooda_loop",
  "action": "advance",
  "currentPhase": "observe",
  "loopNumber": 2,
  "nodes": [
    {"phase": "observe", "content": "...", "timestamp": "..."},
    {"phase": "orient", "content": "...", "timestamp": "..."},
    {"phase": "decide", "content": "...", "timestamp": "..."},
    {"phase": "act", "content": "...", "timestamp": "..."}
  ],
  "hypotheses": {
    "mobile_checkout_broken": {
      "text": "Mobile checkout bug causing 67% abandonment",
      "status": "validated",
      "validatedAt": "2026-04-05T10:45:00Z"
    }
  },
  "metrics": {
    "completedLoops": 1,
    "avgLoopTimeMs": 900000,
    "evidenceQuality": 0.85,
    "learningRate": 1.0
  },
  "loopSummary": {
    "observed": "67% abandonment at payment",
    "oriented": "Mobile checkout broken",
    "decided": "Fix mobile",
    "acted": "Deployed fix, +6% conversion"
  },
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Ulysses Protocol Examples

### Example 1: Critical Bug Fix

**Turn 1: Start High-Stakes Session**
```
/clearthought ulysses_protocol action=start Critical: Payment gateway returning 500 errors, affecting 40% of transactions
```

**Output:**
```json
{
  "toolOperation": "ulysses_protocol",
  "action": "start",
  "currentPhase": "reconnaissance",
  "gates": [
    {
      "phase": "reconnaissance",
      "status": "open",
      "entryCriteria": ["scope_defined", "stakeholders_identified", "impact_assessed"],
      "exitCriteria": ["risks_catalogued", "resources_allocated", "timeline_established"],
      "entryMet": [],
      "exitMet": []
    },
    {
      "phase": "planning",
      "status": "locked",
      "entryCriteria": ["approach_selected", "tasks_defined", "dependencies_mapped"],
      "exitCriteria": ["plan_validated", "risks_mitigated", "team_aligned"],
      "entryMet": [],
      "exitMet": []
    },
    {
      "phase": "implementation",
      "status": "locked",
      "entryCriteria": ["environment_ready", "tests_prepared", "rollback_planned"],
      "exitCriteria": ["solution_implemented", "tests_passed", "code_reviewed"],
      "entryMet": [],
      "exitMet": []
    },
    {
      "phase": "validation",
      "status": "locked",
      "entryCriteria": ["solution_deployed", "monitoring_active", "success_criteria_defined"],
      "exitCriteria": ["success_validated", "side_effects_checked", "documentation_complete"],
      "entryMet": [],
      "exitMet": []
    },
    {
      "phase": "ship_or_abort",
      "status": "locked",
      "entryCriteria": ["decision_ready"],
      "exitCriteria": ["decision_executed"],
      "entryMet": [],
      "exitMet": []
    }
  ],
  "nodes": [],
  "metrics": {
    "gatesPassed": 0,
    "iteration": 0,
    "confidence": 0,
    "scopeDrift": 0,
    "timeSpentMs": 0
  },
  "constraints": {
    "timeboxMs": 14400000,
    "maxIterations": 3,
    "minConfidence": 0.9,
    "maxScopeDrift": 0.3
  },
  "policy": {
    "autoEscalate": true,
    "notifyWhen": ["gate_failed", "constraint_exceeded", "iteration_limit"],
    "allowOverride": false
  },
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

**Turn 2: Reconnaissance**
```
/clearthought ulysses_protocol action=continue evidence=["scope_defined: payment 500 errors", "stakeholders_identified: eng team, customers, finance", "impact_assessed: $50k/hour revenue loss"]
```

**Turn 3: Pass Reconnaissance Gate**
```
/clearthought ulysses_protocol action=advance evidence=["risks_catalogued: data corruption, downtime", "resources_allocated: 2 senior engineers", "timeline_established: 4 hour deadline"]
```

**Output (Gate Passed):**
```json
{
  "toolOperation": "ulysses_protocol",
  "action": "advance",
  "currentPhase": "planning",
  "gates": [
    {
      "phase": "reconnaissance",
      "status": "passed",
      "entryCriteria": ["scope_defined", "stakeholders_identified", "impact_assessed"],
      "exitCriteria": ["risks_catalogued", "resources_allocated", "timeline_established"],
      "entryMet": ["scope_defined", "stakeholders_identified", "impact_assessed"],
      "exitMet": ["risks_catalogued", "resources_allocated", "timeline_established"]
    },
    {
      "phase": "planning",
      "status": "open",
      "entryCriteria": ["approach_selected", "tasks_defined", "dependencies_mapped"],
      "exitCriteria": ["plan_validated", "risks_mitigated", "team_aligned"],
      "entryMet": [],
      "exitMet": []
    },
    "... other gates ..."
  ],
  "nodes": [
    {
      "phase": "reconnaissance",
      "content": "Identified: Payment 500 errors affecting 40% transactions, $50k/hour loss",
      "timestamp": "2026-04-05T10:30:00Z"
    },
    {
      "phase": "reconnaissance",
      "content": "Resources: 2 senior engineers, 4 hour deadline",
      "timestamp": "2026-04-05T10:32:00Z"
    }
  ],
  "metrics": {
    "gatesPassed": 1,
    "iteration": 2,
    "confidence": 0.7,
    "scopeDrift": 0,
    "timeSpentMs": 120000
  },
  "gateTransition": {
    "from": "reconnaissance",
    "to": "planning",
    "success": true
  },
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

**Turn 4-N: Continue through Planning → Implementation → Validation**

**Final Turn: Ship Decision**
```
/clearthought ulysses_protocol action=decide rationale="All tests passed, error rate reduced to 0.1%, monitoring shows stable performance"
```

**Output:**
```json
{
  "toolOperation": "ulysses_protocol",
  "action": "decide",
  "currentPhase": "ship_or_abort",
  "finalDecision": {
    "decision": "ship",
    "rationale": "All tests passed, error rate reduced to 0.1%, monitoring shows stable performance",
    "timestamp": "2026-04-05T14:30:00Z",
    "confidence": 0.95
  },
  "gates": [
    {"phase": "reconnaissance", "status": "passed"},
    {"phase": "planning", "status": "passed"},
    {"phase": "implementation", "status": "passed"},
    {"phase": "validation", "status": "passed"},
    {"phase": "ship_or_abort", "status": "passed"}
  ],
  "metrics": {
    "gatesPassed": 5,
    "iteration": 12,
    "confidence": 0.95,
    "scopeDrift": 0.05,
    "timeSpentMs": 12600000
  },
  "summary": "Successfully resolved payment gateway errors in 3.5 hours, under budget and constraints",
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

### Example 2: Ulysses Export (Markdown Report)

**Input:**
```
/clearthought ulysses_protocol action=export
```

**Output:**
```json
{
  "toolOperation": "ulysses_protocol",
  "action": "export",
  "format": "markdown",
  "export": "# Ulysses Protocol Session Report\n\n**Session:** conversation\n**Stakes:** Critical\n**Status:** Complete\n\n## Gates Status\n\n### ✅ Reconnaissance (PASSED)\n- Status: passed\n- Entry criteria: [x] scope_defined [x] stakeholders_identified [x] impact_assessed\n- Exit criteria: [x] risks_catalogued [x] resources_allocated [x] timeline_established\n\n### ✅ Planning (PASSED)\n...\n\n## Metrics\n- Gates Passed: 5/5\n- Total Iterations: 12\n- Confidence: 0.95\n- Time Spent: 3.5 hours\n\n## Final Decision\n✅ **SHIP**\n\n**Rationale:** All tests passed, error rate reduced to 0.1%\n**Confidence:** 0.95\n\n## Phase History\n\n### Reconnaissance\n- Identified payment errors affecting 40% transactions\n- Assessed $50k/hour revenue impact\n\n### Planning\n- Debugged gateway timeout issue\n- Planned database connection pool fix\n\n### Implementation\n- Increased connection pool size\n- Added retry logic with exponential backoff\n- Deployed canary release\n\n### Validation\n- Monitored error rates: 500 errors → 0.1%\n- Performance: p95 latency 120ms → 45ms\n- All regression tests passed\n\n## Constraints\n- Timebox: 4 hours (used 3.5h) ✅\n- Max Iterations: 3 (used 2) ✅\n- Min Confidence: 0.9 (achieved 0.95) ✅\n- Max Scope Drift: 0.3 (actual 0.05) ✅\n\n## Lessons Learned\n1. Connection pool was undersized for peak load\n2. Retry logic critical for transient errors\n3. Canary deployment allowed safe validation\n",
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## PDR Reasoning Examples

### Example: Multi-Pass Analysis

**Turn 1: Start Session**
```
/clearthought pdr_reasoning action=start Analyze performance bottlenecks in API
```

**Output:**
```json
{
  "toolOperation": "pdr_reasoning",
  "action": "start",
  "sessionId": "pdr-session-123",
  "passes": [
    {"name": "scan", "defaultApproach": "sequential", "budget": {"subjectsLimit": 10}},
    {"name": "cluster", "defaultApproach": "tree", "budget": {"subjectsLimit": 5}},
    {"name": "select", "defaultApproach": "beam", "budget": {"subjectsLimit": 3}},
    {"name": "deepen", "defaultApproach": "graph", "budget": {"subjectsLimit": 3}},
    {"name": "synthesize", "defaultApproach": "mcts", "budget": {"subjectsLimit": 1}}
  ],
  "maxPasses": 5,
  "stopConditions": {
    "maxTimeMs": 1800000,
    "minImprovement": 0.05,
    "confidenceThreshold": 0.9
  },
  "suggestions": ["Add subjects with 'add_subject' action"],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

**Turn 2: Add Subjects**
```
/clearthought pdr_reasoning action=add_subject title="Database query optimization" description="Slow N+1 queries" tags=["performance", "database"]
```

**Turn 3: Run Scan Pass**
```
/clearthought pdr_reasoning action=run_pass passName=scan
```

**Output:**
```json
{
  "toolOperation": "pdr_reasoning",
  "action": "run_pass",
  "sessionId": "pdr-session-123",
  "passName": "scan",
  "approach": "sequential",
  "subjects": [
    {
      "id": "subject-1",
      "title": "Database query optimization",
      "description": "Slow N+1 queries",
      "tags": ["performance", "database"],
      "score": 0.85,
      "confidence": 0.75
    }
  ],
  "traces": [
    "Analyzed subject-1 using sequential approach",
    "Generated artifact: analysis-subject-1.md",
    "Confidence: 0.75, Score: 0.85"
  ],
  "metrics": {
    "subjectsAnalyzed": 1,
    "passCompleted": true,
    "avgScore": 0.85
  },
  "suggestions": ["Run cluster pass to group related subjects"],
  "nextStepNeeded": true,
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

**Turn 4: Select Best**
```
/clearthought pdr_reasoning action=select criteria={"minScore": 0.8, "topK": 1}
```

**Output:**
```json
{
  "toolOperation": "pdr_reasoning",
  "action": "select",
  "sessionId": "pdr-session-123",
  "selected": ["subject-1"],
  "criteria": {
    "minScore": 0.8,
    "topK": 1
  },
  "summary": {
    "totalSubjects": 1,
    "selectedCount": 1,
    "avgScore": 0.85,
    "topSubjects": [
      {"id": "subject-1", "title": "Database query optimization", "score": 0.85}
    ]
  },
  "suggestions": ["Export results with 'export' action"],
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

## Comparison: OODA vs Ulysses

### When to Use OODA

**Characteristics:**
- Rapid iteration
- Hypothesis-driven
- Auto-advancing phases
- Learning through cycles
- Good for: product development, experiments, iterative debugging

**Example Scenario:** "Test different UI variations to improve conversion"

---

### When to Use Ulysses

**Characteristics:**
- Phased governance
- Strict gate validation
- High-stakes decisions
- Constraint enforcement
- Good for: production incidents, critical releases, major migrations

**Example Scenario:** "Fix payment system bug affecting revenue"

---

## Advanced: Constraint Escalation

**Ulysses with Constraint Violation:**

```json
{
  "toolOperation": "ulysses_protocol",
  "action": "continue",
  "currentPhase": "implementation",
  "constraintViolations": [
    "⚠️ Time constraint: 3.8h / 4h used (95%)",
    "⚠️ Iteration limit: 3/3 iterations in implementation"
  ],
  "escalation": {
    "triggered": true,
    "reason": "Iteration limit reached",
    "action": "abort",
    "escalationNode": {
      "phase": "implementation",
      "content": "🚨 ESCALATION: Iteration limit reached, forcing decision",
      "escalated": true
    }
  },
  "finalDecision": {
    "decision": "abort",
    "rationale": "Cannot achieve confidence within constraints",
    "timestamp": "2026-04-05T14:28:00Z",
    "confidence": 0.65
  },
  "sessionContext": {
    "sessionId": "conversation"
  }
}
```

---

**For more examples:**
- [sequential-thinking.md](sequential-thinking.md)
- [decision-framework.md](decision-framework.md)
- `../references/output-schemas.md`
