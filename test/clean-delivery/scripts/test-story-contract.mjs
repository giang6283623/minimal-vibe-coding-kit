#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const validator = path.join(root, ".vibekit/skills/clean-delivery/scripts/validate-story.mjs");
const fixtures = path.join(root, "test/clean-delivery/fixtures");

function run(fixture) {
  return spawnSync(process.execPath, [validator, path.join(fixtures, fixture)], {
    cwd: root,
    encoding: "utf8",
  });
}

const valid = run("valid-story.md");
assert.equal(valid.status, 0, valid.stderr);
assert.match(valid.stdout, /^VALID:/m);

for (const [fixture, expected] of [
  ["missing-out-of-scope.md", "missing or empty section: Out of scope"],
  ["missing-red-evidence.md", "Red evidence requires Command"],
  ["missing-proof-command.md", "Proof commands requires Unit"],
  ["untouched-template.md", "template placeholder remains: Short observable outcome"],
  ["duplicate-sections.md", "duplicate section: Editable paths"],
  ["placeholder-commands.md", "Red evidence requires Command"],
]) {
  const result = run(fixture);
  assert.equal(result.status, 1, fixture + " should fail");
  assert.match(result.stderr, new RegExp(expected));
}

console.log("Clean Delivery story contract: 7 checks passed");
