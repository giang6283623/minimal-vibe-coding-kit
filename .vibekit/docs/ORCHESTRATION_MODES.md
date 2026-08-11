# Orchestration modes

This contract applies immediately before a parent agent would dispatch its first child agent, subagent, council member, or multi-agent lane. It does not activate multi-agent work by itself.

## Resolve the preference

1. Read .vibekit/preferences.json when it exists.
2. If orchestration.remember is true and the stored configuration is valid, use it without asking.
3. Otherwise ask the user which mode to use with the native structured-question tool exposed by the active parent runtime.
4. If no native question tool is available in the current mode or host, ask one concise plain-text question at a time in the parent conversation.
5. Child agents never ask the end user directly. They return a needs_user_input status, the decision needed, 2 or 3 options with short consequences, and their recommended option. The parent asks and routes the answer back.

Prefer the runtime's currently exposed question mechanism. Common labels include request_user_input in Codex, AskUserQuestion in Claude and Kimi, Ask Question in Cursor, and question in OpenCode. Grok and any host without a documented generic question tool use the plain parent-conversation fallback. Tool names are examples, not assumptions: capability exposure in the active runtime is the authority.

## First question: mode

Present exactly these three choices with a short description:

| Option | What it does | Cost | Risk | Recommended |
| --- | --- | --- | --- | --- |
| Default | Preserve the active provider's normal agent behavior and default model. Do not discover or route to other providers. | Lowest setup overhead | May miss useful specialization | Trivial or small work, especially coding levels 0-1 |
| Auto | Inspect task dependencies and ready adapters, then assign each bounded lane to the lowest-cost capable model above the task's safety and quality floor. | Small routing overhead | Capability probes can be incomplete | Medium or large work, especially coding levels 2-5 |
| Custom | Let the user choose provider and model per role or lane from the verified available inventory. | Highest setup and decision cost | Stale or weak assignments can reduce quality | Only for explicit cost, compliance, or evaluation control |

Mark exactly one option recommended for the current task. Task size and risk take precedence over coding level. Coding level changes explanation density and the default recommendation shown to the user; it never lowers model capability, safety, verification, or authorization.

## Second question: persistence

After the mode is resolved, ask:

| Option | What it does | Cost | Risk | Recommended |
| --- | --- | --- | --- | --- |
| Ask next time | Use this choice once and ask again before the next multi-agent dispatch. | One future question | Repeated interruption | While the user is evaluating modes |
| Don't show again | Remember this exact mode for this project in .vibekit/preferences.json. | No future prompt | A stale preference may need manual reset | After the user has a stable preference |

The second option means "remember this choice", not "disable orchestration". The user can reset it with:

~~~sh
node .vibekit/scripts/orchestration-preference.mjs forget .
~~~

Persist a remembered choice with:

~~~sh
node .vibekit/scripts/orchestration-preference.mjs remember auto .
node .vibekit/scripts/orchestration-preference.mjs remember custom . --assign reviewer=claude:provider-default
node .vibekit/scripts/orchestration-preference.mjs remember custom . --assign reviewer=cursor:<verified-model-id> --adapter reviewer=cursor-sdk
~~~

Use the script only after the user selects Don't show again. A one-time answer stays in conversation state and does not write local preferences.

## Mode semantics

### Default

- Use the active provider's ordinary parent and child-agent behavior.
- Keep the provider's default model unless the user already configured another one.
- Do not run cross-provider discovery.
- Preserve existing skill-specific executor details when they are already valid, but do not reinterpret them as a global preference.

### Auto

Build a bounded capability inventory for Codex, Claude, Cursor, OpenCode, Grok, Kimi, and any provider adapters already configured by the project.

Classify each adapter:

- ready: the executable or native runtime exists, a non-mutating readiness or authentication probe succeeds, a safe invocation contract is known, and the required model is available;
- installed-unverified: a binary or host exists, but authentication, model inventory, or safe invocation cannot be proven;
- unavailable: the adapter is absent or its preflight fails.

Auto routes only to ready adapters. It never guesses credentials, model aliases, prices, context limits, or availability. If no specialized ready adapter improves the plan, use the active provider's default model. If every required adapter is unavailable, fall back to Default and report why.

For each lane, first satisfy risk, capability, context, tool, isolation, and verification requirements. Only then prefer the lowest-cost capable model using current provider metadata already visible to the runtime. Reserve stronger capability for architecture, security, integration, ambiguous debugging, and final verification. Cheap models are appropriate only for bounded, reversible, objectively checked work.

### Custom

Show only providers and models that the runtime can verify as available. Ask for assignments in batches of at most three native questions. Each assignment binds one named role or lane to a provider and model. Keep provider-default as an explicit option. Reject unknown, unavailable, unauthenticated, or unsafe assignments and ask for a replacement.

When the optional Cursor SDK adapter is ready, show `Cursor SDK` as a distinct execution option under the Cursor provider. After the user selects it, get the current account-specific catalog with `Cursor.models.list()`. Present 2 or 3 verified model choices per native question and let the native free-form fallback accept another catalog id. Revalidate every answer against the same fresh catalog before dispatch. Never show a model from documentation, cached prose, or a previous session as currently available without this check.

Custom routing does not bypass task dependencies, isolation, budgets, protected paths, human gates, or verification. When the runtime cannot enforce an assignment, stop or use a user-approved fallback.

## Optional Cursor SDK adapter

Cursor SDK is an optional local adapter. It does not change the kit's Node.js 18 baseline and is ready only when all of these checks pass:

- Node.js 22.13 or later is active for the adapter process.
- `@cursor/sdk` 1.0.27 or later is installed in the consuming project.
- the SDK can authenticate without starting a login flow;
- `Cursor.models.list()` returns the selected model and every requested model parameter;
- the target is a real, non-symlinked kit project root, not a broad system or home directory;
- the requested access profile and local sandbox can be enforced.

Run the non-mutating readiness and model probes before offering Cursor SDK:

~~~sh
node .vibekit/scripts/cursor-sdk-adapter.mjs preflight .
node .vibekit/scripts/cursor-sdk-adapter.mjs models .
~~~

Classify a missing package, unsupported Node.js version, failed authentication, invalid project root, stale model id, missing model parameter, or unavailable sandbox as unavailable. Never install the SDK, open a browser login, change credentials, or weaken the access profile during a probe.

The adapter supports two explicit local profiles:

- `read-only`: offers only `read`, `grep`, `glob`, and `ls`, and starts in plan mode;
- `workspace-write`: also offers `edit` and `write`, but never shell, web, MCP, or nested-agent tools.

Both profiles enable the Cursor local sandbox and disable file-based setting sources so repository, user, team, plugin, and managed-device hooks, MCP servers, and subagents cannot bypass the tool profile. `workspace-write` fails closed unless the request asserts `mutationApproved`, `isolatedWorkspace`, and `protectedPathsChecked` as `true`. The parent must establish those facts and perform its own validation. Cursor SDK never grants those conditions by itself.

Dispatch one lane by passing bounded JSON on stdin. Do not put credentials in the request:

~~~sh
node .vibekit/scripts/cursor-sdk-adapter.mjs run . < cursor-run-request.json
~~~

~~~json
{
  "version": 1,
  "access": "read-only",
  "model": "composer-2.5",
  "prompt": "Review the named files and return evidence only.",
  "timeoutMs": 600000
}
~~~

For a parameterized model, pass every parameter exactly as returned by the live catalog. The result reports the adapter, agent id, run id, requested model, effective model, and either `exact-match` or `router-selection`. Reject an exact-model mismatch. A router selection is not exact model attestation.

For `workspace-write`, add this object only after the parent has completed each check:

~~~json
{
  "authorization": {
    "mutationApproved": true,
    "isolatedWorkspace": true,
    "protectedPathsChecked": true
  }
}
~~~

Cursor SDK is local-only in this integration. Do not use its cloud runtime, automatic pull requests, inline MCP servers, custom tools, or nested agents through this adapter. See [CURSOR_SDK.md](CURSOR_SDK.md) for the short end-user setup and model-change guide.

## Enforced routing plans

Preference is not dispatch. `.vibekit/preferences.json` records intent, and `orchestration-preference.mjs` validates only bounded local preference state. Neither one invokes a provider or proves that a model is available.

For a Codex-native Auto or Custom lane, the parent should build a current in-memory inventory from the model and agent capabilities exposed by the active runtime, then validate one dispatch plan:

~~~sh
node .vibekit/scripts/orchestration-routing.mjs plan < routing-request.json
~~~

The request names the exact `agentType`, reasoning effort, fork policy, capability floor, quality floor, fallback policy, inventory source, expected receipt issuer, verified time, expiry, parent settings, ready model records, and ready agent-profile records with explicit nullable model and reasoning pins. The parent must construct this inventory from authenticated host data. Do not put credentials, full provider output, or secret account data in the inventory.

Before calling the helper, the parent must separately validate the lane's risk, context, tool, isolation, and verification requirements against authenticated runtime data. Those host-specific floors are not represented by the helper schema and must not be claimed as helper-enforced.

The helper is a deterministic policy boundary, not a provider adapter. It never discovers models, authenticates, invokes `spawn_agent`, enables hooks, or changes configuration. The parent remains responsible for mapping the accepted plan to the native spawn fields:

~~~text
agent_type       <- plan.agentType
model            <- plan.model
reasoning_effort <- plan.reasoningEffort
fork_turns       <- plan.forkTurns
~~~

Apply these fail-closed rules:

- A Custom model must exactly match a ready model in the fresh inventory. `provider-default` is not exact model control.
- Custom fallback is `stop` unless the user approved one exact alternate.
- Auto may select the lowest declared cost rank only after the parent validates the runtime-specific floors and the helper validates capability, quality, and reasoning. It may name at most one capable alternate.
- A full-history fork must inherit the parent's model and reasoning effort. Use a fresh or bounded fork when an explicit different model is required.
- Agent-file `model` or `model_reasoning_effort` values outrank explicit spawn values. A ready profile record is required, Auto honors a capable declared model pin, and any pin conflict fails closed. Keep dynamically routed profiles unpinned unless a fixed profile is intentional.
- Record the accepted plan digest, returned child id, and runtime inventory digest. Spawn acceptance alone is not effective-model attestation.

After the host starts the lane, authenticate the runtime-issued receipt through the host boundary, then verify its plan binding:

~~~sh
node .vibekit/scripts/orchestration-routing.mjs verify < receipt-envelope.json
~~~

The verification envelope must include the child id returned by the spawn call as `expectedAgentId`. The receipt must bind the plan digest and report the expected issuer, an evidence digest, the effective provider, agent type, model, reasoning effort, fork policy, child id, and observation time. The helper validates the receipt child id against `expectedAgentId`, plus exact settings equality, freshness, and digest-shaped evidence, but it cannot authenticate the issuer of caller-supplied JSON. A child agent's prose is supporting evidence, not a control-plane receipt. If the host cannot authenticate and expose the effective settings, label the lane `requested-not-attested`; do not claim strict Custom compliance, model diversity, or model-based evaluation validity.

Exact model execution still does not prove that the model is suitable or correct. Auto role floors are hypotheses that must be checked against task-specific acceptance oracles and representative evaluation results.

## Separate preference from topology

The orchestration preference and the safety topology are independent axes:

- preference: Default, Auto, or Custom;
- topology: plan-only, sequential, countercheck, or verified graph.

A remembered Auto or Custom preference does not authorize subagents, mutation, parallel writes, or a verified graph. The active skill and repository rules still decide whether multi-agent work is proportionate and safe.

## Skill-specific state

.vibekit/preferences.json stores the user's global project preference. A skill may keep separate local execution details, such as .vibekit/parallel-analysis.json, but that file must not override the global mode or suppress its unresolved question.

## Stored schema

~~~json
{
  "orchestration": {
    "version": 1,
    "mode": "custom",
    "remember": true,
    "assignments": {
      "reviewer": {
        "provider": "cursor",
        "model": "composer-2.5",
        "adapter": "cursor-sdk"
      }
    },
    "configuredAt": "2026-08-05T00:00:00.000Z"
  }
}
~~~

Allowed provider identifiers are current, codex, claude, cursor, opencode, grok, and kimi. `cursor-sdk` is the only stored adapter identifier and is valid only with the cursor provider. Do not store credentials, tokens, account details, or provider command output.
