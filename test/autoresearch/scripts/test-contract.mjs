#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const canonical = path.join(repo, ".vibekit/skills/autoresearch-coding");
const runner = path.join(canonical, "scripts/run_logged.py");
const ledger = path.join(canonical, "scripts/log_result.py");
const temporaryRoots = [];
let checks = 0;

function temporary(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `autoresearch-contract-${label}-`));
  temporaryRoots.push(root);
  return root;
}

function check(name, operation) {
  operation();
  checks += 1;
  console.log(`PASS ${name}`);
}

function runPython(args, cwd, expected = 0) {
  const result = spawnSync("python3", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return result;
}

function runnerArgs(log, command, extra = []) {
  return [runner, "--log", log, "--timeout", "5", ...extra, "--", ...command];
}

function prepareLog(root, name = "metric.log") {
  const log = path.join(root, ".autoresearch/logs", name);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.writeFileSync(log, "metric=1\n");
  return log;
}

function ledgerArgs(root, overrides = {}) {
  const log = overrides.log || prepareLog(root);
  return [
    ledger,
    "--file", overrides.file || "results.tsv",
    "--commit", overrides.commit || "WORKTREE-exp",
    `--metric=${overrides.metric ?? "1"}`,
    "--direction", overrides.direction || "higher",
    "--status", overrides.status || "keep",
    "--seconds", overrides.seconds || "0.1",
    "--log", path.relative(root, log),
    "--description", overrides.description || "bounded experiment",
  ];
}

function listFiles(root) {
  const output = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child);
      else output.push(path.relative(root, child));
    }
  }
  walk(root);
  return output.sort();
}

function runAsync(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

try {
  check("provider mirrors match the complete canonical skill", () => {
    const canonicalFiles = listFiles(canonical);
    for (const mirror of [".claude", ".agents", ".grok", ".kimi-code"]) {
      const mirrorRoot = path.join(repo, mirror, "skills/autoresearch-coding");
      assert.deepEqual(listFiles(mirrorRoot), canonicalFiles, mirror);
      for (const file of canonicalFiles) {
        assert.deepEqual(fs.readFileSync(path.join(mirrorRoot, file)), fs.readFileSync(path.join(canonical, file)), `${mirror}/${file}`);
      }
    }
  });

  check("skill contract covers safe metrics, noise, oracle integrity, rollback, and exact-tree proof", () => {
    const skill = fs.readFileSync(path.join(canonical, "SKILL.md"), "utf8");
    for (const phrase of [
      "argument vector",
      "minimum meaningful delta",
      "report variance",
      "oracle assets",
      "baseline fingerprint",
      "experiment-owned trial delta",
      "exact integrated tree",
      "Delegate only",
    ]) assert.ok(skill.includes(phrase), phrase);
  });

  check("helper sources avoid shell execution and use bounded guarded writes", () => {
    const runnerSource = fs.readFileSync(runner, "utf8");
    const ledgerSource = fs.readFileSync(ledger, "utf8");
    assert.ok(!runnerSource.includes("shell=True"));
    for (const phrase of ["subprocess.Popen", "start_new_session", "max_log_bytes", "[REDACTED]", "os.replace"]) {
      assert.ok(runnerSource.includes(phrase), phrase);
    }
    for (const phrase of ["os.O_NOFOLLOW", "LOCK_EX", "os.fchmod", "os.fsync", "unsupported header"]) {
      assert.ok(ledgerSource.includes(phrase), phrase);
    }
  });

  const argvRoot = temporary("argv");
  const argvLog = path.join(argvRoot, ".autoresearch/logs/argv.log");
  const argv = runPython(runnerArgs(argvLog, [process.execPath, "-e", "console.log(process.argv[1])", "literal; touch never"]), argvRoot);
  check("runner executes argv without interpreting shell metacharacters", () => {
    assert.match(fs.readFileSync(argvLog, "utf8"), /literal; touch never/);
    assert.ok(!fs.existsSync(path.join(argvRoot, "never")));
    assert.match(argv.stdout, /exit_code=0/);
  });

  const legacyRoot = temporary("legacy");
  const legacyLog = path.join(legacyRoot, ".autoresearch/logs/legacy.log");
  const legacy = runPython([runner, `${process.execPath} -e "console.log('legacy=1')"`, "--log", legacyLog, "--timeout", "5"], legacyRoot);
  check("runner preserves simple legacy command strings without a shell", () => {
    assert.match(legacy.stdout, /legacy_command_string=true/);
    assert.match(fs.readFileSync(legacyLog, "utf8"), /legacy=1/);
  });

  const legacyShellRoot = temporary("legacy-shell");
  for (const [name, command] of [
    ["pipe", `${process.execPath} -e "console.log('first')" | ${process.execPath} -e "console.log('second')"`],
    ["redirect", `${process.execPath} -e "console.log('metric=1')" > redirected.log`],
    ["and", `${process.execPath} -e "console.log('first')" && ${process.execPath} -e "console.log('second')"`],
    ["environment", `MVCK_METRIC=1 ${process.execPath} -e "console.log(process.env.MVCK_METRIC)"`],
    ["glob", `${process.execPath} -e "console.log(process.argv[1])" *.md`],
  ]) {
    const rejectedLog = path.join(legacyShellRoot, `.autoresearch/logs/${name}.log`);
    const rejected = runPython([runner, command, "--log", rejectedLog, "--timeout", "5"], legacyShellRoot, 1);
    check(`runner rejects legacy ${name} shell syntax with argv migration guidance`, () => {
      assert.match(rejected.stderr, /shell syntax is not supported.*argv after --/);
      assert.ok(!fs.existsSync(rejectedLog));
      assert.ok(!fs.existsSync(path.join(legacyShellRoot, "redirected.log")));
    });
  }

  const secretRoot = temporary("secret");
  const secretLog = path.join(secretRoot, ".autoresearch/logs/secret.log");
  runPython(runnerArgs(secretLog, [process.execPath, "-e", "console.log('API_TOKEN=supersecretvalue Bearer abcdefghijklmnop')"]), secretRoot);
  check("runner redacts common assignment and bearer secrets", () => {
    const output = fs.readFileSync(secretLog, "utf8");
    assert.ok(!output.includes("supersecretvalue"));
    assert.ok(!output.includes("abcdefghijklmnop"));
    assert.equal((fs.statSync(secretLog).mode & 0o777), 0o600);
  });

  const boundedRoot = temporary("bounded");
  const boundedLog = path.join(boundedRoot, ".autoresearch/logs/bounded.log");
  const bounded = runPython(runnerArgs(
    boundedLog,
    [process.execPath, "-e", "console.log('A'.repeat(4096))"],
    ["--max-log-bytes", "1024"],
  ), boundedRoot);
  check("runner bounds oversized logs and reports truncation", () => {
    assert.match(bounded.stdout, /log_truncated=true/);
    assert.match(fs.readFileSync(boundedLog, "utf8"), /LOG TRUNCATED at 1024 bytes/);
  });

  const timeoutRoot = temporary("timeout");
  const timeoutLog = path.join(timeoutRoot, ".autoresearch/logs/timeout.log");
  const timeout = runPython([
    runner,
    "--log", timeoutLog,
    "--timeout", "1",
    "--",
    process.execPath,
    "-e",
    "setTimeout(() => {}, 10000)",
  ], timeoutRoot, 124);
  check("runner enforces timeout and records it", () => {
    assert.match(timeout.stdout, /exit_code=124/);
    assert.match(fs.readFileSync(timeoutLog, "utf8"), /TIMEOUT after 1s/);
  });

  const outsideLogRoot = temporary("outside-log");
  const outsideLog = path.join(outsideLogRoot, "outside.log");
  const outside = runPython(runnerArgs(outsideLog, [process.execPath, "-e", "console.log('no')"]), outsideLogRoot, 1);
  check("runner refuses logs outside .autoresearch/logs", () => {
    assert.match(outside.stderr, /log path must stay/);
    assert.ok(!fs.existsSync(outsideLog));
  });

  if (process.platform !== "win32") {
    const linkedLogRoot = temporary("linked-log");
    const logDirectory = path.join(linkedLogRoot, ".autoresearch/logs");
    fs.mkdirSync(logDirectory, { recursive: true });
    const realLog = path.join(logDirectory, "real.log");
    fs.writeFileSync(realLog, "outside\n");
    const linkedLog = path.join(logDirectory, "linked.log");
    fs.symlinkSync(realLog, linkedLog);
    const linked = runPython(runnerArgs(linkedLog, [process.execPath, "-e", "console.log('no')"]), linkedLogRoot, 1);
    check("runner refuses a symlinked log file", () => {
      assert.match(linked.stderr, /symlinked log file/);
      assert.equal(fs.readFileSync(realLog, "utf8"), "outside\n");
    });
  }

  const ledgerRoot = temporary("ledger");
  runPython(ledgerArgs(ledgerRoot), ledgerRoot);
  const resultsPath = path.join(ledgerRoot, "results.tsv");
  check("ledger creates one valid owner-only TSV row", () => {
    const rows = fs.readFileSync(resultsPath, "utf8").trim().split("\n");
    assert.equal(rows.length, 2);
    assert.equal(rows[0], "commit\tmetric_value\tdirection\tstatus\tseconds\tlog_path\tdescription");
    if (process.platform !== "win32") assert.equal((fs.statSync(resultsPath).mode & 0o777), 0o600);
  });

  const beforeInvalid = fs.readFileSync(resultsPath, "utf8");
  const newline = runPython(ledgerArgs(ledgerRoot, { description: "line one\nforged\trow" }), ledgerRoot, 1);
  check("ledger rejects row-breaking control characters without mutation", () => {
    assert.match(newline.stderr, /control characters/);
    assert.equal(fs.readFileSync(resultsPath, "utf8"), beforeInvalid);
  });

  const nonfinite = runPython(ledgerArgs(ledgerRoot, { seconds: "nan" }), ledgerRoot, 1);
  check("ledger rejects non-finite timing", () => {
    assert.match(nonfinite.stderr, /finite non-negative/);
    assert.equal(fs.readFileSync(resultsPath, "utf8"), beforeInvalid);
  });

  for (const metric of ["nan", "NaN", "inf", "+inf", "-inf", "Infinity", "-Infinity", "1e999999", "not-a-number"]) {
    const invalidMetric = runPython(ledgerArgs(ledgerRoot, { metric }), ledgerRoot, 1);
    check(`ledger rejects invalid metric ${metric} without mutation`, () => {
      assert.match(invalidMetric.stderr, /metric must be a finite number/);
      assert.equal(fs.readFileSync(resultsPath, "utf8"), beforeInvalid);
    });
  }

  const finiteMetricRoot = temporary("finite-metrics");
  for (const metric of ["-1.25", "6.02e23"]) {
    runPython(ledgerArgs(finiteMetricRoot, { commit: `WORKTREE-finite-${metric}`, metric }), finiteMetricRoot);
  }
  check("ledger preserves valid finite decimal and exponent metrics", () => {
    const rows = fs.readFileSync(path.join(finiteMetricRoot, "results.tsv"), "utf8").trim().split("\n");
    assert.deepEqual(rows.slice(1).map((row) => row.split("\t")[1]), ["-1.25", "6.02e23"]);
  });

  const concurrent = await Promise.all(Array.from({ length: 6 }, (_, index) => runAsync(
    ledgerArgs(ledgerRoot, { commit: `WORKTREE-concurrent-${index}` }),
    ledgerRoot,
  )));
  check("ledger serializes concurrent appends with one header", () => {
    assert.ok(concurrent.every((result) => result.status === 0), JSON.stringify(concurrent));
    const rows = fs.readFileSync(resultsPath, "utf8").trim().split("\n");
    assert.equal(rows.length, 8);
    assert.equal(rows.filter((row) => row.startsWith("commit\tmetric_value")).length, 1);
  });

  const outsideLedgerRoot = temporary("outside-ledger");
  const escapedLedger = path.join(path.dirname(outsideLedgerRoot), `${path.basename(outsideLedgerRoot)}-escaped.tsv`);
  const escaped = runPython(ledgerArgs(outsideLedgerRoot, { file: escapedLedger }), outsideLedgerRoot, 1);
  check("ledger refuses a result path outside the project", () => {
    assert.match(escaped.stderr, /stay inside the project root/);
    assert.ok(!fs.existsSync(escapedLedger));
  });

  const malformedRoot = temporary("malformed");
  prepareLog(malformedRoot);
  fs.writeFileSync(path.join(malformedRoot, "results.tsv"), "wrong\theader\n");
  const malformed = runPython(ledgerArgs(malformedRoot), malformedRoot, 1);
  check("ledger refuses an unsupported existing header", () => {
    assert.match(malformed.stderr, /unsupported header/);
    assert.equal(fs.readFileSync(path.join(malformedRoot, "results.tsv"), "utf8"), "wrong\theader\n");
  });

  if (process.platform !== "win32") {
    const linkedLedgerRoot = temporary("linked-ledger");
    prepareLog(linkedLedgerRoot);
    const actualLedger = path.join(linkedLedgerRoot, "actual.tsv");
    fs.writeFileSync(actualLedger, "outside\n");
    fs.symlinkSync(actualLedger, path.join(linkedLedgerRoot, "results.tsv"));
    const linked = runPython(ledgerArgs(linkedLedgerRoot), linkedLedgerRoot, 1);
    check("ledger refuses a symlinked result file", () => {
      assert.match(linked.stderr, /symlinked result file/);
      assert.equal(fs.readFileSync(actualLedger, "utf8"), "outside\n");
    });
  }

  console.log(`Autoresearch contract: ${checks} checks passed`);
} finally {
  for (const root of temporaryRoots.reverse()) fs.rmSync(root, { recursive: true, force: true });
}
