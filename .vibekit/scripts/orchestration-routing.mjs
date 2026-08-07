#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MODES = new Set(["auto", "custom"]);
const REASONING_EFFORTS = new Set(["low", "medium", "high", "xhigh", "max", "ultra"]);
const MAX_INPUT_BYTES = 256 * 1024;
const MAX_MODELS = 64;
const MAX_AGENTS = 64;
const MAX_CAPABILITIES = 32;

function fail(message) {
  throw new Error(message);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function printable(value, label, max = 120) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    fail(label + " must be a printable string of at most " + max + " characters");
  }
  return value;
}

function safeToken(value, label) {
  printable(value, label, 64);
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(value)) {
    fail(label + " must be lowercase kebab-case");
  }
  return value;
}

function safeAgentType(value) {
  printable(value, "agentType", 64);
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(value)) {
    fail("agentType must be snake_case");
  }
  return value;
}

function timestamp(value, label) {
  printable(value, label, 40);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(label + " must be a valid timestamp");
  return parsed;
}

function positiveRank(value, label, allowZero = false) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(value) || value < minimum || value > 1000) {
    fail(label + " must be an integer from " + minimum + " to 1000");
  }
  return value;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const entries = Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]));
  return "{" + entries.join(",") + "}";
}

function digest(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function validateCapabilities(value, label) {
  if (!Array.isArray(value) || value.length > MAX_CAPABILITIES) {
    fail(label + " must be an array with at most " + MAX_CAPABILITIES + " entries");
  }
  const capabilities = value.map((entry, index) => safeToken(entry, label + "[" + index + "]"));
  if (new Set(capabilities).size !== capabilities.length) fail(label + " contains duplicates");
  return capabilities;
}

function validateReasoningEffort(value, label = "reasoningEffort") {
  if (value === undefined) fail(label + " is required");
  if (!REASONING_EFFORTS.has(value)) fail(label + " is unsupported: " + String(value));
  return value;
}

function validateForkTurns(value) {
  if (value !== "all" && value !== "none" && !/^[1-9][0-9]{0,2}$/.test(value || "")) {
    fail("forkTurns must be all, none, or a positive integer string");
  }
  return value;
}

function validateInventory(raw, nowValue) {
  if (!plainObject(raw) || raw.version !== 1) fail("inventory version 1 is required");
  if (raw.provider !== "codex") fail("this helper currently accepts only the codex provider");
  if (raw.status !== "ready") fail("inventory provider is not ready");
  printable(raw.source, "inventory source", 120);
  const receiptIssuer = printable(raw.receiptIssuer, "inventory receiptIssuer", 120);

  const nowMs = timestamp(nowValue, "now");
  const verifiedAtMs = timestamp(raw.verifiedAt, "inventory verifiedAt");
  const expiresAtMs = timestamp(raw.expiresAt, "inventory expiresAt");
  if (verifiedAtMs > nowMs) fail("inventory verification is in the future");
  if (expiresAtMs <= nowMs) fail("inventory is stale");
  if (expiresAtMs <= verifiedAtMs) fail("inventory expiry must be after verification");

  if (!Array.isArray(raw.models) || raw.models.length < 1 || raw.models.length > MAX_MODELS) {
    fail("inventory models must contain 1 to " + MAX_MODELS + " entries");
  }

  const ids = new Set();
  const models = raw.models.map((candidate, index) => {
    if (!plainObject(candidate)) fail("inventory model " + index + " must be an object");
    const id = printable(candidate.id, "inventory model id", 120);
    if (id === "provider-default") fail("provider-default is not an exact model");
    if (ids.has(id)) fail("inventory contains duplicate model: " + id);
    ids.add(id);
    if (candidate.status !== "ready") fail("inventory model is not ready: " + id);
    const capabilities = validateCapabilities(candidate.capabilities, "model capabilities");
    if (!Array.isArray(candidate.reasoningEfforts) || candidate.reasoningEfforts.length < 1) {
      fail("model reasoningEfforts are required: " + id);
    }
    const reasoningEfforts = candidate.reasoningEfforts.map((effort) => validateReasoningEffort(effort, "model reasoning effort"));
    if (new Set(reasoningEfforts).size !== reasoningEfforts.length) fail("model reasoningEfforts contain duplicates: " + id);
    return {
      id,
      status: "ready",
      costRank: positiveRank(candidate.costRank, "model costRank", true),
      qualityRank: positiveRank(candidate.qualityRank, "model qualityRank"),
      capabilities,
      reasoningEfforts,
    };
  });

  if (!Array.isArray(raw.agents) || raw.agents.length < 1 || raw.agents.length > MAX_AGENTS) {
    fail("inventory agents must contain 1 to " + MAX_AGENTS + " entries");
  }
  const agentTypes = new Set();
  const agents = raw.agents.map((candidate, index) => {
    if (!plainObject(candidate)) fail("inventory agent " + index + " must be an object");
    const type = safeAgentType(candidate.type);
    if (agentTypes.has(type)) fail("inventory contains duplicate agent type: " + type);
    agentTypes.add(type);
    if (candidate.status !== "ready") fail("inventory agent is not ready: " + type);
    const modelPin = candidate.modelPin === null
      ? null
      : printable(candidate.modelPin, "agent modelPin", 120);
    if (modelPin === "provider-default") fail("provider-default is not an exact model");
    if (modelPin !== null && !ids.has(modelPin)) fail("agent modelPin is not ready: " + modelPin);
    const reasoningEffortPin = candidate.reasoningEffortPin === null
      ? null
      : validateReasoningEffort(candidate.reasoningEffortPin, "agent reasoningEffortPin");
    return { type, status: "ready", modelPin, reasoningEffortPin };
  });

  let parent = null;
  if (raw.parent !== undefined) {
    if (!plainObject(raw.parent)) fail("inventory parent must be an object");
    parent = {
      model: printable(raw.parent.model, "parent model", 120),
      reasoningEffort: validateReasoningEffort(raw.parent.reasoningEffort, "parent reasoningEffort"),
    };
  }

  const inventory = {
    version: 1,
    provider: "codex",
    status: "ready",
    source: raw.source,
    receiptIssuer,
    verifiedAt: raw.verifiedAt,
    expiresAt: raw.expiresAt,
    parent,
    agents,
    models,
  };
  return { inventory, inventoryDigest: digest(inventory), nowMs };
}

function validateRequirements(raw) {
  if (!plainObject(raw)) fail("lane requirements are required");
  return {
    capabilities: validateCapabilities(raw.capabilities, "required capabilities"),
    minQualityRank: positiveRank(raw.minQualityRank, "minimum quality rank"),
  };
}

function modelMeets(model, requirements, reasoningEffort) {
  return model.qualityRank >= requirements.minQualityRank
    && requirements.capabilities.every((capability) => model.capabilities.includes(capability))
    && model.reasoningEfforts.includes(reasoningEffort);
}

function capableModels(inventory, requirements, reasoningEffort) {
  return inventory.models
    .filter((candidate) => modelMeets(candidate, requirements, reasoningEffort))
    .sort((left, right) => left.costRank - right.costRank
      || right.qualityRank - left.qualityRank
      || left.id.localeCompare(right.id));
}

function exactModel(inventory, id, requirements, reasoningEffort, label) {
  const candidate = inventory.models.find((model) => model.id === id);
  if (!candidate) fail(label + " is not ready in the verified inventory: " + id);
  if (!modelMeets(candidate, requirements, reasoningEffort)) {
    fail(label + " does not satisfy the lane requirements: " + id);
  }
  return candidate;
}

function validateFallback(raw) {
  if (!plainObject(raw)) fail("fallbackPolicy is required");
  if (!new Set(["stop", "auto", "approved"]).has(raw.kind)) {
    fail("fallbackPolicy kind must be stop, auto, or approved");
  }
  return raw;
}

function fullHistoryModel(inventory, selectedModel, reasoningEffort) {
  if (!inventory.parent
      || inventory.parent.model !== selectedModel.id
      || inventory.parent.reasoningEffort !== reasoningEffort) {
    fail("full-history routing must inherit the parent model and reasoning effort");
  }
}

function fallbackForCustom(raw, inventory, requirements, primary, forkTurns) {
  const policy = validateFallback(raw);
  if (policy.kind === "stop") return { kind: "stop" };
  if (policy.kind !== "approved") fail("Custom fallback must stop or name an approved alternate");
  if (forkTurns === "all") fail("full-history Custom routing cannot use a different fallback model");
  const modelId = printable(policy.model, "approved fallback model", 120);
  if (modelId === "provider-default") fail("provider-default is not an exact model");
  const effort = validateReasoningEffort(policy.reasoningEffort, "approved fallback reasoningEffort");
  const alternate = exactModel(inventory, modelId, requirements, effort, "approved fallback model");
  if (alternate.id === primary.id && effort === primary.reasoningEffort) {
    fail("approved fallback must differ from the primary assignment");
  }
  return {
    kind: "approved-alternate",
    model: alternate.id,
    reasoningEffort: effort,
  };
}

function fallbackForAuto(raw, candidates, primary, forkTurns) {
  const policy = validateFallback(raw);
  if (policy.kind === "stop") return { kind: "stop" };
  if (policy.kind !== "auto" || policy.maxAttempts !== 1) {
    fail("Auto fallback must stop or allow exactly one automatic attempt");
  }
  if (forkTurns === "all") return { kind: "stop" };
  const alternate = candidates.find((candidate) => candidate.id !== primary.id);
  if (!alternate) return { kind: "stop", reason: "no second capable model" };
  return {
    kind: "approved-alternate",
    model: alternate.id,
    reasoningEffort: primary.reasoningEffort,
  };
}

export function buildRoutingPlan(raw) {
  if (!plainObject(raw) || !MODES.has(raw.mode)) fail("mode must be auto or custom");
  if (!plainObject(raw.lane)) fail("lane is required");
  const nowValue = raw.now || new Date().toISOString();
  const { inventory, inventoryDigest } = validateInventory(raw.inventory, nowValue);
  const role = safeToken(raw.lane.role, "lane role");
  const agentType = safeAgentType(raw.lane.agentType);
  const reasoningEffort = validateReasoningEffort(raw.lane.reasoningEffort);
  const forkTurns = validateForkTurns(raw.lane.forkTurns);
  const requirements = validateRequirements(raw.lane.requirements);
  const agentProfile = inventory.agents.find((candidate) => candidate.type === agentType);
  if (!agentProfile) fail("agentType is not ready in the verified inventory: " + agentType);
  if (agentProfile.reasoningEffortPin !== null && agentProfile.reasoningEffortPin !== reasoningEffort) {
    fail("custom agent reasoning effort pin does not match the requested reasoning effort");
  }

  let selected;
  let fallbackPolicy;
  let selectionSource;

  if (raw.mode === "custom") {
    const requestedModel = printable(raw.lane.requestedModel, "requested model", 120);
    if (requestedModel === "provider-default") fail("provider-default is not an exact model");
    if (agentProfile.modelPin !== null && agentProfile.modelPin !== requestedModel) {
      fail("custom agent model pin does not match the requested model");
    }
    selected = exactModel(inventory, requestedModel, requirements, reasoningEffort, "requested model");
    if (forkTurns === "all") fullHistoryModel(inventory, selected, reasoningEffort);
    fallbackPolicy = fallbackForCustom(raw.lane.fallbackPolicy, inventory, requirements, { ...selected, reasoningEffort }, forkTurns);
    selectionSource = forkTurns === "all" ? "parent-inheritance" : "explicit-custom";
  } else {
    const candidates = capableModels(inventory, requirements, reasoningEffort);
    if (forkTurns === "all") {
      if (!inventory.parent) fail("full-history Auto routing requires parent model metadata");
      selected = candidates.find((candidate) => candidate.id === inventory.parent.model);
      if (!selected || inventory.parent.reasoningEffort !== reasoningEffort) {
        fail("full-history parent settings do not satisfy the lane requirements");
      }
      selectionSource = "parent-inheritance";
    } else if (agentProfile.modelPin !== null) {
      selected = candidates.find((candidate) => candidate.id === agentProfile.modelPin);
      if (!selected) fail("custom agent model pin does not satisfy the lane requirements");
      selectionSource = "agent-profile-pin";
    } else {
      selected = candidates[0];
      if (!selected) fail("no ready model satisfies the lane requirements");
      selectionSource = "auto-capability-floor";
    }
    fallbackPolicy = fallbackForAuto(raw.lane.fallbackPolicy, candidates, { ...selected, reasoningEffort }, forkTurns);
  }

  if (agentProfile.modelPin !== null && agentProfile.modelPin !== selected.id) {
    fail("custom agent model pin would override the routing plan");
  }
  if (fallbackPolicy.kind === "approved-alternate") {
    if (agentProfile.modelPin !== null && agentProfile.modelPin !== fallbackPolicy.model) {
      fail("custom agent model pin would override the fallback model");
    }
    if (agentProfile.reasoningEffortPin !== null
        && agentProfile.reasoningEffortPin !== fallbackPolicy.reasoningEffort) {
      fail("custom agent reasoning effort pin would override the fallback effort");
    }
  }

  const unsignedPlan = {
    version: 1,
    status: "dispatchable",
    mode: raw.mode,
    provider: "codex",
    role,
    agentType,
    agentProfilePins: {
      model: agentProfile.modelPin,
      reasoningEffort: agentProfile.reasoningEffortPin,
    },
    model: selected.id,
    reasoningEffort,
    forkTurns,
    selectionSource,
    fallbackPolicy,
    requirements,
    inventoryDigest,
    inventorySource: inventory.source,
    receiptIssuer: inventory.receiptIssuer,
    inventoryVerifiedAt: inventory.verifiedAt,
    inventoryExpiresAt: inventory.expiresAt,
    requestedAt: nowValue,
  };
  return { ...unsignedPlan, planDigest: digest(unsignedPlan) };
}

function assertPlanDigest(plan) {
  if (!plainObject(plan) || plan.version !== 1 || plan.status !== "dispatchable") {
    fail("dispatchable routing plan version 1 is required");
  }
  const { planDigest, ...unsignedPlan } = plan;
  if (!/^[a-f0-9]{64}$/.test(planDigest || "") || digest(unsignedPlan) !== planDigest) {
    fail("routing plan digest does not match its contents");
  }
}

export function verifyEffectiveReceipt({ plan, expectedAgentId, receipt, now = new Date().toISOString() } = {}) {
  assertPlanDigest(plan);
  if (!plainObject(receipt)) fail("effective-model receipt is required");
  if (receipt.version !== 1) fail("effective-model receipt version 1 is required");
  if (receipt.planDigest !== plan.planDigest) fail("effective-model receipt is bound to another plan");
  const receiptAgentId = printable(receipt.agentId, "receipt agentId", 120);
  const spawnedAgentId = printable(expectedAgentId, "expected agentId", 120);
  if (receiptAgentId !== spawnedAgentId) fail("receipt agentId does not match the spawned child");
  printable(receipt.issuer, "receipt issuer", 120);
  if (receipt.issuer !== plan.receiptIssuer) fail("receipt issuer does not match the routing plan");
  if (!/^[a-f0-9]{64}$/.test(receipt.evidenceDigest || "")) {
    fail("receipt evidenceDigest must be a lowercase SHA-256 digest");
  }

  const nowMs = timestamp(now, "verification now");
  const observedAtMs = timestamp(receipt.observedAt, "receipt observedAt");
  const requestedAtMs = timestamp(plan.requestedAt, "plan requestedAt");
  const expiresAtMs = timestamp(plan.inventoryExpiresAt, "plan inventoryExpiresAt");
  if (observedAtMs < requestedAtMs) fail("effective-model receipt predates the routing plan");
  if (observedAtMs > nowMs) fail("effective-model receipt is from the future");
  if (observedAtMs >= expiresAtMs || nowMs >= expiresAtMs) fail("effective-model receipt or verification used a stale inventory");

  const comparisons = [
    ["provider", "effective provider"],
    ["agentType", "effective agent type"],
    ["model", "effective model"],
    ["reasoningEffort", "effective reasoning effort"],
    ["forkTurns", "effective fork policy"],
  ];
  for (const [field, label] of comparisons) {
    if (receipt[field] !== plan[field]) fail(label + " does not match the routing plan");
  }

  return {
    version: 1,
    status: "accepted",
    bindingVerified: true,
    attestationClaim: "control-plane-receipt",
    receiptIssuer: receipt.issuer,
    planDigest: plan.planDigest,
    receiptDigest: digest(receipt),
    agentId: receipt.agentId,
    verifiedAt: now,
  };
}

function usage() {
  console.log([
    "Usage:",
    "  node .vibekit/scripts/orchestration-routing.mjs plan < request.json",
    "  node .vibekit/scripts/orchestration-routing.mjs verify < receipt-envelope.json",
    "",
    "The verify envelope is { plan, expectedAgentId, receipt, now? }. The helper validates binding, not issuer authenticity, and never invokes a provider.",
  ].join("\n"));
}

function readInput() {
  const raw = fs.readFileSync(0, "utf8");
  if (Buffer.byteLength(raw, "utf8") > MAX_INPUT_BYTES) fail("input exceeds " + MAX_INPUT_BYTES + " bytes");
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail("input must be valid JSON: " + error.message);
  }
}

function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "-h") {
    usage();
    process.exit(command ? 0 : 2);
  }
  try {
    const input = readInput();
    const output = command === "plan"
      ? buildRoutingPlan(input)
      : command === "verify"
        ? verifyEffectiveReceipt(input)
        : fail("unknown command: " + command);
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error("ERROR: " + error.message);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
