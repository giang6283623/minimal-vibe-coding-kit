// Phase 4 comparison + schema migration. Compares two aggregate snapshots and
// reports deltas and a trend. Never fabricates a change from missing data.

import { SNAPSHOT_SCHEMA } from './snapshot.mjs';

// Forward-migrate an older snapshot so comparisons don't crash on new fields.
export function migrateSnapshot(snap) {
  if (!snap || typeof snap !== 'object') throw new Error('snapshot is not an object');
  const s = { ...snap };
  if ((s.snapshotSchema ?? 0) > SNAPSHOT_SCHEMA) {
    throw new Error(`snapshot schema ${s.snapshotSchema} is newer than supported ${SNAPSHOT_SCHEMA}; upgrade tutien`);
  }
  s.counts = { exactRepeats: 0, nearRepeats: 0, retryLoops: 0, conflicts: 0, failures: 0, recoveries: 0, passes: 0, ...(s.counts ?? {}) };
  s.tokens = { reportedTotal: 0, estimatedTotal: 0, unknownTurns: 0, ...(s.tokens ?? {}) };
  s.villainState = s.villainState ?? [];
  s.snapshotSchema = SNAPSHOT_SCHEMA;
  return s;
}

const num = (x) => (typeof x === 'number' ? x : null);
const diff = (a, b) => (num(a) == null || num(b) == null ? null : a - b);

export function compareSnapshots(prevRaw, currRaw) {
  const prev = migrateSnapshot(prevRaw);
  const curr = migrateSnapshot(currRaw);
  const scoreDelta = diff(curr.score, prev.score);
  const countDeltas = {};
  for (const k of Object.keys(curr.counts)) countDeltas[k] = (curr.counts[k] ?? 0) - (prev.counts[k] ?? 0);
  return {
    from: prev.createdAt,
    to: curr.createdAt,
    scoreDelta,
    realmChange: { from: prev.realm?.name ?? null, to: curr.realm?.name ?? null },
    tokenDeltas: {
      reported: (curr.tokens.reportedTotal ?? 0) - (prev.tokens.reportedTotal ?? 0),
      estimated: (curr.tokens.estimatedTotal ?? 0) - (prev.tokens.estimatedTotal ?? 0)
    },
    countDeltas,
    trend: scoreDelta == null ? 'unknown' : scoreDelta > 0 ? 'improving' : scoreDelta < 0 ? 'worsening' : 'stable'
  };
}
