#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseInvocation, TUTIEN_EXPERIENCE } from './command.mjs';
import { analyze } from './analyze-history.mjs';
import { renderReport, resolveLanguage, renderClassificationMarkdown } from './render-report.mjs';
import { buildSnapshot, snapshotsToPrune } from './snapshot.mjs';
import { compareSnapshots } from './compare.mjs';
import { classifyProject } from './classify.mjs';

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

function classifySources(sources) {
  const spec = { jsonlFiles: [], transcriptFiles: [], gitRoot: null };
  for (const s of sources) {
    if (s === 'git') spec.gitRoot = root;
    else if (s.endsWith('.jsonl')) spec.jsonlFiles.push(s);
    else spec.transcriptFiles.push(s);
  }
  return spec;
}

const scopeToken = (sources, range) => sha16(JSON.stringify({ sources: [...sources].sort(), range }));

// Project profile for classification: repo metadata only (backbone.yml
// fields plus a distinct-commit-author COUNT — no names or emails are kept)
// merged with explicit declarations from the invocation.
function repoProfile(options) {
  let description = null;
  let primaryLanguage = null;
  let projectType = null;
  try {
    const text = fs.readFileSync(path.join(root, 'backbone.yml'), 'utf8');
    const grab = (re) => {
      const m = text.match(re);
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
    };
    description = grab(/^\s*description:\s*(.+)$/m);
    primaryLanguage = grab(/^\s*primary_language:\s*(.+)$/m);
    projectType = grab(/^\s*type:\s*(.+)$/m);
  } catch {}
  // Author identifiers are read transiently (mailmap-collapsed) and reduced to
  // a distinct COUNT immediately; no email or name is retained or returned.
  let authorsCount = null;
  const res = spawnSync('git', ['log', '--use-mailmap', '--format=%aE'], { cwd: root, encoding: 'utf8' });
  if (res.status === 0) authorsCount = new Set(res.stdout.split('\n').filter(Boolean)).size;
  return {
    description,
    primaryLanguage,
    projectType,
    domains: options.domains ?? [],
    authorization: options.authorization ?? null,
    authorsCount,
    declared: { faction: options.faction, affiliation: options.affiliation, paths: options.paths }
  };
}

// Preview inspects no content: file existence and size only, plus the git
// toplevel path. Nothing is parsed and nothing is written except the pending
// approval in the state file.
function previewLines(options) {
  const lines = ['tutien preview — the observatory is open, but no scroll has been read; nothing is analyzed until this exact scope is approved.'];
  if (options.sources.length === 0) lines.push('- (no sources; pass sources=git,/path/to/export.jsonl)');
  for (const s of options.sources) {
    if (s === 'git') {
      lines.push(`- git: commit metadata of ${root} (read-only git log, current repository only)`);
    } else {
      let size = null;
      try {
        size = fs.statSync(s).size;
      } catch {}
      lines.push(size == null ? `- file: ${s} (NOT FOUND)` : `- file: ${s} (${size} bytes)`);
    }
  }
  lines.push(`- range: ${options.range}`);
  const token = scopeToken(options.sources, options.range);
  lines.push(`To approve exactly this scope: analyze approve=${token} sources=${options.sources.join(',')}`);
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

export function run(argsString = '') {
  const { action, explicitAction, options } = parseInvocation(argsString);
  const state = loadState();
  const refuse = (msg) => ({ code: 2, out: [msg] });

  if (action === 'off') {
    state.mode = 'off';
    delete state.pendingApproval;
    saveState(state);
    return { code: 0, out: ['Tutien mode is off. Normal kit writing style restored.'] };
  }
  if (action === 'on') {
    state.mode = 'on';
    saveState(state);
    return { code: 0, out: ['Tutien mode is on — the mountain gate is open. Run preview to see the exact scope before any analysis.'] };
  }
  if (action === 'status') {
    const snaps = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).length : 0;
    return {
      code: 0,
      out: [
        `mode: ${state.mode ?? 'off'}`,
        `experience: ${TUTIEN_EXPERIENCE.kind}`,
        `voice: ${TUTIEN_EXPERIENCE.narrativeStyle}`,
        `semantic namespace: ${TUTIEN_EXPERIENCE.semanticNamespace}`,
        `pending approval: ${state.pendingApproval ?? 'none'}`,
        `snapshots: ${snaps}`
      ]
    };
  }

  // Report actions. A bare `/tutien` re-activates the mode; an explicit
  // report action while off is refused (off-mode suppression).
  if ((state.mode ?? 'off') !== 'on') {
    if (explicitAction) return refuse("tutien mode is off; run 'on' (or bare /tutien) first.");
    state.mode = 'on';
  }

  if (action === 'preview') {
    const { lines, token } = previewLines(options);
    state.pendingApproval = token;
    saveState(state);
    return { code: 0, out: lines };
  }

  if (action === 'classify') {
    // classify is a metadata-only action (no history content): it reads
    // backbone.yml fields and a transient distinct-author count of the current
    // repo. It states that scope before producing the classification.
    let classification;
    try {
      classification = classifyProject(repoProfile(options));
    } catch (err) {
      return refuse(err.message);
    }
    saveState(state);
    const language = resolveLanguage(options.language, { invocationText: argsString });
    const scope = language === 'vi'
      ? 'Phạm vi classify: chỉ đọc metadata (backbone.yml + số lượng tác giả commit của repo hiện tại) — không đọc nội dung lịch sử, không tính tiến cảnh (tiến cảnh cần `analyze`).'
      : 'classify scope: metadata only (backbone.yml + a distinct commit-author count of the current repo) — no history content is read, and no progression is computed (progression needs `analyze`).';
    return { code: 0, out: [scope, '', renderClassificationMarkdown(classification, language)] };
  }

  if (action === 'explain') {
    if (options.metric && EXPLAIN[options.metric]) {
      return { code: 0, out: [`A note from the Dao ledger — ${options.metric}: ${EXPLAIN[options.metric]}`] };
    }
    return { code: 0, out: [`The Dao ledger can explain: ${Object.keys(EXPLAIN).join(', ')} (pass metric=<name>).`] };
  }

  if (action === 'compare') {
    const files = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')).sort() : [];
    if (files.length < 2) return refuse('need at least two snapshots to compare; run analyze snapshot=true first.');
    const load = (f) => JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'));
    const result = compareSnapshots(load(files[files.length - 2]), load(files[files.length - 1]));
    return {
      code: 0,
      out: ['Two cultivation records rest beneath the same lamp; the figures below show only what changed.', JSON.stringify(result, null, 2)]
    };
  }

  if (action === 'analyze') {
    const token = scopeToken(options.sources, options.range);
    if (!options.approve) {
      return refuse('analysis requires explicit approval: run preview, then pass the approve=<token> it printed.');
    }
    if (options.approve !== token || state.pendingApproval !== token) {
      return refuse('approval token does not match the previewed scope; run preview again and approve that exact scope.');
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
      out.push(`snapshot written: ${path.relative(root, file)}`);
      const prune = snapshotsToPrune(fs.readdirSync(snapDir).filter((f) => f.endsWith('.json')), 20);
      if (prune.length) {
        out.push(`retention: remove old snapshots with: trash ${prune.map((f) => path.relative(root, path.join(snapDir, f))).join(' ')}`);
      }
    }
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, 'latest.md'), `${markdown}\n`);
    saveState(state);
    return { code: 0, out: [...out, markdown] };
  }

  return refuse(`unknown action "${action}"`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const res = run(process.argv.slice(2).join(' '));
  for (const line of res.out) console.log(line);
  process.exit(res.code);
}
