// Problem-to-practice catalog. Data-driven so new problem types can be added
// without touching the analyzer. Each entry carries an existing project skill
// or convention as the concrete counter-technique, plus a villain archetype
// that the Phase 3 engine may (optionally) surface. Detection is evidence-
// bound: a problem needs real event references and a confidence, never a
// single ambiguous signal.

export const CATALOG = {
  'repeated-failure': {
    problemType: 'repeated-failure',
    counterTechnique: { vi: 'Dừng sau lần thất bại thứ hai giống nhau; lập giả thuyết mới trước khi thử lại.', en: 'Stop after the second identical failure; form a new hypothesis before retrying.' },
    projectHelp: 'sequential-thinking',
    microQuest: { vi: 'Lần lặp kế tiếp: viết một giả thuyết mới trước khi chạy lại.', en: 'Next iteration: write one new hypothesis before re-running.' },
    victory: { vi: 'Một nhiệm vụ khép lại mà không có ba lần thử giống nhau.', en: 'A task closes without three identical retries.' },
    ifThen: { vi: 'Nếu cùng một lệnh thất bại hai lần, thì dừng thử lại và viết một giả thuyết mới.', en: 'If the same command fails twice, then stop retrying and write a new hypothesis.' },
    villain: { name: 'Luân Hồi Ma Ảnh', gloss: 'Error-Cycle Wraith' }
  },
  'too-many-prompts': {
    problemType: 'too-many-prompts',
    counterTechnique: { vi: 'Chia nhiệm vụ thành các chặng kiểm chứng; mỗi chặng có một kết quả rõ ràng.', en: 'Split the task into checkpoints with a validation result at each boundary.' },
    projectHelp: 'clearthought',
    microQuest: { vi: 'Nhiệm vụ tới: xác định hai chặng kiểm chứng có tiêu chí hoàn thành.', en: 'Next task: define 2 checkpoints each with a done-criterion.' },
    victory: { vi: 'Nhiệm vụ hoàn thành với số lượt yêu cầu thấp hơn ngưỡng lịch sử.', en: 'A task completes under the historical prompt threshold.' },
    ifThen: { vi: 'Nếu gửi lượt yêu cầu thứ ba cho cùng một nhiệm vụ, hãy đặt một chặng kiểm chứng có tiêu chí hoàn thành trước.', en: 'If you send a third prompt on one task, then define a checkpoint with a done-criterion first.' },
    villain: { name: 'Cửu Hoàn Tâm Ma', gloss: 'Ninefold Loop Heart-Shadow' }
  },
  'conflicting-instructions': {
    problemType: 'conflicting-instructions',
    counterTechnique: { vi: 'Lập sổ ưu tiên và ràng buộc; nêu rõ chỉ thị nào thay thế chỉ thị nào.', en: 'Build a precedence and constraint ledger; state which instruction supersedes which.' },
    projectHelp: 'claim',
    microQuest: { vi: 'Trước khi sửa: ghi một dòng nêu rõ điều được phép và điều không được phép.', en: 'Before editing: write one allowed/forbidden line.' },
    victory: { vi: 'Không còn cặp chỉ thị mâu thuẫn chưa giải quyết trong một nhiệm vụ.', en: 'No unresolved contradictory instruction pair remains in a task.' },
    ifThen: { vi: 'Nếu chỉ thị mới mâu thuẫn với chỉ thị trước, thì nêu rõ chỉ thị nào thắng trước khi sửa.', en: 'If a new instruction contradicts an earlier one, then state which one wins before editing.' },
    villain: { name: 'Nghịch Lệnh Ma Quân', gloss: 'Lord of Clashing Edicts' }
  },
  'unrecovered-failure': {
    problemType: 'unrecovered-failure',
    counterTechnique: { vi: 'Thêm cổng hoàn thành: chạy kiểm chứng và đính kèm kết quả.', en: 'Add a completion gate: run validation and attach a result receipt.' },
    projectHelp: 'backbone.yml validate',
    microQuest: { vi: 'Với mỗi lỗi còn treo: chạy lại đúng kiểm tra đó tới khi đạt.', en: 'For each open failure: re-run that exact check until it passes.' },
    victory: { vi: 'Mỗi thất bại có một lần kiểm chứng đạt tương ứng về sau.', en: 'Every failure has a later matching pass.' },
    ifThen: { vi: 'Nếu một kiểm tra thất bại, hãy chạy lại đúng kiểm tra đó tới khi đạt trước khi làm việc mới.', en: 'If a check fails, then re-run that exact check until it passes before starting new work.' },
    villain: { name: 'Vô Nghiệm Ảnh Quân', gloss: 'Unverified Trial Wraith' }
  },
  'work-without-proof': {
    problemType: 'work-without-proof',
    counterTechnique: { vi: 'Chạy lệnh kiểm chứng của kho mã và gắn kết quả trước khi tuyên bố hoàn thành.', en: 'Run the repository validation and attach the result before declaring done.' },
    projectHelp: 'backbone.yml validate',
    microQuest: { vi: 'Bản ghi Git tiếp theo: kèm một dòng kết quả kiểm chứng.', en: 'Next commit: include one validation-result line.' },
    victory: { vi: 'Mỗi vùng công việc có ít nhất một sự kiện kiểm chứng.', en: 'Every work window has at least one validation event.' },
    ifThen: { vi: 'Nếu sắp tuyên bố hoàn thành, hãy chạy lệnh kiểm chứng của kho mã và đính kèm kết quả trước.', en: "If you are about to say 'done', then run the repo validation and attach the result first." },
    villain: { name: 'Vô Chứng Đan Ảnh', gloss: 'Proofless Elixir Shade' }
  }
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round3 = (x) => Math.round(x * 1000) / 1000;

// Returns ranked, actionable problems. priority = impact × recurrence ×
// confidence × fixability. Only problems with confidence >= minConfidence and
// priority >= minPriority survive; at most `top` are returned.
export function detectProblems(analysis, { minConfidence = 0.5, minPriority = 0.12, top = 3 } = {}) {
  const found = [];
  const rep = analysis.repetition ?? {};
  const issues = analysis.issues ?? {};
  const failures = issues.failures ?? [];
  const recoveries = issues.recoveries ?? [];

  for (const loop of rep.retryLoopCandidates ?? []) {
    // Only failures attributed to this loop's own task make it a failure loop;
    // an unrelated failure elsewhere must not change the classification.
    const isFailing = failures.some((f) => f.taskId != null && f.taskId === loop.taskId);
    const id = isFailing ? 'repeated-failure' : 'too-many-prompts';
    found.push({
      problemId: id,
      evidence: { taskId: loop.taskId, repeatCount: loop.count, eventIds: loop.eventIds },
      confidence: loop.confidence,
      impact: isFailing ? 0.7 : 0.5,
      recurrence: clamp01(loop.count / 4),
      fixability: 0.8
    });
  }

  const conflicts = analysis.conflicts ?? [];
  if (conflicts.length > 0) {
    found.push({
      problemId: 'conflicting-instructions',
      evidence: { count: conflicts.length, eventIds: conflicts.flatMap((c) => c.eventIds) },
      confidence: Math.max(...conflicts.map((c) => c.confidence)),
      impact: 0.7,
      recurrence: clamp01(conflicts.length / 2),
      fixability: 0.7
    });
  }

  const unrecovered = failures.filter((f) => !recoveries.some((r) => r.issueEventId === f.eventId));
  if (unrecovered.length > 0) {
    found.push({
      problemId: 'unrecovered-failure',
      evidence: { count: unrecovered.length, eventIds: unrecovered.map((f) => f.eventId) },
      confidence: 0.7,
      impact: 0.8,
      recurrence: clamp01(unrecovered.length / 3),
      fixability: 0.6
    });
  }

  const commits = analysis.coverage?.commits ?? 0;
  const validationEvents = (issues.passes ?? 0) + failures.length;
  if (commits > 0 && validationEvents === 0) {
    found.push({
      problemId: 'work-without-proof',
      evidence: { commits, validationEvents: 0 },
      confidence: 0.6,
      impact: 0.6,
      recurrence: clamp01(commits / 5),
      fixability: 0.7
    });
  }

  return found
    .map((p) => {
      const meta = CATALOG[p.problemId];
      const priority = round3(p.impact * p.recurrence * p.confidence * p.fixability);
      return { ...p, priority, confidence: round3(p.confidence), meta };
    })
    .filter((p) => p.confidence >= minConfidence && p.priority >= minPriority)
    .sort((a, b) => b.priority - a.priority || a.problemId.localeCompare(b.problemId))
    .slice(0, top);
}
