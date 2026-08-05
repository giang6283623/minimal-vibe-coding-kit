# Orchestration modes

This contract applies immediately before a parent agent would dispatch its first child agent, subagent, council member, or multi-agent lane. It does not activate multi-agent work by itself.

## Resolve the preference

1. Read .vibekit/preferences.json when it exists.
2. If orchestration.remember is true and the stored configuration is valid, use it without asking.
3. Otherwise ask the user which mode to use with the native structured-question tool exposed by the active parent runtime.
4. If no native question tool is available in the current mode or host, ask one concise plain-text question at a time in the parent conversation.
5. Child agents never ask the end user directly. They return a needs_user_input status, the decision needed, 2 or 3 options with short consequences, and their recommended option. The parent asks and routes the answer back.

Prefer the runtime's currently exposed question mechanism. Common labels include request_user_input in Codex, AskUserQuestion in Claude and Kimi, and Ask Question in Cursor. Grok and any host without a documented generic question tool use the plain parent-conversation fallback. Tool names are examples, not assumptions: capability exposure in the active runtime is the authority.

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
~~~

Use the script only after the user selects Don't show again. A one-time answer stays in conversation state and does not write local preferences.

## Mode semantics

### Default

- Use the active provider's ordinary parent and child-agent behavior.
- Keep the provider's default model unless the user already configured another one.
- Do not run cross-provider discovery.
- Preserve existing skill-specific executor details when they are already valid, but do not reinterpret them as a global preference.

### Auto

Build a bounded capability inventory for Codex, Claude, Cursor, Grok, Kimi, and any provider adapters already configured by the project.

Classify each adapter:

- ready: the executable or native runtime exists, a non-mutating readiness or authentication probe succeeds, a safe invocation contract is known, and the required model is available;
- installed-unverified: a binary or host exists, but authentication, model inventory, or safe invocation cannot be proven;
- unavailable: the adapter is absent or its preflight fails.

Auto routes only to ready adapters. It never guesses credentials, model aliases, prices, context limits, or availability. If no specialized ready adapter improves the plan, use the active provider's default model. If every required adapter is unavailable, fall back to Default and report why.

For each lane, first satisfy risk, capability, context, tool, isolation, and verification requirements. Only then prefer the lowest-cost capable model using current provider metadata already visible to the runtime. Reserve stronger capability for architecture, security, integration, ambiguous debugging, and final verification. Cheap models are appropriate only for bounded, reversible, objectively checked work.

### Custom

Show only providers and models that the runtime can verify as available. Ask for assignments in batches of at most three native questions. Each assignment binds one named role or lane to a provider and model. Keep provider-default as an explicit option. Reject unknown, unavailable, unauthenticated, or unsafe assignments and ask for a replacement.

Custom routing does not bypass task dependencies, isolation, budgets, protected paths, human gates, or verification. When the runtime cannot enforce an assignment, stop or use a user-approved fallback.

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
        "provider": "claude",
        "model": "provider-default"
      }
    },
    "configuredAt": "2026-08-05T00:00:00.000Z"
  }
}
~~~

Allowed provider identifiers are current, codex, claude, cursor, grok, and kimi. Do not store credentials, tokens, account details, or provider command output.
