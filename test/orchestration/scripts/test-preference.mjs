#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const script = path.join(root, ".vibekit/scripts/orchestration-preference.mjs");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-orchestration-"));
let checks = 0;

function run(runArgs, expected = 0) {
  const result = spawnSync(process.execPath, [script, ...runArgs], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  checks += 1;
  return result;
}

try {
  fs.mkdirSync(path.join(temporary, ".vibekit"), { recursive: true });
  fs.writeFileSync(
    path.join(temporary, ".vibekit/preferences.json"),
    JSON.stringify({ codex: { default_mode_request_user_input: "enabled" } }, null, 2) + "\n"
  );

  const initial = JSON.parse(run(["show", temporary]).stdout);
  assert.equal(initial.configured, false);
  assert.equal(initial.mode, "default");

  const rememberedAuto = JSON.parse(run(["remember", "auto", temporary]).stdout);
  assert.equal(rememberedAuto.mode, "auto");
  assert.equal(rememberedAuto.remember, true);
  const afterAuto = JSON.parse(fs.readFileSync(path.join(temporary, ".vibekit/preferences.json"), "utf8"));
  assert.equal(afterAuto.codex.default_mode_request_user_input, "enabled");

  run(["remember", "custom", temporary], 1);
  const rememberedCustom = JSON.parse(run([
    "remember",
    "custom",
    temporary,
    "--assign",
    "researcher=cursor:provider-default",
    "--assign=reviewer=claude:sonnet-current",
    "--assign=operator=opencode:provider-default",
  ]).stdout);
  assert.equal(rememberedCustom.assignments.researcher.provider, "cursor");
  assert.equal(rememberedCustom.assignments.reviewer.model, "sonnet-current");
  assert.equal(rememberedCustom.assignments.operator.provider, "opencode");

  run(["remember", "default", temporary, "--assign=reviewer=claude:provider-default"], 1);
  run(["remember", "custom", temporary, "--assign=../escape=claude:provider-default"], 1);

  const forgotten = JSON.parse(run(["forget", temporary]).stdout);
  assert.equal(forgotten.configured, false);
  const afterForget = JSON.parse(fs.readFileSync(path.join(temporary, ".vibekit/preferences.json"), "utf8"));
  assert.equal(afterForget.codex.default_mode_request_user_input, "enabled");

  if (process.platform !== "win32") {
    const outside = path.join(temporary, "outside.json");
    const linkedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mvck-orchestration-link-"));
    fs.mkdirSync(path.join(linkedRoot, ".vibekit"), { recursive: true });
    fs.writeFileSync(outside, "{}\n");
    fs.symlinkSync(outside, path.join(linkedRoot, ".vibekit/preferences.json"));
    const linked = run(["remember", "auto", linkedRoot], 1);
    assert.match(linked.stderr, /refusing symlinked project preference file/);
    fs.rmSync(linkedRoot, { recursive: true, force: true });
  }

  console.log("Orchestration preference contract: " + checks + " process checks passed");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
