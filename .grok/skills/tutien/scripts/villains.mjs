// Phase 3 villain engine. Evidence chooses the problem and the
// counter-technique; a deterministic seed chooses only the villain's name and
// wording. Nothing here can change a count, severity, evidence, or advice.
//
// Safety rails (all enforced, not optional):
//  - a villain appears only when its problem confidence >= threshold (0.80);
//  - at most one boss and two minor villains per report;
//  - villains=off, tone=neutral, or any emergency signal -> no villains;
//  - challenge lines are authored safe and re-checked against banned
//    categories before emission;
//  - origin stories use only an allowlist of sanitized context slugs — never
//    raw prompts, secrets, names, emails, or identity-bearing paths.

import crypto from 'node:crypto';
import { normalizeTone } from './command.mjs';

export const VILLAIN_THRESHOLD = 0.8;
export const MAX_BOSS = 1;
export const MAX_MINOR = 2;
export const DEFAULT_COOLDOWN_WINDOWS = 2;

// Defense-in-depth: challenge lines are written to avoid these, but every
// emitted line is re-scanned so a future edit cannot slip an attack through.
const BANNED_CATEGORY = [
  /\b(stupid|idiot|idiotic|incompetent|dumb|moron|useless|worthless|pathetic|loser|failure of a)\b/i,
  /\b(insane|crazy|psycho|mental|deranged|unhinged|tẩu hỏa nhập ma)\b/i,
  /\b(retard|cripple|disabled|handicapped)\b/i,
  /\b(sin|heretic against god|infidel|kafir|damned to hell)\b/i,
  /\b(man up|like a girl|woman driver|too emotional for a)\b/i,
  /\b(race|racial|ethnic slur|your people)\b/i,
  /\b(broke|poor|can't afford|worthless salary|financial failure)\b/i,
  /\b(kill|die|hurt you|destroy you|i will end)\b/i,
  /\b(f[u*]ck|sh[i*]t|damn you|bastard)\b/i,
  /\b(humiliat|shame on you|you should be ashamed|embarrass yourself)\b/i
];

export function containsBannedCategory(text) {
  return BANNED_CATEGORY.some((re) => re.test(String(text)));
}

// Only these context fields may shape an origin story, and each must be a
// strict slug: no slashes, dots, at-signs, spaces, or traversal — so neither
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
// changing the seed changes wording only. The serene/spirited vocabulary is
// local to this coding-reflection game and always targets the workflow pattern,
// never the person or any unrelated support/companion persona.
const LINES = {
  'repeated-failure': {
    serene: [
      { vi: 'Giữa làn sương mỏng, Luân Hồi Ma Ảnh hiện bóng khi lỗi cũ quay thêm một vòng.', en: 'In the thin mountain mist, the Error-Cycle Wraith appears as the old error completes another circle.' },
      { vi: 'Một lần thử giống hệt khẽ lay chuông, gọi Luân Hồi Ma Ảnh trở lại đạo lộ.', en: 'One unchanged retry stirs the bell that calls the Error-Cycle Wraith back to the path.' }
    ],
    spirited: [
      { vi: 'Luân Hồi Ma Ảnh lại gõ chuông: “Không đổi giả thuyết, sao đổi được kết cục?”', en: 'The Error-Cycle Wraith rings its bell again: “Without a new hypothesis, what new ending could appear?”' },
      { vi: 'Vòng lặp cũ vừa khép, Luân Hồi Ma Ảnh đã bày sẵn bàn trà chờ vòng kế tiếp.', en: 'The old loop has barely closed, and the Error-Cycle Wraith has already set tea for the next.' }
    ]
  },
  'too-many-prompts': {
    serene: [
      { vi: 'Cửu Hoàn Tâm Ma dệt một nhiệm vụ thành nhiều vòng sương khi cột mốc chưa hiện rõ.', en: 'The Ninefold Loop Heart-Shadow weaves one task into rings of mist when its checkpoints remain unclear.' },
      { vi: 'Nơi ranh giới nhiệm vụ nhạt dần, Cửu Hoàn Tâm Ma lặng lẽ nối thêm một vòng.', en: 'Where a task boundary fades, the Ninefold Loop Heart-Shadow quietly adds another circle.' }
    ],
    spirited: [
      { vi: 'Cửu Hoàn Tâm Ma đếm lượt yêu cầu thay cột mốc; đã đến lúc đổi chiếc vòng kế tiếp thành một tiêu chí hoàn thành.', en: 'The Ninefold Loop Heart-Shadow is counting prompts instead of checkpoints; turn the next circle into a done-criterion.' },
      { vi: 'Lượt yêu cầu càng tản như lá thu, Cửu Hoàn Tâm Ma càng dễ giấu mất lối ra.', en: 'The more prompts scatter like autumn leaves, the easier the Ninefold Loop Heart-Shadow hides the exit.' }
    ]
  },
  'conflicting-instructions': {
    serene: [
      { vi: 'Nghịch Lệnh Ma Quân hiện giữa hai đạo lệnh không thể cùng đứng vững.', en: 'The Lord of Clashing Edicts appears between two instructions that cannot stand together.' },
      { vi: 'Hai đạo lệnh ngược chiều làm mặt hồ dậy sóng, và Nghịch Lệnh Ma Quân bước ra.', en: 'Two opposing edicts ripple the still lake, and the Lord of Clashing Edicts steps forth.' }
    ],
    spirited: [
      { vi: 'Nghịch Lệnh Ma Quân giơ hai cuộn lệnh và hỏi: “Cuộn nào mới thật sự dẫn đường?”', en: 'The Lord of Clashing Edicts raises two scrolls and asks: “Which one truly leads the way?”' },
      { vi: 'Hai lệnh cùng tranh ngôi; Nghịch Lệnh Ma Quân chỉ cần ta chưa lập thứ tự ưu tiên.', en: 'Two edicts contest the throne; the Lord of Clashing Edicts needs only an absent precedence rule.' }
    ]
  },
  'unrecovered-failure': {
    serene: [
      { vi: 'Vô Nghiệm Ảnh Quân ẩn sau một thất bại chưa được soi lại bằng lần kiểm chứng mới.', en: 'The Unverified Trial Wraith rests behind a failure that has not yet met a fresh validation.' },
      { vi: 'Một lỗi bị bỏ lại làm bóng Vô Nghiệm Ảnh Quân dài thêm trên bậc đá.', en: 'A failure left behind lengthens the Unverified Trial Wraith’s shadow across the stone steps.' }
    ],
    spirited: [
      { vi: 'Vô Nghiệm Ảnh Quân phủi bụi trên ghế đá: một lần kiểm chứng thành công là đủ để mời nó rời đi.', en: 'The Unverified Trial Wraith dusts its stone seat; one passing validation is enough to send it on its way.' },
      { vi: 'Chưa có lần chạy lại, Vô Nghiệm Ảnh Quân vẫn ung dung giữ chỗ bên cổng hoàn thành.', en: 'Without a rerun, the Unverified Trial Wraith calmly keeps its seat beside the completion gate.' }
    ]
  },
  'work-without-proof': {
    serene: [
      { vi: 'Vô Chứng Đan Ảnh lảng vảng bên lò luyện khi lời tuyên bố hoàn thành chưa có bằng chứng đi cùng.', en: 'The Proofless Elixir Shade lingers by the furnace when a claim of completion carries no evidence.' },
      { vi: 'Một bản ghi Git thiếu kết quả kiểm chứng để lại làn khói mỏng cho Vô Chứng Đan Ảnh nương thân.', en: 'A commit without validation leaves a thread of smoke where the Proofless Elixir Shade can dwell.' }
    ],
    spirited: [
      { vi: 'Vô Chứng Đan Ảnh nâng chén trà bên viên đan chưa thử; một dòng kiểm chứng sẽ làm màn khói tan ngay.', en: 'The Proofless Elixir Shade raises tea beside an untested pill; one validation line will clear the smoke.' },
      { vi: 'Không có biên nhận kiểm chứng, Vô Chứng Đan Ảnh cứ ngỡ lò luyện thuộc về mình.', en: 'Without a validation receipt, the Proofless Elixir Shade starts to think the furnace is its own.' }
    ]
  }
};

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

    cards.push({
      problemId: p.problemId,
      role,
      priority: p.priority,
      archetype: p.meta.villain,
      tone,
      challenge,
      originSignals: [`metric:${p.meta.problemType}`, ...Object.values(context)],
      evidenceRefs: p.evidence.eventIds ?? [],
      confidence: p.confidence,
      rebuttal: p.meta.counterTechnique,
      microQuest: p.meta.microQuest,
      victory: p.meta.victory,
      cooldownWindows: DEFAULT_COOLDOWN_WINDOWS,
      safetyFlags: ['failure-mode-not-person', 'evidence-bound']
    });
  }
  return { villains: cards, suppressed: null };
}
