#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const MIN_NODE_VERSION = "22.13.0";
const MIN_SDK_VERSION = "1.0.27";
const MAX_INPUT_BYTES = 256 * 1024;
const MAX_PROMPT_CHARS = 64 * 1024;
const MAX_RESULT_CHARS = 1024 * 1024;
const MAX_MODELS = 256;
const MAX_MODEL_PARAMS = 16;
const READ_ONLY_TOOLS = Object.freeze(["read", "grep", "glob", "ls"]);
const WORKSPACE_WRITE_TOOLS = Object.freeze([...READ_ONLY_TOOLS, "edit", "write"]);
const ROUTED_MODEL_IDS = new Set(["auto", "auto-smart"]);
const BROAD_SYSTEM_ROOTS = new Set([
  "/", "/bin", "/boot", "/dev", "/etc", "/home", "/lib", "/lib64",
  "/opt", "/private", "/root", "/sbin", "/srv", "/sys", "/tmp", "/usr", "/var",
  "C:\\", "C:/",
]);

class AdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AdapterError(code, message);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function printable(value, label, max = 120) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    fail("invalid-input", label + " must be a printable string of at most " + max + " characters");
  }
  return value;
}

function safePrompt(value) {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > MAX_PROMPT_CHARS || value.includes("\u0000")) {
    fail("invalid-input", "prompt must be non-empty, contain no NUL byte, and be at most " + MAX_PROMPT_CHARS + " characters");
  }
  return value;
}

function parseVersion(value, label) {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(value || "");
  if (!match) fail("unsupported-version", label + " has an unsupported version format: " + String(value));
  return {
    parts: match.slice(1, 4).map(Number),
    suffix: match[4],
  };
}

export function versionAtLeast(actual, minimum) {
  const left = parseVersion(actual, "runtime");
  const right = parseVersion(minimum, "minimum");
  for (let index = 0; index < 3; index += 1) {
    if (left.parts[index] > right.parts[index]) return true;
    if (left.parts[index] < right.parts[index]) return false;
  }
  return left.suffix.length === 0;
}

export function assertSupportedRuntime(nodeVersion = process.versions.node, sdkVersion) {
  if (!versionAtLeast(nodeVersion, MIN_NODE_VERSION)) {
    fail("unsupported-node", "Cursor SDK requires Node.js " + MIN_NODE_VERSION + " or later; found " + nodeVersion);
  }
  if (sdkVersion !== undefined && !versionAtLeast(sdkVersion, MIN_SDK_VERSION)) {
    fail("unsupported-sdk", "Cursor SDK " + MIN_SDK_VERSION + " or later is required for tool allowlists; found " + sdkVersion);
  }
}

function broadRoot(candidate) {
  const normalized = path.normalize(candidate);
  return BROAD_SYSTEM_ROOTS.has(normalized)
    || normalized === path.parse(normalized).root
    || normalized === path.normalize(os.homedir());
}

export function resolveProjectRoot(rawTarget = ".") {
  printable(rawTarget, "project root", 4096);
  const requested = path.resolve(rawTarget);
  if (broadRoot(requested)) fail("unsafe-project-root", "refusing broad project root: " + requested);
  if (!fs.existsSync(requested)) fail("invalid-project-root", "project root does not exist: " + requested);
  const requestedStat = fs.lstatSync(requested);
  if (requestedStat.isSymbolicLink()) fail("unsafe-project-root", "refusing symlinked project root: " + requested);
  if (!requestedStat.isDirectory()) fail("invalid-project-root", "project root is not a directory: " + requested);

  const resolved = fs.realpathSync(requested);
  if (broadRoot(resolved)) fail("unsafe-project-root", "refusing broad resolved project root: " + resolved);

  const backbone = path.join(resolved, "backbone.yml");
  const stateDir = path.join(resolved, ".vibekit");
  if (!fs.existsSync(backbone) || !fs.lstatSync(backbone).isFile() || fs.lstatSync(backbone).isSymbolicLink()) {
    fail("invalid-project-root", "project root requires a non-symlinked backbone.yml: " + resolved);
  }
  if (!fs.existsSync(stateDir) || !fs.lstatSync(stateDir).isDirectory() || fs.lstatSync(stateDir).isSymbolicLink()) {
    fail("invalid-project-root", "project root requires a non-symlinked .vibekit directory: " + resolved);
  }
  return resolved;
}

function normalizeParameterDefinitions(raw, modelId) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_MODEL_PARAMS) {
    fail("invalid-catalog", "model parameters are invalid: " + modelId);
  }
  const seen = new Set();
  return raw.map((parameter) => {
    if (!plainObject(parameter)) fail("invalid-catalog", "model parameter must be an object: " + modelId);
    const id = printable(parameter.id, "model parameter id", 120);
    if (seen.has(id)) fail("invalid-catalog", "duplicate model parameter: " + modelId + ":" + id);
    seen.add(id);
    if (!Array.isArray(parameter.values) || parameter.values.length < 1 || parameter.values.length > 64) {
      fail("invalid-catalog", "model parameter values are invalid: " + modelId + ":" + id);
    }
    const values = parameter.values.map((entry) => {
      if (!plainObject(entry)) fail("invalid-catalog", "model parameter value must be an object: " + modelId + ":" + id);
      return {
        value: printable(entry.value, "model parameter value", 120),
        ...(typeof entry.displayName === "string" ? { displayName: printable(entry.displayName, "model parameter display name", 160) } : {}),
      };
    });
    return {
      id,
      ...(typeof parameter.displayName === "string" ? { displayName: printable(parameter.displayName, "model parameter display name", 160) } : {}),
      values,
    };
  });
}

export function normalizeModelCatalog(rawModels) {
  if (!Array.isArray(rawModels) || rawModels.length < 1 || rawModels.length > MAX_MODELS) {
    fail("invalid-catalog", "Cursor model catalog must contain 1 to " + MAX_MODELS + " models");
  }
  const seen = new Set();
  return rawModels.map((model) => {
    if (!plainObject(model)) fail("invalid-catalog", "Cursor model catalog entry must be an object");
    const id = printable(model.id, "model id", 120);
    if (seen.has(id)) fail("invalid-catalog", "duplicate Cursor model id: " + id);
    seen.add(id);
    const displayName = typeof model.displayName === "string" ? printable(model.displayName, "model display name", 160) : id;
    if (model.aliases !== undefined && (!Array.isArray(model.aliases) || model.aliases.length > 32)) {
      fail("invalid-catalog", "model aliases are invalid: " + id);
    }
    const aliases = model.aliases === undefined
      ? []
      : model.aliases.map((alias) => printable(alias, "model alias", 120));
    return {
      id,
      displayName,
      aliases,
      parameters: normalizeParameterDefinitions(model.parameters, id),
    };
  });
}

function normalizeRequestedParams(raw, catalogModel) {
  const params = raw === undefined ? [] : raw;
  if (!Array.isArray(params) || params.length > MAX_MODEL_PARAMS) {
    fail("invalid-model", "model.params must be an array with at most " + MAX_MODEL_PARAMS + " entries");
  }
  const definitions = new Map(catalogModel.parameters.map((definition) => [definition.id, definition]));
  const seen = new Set();
  const normalized = params.map((parameter) => {
    if (!plainObject(parameter)) fail("invalid-model", "model parameter selection must be an object");
    const id = printable(parameter.id, "selected model parameter id", 120);
    const value = printable(parameter.value, "selected model parameter value", 120);
    if (seen.has(id)) fail("invalid-model", "duplicate selected model parameter: " + id);
    seen.add(id);
    const definition = definitions.get(id);
    if (!definition) fail("invalid-model", "selected model parameter is not in the live catalog: " + id);
    if (!definition.values.some((candidate) => candidate.value === value)) {
      fail("invalid-model", "selected model parameter value is not in the live catalog: " + id + "=" + value);
    }
    return { id, value };
  });
  if (catalogModel.parameters.length > 0) {
    const missing = catalogModel.parameters.filter((definition) => !seen.has(definition.id)).map((definition) => definition.id);
    if (missing.length > 0) {
      fail("invalid-model", "explicit values are required for model parameters: " + missing.join(", "));
    }
  }
  return normalized;
}

export function validateModelSelection(rawSelection, catalog) {
  const requested = typeof rawSelection === "string" ? { id: rawSelection } : rawSelection;
  if (!plainObject(requested)) fail("invalid-model", "model must be an id string or an object with id and params");
  const id = printable(requested.id, "selected model id", 120);
  if (id === "provider-default") fail("invalid-model", "provider-default is not a verified Cursor model id");
  const catalogModel = catalog.find((candidate) => candidate.id === id || candidate.aliases.includes(id));
  if (!catalogModel) fail("model-unavailable", "selected model is not available in the live Cursor catalog: " + id);
  const params = normalizeRequestedParams(requested.params, catalogModel);
  if (catalogModel.id === "auto-smart" && !params.some((parameter) => parameter.id === "optimize_for")) {
    fail("invalid-model", "auto-smart requires an explicit optimize_for value from the live catalog");
  }
  return {
    id: catalogModel.id,
    ...(params.length > 0 ? { params } : {}),
  };
}

export function validateRunRequest(raw) {
  if (!plainObject(raw) || raw.version !== 1) fail("invalid-input", "run request version 1 is required");
  const access = raw.access;
  if (access !== "read-only" && access !== "workspace-write") {
    fail("invalid-input", "access must be read-only or workspace-write");
  }
  if (access === "workspace-write") {
    const authorization = raw.authorization;
    if (!plainObject(authorization)
      || authorization.mutationApproved !== true
      || authorization.isolatedWorkspace !== true
      || authorization.protectedPathsChecked !== true) {
      fail(
        "write-not-authorized",
        "workspace-write requires mutationApproved, isolatedWorkspace, and protectedPathsChecked assertions"
      );
    }
  }
  const timeoutMs = raw.timeoutMs === undefined ? 600000 : raw.timeoutMs;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 1800000) {
    fail("invalid-input", "timeoutMs must be an integer from 1000 to 1800000");
  }
  return {
    version: 1,
    prompt: safePrompt(raw.prompt),
    model: raw.model,
    access,
    timeoutMs,
    ...(raw.name === undefined ? {} : { name: printable(raw.name, "agent name", 120) }),
  };
}

export function buildAgentOptions(projectRoot, request, model) {
  const tools = request.access === "read-only" ? [...READ_ONLY_TOOLS] : [...WORKSPACE_WRITE_TOOLS];
  return {
    model,
    ...(request.name ? { name: request.name } : {}),
    tools,
    mode: request.access === "read-only" ? "plan" : "agent",
    local: {
      cwd: projectRoot,
      sandboxOptions: { enabled: true },
    },
  };
}

function locatePackageVersion(entryPath) {
  let current = path.dirname(entryPath);
  const root = path.parse(current).root;
  while (current !== root) {
    const packageFile = path.join(current, "package.json");
    if (fs.existsSync(packageFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(packageFile, "utf8"));
        if (parsed.name === "@cursor/sdk") return printable(parsed.version, "Cursor SDK version", 80);
      } catch {
        // Continue upward. The package root is verified by its name.
      }
    }
    current = path.dirname(current);
  }
  fail("unsupported-sdk", "cannot verify the installed @cursor/sdk version");
}

export async function loadCursorSdk() {
  const require = createRequire(import.meta.url);
  let entryPath;
  try {
    entryPath = require.resolve("@cursor/sdk");
  } catch {
    fail("sdk-not-installed", "@cursor/sdk is not installed; install the reviewed version in this project before using the adapter");
  }
  const version = locatePackageVersion(entryPath);
  assertSupportedRuntime(process.versions.node, version);
  const sdk = await import("@cursor/sdk");
  if (!sdk?.Agent?.create || !sdk?.Cursor?.models?.list || !sdk?.Cursor?.me) {
    fail("unsupported-sdk", "installed @cursor/sdk does not expose the required Agent and Cursor APIs");
  }
  return { sdk, version };
}

async function verifiedCatalog(sdk) {
  await sdk.Cursor.me();
  return normalizeModelCatalog(await sdk.Cursor.models.list());
}

async function waitForRun(run, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AdapterError("run-timeout", "Cursor SDK run exceeded timeoutMs")), timeoutMs);
  });
  try {
    return await Promise.race([run.wait(), timeout]);
  } catch (error) {
    if (error instanceof AdapterError && error.code === "run-timeout" && typeof run.cancel === "function") {
      await run.cancel().catch(() => {});
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function disposeAgent(agent) {
  if (typeof agent?.[Symbol.asyncDispose] === "function") {
    await agent[Symbol.asyncDispose]();
  } else if (typeof agent?.close === "function") {
    await agent.close();
  }
}

function normalizedEffectiveModel(raw) {
  if (!plainObject(raw) || typeof raw.id !== "string") fail("model-not-attested", "Cursor SDK result did not report an effective model");
  if (raw.params !== undefined && (!Array.isArray(raw.params) || raw.params.length > MAX_MODEL_PARAMS)) {
    fail("model-not-attested", "Cursor SDK result reported invalid effective model parameters");
  }
  const seen = new Set();
  const params = (raw.params || []).map((entry) => {
    if (!plainObject(entry)) fail("model-not-attested", "Cursor SDK result reported an invalid effective model parameter");
    const id = printable(entry.id, "effective model parameter id", 120);
    if (seen.has(id)) fail("model-not-attested", "Cursor SDK result reported a duplicate effective model parameter: " + id);
    seen.add(id);
    return {
      id,
      value: printable(entry.value, "effective model parameter value", 120),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  return {
    id: printable(raw.id, "effective model id", 120),
    ...(params.length > 0 ? { params } : {}),
  };
}

function sameModelSelection(requested, effective) {
  if (requested.id !== effective.id) return false;
  const requestedParams = [...(requested.params || [])]
    .map(({ id, value }) => ({ id, value }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const effectiveParams = effective.params || [];
  return JSON.stringify(requestedParams) === JSON.stringify(effectiveParams);
}

export async function runCursorAgent({ sdk, sdkVersion, projectRoot, rawRequest, nodeVersion = process.versions.node }) {
  assertSupportedRuntime(nodeVersion, sdkVersion);
  const root = resolveProjectRoot(projectRoot);
  const request = validateRunRequest(rawRequest);
  const catalog = await verifiedCatalog(sdk);
  const model = validateModelSelection(request.model, catalog);
  const options = buildAgentOptions(root, request, model);
  const agent = await sdk.Agent.create(options);
  try {
    const run = await agent.send(request.prompt);
    const result = await waitForRun(run, request.timeoutMs);
    if (!plainObject(result) || result.status !== "finished") {
      fail("run-failed", "Cursor SDK run did not finish successfully");
    }
    if (typeof result.result !== "string" || result.result.length > MAX_RESULT_CHARS) {
      fail("invalid-result", "Cursor SDK result text is missing or exceeds " + MAX_RESULT_CHARS + " characters");
    }
    const effectiveModel = normalizedEffectiveModel(result.model);
    const routed = ROUTED_MODEL_IDS.has(model.id);
    if (!routed && !sameModelSelection(model, effectiveModel)) {
      fail("model-mismatch", "effective Cursor model selection does not match the complete requested model selection");
    }
    return {
      version: 1,
      status: "finished",
      provider: "cursor",
      adapter: "cursor-sdk",
      sdkVersion,
      access: request.access,
      agentId: printable(agent.agentId, "agent id", 160),
      runId: printable(result.id || run.id, "run id", 160),
      requestedModel: model,
      effectiveModel,
      modelBinding: routed ? "router-selection" : "exact-match",
      result: result.result,
    };
  } finally {
    await disposeAgent(agent);
  }
}

async function readJsonInput() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_INPUT_BYTES) fail("input-too-large", "stdin exceeds " + MAX_INPUT_BYTES + " bytes");
    chunks.push(chunk);
  }
  if (bytes === 0) fail("invalid-input", "run requires one JSON request on stdin");
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    fail("invalid-input", "stdin must contain valid JSON");
  }
}

function redactMessage(raw) {
  let message = String(raw || "Cursor SDK adapter failed");
  const configuredKey = process.env.CURSOR_API_KEY;
  if (configuredKey) message = message.split(configuredKey).join("[REDACTED]");
  return message
    .replace(/\bcrsr_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
    .slice(0, 1000);
}

export function unavailableEnvelope(error) {
  return {
    version: 1,
    status: "unavailable",
    code: typeof error?.code === "string" ? error.code : "adapter-error",
    message: redactMessage(error?.message),
  };
}

function writeJson(value) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

async function main() {
  const [command, rawTarget = ".", ...rest] = process.argv.slice(2);
  if (!new Set(["preflight", "models", "run"]).has(command) || rest.length > 0) {
    fail("usage", "Usage: cursor-sdk-adapter.mjs <preflight|models|run> [project-root]");
  }
  assertSupportedRuntime();
  const projectRoot = resolveProjectRoot(rawTarget);
  const { sdk, version } = await loadCursorSdk();
  if (command === "run") {
    writeJson(await runCursorAgent({ sdk, sdkVersion: version, projectRoot, rawRequest: await readJsonInput() }));
    return;
  }
  const models = await verifiedCatalog(sdk);
  writeJson({
    version: 1,
    status: "ready",
    provider: "cursor",
    adapter: "cursor-sdk",
    nodeVersion: process.versions.node,
    sdkVersion: version,
    modelCount: models.length,
    ...(command === "models" ? { models } : {}),
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    writeJson(unavailableEnvelope(error));
    process.exitCode = 1;
  });
}
