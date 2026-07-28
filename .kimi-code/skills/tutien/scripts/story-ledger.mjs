#!/usr/bin/env node
// Deterministic storage helpers for the agent-authored living chronicle.
// This module never generates story prose. It only builds an aggregate-only
// evidence packet and validates the plot/chapter ledger written by the agent.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const STORY_SCHEMA = 1;
export const STORY_CONTEXT_SCHEMA = 'tutien-story-context-v1';
export const STORY_STATE_SCHEMA = 'tutien-story-state-v1';
export const STORY_CHAPTER_SCHEMA = 'tutien-story-chapter-v1';

const sha16 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);

export function storyPaths(root = process.cwd()) {
  const base = path.join(path.resolve(root), '.vibekit', 'reports', 'tutien', 'story');
  return {
    base,
    plot: path.join(base, 'plot.md'),
    state: path.join(base, 'story-state.json'),
    context: path.join(base, 'latest-context.json'),
    chapters: path.join(base, 'chapters')
  };
}

// Preserve letters from every language, including Han characters. Latin
// scripts are normalized so Vietnamese titles remain readable in filenames.
export function slugifyChapterTitle(title) {
  const raw = String(title ?? '').trim();
  if (!raw) throw new Error('chapter title is required');
  const slug = raw
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('und')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!slug || slug === '.' || slug === '..') throw new Error('chapter title does not produce a safe filename');
  return slug;
}

export function chapterFilename(number, title) {
  if (!Number.isInteger(number) || number < 1 || number > 9999) {
    throw new Error('chapter number must be an integer from 1 to 9999');
  }
  return `${String(number).padStart(4, '0')}-${slugifyChapterTitle(title)}.md`;
}

export function listChapters(root = process.cwd()) {
  const dir = storyPaths(root).chapters;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => /^\d{4}-[\p{L}\p{N}][\p{L}\p{N}-]*\.md$/u.test(file))
    .map((file) => ({ file, number: Number(file.slice(0, 4)), path: path.join(dir, file) }))
    .sort((a, b) => a.number - b.number || a.file.localeCompare(b.file));
}

export function nextChapterNumber(root = process.cwd()) {
  const chapters = listChapters(root);
  return chapters.length ? chapters[chapters.length - 1].number + 1 : 1;
}

export function resolveStoryLanguage(requested = 'auto', invocationText = '', fallback = 'en') {
  const explicit = String(requested).toLowerCase();
  if (['vi', 'en', 'zh'].includes(explicit)) return explicit;
  if (/\p{Script=Han}/u.test(invocationText)) return 'zh';
  if (/[À-ỹĐđ]/u.test(invocationText) || /\b(hãy|giúp|của|và|không|chương|tu tiên)\b/iu.test(invocationText)) return 'vi';
  return ['vi', 'en', 'zh'].includes(fallback) ? fallback : 'en';
}

function safeSlug(value, fallback = null) {
  const text = String(value ?? '');
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(text) ? text : fallback;
}

function safeValidationCommand(value) {
  const text = String(value ?? '');
  return /^(?:npm run|yarn|pnpm|bun run) [A-Za-z0-9][A-Za-z0-9:_-]{0,63}$/.test(text) ? text : null;
}

function storyFacts(model, profile = {}) {
  const cultivation = model.cultivation ?? null;
  const progression = cultivation?.progression ?? null;
  return {
    project: {
      id: safeSlug(profile.projectId, 'repo'),
      type: safeSlug(profile.projectType),
      primaryLanguage: safeSlug(profile.primaryLanguage),
      domains: (profile.domains ?? []).map((v) => safeSlug(v)).filter(Boolean).slice(0, 12),
      stack: (profile.stack ?? []).map((v) => safeSlug(v)).filter(Boolean).slice(0, 12),
      validationCommands: (profile.validationCommands ?? []).map((v) => safeValidationCommand(v)).filter(Boolean).slice(0, 3),
      metadataSources: (profile.metadataSources ?? []).map((v) => safeSlug(String(v).replace(/\.[^.]+$/, ''))).filter(Boolean).slice(0, 12),
      authorsCount: Number.isInteger(profile.authorsCount) && profile.authorsCount >= 0 ? profile.authorsCount : null
    },
    evidence: {
      window: model.coverage?.window ?? { start: null, end: null },
      sessions: model.coverage?.sessions ?? 0,
      prompts: model.coverage?.userPrompts ?? 0,
      commits: model.coverage?.commits ?? 0,
      confidence: model.coverage?.confidence ?? 'low',
      tokens: {
        reported: model.tokens?.reportedTotal ?? 0,
        estimated: model.tokens?.estimatedTotal ?? 0,
        unknownTurns: model.tokens?.unknownTurns ?? 0
      },
      realm: model.realm ? { name: model.realm.name, score: model.score } : null,
      problems: (model.problems ?? []).map((p) => ({
        type: p.problemType,
        confidence: p.confidence,
        priority: p.priority
      })),
      classification: cultivation ? {
        faction: cultivation.classification?.faction?.id ?? null,
        affiliation: cultivation.classification?.affiliation?.id ?? null,
        paths: (cultivation.classification?.paths ?? []).map((p) => p.id)
      } : null,
      progression: progression ? {
        tuVi: progression.tuVi?.window ?? 0,
        congDuc: progression.congDuc?.window ?? 0,
        nghiepLuc: progression.nghiepLuc?.window ?? 0,
        daoHanhWindows: progression.daoHanh?.windows ?? 0,
        overlap: progression.overlap ?? 0
      } : null
    }
  };
}

export function buildStoryContext(model, options = {}) {
  const facts = storyFacts(model, options.profile ?? {});
  const evidenceKey = sha16(JSON.stringify({
    storySchema: STORY_SCHEMA,
    project: facts.project.id,
    range: options.range ?? 'all',
    evidence: facts.evidence
  }));
  return {
    schema: STORY_CONTEXT_SCHEMA,
    storySchema: STORY_SCHEMA,
    evidenceKey,
    language: resolveStoryLanguage(options.language, options.invocationText, options.conversationLanguage),
    style: safeSlug(options.style, 'auto'),
    focus: safeSlug(options.focus, 'balanced'),
    policyState: model.policyState ?? 'clear',
    canWriteChapter: model.suppressGamification !== true,
    ...facts
  };
}

export function writeStoryContext(root, context) {
  if (context?.schema !== STORY_CONTEXT_SCHEMA) throw new Error(`story context must use ${STORY_CONTEXT_SCHEMA}`);
  const paths = storyPaths(root);
  fs.mkdirSync(paths.base, { recursive: true });
  fs.writeFileSync(paths.context, `${JSON.stringify(context, null, 2)}\n`);
  return paths.context;
}

function chapterFrontmatter(text) {
  const match = String(text).match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const get = (key) => match[1].match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? null;
  return {
    schema: get('schema'),
    chapter: Number(get('chapter')),
    title: get('title'),
    evidenceKey: get('evidence_key')
  };
}

export function validateStoryTree(root = process.cwd()) {
  const paths = storyPaths(root);
  const chapters = listChapters(root);
  const errors = [];
  if (chapters.length && !fs.existsSync(paths.plot)) errors.push('plot.md is required when chapters exist');

  let state = null;
  if (fs.existsSync(paths.state)) {
    try {
      state = JSON.parse(fs.readFileSync(paths.state, 'utf8'));
      if (state.schema !== STORY_STATE_SCHEMA) errors.push(`story-state.json must use ${STORY_STATE_SCHEMA}`);
    } catch {
      errors.push('story-state.json must contain valid JSON');
    }
  } else if (chapters.length) {
    errors.push('story-state.json is required when chapters exist');
  }

  const evidenceKeys = new Set();
  for (let i = 0; i < chapters.length; i += 1) {
    const expected = i + 1;
    const item = chapters[i];
    if (item.number !== expected) errors.push(`chapter sequence must be contiguous: expected ${expected}, found ${item.number}`);
    const fm = chapterFrontmatter(fs.readFileSync(item.path, 'utf8'));
    if (!fm) {
      errors.push(`${item.file} is missing YAML frontmatter`);
      continue;
    }
    if (fm.schema !== STORY_CHAPTER_SCHEMA) errors.push(`${item.file} must use ${STORY_CHAPTER_SCHEMA}`);
    if (fm.chapter !== item.number) errors.push(`${item.file} frontmatter chapter must equal ${item.number}`);
    if (!fm.title) errors.push(`${item.file} requires a title`);
    if (!fm.evidenceKey || !/^[0-9a-f]{16}$/.test(fm.evidenceKey)) errors.push(`${item.file} requires a 16-hex evidence_key`);
    else if (evidenceKeys.has(fm.evidenceKey)) errors.push(`${item.file} repeats evidence_key ${fm.evidenceKey}`);
    else evidenceKeys.add(fm.evidenceKey);
  }

  if (state) {
    if (state.lastChapter !== chapters.length) errors.push(`story-state.json lastChapter must equal ${chapters.length}`);
    const consumed = state.consumedEvidenceKeys ?? [];
    if (!Array.isArray(consumed) || consumed.some((key) => !/^[0-9a-f]{16}$/.test(key))) {
      errors.push('story-state.json consumedEvidenceKeys must be an array of 16-hex keys');
    }
    for (const key of evidenceKeys) {
      if (!consumed.includes(key)) errors.push(`story-state.json is missing consumed evidence key ${key}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    chapters: chapters.length,
    nextChapter: chapters.length + 1,
    paths: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, path.relative(path.resolve(root), value)]))
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2] ?? 'status';
  const root = path.resolve(process.argv[3] ?? process.cwd());
  if (!['status', 'validate'].includes(command)) {
    console.error('usage: story-ledger.mjs [status|validate] [repo-root]');
    process.exit(2);
  }
  const result = validateStoryTree(root);
  console.log(JSON.stringify(result, null, 2));
  if (command === 'validate' && !result.ok) process.exit(1);
}
