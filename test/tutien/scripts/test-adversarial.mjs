#!/usr/bin/env node
// Adversarial invariant tests from the 4P release-readiness audit: metadata
// privacy, token-evidence integrity, dedupe semantics, task-local
// attribution, context sanitization, schema fail-closed, and the git
// repository boundary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';
import { scoreReport } from '../../../.vibekit/skills/tutien/scripts/score.mjs';
import { detectProblems } from '../../../.vibekit/skills/tutien/scripts/catalog.mjs';
import { sanitizeContext } from '../../../.vibekit/skills/tutien/scripts/villains.mjs';
import { parseJsonl } from '../../../.vibekit/skills/tutien/scripts/adapters/generic-jsonl.mjs';
import { readGitEvents } from '../../../.vibekit/skills/tutien/scripts/adapters/git.mjs';
import { buildReportModel, renderMarkdown } from '../../../.vibekit/skills/tutien/scripts/render-report.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-adv-'));
const write = (name, lines) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, lines.join('\n'));
  return p;
};
const J = JSON.stringify;

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// ---- P1-01: metadata privacy ----
const metaFile = write('meta.jsonl', [
  J({ type: 'message', session: 'sess-SECRETMARKER', task: 'task-TOKENMARKER', ts: '2026-07-01T09:00:00Z', role: 'user', text: 'hello' }),
  J({ type: 'message', session: 'sess-SECRETMARKER', task: 'task-TOKENMARKER', ts: '2026-07-01T09:01:00Z', role: 'assistant', text: 'hi', usage: { total: 100, accuracy: 'reported', requestId: 'a' } }),
  J({ type: 'test', session: 'sess-SECRETMARKER', task: 'task-TOKENMARKER', ts: '2026-07-01T09:02:00Z', outcome: 'fail', label: 'lbl-PWDMARKER' })
]);
check('P1-01: session/task/label metadata never appears raw in analysis output', () => {
  const s = JSON.stringify(analyze({ jsonlFiles: [metaFile] }));
  assert.ok(!s.includes('SECRETMARKER'), 'session leaked');
  assert.ok(!s.includes('TOKENMARKER'), 'task leaked');
  assert.ok(!s.includes('PWDMARKER'), 'label leaked');
});
check('P1-01: timestamps are canonicalized to UTC ISO', () => {
  const f = write('tz.jsonl', [J({ type: 'message', session: 's', ts: '2026-07-01T16:00:00+07:00', role: 'user', text: 'x' })]);
  const a = analyze({ jsonlFiles: [f] });
  assert.equal(a.coverage.window.start, '2026-07-01T09:00:00.000Z');
});
check('P1-01: reserved source fields in exports fail closed', () => {
  assert.throws(() => parseJsonl(J({ type: 'message', __source: 'git', text: 'x' })), /reserved field/);
  assert.throws(() => parseJsonl(J({ type: 'message', source: 'git', text: 'x' })), /reserved field/);
});

// ---- P1-02: token-evidence integrity ----
check('P1-02: accuracy=reported with no numbers cannot unlock a realm', () => {
  const f = write('empty-usage.jsonl', [
    J({ type: 'message', session: 's', task: 't', ts: '2026-07-01T09:00:00Z', role: 'user', text: 'q' }),
    J({ type: 'message', session: 's', task: 't', ts: '2026-07-01T09:01:00Z', role: 'assistant', text: 'a', usage: { accuracy: 'reported' } }),
    J({ type: 'message', session: 's', task: 't', ts: '2026-07-01T09:02:00Z', role: 'assistant', text: 'b', usage: { accuracy: 'reported' } })
  ]);
  const a = analyze({ jsonlFiles: [f] });
  const s = scoreReport(a);
  assert.equal(a.tokens.reportedTotal, 0);
  assert.equal(a.tokens.unknownTurns, 2, 'claimed-but-empty usage must count as unknown');
  assert.equal(s.enoughEvidence, false, 'no realm from nonexistent token evidence');
  assert.equal(s.score, null);
});
check('P1-02: zero-value usage counts as unknown, not reported coverage', () => {
  const f = write('zero-usage.jsonl', [
    J({ type: 'message', session: 's', role: 'assistant', text: 'a', usage: { total: 0, accuracy: 'reported' } })
  ]);
  const a = analyze({ jsonlFiles: [f] });
  assert.equal(a.tokens.reportedTotal, 0);
  assert.equal(a.tokens.unknownTurns, 1);
});
check('P1-02: negative and string usage values fail closed in the adapter', () => {
  assert.throws(() => parseJsonl(J({ type: 'message', usage: { total: -5, accuracy: 'reported' } })), /finite non-negative/);
  assert.throws(() => parseJsonl(J({ type: 'message', usage: { total: 'lots', accuracy: 'reported' } })), /finite non-negative/);
});
check('P1-02: mixed accuracy stays disjoint', () => {
  const f = write('mixed.jsonl', [
    J({ type: 'message', session: 's', role: 'assistant', text: 'a', usage: { total: 100, accuracy: 'reported', requestId: 'r1' } }),
    J({ type: 'message', session: 's', role: 'assistant', text: 'b', usage: { total: 40, accuracy: 'estimated' } })
  ]);
  const a = analyze({ jsonlFiles: [f] });
  assert.equal(a.tokens.reportedTotal, 100);
  assert.equal(a.tokens.estimatedTotal, 40);
});

// ---- P2-05: schema fail-closed ----
check('P2-05: invalid role, outcome, and timestamp fail closed', () => {
  assert.throws(() => parseJsonl(J({ type: 'message', role: 'attacker' })), /invalid role/);
  assert.throws(() => parseJsonl(J({ type: 'test', outcome: 'maybe' })), /invalid outcome/);
  assert.throws(() => parseJsonl(J({ type: 'message', ts: 'not-a-date' })), /invalid timestamp/);
  assert.throws(() => parseJsonl(J({ type: 'message', usage: { accuracy: 'exact' } })), /invalid usage.accuracy/);
  assert.throws(() => parseJsonl(J({ type: 'message', session: 42 })), /must be a string/);
  assert.throws(() => parseJsonl(J({ type: 'message', usage: { cumulative: 'yes' } })), /must be a boolean/);
});

// ---- P2-01: dedupe semantics ----
check('P2-01: non-cumulative chunks sharing a requestId are summed', () => {
  const f = write('noncum.jsonl', [
    J({ type: 'message', session: 's', role: 'assistant', text: 'c1', usage: { total: 100, accuracy: 'reported', requestId: 'r' } }),
    J({ type: 'message', session: 's', role: 'assistant', text: 'c2', usage: { total: 200, accuracy: 'reported', requestId: 'r' } })
  ]);
  assert.equal(analyze({ jsonlFiles: [f] }).tokens.reportedTotal, 300);
});
check('P2-01: cumulative streaming counters still keep only the last value', () => {
  const f = write('cum.jsonl', [
    J({ type: 'message', session: 's', role: 'assistant', text: 'c1', usage: { total: 100, accuracy: 'reported', requestId: 'r', cumulative: true } }),
    J({ type: 'message', session: 's', role: 'assistant', text: 'c2', usage: { total: 250, accuracy: 'reported', requestId: 'r', cumulative: true } })
  ]);
  const a = analyze({ jsonlFiles: [f] });
  assert.equal(a.tokens.reportedTotal, 250);
  assert.equal(a.tokens.dedupedStreamUpdates, 1);
});

// ---- P2-02: task-local failure attribution ----
const loopEvents = (task, session) => {
  const out = [];
  for (let i = 1; i <= 3; i++) {
    out.push(J({ type: 'message', session, task, ts: `2026-07-01T09:0${i}:00Z`, role: 'user', text: 'please do the exact same big thing again and again' }));
    out.push(J({ type: 'message', session, task, ts: `2026-07-01T09:0${i}:30Z`, role: 'assistant', text: 'ok', usage: { total: 100, accuracy: 'reported', requestId: `q${task}${i}` } }));
  }
  return out;
};
check('P2-02: an unrelated failure does not flip a loop to repeated-failure', () => {
  const f = write('unrelated-fail.jsonl', [
    ...loopEvents('loop', 'sA'),
    J({ type: 'test', session: 'sB', task: 'other', ts: '2026-07-01T10:00:00Z', outcome: 'fail', label: 'unrelated build' })
  ]);
  const ids = detectProblems(analyze({ jsonlFiles: [f] })).map((p) => p.problemId);
  assert.ok(ids.includes('too-many-prompts'), `expected too-many-prompts, got ${ids.join(',')}`);
  assert.ok(!ids.some((id) => id === 'repeated-failure'), 'unrelated failure must not reclassify the loop');
});
check('P2-02: a failure in the same task still classifies as repeated-failure', () => {
  const f = write('local-fail.jsonl', [
    ...loopEvents('loop', 'sA'),
    J({ type: 'test', session: 'sA', task: 'loop', ts: '2026-07-01T09:04:00Z', outcome: 'fail', label: 'loop test' })
  ]);
  const ids = detectProblems(analyze({ jsonlFiles: [f] })).map((p) => p.problemId);
  assert.ok(ids.includes('repeated-failure'), `expected repeated-failure, got ${ids.join(',')}`);
});

// ---- P2-04: context slug sanitization ----
check('P2-04: path-like and identity-bearing context values are dropped', () => {
  const c = sanitizeContext({
    fileCategory: '../private/name',
    primaryLanguage: 'user@host',
    projectType: 'a/b',
    validationLabel: 'unit_v2',
    metricCategory: 'tokens'
  });
  assert.deepEqual(c, { validationLabel: 'unit_v2', metricCategory: 'tokens' });
});

// ---- P2-03: git repository boundary ----
check('P2-03: a non-repository gitRoot is rejected', () => {
  assert.throws(() => readGitEvents(os.tmpdir()), /not a git repository|outside the current repository/);
});
check('P2-03: a different repository is rejected even though it is valid git', () => {
  const other = path.join(tmp, 'other-repo');
  fs.mkdirSync(other, { recursive: true });
  const init = spawnSync('git', ['init', '-q'], { cwd: other, encoding: 'utf8' });
  assert.equal(init.status, 0, `git init failed: ${init.stderr}`);
  assert.throws(() => readGitEvents(other), /outside the current repository/);
});
check('P2-03: the current repository itself is allowed', () => {
  assert.ok(Array.isArray(readGitEvents('.')));
});

// ---- P2-06: issue-specific if-then practice ----
check('P2-06: a conflict-only report gets a conflict if-then, not a retry rule', () => {
  const f = write('conflict.jsonl', [
    J({ type: 'message', session: 's', task: 't', ts: '2026-07-03T08:00:00Z', role: 'user', text: 'Do not rename the public API.' }),
    J({ type: 'message', session: 's', task: 't', ts: '2026-07-03T08:00:20Z', role: 'assistant', text: 'ok', usage: { total: 200, accuracy: 'reported', requestId: 'k1' } }),
    J({ type: 'message', session: 's', task: 't', ts: '2026-07-03T08:05:00Z', role: 'user', text: 'Rename the public API endpoint to /v2 now.' })
  ]);
  const md = renderMarkdown(buildReportModel(analyze({ jsonlFiles: [f] }), {}), 'en');
  assert.ok(md.includes('If a new instruction contradicts an earlier one'), 'conflict-specific if-then expected');
  assert.ok(!md.includes('If the same command fails twice'), 'retry rule must not appear for a conflict');
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} adversarial checks passed`);
