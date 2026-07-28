# Clear Thought - Parameter Reference

Complete parameter documentation for all 37 operations.

## Core Operations

### sequential_thinking

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pattern` | string | `'chain'` | Reasoning pattern: chain, tree, beam, mcts, graph, auto |
| `patternParams` | object | `{}` | Pattern-specific parameters |
| `thoughtNumber` | number | `1` | Current thought index |
| `totalThoughts` | number | `3` | Expected total thoughts |
| `nextThoughtNeeded` | boolean | `true` | Continue to next thought |
| `isRevision` | boolean | `false` | Is this revising earlier thought |
| `revisesThought` | number | - | Which thought is revised |
| `branchFromThought` | number | - | Branch point |
| `branchId` | string | - | Branch identifier |

**Pattern-Specific Parameters:**

**Tree:** `depth` (3), `breadth` (3), `branches[]`, `evaluations[]`, `selectedPath`
**Beam:** `beamWidth` (3), `candidates[]`, `scores[]`, `iterations`
**MCTS:** `tree`, `bestAction`, `explorationConstant` (√2)
**Graph:** `nodes[]`, `edges[]`, `paths[]`, `optimalPath`

---

### mental_model

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | `'first_principles'` | Model: first_principles, opportunity_cost, error_propagation, rubber_duck, pareto_principle, occams_razor |
| `steps` | string[] | Generated | Model-specific steps |
| `reasoning` | string | - | Analysis text |
| `conclusion` | string | - | Final conclusion |

---

### debugging_approach

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `approach` | string | `'binary_search'` | Approach: binary_search, reverse_engineering, divide_and_conquer, backtracking, cause_elimination, program_slicing |
| `steps` | string[] | - | Debugging steps taken |
| `findings` | string | - | What was discovered |
| `resolution` | string | - | How to fix |

---

### creative_thinking

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `technique` | string | `'brainstorming'` | Technique: brainstorming, scamper, random_word, mind_mapping |
| `ideas` | string[] | Generated | Generated ideas |
| `constraints` | string[] | `[]` | Constraints or requirements |
| `evaluation` | string | - | Evaluation of ideas |
| `selectedIdea` | string | - | Chosen idea |
| `combinedConcepts` | string | - | Merged concepts |

---

### visual_reasoning

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `spatialRelations` | string[] | `[]` | Spatial relationships between elements |
| `patterns` | string[] | `[]` | Identified visual patterns |
| `transformations` | string[] | `[]` | Transformations applied |
| `inference` | string | `''` | Visual inference drawn |

---

### metacognitive_monitoring

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `awareness` | string | - | Current thinking awareness |
| `evaluation` | string | - | Evaluation of thinking quality |
| `strategies` | string[] | - | Strategies being used |
| `adjustments` | string[] | - | Adjustments to make |
| `confidence` | number | `0.5` | Confidence level (0-1) |
| `biasCheck` | object | - | Bias detection results |

---

### scientific_method

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hypothesis` | string | - | Hypothesis to test |
| `experiment` | string | - | Experiment design |
| `data` | any | - | Collected data |
| `analysis` | string | - | Data analysis |
| `conclusion` | string | - | Final conclusion |
| `reproducibility` | string | - | Reproduction notes |
| `peerReview` | string | - | Review feedback |

---

## Collaborative Operations

### collaborative_reasoning

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `participants` | string[] | `['Analyst', 'Critic', 'Synthesizer']` | Named participants |
| `perspectives` | object[] | Generated | Per-participant perspectives |
| `conflicts` | string[] | Generated | Identified conflicts |
| `round` | number | `1` | Current round number |
| `nextRoundNeeded` | boolean | `true` | Continue to next round |

---

### decision_framework

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `framework` | string | `'decision_matrix'` | Framework: pros_cons, cost_benefit, risk_assessment, stakeholder, decision_matrix, multi_criteria |
| `options` | object[] | - | Decision alternatives |
| `criteria` | object[] | - | Evaluation criteria with weights |
| `stakeholders` | string[] | - | Stakeholders (for stakeholder framework) |
| `constraints` | string[] | - | Hard constraints |
| `analysisType` | string | - | Analysis approach |

---

### socratic_method

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `depth` | number | `5` | Maximum question depth |
| `previousQuestions` | string[] | `[]` | Questions asked so far |
| `round` | number | `1` | Current round |
| `explorationComplete` | boolean | - | Depth and response threshold met |

---

### structured_argumentation

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `'deductive'` | Argument type: deductive, inductive, abductive, analogical, causal, statistical |
| `premises` | string[] | - | Argument premises |
| `conclusion` | string | - | Conclusion drawn |
| `counters` | string[] | - | Counterarguments |
| `rebuttals` | string[] | - | Rebuttals to counters |

---

### systems_thinking

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `components` | object[] | - | System components |
| `relationships` | object[] | - | Component relationships |
| `feedbackLoops` | string[] | - | Identified feedback loops |
| `emergentProperties` | string[] | - | Emergent behaviors |
| `leveragePoints` | string[] | - | High-impact intervention points |
| `iteration` | number | `1` | Current iteration |
| `nextAnalysisNeeded` | boolean | `true` | Continue analysis |

---

## Analysis Operations

### statistical_reasoning

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `'descriptive'` | Mode: descriptive, hypothesis_test, bayesian, monte_carlo, correlation |
| `data` | number[] | - | Numeric data series |
| `dataY` | number[] | - | Second series (for correlation) |
| `hypothesis` | object | - | Hypothesis test parameters |
| `priors` | object | - | Bayesian priors |
| `samples` | number | `10000` | Monte Carlo sample count |

---

### simulation

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `'system_dynamics'` | Type: system_dynamics, agent_based, monte_carlo, discrete_event, cellular_automata |
| `initialState` | object | - | Starting state variables |
| `rules` | string[] | - | Simulation rules |
| `steps` | number | `10` | Simulation steps |
| `agents` | number | `50` | Agent count (agent_based) |

---

### optimization

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `'gradient_descent'` | Type: gradient_descent, genetic_algorithm, simulated_annealing, linear_programming, particle_swarm, grid_search |
| `variables` | string[] | - | Decision variables |
| `objective` | string | `'minimize'` | Objective: minimize or maximize |
| `bounds` | object | - | Variable bounds |
| `constraints` | object[] | - | Linear constraints |

---

### causal_analysis

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `analysisType` | string | `'structure'` | Type: structure, intervention, counterfactual |
| `graph` | object | - | Causal graph (nodes, edges) |
| `intervention` | object | - | Intervention to analyze |
| `counterfactual` | object | - | Counterfactual scenario |

---

### mdp_planning

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `algorithm` | string | `'value_iteration'` | Algorithm: value_iteration, policy_iteration |
| `states` | string[] | - | State space |
| `actions` | string[] | - | Action space |
| `transitions` | object[] | - | Transition probabilities |
| `rewards` | object[] | - | Reward function |
| `discount` | number | `0.95` | Discount factor |

---

### decision_networks

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `decision` | object | - | Decision variable |
| `randomVariables` | object[] | - | Chance nodes with CPTs |
| `evidence` | object | - | Observed evidence |
| `utilityNodes` | object[] | - | Utility tables |

---

## Metagame Operations

### ooda_loop

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | string | `'start'` | Action: start, continue, advance |
| `evidence` | string[] | `[]` | Evidence collected |
| `decision` | object | - | Decision made (decide phase) |
| `outcome` | object | - | Action outcome (act phase) |

**Config:** `maxLoopTimeMs`, `autoAdvance`, `minEvidence`, `carryForwardHypotheses`

---

### ulysses_protocol

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | string | `'start'` | Action: start, continue, advance, decide, export |
| `evidence` | string[] | `[]` | Evidence for gate passage |
| `rationale` | string | - | Decision rationale (decide action) |

**Constraints:** `timeboxMs`, `maxIterations`, `minConfidence`, `maxScopeDrift`

**Policy:** `autoEscalate`, `notifyWhen`, `allowOverride`

---

## Special Operations

### pdr_reasoning

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | string | `'start'` | Action: start, add_subject, run_pass, select, export |
| `approach` | string | - | Pass approach (run_pass) |
| `criteria` | object | - | Selection criteria (select) |

**Pass Policies:** scan, cluster, select, deepen, synthesize

---

### code_execution

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `code` | string | - | Code to execute |
| `language` | string | `'python'` | Language (python only) |
| `timeoutMs` | number | `30000` | Execution timeout |
| `pythonCommand` | string | `'python3'` | Python interpreter |
| `analyze` | boolean | `true` | Post-run analysis |
| `safetyCheck` | boolean | `true` | Regex-based safety validation |

---

## Pattern Operations

All pattern operations delegate to `sequential_thinking` with fixed pattern parameters.

### tree_of_thought

Alias for `sequential_thinking` with `pattern: 'tree'` and tree-specific parameters.

### beam_search

Alias for `sequential_thinking` with `pattern: 'beam'` and beam-specific parameters.

### mcts

Alias for `sequential_thinking` with `pattern: 'mcts'` and MCTS-specific parameters.

### graph_of_thought

Alias for `sequential_thinking` with `pattern: 'graph'` and graph-specific parameters.

---

## Session Operations

### session_info

No parameters. Returns session statistics.

### session_export

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `storeType` | string | - | Optional filter (thoughts, decisions, etc.) |

### session_import

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `data` | object[] | - | SessionExport array |

**Note:** Currently a placeholder in MCP.

---

## Notebook Operations

### notebook_create

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | string | - | Notebook title |
| `description` | string | `prompt` | Description |
| `initialContent` | object[] | - | Initial cells |
| `enableTypescript` | boolean | `false` | TypeScript support |

---

### notebook_add_cell

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `notebookId` | string | - | Target notebook |
| `type` | string | - | Cell type: markdown or code |
| `source` | string | `prompt` | Cell content |
| `language` | string | `'javascript'` | Language for code cells |
| `index` | number | - | Insert position (optional) |

---

### notebook_run_cell

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `notebookId` | string | - | Target notebook |
| `cellId` | string | - | Cell to execute |
| `timeoutMs` | number | `5000` | Execution timeout |

---

### notebook_export

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `notebookId` | string | - | Target notebook |
| `format` | string | `'json'` | Format: srcmd, json, html, markdown |
| `includeMetadata` | boolean | `true` | Include metadata |
| `includeOutputs` | boolean | `true` | Include execution outputs |

---

## UI Operations

### visual_dashboard

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | string | - | Dashboard title |
| `visualizationType` | string | `'chart'` | Type: chart, table, graph |
| `layout` | string | `'grid'` | Layout: grid, flex |
| `interactive` | boolean | `true` | Enable interactivity |
| `data` | object | - | Chart/visualization data |
| `panels` | object[] | Generated | Dashboard panels |

---

### custom_framework

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | - | Framework name |
| `domain` | string | `'general'` | Domain: technical, business, scientific |
| `steps` | string[] | Generated | Framework steps |
| `principles` | string[] | Generated | Core principles |
| `constraints` | string[] | Generated | Constraints |
| `outputs` | string[] | Generated | Expected outputs |

---

## Parameter Extraction from Natural Language

The skill should intelligently parse parameters from the problem statement:

**Example 1:**
```
/clearthought sequential_thinking pattern=tree depth=3 How to architect microservices?
```
Parse as:
- operation: `sequential_thinking`
- prompt: "How to architect microservices?"
- parameters: `{ pattern: "tree", depth: 3 }`

**Example 2:**
```
/clearthought decision_framework framework=cost_benefit Option A vs Option B for payment gateway
```
Parse as:
- operation: `decision_framework`
- prompt: "Option A vs Option B for payment gateway"
- parameters: `{ framework: "cost_benefit" }`

**Example 3:**
```
/clearthought statistical_reasoning mode=descriptive data=[100, 120, 98, 145, 203]
```
Parse as:
- operation: `statistical_reasoning`
- prompt: "Analyze data"
- parameters: `{ mode: "descriptive", data: [100, 120, 98, 145, 203] }`

---

## Advanced Parameters

### Advanced Settings (all operations)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `autoProgress` | boolean | - | Automatically continue multi-step operations |
| `saveToSession` | boolean | `true` | Save to session state |
| `generateNextSteps` | boolean | `true` | Generate suggested next steps |

---

## Full Operation List

**Core:** sequential_thinking, mental_model, debugging_approach, creative_thinking, visual_reasoning, metacognitive_monitoring, scientific_method

**Collaborative:** collaborative_reasoning, decision_framework, socratic_method, structured_argumentation, systems_thinking

**Analysis:** statistical_reasoning, simulation, optimization, causal_analysis, analogical_reasoning, ethical_analysis, research, mdp_planning, decision_networks

**Patterns:** tree_of_thought, beam_search, mcts, graph_of_thought, orchestration_suggest

**Special:** pdr_reasoning, code_execution

**UI:** visual_dashboard, custom_framework

**Session:** session_info, session_export, session_import

**Metagame:** ooda_loop, ulysses_protocol

**Notebooks:** notebook_create, notebook_add_cell, notebook_run_cell, notebook_export

---

**Total: 37 operations**
