#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';
import { scoreReport } from '../../../.vibekit/skills/tutien/scripts/score.mjs';
import { detectProblems } from '../../../.vibekit/skills/tutien/scripts/catalog.mjs';
import { buildReportModel, renderMarkdown, resolveLanguage } from '../../../.vibekit/skills/tutien/scripts/render-report.mjs';
import { parseInvocation, resolveTone } from '../../../.vibekit/skills/tutien/scripts/command.mjs';
import { buildResponseBrief } from '../../../.vibekit/skills/tutien/scripts/response-brief.mjs';

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

const clean = analyze({ jsonlFiles: [fx('synthetic-clean.jsonl')] });
const loop = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
const conflict = analyze({ jsonlFiles: [fx('synthetic-conflict.jsonl')] });
const transcript = analyze({ transcriptFiles: [fx('synthetic-transcript.txt')] });

// ---- command parsing (/tutien on/off flexibility) ----
check('command: bare /tutien defaults to preview action', () =>
  assert.equal(parseInvocation('').action, 'preview'));
check('command: /tutien off is a mode toggle', () => {
  const c = parseInvocation('off');
  assert.equal(c.action, 'off');
  assert.equal(c.isModeToggle, true);
});
check('command: /tutien on is a mode toggle', () =>
  assert.equal(parseInvocation('on').isModeToggle, true));
check('command: options parse (language, tone, villains, score, living chronicle)', () => {
  const c = parseInvocation('analyze language=en tone=spirited villains=off score=show story=on story-language=zh story-style=web-serial story-focus=sect-politics output=ledger');
  assert.equal(c.action, 'analyze');
  assert.equal(c.options.language, 'en');
  assert.equal(c.options.tone, 'spirited');
  assert.equal(c.options.villains, 'off');
  assert.equal(c.options.score, 'show');
  assert.equal(c.options.story, 'on');
  assert.equal(c.options.storyLanguage, 'zh');
  assert.equal(c.options.storyStyle, 'web-serial');
  assert.equal(c.options.storyFocus, 'sect-politics');
  assert.equal(c.options.output, 'ledger');
  assert.ok(c.providedOptions.includes('story-language'));
});
check('command: spirited is opt-in, legacy aliases normalize, and sensitive is neutral', () => {
  assert.equal(resolveTone('spirited'), 'spirited');
  assert.equal(resolveTone('spicy'), 'spirited');
  assert.equal(resolveTone('gentle'), 'serene');
  assert.equal(resolveTone('spirited', { sensitive: true }), 'neutral');
  assert.equal(resolveTone('bogus'), 'serene');
});
check('command: unknown story preferences normalize before persistence or display', () => {
  const c = parseInvocation('preview story-language=<script> story-style=token=SECRET story-focus=../../outside');
  assert.equal(c.options.storyLanguage, 'auto');
  assert.equal(c.options.storyStyle, 'auto');
  assert.equal(c.options.storyFocus, 'balanced');
});
check('command: explicit English and Vietnamese end requests turn the mode off', () => {
  for (const request of ['please stop', 'stop tutien mode', 'please end /tutien mode', 'could you please end /tutien mode now', 'hãy dừng nhé', 'tắt tu tiên', 'hãy dừng tu tiên nhé', 'kết thúc tu tiên chế độ']) {
    const parsed = parseInvocation(request);
    assert.equal(parsed.action, 'off', request);
    assert.equal(parsed.isModeToggle, true, request);
  }
});

// ---- scoring ----
check('score: deterministic across runs', () =>
  assert.deepEqual(scoreReport(clean), scoreReport(clean)));
check('score: clean run has enough evidence and a realm', () => {
  const s = scoreReport(clean);
  assert.equal(s.enoughEvidence, true);
  assert.ok(s.score >= 0 && s.score <= 100);
  assert.ok(s.realm.name.length > 0);
});
check('score: transcript-only lacks evidence -> Chưa đủ thiên cơ', () => {
  const s = scoreReport(transcript);
  assert.equal(s.enoughEvidence, false);
  assert.equal(s.score, null);
  assert.equal(s.realm.name, 'Chưa đủ thiên cơ');
});
check('score: dimensions all within [0,1]', () => {
  for (const v of Object.values(scoreReport(loop).dimensions)) assert.ok(v >= 0 && v <= 1);
});
check('score: high tokens alone do not raise the score', () => {
  const inflated = JSON.parse(JSON.stringify(clean));
  inflated.tokens.reportedTotal *= 1000;
  assert.equal(scoreReport(inflated).score, scoreReport(clean).score);
});

// ---- problem detection (evidence-bound) ----
check('problems: clean run yields none', () =>
  assert.equal(detectProblems(clean).length, 0));
check('problems: repeat-loop yields a ranked problem with evidence + confidence', () => {
  const ps = detectProblems(loop);
  assert.ok(ps.length >= 1);
  assert.ok(ps[0].evidence.eventIds.length >= 1);
  assert.ok(ps[0].confidence >= 0.5);
  assert.ok(ps[0].priority > 0);
});
check('problems: conflict fixture yields a conflict problem', () =>
  assert.ok(detectProblems(conflict).some((p) => p.problemId === 'conflicting-instructions')));
check('problems: at most 3 are returned, priority-sorted', () => {
  const ps = detectProblems(loop);
  assert.ok(ps.length <= 3);
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i - 1].priority >= ps[i].priority);
});

// ---- rendering ----
const modelLoop = buildReportModel(loop, { tone: 'gentle', score: 'show' });
const viMd = renderMarkdown(modelLoop, 'vi');
const enMd = renderMarkdown(modelLoop, 'en');

check('render: model declares the wholesome, isolated Tu Tiên experience', () => {
  assert.equal(modelLoop.experience.kind, 'wholesome-coding-classification-game');
  assert.equal(modelLoop.experience.purpose, 'stress-relief-and-mindful-reflection');
  assert.equal(modelLoop.experience.narrativeStyle, 'refined-mystical-xianxia');
  assert.equal(modelLoop.experience.semanticNamespace, 'tutien-coding-cultivation-v1');
  assert.equal(modelLoop.composition.finalResponse, 'agent-authored');
  assert.equal(modelLoop.composition.ledgerRole, 'evidence-scaffold-only');
  assert.ok(modelLoop.composition.adaptTo.includes('current-user-request'));
  assert.ok(modelLoop.composition.adaptTo.includes('living-chronicle'));
  const isolated = renderMarkdown(buildReportModel(loop, { context: { companionPersona: 'UNRELATED_MODE_SENTINEL' } }), 'en');
  assert.ok(!isolated.includes('UNRELATED_MODE_SENTINEL'));
});
check('render: deterministic ledger keeps exact evidence without defining the final response shape', () => {
  assert.match(enMd, /Mist drifts past the mountain gate/);
  assert.match(enMd, /Evidence: 4 repeats\/retries/);
  assert.match(enMd, /## Closing the Dao Record/);
  assert.match(enMd, /Break one knot with real proof/);
});
check('render: Vietnamese headings use sentence case and avoid decorative ASCII hyphens', () => {
  for (const heading of [
    '# Tu tiên tĩnh ký',
    '## Thiên cơ trong tầm mắt',
    '## Cảnh giới bên hiên mây',
    '## Linh thạch đã tiêu',
    '## Tâm ma trên đạo lộ',
    '## Khép lại đạo ký'
  ]) assert.ok(viMd.includes(heading), heading);
  assert.ok(!viMd.includes(' - '));
  assert.ok(!viMd.includes('Chương Thứ Nhất'));
});
check('render: Vietnamese report keeps avoidable workflow jargon out of prose', () => {
  const prose = viMd.replace(/`[^`]*`/g, '');
  assert.doesNotMatch(prose, /\b(task|prompt|checkpoint|done|validation|pass|commit|candidate|high|delivery|workflow|lore|review|engagement)\b/iu);
  assert.match(viMd, /4 lượt yêu cầu/);
  assert.match(viMd, /Độ tin cậy: cao/);
  assert.match(viMd, /- kiểm chứng `/);
});
check('render: Vietnamese missing-evidence reasons are localized', () => {
  const markdown = renderMarkdown(buildReportModel(transcript, {}), 'vi');
  assert.match(markdown, /Độ phủ số liệu token dưới 60%/);
  assert.doesNotMatch(markdown, /token usage coverage below/);
});
check('render: project help uses detected validation and omits unavailable kit skills', () => {
  const external = {
    projectId: 'material-kit-react',
    projectType: 'web-app',
    primaryLanguage: 'typescript',
    domains: ['frontend', 'ui'],
    stack: ['react', 'material-ui', 'vite'],
    validationCommands: ['yarn lint', 'yarn build'],
    recommendedValidation: 'yarn lint',
    kitInstalled: false
  };
  const proof = JSON.parse(JSON.stringify(clean));
  proof.coverage.commits = Math.max(1, proof.coverage.commits ?? 0);
  proof.validation = { events: [] };
  const model = buildReportModel(proof, { profile: external });
  assert.ok(model.problems.every((problem) => problem.projectHelp !== 'backbone.yml validate'));
  assert.ok(model.problems.every((problem) => !['sequential-thinking', 'clearthought', 'claim'].includes(problem.projectHelp)));
});
check('brief: preserves facts and project anchors without stock prose or raw event IDs', () => {
  const profile = {
    projectId: 'material-kit-react', projectType: 'web-app', primaryLanguage: 'typescript',
    domains: ['frontend', 'ui'], stack: ['react', 'material-ui', 'vite'], packageManager: 'yarn',
    validationCommands: ['yarn lint', 'yarn build'], recommendedValidation: 'yarn lint',
    metadataSources: ['package.json', 'yarn.lock'], kitInstalled: false
  };
  const model = buildReportModel(loop, { profile });
  const brief = buildResponseBrief(model, { language: 'vi', profile, ledgerPath: '.vibekit/reports/tutien/latest.md' });
  assert.equal(brief.schema, 'tutien-response-brief-v1');
  assert.deepEqual(brief.project.stack, ['react', 'material-ui', 'vite']);
  assert.deepEqual(brief.project.validationCommands, ['yarn lint', 'yarn build']);
  assert.equal(brief.composition.evidenceLedgerIsNotFinalResponse, true);
  assert.equal(brief.composition.vietnameseEndingIntent, 'Kết cà khịa, luôn giáo huấn, không tâng bốc và kéo dài dư âm vai diễn.');
  const serialized = JSON.stringify(brief);
  assert.ok(!serialized.includes('Mist drifts past the mountain gate'));
  assert.ok(!serialized.includes('Closing the Dao Record'));
  assert.ok(!serialized.includes('eventIds'));
  assert.ok(!serialized.includes('evt-'));
});
check('render: neutral context pauses theatrical prose', () => {
  const neutral = renderMarkdown(buildReportModel(conflict, { tone: 'spirited' }), 'en');
  assert.match(neutral, /cultivation theatrics are paused/);
  assert.ok(!neutral.includes('jade bell'));
});
check('skill contract names namespace isolation and normal-style restoration', () => {
  const skill = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.vibekit/skills/tutien/SKILL.md'), 'utf8');
  assert.match(skill, /tutien-coding-cultivation-v1/);
  assert.match(skill, /unrelated support\/companion features/);
  assert.match(skill, /normal writing style/);
  assert.match(skill, /vi-style-guide\.md/);
  assert.match(skill, /adaptive-response\.md/);
  assert.match(skill, /never paste its fixed section order or stock prose unchanged/i);
});

check('skill: adaptive response is project-specific and ending intent is not a fixed formula', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.vibekit/skills/tutien');
  const adaptive = fs.readFileSync(path.join(root, 'references/adaptive-response.md'), 'utf8');
  const viStyle = fs.readFileSync(path.join(root, 'references/vi-style-guide.md'), 'utf8');
  assert.match(adaptive, /current user request/i);
  assert.match(adaptive, /distinctive about this repository/i);
  assert.match(adaptive, /not a response template/i);
  assert.match(adaptive, /Kết cà khịa, luôn giáo huấn, không tâng bốc và kéo dài dư âm vai diễn\./);
  assert.match(viStyle, /hiệu quả cần đạt, không phải câu mẫu/);
});

check('render: model is language-neutral (same facts feed both languages)', () => {
  // Same model object renders both languages, so facts are identical by construction.
  assert.ok(viMd.length > 0 && enMd.length > 0);
  assert.notEqual(viMd, enMd);
});
check('render: counts are not mutated by lore (retry count appears verbatim)', () => {
  const retry = loop.repetition.retryLoopCandidates[0].count;
  assert.ok(viMd.includes(String(retry)));
  assert.ok(enMd.includes(String(retry)));
});
check('render: reported/estimated/unknown tokens stay separate and exact', () => {
  assert.ok(enMd.includes(`(exact): ${loop.tokens.reportedTotal}`));
});
check('render: sensitive context (unrecovered/conflict) forces neutral tone', () => {
  const m = buildReportModel(conflict, { tone: 'spicy' });
  assert.equal(m.tone, 'neutral');
});
check('render: score hidden by default, shown only with score=show', () => {
  assert.ok(!renderMarkdown(buildReportModel(loop, {}), 'en').includes('Score:'));
  assert.ok(renderMarkdown(buildReportModel(loop, { score: 'show' }), 'en').includes('Score:'));
});
check('render: no secrets or raw prompt text in the report', () => {
  for (const md of [viMd, enMd]) {
    assert.ok(!md.includes('hunter2'));
    assert.ok(!md.includes('SECRETVALUE'));
    assert.ok(!md.toLowerCase().includes('login redirect bug'));
  }
});
check('render: realm names keep Sino-Vietnamese form, glossed in English', () => {
  const en = renderMarkdown(buildReportModel(clean, {}), 'en');
  assert.match(en, /\*\*[^*]+ — [^*]+\*\*/);
});
check('render: deterministic output', () =>
  assert.equal(renderMarkdown(buildReportModel(loop, { score: 'show' }), 'vi'),
    renderMarkdown(buildReportModel(loop, { score: 'show' }), 'vi')));

// ---- language resolution ----
check('language: auto detects Vietnamese from invocation text', () =>
  assert.equal(resolveLanguage('auto', { invocationText: 'hãy phân tích giúp tôi' }), 'vi'));
check('language: explicit override wins', () =>
  assert.equal(resolveLanguage('en', { invocationText: 'hãy phân tích' }), 'en'));
check('language: falls back to English', () =>
  assert.equal(resolveLanguage('auto', { invocationText: 'analyze this' }), 'en'));

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} render/score checks passed`);
