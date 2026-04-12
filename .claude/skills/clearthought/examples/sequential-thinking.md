# Sequential Thinking - Examples

## Example 1: Basic Chain-of-Thought

**Input:**
```
/clearthought sequential_thinking How to implement user authentication?
```

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "chain",
  "thoughtData": {
    "thoughtNumber": 1,
    "content": "Breaking down authentication implementation:\n\n1. Choose authentication method (JWT tokens recommended for stateless API)\n2. Design user model with hashed passwords (bcrypt with salt rounds)\n3. Create registration endpoint with validation\n4. Implement login endpoint returning access + refresh tokens\n5. Add middleware to verify tokens on protected routes\n6. Handle token refresh flow\n7. Implement logout (token blacklist or expiry)\n8. Add password reset flow with email verification",
    "revision": null,
    "branch": null
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 1,
    "remainingThoughts": 99,
    "recentThoughts": [
      {"number": 1, "preview": "Breaking down authentication implementation: 1. Ch"}
    ]
  }
}
```

---

## Example 2: Tree Pattern with Branching

**Input:**
```
/clearthought sequential_thinking pattern=tree depth=3 breadth=2 Choose state management approach
```

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "tree",
  "thoughtData": {
    "thoughtNumber": 1,
    "content": "Root decision: State management approach",
    "revision": null,
    "branch": null
  },
  "patternResult": {
    "pattern": "tree",
    "depth": 3,
    "breadth": 2,
    "branches": [
      {
        "id": "1",
        "content": "Context API: Built-in React, good for small apps",
        "score": 0.7,
        "depth": 1,
        "parent": "root"
      },
      {
        "id": "2",
        "content": "Redux: Predictable state, great DevTools, more boilerplate",
        "score": 0.85,
        "depth": 1,
        "parent": "root"
      },
      {
        "id": "2.1",
        "content": "Redux Toolkit: Simplifies Redux, recommended approach",
        "score": 0.9,
        "depth": 2,
        "parent": "2"
      },
      {
        "id": "2.2",
        "content": "Plain Redux: More control, more setup",
        "score": 0.75,
        "depth": 2,
        "parent": "2"
      }
    ],
    "evaluations": [
      {"branchId": "2.1", "score": 0.9, "reasoning": "Best balance of power and simplicity"}
    ],
    "selectedPath": ["root", "2", "2.1"]
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 1,
    "remainingThoughts": 99
  }
}
```

---

## Example 3: Beam Search Pattern

**Input:**
```
/clearthought sequential_thinking pattern=beam beamWidth=3 Optimize database schema
```

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "beam",
  "thoughtData": {
    "thoughtNumber": 1,
    "content": "Exploring database schema optimization approaches",
    "revision": null,
    "branch": null
  },
  "patternResult": {
    "pattern": "beam",
    "beamWidth": 3,
    "candidates": [
      "Add composite indexes on frequently queried columns",
      "Normalize to 3NF to reduce redundancy",
      "Denormalize for read-heavy workloads"
    ],
    "scores": [0.92, 0.78, 0.85],
    "iterations": 3,
    "currentGeneration": 1,
    "prunedCandidates": [
      "Archive old data to separate tables",
      "Use materialized views"
    ]
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 1,
    "remainingThoughts": 99
  }
}
```

---

## Example 4: With Revision

**Input:**
```
/clearthought sequential_thinking isRevision=true revisesThought=1 Actually, use OAuth2 instead of JWT
```

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "chain",
  "thoughtData": {
    "thoughtNumber": 2,
    "content": "Revising authentication approach to use OAuth2:\n\n1. Choose OAuth2 provider (Google, GitHub, Auth0)\n2. Register application with provider\n3. Implement OAuth2 authorization code flow\n4. Store provider tokens securely\n5. Map provider user to local user model\n6. Handle token refresh from provider\n7. Implement logout (revoke provider tokens)\n8. Add social login UI\n\nBenefits over JWT: Provider handles security, built-in MFA support, easier user management",
    "revision": 1,
    "branch": null,
    "revisionReason": "OAuth2 reduces security burden and adds social login"
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 2,
    "remainingThoughts": 98,
    "recentThoughts": [
      {"number": 2, "preview": "Revising authentication approach to use OAuth2:"},
      {"number": 1, "preview": "Breaking down authentication implementation: 1. Ch"}
    ]
  }
}
```

---

## Example 5: Graph Pattern

**Input:**
```
/clearthought sequential_thinking pattern=graph Analyze system dependencies
```

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "graph",
  "thoughtData": {
    "thoughtNumber": 1,
    "content": "Mapping system as dependency graph",
    "revision": null,
    "branch": null
  },
  "patternResult": {
    "pattern": "graph",
    "nodes": [
      {"id": "api", "content": "API Gateway", "type": "service"},
      {"id": "auth", "content": "Auth Service", "type": "service"},
      {"id": "db", "content": "Database", "type": "storage"},
      {"id": "cache", "content": "Redis Cache", "type": "storage"}
    ],
    "edges": [
      {"from": "api", "to": "auth", "type": "depends_on", "weight": 1.0},
      {"from": "api", "to": "cache", "type": "uses", "weight": 0.8},
      {"from": "auth", "to": "db", "type": "reads", "weight": 1.0}
    ],
    "paths": [
      ["api", "auth", "db"],
      ["api", "cache"]
    ],
    "optimalPath": ["api", "cache"],
    "analysis": {
      "criticalNodes": ["auth", "db"],
      "bottlenecks": ["db"],
      "redundancy": ["cache as db fallback"]
    }
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 1,
    "remainingThoughts": 99
  }
}
```

---

## Example 6: MCTS Pattern

**Input:**
```
/clearthought sequential_thinking pattern=mcts explorationConstant=1.414 Best API architecture for microservices
```

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "mcts",
  "thoughtData": {
    "thoughtNumber": 1,
    "content": "Monte Carlo exploration of architecture options",
    "revision": null,
    "branch": null
  },
  "patternResult": {
    "pattern": "mcts",
    "tree": {
      "root": {
        "visits": 150,
        "value": 0.82,
        "children": [
          {
            "action": "REST_API",
            "visits": 75,
            "value": 0.78
          },
          {
            "action": "GraphQL",
            "visits": 50,
            "value": 0.85
          },
          {
            "action": "gRPC",
            "visits": 25,
            "value": 0.73
          }
        ]
      }
    },
    "bestAction": "GraphQL",
    "explorationConstant": 1.414,
    "simulations": 150,
    "reasoning": "GraphQL provides best balance of flexibility and performance for microservices with varying client needs"
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 1,
    "remainingThoughts": 99
  }
}
```

---

## Pattern Selection (Auto Mode)

**Input:**
```
/clearthought sequential_thinking pattern=auto Complex multi-criteria decision with many trade-offs
```

**Logic:** Auto-selects pattern based on:
- Keywords in prompt ("complex", "multiple", "compare") → `beam` or `tree`
- Presence of `patternParams.depth` → `tree`
- Presence of `patternParams.beamWidth` → `beam`
- Keywords ("Monte Carlo", "simulation") → `mcts`
- Keywords ("dependencies", "relationships") → `graph`
- Default → `chain`

**Output:**
```json
{
  "toolOperation": "sequential_thinking",
  "selectedPattern": "tree",
  "thoughtData": {
    "thoughtNumber": 1,
    "content": "Auto-selected tree pattern for complex multi-criteria analysis",
    "revision": null,
    "branch": null
  },
  "patternResult": {
    "pattern": "tree",
    "autoSelected": true,
    "reasoning": "Keywords 'complex' and 'multiple' suggest branching exploration"
  },
  "status": "success",
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 1,
    "remainingThoughts": 99
  }
}
```

---

## Multi-Step Continuation

**Turn 1:**
```
/clearthought sequential_thinking Implement payment processing
```

Returns: `thoughtNumber: 1`, `nextThoughtNeeded: true`

**Turn 2:**
```
/clearthought sequential_thinking thoughtNumber=2 Continue with error handling
```

Returns: `thoughtNumber: 2`, builds on previous thought

**Turn 3:**
```
/clearthought sequential_thinking thoughtNumber=3 Add fraud detection
```

Returns: `thoughtNumber: 3`, complete chain

**Session Context Tracking:**
```json
{
  "sessionContext": {
    "sessionId": "conversation",
    "totalThoughts": 3,
    "remainingThoughts": 97,
    "recentThoughts": [
      {"number": 3, "preview": "Add fraud detection: 1. Velocity checks 2. Am"},
      {"number": 2, "preview": "Continue with error handling: 1. Timeout hand"},
      {"number": 1, "preview": "Implement payment processing: 1. Choose gatewa"}
    ]
  }
}
```

---

**For more examples, see:**
- [decision-framework.md](decision-framework.md)
- [metagame-examples.md](metagame-examples.md)
- `../reference/parameter-reference.md`
