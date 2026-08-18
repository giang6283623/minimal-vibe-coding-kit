#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  closeController,
  preflightCodex,
  replyController,
  resolveCodexCandidates,
  runProcess,
  startController,
} from "../../../.vibekit/skills/agent-control-center/scripts/codex-cli-controller-bridge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const fakeCli = path.join(root, "test/orchestration/fixtures/fake-codex-cli.mjs");
const processExecutableSha256 = crypto.createHash("sha256").update(fs.readFileSync(process.execPath)).digest("hex");
let checks = 0;

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
    .join(",") + "}";
}

function digest(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function projectFixture() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-bridge-project-"));
  fs.writeFileSync(path.join(project, "backbone.yml"), "version: 2\n");
  fs.mkdirSync(path.join(project, ".vibekit"));
  return fs.realpathSync(project);
}

function cursorExtensionFixture(extensionsRoot, version, platformDirectory = "macos-aarch64", filename = "codex") {
  const extensionRoot = path.join(extensionsRoot, "openai.chatgpt-" + version + "-darwin-arm64");
  const binRoot = path.join(extensionRoot, "bin", platformDirectory);
  fs.mkdirSync(binRoot, { recursive: true });
  fs.writeFileSync(path.join(extensionRoot, "package.json"), JSON.stringify({
    name: "chatgpt",
    publisher: "openai",
    version,
  }));
  const executable = path.join(binRoot, filename);
  fs.copyFileSync(fakeCli, executable);
  fs.chmodSync(executable, 0o755);
  return { extensionRoot: fs.realpathSync(extensionRoot), executable: fs.realpathSync(executable), version };
}

function writeCursorRegistry(extensionsRoot, extension, installedTimestamp = 1) {
  fs.writeFileSync(path.join(extensionsRoot, "extensions.json"), JSON.stringify([{
    identifier: { id: "openai.chatgpt" },
    version: extension.version,
    location: { fsPath: extension.extensionRoot },
    metadata: { installedTimestamp },
  }]));
}

function candidatePreflightRunner(versions, throwing = new Map()) {
  return async ({ binary, args }) => {
    const selected = fs.realpathSync(binary);
    if (throwing.has(selected)) throw new Error(throwing.get(selected));
    const version = versions.get(selected) || "9.9.9";
    const joined = args.join(" ");
    if (joined.endsWith("--version")) return { code: 0, stdout: "codex-cli " + version + "\n", stderr: "" };
    if (joined.includes("exec resume --help")) {
      return { code: 0, stdout: "SESSION_ID --json --output-schema\n", stderr: "" };
    }
    if (joined.includes("exec --help")) {
      return { code: 0, stdout: "--json --output-schema --model --disable --ignore-user-config\n", stderr: "" };
    }
    return { code: 0, stdout: "Logged in using ChatGPT\n", stderr: "" };
  };
}

function runtimeFixture(project, now = Date.now()) {
  const models = [{ id: "controller-model", reasoningEfforts: ["medium", "high"] }];
  const executableStat = fs.statSync(process.execPath);
  const executableIdentity = {
    device: String(executableStat.dev),
    inode: String(executableStat.ino),
    size: executableStat.size,
    modified_ms: Math.trunc(executableStat.mtimeMs),
    mode: executableStat.mode,
    sha256: processExecutableSha256,
  };
  const catalogDigest = digest(models);
  const routeBinding = {
    host: "current",
    hostAttestation: "test-host",
    source: "binary-override",
    provenanceAttestation: "test-host-declared",
    commandPath: process.execPath,
    executableRealPath: fs.realpathSync(process.execPath),
    executableIdentity,
    executableIdentityDigest: digest(executableIdentity),
    cliVersion: "9.9.9",
    releaseChannel: "stable",
    cacheVersion: "9.9.9",
    cacheFileDigest: digest("test-cache-file"),
    cacheSnapshotDigest: digest("test-cache-snapshot"),
    catalogDigest,
    extensionVersion: null,
    extensionManifestDigest: null,
    extensionRegistryDigest: null,
    adapter: "mvck-codex-cli-controller-bridge",
    provider: "codex",
    transport: "codex-cli",
    launchMode: "bridge-owned-child-process",
    processReuse: false,
  };
  return {
    version: 1,
    status: "installed-unverified",
    localAdapterStatus: "ready",
    liveRouteStatus: "installed-unverified",
    provider: "codex",
    transport: "codex-cli",
    adapter: "mvck-codex-cli-controller-bridge",
    projectRoot: project,
    commandPath: process.execPath,
    executableRealPath: fs.realpathSync(process.execPath),
    executableIdentity,
    executableIdentityDigest: routeBinding.executableIdentityDigest,
    cliVersion: "9.9.9",
    cacheVersion: "9.9.9",
    cacheFileDigest: routeBinding.cacheFileDigest,
    cacheSnapshotDigest: routeBinding.cacheSnapshotDigest,
    catalogFetchedAt: new Date(now).toISOString(),
    catalogDigest,
    models,
    routeBinding,
    routeBindingDigest: digest(routeBinding),
    modelBinding: "requested-not-attested",
    verifiedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
  };
}

function taskEnvelope(project, overrides = {}) {
  const base = {
    version: 2,
    task_id: "task-controller-bridge-test",
    objective: "Prove a stateful external-controller relay with deterministic local evidence",
    controller: "codex",
    relay: { mode: "automatic-host-relay", resume_controller: true },
    controller_route: {
      provider: "codex",
      transport: "codex-cli",
      model: "controller-model",
      reasoning_effort: "high",
      selection_source: "explicit-user",
    },
    worker_defaults: {
      provider: "cursor",
      transport: "native-subagents",
      model: "worker-model",
      reasoning_effort: "medium",
      selection_source: "explicit-user",
    },
    topology: "parallel-analysis",
    repo_root: project,
    scope: { allowed_paths: ["src"], protected_paths: [] },
    authorization: { mutation: false, external_actions: false },
    budget: { max_workers: 2, max_retries: 1, timeout_ms: 600000 },
    acceptance: { commands: [], artifacts: ["bounded report"], human_gates: [] },
  };
  return { ...base, ...overrides };
}

function selection(runtime, overrides = {}) {
  return {
    mechanism: "native-structured-question",
    question_tool: "AskUserQuestion",
    model: "controller-model",
    reasoning_effort: "high",
    inventory_digest: runtime.catalogDigest,
    inventory_verified_at: runtime.verifiedAt,
    ...overrides,
  };
}

async function expectReject(promise, pattern) {
  await assert.rejects(promise, pattern);
  checks += 1;
}

const project = projectFixture();
const nowMs = Date.now();
const now = new Date(nowMs).toISOString();
const runtime = runtimeFixture(project, nowMs);
const captureStart = path.join(os.tmpdir(), "mvck-bridge-capture-start-" + crypto.randomUUID() + ".json");
const started = await startController({
  projectRoot: project,
  rawRequest: {
    version: 1,
    task_envelope: taskEnvelope(project),
    selection: selection(runtime),
    timeout_ms: 5000,
  },
  runtime,
  runner: runProcess,
  now,
  env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders", FAKE_CODEX_CAPTURE: captureStart },
  codexPrefixArgs: [fakeCli],
});
assert.equal(started.status, "controller-response");
assert.equal(started.sequence, 1);
assert.equal(started.phase, "awaiting-host");
assert.equal(started.requested_runtime.attestation, "requested-not-attested");
assert.equal(started.requested_runtime.multi_agent, "disabled");
assert.equal(started.requested_runtime.route_binding_digest, runtime.routeBindingDigest);
assert.equal(started.requested_runtime.route_binding.launchMode, "bridge-owned-child-process");
assert.equal(started.requested_runtime.route_binding.processReuse, false);
assert.ok(path.isAbsolute(started.state_path));
assert.equal(started.state_path.startsWith(project + path.sep), false);
assert.equal(fs.lstatSync(started.state_path).isSymbolicLink(), false);
if (process.platform !== "win32") assert.equal(fs.statSync(started.state_path).mode & 0o077, 0);
const privateState = JSON.parse(fs.readFileSync(started.state_path, "utf8"));
assert.equal("task_envelope" in privateState, false);
assert.equal("objective" in privateState.task_contract, false);
checks += 14;

const startCapture = JSON.parse(fs.readFileSync(captureStart, "utf8"));
assert.equal(startCapture.args[0], "exec");
assert.ok(startCapture.args.includes("--json"));
assert.ok(startCapture.args.includes("--output-schema"));
assert.ok(startCapture.args.includes("--ignore-user-config"));
assert.ok(startCapture.args.includes("multi_agent"));
assert.ok(startCapture.args.includes("agents.enabled=false"));
assert.equal(startCapture.args.includes("--last"), false);
assert.equal(startCapture.args.includes("app-server"), false);
assert.notEqual(startCapture.args[startCapture.args.indexOf("-C") + 1], project);
checks += 9;

const receipt = {
  task_id: "task-controller-bridge-test",
  work_id: "work-bridge-1",
  status: "complete",
  issuer: "cursor-host",
  effective_runtime: {
    provider: "cursor",
    model: "worker-model",
    attestation: "requested-not-attested",
  },
  scope_used: ["src"],
  files_changed: [],
  commands_run: [],
  artifacts: ["bounded report"],
  evidence: ["bounded report digest"],
  residual_risks: [],
  needs_user_input: null,
};
const receiptDigest = digest(receipt);
const exchange = {
  exchange_id: "exchange-receipt-1",
  events: [{ kind: "worker-receipt", payload: receipt }],
};
const captureReply = path.join(os.tmpdir(), "mvck-bridge-capture-reply-" + crypto.randomUUID() + ".json");
const replyRuntime = runtimeFixture(project, nowMs + 1000);
const replied = await replyController({
  statePath: started.state_path,
  rawRequest: {
    version: 1,
    task_id: "task-controller-bridge-test",
    expected_sequence: 2,
    exchange,
  },
  runtime: replyRuntime,
  runner: runProcess,
  now: new Date(nowMs + 1000).toISOString(),
  env: {
    ...process.env,
    FAKE_CODEX_SCENARIO: "accept",
    FAKE_CODEX_CAPTURE: captureReply,
    FAKE_RECEIPT_BINDINGS: JSON.stringify([{ work_id: "work-bridge-1", receipt_digest: receiptDigest }]),
  },
  codexPrefixArgs: [fakeCli],
});
assert.equal(replied.session_id, started.session_id);
assert.equal(replied.sequence, 2);
assert.equal(replied.phase, "closed");
assert.equal(replied.controller_response.decision, "accept");
assert.equal(replied.trace_event.type, "controller-session-resumed");
checks += 5;

const replyCapture = JSON.parse(fs.readFileSync(captureReply, "utf8"));
assert.deepEqual(replyCapture.args.slice(0, 2), ["exec", "resume"]);
assert.ok(replyCapture.args.includes(started.session_id));
assert.equal(replyCapture.args.includes("--last"), false);
const relayedLine = replyCapture.input.split("\n").at(-1);
assert.deepEqual(JSON.parse(relayedLine), exchange);
checks += 4;

const persisted = JSON.parse(fs.readFileSync(started.state_path, "utf8"));
assert.equal(persisted.receipt_digests["work-bridge-1"], receiptDigest);
assert.equal(persisted.exchange_digests["exchange-receipt-1"], digest(exchange));
assert.equal(JSON.stringify(persisted).includes("bounded report digest"), false);
assert.equal(persisted.status, "closed");
checks += 4;

await expectReject(
  replyController({
    statePath: started.state_path,
    rawRequest: { version: 1, task_id: "task-controller-bridge-test", expected_sequence: 3, exchange },
    runtime: runtimeFixture(project, nowMs + 2000),
  }),
  /workflow is closed/
);

const incompleteRuntime = runtimeFixture(project, nowMs + 2100);
const incompleteStart = await startController({
  projectRoot: project,
  rawRequest: { version: 1, task_envelope: taskEnvelope(project), selection: selection(incompleteRuntime) },
  runtime: incompleteRuntime,
  runner: runProcess,
  now: new Date(nowMs + 2100).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders" },
  codexPrefixArgs: [fakeCli],
});
const incompleteReceipt = { ...receipt };
delete incompleteReceipt.effective_runtime;
await expectReject(
  replyController({
    statePath: incompleteStart.state_path,
    rawRequest: {
      version: 1,
      task_id: "task-controller-bridge-test",
      expected_sequence: 2,
      exchange: {
        exchange_id: "exchange-incomplete-receipt",
        events: [{ kind: "worker-receipt", payload: incompleteReceipt }],
      },
    },
    runtime: runtimeFixture(project, nowMs + 2200),
    runner: () => { throw new Error("runner must not be called"); },
    now: new Date(nowMs + 2200).toISOString(),
  }),
  /requires effective_runtime/
);

const failedRuntime = runtimeFixture(project, nowMs + 2300);
const failedStart = await startController({
  projectRoot: project,
  rawRequest: { version: 1, task_envelope: taskEnvelope(project), selection: selection(failedRuntime) },
  runtime: failedRuntime,
  runner: runProcess,
  now: new Date(nowMs + 2300).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders" },
  codexPrefixArgs: [fakeCli],
});
const failedReceipt = { ...receipt, status: "failed", needs_user_input: "Controller must retry or stop." };
const failedDigest = digest(failedReceipt);
await expectReject(
  replyController({
    statePath: failedStart.state_path,
    rawRequest: {
      version: 1,
      task_id: "task-controller-bridge-test",
      expected_sequence: 2,
      exchange: {
        exchange_id: "exchange-failed-receipt",
        events: [{ kind: "worker-receipt", payload: failedReceipt }],
      },
    },
    runtime: runtimeFixture(project, nowMs + 2400),
    runner: runProcess,
    now: new Date(nowMs + 2400).toISOString(),
    env: {
      ...process.env,
      FAKE_CODEX_SCENARIO: "accept",
      FAKE_RECEIPT_BINDINGS: JSON.stringify([{ work_id: "work-bridge-1", receipt_digest: failedDigest }]),
    },
    codexPrefixArgs: [fakeCli],
  }),
  /complete receipt for every issued work order/
);

const prooflineRuntime = runtimeFixture(project, nowMs + 2500);
const prooflineStart = await startController({
  projectRoot: project,
  rawRequest: {
    version: 1,
    task_envelope: taskEnvelope(project, { topology: "proofline" }),
    selection: selection(prooflineRuntime),
  },
  runtime: prooflineRuntime,
  runner: runProcess,
  now: new Date(nowMs + 2500).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders" },
  codexPrefixArgs: [fakeCli],
});
await expectReject(
  replyController({
    statePath: prooflineStart.state_path,
    rawRequest: {
      version: 1,
      task_id: "task-controller-bridge-test",
      expected_sequence: 2,
      exchange: {
        exchange_id: "exchange-forged-seal",
        events: [
          { kind: "worker-receipt", payload: receipt },
          {
            kind: "proofline-signal",
            payload: { type: "SEAL_GRANTED", task_id: "task-controller-bridge-test", issuer: "keeper", verified: true },
          },
        ],
      },
    },
    runtime: runtimeFixture(project, nowMs + 2600),
    runner: runProcess,
    now: new Date(nowMs + 2600).toISOString(),
    env: {
      ...process.env,
      FAKE_CODEX_SCENARIO: "accept",
      FAKE_RECEIPT_BINDINGS: JSON.stringify([{ work_id: "work-bridge-1", receipt_digest: receiptDigest }]),
    },
    codexPrefixArgs: [fakeCli],
  }),
  /protected Keeper verifier outside this bridge/
);

const askRuntime = runtimeFixture(project, nowMs + 3000);
const asked = await startController({
  projectRoot: project,
  rawRequest: {
    version: 1,
    task_envelope: taskEnvelope(project, {
      acceptance: { commands: [], artifacts: [], human_gates: [] },
    }),
    selection: selection(askRuntime),
  },
  runtime: askRuntime,
  runner: runProcess,
  now: new Date(nowMs + 3000).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "ask-user" },
  codexPrefixArgs: [fakeCli],
});
assert.equal(asked.phase, "awaiting-user");
assert.equal(asked.controller_response.question.question_id, "question-controller-model");
checks += 2;

const askReplyRuntime = runtimeFixture(project, nowMs + 4000);
const answered = await replyController({
  statePath: asked.state_path,
  rawRequest: {
    version: 1,
    task_id: "task-controller-bridge-test",
    expected_sequence: 2,
    exchange: {
      exchange_id: "exchange-user-answer",
      events: [{
        kind: "user-answer",
        payload: { question_id: "question-controller-model", answer: "Continue" },
      }],
    },
  },
  runtime: askReplyRuntime,
  runner: runProcess,
  now: new Date(nowMs + 4000).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "accept", FAKE_RECEIPT_BINDINGS: "[]" },
  codexPrefixArgs: [fakeCli],
});
assert.equal(answered.session_id, asked.session_id);
assert.equal(answered.phase, "closed");
checks += 2;

for (const provider of ["claude", "cursor", "opencode", "grok", "kimi"]) {
  const envelope = taskEnvelope(project, {
    controller: provider,
    controller_route: {
      provider,
      transport: "api",
      model: "provider-model",
      reasoning_effort: "high",
      selection_source: "explicit-user",
    },
  });
  await expectReject(
    startController({
      projectRoot: project,
      rawRequest: { version: 1, task_envelope: envelope, selection: selection(runtime) },
      runtime,
      runner: () => { throw new Error("runner must not be called"); },
      now,
    }),
    /supports only controller=codex/
  );
}

await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project, {
        controller_route: {
          provider: "codex",
          transport: "mcp",
          model: "controller-model",
          reasoning_effort: "high",
          selection_source: "explicit-user",
        },
      }),
      selection: selection(runtime),
    },
    runtime,
    runner: () => { throw new Error("runner must not be called"); },
    now,
  }),
  /only provider=codex and transport=codex-cli/
);

await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project, {
        worker_defaults: {
          provider: "cursor",
          transport: "claude-cli",
          model: "worker-model",
          reasoning_effort: "medium",
          selection_source: "explicit-user",
        },
      }),
      selection: selection(runtime),
    },
    runtime,
    runner: () => { throw new Error("runner must not be called"); },
    now,
  }),
  /transport does not match its provider/
);

await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project, {
        scope: { allowed_paths: ["src/**"], protected_paths: [] },
      }),
      selection: selection(runtime),
    },
    runtime,
    runner: () => { throw new Error("runner must not be called"); },
    now,
  }),
  /exact path, not a glob pattern/
);

const outsideScope = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-outside-scope-"));
fs.symlinkSync(outsideScope, path.join(project, "linked-scope"));
await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project, {
        scope: { allowed_paths: ["linked-scope"], protected_paths: [] },
      }),
      selection: selection(runtime),
    },
    runtime,
    runner: () => { throw new Error("runner must not be called"); },
    now,
  }),
  /crosses a symlinked repository path/
);

await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project, {
        scope: { allowed_paths: ["src"], protected_paths: [] },
      }),
      selection: selection(runtime),
    },
    runtime,
    runner: async ({ input }) => {
      const taskLine = input.split("\n").find((line) => line.startsWith('{"version":2'));
      const task = JSON.parse(taskLine);
      return {
        code: 0,
        stderr: "",
        stdout: [
          JSON.stringify({ type: "thread.started", thread_id: "0199a213-81c0-7800-8aa1-bbab2a035a70" }),
          JSON.stringify({
            type: "item.completed",
            item: {
              type: "agent_message",
              text: JSON.stringify({
                version: 1,
                task_id: task.task_id,
                kind: "work-orders",
                work_orders: [{
                  work_id: "work-scope-escape",
                  task_id: task.task_id,
                  role: "bounded-reader",
                  executor_provider: task.worker_defaults.provider,
                  executor_transport: task.worker_defaults.transport,
                  requested_model: task.worker_defaults.model,
                  requested_reasoning_effort: task.worker_defaults.reasoning_effort,
                  read_only: true,
                  paths: ["../outside"],
                  instructions: "Attempt a scope escape.",
                  expected_artifacts: [],
                  validation: [],
                  stop_conditions: [],
                  allow_child_dispatch: false,
                }],
              }),
            },
          }),
        ].join("\n") + "\n",
      };
    },
    now,
  }),
  /escapes the repository root/
);

for (const scenario of ["malformed", "duplicate-thread", "duplicate-message"]) {
  await expectReject(
    startController({
      projectRoot: project,
      rawRequest: { version: 1, task_envelope: taskEnvelope(project), selection: selection(runtime) },
      runtime,
      runner: runProcess,
      now,
      env: { ...process.env, FAKE_CODEX_SCENARIO: scenario },
      codexPrefixArgs: [fakeCli],
    }),
    /JSONL|thread.started/
  );
}

for (const [flag, pattern] of [
  ["FAKE_CODEX_EXTRA_FIELD", /unsupported fields/],
  ["FAKE_CODEX_WRITABLE", /authorization.mutation=true/],
]) {
  await expectReject(
    startController({
      projectRoot: project,
      rawRequest: { version: 1, task_envelope: taskEnvelope(project), selection: selection(runtime) },
      runtime,
      runner: runProcess,
      now,
      env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders", [flag]: "1" },
      codexPrefixArgs: [fakeCli],
    }),
    pattern
  );
}

await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project, {
        budget: { max_workers: 2, max_retries: 1, timeout_ms: 2000 },
      }),
      selection: selection(runtime),
      timeout_ms: 2001,
    },
    runtime,
    runner: () => { throw new Error("runner must not be called"); },
    now,
  }),
  /task budget timeout/
);

const wrongThreadRuntime = runtimeFixture(project, nowMs + 5000);
const wrongThreadStart = await startController({
  projectRoot: project,
  rawRequest: { version: 1, task_envelope: taskEnvelope(project), selection: selection(wrongThreadRuntime) },
  runtime: wrongThreadRuntime,
  runner: runProcess,
  now: new Date(nowMs + 5000).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders" },
  codexPrefixArgs: [fakeCli],
});
await expectReject(
  replyController({
    statePath: wrongThreadStart.state_path,
    rawRequest: {
      version: 1,
      task_id: "task-controller-bridge-test",
      expected_sequence: 2,
      exchange: {
        exchange_id: "exchange-wrong-thread",
        events: [{ kind: "worker-receipt", payload: receipt }],
      },
    },
    runtime: runtimeFixture(project, nowMs + 6000),
    runner: runProcess,
    now: new Date(nowMs + 6000).toISOString(),
    env: { ...process.env, FAKE_CODEX_SCENARIO: "wrong-thread" },
    codexPrefixArgs: [fakeCli],
  }),
  /different session ID/
);

const closeRuntime = runtimeFixture(project, nowMs + 7000);
const closable = await startController({
  projectRoot: project,
  rawRequest: { version: 1, task_envelope: taskEnvelope(project), selection: selection(closeRuntime) },
  runtime: closeRuntime,
  runner: runProcess,
  now: new Date(nowMs + 7000).toISOString(),
  env: { ...process.env, FAKE_CODEX_SCENARIO: "work-orders" },
  codexPrefixArgs: [fakeCli],
});
const closed = closeController({ statePath: closable.state_path, reason: "test-close", now: new Date(nowMs + 8000).toISOString() });
assert.equal(closed.status, "closed");
assert.equal(closed.close_reason, "test-close");
assert.equal(closed.route_binding_digest, closeRuntime.routeBindingDigest);
assert.equal(closed.route_binding.processReuse, false);
checks += 4;

const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-codex-cache-"));
fs.writeFileSync(path.join(cacheRoot, "models_cache.json"), JSON.stringify({
  fetched_at: now,
  client_version: "9.9.9",
  models: [{ slug: "controller-model", supported_reasoning_levels: [{ effort: "high" }] }],
}));
const fakePreflightRunner = async ({ args }) => {
  const joined = args.join(" ");
  if (joined.endsWith("--version")) return { code: 0, stdout: "codex-cli 9.9.9\n", stderr: "" };
  if (joined.includes("exec resume --help")) {
    return { code: 0, stdout: "SESSION_ID --json --output-schema\n", stderr: "" };
  }
  if (joined.includes("exec --help")) {
    return { code: 0, stdout: "--json --output-schema --model --disable --ignore-user-config\n", stderr: "" };
  }
  return { code: 0, stdout: "Logged in using ChatGPT\n", stderr: "" };
};
const preflight = await preflightCodex({
  projectRoot: project,
  runner: fakePreflightRunner,
  env: { ...process.env, CODEX_HOME: cacheRoot },
  now,
  binaryOverride: { commandPath: process.execPath, realPath: fs.realpathSync(process.execPath) },
});
assert.equal(preflight.status, "installed-unverified");
assert.equal(preflight.localAdapterStatus, "ready");
assert.deepEqual(preflight.models, [{ id: "controller-model", reasoningEfforts: ["high"] }]);
assert.equal(preflight.routeSource, "binary-override");
assert.equal(preflight.routeBinding.processReuse, false);
assert.equal(preflight.routeBinding.launchMode, "bridge-owned-child-process");
assert.equal(preflight.routeBindingDigest, digest(preflight.routeBinding));
checks += 7;

const cursorHome = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-cursor-home-"));
const cursorExtensionsPath = path.join(cursorHome, ".cursor", "extensions");
fs.mkdirSync(cursorExtensionsPath, { recursive: true });
const cursorExtensionsRoot = fs.realpathSync(cursorExtensionsPath);
const activeCursorExtension = cursorExtensionFixture(cursorExtensionsRoot, "26.5814.41407");
const newerCursorExtension = cursorExtensionFixture(cursorExtensionsRoot, "26.814.41407");
writeCursorRegistry(cursorExtensionsRoot, activeCursorExtension, 200);
const cursorPathDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-cursor-path-"));
const cursorPathCodex = path.join(cursorPathDirectory, "codex");
fs.copyFileSync(fakeCli, cursorPathCodex);
fs.chmodSync(cursorPathCodex, 0o755);
const cursorEnv = {
  ...process.env,
  PATH: cursorPathDirectory,
  CODEX_HOME: cacheRoot,
  CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "codex_vscode",
  CURSOR_SPAWNED_BY_EXTENSION_ID: "openai.chatgpt",
  CURSOR_SPAWN_CHAIN: "openai.chatgpt",
};
const allMatchingVersions = new Map([
  [activeCursorExtension.executable, "9.9.9"],
  [newerCursorExtension.executable, "9.9.9"],
  [fs.realpathSync(cursorPathCodex), "9.9.9"],
]);
const cursorPreflight = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(allMatchingVersions),
  env: cursorEnv,
  now,
  homeDirectory: cursorHome,
  cursorExtensionsRoot,
  platform: "darwin",
  architecture: "arm64",
});
assert.equal(cursorPreflight.localAdapterStatus, "ready");
assert.equal(cursorPreflight.host, "cursor");
assert.equal(cursorPreflight.routeSource, "cursor-extension-active-host-declared");
assert.equal(cursorPreflight.commandPath, activeCursorExtension.executable);
assert.equal(cursorPreflight.provenanceAttestation, "local-structural-not-cryptographic");
assert.equal(cursorPreflight.candidateAttempts.length, 0);
checks += 6;

const fallbackVersions = new Map(allMatchingVersions);
fallbackVersions.set(activeCursorExtension.executable, "9.9.8");
const fallbackPreflight = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(fallbackVersions),
  env: cursorEnv,
  now,
  homeDirectory: cursorHome,
  cursorExtensionsRoot,
  platform: "darwin",
  architecture: "arm64",
});
assert.equal(fallbackPreflight.localAdapterStatus, "ready");
assert.equal(fallbackPreflight.routeSource, "cursor-extension-installed");
assert.equal(fallbackPreflight.commandPath, newerCursorExtension.executable);
assert.equal(fallbackPreflight.candidateAttempts.length, 1);
assert.equal(fallbackPreflight.candidateAttempts[0].code, "model-cache-version-mismatch");
checks += 5;

const redactedFallback = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(allMatchingVersions, new Map([
    [activeCursorExtension.executable, "Bearer secret-should-not-leak"],
  ])),
  env: cursorEnv,
  now,
  homeDirectory: cursorHome,
  cursorExtensionsRoot,
  platform: "darwin",
  architecture: "arm64",
});
assert.equal(redactedFallback.routeSource, "cursor-extension-installed");
assert.equal(redactedFallback.candidateAttempts[0].message.includes("secret-should-not-leak"), false);
assert.equal(redactedFallback.candidateAttempts[0].message.includes("[REDACTED]"), true);
checks += 3;

const explicitPreflight = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(allMatchingVersions),
  env: { ...cursorEnv, MVCK_CODEX_BIN: newerCursorExtension.executable },
  now,
  homeDirectory: cursorHome,
  cursorExtensionsRoot,
  platform: "darwin",
  architecture: "arm64",
});
assert.equal(explicitPreflight.routeSource, "explicit-override");
assert.equal(explicitPreflight.commandPath, newerCursorExtension.executable);
assert.equal(explicitPreflight.fallbackPolicy, "stop");
checks += 3;

const invalidExplicit = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(allMatchingVersions),
  env: { ...cursorEnv, MVCK_CODEX_BIN: path.join(cursorHome, "missing-codex") },
  now,
  homeDirectory: cursorHome,
  cursorExtensionsRoot,
  platform: "darwin",
  architecture: "arm64",
});
assert.equal(invalidExplicit.status, "unavailable");
assert.equal(invalidExplicit.code, "codex-explicit-invalid");
checks += 2;

const emptyExplicit = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(allMatchingVersions),
  env: { ...cursorEnv, MVCK_CODEX_BIN: "" },
  now,
  homeDirectory: cursorHome,
  cursorExtensionsRoot,
  platform: "darwin",
  architecture: "arm64",
});
assert.equal(emptyExplicit.code, "codex-explicit-invalid");
checks += 1;

const windowsHome = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-windows-cursor-home-"));
const windowsExtensionsPath = path.join(windowsHome, ".cursor", "extensions");
fs.mkdirSync(windowsExtensionsPath, { recursive: true });
const windowsExtensions = fs.realpathSync(windowsExtensionsPath);
const windowsExtension = cursorExtensionFixture(windowsExtensions, "26.900.1", "windows-x86_64", "codex.exe");
writeCursorRegistry(windowsExtensions, windowsExtension, 300);
const windowsInventory = resolveCodexCandidates({
  env: {
    ...process.env,
    PATH: "",
    CODEX_INTERNAL_ORIGINATOR_OVERRIDE: "codex_vscode",
    CURSOR_SPAWNED_BY_EXTENSION_ID: "openai.chatgpt",
  },
  homeDirectory: windowsHome,
  cursorExtensionsRoot: windowsExtensions,
  platform: "win32",
  architecture: "x64",
});
assert.equal(windowsInventory.candidates[0].commandPath, windowsExtension.executable);
assert.equal(windowsInventory.candidates[0].source, "cursor-extension-active-host-declared");
checks += 2;

const prereleaseRunner = candidatePreflightRunner(new Map([[fs.realpathSync(process.execPath), "9.9.9-alpha.1"]]));
const prereleaseMismatch = await preflightCodex({
  projectRoot: project,
  runner: prereleaseRunner,
  env: { ...process.env, CODEX_HOME: cacheRoot },
  now,
  binaryOverride: { commandPath: process.execPath, realPath: fs.realpathSync(process.execPath) },
});
assert.equal(prereleaseMismatch.code, "model-cache-version-mismatch");
checks += 1;

const prereleaseCacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-prerelease-cache-"));
fs.writeFileSync(path.join(prereleaseCacheRoot, "models_cache.json"), JSON.stringify({
  fetched_at: now,
  client_version: "9.9.9-alpha.1",
  models: [{ slug: "controller-model", supported_reasoning_levels: [{ effort: "high" }] }],
}));
const prereleaseExact = await preflightCodex({
  projectRoot: project,
  runner: prereleaseRunner,
  env: { ...process.env, CODEX_HOME: prereleaseCacheRoot },
  now,
  binaryOverride: { commandPath: process.execPath, realPath: fs.realpathSync(process.execPath) },
});
assert.equal(prereleaseExact.localAdapterStatus, "ready");
assert.equal(prereleaseExact.releaseChannel, "prerelease");
checks += 2;

const mismatchedCache = JSON.parse(fs.readFileSync(path.join(cacheRoot, "models_cache.json"), "utf8"));
mismatchedCache.client_version = "9.9.10";
fs.writeFileSync(path.join(cacheRoot, "models_cache.json"), JSON.stringify(mismatchedCache));
const mismatch = await preflightCodex({
  projectRoot: project,
  runner: fakePreflightRunner,
  env: { ...process.env, CODEX_HOME: cacheRoot },
  now,
  binaryOverride: { commandPath: process.execPath, realPath: fs.realpathSync(process.execPath) },
});
assert.equal(mismatch.status, "installed-unverified");
assert.equal(mismatch.code, "model-cache-version-mismatch");
checks += 2;

const fakeBinDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-fake-codex-bin-"));
const fakeCodexBinary = path.join(fakeBinDirectory, "codex");
fs.copyFileSync(fakeCli, fakeCodexBinary);
fs.chmodSync(fakeCodexBinary, 0o755);
const bridgeCli = path.join(root, ".vibekit/skills/agent-control-center/scripts/codex-cli-controller-bridge.mjs");
mismatchedCache.client_version = "9.9.9";
fs.writeFileSync(path.join(cacheRoot, "models_cache.json"), JSON.stringify(mismatchedCache));
const cliPreflightPass = spawnSync(process.execPath, [bridgeCli, "preflight", project], {
  encoding: "utf8",
  env: {
    ...process.env,
    PATH: fakeBinDirectory + path.delimiter + process.env.PATH,
    CODEX_HOME: cacheRoot,
    MVCK_HOST: "current",
    FAKE_CODEX_VERSION: "9.9.9",
  },
});
assert.equal(cliPreflightPass.status, 0, cliPreflightPass.stderr);
const cliPreflightPassBody = JSON.parse(cliPreflightPass.stdout);
assert.equal(cliPreflightPassBody.status, "installed-unverified");
assert.equal(cliPreflightPassBody.localAdapterStatus, "ready");
checks += 3;

mismatchedCache.client_version = "9.9.10";
fs.writeFileSync(path.join(cacheRoot, "models_cache.json"), JSON.stringify(mismatchedCache));
const cliPreflightFail = spawnSync(process.execPath, [bridgeCli, "preflight", project], {
  encoding: "utf8",
  env: {
    ...process.env,
    PATH: fakeBinDirectory + path.delimiter + process.env.PATH,
    CODEX_HOME: cacheRoot,
    MVCK_HOST: "current",
    FAKE_CODEX_VERSION: "9.9.9",
  },
});
assert.notEqual(cliPreflightFail.status, 0);
assert.equal(JSON.parse(cliPreflightFail.stdout).localAdapterStatus, "installed-unverified");
checks += 2;

const integrityDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-integrity-codex-"));
const integrityBinary = path.join(integrityDirectory, "codex");
fs.copyFileSync(fakeCli, integrityBinary);
fs.chmodSync(integrityBinary, 0o755);
const integrityFixedTime = new Date(1700000000000);
fs.utimesSync(integrityBinary, integrityFixedTime, integrityFixedTime);
const integrityCacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-integrity-cache-"));
fs.writeFileSync(path.join(integrityCacheRoot, "models_cache.json"), JSON.stringify({
  fetched_at: now,
  client_version: "9.9.9",
  models: [{ slug: "controller-model", supported_reasoning_levels: [{ effort: "high" }] }],
}));
const integrityRuntime = await preflightCodex({
  projectRoot: project,
  runner: candidatePreflightRunner(new Map([[fs.realpathSync(integrityBinary), "9.9.9"]])),
  env: { ...process.env, CODEX_HOME: integrityCacheRoot },
  now,
  binaryOverride: { commandPath: integrityBinary, realPath: fs.realpathSync(integrityBinary) },
});
assert.equal(integrityRuntime.localAdapterStatus, "ready");
const integrityBefore = fs.statSync(integrityBinary);
const integrityBytes = fs.readFileSync(integrityBinary);
integrityBytes[integrityBytes.length - 2] ^= 1;
fs.writeFileSync(integrityBinary, integrityBytes);
fs.chmodSync(integrityBinary, integrityBefore.mode);
fs.utimesSync(integrityBinary, integrityBefore.atime, integrityBefore.mtime);
const integrityAfter = fs.statSync(integrityBinary);
assert.equal(integrityAfter.size, integrityBefore.size);
assert.equal(Math.trunc(integrityAfter.mtimeMs), Math.trunc(integrityBefore.mtimeMs));
assert.equal(String(integrityAfter.ino), String(integrityBefore.ino));
assert.notEqual(
  crypto.createHash("sha256").update(fs.readFileSync(integrityBinary)).digest("hex"),
  integrityRuntime.executableIdentity.sha256
);
checks += 5;
await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project),
      selection: selection(integrityRuntime),
    },
    runtime: integrityRuntime,
    runner: () => { throw new Error("runner must not be called after executable content drift"); },
    now,
  }),
  /executable identity changed/
);

const executableLink = path.join(os.tmpdir(), "mvck-codex-link-" + crypto.randomUUID());
fs.symlinkSync(process.execPath, executableLink);
const retargetedRuntime = runtimeFixture(project, nowMs + 9000);
retargetedRuntime.commandPath = executableLink;
fs.unlinkSync(executableLink);
fs.symlinkSync(fakeCli, executableLink);
await expectReject(
  startController({
    projectRoot: project,
    rawRequest: {
      version: 1,
      task_envelope: taskEnvelope(project),
      selection: selection(retargetedRuntime),
    },
    runtime: retargetedRuntime,
    runner: () => { throw new Error("runner must not be called"); },
    now: new Date(nowMs + 9000).toISOString(),
  }),
  /executable identity changed/
);

await expectReject(
  runProcess({
    binary: process.execPath,
    args: [fakeCli],
    input: "",
    cwd: project,
    timeoutMs: 50,
    env: { ...process.env, FAKE_CODEX_SCENARIO: "sleep" },
  }),
  /exceeded timeout_ms/
);

if (process.platform !== "win32") {
  const descendantPidFile = path.join(os.tmpdir(), "mvck-descendant-pid-" + crypto.randomUUID());
  await expectReject(
    runProcess({
      binary: process.execPath,
      args: [fakeCli],
      input: "",
      cwd: project,
      timeoutMs: 100,
      env: {
        ...process.env,
        FAKE_CODEX_SCENARIO: "descendant-sleep",
        FAKE_DESCENDANT_PID: descendantPidFile,
      },
    }),
    /exceeded timeout_ms/
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  const descendantPid = Number(fs.readFileSync(descendantPidFile, "utf8"));
  assert.throws(() => process.kill(descendantPid, 0));
  checks += 1;
}

console.log("Codex CLI controller bridge contract: " + checks + " checks passed");
