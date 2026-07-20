// Tu Tiên project-classification and progression system. Three orthogonal
// axes plus a knowledge taxonomy and seven progression metrics:
//   - Dao faction  = the PROJECT's ethical/risk posture;
//   - affiliation  = the cultivator's ORGANIZATIONAL mode (never ethics:
//                    Tán Tu is independence, not the opposite of Tà Tu);
//   - paths        = the project's TECHNICAL nature (multi-select).
//
// One fail-closed POLICY STATE governs the whole report. Only `clear` may
// enable lore, villains, recommendations, score, realm, and positive
// progression:
//   - declared-stop        : user declared Tà Đạo / Tà Tu — a stop signal;
//   - needs-review         : intent-to-harm signals — no Dao assignment,
//                            no gamification, ask for human review;
//   - authorization-required : Ma Đạo without a valid authorization slug;
//   - clear                : lawful constructive work.
// The engine NEVER auto-assigns Tà Đạo / Tà Tu (intent to harm cannot be
// judged lexically; difficulty is not evil), and never labels harmful text
// "righteous" — harm produces an undetermined faction and needs-review.

import crypto from 'node:crypto';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round3 = (x) => Math.round(x * 1000) / 1000;
const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

export const FACTIONS = {
  'chinh-dao': { name: 'Chính Đạo', gloss: { vi: 'chính phái — hợp pháp, minh bạch, tạo giá trị cho người dùng', en: 'Righteous Dao — lawful, transparent, constructive, user-beneficial' }, rank: 'normal' },
  'bang-mon': { name: 'Bàng Môn / Kỳ Đạo', gloss: { vi: 'phi truyền thống — thử nghiệm, sáng tạo, chuyên biệt, không gây hại', en: 'Heterodox Dao — unconventional, experimental, creative, specialized; not harmful' }, rank: 'normal' },
  'ma-dao': { name: 'Ma Đạo', gloss: { vi: 'kỹ thuật rủi ro cao / đối kháng — cần ủy quyền và giám sát rõ ràng', en: 'Demonic Dao — high-risk, adversarial, restricted technical work requiring explicit authorization and oversight' }, rank: 'restricted' },
  'ta-dao': { name: 'Tà Đạo', gloss: { vi: 'cố ý gây hại, bóc lột, phi pháp — không bao giờ là con đường tu luyện', en: 'Evil Dao — intentionally harmful, exploitative, unlawful — never a progression path' }, rank: 'forbidden' }
};
// Not a real faction — the result of refusing to classify harmful intent.
const UNDETERMINED_FACTION = { id: 'undetermined', name: 'Chưa phân định', gloss: { vi: 'chưa gán đạo — cần review con người', en: 'undetermined — needs human review' }, rank: 'review' };

export const AFFILIATIONS = {
  'tong-mon': { name: 'Tông Môn Đệ Tử', gloss: { vi: 'làm việc trong đội nhóm / tổ chức / quy trình có sẵn', en: 'works within a team, organization, or established process' } },
  'tan-tu': { name: 'Tán Tu', gloss: { vi: 'tu luyện độc lập, không thuộc tổ chức cố định', en: 'works independently, outside a fixed organization or tradition' } },
  'khach-khanh': { name: 'Khách Khanh', gloss: { vi: 'chuyên gia bên ngoài / cộng tác tạm thời', en: 'external expert or temporary contributor' } },
  'an-tu': { name: 'Ẩn Tu', gloss: { vi: 'nghiên cứu riêng tư, dài hạn, chuyên sâu', en: 'private, long-term, deeply focused research' } }
};

export const PATHS = {
  kiem: { name: 'Kiếm Tu', gloss: { vi: 'triển khai phần mềm trực tiếp, giải quyết vấn đề nhanh', en: 'direct implementation and fast problem-solving' } },
  tran: { name: 'Trận Tu', gloss: { vi: 'kiến trúc, DevOps, hạ tầng, mạng, điều phối hệ thống', en: 'architecture, DevOps, infrastructure, networking, orchestration' } },
  phu: { name: 'Phù Tu', gloss: { vi: 'prompt, script, tự động hóa, workflow lặp lại được', en: 'prompts, scripts, automation, repeatable workflows' } },
  khi: { name: 'Khí Tu', gloss: { vi: 'công cụ, thư viện, thành phần tái sử dụng, nền tảng', en: 'tools, libraries, reusable components, platform engineering' } },
  dan: { name: 'Đan Tu', gloss: { vi: 'xử lý dữ liệu, tối ưu, biến đổi, tổng hợp tài nguyên', en: 'data processing, optimization, transformation, resource synthesis' } },
  y: { name: 'Y Tu', gloss: { vi: 'debug, bảo trì, khắc phục sự cố, hỗ trợ kỹ thuật', en: 'debugging, maintenance, incident recovery, support' } },
  huyen: { name: 'Huyễn Tu', gloss: { vi: 'UI/UX, animation, thiết kế, 3D, giao diện sáng tạo', en: 'UI/UX, animation, visual design, 3D, creative interfaces' } },
  'ngu-thu': { name: 'Ngự Thú Tu', gloss: { vi: 'điều phối AI agent, bot, đa mô hình', en: 'AI-agent, bot, or multi-model orchestration' } },
  'huyen-co': { name: 'Huyền Cơ Tu', gloss: { vi: 'mật mã, thuật toán khó, bài toán phân tích hóc búa', en: 'cryptography, advanced algorithms, hard analytical problems' } },
  anh: { name: 'Ảnh Tu', gloss: { vi: 'an ninh mạng có ủy quyền, forensics, điều tra, OSINT, dịch ngược', en: 'authorized cybersecurity, forensics, investigation, OSINT, reverse engineering' } },
  ta: { name: 'Tà Tu', gloss: { vi: 'phương pháp cố ý gây hại — không bao giờ gán chỉ vì dự án khó hay thuộc mảng bảo mật', en: 'intentionally harmful methods — never assigned merely because work is difficult or security-related' } }
};

export const KNOWLEDGE_KINDS = {
  'tam-phap': { name: 'Tâm Pháp', gloss: { vi: 'nguyên tắc tư duy cốt lõi', en: 'core reasoning principles and mindset' } },
  'cong-phap': { name: 'Công Pháp', gloss: { vi: 'chiến lược làm việc lặp lại được, dài hạn', en: 'repeatable strategies and long-term working methods' } },
  'thuat-phap': { name: 'Thuật Pháp', gloss: { vi: 'kỹ thuật / mẫu prompt đơn lẻ', en: 'individual prompt patterns or techniques' } },
  'bi-thuat': { name: 'Bí Thuật', gloss: { vi: 'kỹ thuật hiếm, chuyên sâu', en: 'rare, specialized, advanced techniques' } },
  'than-thong': { name: 'Thần Thông', gloss: { vi: 'năng lực đã thuần thục, tái sử dụng tin cậy', en: 'highly mastered, reliably reusable abilities' } },
  'phap-bao': { name: 'Pháp Bảo', gloss: { vi: 'công cụ, script, template, agent hỗ trợ (skill & command của kit)', en: 'tools, scripts, templates, agents (kit skills & commands)' } },
  'dao-dien': { name: 'Bí Tịch / Đạo Điển', gloss: { vi: 'playbook, skill file, tài liệu tích lũy', en: 'written playbooks, skill files, accumulated documentation' } }
};

// Word/phrase-boundary matcher: boundaries are non-alphanumeric, so "ui" does
// not match inside "build" and "api" does not match inside "rapid".
function hasKeyword(text, kw) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text);
}

const PATH_KEYWORDS = {
  kiem: ['implementation', 'feature', 'application', 'app', 'api', 'backend', 'frontend', 'cli', 'bugfix', 'coding'],
  tran: ['architecture', 'devops', 'infrastructure', 'kubernetes', 'docker', 'network', 'deploy', 'orchestration', 'ci/cd', 'terraform'],
  phu: ['prompt', 'prompts', 'script', 'scripts', 'automation', 'workflow', 'skill file', 'slash command'],
  khi: ['library', 'sdk', 'framework', 'platform', 'component', 'toolkit', 'kit', 'reusable'],
  dan: ['data', 'etl', 'pipeline', 'optimization', 'transformation', 'database', 'analytics'],
  y: ['debug', 'maintenance', 'incident', 'support', 'recovery', 'hotfix', 'triage'],
  huyen: ['ui', 'ux', 'design', 'animation', '3d', 'visual', 'interface', 'creative'],
  'ngu-thu': ['agent', 'bot', 'llm', 'multi-model', 'mcp', 'ai orchestration', 'assistant'],
  'huyen-co': ['cryptography', 'cipher', 'algorithm', 'decryption', 'mathematical', 'proof'],
  anh: ['security', 'pentest', 'forensics', 'osint', 'reverse engineering', 'vulnerability', 'ctf', 'audit', 'incident response', 'threat']
};

const BANG_MON_KEYWORDS = ['experimental', 'prototype', 'research', 'creative', 'art project', 'demo', 'playground', 'unconventional', 'exploratory'];
const ADVERSARIAL_KEYWORDS = ['pentest', 'red team', 'offensive security', 'exploit development', 'attack simulation', 'adversarial engagement', 'malware analysis'];
// Intent-to-harm-others signals. These route to needs-review (undetermined
// faction), NOT to an automatic Tà label. Curated to avoid dual-use overlap
// with authorized security work.
const HARM_KEYWORDS = [
  'steal', 'exfiltrate', 'malware', 'ransomware', 'phishing', 'spyware', 'keylogger', 'botnet',
  'defraud', 'fraud', 'scam', 'sabotage', 'backdoor', 'ddos', 'without consent', 'without authorization',
  'without permission', 'illegal', 'illegally', 'unlawful', 'harm competitor', 'harm competitors',
  'harm user', 'harm users', 'harm others', 'attack a bank', 'attack users', 'attack a company'
];

// Authorization is a user-ASSERTED reference only, never verified. Accept a
// bounded safe slug; reject secret-shaped values, markup, URLs, and anything
// with '=' (which a `key=value` secret would carry).
const AUTH_SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
export function validateAuthorization(value) {
  if (value == null) return { recorded: false, reference: null, rejected: false };
  if (typeof value === 'string' && AUTH_SLUG.test(value)) return { recorded: true, reference: value, rejected: false };
  return { recorded: false, reference: null, rejected: true };
}

const textOf = (profile) =>
  [profile.description ?? '', ...(profile.domains ?? []), profile.projectType ?? '', profile.primaryLanguage ?? '']
    .join(' ')
    .toLowerCase();

export function validateDeclarations(declared = {}) {
  const errors = [];
  if (declared.faction && !FACTIONS[declared.faction]) errors.push(`unknown faction "${declared.faction}"; valid: ${Object.keys(FACTIONS).join(', ')}`);
  if (declared.affiliation && !AFFILIATIONS[declared.affiliation]) errors.push(`unknown affiliation "${declared.affiliation}"; valid: ${Object.keys(AFFILIATIONS).join(', ')}`);
  const paths = declared.paths ?? [];
  for (const p of paths) {
    if (!PATHS[p]) errors.push(`unknown path "${p}"; valid: ${Object.keys(PATHS).join(', ')}`);
  }
  // Tà Tu is an exclusive stop declaration; it must not be combined with real
  // cultivation paths (fail closed rather than mixing lore with a stop state).
  if (paths.includes('ta') && paths.length > 1) errors.push('path "ta" (Tà Tu) is an exclusive stop declaration and cannot be combined with other paths');
  return errors;
}

export function classifyProject(profile = {}) {
  const errors = validateDeclarations(profile.declared ?? {});
  if (errors.length) throw new Error(errors.join('; '));
  const declared = profile.declared ?? {};
  const text = textOf(profile);
  const harmSignals = HARM_KEYWORDS.filter((k) => hasKeyword(text, k));
  const declaredStop = declared.faction === 'ta-dao' || (declared.paths ?? []).includes('ta');

  // --- paths (multi-select), declared first (order preserved) ---
  const paths = [];
  for (const id of declared.paths ?? []) paths.push({ id, ...PATHS[id], confidence: 0.95, rationale: 'declared by the user', declared: true });
  for (const [id, keywords] of Object.entries(PATH_KEYWORDS)) {
    if (paths.some((p) => p.id === id)) continue;
    const hits = keywords.filter((k) => hasKeyword(text, k));
    if (hits.length) paths.push({ id, ...PATHS[id], confidence: clamp01(0.5 + hits.length * 0.15), rationale: `profile keywords: ${hits.join(', ')}`, declared: false, hitCount: hits.length });
  }
  const declaredPaths = paths.filter((p) => p.declared);
  const detectedPaths = paths.filter((p) => !p.declared).sort((a, b) => b.confidence - a.confidence || b.hitCount - a.hitCount || a.id.localeCompare(b.id));
  const orderedPaths = [...declaredPaths, ...detectedPaths];

  // --- faction (precedence: declared-stop → harm → declared → detected) ---
  let faction;
  if (declaredStop) {
    faction = { id: 'ta-dao', ...FACTIONS['ta-dao'], confidence: 0.95, rationale: 'declared by the user' };
  } else if (harmSignals.length) {
    faction = { id: 'undetermined', ...UNDETERMINED_FACTION, confidence: 0.9, rationale: `intent-to-harm signals: ${harmSignals.join(', ')}` };
  } else if (declared.faction) {
    faction = { id: declared.faction, ...FACTIONS[declared.faction], confidence: 0.95, rationale: 'declared by the user' };
  } else {
    const adversarial = ADVERSARIAL_KEYWORDS.filter((k) => hasKeyword(text, k));
    const bangMon = BANG_MON_KEYWORDS.filter((k) => hasKeyword(text, k));
    if (adversarial.length) faction = { id: 'ma-dao', ...FACTIONS['ma-dao'], confidence: clamp01(0.6 + adversarial.length * 0.1), rationale: `adversarial engagement signals: ${adversarial.join(', ')}` };
    else if (bangMon.length) faction = { id: 'bang-mon', ...FACTIONS['bang-mon'], confidence: clamp01(0.55 + bangMon.length * 0.1), rationale: `experimental/creative signals: ${bangMon.join(', ')}` };
    else faction = { id: 'chinh-dao', ...FACTIONS['chinh-dao'], confidence: 0.6, rationale: 'default for lawful constructive work; no adversarial or experimental signals' };
  }

  if (faction.id === 'ma-dao') faction.authorization = validateAuthorization(profile.authorization);

  // --- output policy: single fail-closed projection ---
  let policyState;
  if (declaredStop) policyState = 'declared-stop';
  else if (faction.id === 'undetermined') policyState = 'needs-review';
  else if (faction.id === 'ma-dao' && !faction.authorization.recorded) policyState = 'authorization-required';
  else policyState = 'clear';
  const policy = { state: policyState, canGamify: policyState === 'clear', canRecommend: policyState === 'clear' };

  // --- affiliation (organizational only — independent of ethics) ---
  let affiliation;
  if (declared.affiliation) affiliation = { id: declared.affiliation, ...AFFILIATIONS[declared.affiliation], confidence: 0.95, rationale: 'declared by the user' };
  else if (Number.isFinite(profile.authorsCount) && profile.authorsCount > 1) affiliation = { id: 'tong-mon', ...AFFILIATIONS['tong-mon'], confidence: 0.55, rationale: `${profile.authorsCount} distinct commit-author identifiers (low-confidence hint; declare affiliation= to confirm)` };
  else if (profile.authorsCount === 1) affiliation = { id: 'tan-tu', ...AFFILIATIONS['tan-tu'], confidence: 0.5, rationale: 'single commit-author identifier (low-confidence hint)' };
  else affiliation = { id: 'tan-tu', ...AFFILIATIONS['tan-tu'], confidence: 0.4, rationale: 'no author evidence; defaulting — declare affiliation= to correct' };

  // --- knowledge: primary = first declared path, else strongest detected ---
  const primaryPath = declaredPaths[0]?.id ?? detectedPaths[0]?.id ?? 'kiem';
  const knowledge = policy.canRecommend ? knowledgeFor(primaryPath) : null;

  const dualUse = orderedPaths.some((p) => p.id === 'anh' || p.id === 'huyen-co');
  const explanation = buildExplanation(faction, policy, dualUse);

  return { faction, policy, affiliation, paths: orderedPaths, primaryPath, knowledge, explanation, dualUse, harmSignals, suppressGamification: !policy.canGamify };
}

const PATH_KNOWLEDGE = {
  kiem: { tamPhap: { vi: 'Thay đổi nhỏ nhất mà đúng; kiểm chứng sau mỗi lần sửa.', en: 'Smallest correct change; validate after every edit.' }, congPhap: { vi: 'Vòng lặp checkpoint: sửa nhỏ → validation → xác nhận rồi mới đi tiếp.', en: 'Checkpoint loop: small edit → validation → confirm before moving on.' }, biThuat: { vi: 'Tách refactor lớn thành chuỗi diff nhỏ có thể đảo ngược.', en: 'Decompose a large refactor into a chain of small reversible diffs.' }, thanThong: { vi: 'Đọc-hiểu codebase lạ và định vị điểm sửa đúng ngay lần đầu.', en: 'Read an unfamiliar codebase and locate the right edit on the first pass.' }, phapBao: ['prompt-sharpener', 'sequential-thinking'] },
  tran: { tamPhap: { vi: 'Vẽ ranh giới và hợp đồng giữa các thành phần trước khi nối chúng.', en: 'Draw component boundaries and contracts before wiring them.' }, congPhap: { vi: 'Mọi thay đổi hạ tầng đều có đường lùi được diễn tập.', en: 'Every infrastructure change ships with a rehearsed rollback.' }, biThuat: { vi: 'Mô phỏng sự cố có kiểm soát trước khi sự cố thật xảy ra.', en: 'Controlled failure rehearsal before the real incident.' }, thanThong: { vi: 'Thiết kế hệ thống chịu lỗi mà không giấu đi độ bất định.', en: 'Design fault-tolerant systems without hiding uncertainty.' }, phapBao: ['clearthought', 'path-sensitive-shell-safety'] },
  phu: { tamPhap: { vi: 'Một quy trình lặp lại được đáng giá hơn mười lần làm tay.', en: 'One repeatable workflow beats ten manual runs.' }, congPhap: { vi: 'Chuẩn hóa prompt thành skill có tiêu chí done rõ ràng.', en: 'Formalize prompts into skills with explicit done-criteria.' }, biThuat: { vi: 'Guardrail tự kiểm: workflow tự phát hiện khi chính nó sai.', en: 'Self-checking guardrails: the workflow detects its own failure.' }, thanThong: { vi: 'Biến một việc thủ công lặp lại thành lệnh chạy một phát tin cậy.', en: 'Turn a repeated manual chore into a reliable one-shot command.' }, phapBao: ['prompt-sharpener', 'claim'] },
  khi: { tamPhap: { vi: 'API là lời hứa; đặt tên và hành vi phải giữ được lời.', en: 'An API is a promise; naming and behavior must keep it.' }, congPhap: { vi: 'Registry trung tâm + kiểm parity để bản phân phối không trôi.', en: 'Central registry + parity checks so distribution never drifts.' }, biThuat: { vi: 'Fixture âm bản: cố tình làm hỏng để chứng minh validator bắt được.', en: 'Negative fixtures: break it on purpose to prove the validator catches it.' }, thanThong: { vi: 'Thiết kế thành phần tái sử dụng mà người khác dùng đúng ngay.', en: 'Design reusable components others use correctly on the first try.' }, phapBao: ['claim', 'daily-workflow-curator'] },
  dan: { tamPhap: { vi: 'Số liệu tách bạch theo nguồn gốc: đo được, ước lượng, không rõ.', en: 'Numbers stay split by provenance: measured, estimated, unknown.' }, congPhap: { vi: 'Baseline trước, biến đổi sau, so sánh có log.', en: 'Baseline first, transform second, logged comparison always.' }, biThuat: { vi: 'Thiết kế pipeline chạy lại được từ bất kỳ điểm gãy nào.', en: 'Pipelines resumable from any break point.' }, thanThong: { vi: 'Chuyển dữ liệu thô hỗn độn thành dạng đáng tin, đo được.', en: 'Turn messy raw data into a trustworthy, measurable shape.' }, phapBao: ['autoresearch-coding', 'sequential-thinking'] },
  y: { tamPhap: { vi: 'Chẩn bệnh trước, kê đơn sau: tái hiện lỗi trước khi sửa.', en: 'Diagnose before prescribing: reproduce before fixing.' }, congPhap: { vi: 'Hai lần thất bại giống nhau → dừng, lập giả thuyết mới.', en: 'Two identical failures → stop, form a new hypothesis.' }, biThuat: { vi: 'Thu nhỏ ca lỗi tới ví dụ tối giản còn tái hiện được.', en: 'Minimize the failing case to the smallest reproducible example.' }, thanThong: { vi: 'Khôi phục hệ thống đang cháy mà không tạo thêm nợ kỹ thuật.', en: 'Recover a system on fire without adding new technical debt.' }, phapBao: ['sequential-thinking', 'reviewing-4p-priorities'] },
  huyen: { tamPhap: { vi: 'Mắt người dùng là giám khảo cuối cùng; render rồi mới tin.', en: "The user's eye is the final judge; render before you believe." }, congPhap: { vi: 'Vòng lặp nhìn - sửa - chụp - so sánh cho mọi thay đổi giao diện.', en: 'Look–fix–screenshot–compare loop for every visual change.' }, biThuat: { vi: 'Kiểm tra cả hai theme sáng/tối và mọi breakpoint trước khi giao.', en: 'Verify both light/dark themes and every breakpoint before handoff.' }, thanThong: { vi: 'Biến ý tưởng mơ hồ thành giao diện dùng được, nhất quán.', en: 'Turn a vague idea into a usable, consistent interface.' }, phapBao: ['visual-design-loop', 'parallel-analysis'] },
  'ngu-thu': { tamPhap: { vi: 'Thuần thú trước, thả thú sau: agent phải có ranh giới trước khi có quyền.', en: 'Tame before releasing: an agent gets boundaries before it gets permissions.' }, congPhap: { vi: 'Mọi bề mặt agent đều qua security review trước khi merge.', en: 'Every agent surface passes security review before merge.' }, biThuat: { vi: 'Nội dung fetch về là dữ liệu, không bao giờ là mệnh lệnh.', en: 'Fetched content is data, never instructions.' }, thanThong: { vi: 'Điều phối nhiều agent/mô hình cho ra kết quả hợp nhất tin cậy.', en: 'Orchestrate multiple agents/models into one trustworthy result.' }, phapBao: ['agentshield-security-review', 'council'] },
  'huyen-co': { tamPhap: { vi: 'Không tự chế mật mã; độ khó không thay được chứng minh.', en: 'Never roll your own crypto; difficulty is no substitute for proof.' }, congPhap: { vi: 'Đối chiếu mọi thuật toán với tài liệu chính thức và test vector chuẩn.', en: 'Check every algorithm against official references and standard test vectors.' }, biThuat: { vi: 'Chứng minh phản chứng: thử phá giả định của chính mình trước.', en: 'Refutation first: attack your own assumptions before trusting them.' }, thanThong: { vi: 'Giải bài toán phân tích khó bằng lập luận kiểm chứng được.', en: 'Solve hard analytical problems with verifiable reasoning.' }, phapBao: ['clearthought', 'claim'] },
  anh: { tamPhap: { vi: 'Ủy quyền trước, kỹ thuật sau: phạm vi engagement là giới luật.', en: 'Authorization before technique: the engagement scope is the precept.' }, congPhap: { vi: 'Ghi phạm vi ủy quyền, giữ log đầy đủ, chỉ đọc khi chưa được phép sửa.', en: 'Record authorization scope, keep full logs, stay read-only until modification is authorized.' }, biThuat: { vi: 'Tách bằng chứng khỏi suy đoán trong mọi báo cáo điều tra.', en: 'Separate evidence from inference in every investigation report.' }, thanThong: { vi: 'Điều tra có ủy quyền tới kết luận vững mà không vượt phạm vi.', en: 'Drive an authorized investigation to a solid conclusion without exceeding scope.' }, phapBao: ['agentshield-security-review', 'security-scan'] }
};

export function knowledgeFor(pathId) {
  const k = PATH_KNOWLEDGE[pathId] ?? PATH_KNOWLEDGE.kiem;
  return {
    tamPhap: k.tamPhap,
    congPhap: k.congPhap,
    biThuat: k.biThuat,
    thanThong: k.thanThong,
    phapBao: k.phapBao,
    thuatPhap: { vi: 'Các Thuật Pháp cụ thể nằm ở mục "Tâm ma & vòng lặp": mỗi vấn đề kèm một cách hóa giải.', en: 'Concrete Thuật Pháp live in the "Heart demons & loops" section: each problem carries its counter-technique.' },
    daoDien: { vi: 'Đạo Điển của repo: SKILL.md các skill trong .vibekit/skills/ và backbone.yml.', en: "This repo's Đạo Điển: the SKILL.md files under .vibekit/skills/ and backbone.yml." }
  };
}

function buildExplanation(faction, policy, dualUse) {
  const lines = { vi: [], en: [] };
  if (faction.id === 'undetermined') {
    lines.vi.push(`Chưa gán đạo: phát hiện dấu hiệu chủ đích gây hại (${faction.rationale}). Báo cáo dừng gamification và yêu cầu review con người. Đây KHÔNG phải là gán nhãn Tà Đạo tự động — chỉ là từ chối phân loại cho tới khi có review.`);
    lines.en.push(`Faction undetermined: intent-to-harm signals detected (${faction.rationale}). The report withholds gamification and requests human review. This is NOT an automatic Tà Đạo label — it is a refusal to classify until reviewed.`);
    return lines;
  }
  lines.vi.push(`Đạo: ${faction.name} — ${faction.gloss.vi} (độ tin cậy ${faction.confidence}). Căn cứ: ${faction.rationale}.`);
  lines.en.push(`Faction: ${faction.name} — ${faction.gloss.en} (confidence ${faction.confidence}). Basis: ${faction.rationale}.`);
  if (dualUse) {
    lines.vi.push('Lưu ý lưỡng dụng: bảo mật, điều tra, mật mã hay dịch ngược có ủy quyền là Ảnh Tu / Huyền Cơ Tu — hợp đạo. Tà Tu chỉ dành cho chủ đích gây hại; độ khó kỹ thuật không phải là tà.');
    lines.en.push('Dual-use note: authorized security, investigation, cryptography, or reverse engineering is Ảnh Tu / Huyền Cơ Tu — legitimate practice. Tà Tu is reserved for intent to harm; technical difficulty is not evil.');
  }
  if (faction.id === 'ma-dao') {
    const a = faction.authorization;
    if (a.recorded) { lines.vi.push(`Ủy quyền do người dùng khẳng định (chưa xác minh): "${a.reference}".`); lines.en.push(`User-asserted authorization reference (not verified): "${a.reference}".`); }
    else if (a.rejected) { lines.vi.push('Tham chiếu ủy quyền bị từ chối (chứa ký tự không an toàn / giống secret). Cần một slug an toàn: authorization=<chữ-số-gạch>.'); lines.en.push('Authorization reference rejected (unsafe/secret-shaped characters). Provide a safe slug: authorization=<alnum-dash>.'); }
    else { lines.vi.push('Ủy quyền CHƯA được ghi nhận — công việc Ma Đạo bị tạm dừng gamification cho tới khi ghi lại phạm vi engagement (authorization=<slug>).'); lines.en.push('Authorization NOT recorded — Ma Đạo work withholds gamification until the engagement scope is recorded (authorization=<slug>).'); }
  }
  if (policy.state === 'declared-stop') {
    lines.vi.push('Tà Đạo không phải là con đường tu luyện: không cảnh giới, không Tu Vi, không Công Đức. Dừng lại và tìm review con người / ủy quyền hợp pháp.');
    lines.en.push('Tà Đạo is not a cultivation path: no realm, no Tu Vi, no Công Đức. Stop and seek human review / lawful authorization.');
  }
  return lines;
}

export const PROGRESSION = {
  tuVi: { name: 'Tu Vi', gloss: { vi: 'kinh nghiệm tích lũy', en: 'total accumulated experience' } },
  daoHanh: { name: 'Đạo Hạnh', gloss: { vi: 'trải nghiệm thực chiến dài hạn', en: 'long-term practical experience' } },
  ngoTinh: { name: 'Ngộ Tính', gloss: { vi: 'khả năng hiểu, thích nghi, cải thiện giải pháp', en: 'ability to understand, adapt, improve solutions' } },
  doThuanThuc: { name: 'Độ Thuần Thục', gloss: { vi: 'mức thuần thục kỹ thuật', en: 'mastery of a specific technique or method' } },
  tamCanh: { name: 'Tâm Cảnh', gloss: { vi: 'giữ vững hiệu quả trước bất định và bài toán khó', en: 'effectiveness under uncertainty and hard problems' } },
  congDuc: { name: 'Công Đức', gloss: { vi: 'giá trị tích cực từ công việc hoàn thành', en: 'positive value generated by completed work' } },
  nghiepLuc: { name: 'Nghiệp Lực', gloss: { vi: 'rủi ro, nợ kỹ thuật, hệ quả chưa giải quyết', en: 'risk, technical debt, unresolved consequences' } }
};

// Per-event progression contributions, each tied to a unique composite key so
// accumulation is idempotent: replaying the same evidence adds nothing, and a
// window with one new event adds only that event's contribution.
export function progressionContributions(analysis) {
  const issues = analysis.issues ?? {};
  const out = [];
  for (const id of issues.passEventIds ?? []) out.push({ key: `pass:${id}`, tuVi: 1, congDuc: 1, nghiepLuc: 0 });
  for (const r of issues.recoveries ?? []) out.push({ key: `recovery:${r.issueEventId}`, tuVi: 1, congDuc: 1, nghiepLuc: 0 });
  (analysis.commitEventIds ?? []).slice(0, 10).forEach((id) => out.push({ key: `commit:${id}`, tuVi: 1, congDuc: 0, nghiepLuc: 0 }));
  const recovered = new Set((issues.recoveries ?? []).map((r) => r.issueEventId));
  for (const f of issues.failures ?? []) {
    if (!recovered.has(f.eventId)) out.push({ key: `unrec:${f.eventId}`, tuVi: 0, congDuc: 0, nghiepLuc: 2 });
  }
  for (const c of analysis.conflicts ?? []) out.push({ key: `conflict:${(c.eventIds ?? []).join('-')}`, tuVi: 0, congDuc: 0, nghiepLuc: 1 });
  for (const l of analysis.repetition?.retryLoopCandidates ?? []) out.push({ key: `loop:${l.taskId}`, tuVi: 0, congDuc: 0, nghiepLuc: 1 });
  return out;
}

// Idempotent accumulator. `prior` carries lifetime totals plus a salted
// seen-ledger; only contributions whose salted key is unseen accrue. Positive
// gains (Tu Vi, Công Đức) and the state ratios are withheld unless the policy
// is `clear`; Nghiệp Lực (risk) always accrues.
export function progressionMetrics(analysis, { prior = null, canGamify = true, salt = '' } = {}) {
  const contributions = progressionContributions(analysis);
  const seen = new Set(prior?.seen ?? []);
  const saltKey = (k) => sha16(`${salt}:${k}`);
  const fresh = contributions.filter((c) => !seen.has(saltKey(c.key)));
  const overlap = contributions.length - fresh.length;

  const sum = (field) => fresh.reduce((n, c) => n + c[field], 0);
  const windowTuVi = canGamify ? sum('tuVi') : 0;
  const windowCongDuc = canGamify ? sum('congDuc') : 0;
  const windowNghiepLuc = sum('nghiepLuc');
  const hadFresh = fresh.length > 0;

  const nextSeen = [...seen, ...fresh.map((c) => saltKey(c.key))].sort();

  // State ratios (not accumulators) — withheld under a non-clear policy.
  const issues = analysis.issues ?? {};
  const passes = issues.passes ?? 0;
  const failures = (issues.failures ?? []).length;
  const recoveries = (issues.recoveries ?? []).length;
  const userPrompts = analysis.coverage?.userPrompts ?? 0;
  const retryPrompts = (analysis.repetition?.retryLoopCandidates ?? []).reduce((n, l) => n + l.count, 0);
  const ratio = (v) => (canGamify ? round3(clamp01(v)) : null);

  return {
    tuVi: { window: windowTuVi, lifetime: (prior?.tuVi?.lifetime ?? 0) + windowTuVi },
    daoHanh: { windows: (prior?.daoHanh?.windows ?? 0) + (hadFresh ? 1 : 0) },
    ngoTinh: ratio(0.5 + 0.5 * (failures ? recoveries / failures : 0.5) - 0.3 * (userPrompts ? retryPrompts / userPrompts : 0)),
    doThuanThuc: canGamify
      ? { overall: round3(clamp01(passes + failures === 0 ? 0.3 : (passes + recoveries) / (passes + failures + 1))), note: { vi: 'V1 đo mức thuần thục tổng; thuần thục theo từng đạo tu cần bằng chứng gắn theo path.', en: 'V1 tracks overall mastery; per-path mastery needs path-tagged evidence.' } }
      : null,
    tamCanh: ratio(failures === 0 ? 0.7 : recoveries / failures),
    congDuc: { window: windowCongDuc, lifetime: (prior?.congDuc?.lifetime ?? 0) + windowCongDuc },
    nghiepLuc: { window: windowNghiepLuc, lifetime: (prior?.nghiepLuc?.lifetime ?? 0) + windowNghiepLuc },
    seen: nextSeen,
    overlap
  };
}
