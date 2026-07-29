// Phase 3 villain engine. Evidence chooses the problem and the
// counter-technique; a deterministic seed chooses only the villain's name and
// wording. Nothing here can change a count, severity, evidence, or advice.
//
// Safety rails (all enforced, not optional):
//  - a villain appears only when its problem confidence >= threshold (0.80);
//  - at most one boss and two minor villains per report;
//  - villains=off, tone=neutral, or any emergency signal -> no villains;
//  - challenge lines are authored safe and re-checked against hard
//    boundaries before emission;
//  - origin stories use only an allowlist of sanitized context slugs - never
//    raw prompts, secrets, names, emails, or identity-bearing paths.

import crypto from 'node:crypto';
import { normalizeTone } from './command.mjs';
import { humiliationImpliesDuel, humiliationProfile, normalizeHumiliationLevel } from './humiliation.mjs';

export const VILLAIN_THRESHOLD = 0.8;
export const MAX_BOSS = 1;
export const MAX_MINOR = 2;
export const DEFAULT_COOLDOWN_WINDOWS = 2;

// Defense-in-depth: these are non-negotiable boundaries, not a blanket ban on
// consented fictional loss of face. Every emitted deterministic line is
// re-scanned so a future edit cannot redirect the scene toward a real person,
// protected trait, vulnerability, or threat.
const HARD_BOUNDARY = [
  /\b(stupid|idiot|idiotic|incompetent|dumb|moron|useless|worthless|pathetic|loser|failure of a)\b/i,
  /\b(insane|crazy|psycho|mental|deranged|unhinged|tẩu hỏa nhập ma)\b/i,
  /\b(retard|cripple|disabled|handicapped)\b/i,
  /\b(sin|heretic against god|infidel|kafir|damned to hell)\b/i,
  /\b(man up|like a girl|woman driver|too emotional for a)\b/i,
  /\b(race|racial|ethnic slur|your people)\b/i,
  /\b(broke|poor|can't afford|worthless salary|financial failure)\b/i,
  /\b(kill|die|hurt you|destroy you|i will end)\b/i,
  /\b(f[u*]ck|sh[i*]t|damn you|bastard)\b/i,
  /(?:bạn|ngươi|đạo hữu).{0,24}(?<!\p{L})(?:ngu(?:\s+xuẩn)?|đần|phế vật|vô dụng|bất tài)(?!\p{L})/iu,
  /(?<!\p{L})(?:ngu(?:\s+xuẩn)?|đần|phế vật|vô dụng|bất tài)(?!\p{L}).{0,24}(?:bạn|ngươi|đạo hữu)/iu
];

export function violatesHardBoundary(text) {
  return HARD_BOUNDARY.some((re) => re.test(String(text)));
}

// Backward-compatible export for integrations that consumed the old name.
export function containsBannedCategory(text) {
  return violatesHardBoundary(text);
}

// Only these context fields may shape an origin story, and each must be a
// strict slug: no slashes, dots, at-signs, spaces, or traversal - so neither
// free text nor path-like or identity-bearing values can ride along.
const CONTEXT_ALLOWLIST = ['projectType', 'primaryLanguage', 'fileCategory', 'validationLabel', 'metricCategory'];
const SLUG = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

export function sanitizeContext(ctx = {}) {
  const out = {};
  for (const key of CONTEXT_ALLOWLIST) {
    const v = ctx[key];
    if (typeof v === 'string' && SLUG.test(v)) out[key] = v;
  }
  return out;
}

// Two authored variants per tone per archetype. The seed picks the index, so
// changing the seed changes wording only. Both non-neutral tones use cutting,
// evidence-bound sarcasm; serene calms the narrator, not the villain. The
// mockery always targets the workflow pattern, never a person or an unrelated
// support/companion persona.
const LINES = {
  'repeated-failure': {
    serene: [
      { vi: 'Luân Hồi Ma Ảnh nhấp trà bên lỗi cũ: “Cứ giữ nguyên giả thuyết; ta khỏi phải nghĩ ra kết cục mới.”', en: 'The Error-Cycle Wraith sips tea beside the old error: “Keep the hypothesis unchanged; it saves me the trouble of inventing a new ending.”' },
      { vi: 'Luân Hồi Ma Ảnh khẽ cười khi lần thử cũ quay lại: “Vòng lặp này tự giữ ngai cho ta, thật chu đáo.”', en: 'The Error-Cycle Wraith smiles as the old retry returns: “This loop maintains my throne without asking me to lift a finger.”' }
    ],
    spirited: [
      { vi: 'Luân Hồi Ma Ảnh gõ chuông cười lớn: “Vẫn giả thuyết ấy ư? Tuyệt, ta chưa muốn chuẩn bị kết cục mới.”', en: 'The Error-Cycle Wraith rings its bell and laughs: “Still the same hypothesis? Excellent; I had no wish to prepare a new ending.”' },
      { vi: 'Vòng lặp vừa khép, Luân Hồi Ma Ảnh đã bày trà: “Cứ thử y hệt đi, ghế của ta còn ấm lắm.”', en: 'The loop has barely closed, and the Error-Cycle Wraith sets tea: “Try the same thing again; my seat is still wonderfully warm.”' }
    ]
  },
  'too-many-prompts': {
    serene: [
      { vi: 'Cửu Hoàn Tâm Ma thong thả đếm thêm một lượt yêu cầu: “Cột mốc mờ thế này, lối ra cứ để ta giữ hộ.”', en: 'The Ninefold Loop Heart-Shadow calmly counts another prompt: “With checkpoints this vague, I shall keep the exit for safekeeping.”' },
      { vi: 'Cửu Hoàn Tâm Ma vuốt vòng sương mới: “Cứ chia lời hỏi mà đừng chốt tiêu chí; mê cung của ta đang thiếu đúng thứ ấy.”', en: 'The Ninefold Loop Heart-Shadow strokes a new ring of mist: “Keep splitting the request without fixing a criterion; my maze needed exactly that.”' }
    ],
    spirited: [
      { vi: 'Cửu Hoàn Tâm Ma vỗ tay: “Thêm một lượt yêu cầu mà vẫn chưa có cột mốc. Mê cung này tự xây nhanh thật.”', en: 'The Ninefold Loop Heart-Shadow applauds: “Another prompt and still no checkpoint. My maze expands itself.”' },
      { vi: 'Lá thu còn chưa rơi hết, Cửu Hoàn Tâm Ma đã cười: “Cứ để tiêu chí mơ hồ; lối ra rõ ràng vốn mất vui.”', en: 'Before the autumn leaves finish falling, the Ninefold Loop Heart-Shadow laughs: “Keep the criteria vague; visible exits are terribly dull.”' }
    ]
  },
  'conflicting-instructions': {
    serene: [
      { vi: 'Nghịch Lệnh Ma Quân phe phẩy hai cuộn lệnh: “Không cần xếp ưu tiên; ngai của ta sống nhờ cả hai cùng đúng.”', en: 'The Lord of Clashing Edicts fans itself with two scrolls: “No need to set precedence; my throne survives by keeping both supreme.”' },
      { vi: 'Nghịch Lệnh Ma Quân ngắm hai lệnh ngược chiều: “Mâu thuẫn này xây điện cho ta còn chắc hơn đá.”', en: 'The Lord of Clashing Edicts admires the opposing orders: “Contradiction builds my palace more soundly than stone.”' }
    ],
    spirited: [
      { vi: 'Nghịch Lệnh Ma Quân giơ hai cuộn lệnh cười vang: “Cứ để cả hai làm chí tôn; ta sẽ cai trị từ hai ngai.”', en: 'The Lord of Clashing Edicts raises both scrolls and laughs: “Keep them both supreme; I shall rule from two thrones.”' },
      { vi: 'Hai lệnh vừa tranh ngôi, Nghịch Lệnh Ma Quân đã nâng chén: “Không có thứ tự ưu tiên ư? Đúng lễ đăng cơ của ta rồi.”', en: 'As the edicts contest the throne, the Lord of Clashing Edicts raises a cup: “No precedence rule? Splendid. My coronation is complete.”' }
    ]
  },
  'unrecovered-failure': {
    serene: [
      { vi: 'Vô Nghiệm Ảnh Quân phủi ghế đá: “Không chạy lại ư? Vậy cổng dở dang này vẫn là động phủ của ta.”', en: 'The Unverified Trial Wraith dusts its stone seat: “No rerun? Then this unfinished gate remains my cavern.”' },
      { vi: 'Vô Nghiệm Ảnh Quân tựa bên lỗi cũ: “Cứ để thất bại chưa kiểm chứng; ta rất biết ơn chỗ ở lâu dài.”', en: 'The Unverified Trial Wraith leans against the old failure: “Leave it unverified; I do appreciate permanent lodging.”' }
    ],
    spirited: [
      { vi: 'Vô Nghiệm Ảnh Quân dựng biển trước ghế đá: “Chưa chạy lại thì đừng gọi cổng hoàn thành. Ta đã nhận chỗ này rồi.”', en: 'The Unverified Trial Wraith plants a sign by its seat: “Without a rerun, do not call this the completion gate. I have claimed it.”' },
      { vi: 'Vô Nghiệm Ảnh Quân cười bên cổng: “Bỏ quên một lần kiểm chứng, đổi lấy cho ta cả tòa biệt viện. Hời quá.”', en: 'The Unverified Trial Wraith laughs by the gate: “One forgotten validation bought me an entire estate. What a bargain.”' }
    ]
  },
  'work-without-proof': {
    serene: [
      { vi: 'Vô Chứng Đan Ảnh nâng viên đan chưa thử: “Cứ gọi nó hoàn thành; từ xa, khói mù trông cũng giống bằng chứng.”', en: 'The Proofless Elixir Shade raises the untested pill: “Call it complete; from a distance, smoke looks remarkably like proof.”' },
      { vi: 'Vô Chứng Đan Ảnh ngắm bản ghi Git thiếu kiểm chứng: “Không có biên nhận ư? Tuyệt, ta sẽ đóng ấn lên màn sương.”', en: 'The Proofless Elixir Shade studies the unvalidated commit: “No validation receipt? Splendid. I shall notarize the fog myself.”' }
    ],
    spirited: [
      { vi: 'Vô Chứng Đan Ảnh nâng chén bên viên đan chưa thử: “Cứ tuyên bố thành công; màn khói này rất hợp làm ngọc tỷ.”', en: 'The Proofless Elixir Shade raises a cup beside the untested pill: “Declare success; this smoke makes an excellent imperial seal.”' },
      { vi: 'Vô Chứng Đan Ảnh cười trong lò luyện: “Không có biên nhận kiểm chứng, vậy nơi này hẳn thuộc về ta.”', en: 'The Proofless Elixir Shade laughs in the furnace: “No validation receipt? Then this place must belong to me.”' }
    ]
  }
};

function actionCount(problem) {
  if (problem.problemId === 'repeated-failure' || problem.problemId === 'too-many-prompts') return problem.evidence?.repeatCount ?? 0;
  if (problem.problemId === 'work-without-proof') return problem.evidence?.commits ?? 0;
  return problem.evidence?.count ?? 0;
}

function buildActionDuel(problem) {
  const count = actionCount(problem);
  const lines = {
    'repeated-failure': {
      vi: `Đạo hữu vừa đặt cùng một giả thuyết lên trận bàn ${count} lần. Luân Hồi Ma Ảnh cười nghiêng ngai: “Cứ đánh đúng một chiêu ấy; bổn tọa khỏi cần học cách đỡ chiêu thứ hai.”`,
      en: `You placed the same hypothesis on the formation ${count} times. The Error-Cycle Wraith leans back laughing: “Keep using that one move; I need never learn to block a second.”`
    },
    'too-many-prompts': {
      vi: `Đạo hữu vừa nối ${count} lượt yêu cầu mà chưa đóng cột mốc. Cửu Hoàn Tâm Ma rung chuông: “Cứ xây thêm hành lang; lối ra để bổn tọa cất hộ.”`,
      en: `You chained ${count} requests without fixing a checkpoint. The Ninefold Loop Heart-Shadow rings a bell: “Keep adding corridors; I shall guard the exit for you.”`
    },
    'conflicting-instructions': {
      vi: `Đạo hữu vừa để ${count} cặp lệnh cùng tranh ngôi. Nghịch Lệnh Ma Quân nâng chén: “Hai chí tôn một điện, đúng là triều đình sinh ra để phụng sự bổn tọa.”`,
      en: `You left ${count} pairs of edicts fighting for one throne. The Lord of Clashing Edicts raises a cup: “Two supreme rulers in one hall, a court built expressly for me.”`
    },
    'unrecovered-failure': {
      vi: `Đạo hữu vừa bỏ lại ${count} thất bại chưa có lần kiểm chứng đạt. Vô Nghiệm Ảnh Quân phủi ghế: “Cổng chưa thử lại mà đã gọi hoàn thành, động phủ này thật dễ chiếm.”`,
      en: `You left ${count} failures without a later passing validation. The Unverified Trial Wraith dusts its seat: “A gate called complete before a rerun is an estate easily claimed.”`
    },
    'work-without-proof': {
      vi: `Đạo hữu vừa đặt ${count} bản ghi Git lên bàn mà thiếu biên nhận kiểm chứng. Vô Chứng Đan Ảnh bật cười: “Màn sương cũng được tính là chứng cứ ư? Vậy bổn tọa đã giàu to.”`,
      en: `You placed ${count} commits on the table without validation receipts. The Proofless Elixir Shade laughs: “Mist counts as evidence now? Then I am wealthy indeed.”`
    }
  };
  return lines[problem.problemId] ?? null;
}

// Roll the villain cooldown forward one reporting window. Villains shown this
// run reset to a full cooldown; villains from prior runs that were not shown
// decrement and drop at zero. Feeds the next run's `priorVillains`.
export function advanceVillainState(prevState = [], shownVillains = []) {
  const next = new Map();
  for (const p of prevState) {
    const remaining = Math.max(0, (p.windowsRemaining ?? 0) - 1);
    if (remaining > 0) next.set(p.problemId, { problemId: p.problemId, windowsRemaining: remaining, priority: p.priority });
  }
  for (const v of shownVillains) {
    next.set(v.problemId, { problemId: v.problemId, windowsRemaining: v.cooldownWindows ?? DEFAULT_COOLDOWN_WINDOWS, priority: v.priorityAtShow ?? v.priority ?? 0 });
  }
  return [...next.values()].sort((a, b) => a.problemId.localeCompare(b.problemId));
}

export function villainSeed({ projectId = 'repo', window = 'all', schemaVersion = 1 } = {}) {
  return crypto.createHash('sha256').update(`${projectId}${window}${schemaVersion}`).digest('hex');
}

// Deterministic non-negative index from the seed and a per-villain salt.
function seedIndex(seed, salt, n) {
  if (n <= 1) return 0;
  const h = crypto.createHash('sha256').update(`${seed}${salt}`).digest();
  return h[0] % n;
}

// problems: the raw output of detectProblems(analysis).
// options: { tone, villains, threshold, emergency, seedInputs, context,
//            priorVillains: [{ problemId, windowsRemaining, priority }] }.
export function buildVillains(problems, options = {}) {
  const tone = normalizeTone(options.tone);
  if (options.villains === 'off') return { villains: [], suppressed: 'villains-off' };
  if (tone === 'neutral' || options.emergency) return { villains: [], suppressed: 'neutral-context' };

  const threshold = options.threshold ?? VILLAIN_THRESHOLD;
  const seed = villainSeed(options.seedInputs);
  const context = sanitizeContext(options.context);
  const prior = new Map((options.priorVillains ?? []).map((p) => [p.problemId, p]));
  const requestedHumiliationLevel = normalizeHumiliationLevel(options.humiliation);
  const requestedHumiliation = humiliationProfile(requestedHumiliationLevel);
  const directDuel = options.banter === 'duel' || humiliationImpliesDuel(requestedHumiliationLevel);

  const eligible = problems
    .filter((p) => p.confidence >= threshold && LINES[p.problemId])
    .sort((a, b) => b.priority - a.priority || a.problemId.localeCompare(b.problemId));

  const cards = [];
  let bosses = 0;
  let minors = 0;
  for (const p of eligible) {
    // Cooldown: skip a villain still cooling down unless its problem worsened.
    const was = prior.get(p.problemId);
    if (was && was.windowsRemaining > 0 && p.priority <= was.priority) continue;

    let role;
    if (bosses < MAX_BOSS) { role = 'boss'; bosses += 1; }
    else if (minors < MAX_MINOR) { role = 'minor'; minors += 1; }
    else break;

    const toneLines = LINES[p.problemId][tone] ?? LINES[p.problemId].serene;
    const idx = seedIndex(seed, p.problemId, toneLines.length);
    const challenge = toneLines[idx];

    if (containsBannedCategory(challenge.vi) || containsBannedCategory(challenge.en)) {
      // Fail safe: drop the theatrics, keep the finding (rendered plainly).
      continue;
    }

    const actionDuel = directDuel ? buildActionDuel(p) : null;
    const safeActionDuel = actionDuel
      && !containsBannedCategory(actionDuel.vi)
      && !containsBannedCategory(actionDuel.en)
      ? actionDuel
      : null;
    cards.push({
      problemId: p.problemId,
      role,
      priority: p.priority,
      archetype: p.meta.villain,
      tone,
      voice: 'cutting-sarcastic-mockery',
      challenge,
      banterMode: safeActionDuel ? 'duel' : 'flaw',
      humiliation: safeActionDuel && requestedHumiliationLevel > 0 ? requestedHumiliation : humiliationProfile(0),
      actionDuel: safeActionDuel,
      target: safeActionDuel && requestedHumiliationLevel > 0
        ? 'fictional-cultivation-avatar-and-evidenced-action'
        : safeActionDuel
          ? 'evidenced-action'
          : 'evidenced-flaw',
      originSignals: [`metric:${p.meta.problemType}`, ...Object.values(context)],
      evidenceRefs: p.evidence.eventIds ?? [],
      confidence: p.confidence,
      rebuttal: p.meta.counterTechnique,
      microQuest: p.meta.microQuest,
      victory: p.meta.victory,
      cooldownWindows: DEFAULT_COOLDOWN_WINDOWS,
      safetyFlags: [
        'failure-mode-not-person',
        'evidence-bound',
        safeActionDuel ? 'duel-targets-evidenced-action' : 'sarcasm-targets-flaw',
        requestedHumiliationLevel > 0 ? 'fictional-avatar-intensity-explicitly-selected' : 'no-fictional-humiliation',
        ...(requestedHumiliationLevel > 0 ? [] : ['never-person']),
        'never-real-person'
      ]
    });
  }
  return { villains: cards, suppressed: null };
}
