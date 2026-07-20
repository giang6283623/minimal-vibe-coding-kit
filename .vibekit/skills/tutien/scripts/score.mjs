// Deterministic scoring: analysis JSON -> dimension scores -> realm.
// No randomness, no wall clock. High token usage never raises the score;
// necessary iteration is not punished; penalties are capped so one hard task
// cannot erase a long history.

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round3 = (x) => Math.round(x * 1000) / 1000;

export const DIMENSIONS = [
  { key: 'delivery', weight: 0.3 },
  { key: 'validation', weight: 0.25 },
  { key: 'clarity', weight: 0.15 },
  { key: 'recovery', weight: 0.15 },
  { key: 'safety', weight: 0.1 },
  { key: 'automation', weight: 0.05 }
];

export const REALMS = [
  { min: 0, max: 14, name: 'Phàm Nhân Nhập Môn', gloss: 'Mortal Initiate' },
  { min: 15, max: 29, name: 'Luyện Khí', gloss: 'Qi Refining' },
  { min: 30, max: 44, name: 'Trúc Cơ', gloss: 'Foundation Establishment' },
  { min: 45, max: 59, name: 'Kết Đan', gloss: 'Core Formation' },
  { min: 60, max: 69, name: 'Nguyên Anh', gloss: 'Nascent Soul' },
  { min: 70, max: 79, name: 'Hóa Thần', gloss: 'Spirit Transformation' },
  { min: 80, max: 87, name: 'Luyện Hư', gloss: 'Void Refinement' },
  { min: 88, max: 93, name: 'Hợp Thể', gloss: 'Body Integration' },
  { min: 94, max: 97, name: 'Đại Thừa', gloss: 'Great Vehicle' },
  { min: 98, max: 100, name: 'Độ Kiếp / Phi Thăng', gloss: 'Tribulation / Ascension' }
];

// Fraction of assistant turns with known (reported or estimated) usage.
// Below 0.60 the run does not have enough evidence ("thiên cơ") to score.
export function coverageFraction(analysis) {
  const tc = analysis.coverage?.tokenCoverage ?? {};
  return clamp01((tc.reportedTurnsPct ?? 0) + (tc.estimatedTurnsPct ?? 0));
}

export function scoreDimensions(analysis) {
  const issues = analysis.issues ?? {};
  const passes = issues.passes ?? 0;
  const failures = (issues.failures ?? []).length;
  const recoveries = (issues.recoveries ?? []).length;
  const commits = analysis.coverage?.commits ?? 0;
  const userPrompts = analysis.coverage?.userPrompts ?? 0;
  const validationEvents = passes + failures;
  const rep = analysis.repetition ?? {};
  const retryPrompts = (rep.retryLoopCandidates ?? []).reduce((n, l) => n + l.count, 0);
  const conflicts = (analysis.conflicts ?? []).length;

  // delivery: verified completion vs failed attempts, plus committed output.
  const delivery = validationEvents + commits === 0
    ? 0.3
    : clamp01((passes + recoveries + Math.min(commits, 5) * 0.3) / (passes + failures + 1));

  // validation discipline: presence and density of validation evidence.
  const validation = validationEvents === 0
    ? 0.2
    : clamp01(0.55 + 0.1 * recoveries + 0.05 * passes);

  // clarity: 1 - avoidable-repeat rate (capped penalty).
  const clarity = clamp01(1 - Math.min(0.6, userPrompts ? retryPrompts / userPrompts : 0));

  // recovery from failure.
  const recovery = failures === 0 ? 0.7 : clamp01(recoveries / failures);

  // safety / rule alignment: high baseline, capped penalty per conflict.
  const safety = clamp01(0.9 - Math.min(0.4, conflicts * 0.15));

  // reusable automation: not inferable from history alone in V1 (neutral).
  const automation = 0.4;

  const scores = { delivery, validation, clarity, recovery, safety, automation };
  for (const k of Object.keys(scores)) scores[k] = round3(scores[k]);
  return scores;
}

export function realmFor(score) {
  return REALMS.find((r) => score >= r.min && score <= r.max) ?? REALMS[0];
}

export function scoreReport(analysis, { coverageGate = 0.6 } = {}) {
  const coverage = round3(coverageFraction(analysis));
  const dimensions = scoreDimensions(analysis);
  if (coverage < coverageGate) {
    return {
      enoughEvidence: false,
      coverage,
      dimensions,
      score: null,
      realm: { name: 'Chưa đủ thiên cơ', gloss: 'Not enough evidence yet' },
      missing: ['token usage coverage below 60%; supply provider usage metadata to compute a realm']
    };
  }
  const weighted = DIMENSIONS.reduce((sum, d) => sum + dimensions[d.key] * d.weight, 0);
  const score = Math.round(weighted * 100);
  return { enoughEvidence: true, coverage, dimensions, score, realm: realmFor(score), missing: [] };
}
