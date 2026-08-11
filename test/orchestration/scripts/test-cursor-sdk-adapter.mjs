#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSupportedRuntime,
  buildAgentOptions,
  normalizeModelCatalog,
  resolveProjectRoot,
  runCursorAgent,
  unavailableEnvelope,
  validateModelSelection,
  validateRunRequest,
  versionAtLeast,
} from "../../../.vibekit/scripts/cursor-sdk-adapter.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const scriptPath = path.join(repoRoot, ".vibekit/scripts/cursor-sdk-adapter.mjs");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-cursor-sdk-sandbox-"));
const projectRoot = path.join(temporary, "project");
let checks = 0;

function check(fn) {
  fn();
  checks += 1;
}

function fakeSdk(captured, behavior = {}) {
  return {
    Cursor: {
      async me() {
        captured.authChecks += 1;
        return { apiKeyName: "redacted-test-key", createdAt: "2026-08-11T00:00:00.000Z" };
      },
      models: {
        async list() {
          return [
            { id: "composer-2.5", displayName: "Composer 2.5" },
            {
              id: "reason-model",
              displayName: "Reason Model",
              parameters: [{
                id: "effort",
                displayName: "Effort",
                values: [{ value: "medium" }, { value: "high" }],
              }],
            },
            {
              id: "auto-smart",
              displayName: "Cursor Router",
              parameters: [{
                id: "optimize_for",
                values: [{ value: "cost" }, { value: "balanced" }, { value: "intelligence" }],
              }],
            },
          ];
        },
      },
    },
    Agent: {
      async create(options) {
        captured.options.push(options);
        const agentId = "agent-sandbox-" + captured.options.length;
        return {
          agentId,
          async send(prompt) {
            captured.prompts.push(prompt);
            const runId = "run-sandbox-" + captured.prompts.length;
            return {
              id: runId,
              async wait() {
                return {
                  id: runId,
                  status: "finished",
                  result: "sandbox result",
                  model: behavior.effectiveModel
                    ? behavior.effectiveModel(options.model)
                    : options.model,
                };
              },
              async cancel() {
                captured.cancellations += 1;
              },
            };
          },
          async close() {
            captured.closes += 1;
          },
        };
      },
    },
  };
}

fs.mkdirSync(path.join(projectRoot, ".vibekit"), { recursive: true });
fs.writeFileSync(path.join(projectRoot, "backbone.yml"), "version: 2\n");

try {
  check(() => assert.equal(versionAtLeast("22.13.0", "22.13.0"), true));
  check(() => assert.equal(versionAtLeast("22.12.9", "22.13.0"), false));
  check(() => assert.throws(() => assertSupportedRuntime("22.12.9"), /requires Node\.js 22\.13\.0/));
  check(() => assert.equal(resolveProjectRoot(projectRoot), fs.realpathSync(projectRoot)));
  check(() => assert.throws(() => resolveProjectRoot(path.parse(projectRoot).root), /broad project root/));

  if (process.platform !== "win32") {
    const linkedRoot = path.join(temporary, "linked-project");
    fs.symlinkSync(projectRoot, linkedRoot);
    check(() => assert.throws(() => resolveProjectRoot(linkedRoot), /symlinked project root/));
  }

  const catalog = normalizeModelCatalog([
    { id: "plain", displayName: "Plain" },
    { id: "param", displayName: "Param", parameters: [{ id: "effort", values: [{ value: "high" }] }] },
  ]);
  check(() => assert.deepEqual(validateModelSelection("plain", catalog), { id: "plain" }));
  check(() => assert.throws(() => validateModelSelection("missing", catalog), /not available in the live Cursor catalog/));
  check(() => assert.throws(() => validateModelSelection("param", catalog), /explicit values are required/));
  check(() => assert.deepEqual(
    validateModelSelection({ id: "param", params: [{ id: "effort", value: "high" }] }, catalog),
    { id: "param", params: [{ id: "effort", value: "high" }] }
  ));
  check(() => assert.throws(
    () => validateRunRequest({ version: 1, access: "workspace-write", model: "plain", prompt: "Edit." }),
    /workspace-write requires mutationApproved, isolatedWorkspace, and protectedPathsChecked assertions/
  ));

  const readOptions = buildAgentOptions(projectRoot, { access: "read-only" }, { id: "plain" });
  check(() => assert.deepEqual(readOptions.tools, ["read", "grep", "glob", "ls"]));
  check(() => assert.equal(readOptions.local.sandboxOptions.enabled, true));
  check(() => assert.equal(readOptions.local.settingSources, undefined));

  const writeOptions = buildAgentOptions(projectRoot, { access: "workspace-write" }, { id: "plain" });
  check(() => assert.deepEqual(writeOptions.tools, ["read", "grep", "glob", "ls", "edit", "write"]));
  check(() => assert.equal(writeOptions.tools.includes("shell"), false));
  check(() => assert.equal(writeOptions.tools.includes("mcp"), false));
  check(() => assert.equal(writeOptions.tools.includes("task"), false));
  check(() => assert.equal(writeOptions.tools.includes("webSearch"), false));

  const captured = { authChecks: 0, options: [], prompts: [], closes: 0, cancellations: 0 };
  const sdk = fakeSdk(captured);
  const originalKey = process.env.CURSOR_API_KEY;
  process.env.CURSOR_API_KEY = "crsr_SANDBOX_SECRET_MUST_NOT_APPEAR";
  try {
    const readResult = await runCursorAgent({
      sdk,
      sdkVersion: "1.0.27",
      projectRoot,
      rawRequest: {
        version: 1,
        access: "read-only",
        model: "composer-2.5",
        prompt: "Inspect this sandbox without writing.",
        timeoutMs: 1000,
      },
      nodeVersion: "22.18.0",
    });
    check(() => assert.equal(readResult.modelBinding, "exact-match"));
    check(() => assert.equal(readResult.access, "read-only"));
    check(() => assert.equal(JSON.stringify(readResult).includes(process.env.CURSOR_API_KEY), false));
    const unavailable = unavailableEnvelope({
      code: "sdk-error",
      message: `failed ${process.env.CURSOR_API_KEY} crsr_SECOND_SECRET Bearer third.secret.value`,
    });
    check(() => assert.equal(unavailable.status, "unavailable"));
    check(() => assert.equal(unavailable.code, "sdk-error"));
    check(() => assert.equal(JSON.stringify(unavailable).includes(process.env.CURSOR_API_KEY), false));
    check(() => assert.equal(JSON.stringify(unavailable).includes("crsr_SECOND_SECRET"), false));
    check(() => assert.equal(JSON.stringify(unavailable).includes("third.secret.value"), false));

    const writeResult = await runCursorAgent({
      sdk,
      sdkVersion: "1.0.27",
      projectRoot,
      rawRequest: {
        version: 1,
        access: "workspace-write",
        authorization: {
          mutationApproved: true,
          isolatedWorkspace: true,
          protectedPathsChecked: true,
        },
        model: { id: "reason-model", params: [{ id: "effort", value: "high" }] },
        prompt: "Make one bounded edit in this sandbox.",
        timeoutMs: 1000,
      },
      nodeVersion: "22.18.0",
    });
    check(() => assert.equal(writeResult.modelBinding, "exact-match"));
    check(() => assert.equal(captured.options[1].tools.includes("write"), true));
    check(() => assert.equal(captured.options[1].tools.includes("shell"), false));
    check(() => assert.equal(captured.authChecks, 2));
    check(() => assert.equal(captured.closes, 2));

    const parameterMismatch = { authChecks: 0, options: [], prompts: [], closes: 0, cancellations: 0 };
    await assert.rejects(
      runCursorAgent({
        sdk: fakeSdk(parameterMismatch, {
          effectiveModel(model) {
            return { ...model, params: [{ id: "effort", value: "medium" }] };
          },
        }),
        sdkVersion: "1.0.27",
        projectRoot,
        rawRequest: {
          version: 1,
          access: "read-only",
          model: { id: "reason-model", params: [{ id: "effort", value: "high" }] },
          prompt: "Attest the complete model selection.",
          timeoutMs: 1000,
        },
        nodeVersion: "22.18.0",
      }),
      /model.*match/i
    );
    checks += 1;

    const missingParameters = { authChecks: 0, options: [], prompts: [], closes: 0, cancellations: 0 };
    await assert.rejects(
      runCursorAgent({
        sdk: fakeSdk(missingParameters, {
          effectiveModel(model) {
            return { id: model.id };
          },
        }),
        sdkVersion: "1.0.27",
        projectRoot,
        rawRequest: {
          version: 1,
          access: "read-only",
          model: { id: "reason-model", params: [{ id: "effort", value: "high" }] },
          prompt: "Reject missing effective parameters.",
          timeoutMs: 1000,
        },
        nodeVersion: "22.18.0",
      }),
      /model.*match/i
    );
    checks += 1;

    const routerResult = await runCursorAgent({
      sdk,
      sdkVersion: "1.0.27",
      projectRoot,
      rawRequest: {
        version: 1,
        access: "read-only",
        model: { id: "auto-smart", params: [{ id: "optimize_for", value: "balanced" }] },
        prompt: "Route this sandboxed analysis.",
        timeoutMs: 1000,
      },
      nodeVersion: "22.18.0",
    });
    check(() => assert.equal(routerResult.modelBinding, "router-selection"));
  } finally {
    if (originalKey === undefined) delete process.env.CURSOR_API_KEY;
    else process.env.CURSOR_API_KEY = originalKey;
  }

  const scriptText = fs.readFileSync(scriptPath, "utf8");
  check(() => assert.doesNotMatch(scriptText, /node:child_process|\beval\s*\(|\bexecSync\s*\(|\bspawnSync\s*\(/));
  check(() => assert.match(scriptText, /sandboxOptions: \{ enabled: true \}/));
  check(() => assert.match(scriptText, /READ_ONLY_TOOLS/));
  check(() => assert.match(scriptText, /WORKSPACE_WRITE_TOOLS/));
  check(() => assert.doesNotMatch(scriptText, /settingSources/));

  console.log("Cursor SDK adapter sandbox contract: " + checks + " checks passed");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
