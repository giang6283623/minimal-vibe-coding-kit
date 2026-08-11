#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const MODES = new Set(["default", "auto", "custom"]);
const PROVIDERS = new Set(["current", "codex", "claude", "cursor", "opencode", "grok", "kimi"]);
const ADAPTERS = new Set(["cursor-sdk"]);
const args = process.argv.slice(2);

function usage() {
  console.log([
    "Usage:",
    "  orchestration-preference.mjs show [target]",
    "  orchestration-preference.mjs remember <default|auto|custom> [target] [--assign role=provider:model] [--adapter role=cursor-sdk]",
    "  orchestration-preference.mjs forget [target]",
  ].join("\n"));
}

function fail(message, code = 1) {
  console.error("ERROR: " + message);
  process.exit(code);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolveTarget(raw) {
  const requested = path.resolve(raw || process.cwd());
  if (!fs.existsSync(requested)) fail("target does not exist: " + requested);
  if (!fs.statSync(requested).isDirectory()) fail("target is not a directory: " + requested);
  return fs.realpathSync(requested);
}

function preferenceFile(target) {
  const stateDir = path.join(target, ".vibekit");
  if (fs.existsSync(stateDir) && fs.lstatSync(stateDir).isSymbolicLink()) {
    fail("refusing symlinked project state directory: .vibekit");
  }
  const file = path.join(stateDir, "preferences.json");
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) {
    fail("refusing symlinked project preference file: .vibekit/preferences.json");
  }
  return file;
}

function readPreferences(target) {
  const file = preferenceFile(target);
  if (!fs.existsSync(file)) return {};
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("cannot parse .vibekit/preferences.json: " + error.message);
  }
  if (!plainObject(parsed)) fail(".vibekit/preferences.json root must be an object");
  return parsed;
}

function validateAssignment(role, assignment) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(role)) {
    fail("custom role must be lowercase kebab-case and at most 64 characters: " + role);
  }
  if (!plainObject(assignment) || !PROVIDERS.has(assignment.provider)) {
    fail("custom role has an unknown provider: " + role);
  }
  if (typeof assignment.model !== "string" || assignment.model.length < 1 || assignment.model.length > 120 || /[\u0000-\u001f\u007f]/.test(assignment.model)) {
    fail("custom role must have a printable model name of at most 120 characters: " + role);
  }
  if (assignment.adapter !== undefined) {
    if (!ADAPTERS.has(assignment.adapter)) fail("custom role has an unknown adapter: " + role);
    if (assignment.adapter === "cursor-sdk" && assignment.provider !== "cursor") {
      fail("cursor-sdk adapter requires the cursor provider: " + role);
    }
  }
}

function normalizedState(preferences) {
  const stored = preferences.orchestration;
  if (stored === undefined) {
    return { configured: false, mode: "default", remember: false, assignments: {} };
  }
  if (!plainObject(stored) || stored.version !== 1 || !MODES.has(stored.mode) || stored.remember !== true) {
    fail("stored orchestration preference has an unsupported schema");
  }
  const assignments = stored.assignments === undefined ? {} : stored.assignments;
  if (!plainObject(assignments)) fail("stored orchestration assignments must be an object");
  for (const [role, assignment] of Object.entries(assignments)) validateAssignment(role, assignment);
  if (stored.mode === "custom" && Object.keys(assignments).length === 0) {
    fail("stored custom mode requires at least one role assignment");
  }
  if (stored.mode !== "custom" && Object.keys(assignments).length > 0) {
    fail("stored role assignments are allowed only in custom mode");
  }
  return {
    configured: true,
    mode: stored.mode,
    remember: true,
    assignments,
    configuredAt: stored.configuredAt || null,
  };
}

function writePreferences(target, preferences) {
  const file = preferenceFile(target);
  const stateDir = path.dirname(file);
  fs.mkdirSync(stateDir, { recursive: true });
  const temp = path.join(stateDir, ".preferences-" + process.pid + ".tmp");
  try {
    fs.writeFileSync(temp, JSON.stringify(preferences, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

function parseAssignments(rawArgs) {
  const assignments = {};
  const adapters = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const item = rawArgs[index];
    let value = null;
    let kind = null;
    if (item === "--assign") {
      value = rawArgs[index + 1];
      kind = "assign";
      index += 1;
    } else if (item.startsWith("--assign=")) {
      value = item.slice("--assign=".length);
      kind = "assign";
    } else if (item === "--adapter") {
      value = rawArgs[index + 1];
      kind = "adapter";
      index += 1;
    } else if (item.startsWith("--adapter=")) {
      value = item.slice("--adapter=".length);
      kind = "adapter";
    } else {
      fail("unknown argument: " + item);
    }
    if (!value) fail(kind === "assign" ? "--assign requires role=provider:model" : "--adapter requires role=adapter");
    if (kind === "adapter") {
      const equals = value.indexOf("=");
      if (equals < 1 || equals === value.length - 1) fail("--adapter requires role=adapter");
      const role = value.slice(0, equals);
      const adapter = value.slice(equals + 1);
      if (Object.hasOwn(adapters, role)) fail("duplicate custom adapter role: " + role);
      adapters[role] = adapter;
      continue;
    }
    const equals = value.indexOf("=");
    const colon = value.indexOf(":", equals + 1);
    if (equals < 1 || colon < equals + 2 || colon === value.length - 1) {
      fail("--assign requires role=provider:model");
    }
    const role = value.slice(0, equals);
    const assignment = {
      provider: value.slice(equals + 1, colon),
      model: value.slice(colon + 1),
    };
    if (Object.hasOwn(assignments, role)) fail("duplicate custom role: " + role);
    assignments[role] = assignment;
  }
  for (const [role, adapter] of Object.entries(adapters)) {
    if (!Object.hasOwn(assignments, role)) fail("--adapter role requires a matching --assign: " + role);
    assignments[role].adapter = adapter;
  }
  for (const [role, assignment] of Object.entries(assignments)) validateAssignment(role, assignment);
  return assignments;
}

const command = args.shift();
if (!command || command === "--help" || command === "-h") {
  usage();
  process.exit(command ? 0 : 2);
}

if (command === "show") {
  const target = resolveTarget(args.shift());
  if (args.length > 0) fail("unknown argument: " + args[0]);
  console.log(JSON.stringify(normalizedState(readPreferences(target)), null, 2));
} else if (command === "remember") {
  const mode = args.shift();
  if (!MODES.has(mode)) fail("remember requires default, auto, or custom");
  const targetArg = args[0] && !args[0].startsWith("--") ? args.shift() : null;
  const target = resolveTarget(targetArg);
  const assignments = parseAssignments(args);
  if (mode === "custom" && Object.keys(assignments).length === 0) {
    fail("custom mode requires at least one --assign role=provider:model");
  }
  if (mode !== "custom" && Object.keys(assignments).length > 0) {
    fail("--assign is allowed only with custom mode");
  }
  const preferences = readPreferences(target);
  preferences.orchestration = {
    version: 1,
    mode,
    remember: true,
    assignments,
    configuredAt: new Date().toISOString(),
  };
  writePreferences(target, preferences);
  console.log(JSON.stringify(normalizedState(preferences), null, 2));
} else if (command === "forget") {
  const target = resolveTarget(args.shift());
  if (args.length > 0) fail("unknown argument: " + args[0]);
  const preferences = readPreferences(target);
  delete preferences.orchestration;
  writePreferences(target, preferences);
  console.log(JSON.stringify(normalizedState(preferences), null, 2));
} else {
  fail("unknown command: " + command, 2);
}
