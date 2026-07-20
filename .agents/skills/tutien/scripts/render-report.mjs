// Phase 2 renderer. buildReportModel() turns analysis JSON into a
// language-neutral report model (facts only). renderMarkdown() turns that
// model into prose in the active language. The renderer NEVER changes a count
// from the analysis — it only selects wording. Villains are Phase 3 and are
// intentionally not rendered here.

import { scoreReport, DIMENSIONS } from './score.mjs';
import { detectProblems } from './catalog.mjs';
import { buildVillains } from './villains.mjs';
import { classifyProject, progressionMetrics, PROGRESSION } from './classify.mjs';
import { resolveTone, TUTIEN_EXPERIENCE } from './command.mjs';

// A context is sensitive (humor forced neutral) when unrecovered failures or
// conflicts are present, or when the caller passes an emergency signal
// (secret exposure, security finding, outage, data loss, user distress).
export function isSensitive(analysis, options = {}) {
  if (options.emergency) return true;
  const signals = options.signals ?? {};
  if (signals.secretExposure || signals.securityHighFinding || signals.outage || signals.dataLoss || signals.userDistress) return true;
  const issues = analysis.issues ?? {};
  const failures = issues.failures ?? [];
  const recoveries = issues.recoveries ?? [];
  const unrecovered = failures.some((f) => !recoveries.some((r) => r.issueEventId === f.eventId));
  return unrecovered || (analysis.conflicts ?? []).length > 0;
}

export function buildReportModel(analysis, options = {}) {
  const score = scoreReport(analysis);
  const rawProblems = detectProblems(analysis);
  const tokens = analysis.tokens ?? {};
  const coverage = analysis.coverage ?? {};

  // Optional cultivation classification from a project profile. One
  // fail-closed policy state governs the whole report: only `clear` enables
  // realm/score/villains/recommendations/positive progression. Everything
  // else (declared-stop, needs-review, authorization-required) suppresses
  // them at the DATA level — score/realm/dimensions become null, not hidden.
  let cultivation = null;
  let canGamify = true;
  if (options.profile) {
    const classification = classifyProject(options.profile);
    canGamify = classification.policy.canGamify;
    const progression = progressionMetrics(analysis, {
      prior: options.priorProgression ?? null,
      canGamify,
      salt: options.progressionSalt ?? ''
    });
    cultivation = { classification, progression };
  }
  const suppressed = !canGamify;

  const sensitive = isSensitive(analysis, options) || suppressed;
  const tone = resolveTone(options.tone, { sensitive });
  const { villains } = buildVillains(rawProblems, {
    tone,
    villains: options.villains ?? 'on',
    threshold: options.villainThreshold,
    emergency: sensitive,
    seedInputs: options.seedInputs,
    context: options.context,
    priorVillains: options.priorVillains
  });
  const villainByProblem = new Map(villains.map((v) => [v.problemId, v]));

  // Recommendations and antagonist framing are part of the game layer. A
  // non-clear policy keeps only neutral evidence/risks, so these are absent at
  // the data level rather than merely hidden by the renderer.
  const problems = suppressed ? [] : rawProblems;
  // One implementation-intention practice, specific to the top problem's
  // catalog entry — a conflict gets a conflict rule, not a retry rule.
  const ifThen = suppressed
    ? null
    : problems.length
    ? problems[0].meta.ifThen
    : {
        vi: 'Nếu bắt đầu một task mới, thì viết tiêu chí "done" trước khi sửa code.',
        en: 'If you start a new task, then write its done-criterion before editing code.'
      };

  const lesson = suppressed
    ? null
    : problems.length
    ? { skill: problems[0].meta.projectHelp, technique: problems[0].meta.counterTechnique }
    : { skill: 'backbone.yml validate', technique: { vi: 'Giữ vòng lặp: sửa nhỏ, chạy validation, xác nhận.', en: 'Keep the loop: small edit, run validation, confirm.' } };

  return {
    schemaVersion: 1,
    experience: { ...TUTIEN_EXPERIENCE },
    tone,
    villainsShown: villains.length,
    villainCards: villains,
    cultivation,
    policyState: cultivation?.classification.policy.state ?? 'clear',
    suppressGamification: suppressed,
    showScore: options.score === 'show' && !suppressed,
    coverage: {
      sessions: coverage.sessions ?? 0,
      userPrompts: coverage.userPrompts ?? 0,
      commits: coverage.commits ?? 0,
      window: coverage.window ?? { start: null, end: null },
      reportedTurnsPct: coverage.tokenCoverage?.reportedTurnsPct ?? 0,
      estimatedTurnsPct: coverage.tokenCoverage?.estimatedTurnsPct ?? 0,
      confidence: coverage.confidence ?? 'low'
    },
    tokens: {
      reportedTotal: tokens.reportedTotal ?? 0,
      estimatedTotal: tokens.estimatedTotal ?? 0,
      unknownTurns: tokens.unknownTurns ?? 0,
      dedupedStreamUpdates: tokens.dedupedStreamUpdates ?? 0
    },
    // Under a suppressed policy these are null (absent), not merely hidden.
    realm: suppressed ? null : score.realm,
    enoughEvidence: suppressed ? false : score.enoughEvidence,
    score: suppressed ? null : score.score,
    dimensions: suppressed ? [] : DIMENSIONS.map((d) => ({ key: d.key, weight: d.weight, value: score.dimensions[d.key] })),
    missing: suppressed ? [] : score.missing,
    problems: problems.map((p) => {
      const v = villainByProblem.get(p.problemId);
      return {
        problemType: p.meta.problemType,
        confidence: p.confidence,
        priority: p.priority,
        evidence: p.evidence,
        counterTechnique: p.meta.counterTechnique,
        projectHelp: p.meta.projectHelp,
        microQuest: p.meta.microQuest,
        victory: p.meta.victory,
        villain: v ? { name: v.archetype.name, gloss: v.archetype.gloss, role: v.role, tone: v.tone, challenge: v.challenge } : null
      };
    }),
    ifThen,
    lesson
  };
}

const L = {
  vi: {
    title: 'Tu Tiên Tĩnh Ký',
    neutralTitle: 'Bản Ghi Rà Soát Quy Trình',
    opening: {
      serene: 'Mây nhẹ qua sơn môn, một trang đạo ký lặng lẽ mở ra. Đây là cuộc dạo chơi phân loại nếp cộng tác: thở chậm, nhìn rõ, rồi chọn một bước vừa sức.',
      spirited: 'Chuông ngọc khẽ ngân nơi sơn môn; đạo ký mở sang trang mới. Ta cùng nhìn dấu vết công việc bằng một chút hóm hỉnh và một bước tiến thật rõ ràng.',
      neutral: 'Bản ghi này trình bày bằng giọng bình tĩnh, trực tiếp; phần diễn xướng tu tiên tạm dừng để ưu tiên an toàn và sự rõ ràng.'
    },
    thienCo: 'Thiên Cơ Trong Tầm Mắt',
    canhGioi: 'Cảnh Giới Bên Hiên Mây',
    linhThach: 'Linh Thạch Đã Tiêu',
    tamMa: 'Tâm Ma Trên Đạo Lộ',
    congPhap: 'Một Thức Cho Lần Đột Phá Tới',
    baiHoc: 'Công Pháp Mang Theo Hôm Nay',
    phuongPhap: 'Đạo Điển & Nguồn Số Liệu',
    closingTitle: 'Khép Lại Đạo Ký',
    closing: {
      clear: 'Đạo lộ hôm nay yên. Giữ nhịp nhỏ, kiểm chứng thật, rồi để lần tiến cảnh sau tự nhiên sáng hơn.',
      challenge: 'Một nút thắt đã lộ hình thì đã bớt đáng ngại. Chọn đúng một nhiệm vụ nhỏ ở trên, hoàn thành nó, rồi thong thả đi tiếp.',
      paused: 'Bản ghi dừng tại đây. Hãy xử lý bước review hoặc ủy quyền cần thiết trước; không có cảnh giới nào quan trọng hơn một ranh giới an toàn.'
    },
    sessions: 'phiên', prompts: 'prompt', commits: 'commit',
    sessionOne: 'phiên', promptOne: 'prompt', commitOne: 'commit', windowOne: 'kỳ báo cáo',
    window: 'Khoảng thời gian', confidence: 'Độ tin cậy',
    reported: 'nhà cung cấp báo cáo (chính xác)', estimated: 'ước lượng cục bộ', unknown: 'lượt không rõ',
    dedup: 'cập nhật streaming đã gộp',
    score: 'Điểm', evidence: 'Bằng chứng', counter: 'Cách hóa giải', quest: 'Nhiệm vụ nhỏ', victory: 'Điều kiện thắng',
    help: 'Trợ giúp sẵn có', ifthen: 'Nếu—thì', notEnough: 'Chưa đủ thiên cơ để tính cảnh giới',
    noProblems: 'Không phát hiện tâm ma nào vượt ngưỡng bằng chứng. Giữ vững đạo tâm.',
    method: 'Phân tích tất định phiên bản 1; số đếm là candidate có độ tin cậy; lore không đổi số liệu.',
    repeatEv: (n) => `${n} lần lặp/thử lại trong một task (candidate).`,
    conflictEv: (n) => `${n} cặp chỉ thị mâu thuẫn (candidate).`,
    unrecEv: (n) => `${n} thất bại chưa có lần pass tương ứng.`,
    proofEv: (n) => `${n} commit nhưng không có sự kiện kiểm chứng.`,
    daoSection: 'Đạo & Truyền Thừa',
    faction: 'Đạo', affiliation: 'Thân phận', pathsL: 'Đạo tu',
    affNote: 'Thân phận là vị thế tổ chức, không phải đạo đức — Tán Tu không phải mặt đối lập của Tà Tu.',
    tienCanh: 'Tiến cảnh',
    lifetime: 'tích lũy', windowsL: 'kỳ báo cáo',
    nghiepWarn: 'Nghiệp lực chưa hóa giải — ưu tiên xử lý các mục còn treo ở trên.',
    suppressedProgression: 'Chính sách đang tạm dừng: không cộng Tu Vi, Công Đức hay các chỉ số tích cực — chỉ còn Nghiệp Lực.',
    policyNotice: {
      'declared-stop': 'Tà Đạo không phải con đường tu luyện: không cảnh giới, không Tu Vi/Công Đức, không lore. Dừng lại và tìm review con người / ủy quyền hợp pháp.',
      'needs-review': 'Phát hiện dấu hiệu chủ đích gây hại: chưa gán đạo, tạm dừng gamification, cần review con người trước khi tiếp tục.',
      'authorization-required': 'Công việc Ma Đạo cần ủy quyền: ghi lại phạm vi engagement (authorization=<slug>) trước khi mở khóa cảnh giới và tiến cảnh.'
    },
    suppressedRealmNotice: {
      'declared-stop': 'Không tính cảnh giới cho Tà Đạo. Dừng lại và tìm review / ủy quyền.',
      'needs-review': 'Không tính cảnh giới: cần review con người cho dấu hiệu gây hại.',
      'authorization-required': 'Không tính cảnh giới: công việc Ma Đạo chưa có ủy quyền được ghi nhận.'
    },
    lineageIntro: 'Ba đường phân loại dưới đây chỉ nói về dự án và nếp làm việc; không phải nhãn dán cho con người.',
    progressionIntro: 'Tiến cảnh là chiếc gương nhỏ để quan sát thói quen, không phải thước đo giá trị của đạo hữu.',
    problemIntro: 'Mỗi tâm ma dưới đây chỉ là tên gọi vui cho một mẫu quy trình có bằng chứng — nhận diện để buông nhẹ, không phải để tự trách.'
  },
  en: {
    title: 'Quiet Cultivation Chronicle',
    neutralTitle: 'Coding Workflow Review',
    opening: {
      serene: 'Mist drifts past the mountain gate, and a quiet page of the Dao record opens. This is a mindful game of sorting collaboration patterns: breathe, observe, then choose one measured step.',
      spirited: 'A jade bell sounds softly at the mountain gate; the Dao record turns a fresh page. We will meet the evidence with light wit and leave with one clear step forward.',
      neutral: 'This record uses calm, direct language; cultivation theatrics are paused so safety and clarity come first.'
    },
    thienCo: 'Signs Beneath the Quiet Sky',
    canhGioi: 'Realm at the Mountain Gate',
    linhThach: 'Spirit Stones Spent (Tokens)',
    tamMa: 'Heart Demons Along the Dao Path',
    congPhap: 'One Technique for the Next Breakthrough',
    baiHoc: "Today's Practice to Carry Forward",
    phuongPhap: 'Dao Record & Evidence Sources',
    closingTitle: 'Closing the Dao Record',
    closing: {
      clear: 'The path is quiet today. Keep the steps small, keep the proof honest, and let the next breakthrough arrive in its own time.',
      challenge: 'A knot becomes lighter once it has a name. Choose one micro-quest above, complete it, then continue without haste.',
      paused: 'This record pauses here. Complete the required review or authorization first; no realm matters more than a sound safety boundary.'
    },
    sessions: 'sessions', prompts: 'prompts', commits: 'commits',
    sessionOne: 'session', promptOne: 'prompt', commitOne: 'commit', windowOne: 'reporting window',
    window: 'Window', confidence: 'Confidence',
    reported: 'provider-reported (exact)', estimated: 'locally estimated', unknown: 'unknown turns',
    dedup: 'streaming updates deduplicated',
    score: 'Score', evidence: 'Evidence', counter: 'Counter-technique', quest: 'Micro-quest', victory: 'Victory',
    help: 'Project help', ifthen: 'If—then', notEnough: 'Not enough evidence to compute a realm yet',
    noProblems: 'No heart demon crossed the evidence threshold. Hold your Dao heart.',
    method: 'Deterministic analysis v1; counts are confidence-scored candidates; lore never changes the numbers.',
    repeatEv: (n) => `${n} repeats/retries within one task (candidate).`,
    conflictEv: (n) => `${n} contradictory instruction pairs (candidate).`,
    unrecEv: (n) => `${n} failures without a matching later pass.`,
    proofEv: (n) => `${n} commits but no validation event.`,
    daoSection: 'Dao & Lineage',
    faction: 'Faction', affiliation: 'Affiliation', pathsL: 'Cultivation paths',
    affNote: 'Affiliation is organizational status, not ethics — Tán Tu is not the opposite of Tà Tu.',
    tienCanh: 'Progression',
    lifetime: 'lifetime', windowsL: 'reporting windows',
    nghiepWarn: 'Unresolved Nghiệp Lực — clear the open items above first.',
    suppressedProgression: 'Policy is withholding gains: no Tu Vi, Công Đức, or positive metrics — only Nghiệp Lực (risk) remains.',
    policyNotice: {
      'declared-stop': 'Tà Đạo is not a cultivation path: no realm, no Tu Vi/Công Đức, no lore. Stop and seek human review / lawful authorization.',
      'needs-review': 'Intent-to-harm signals detected: faction undetermined, gamification withheld, human review required before proceeding.',
      'authorization-required': 'Ma Đạo work requires authorization: record the engagement scope (authorization=<slug>) before any realm or progression is unlocked.'
    },
    suppressedRealmNotice: {
      'declared-stop': 'No realm is computed for Tà Đạo. Stop and seek review / authorization.',
      'needs-review': 'No realm computed: harmful-intent signals require human review.',
      'authorization-required': 'No realm computed: Ma Đạo work has no recorded authorization.'
    },
    lineageIntro: 'These three classifications describe the project and its working patterns; they are never labels for the person.',
    progressionIntro: 'Progression is a small mirror for observing habits, not a measure of anyone\'s worth.',
    problemIntro: 'Each heart demon below is a playful name for an evidence-backed workflow pattern—something to notice and release, never a reason for self-blame.'
  }
};

const pick = (obj, lang) => obj[lang] ?? obj.en ?? obj.vi;

function bar(value) {
  const filled = Math.round(value * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function realmName(realm, lang) {
  return lang === 'vi' ? realm.name : `${realm.name} — ${realm.gloss}`;
}

function classificationLines(classification, lang, t) {
  const c = classification;
  const out = [`## ${t.daoSection}`, t.lineageIntro];
  out.push(`- ${t.faction}: **${c.faction.name}** — ${pick(c.faction.gloss, lang)} (${t.confidence} ${c.faction.confidence})`);
  for (const line of pick(c.explanation, lang)) out.push(`  - ${line}`);
  if (c.policy.state !== 'clear') out.push(`  - ${t.policyNotice[c.policy.state]}`);
  out.push(`- ${t.affiliation}: **${c.affiliation.name}** — ${pick(c.affiliation.gloss, lang)} (${t.confidence} ${c.affiliation.confidence}; ${c.affiliation.rationale})`);
  out.push(`  - ${t.affNote}`);
  if (c.paths.length) {
    out.push(`- ${t.pathsL}: ${c.paths.map((p) => `**${p.name}** (${p.confidence})`).join(', ')}`);
    for (const p of c.paths) out.push(`  - ${p.name}: ${pick(p.gloss, lang)} — ${p.rationale}`);
  }
  // Knowledge recommendations only under a clear policy.
  const k = c.knowledge;
  if (k) {
    out.push(`- Tâm Pháp: ${pick(k.tamPhap, lang)}`);
    out.push(`- Công Pháp: ${pick(k.congPhap, lang)}`);
    out.push(`- Bí Thuật: ${pick(k.biThuat, lang)}`);
    out.push(`- Thần Thông: ${pick(k.thanThong, lang)}`);
    if (k.phapBao.length) out.push(`- Pháp Bảo: ${k.phapBao.map((s) => `\`${s}\``).join(', ')}`);
    out.push(`- Thuật Pháp: ${pick(k.thuatPhap, lang)}`);
    out.push(`- Bí Tịch / Đạo Điển: ${pick(k.daoDien, lang)}`);
  }
  return out;
}

function cultivationLines(cultivation, lang, t) {
  const out = classificationLines(cultivation.classification, lang, t);
  const pr = cultivation.progression;
  const gamified = cultivation.classification.policy.canGamify;
  out.push('', `## ${t.tienCanh}`, t.progressionIntro);
  if (gamified) {
    out.push(`- ${PROGRESSION.tuVi.name}: +${pr.tuVi.window} (${t.lifetime} ${pr.tuVi.lifetime}) — ${pick(PROGRESSION.tuVi.gloss, lang)}`);
    const windowUnit = pr.daoHanh.windows === 1 ? t.windowOne : t.windowsL;
    out.push(`- ${PROGRESSION.daoHanh.name}: ${pr.daoHanh.windows} ${windowUnit} — ${pick(PROGRESSION.daoHanh.gloss, lang)}`);
    out.push(`- ${PROGRESSION.ngoTinh.name} \`${bar(pr.ngoTinh)}\` ${Math.round(pr.ngoTinh * 100)}% — ${pick(PROGRESSION.ngoTinh.gloss, lang)}`);
    out.push(`- ${PROGRESSION.doThuanThuc.name} \`${bar(pr.doThuanThuc.overall)}\` ${Math.round(pr.doThuanThuc.overall * 100)}% — ${pick(pr.doThuanThuc.note, lang)}`);
    out.push(`- ${PROGRESSION.tamCanh.name} \`${bar(pr.tamCanh)}\` ${Math.round(pr.tamCanh * 100)}% — ${pick(PROGRESSION.tamCanh.gloss, lang)}`);
    out.push(`- ${PROGRESSION.congDuc.name}: +${pr.congDuc.window} (${t.lifetime} ${pr.congDuc.lifetime}) — ${pick(PROGRESSION.congDuc.gloss, lang)}`);
  } else {
    // Suppressed policy: only Nghiệp Lực (risk) survives; no positive gains.
    out.push(`- ${t.suppressedProgression}`);
  }
  out.push(`- ${PROGRESSION.nghiepLuc.name}: ${pr.nghiepLuc.window} (${t.lifetime} ${pr.nghiepLuc.lifetime}) — ${pick(PROGRESSION.nghiepLuc.gloss, lang)}`);
  if (pr.nghiepLuc.window > 0) out.push(`  - ${t.nghiepWarn}`);
  return out;
}

// Standalone classification markdown for the `classify` runner action (no
// history analysis involved — profile only).
export function renderClassificationMarkdown(classification, language = 'en') {
  const lang = L[language] ? language : 'en';
  return classificationLines(classification, lang, L[lang]).join('\n');
}

function problemEvidenceLine(p, t) {
  const e = p.evidence;
  switch (p.problemType) {
    case 'repeated-failure':
    case 'too-many-prompts': return t.repeatEv(e.repeatCount);
    case 'conflicting-instructions': return t.conflictEv(e.count);
    case 'unrecovered-failure': return t.unrecEv(e.count);
    case 'work-without-proof': return t.proofEv(e.commits);
    default: return '';
  }
}

export function renderMarkdown(model, language = 'en') {
  const lang = L[language] ? language : 'en';
  const t = L[lang];
  const cov = model.coverage;
  const tok = model.tokens;
  const out = [];

  const title = model.suppressGamification ? t.neutralTitle : t.title;
  out.push(`# ${title}`, '', `> ${t.opening[model.tone] ?? t.opening.serene}`, '');

  out.push(`## ${t.thienCo}`);
  const sessionUnit = cov.sessions === 1 ? t.sessionOne : t.sessions;
  const promptUnit = cov.userPrompts === 1 ? t.promptOne : t.prompts;
  const commitUnit = cov.commits === 1 ? t.commitOne : t.commits;
  out.push(`- ${cov.sessions} ${sessionUnit} / ${cov.userPrompts} ${promptUnit} / ${cov.commits} ${commitUnit}`);
  out.push(`- ${t.window}: ${cov.window.start ?? '—'} … ${cov.window.end ?? '—'}`);
  out.push(`- ${t.reported}: ${Math.round(cov.reportedTurnsPct * 100)}% · ${t.estimated}: ${Math.round(cov.estimatedTurnsPct * 100)}%`);
  out.push(`- ${t.confidence}: ${cov.confidence}`, '');

  out.push(`## ${t.canhGioi}`);
  if (model.suppressGamification) {
    out.push(t.suppressedRealmNotice[model.policyState] ?? t.suppressedRealmNotice['declared-stop']);
  } else if (!model.enoughEvidence) {
    out.push(`**${realmName(model.realm, lang)}** — ${t.notEnough}.`);
    for (const m of model.missing) out.push(`- ${m}`);
  } else {
    out.push(`**${realmName(model.realm, lang)}**${model.showScore ? ` · ${t.score}: ${model.score}/100` : ''}`);
    for (const d of model.dimensions) {
      out.push(`- ${d.key} \`${bar(d.value)}\` ${Math.round(d.value * 100)}% (${Math.round(d.weight * 100)}%)`);
    }
  }
  out.push('');

  if (model.cultivation) {
    out.push(...cultivationLines(model.cultivation, lang, t), '');
  }

  out.push(`## ${t.linhThach}`);
  out.push(`- ${t.reported}: ${tok.reportedTotal}`);
  out.push(`- ${t.estimated}: ${tok.estimatedTotal}`);
  out.push(`- ${t.unknown}: ${tok.unknownTurns}`);
  if (tok.dedupedStreamUpdates > 0) out.push(`- ${t.dedup}: ${tok.dedupedStreamUpdates}`);
  out.push('');

  if (!model.suppressGamification) {
    out.push(`## ${t.tamMa}`, t.problemIntro);
    if (model.problems.length === 0) {
      out.push(t.noProblems);
    } else {
      for (const p of model.problems) {
        if (p.villain) {
          const label = lang === 'vi' ? p.villain.name : `${p.villain.name} — ${p.villain.gloss}`;
          out.push(`### ${label} (${p.villain.role}, ${t.confidence} ${p.confidence})`);
          out.push(`> ${pick(p.villain.challenge, lang)}`);
        } else {
          out.push(`### ${p.problemType} (${t.confidence} ${p.confidence})`);
        }
        // A challenge is always immediately followed by evidence + counter + victory.
        out.push(`- ${t.evidence}: ${problemEvidenceLine(p, t)}`);
        out.push(`- ${t.counter}: ${pick(p.counterTechnique, lang)}`);
        out.push(`- ${t.help}: \`${p.projectHelp}\``);
        out.push(`- ${t.quest}: ${pick(p.microQuest, lang)}`);
        out.push(`- ${t.victory}: ${pick(p.victory, lang)}`);
      }
    }
    out.push('');

    out.push(`## ${t.congPhap}`);
    out.push(`- **${t.ifthen}:** ${pick(model.ifThen, lang)}`, '');

    out.push(`## ${t.baiHoc}`);
    out.push(`- \`${model.lesson.skill}\` — ${pick(model.lesson.technique, lang)}`, '');
  }

  out.push(`## ${t.phuongPhap}`);
  out.push(`- ${t.method}`, '');

  out.push(`## ${t.closingTitle}`);
  const closingKey = model.suppressGamification ? 'paused' : (model.problems.length ? 'challenge' : 'clear');
  out.push(t.closing[closingKey]);

  return out.join('\n');
}

export function renderReport(analysis, options = {}) {
  const model = buildReportModel(analysis, options);
  const language = resolveLanguage(options.language, options);
  return { model, language, markdown: renderMarkdown(model, language) };
}

// language=auto -> detect from the invocation text; explicit code overrides;
// fallback to conversation language then English. V1 templates: vi, en.
export function resolveLanguage(requested, { invocationText = '', conversationLanguage = 'en' } = {}) {
  if (requested && requested !== 'auto') return L[requested] ? requested : 'en';
  if (/[À-ỹ]/.test(invocationText) || /\b(hãy|giúp|của|và|không)\b/i.test(invocationText)) return 'vi';
  return L[conversationLanguage] ? conversationLanguage : 'en';
}
