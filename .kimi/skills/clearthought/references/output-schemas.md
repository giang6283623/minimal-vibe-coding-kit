# Clear Thought - Output Schema Reference

JSON response structures for all 37 operations.

## Base Response Structure

All responses include:

```typescript
{
  toolOperation: string;        // Operation name
  ...operationSpecificFields;   // Varies by operation
  sessionContext: {             // Optional but recommended
    sessionId: string;          // "conversation" for skill
    stats?: object;             // Session statistics
  }
}
```

## Error Response Structure

```typescript
{
  toolOperation: string;
  error: string;
  success: false;
  suggestions?: string[];
}
```

---

## Core Operations

### sequential_thinking

```typescript
{
  toolOperation: "sequential_thinking";
  selectedPattern: "chain" | "tree" | "beam" | "mcts" | "graph";
  thoughtData: {
    thoughtNumber: number;
    content: string;
    revision: number | null;
    branch: string | null;
  };
  patternResult?: object;      // When pattern dispatches
  status: "success" | "limit_reached";
  sessionContext: {
    sessionId: string;
    totalThoughts: number;
    remainingThoughts: number;
    recentThoughts: Array<{
      number: number;
      preview: string;  // First 50 chars
    }>;
  };
}
```

---

### mental_model

```typescript
{
  toolOperation: "mental_model";
  modelName: string;
  problem: string;
  steps: string[];
  reasoning: string;
  conclusion: string;
  sessionContext: {
    sessionId: string;
    totalModels: number;
    recentModels: string[];  // Last 3 model names
  };
}
```

---

### debugging_approach

```typescript
{
  toolOperation: "debugging_approach";
  approachName: string;
  issue: string;
  steps: string[];
  findings: string;
  resolution: string;
  prevention?: string;
  sessionContext: {
    sessionId: string;
    totalSessions: number;
    recentSessions: Array<{
      approach: string;
      issue: string;
    }>;
  };
}
```

---

## Collaborative Operations

### collaborative_reasoning

```typescript
{
  toolOperation: "collaborative_reasoning";
  topic: string;
  participants: string[];
  perspectives: Array<{
    participant: string;
    viewpoint: string;
    keyPoints: string[];
    confidence: number;
    reasoning: string;
  }>;
  conflicts: string[];
  consensus: {
    agreedPoints: string[];
    unresolved: string[];
  };
  convergenceScore: number;     // 0-1
  round: number;
  nextRoundNeeded: boolean;
  sessionContext: {
    sessionId: string;
  };
}
```

---

### decision_framework

```typescript
{
  toolOperation: "decision_framework";
  framework: string;
  decision: string;
  options: Array<{
    name: string;
    description: string;
  }>;
  criteria: Array<{
    name: string;
    weight: number;
  }>;
  evaluations: Array<{
    option: string;
    scores: Record<string, number>;
    total?: number;
  }>;
  recommended: string;
  confidence: number;           // 0-1, from score variance
  rationale: string;
  tradeOffs?: string;
  nextSteps?: string[];
  sessionContext: {
    sessionId: string;
  };
}
```

---

## Analysis Operations

### statistical_reasoning

**Descriptive Mode:**
```typescript
{
  toolOperation: "statistical_reasoning";
  mode: "descriptive";
  data: number[];
  results: {
    mean: number;
    variance: number;
    stddev: number;
    min: number;
    max: number;
    n: number;
  };
  interpretation: string;
  sessionContext: { sessionId: string };
}
```

**Bayesian Mode:**
```typescript
{
  toolOperation: "statistical_reasoning";
  mode: "bayesian";
  prior: Record<string, number>;
  likelihood: Record<string, number>;
  posterior: Record<string, number>;
  evidence: number;
  interpretation: string;
  sessionContext: { sessionId: string };
}
```

---

### simulation

```typescript
{
  toolOperation: "simulation";
  type: string;
  initialState: Record<string, number>;
  steps: number;
  trajectory: Array<Record<string, number>>;
  finalState: Record<string, number>;
  trends: Record<string, number>;  // Delta from initial
  equilibrium: boolean;
  sessionContext: { sessionId: string };
}
```

---

### optimization

```typescript
{
  toolOperation: "optimization";
  type: string;
  variables: string[];
  objective: "minimize" | "maximize";
  bestDecisionVector: number[];
  bestObjective: number;
  iterations: number;
  constraintsSatisfied: boolean;
  sensitivityAnalysis?: Array<{
    variable: string;
    impact: number;
  }>;
  sessionContext: { sessionId: string };
}
```

---

## Metagame Operations

### ooda_loop

```typescript
{
  toolOperation: "ooda_loop";
  action: "start" | "continue" | "advance";
  currentPhase: "observe" | "orient" | "decide" | "act";
  loopNumber: number;
  nodes: Array<{
    phase: string;
    content: string;
    timestamp: string;
  }>;
  hypotheses?: Record<string, {
    text: string;
    status: "proposed" | "testing" | "validated" | "invalidated";
  }>;
  metrics: {
    completedLoops: number;
    avgLoopTimeMs: number;
    evidenceQuality: number;
    learningRate: number;
  };
  phaseChecklist: Record<string, string[]>;
  recommendedNextPhase: string;
  sessionContext: { sessionId: string };
}
```

---

### ulysses_protocol

```typescript
{
  toolOperation: "ulysses_protocol";
  action: "start" | "continue" | "advance" | "decide" | "export";
  currentPhase: "reconnaissance" | "planning" | "implementation" | "validation" | "ship_or_abort";
  gates: Array<{
    phase: string;
    status: "locked" | "open" | "passed" | "failed";
    entryCriteria: string[];
    exitCriteria: string[];
    entryMet: string[];
    exitMet: string[];
  }>;
  nodes: Array<{
    phase: string;
    content: string;
    timestamp: string;
    escalated?: boolean;
  }>;
  metrics: {
    gatesPassed: number;
    iteration: number;
    confidence: number;
    scopeDrift: number;
  };
  constraints: {
    timeboxMs: number;
    maxIterations: number;
    minConfidence: number;
    maxScopeDrift: number;
  };
  finalDecision?: {
    decision: "ship" | "abort" | "pivot";
    rationale: string;
    timestamp: string;
  };
  gateStatus?: string;          // When advance fails
  requiredEvidence?: string[];  // What's needed to pass
  sessionContext: { sessionId: string };
}
```

---

## Pattern Operations

### tree_of_thought

```typescript
{
  toolOperation: "tree_of_thought";
  pattern: "tree";
  depth: number;
  breadth: number;
  branches: Array<{
    id: string;
    content: string;
    score: number;
    depth: number;
  }>;
  evaluations: Array<{
    branchId: string;
    score: number;
    reasoning: string;
  }>;
  selectedPath: string[];
  sessionContext: { sessionId: string };
}
```

---

### beam_search

```typescript
{
  toolOperation: "beam_search";
  pattern: "beam";
  beamWidth: number;
  candidates: string[];
  scores: number[];
  iterations: number;
  currentGeneration: number;
  sessionContext: { sessionId: string };
}
```

---

### mcts

```typescript
{
  toolOperation: "mcts";
  pattern: "mcts";
  tree: {
    root: {
      visits: number;
      value: number;
      children: any[];
    };
  };
  bestAction: string;
  explorationConstant: number;  // Default Math.SQRT2
  sessionContext: { sessionId: string };
}
```

---

## Notebook Operations

### notebook_create

```typescript
{
  toolOperation: "notebook_create";
  notebookId: string;
  title: string;
  metadata: {
    createdFor: string;
    enableTypescript: boolean;
    tags: string[];
    version: string;
  };
  cells: Array<{
    id: string;
    type: "markdown" | "code";
    source: string;
    language?: string;
  }>;
  sessionContext: { sessionId: string };
}
```

---

### notebook_run_cell

```typescript
{
  toolOperation: "notebook_run_cell";
  notebookId: string;
  cellId: string;
  executed: boolean;
  outputs: Array<{
    type: "stdout" | "stderr" | "result";
    text: string;
  }>;
  status: "success" | "error" | "timeout";
  error?: string;
  analysis?: {
    outputCategories: string[];
    codeMetrics: object;
    errorClassification?: string;
  };
  sessionContext: { sessionId: string };
}
```

---

## Session Context Structure

The `sessionContext` object provides session metadata:

```typescript
{
  sessionId: string;           // "conversation" for skills
  stats?: {
    thoughtCount: number;
    totalOperations: number;
    isActive: boolean;
    stores?: Record<string, number>;  // Per-type counts
  };
  kpis?: Array<{
    name: string;
    value: number;
    label: string;
    target: number;
    direction: "up" | "down";
    timestamp: string;
  }>;
  
  // Operation-specific context
  totalThoughts?: number;
  remainingThoughts?: number;
  recentThoughts?: Array<{number: number, preview: string}>;
  
  totalModels?: number;
  recentModels?: string[];
  
  totalSessions?: number;
  recentSessions?: Array<{approach: string, issue: string}>;
}
```

---

## Complete Type Reference

For full TypeScript type definitions, see the MCP source:
- `/Users/giangbv/Desktop/INTERN/clearthought-temp/clearthought-onepointfive/src/types/index.ts`
- `/Users/giangbv/Desktop/INTERN/clearthought-temp/clearthought-onepointfive/src/types/reasoning-patterns/`

---

**Reference:** Clear Thought MCP v0.2.1  
**Last Updated:** 2026-04-05
