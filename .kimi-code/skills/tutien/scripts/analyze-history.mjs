#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseJsonl } from './adapters/generic-jsonl.mjs';
import { parseTranscript } from './adapters/plain-transcript.mjs';
import { readGitEvents } from './adapters/git.mjs';
import { normalizeEvents } from './normalize-events.mjs';
import {
  groupTasks,
  repetitionMetrics,
  conflictCandidates,
  issueMetrics,
  tokenMetrics,
  coverageMetrics
} from './metrics.mjs';

// Phase 1 analyzer: deterministic, read-only, machine-readable JSON only.
// The output contains digests and event IDs, never prompt text.
export function analyze({ jsonlFiles = [], transcriptFiles = [], gitRoot = null, gapMinutes = 60 } = {}) {
  const notes = [];
  let raw = [];
  // The source tag is forced per adapter batch here; export content cannot
  // spoof it (the JSONL validator additionally rejects reserved fields).
  for (const file of jsonlFiles) {
    raw = raw.concat(
      parseJsonl(fs.readFileSync(file, 'utf8'), path.basename(file)).map((e) => ({ ...e, __source: 'generic-jsonl' }))
    );
  }
  for (const file of transcriptFiles) {
    const { events, warnings } = parseTranscript(fs.readFileSync(file, 'utf8'));
    raw = raw.concat(events.map((e) => ({ ...e, __source: 'transcript' })));
    notes.push(...warnings.map((w) => `${path.basename(file)}: ${w}`));
  }
  if (gitRoot) raw = raw.concat(readGitEvents(gitRoot).map((e) => ({ ...e, __source: 'git' })));

  const events = normalizeEvents(raw);
  const tasks = groupTasks(events, { gapMinutes });
  const taskKeyByEvent = new Map();
  for (const t of tasks) for (const id of t.eventIds) taskKeyByEvent.set(id, t.taskId);
  const tokens = tokenMetrics(events);
  return {
    schemaVersion: 1,
    eventsAnalyzed: events.length,
    coverage: coverageMetrics(events, tasks, tokens),
    tokens,
    tasks: tasks.map((t) => ({
      taskId: t.taskId,
      sessionId: t.sessionId,
      grouping: t.grouping,
      confidence: t.confidence,
      eventCount: t.eventIds.length
    })),
    commitEventIds: events.filter((e) => e.eventType === 'commit').map((e) => e.eventId),
    repetition: repetitionMetrics(events, tasks),
    conflicts: conflictCandidates(events, tasks),
    issues: issueMetrics(events, taskKeyByEvent),
    notes
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const spec = { jsonlFiles: [], transcriptFiles: [], gitRoot: null, gapMinutes: 60 };
  let out = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--jsonl') spec.jsonlFiles.push(args[++i]);
    else if (a === '--transcript') spec.transcriptFiles.push(args[++i]);
    else if (a === '--git') spec.gitRoot = args[++i];
    else if (a === '--gap-minutes') spec.gapMinutes = Number(args[++i]);
    else if (a === '--out') out = args[++i];
    else {
      console.error(`Unknown argument: ${a}`);
      console.error('Usage: analyze-history.mjs [--jsonl f]... [--transcript f]... [--git dir] [--gap-minutes n] [--out f]');
      process.exit(2);
    }
  }
  const json = JSON.stringify(analyze(spec), null, 2);
  if (out) fs.writeFileSync(out, `${json}\n`);
  else console.log(json);
}
