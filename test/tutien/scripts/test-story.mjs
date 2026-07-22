#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STORY_CHAPTER_SCHEMA,
  STORY_STATE_SCHEMA,
  buildStoryContext,
  chapterFilename,
  nextChapterNumber,
  resolveStoryLanguage,
  slugifyChapterTitle,
  storyPaths,
  validateStoryTree,
  writeStoryContext
} from '../../../.vibekit/skills/tutien/scripts/story-ledger.mjs';

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

check('story: Vietnamese, English, and Chinese titles produce safe localized slugs', () => {
  assert.equal(slugifyChapterTitle('Kiếm ý khai trận'), 'kiem-y-khai-tran');
  assert.equal(slugifyChapterTitle('Sword Intent Opens the Array'), 'sword-intent-opens-the-array');
  assert.equal(slugifyChapterTitle('剑意开阵'), '剑意开阵');
  assert.equal(chapterFilename(7, 'Kiếm ý khai trận'), '0007-kiem-y-khai-tran.md');
  assert.equal(chapterFilename(7, '剑意开阵'), '0007-剑意开阵.md');
});

check('story: unsafe or empty titles and chapter numbers fail closed', () => {
  assert.throws(() => slugifyChapterTitle('---'), /safe filename/);
  assert.throws(() => chapterFilename(0, 'Opening'), /chapter number/);
  assert.throws(() => chapterFilename(10000, 'Opening'), /chapter number/);
});

check('story: language auto-detection has vi/en/zh parity', () => {
  assert.equal(resolveStoryLanguage('auto', 'Hãy viết chương tiếp theo'), 'vi');
  assert.equal(resolveStoryLanguage('auto', '请续写下一章'), 'zh');
  assert.equal(resolveStoryLanguage('auto', 'Continue the next chapter'), 'en');
  assert.equal(resolveStoryLanguage('zh', 'English invocation'), 'zh');
});

const model = {
  policyState: 'clear',
  suppressGamification: false,
  coverage: {
    sessions: 2,
    userPrompts: 5,
    commits: 3,
    confidence: 'high',
    window: { start: '2026-07-01T00:00:00.000Z', end: '2026-07-02T00:00:00.000Z' }
  },
  tokens: { reportedTotal: 1200, estimatedTotal: 300, unknownTurns: 1 },
  realm: { name: 'Trúc Cơ', gloss: 'Foundation Establishment' },
  score: 41,
  problems: [{ problemType: 'repeated-failure', confidence: 0.9, priority: 0.4, evidence: { eventIds: ['raw-event-must-not-persist'] } }],
  cultivation: {
    classification: {
      faction: { id: 'chinh-dao' },
      affiliation: { id: 'tong-mon' },
      paths: [{ id: 'kiem' }]
    },
    progression: {
      tuVi: { window: 3 },
      congDuc: { window: 2 },
      nghiepLuc: { window: 1 },
      daoHanh: { windows: 4 },
      overlap: 0
    }
  }
};

check('story: context is deterministic and aggregate-only', () => {
  const options = {
    profile: {
      projectId: 'demo-repo',
      projectType: 'single-repo',
      primaryLanguage: 'js',
      domains: ['agents'],
      stack: ['react', 'material-ui'],
      validationCommands: ['yarn lint', 'unsafe; command'],
      metadataSources: ['package.json', 'yarn.lock'],
      authorsCount: 2,
      description: 'SECRET DESCRIPTION MUST NOT PERSIST'
    },
    range: 'all',
    language: 'vi',
    style: 'web-serial',
    focus: 'sect-politics'
  };
  const a = buildStoryContext(model, options);
  const b = buildStoryContext(model, options);
  assert.deepEqual(a, b);
  assert.match(a.evidenceKey, /^[0-9a-f]{16}$/);
  const serialized = JSON.stringify(a);
  assert.ok(!serialized.includes('SECRET DESCRIPTION'));
  assert.ok(!serialized.includes('raw-event-must-not-persist'));
  assert.ok(!serialized.includes('"text":'));
  assert.equal(a.language, 'vi');
  assert.equal(a.canWriteChapter, true);
  assert.deepEqual(a.project.stack, ['react', 'material-ui']);
  assert.deepEqual(a.project.validationCommands, ['yarn lint']);
  assert.deepEqual(a.project.metadataSources, ['package', 'yarn']);
});

check('story: a valid plot, state, and ordered chapter ledger passes validation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-story-'));
  const paths = storyPaths(root);
  fs.mkdirSync(paths.chapters, { recursive: true });
  const context = buildStoryContext(model, { profile: { projectId: 'demo' }, language: 'vi' });
  writeStoryContext(root, context);
  fs.writeFileSync(paths.plot, '# Tổng Cương\n\n## Open Threads\n');
  fs.writeFileSync(path.join(paths.chapters, chapterFilename(1, 'Kiếm ý khai trận')), `---\nschema: ${STORY_CHAPTER_SCHEMA}\nchapter: 1\ntitle: "Kiếm ý khai trận"\nlanguage: vi\nevidence_key: ${context.evidenceKey}\n---\n\n# Chương thứ nhất\n`);
  fs.writeFileSync(paths.state, `${JSON.stringify({
    schema: STORY_STATE_SCHEMA,
    language: 'vi',
    style: 'web-serial',
    lastChapter: 1,
    consumedEvidenceKeys: [context.evidenceKey]
  }, null, 2)}\n`);
  const validation = validateStoryTree(root);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.ok, true);
  assert.equal(validation.chapters, 1);
  assert.equal(nextChapterNumber(root), 2);
});

check('story: gaps and duplicate evidence keys fail validation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-story-bad-'));
  const paths = storyPaths(root);
  fs.mkdirSync(paths.chapters, { recursive: true });
  fs.writeFileSync(paths.plot, '# Plot\n');
  const key = '0123456789abcdef';
  const chapter = (number, title) => `---\nschema: ${STORY_CHAPTER_SCHEMA}\nchapter: ${number}\ntitle: "${title}"\nlanguage: en\nevidence_key: ${key}\n---\n\n# ${title}\n`;
  fs.writeFileSync(path.join(paths.chapters, chapterFilename(1, 'First Seal')), chapter(1, 'First Seal'));
  fs.writeFileSync(path.join(paths.chapters, chapterFilename(3, 'Third Seal')), chapter(3, 'Third Seal'));
  fs.writeFileSync(paths.state, `${JSON.stringify({ schema: STORY_STATE_SCHEMA, lastChapter: 2, consumedEvidenceKeys: [key] })}\n`);
  const validation = validateStoryTree(root);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((e) => e.includes('contiguous')));
  assert.ok(validation.errors.some((e) => e.includes('repeats evidence_key')));
});

check('story: skill requires open-ended prose and localized meaningful names', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const skill = fs.readFileSync(path.resolve(here, '../../../.vibekit/skills/tutien/SKILL.md'), 'utf8');
  const system = fs.readFileSync(path.resolve(here, '../../../.vibekit/skills/tutien/references/story-system.md'), 'utf8');
  const viStyle = fs.readFileSync(path.resolve(here, '../../../.vibekit/skills/tutien/references/vi-style-guide.md'), 'utf8');
  assert.match(skill, /Never assemble the chapter from a fixed sentence bank/);
  assert.match(skill, /current user request as ephemeral direction/);
  assert.match(skill, /Vietnamese \(`vi`\), English \(`en`\), and Simplified Chinese \(`zh`\)/);
  assert.match(system, /meaningful cultivation-style names/i);
  assert.match(system, /sarcastic and maliciously teasing/i);
  assert.match(system, /explicitly open ending/i);
  assert.match(system, /not a scene order or six-slot template/i);
  assert.match(system, /not phrase banks, mandatory beats, or response templates/i);
  assert.match(system, /Chương thứ nhất: Kiếm ý khai trận/);
  assert.match(viStyle, /Chương thứ nhất/);
  assert.match(viStyle, /Không dùng dấu gạch nối ASCII có khoảng trắng ` - `/);
});

check('story: Vietnamese style distinguishes sentence case from proper names', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const viStyle = fs.readFileSync(path.resolve(here, '../../../.vibekit/skills/tutien/references/vi-style-guide.md'), 'utf8');
  assert.match(viStyle, /`Chương thứ nhất: Kiếm ý khai trận`/);
  assert.match(viStyle, /`Lăng Vân trở về Thanh Vân Môn\.`/);
  assert.match(viStyle, /`Lăng Vân thi triển Kiếm Ý Khai Trận\.`/);
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} story checks passed`);
