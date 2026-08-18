#!/usr/bin/env node

import fs from "node:fs";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const input = await new Promise((resolve) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
});

if (process.env.FAKE_CODEX_CAPTURE) {
  fs.writeFileSync(process.env.FAKE_CODEX_CAPTURE, JSON.stringify({ args, input }, null, 2));
}

if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("codex-cli " + (process.env.FAKE_CODEX_VERSION || "9.9.9") + "\n");
  process.exit(0);
}
if (args[0] === "exec" && args[1] === "resume" && args.includes("--help")) {
  process.stdout.write("SESSION_ID --json --output-schema\n");
  process.exit(0);
}
if (args[0] === "exec" && args.includes("--help")) {
  process.stdout.write("--json --output-schema --model --disable --ignore-user-config\n");
  process.exit(0);
}
if (args[0] === "login" && args[1] === "status") {
  process.stdout.write("Logged in using ChatGPT\n");
  process.exit(0);
}

const scenario = process.env.FAKE_CODEX_SCENARIO || "work-orders";
const configuredSession = process.env.FAKE_CODEX_SESSION || "0199a213-81c0-7800-8aa1-bbab2a035a53";
const resumed = args[0] === "exec" && args[1] === "resume";
const sessionId = scenario === "wrong-thread" && resumed
  ? "0199a213-81c0-7800-8aa1-bbab2a035a99"
  : configuredSession;

if (scenario === "descendant-sleep") {
  const descendant = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { stdio: "ignore" });
  if (process.env.FAKE_DESCENDANT_PID) fs.writeFileSync(process.env.FAKE_DESCENDANT_PID, String(descendant.pid));
  setTimeout(() => {}, 60000);
} else if (scenario === "sleep") {
  setTimeout(() => {}, 60000);
} else if (scenario === "malformed") {
  process.stdout.write("not-json\n");
} else {
  process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: sessionId }) + "\n");
  if (scenario === "duplicate-thread") {
    process.stdout.write(JSON.stringify({ type: "thread.started", thread_id: sessionId }) + "\n");
  }
  let response;
  if (scenario === "wrong-thread" && resumed) {
    const taskId = input.split("\n").find((line) => line.startsWith("Task ID: ")).slice("Task ID: ".length);
    response = {
      version: 1,
      task_id: taskId,
      kind: "control-decision",
      decision: "stop",
      reason: "This response must be rejected before decision validation because the session changed.",
      receipt_bindings: [],
    };
  } else if (scenario === "ask-user") {
    const taskLine = input.split("\n").find((line) => line.startsWith('{"version":2'));
    const task = JSON.parse(taskLine);
    response = {
      version: 1,
      task_id: task.task_id,
      kind: "ask-user",
      question: {
        question_id: "question-controller-model",
        prompt: "Which bounded route should continue?",
        options: ["Continue", "Stop"],
        recommended_option: 0,
      },
    };
  } else if (scenario === "accept") {
    const taskId = input.split("\n").find((line) => line.startsWith("Task ID: ")).slice("Task ID: ".length);
    response = {
      version: 1,
      task_id: taskId,
      kind: "control-decision",
      decision: "accept",
      reason: "Every bound receipt satisfies the frozen acceptance contract.",
      receipt_bindings: JSON.parse(process.env.FAKE_RECEIPT_BINDINGS || "[]"),
    };
  } else if (scenario === "stop") {
    const taskLine = input.split("\n").find((line) => line.startsWith('{"version":2'));
    const task = JSON.parse(taskLine);
    response = {
      version: 1,
      task_id: task.task_id,
      kind: "control-decision",
      decision: "stop",
      reason: "The test requested a safe stop.",
      receipt_bindings: [],
    };
  } else {
    const taskLine = input.split("\n").find((line) => line.startsWith('{"version":2'));
    const task = JSON.parse(taskLine);
    const route = task.worker_defaults;
    response = {
      version: 1,
      task_id: task.task_id,
      kind: "work-orders",
      work_orders: [{
        work_id: "work-bridge-1",
        task_id: task.task_id,
        role: "bounded-reader",
        executor_provider: route.provider,
        executor_transport: route.transport,
        requested_model: route.model,
        requested_reasoning_effort: route.reasoning_effort,
        read_only: true,
        paths: ["src"],
        instructions: "Inspect the bounded source area and return evidence only.",
        expected_artifacts: ["bounded report"],
        validation: [],
        stop_conditions: ["scope is unavailable"],
        allow_child_dispatch: false,
      }],
    };
    if (process.env.FAKE_CODEX_EXTRA_FIELD === "1") response.work_orders[0].shell_command = "not-approved";
    if (process.env.FAKE_CODEX_WRITABLE === "1") response.work_orders[0].read_only = false;
  }
  if (scenario === "duplicate-message") {
    process.stdout.write(JSON.stringify({
      type: "item.completed",
      item: { id: "item_0", type: "agent_message", text: JSON.stringify(response) },
    }) + "\n");
  }
  process.stdout.write(JSON.stringify({
    type: "item.completed",
    item: { id: "item_1", type: "agent_message", text: JSON.stringify(response) },
  }) + "\n");
}
