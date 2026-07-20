#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';

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
check('clean: reported tokens exact', () => assert.equal(clean.tokens.reportedTotal, 1700));
check('clean: no unknown turns', () => assert.equal(clean.tokens.unknownTurns, 0));
check('clean: no repetition or retry loops', () => {
  assert.equal(clean.repetition.exactRepeats.length, 0);
  assert.equal(clean.repetition.retryLoopCandidates.length, 0);
});
check('clean: no conflicts or failures', () => {
  assert.equal(clean.conflicts.length, 0);
  assert.equal(clean.issues.failures.length, 0);
});
check('clean: one explicit task, high coverage confidence', () => {
  assert.equal(clean.tasks.length, 1);
  assert.equal(clean.tasks[0].grouping, 'explicit');
  assert.equal(clean.coverage.confidence, 'high');
});

const loop = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
check('loop: whitespace/CRLF variants collapse into one exact group of 3', () => {
  assert.equal(loop.repetition.exactRepeats.length, 1);
  assert.equal(loop.repetition.exactRepeats[0].count, 3);
});
check('loop: near repeat detected for the reworded prompt', () =>
  assert.ok(loop.repetition.nearRepeats.length >= 1));
check('loop: one retry-loop candidate spanning 4 prompts', () => {
  assert.equal(loop.repetition.retryLoopCandidates.length, 1);
  assert.equal(loop.repetition.retryLoopCandidates[0].count, 4);
});
check('loop: failures paired with recoveries', () => {
  assert.equal(loop.issues.failures.length, 2);
  assert.equal(loop.issues.recoveries.length, 2);
});
check('loop: secrets never appear in output', () => {
  const s = JSON.stringify(loop);
  assert.ok(!s.includes('hunter2'), 'url password leaked');
  assert.ok(!s.includes('SECRETVALUE'), 'query token leaked');
  assert.ok(!s.includes('#creds'), 'url fragment leaked');
});
check('loop: no raw prompt text in output', () =>
  assert.ok(!JSON.stringify(loop).includes('login redirect bug')));

const conflict = analyze({ jsonlFiles: [fx('synthetic-conflict.jsonl')] });
check('conflict: one user-user candidate with paired event IDs and confidence', () => {
  assert.equal(conflict.conflicts.length, 1);
  assert.equal(conflict.conflicts[0].category, 'user-user');
  assert.equal(conflict.conflicts[0].eventIds.length, 2);
  assert.equal(conflict.conflicts[0].confidence, 0.6);
});

const stream = analyze({ jsonlFiles: [fx('synthetic-usage-stream.jsonl')] });
check('stream: cumulative counters counted once, not summed', () =>
  assert.equal(stream.tokens.reportedTotal, 300));
check('stream: estimated stays separate from reported', () =>
  assert.equal(stream.tokens.estimatedTotal, 50));
check('stream: turn without usage counted as unknown', () =>
  assert.equal(stream.tokens.unknownTurns, 1));

const transcript = analyze({ transcriptFiles: [fx('synthetic-transcript.txt')] });
check('transcript: turns parsed, tokens unknown, low confidence', () => {
  assert.equal(transcript.coverage.userPrompts, 2);
  assert.equal(transcript.tokens.unknownTurns, 2);
  assert.equal(transcript.tokens.reportedTotal, 0);
  assert.equal(transcript.coverage.confidence, 'low');
});

const all = {
  jsonlFiles: [
    fx('synthetic-clean.jsonl'),
    fx('synthetic-repeat-loop.jsonl'),
    fx('synthetic-conflict.jsonl'),
    fx('synthetic-usage-stream.jsonl')
  ],
  transcriptFiles: [fx('synthetic-transcript.txt')]
};
check('determinism: identical output across runs', () =>
  assert.equal(JSON.stringify(analyze(all)), JSON.stringify(analyze(all))));

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} analyzer checks passed`);
