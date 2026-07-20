#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';
import { detectProblems } from '../../../.vibekit/skills/tutien/scripts/catalog.mjs';
import { buildVillains, advanceVillainState } from '../../../.vibekit/skills/tutien/scripts/villains.mjs';
import { buildSnapshot, snapshotsToPrune } from '../../../.vibekit/skills/tutien/scripts/snapshot.mjs';
import { compareSnapshots, migrateSnapshot } from '../../../.vibekit/skills/tutien/scripts/compare.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const fx = (name) => path.join(fixtures, name);

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

const loop = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
const clean = analyze({ jsonlFiles: [fx('synthetic-clean.jsonl')] });

const snap = (a, opts) => buildSnapshot(a, { projectId: 'demo', createdAt: '2026-07-10T00:00:00Z', ...opts });

check('snapshot: no raw prompt text or secret survives into the snapshot', () => {
  const s = JSON.stringify(snap(loop));
  assert.ok(!s.includes('hunter2'));
  assert.ok(!s.includes('SECRETVALUE'));
  assert.ok(!s.toLowerCase().includes('login redirect bug'));
});
check('snapshot: provenance ids are salted, not raw event ids', () => {
  const raw = new Set(detectProblems(loop).flatMap((p) => p.evidence.eventIds));
  const s = snap(loop);
  assert.ok(s.provenance.length >= 1);
  for (const id of s.provenance) assert.ok(!raw.has(id), 'raw event id leaked into provenance');
});
check('snapshot: aggregate counts are present and match analysis', () => {
  const s = snap(loop);
  assert.equal(s.counts.retryLoops, loop.repetition.retryLoopCandidates.length);
  assert.equal(s.counts.conflicts, loop.conflicts.length);
  assert.equal(s.tokens.reportedTotal, loop.tokens.reportedTotal);
});
check('snapshot: deterministic for a fixed createdAt', () =>
  assert.deepEqual(snap(loop), snap(loop)));

check('prune: keeps the newest N, returns the oldest to trash', () => {
  const files = ['2026-01.json', '2026-02.json', '2026-03.json', '2026-04.json'];
  assert.deepEqual(snapshotsToPrune(files, 2), ['2026-01.json', '2026-02.json']);
  assert.deepEqual(snapshotsToPrune(files, 10), []);
});

check('compare: computes score delta, trend, and count deltas', () => {
  const prev = snap(clean, { createdAt: '2026-07-01T00:00:00Z' });
  const curr = snap(loop, { createdAt: '2026-07-10T00:00:00Z' });
  const c = compareSnapshots(prev, curr);
  assert.equal(typeof c.scoreDelta, 'number');
  assert.ok(['improving', 'worsening', 'stable', 'unknown'].includes(c.trend));
  assert.equal(c.countDeltas.retryLoops, curr.counts.retryLoops - prev.counts.retryLoops);
  assert.equal(c.from, '2026-07-01T00:00:00Z');
  assert.equal(c.to, '2026-07-10T00:00:00Z');
});
check('compare: identical snapshots are a stable, zero-delta trend', () => {
  const s = snap(loop);
  const c = compareSnapshots(s, s);
  assert.equal(c.scoreDelta, 0);
  assert.equal(c.trend, 'stable');
});

check('migrate: an old snapshot missing fields is upgraded, not crashed', () => {
  const old = { snapshotSchema: 0, score: 40, realm: { name: 'Trúc Cơ' }, createdAt: 'x' };
  const m = migrateSnapshot(old);
  assert.equal(m.snapshotSchema, 1);
  assert.equal(m.counts.retryLoops, 0);
  assert.equal(m.tokens.reportedTotal, 0);
});
check('migrate: a future-schema snapshot fails closed', () => {
  assert.throws(() => migrateSnapshot({ snapshotSchema: 999 }), /newer than supported/);
});

// ---- villain cooldown round-trip across windows ----
check('cooldown state: a shown villain is recorded with a full cooldown', () => {
  const shown = buildVillains(detectProblems(loop), { tone: 'serene' }).villains;
  const state = advanceVillainState([], shown);
  assert.ok(state.some((v) => v.problemId === 'repeated-failure' && v.windowsRemaining === 2));
});
check('cooldown state: prior villain suppresses a repeat next window (via snapshot state)', () => {
  const run1 = buildVillains(detectProblems(loop), { tone: 'gentle' });
  const snap1 = snap(loop, { shownVillains: run1.villains });
  const run2 = buildVillains(detectProblems(loop), { tone: 'serene', priorVillains: snap1.villainState });
  assert.equal(run2.villains.length, 0, 'unworsened villain should stay on cooldown next window');
});
check('cooldown state: an unshown prior villain decrements and eventually drops', () => {
  const s1 = advanceVillainState([{ problemId: 'x', windowsRemaining: 2, priority: 0.3 }], []);
  assert.equal(s1[0].windowsRemaining, 1);
  const s2 = advanceVillainState(s1, []);
  assert.equal(s2.length, 0);
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} snapshot/compare checks passed`);
