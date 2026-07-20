// Phase 4 persistence. A snapshot is an AGGREGATE only: metric counts,
// coverage, token totals, score/realm, thresholds, adapter versions, villain
// cooldown state, and SALTED event-id digests. It never stores raw prompts,
// URLs, secrets, or file contents. Snapshots live under the git-ignored
// .vibekit/reports/tutien/ tree; deletion follows the repo safe-delete policy
// (prefer `trash`, never silent `rm`).

import crypto from 'node:crypto';
import { scoreReport } from './score.mjs';
import { detectProblems } from './catalog.mjs';
import { advanceVillainState } from './villains.mjs';

export const SNAPSHOT_SCHEMA = 1;
const PEPPER = 'tutien-snapshot-v1';

const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
// Salt is stable per project (so trends line up) but not reversible to raw ids.
const saltFor = (projectId) => sha16(`${PEPPER}:${projectId}`);

export function buildSnapshot(analysis, options = {}) {
  const { projectId = 'repo', window = 'all', createdAt = null, thresholds = {}, adapterVersions = {}, prevVillainState = [] } = options;
  const salt = saltFor(projectId);
  const score = scoreReport(analysis);
  const problems = detectProblems(analysis);

  // Provenance without content: only salted digests of evidence event ids.
  const provenance = [
    ...new Set(problems.flatMap((p) => p.evidence.eventIds ?? []))
  ].sort().map((id) => sha16(`${salt}:${id}`));

  const rep = analysis.repetition ?? {};
  const issues = analysis.issues ?? {};

  const shown = options.shownVillains ?? [];
  // A suppressed policy (declared-stop / needs-review / authorization-required)
  // must not persist a score, realm, or dimensions — the same fail-closed
  // projection the renderer uses. Only Nghiệp Lực survives in progression.
  const suppressed = options.canGamify === false;
  return {
    snapshotSchema: SNAPSHOT_SCHEMA,
    createdAt,
    projectId,
    window,
    coverage: analysis.coverage ?? {},
    tokens: analysis.tokens ?? {},
    counts: {
      exactRepeats: (rep.exactRepeats ?? []).length,
      nearRepeats: (rep.nearRepeats ?? []).length,
      retryLoops: (rep.retryLoopCandidates ?? []).length,
      conflicts: (analysis.conflicts ?? []).length,
      failures: (issues.failures ?? []).length,
      recoveries: (issues.recoveries ?? []).length,
      passes: issues.passes ?? 0
    },
    score: suppressed ? null : score.score,
    realm: suppressed ? null : score.realm,
    dimensions: suppressed ? null : score.dimensions,
    thresholds,
    adapterVersions,
    villainState: advanceVillainState(prevVillainState, shown),
    // Cultivation accumulators and classification are aggregate slugs only:
    // metric counters, the salted seen-ledger, and faction/path ids — never
    // rationale text, raw prompts, or authorization values.
    progression: options.progression ?? null,
    classification: options.classification ?? null,
    policyState: options.policyState ?? null,
    provenance
  };
}

// Retention is a pure decision; the caller performs the actual removal with
// `trash` per safe-delete rules. Returns the oldest files beyond `keep`.
export function snapshotsToPrune(files, keep = 20) {
  const sorted = [...files].sort();
  return sorted.slice(0, Math.max(0, sorted.length - keep));
}
