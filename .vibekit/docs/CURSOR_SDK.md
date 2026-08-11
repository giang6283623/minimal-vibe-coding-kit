# Cursor SDK adapter

Use Cursor SDK as an optional local child-agent adapter. The kit never installs it, starts a login flow, or stores a credential for you.

Official references:

- [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript)
- [Authentication](https://cursor.com/docs/sdk/typescript#authentication)
- [SDK changelog](https://cursor.com/docs/sdk/changelog)

## 1. Install the optional SDK

Use Node.js 22.13 or later. Cursor currently labels this SDK as public beta. Its package license says use is subject to [Cursor's Terms of Service](https://cursor.com/terms-of-service), so review those terms before adoption. In the consuming project, review and run:

~~~sh
npm install --save-dev --save-exact @cursor/sdk@1.0.27
~~~

This changes the consuming project's package files. The Minimal Vibe Coding Kit keeps its Node.js 18 baseline and does not add Cursor SDK as a required dependency.

## 2. Add authentication

Follow [Cursor's authentication guide](https://docs.cursor.com/en/cli/reference/authentication): open the Cursor dashboard, go to Integrations > User API Keys, and create a key. Put it in your shell, CI secret store, or another secret manager as `CURSOR_API_KEY`. Never put the value in `.vibekit/preferences.json` or a tracked file.

The SDK also supports browser login stored outside the project at `~/.cursor/sdk/auth.json`. The adapter does not start that flow.

## 3. Verify models before choosing

~~~sh
node .vibekit/scripts/cursor-sdk-adapter.mjs preflight .
node .vibekit/scripts/cursor-sdk-adapter.mjs models .
~~~

The second command returns only models and parameters available to the authenticated account and team. Use those ids in Custom mode. If either command reports `unavailable`, keep Cursor SDK out of Auto and Custom dispatch until the reported problem is fixed.

When the parent asks before its first child dispatch, choose:

1. `Custom`.
2. `Cursor SDK` under the Cursor provider.
3. One model from the fresh catalog.
4. `Don't show again` if the choice should be project-local and reusable.

The gitignored `.vibekit/preferences.json` stores the orchestration mode, schema version, remember flag, configuration time, and role assignments. Cursor assignments contain only the provider, adapter, and model. The kit never stores credentials or account details there.

Use `read-only` unless the task needs edits. A `workspace-write` request starts only after the parent explicitly asserts mutation approval, workspace isolation, and protected-path checks. The adapter excludes shell, web, MCP, and nested-agent tools and disables file-based Cursor settings for both profiles, preventing configured hooks, MCP servers, and subagents from bypassing those tool lists.

## 4. Remember or change a model

Remember one role after verifying its model:

~~~sh
node .vibekit/scripts/orchestration-preference.mjs remember custom . \
  --assign reviewer=cursor:<verified-model-id> \
  --adapter reviewer=cursor-sdk
~~~

To change the model, run `models` again and repeat the command with the new id. To reset all orchestration choices:

~~~sh
node .vibekit/scripts/orchestration-preference.mjs forget .
~~~

## Validate without an API key

In an installed project, validate the packaged adapter syntax without a key:

~~~sh
node --check .vibekit/scripts/cursor-sdk-adapter.mjs
~~~

The Minimal Vibe Coding Kit source checkout also includes a maintainer-only fake-SDK sandbox contract. The installer and npm package do not copy its `test/` harness into consuming projects. From the kit source checkout, run:

~~~sh
npm run test:cursor-sdk-sandbox
~~~

For real dispatch semantics, request JSON, access profiles, and model-binding evidence, see [ORCHESTRATION_MODES.md](ORCHESTRATION_MODES.md#optional-cursor-sdk-adapter).
