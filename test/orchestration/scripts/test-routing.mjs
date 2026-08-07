#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildRoutingPlan,
  verifyEffectiveReceipt,
} from "../../../.vibekit/scripts/orchestration-routing.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const script = path.join(root, ".vibekit/scripts/orchestration-routing.mjs");
const now = "2026-08-06T12:00:00.000Z";
const receiptNow = "2026-08-06T12:02:00.000Z";
let checks = 0;

function expectError(fn, pattern) {
  assert.throws(fn, pattern);
  checks += 1;
}

function model(id, costRank, qualityRank, capabilities) {
  return {
    id,
    status: "ready",
    costRank,
    qualityRank,
    capabilities,
    reasoningEfforts: ["medium", "high", "xhigh"],
  };
}

function inventory() {
  return {
    version: 1,
    provider: "codex",
    status: "ready",
    source: "current-runtime-tool-schema",
    receiptIssuer: "codex-control-plane",
    verifiedAt: "2026-08-06T11:55:00.000Z",
    expiresAt: "2026-08-06T12:15:00.000Z",
    parent: {
      model: "gpt-5.6-sol",
      reasoningEffort: "xhigh",
    },
    agents: [
      { type: "proofline_maker", status: "ready", modelPin: null, reasoningEffortPin: null },
      { type: "proofline_wayfinder", status: "ready", modelPin: null, reasoningEffortPin: null },
      { type: "proofline_countervoice", status: "ready", modelPin: null, reasoningEffortPin: null },
    ],
    models: [
      model("gpt-5.6-terra", 1, 2, ["analysis", "implementation"]),
      model("gpt-5.6-sol", 3, 3, ["analysis", "implementation", "architecture", "security"]),
    ],
  };
}

function customRequest(overrides = {}) {
  return {
    mode: "custom",
    now,
    inventory: inventory(),
    lane: {
      role: "proofline-maker",
      agentType: "proofline_maker",
      requestedModel: "gpt-5.6-terra",
      reasoningEffort: "medium",
      forkTurns: "none",
      requirements: {
        capabilities: ["implementation"],
        minQualityRank: 2,
      },
      fallbackPolicy: { kind: "stop" },
      ...overrides,
    },
  };
}

const custom = buildRoutingPlan(customRequest());
assert.equal(custom.status, "dispatchable");
assert.equal(custom.provider, "codex");
assert.equal(custom.agentType, "proofline_maker");
assert.equal(custom.model, "gpt-5.6-terra");
assert.equal(custom.reasoningEffort, "medium");
assert.equal(custom.forkTurns, "none");
assert.equal(custom.fallbackPolicy.kind, "stop");
assert.equal(custom.agentProfilePins.model, null);
assert.equal(custom.agentProfilePins.reasoningEffort, null);
assert.match(custom.inventoryDigest, /^[a-f0-9]{64}$/);
assert.match(custom.planDigest, /^[a-f0-9]{64}$/);
checks += 11;

expectError(
  () => buildRoutingPlan(customRequest({ requestedModel: "provider-default" })),
  /provider-default is not an exact model/
);
expectError(
  () => buildRoutingPlan(customRequest({ requestedModel: "missing-model" })),
  /requested model is not ready/
);
expectError(
  () => buildRoutingPlan(customRequest({ reasoningEffort: undefined })),
  /reasoningEffort is required/
);
expectError(
  () => buildRoutingPlan(customRequest({ agentType: "../escape" })),
  /agentType must be snake_case/
);
expectError(
  () => buildRoutingPlan(customRequest({ fallbackPolicy: undefined })),
  /fallbackPolicy is required/
);

const missingAgent = customRequest();
missingAgent.inventory.agents = missingAgent.inventory.agents.filter((agent) => agent.type !== "proofline_maker");
expectError(() => buildRoutingPlan(missingAgent), /agentType is not ready in the verified inventory/);

const conflictingPin = customRequest();
conflictingPin.inventory.agents[0].modelPin = "gpt-5.6-sol";
expectError(() => buildRoutingPlan(conflictingPin), /custom agent model pin does not match the requested model/);

const matchingPin = customRequest();
matchingPin.inventory.agents[0].modelPin = "gpt-5.6-terra";
const customWithPin = buildRoutingPlan(matchingPin);
assert.equal(customWithPin.agentProfilePins.model, "gpt-5.6-terra");
checks += 1;

const stale = customRequest();
stale.inventory.expiresAt = "2026-08-06T11:59:59.000Z";
expectError(() => buildRoutingPlan(stale), /inventory is stale/);

expectError(
  () => buildRoutingPlan(customRequest({ forkTurns: "all" })),
  /full-history routing must inherit the parent model and reasoning effort/
);

const inherited = buildRoutingPlan(customRequest({
  requestedModel: "gpt-5.6-sol",
  reasoningEffort: "xhigh",
  forkTurns: "all",
  requirements: { capabilities: ["architecture"], minQualityRank: 3 },
}));
assert.equal(inherited.selectionSource, "parent-inheritance");
checks += 1;

expectError(
  () => buildRoutingPlan({
    mode: "auto",
    now,
    inventory: inventory(),
    lane: {
      role: "proofline-wayfinder",
      agentType: "proofline_wayfinder",
      reasoningEffort: "xhigh",
      forkTurns: "all",
      requirements: { capabilities: ["architecture"], minQualityRank: 3 },
      fallbackPolicy: { kind: "auto", maxAttempts: 2 },
    },
  }),
  /Auto fallback must stop or allow exactly one automatic attempt/
);

const auto = buildRoutingPlan({
  mode: "auto",
  now,
  inventory: inventory(),
  lane: {
    role: "proofline-wayfinder",
    agentType: "proofline_wayfinder",
    reasoningEffort: "high",
    forkTurns: "none",
    requirements: {
      capabilities: ["architecture"],
      minQualityRank: 3,
    },
    fallbackPolicy: { kind: "auto", maxAttempts: 1 },
  },
});
assert.equal(auto.model, "gpt-5.6-sol");
assert.equal(auto.fallbackPolicy.kind, "stop");
assert.equal(auto.fallbackPolicy.reason, "no second capable model");
checks += 3;

const pinnedAutoInventory = inventory();
pinnedAutoInventory.agents.find((agent) => agent.type === "proofline_wayfinder").modelPin = "gpt-5.6-sol";
const pinnedAuto = buildRoutingPlan({
  mode: "auto",
  now,
  inventory: pinnedAutoInventory,
  lane: {
    role: "proofline-wayfinder",
    agentType: "proofline_wayfinder",
    reasoningEffort: "high",
    forkTurns: "none",
    requirements: { capabilities: ["implementation"], minQualityRank: 2 },
    fallbackPolicy: { kind: "stop" },
  },
});
assert.equal(pinnedAuto.model, "gpt-5.6-sol");
assert.equal(pinnedAuto.selectionSource, "agent-profile-pin");
checks += 2;

const autoWithFallbackInventory = inventory();
autoWithFallbackInventory.models.push(
  model("gpt-5.6-sol-alt", 4, 3, ["analysis", "architecture", "security"])
);
const autoWithFallback = buildRoutingPlan({
  mode: "auto",
  now,
  inventory: autoWithFallbackInventory,
  lane: {
    role: "proofline-countervoice",
    agentType: "proofline_countervoice",
    reasoningEffort: "high",
    forkTurns: "2",
    requirements: {
      capabilities: ["security"],
      minQualityRank: 3,
    },
    fallbackPolicy: { kind: "auto", maxAttempts: 1 },
  },
});
assert.equal(autoWithFallback.model, "gpt-5.6-sol");
assert.equal(autoWithFallback.fallbackPolicy.kind, "approved-alternate");
assert.equal(autoWithFallback.fallbackPolicy.model, "gpt-5.6-sol-alt");
checks += 3;

const approvedFallback = buildRoutingPlan(customRequest({
  requestedModel: "gpt-5.6-sol",
  reasoningEffort: "high",
  requirements: { capabilities: ["implementation"], minQualityRank: 2 },
  fallbackPolicy: {
    kind: "approved",
    model: "gpt-5.6-terra",
    reasoningEffort: "medium",
  },
}));
assert.equal(approvedFallback.fallbackPolicy.kind, "approved-alternate");
assert.equal(approvedFallback.fallbackPolicy.model, "gpt-5.6-terra");
checks += 2;

expectError(
  () => verifyEffectiveReceipt({ plan: custom, receipt: null, now: receiptNow }),
  /effective-model receipt is required/
);
expectError(
  () => verifyEffectiveReceipt({
    plan: custom,
    expectedAgentId: "agent-1",
    now: receiptNow,
    receipt: {
      version: 1,
      planDigest: custom.planDigest,
      agentId: "agent-1",
      issuer: "codex-control-plane",
      evidenceDigest: "a".repeat(64),
      provider: "codex",
      agentType: "proofline_maker",
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      forkTurns: "none",
      observedAt: "2026-08-06T12:01:00.000Z",
    },
  }),
  /effective model does not match/
);
expectError(
  () => verifyEffectiveReceipt({
    plan: custom,
    expectedAgentId: "agent-1",
    now: receiptNow,
    receipt: {
      version: 1,
      planDigest: custom.planDigest,
      agentId: "agent-1",
      issuer: "untrusted-prose",
      evidenceDigest: "a".repeat(64),
      provider: "codex",
      agentType: "proofline_maker",
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      forkTurns: "none",
      observedAt: "2026-08-06T12:01:00.000Z",
    },
  }),
  /receipt issuer does not match/
);
expectError(
  () => verifyEffectiveReceipt({
    plan: custom,
    expectedAgentId: "agent-2",
    now: receiptNow,
    receipt: {
      version: 1,
      planDigest: custom.planDigest,
      agentId: "agent-1",
      issuer: "codex-control-plane",
      evidenceDigest: "a".repeat(64),
      provider: "codex",
      agentType: "proofline_maker",
      model: "gpt-5.6-terra",
      reasoningEffort: "medium",
      forkTurns: "none",
      observedAt: "2026-08-06T12:01:00.000Z",
    },
  }),
  /receipt agentId does not match the spawned child/
);

const accepted = verifyEffectiveReceipt({
  plan: custom,
  expectedAgentId: "agent-1",
  now: receiptNow,
  receipt: {
    version: 1,
    planDigest: custom.planDigest,
    agentId: "agent-1",
    issuer: "codex-control-plane",
    evidenceDigest: "a".repeat(64),
    provider: "codex",
    agentType: "proofline_maker",
    model: "gpt-5.6-terra",
    reasoningEffort: "medium",
    forkTurns: "none",
    observedAt: "2026-08-06T12:01:00.000Z",
  },
});
assert.equal(accepted.status, "accepted");
assert.equal(accepted.bindingVerified, true);
assert.equal(accepted.attestationClaim, "control-plane-receipt");
assert.equal(accepted.agentId, "agent-1");
assert.equal(accepted.attested, undefined);
checks += 5;

const scriptText = fs.readFileSync(script, "utf8");
assert.doesNotMatch(scriptText, /node:child_process|\bexecSync\s*\(|\bspawnSync\s*\(|\beval\s*\(/);
checks += 1;

const cli = spawnSync(process.execPath, [script, "plan"], {
  cwd: root,
  encoding: "utf8",
  input: JSON.stringify(customRequest()),
});
assert.equal(cli.status, 0, cli.stderr || cli.stdout);
assert.equal(JSON.parse(cli.stdout).model, "gpt-5.6-terra");
checks += 2;

console.log("Orchestration routing contract: " + checks + " checks passed");
