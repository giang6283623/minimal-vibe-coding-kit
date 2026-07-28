#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  normalizeStoryFocus,
  normalizeStoryLanguage,
  normalizeStoryStyle,
  parseInvocation,
  TUTIEN_EXPERIENCE
} from './command.mjs';
import { analyze } from './analyze-history.mjs';
import { renderReport, resolveLanguage, renderClassificationMarkdown } from './render-report.mjs';
import { buildSnapshot, snapshotsToPrune } from './snapshot.mjs';
import { compareSnapshots } from './compare.mjs';
import { classifyProject } from './classify.mjs';
import { buildStoryContext, storyPaths, validateStoryTree, writeStoryContext } from './story-ledger.mjs';
import { buildProjectProfile, inventoryProjectMetadata } from './project-profile.mjs';
import { buildResponseBrief } from './response-brief.mjs';

// End-to-end executor for the advertised /tutien actions. All state lives
// under the git-ignored .vibekit/reports/tutien/ of the current repo; the
// runner never deletes anything (retention only prints a `trash` command).
//
//   run-tutien.mjs [on|off|status|preview|analyze|compare|explain|classify] [k=v ...]
//
// Approval boundary: `preview` prints the exact scope and an approval token;
// `analyze` refuses to read anything until it receives approve=<that token>
// for the identical scope.

const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

const root = process.cwd();
const reportDir = path.join(root, '.vibekit', 'reports', 'tutien');
const stateFile = path.join(reportDir, 'state.json');
const snapDir = path.join(reportDir, 'snapshots');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { mode: 'off' };
  }
}
function saveState(state) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function resolveStoryPreferences(state, options, providedOptions = []) {
  const provided = new Set(providedOptions);
  const prior = state.storyPreferences ?? {};
  const choose = (key, optionKey, fallback) => provided.has(key) ? options[optionKey] : (prior[optionKey] ?? options[optionKey] ?? fallback);
  const preferences = {
    story: choose('story', 'story', 'on') === 'off' ? 'off' : 'on',
    storyLanguage: normalizeStoryLanguage(choose('story-language', 'storyLanguage', 'auto')),
    storyStyle: normalizeStoryStyle(choose('story-style', 'storyStyle', 'auto')),
    storyFocus: normalizeStoryFocus(choose('story-focus', 'storyFocus', 'balanced'))
  };
  state.storyPreferences = preferences;
  return preferences;
}

function classifySources(sources) {
  const spec = { jsonlFiles: [], transcriptFiles: [], gitRoot: null };
  for (const s of sources) {
    if (s === 'git') spec.gitRoot = root;
    else if (s.endsWith('.jsonl')) spec.jsonlFiles.push(s);
    else spec.transcriptFiles.push(s);
  }
  return spec;
}

const scopeToken = (sources, range, metadata = inventoryProjectMetadata(root)) => sha16(JSON.stringify({
  sources: [...sources].sort(),
  range,
  metadata: metadata.map(({ path: file, size, mtimeMs }) => ({ path: file, size, mtimeMs }))
}));

// Project profile for classification: a bounded set of known manifests plus a
// distinct-commit-author COUNT. Script bodies, names, emails, and file content
// are never returned or persisted.
function repoProfile(options) {
  const profile = buildProjectProfile(root, options);
  // Author identifiers are read transiently (mailmap-collapsed) and reduced to
  // a distinct COUNT immediately; no email or name is retained or returned.
  let authorsCount = null;
  const res = spawnSync('git', ['log', '--use-mailmap', '--format=%aE'], { cwd: root, encoding: 'utf8' });
  if (res.status === 0) authorsCount = new Set(res.stdout.split('\n').filter(Boolean)).size;
  return { ...profile, authorsCount };
}

// Preview inspects no content: file existence and size only, plus the git
// toplevel path. Nothing is parsed and nothing is written except the pending
// approval in the state file.
function previewLines(options, language = 'en') {
  const vi = language === 'vi';
  const metadata = inventoryProjectMetadata(root);
  const lines = [vi
    ? 'Xem trước phạm vi tu tiên: đài quan sát đã mở nhưng chưa đọc cuộn thư nào. Chỉ phân tích sau khi phạm vi chính xác này được phê duyệt.'
    : 'tutien preview — the observatory is open, but no scroll has been read; nothing is analyzed until this exact scope is approved.'];
  if (options.sources.length === 0) lines.push(vi ? '- Chưa có nguồn. Hãy truyền `sources=git,/duong-dan/export.jsonl`.' : '- (no sources; pass sources=git,/path/to/export.jsonl)');
  for (const s of options.sources) {
    if (s === 'git') {
      lines.push(vi ? `- Git: chỉ đọc siêu dữ liệu bản ghi của kho hiện tại tại ${root}.` : `- git: commit metadata of ${root} (read-only git log, current repository only)`);
    } else {
      let size = null;
      try {
        size = fs.statSync(s).size;
      } catch {}
      lines.push(size == null
        ? (vi ? `- Tệp: ${s} (không tìm thấy)` : `- file: ${s} (NOT FOUND)`)
        : (vi ? `- Tệp: ${s} (${size} byte)` : `- file: ${s} (${size} bytes)`));
    }
  }
  if (metadata.length) {
    lines.push(vi
      ? `- Metadata dự án: ${metadata.map((item) => `${item.path} (${item.size} byte)`).join(', ')}; chỉ đọc nội dung sau khi phê duyệt.`
      : `- project metadata: ${metadata.map((item) => `${item.path} (${item.size} bytes)`).join(', ')}; content is read only after approval.`);
  } else {
    lines.push(vi ? '- Metadata dự án: không tìm thấy manifest đã biết.' : '- project metadata: no known manifest found.');
  }
  lines.push(vi ? `- Phạm vi thời gian: ${options.range}` : `- range: ${options.range}`);
  const token = scopeToken(options.sources, options.range, metadata);
  lines.push(vi
    ? `Để phê duyệt đúng phạm vi này: \`analyze approve=${token} sources=${options.sources.join(',')}\``
    : `To approve exactly this scope: analyze approve=${token} sources=${options.sources.join(',')}`);
  return { lines, token };
}

const EXPLAIN = {
  reportedTotal: 'Sum of provider-reported usable token totals; cumulative streaming records sharing a requestId are counted once (last value), independent chunks are summed. Records without a computable positive total never contribute.',
  estimatedTotal: 'Sum of locally estimated usable token totals; never mixed into reportedTotal.',
  unknownTurns: 'Assistant message turns whose usage is absent or has no usable total; claimed accuracy without numbers counts as unknown.',
  retryLoops: 'Runs of 3+ exact/near-identical user prompts within one task with intervening assistant/tool events; confidence-scored candidates.',
  conflicts: 'A "never/do not X" instruction followed in the same task by a later prompt requesting X; paired event IDs, confidence 0.6.',
  realm: 'Weighted dimension score (delivery 30%, validation 25%, clarity 15%, recovery 15%, safety 10%, automation 5%) mapped to the realm ladder; requires >= 60% known-token coverage, otherwise "Chưa đủ thiên cơ".'
};

const EXPLAIN_VI = {
  reportedTotal: 'Tổng số token hợp lệ do nhà cung cấp báo cáo. Bản ghi luồng tích lũy có cùng `requestId` chỉ được tính một lần theo giá trị cuối; các đoạn độc lập được cộng riêng. Bản ghi không có tổng dương hợp lệ sẽ không được tính.',
  estimatedTotal: 'Tổng số token hợp lệ được ước lượng cục bộ; không bao giờ gộp vào `reportedTotal`.',
  unknownTurns: 'Số lượt trả lời của trợ lý không có dữ liệu sử dụng hoặc không có tổng hợp lệ. Tuyên bố độ chính xác mà thiếu số liệu vẫn được tính là chưa rõ.',
  retryLoops: 'Chuỗi từ ba lời yêu cầu giống hoặc gần giống nhau trong cùng một nhiệm vụ, xen giữa bởi phản hồi của trợ lý hay công cụ; đây là các dấu hiệu có chấm mức tin cậy.',
  conflicts: 'Một chỉ thị dạng “không bao giờ” hoặc “không làm X”, sau đó trong cùng nhiệm vụ xuất hiện lời yêu cầu làm X; cặp mã sự kiện có độ tin cậy 0,6.',
  realm: 'Điểm có trọng số từ sáu chiều được ánh xạ vào thang cảnh giới. Cần ít nhất 60% độ phủ token đã biết; nếu thiếu sẽ trả về “Chưa đủ thiên cơ”.'
};

export function run(argsString = '') {
  const { action, explicitAction, options, providedOptions } = parseInvocation(argsString);
  const state = loadState();
  const storyPreferences = resolveStoryPreferences(state, options, providedOptions);
  const uiLanguage = resolveLanguage(options.language, { invocationText: argsString });
  const say = (vi, en) => uiLanguage === 'vi' ? vi : en;
  const refuse = (msg) => ({ code: 2, out: [msg] });

  if (action === 'off') {
    state.mode = 'off';
    delete state.pendingApproval;
    saveState(state);
    return { code: 0, out: [say('Chế độ tu tiên đã tắt. Văn phong bình thường của bộ công cụ đã được khôi phục.', 'Tutien mode is off. Normal kit writing style restored.')] };
  }
  if (action === 'on') {
    state.mode = 'on';
    saveState(state);
    return { code: 0, out: [say('Chế độ tu tiên đã bật. Sơn môn đã mở; hãy chạy `preview` để xem phạm vi chính xác trước khi phân tích.', 'Tutien mode is on — the mountain gate is open. Run preview to see the exact scope before any analysis.')] };
  }
  if (action === 'status') {
    const snaps = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).length : 0;
    const storyStatus = validateStoryTree(root);
    return {
      code: 0,
      out: [
        say(`chế độ: ${(state.mode ?? 'off') === 'on' ? 'bật' : 'tắt'}`, `mode: ${state.mode ?? 'off'}`),
        say(`trải nghiệm: \`${TUTIEN_EXPERIENCE.kind}\``, `experience: ${TUTIEN_EXPERIENCE.kind}`),
        say(`giọng văn: \`${TUTIEN_EXPERIENCE.narrativeStyle}\``, `voice: ${TUTIEN_EXPERIENCE.narrativeStyle}`),
        say(`không gian ngữ nghĩa: \`${TUTIEN_EXPERIENCE.semanticNamespace}\``, `semantic namespace: ${TUTIEN_EXPERIENCE.semanticNamespace}`),
        say(`phê duyệt đang chờ: ${state.pendingApproval ?? 'không có'}`, `pending approval: ${state.pendingApproval ?? 'none'}`),
        say(`ảnh chụp tổng hợp: ${snaps}`, `snapshots: ${snaps}`),
        say(`trường thiên: ${storyPreferences.story === 'on' ? 'bật' : 'tắt'} (${storyPreferences.storyLanguage}, ${storyPreferences.storyStyle}, ${storyPreferences.storyFocus})`, `story: ${storyPreferences.story} (${storyPreferences.storyLanguage}, ${storyPreferences.storyStyle}, ${storyPreferences.storyFocus})`),
        say(`số chương: ${storyStatus.chapters}`, `story chapters: ${storyStatus.chapters}`),
        say(`tổng cương: ${path.relative(root, storyPaths(root).plot)}`, `story plot: ${path.relative(root, storyPaths(root).plot)}`),
        say(`sổ chương: ${storyStatus.ok ? 'hợp lệ' : `cần xem lại (${storyStatus.errors.length} lỗi)`}`, `story ledger: ${storyStatus.ok ? 'valid' : `needs attention (${storyStatus.errors.length})`}`)
      ]
    };
  }

  // Report actions. A bare `/tutien` re-activates the mode; an explicit
  // report action while off is refused (off-mode suppression).
  if ((state.mode ?? 'off') !== 'on') {
    if (explicitAction) return refuse(say('Chế độ tu tiên đang tắt. Hãy chạy `on` hoặc gọi `/tutien` trước.', "tutien mode is off; run 'on' (or bare /tutien) first."));
    state.mode = 'on';
  }

  if (action === 'preview') {
    const { lines, token } = previewLines(options, uiLanguage);
    lines.push(say(
      `- Trường thiên: ${storyPreferences.story === 'on' ? 'bật' : 'tắt'}; ngôn ngữ ${storyPreferences.storyLanguage}, phong cách ${storyPreferences.storyStyle}, trọng tâm ${storyPreferences.storyFocus}.`,
      `- living chronicle: ${storyPreferences.story} (language=${storyPreferences.storyLanguage}, style=${storyPreferences.storyStyle}, focus=${storyPreferences.storyFocus})`
    ));
    state.pendingApproval = token;
    saveState(state);
    return { code: 0, out: lines };
  }

  if (action === 'classify') {
    // classify is a metadata-only action (no history content): it reads only
    // the known manifests advertised below and a transient author count.
    let classification;
    try {
      classification = classifyProject(repoProfile(options));
    } catch (err) {
      return refuse(err.message);
    }
    saveState(state);
    const language = resolveLanguage(options.language, { invocationText: argsString });
    const sources = inventoryProjectMetadata(root).map((item) => item.path).join(', ') || 'none';
    const scope = language === 'vi'
      ? `Phạm vi classify: chỉ đọc manifest đã biết (${sources}) và số lượng tác giả Git; không đọc nội dung lịch sử, không tính tiến cảnh (tiến cảnh cần \`analyze\`).`
      : `classify scope: known manifests only (${sources}) plus a distinct Git-author count; no history content is read, and no progression is computed (progression needs \`analyze\`).`;
    return { code: 0, out: [scope, '', renderClassificationMarkdown(classification, language)] };
  }

  if (action === 'explain') {
    if (options.metric && EXPLAIN[options.metric]) {
      return { code: 0, out: [say(`Ghi chú từ đạo ký về \`${options.metric}\`: ${EXPLAIN_VI[options.metric]}`, `A note from the Dao ledger — ${options.metric}: ${EXPLAIN[options.metric]}`)] };
    }
    return { code: 0, out: [say(`Đạo ký có thể giải thích: ${Object.keys(EXPLAIN).map((key) => `\`${key}\``).join(', ')}. Hãy truyền \`metric=<tên>\`.`, `The Dao ledger can explain: ${Object.keys(EXPLAIN).join(', ')} (pass metric=<name>).`)] };
  }

  if (action === 'compare') {
    const files = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')).sort() : [];
    if (files.length < 2) return refuse(say('Cần ít nhất hai ảnh chụp tổng hợp để so sánh. Hãy chạy `analyze snapshot=true` trước.', 'need at least two snapshots to compare; run analyze snapshot=true first.'));
    const load = (f) => JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'));
    const result = compareSnapshots(load(files[files.length - 2]), load(files[files.length - 1]));
    return {
      code: 0,
      out: [say('Hai bản tu luyện cùng đặt dưới một ngọn đèn; số liệu dưới đây chỉ cho thấy phần đã thay đổi.', 'Two cultivation records rest beneath the same lamp; the figures below show only what changed.'), JSON.stringify(result, null, 2)]
    };
  }

  if (action === 'analyze') {
    const token = scopeToken(options.sources, options.range, inventoryProjectMetadata(root));
    if (!options.approve) {
      return refuse(say('Phân tích cần được phê duyệt rõ ràng. Hãy chạy `preview`, rồi truyền lại `approve=<token>` đã nhận.', 'analysis requires explicit approval: run preview, then pass the approve=<token> it printed.'));
    }
    if (options.approve !== token || state.pendingApproval !== token) {
      return refuse(say('Token phê duyệt không khớp phạm vi đã xem trước. Hãy chạy lại `preview` và phê duyệt đúng phạm vi đó.', 'approval token does not match the previewed scope; run preview again and approve that exact scope.'));
    }
    delete state.pendingApproval;

    const analysis = analyze(classifySources(options.sources));
    let prior = null;
    try {
      const files = fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')).sort();
      if (files.length) prior = JSON.parse(fs.readFileSync(path.join(snapDir, files[files.length - 1]), 'utf8'));
    } catch {}

    const language = resolveLanguage(options.language, { invocationText: argsString });
    let profile = null;
    try {
      profile = repoProfile(options);
    } catch {}
    const { model, markdown } = renderReport(analysis, {
      ...options,
      language,
      profile,
      progressionSalt: path.basename(root),
      priorProgression: prior?.progression ?? null,
      priorVillains: prior?.villainState ?? []
    });

    const out = [];
    if (options.snapshot) {
      fs.mkdirSync(snapDir, { recursive: true });
      const createdAt = new Date().toISOString();
      const snap = buildSnapshot(analysis, {
        projectId: path.basename(root),
        window: options.range,
        createdAt,
        prevVillainState: prior?.villainState ?? [],
        shownVillains: model.villainCards,
        canGamify: !model.suppressGamification,
        policyState: model.policyState,
        progression: model.cultivation?.progression ?? null,
        classification: model.cultivation
          ? { faction: model.cultivation.classification.faction.id, paths: model.cultivation.classification.paths.map((p) => p.id) }
          : null
      });
      const file = path.join(snapDir, `${createdAt.replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(file, `${JSON.stringify(snap, null, 2)}\n`);
      out.push(say(`Đã ghi ảnh chụp tổng hợp: ${path.relative(root, file)}`, `snapshot written: ${path.relative(root, file)}`));
      const prune = snapshotsToPrune(fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')), 20);
      if (prune.length) {
        out.push(say(`Lưu giữ: có thể chuyển các ảnh chụp cũ vào thùng rác bằng lệnh \`trash ${prune.map((f) => path.relative(root, path.join(snapDir, f))).join(' ')}\`.`, `retention: remove old snapshots with: trash ${prune.map((f) => path.relative(root, path.join(snapDir, f))).join(' ')}`));
      }
    }
    let storyContext = null;
    if (storyPreferences.story === 'on') {
      if (model.suppressGamification) {
        out.push(say(`Trường thiên tạm dừng: trạng thái chính sách \`${model.policyState}\` không cho phép viết cốt truyện.`, `living chronicle paused: policy state ${model.policyState} does not permit lore.`));
      } else {
        storyContext = buildStoryContext(model, {
          profile,
          range: options.range,
          language: storyPreferences.storyLanguage,
          invocationText: argsString,
          conversationLanguage: language,
          style: storyPreferences.storyStyle,
          focus: storyPreferences.storyFocus
        });
        const contextFile = writeStoryContext(root, storyContext);
        out.push(say(`Đã ghi ngữ cảnh trường thiên: ${path.relative(root, contextFile)}; bằng chứng \`${storyContext.evidenceKey}\`.`, `story context written: ${path.relative(root, contextFile)} (evidence ${storyContext.evidenceKey})`));
      }
    }
    fs.mkdirSync(reportDir, { recursive: true });
    const ledgerFile = path.join(reportDir, 'latest.md');
    const briefFile = path.join(reportDir, 'latest-brief.json');
    fs.writeFileSync(ledgerFile, `${markdown}\n`);
    const brief = buildResponseBrief(model, {
      language,
      profile,
      storyContext,
      ledgerPath: path.relative(root, ledgerFile)
    });
    fs.writeFileSync(briefFile, `${JSON.stringify(brief, null, 2)}\n`);
    out.push(say(
      `Đã ghi đạo ký chứng cứ: ${path.relative(root, ledgerFile)}.`,
      `evidence ledger written: ${path.relative(root, ledgerFile)}.`
    ));
    out.push(say(
      `Gói sáng tác đã sẵn sàng: ${path.relative(root, briefFile)}; hãy dùng dữ kiện này để viết phản hồi linh hoạt theo dự án, không sao chép bố cục đạo ký.`,
      `response brief ready: ${path.relative(root, briefFile)}; compose adaptively from it instead of copying the ledger structure.`
    ));
    saveState(state);
    return { code: 0, out: options.output === 'ledger' ? [...out, markdown] : out };
  }

  return refuse(say(`Không nhận ra hành động "${action}".`, `unknown action "${action}"`));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = run(process.argv.slice(2).join(' '));
  for (const line of res.out) console.log(line);
  process.exit(res.code);
}
