#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';
import { detectProblems, CATALOG } from '../../../.vibekit/skills/tutien/scripts/catalog.mjs';
import {
  buildVillains,
  containsBannedCategory,
  sanitizeContext,
  villainSeed,
  VILLAIN_THRESHOLD
} from '../../../.vibekit/skills/tutien/scripts/villains.mjs';
import { renderReport, buildReportModel } from '../../../.vibekit/skills/tutien/scripts/render-report.mjs';

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

const P = (problemId, confidence, priority) => ({
  problemId,
  confidence,
  priority,
  evidence: { eventIds: ['deadbeefdeadbeef'] },
  meta: CATALOG[problemId]
});

const crafted = [
  P('repeated-failure', 0.85, 0.3),
  P('conflicting-instructions', 0.6, 0.2), // below threshold
  P('too-many-prompts', 0.82, 0.25),
  P('unrecovered-failure', 0.81, 0.2),
  P('work-without-proof', 0.9, 0.1)
];

// ---- threshold + caps ----
check('threshold: a below-threshold problem never becomes a villain', () => {
  const { villains } = buildVillains(crafted, { tone: 'serene' });
  assert.ok(!villains.some((v) => v.problemId === 'conflicting-instructions'));
});
check('caps: at most one boss and two minors (3 total) even with 4 eligible', () => {
  const { villains } = buildVillains(crafted, { tone: 'serene' });
  assert.equal(villains.length, 3);
  assert.equal(villains.filter((v) => v.role === 'boss').length, 1);
  assert.equal(villains.filter((v) => v.role === 'minor').length, 2);
});
check('caps: boss is the highest-priority eligible villain', () => {
  const { villains } = buildVillains(crafted, { tone: 'serene' });
  assert.equal(villains[0].role, 'boss');
  assert.equal(villains[0].problemId, 'repeated-failure');
});

// ---- suppression modes ----
check('villains=off suppresses all villains', () =>
  assert.equal(buildVillains(crafted, { villains: 'off' }).villains.length, 0));
check('tone=neutral suppresses all villains', () =>
  assert.equal(buildVillains(crafted, { tone: 'neutral' }).villains.length, 0));
check('emergency signal suppresses all villains', () =>
  assert.equal(buildVillains(crafted, { tone: 'spirited', emergency: true }).villains.length, 0));

// ---- determinism + seed affects flavor only ----
check('determinism: identical inputs produce identical cards', () => {
  const a = buildVillains(crafted, { tone: 'gentle', seedInputs: { projectId: 'x', window: 'w', schemaVersion: 1 } });
  const b = buildVillains(crafted, { tone: 'gentle', seedInputs: { projectId: 'x', window: 'w', schemaVersion: 1 } });
  assert.deepEqual(a, b);
});
check('seed changes wording only — evidence, quest, victory stay identical', () => {
  const a = buildVillains(crafted, { tone: 'spirited', seedInputs: { projectId: 'aaaa', window: 'w1', schemaVersion: 1 } }).villains;
  const b = buildVillains(crafted, { tone: 'spirited', seedInputs: { projectId: 'zzzz', window: 'w9', schemaVersion: 9 } }).villains;
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i].problemId, b[i].problemId);
    assert.equal(a[i].role, b[i].role);
    assert.deepEqual(a[i].evidenceRefs, b[i].evidenceRefs);
    assert.deepEqual(a[i].microQuest, b[i].microQuest);
    assert.deepEqual(a[i].victory, b[i].victory);
    assert.deepEqual(a[i].rebuttal, b[i].rebuttal);
  }
});
check('seed helper is a stable 64-hex digest', () =>
  assert.match(villainSeed({ projectId: 'r', window: 'all', schemaVersion: 1 }), /^[0-9a-f]{64}$/));

// ---- cooldown ----
check('cooldown: an unworsened villain still cooling down is suppressed', () => {
  const { villains } = buildVillains([P('repeated-failure', 0.85, 0.3)], {
    tone: 'gentle',
    priorVillains: [{ problemId: 'repeated-failure', windowsRemaining: 2, priority: 0.3 }]
  });
  assert.equal(villains.length, 0);
});
check('cooldown: a worsened villain reappears despite cooldown', () => {
  const { villains } = buildVillains([P('repeated-failure', 0.85, 0.45)], {
    tone: 'gentle',
    priorVillains: [{ problemId: 'repeated-failure', windowsRemaining: 2, priority: 0.3 }]
  });
  assert.equal(villains.length, 1);
});

// ---- safety guards ----
check('banned-category guard catches attacks, passes safe taunts', () => {
  assert.ok(containsBannedCategory('you are incompetent and stupid'));
  assert.ok(containsBannedCategory('tẩu hỏa nhập ma'));
  assert.ok(!containsBannedCategory('The Error-Reincarnation Fiend fed on a repeated retry.'));
});
check('every emitted challenge line passes the banned-category guard', () => {
  for (const tone of ['serene', 'spirited']) {
    for (const v of buildVillains(crafted, { tone }).villains) {
      assert.ok(!containsBannedCategory(v.challenge.vi));
      assert.ok(!containsBannedCategory(v.challenge.en));
    }
  }
});
check('sanitizeContext keeps allowlisted slugs, drops everything else', () => {
  const c = sanitizeContext({
    primaryLanguage: 'js',
    fileCategory: 'skill',
    rawPrompt: 'fix the login bug for user@corp',
    email: 'a@b.com',
    projectType: 'has spaces so dropped'
  });
  assert.deepEqual(c, { primaryLanguage: 'js', fileCategory: 'skill' });
});
check('cards carry evidence refs, rebuttal, micro-quest, and victory', () => {
  for (const v of buildVillains(crafted, { tone: 'serene' }).villains) {
    assert.ok(v.evidenceRefs.length >= 1);
    assert.ok(v.rebuttal && v.microQuest && v.victory);
  }
});

// ---- integration over real (secret-bearing) fixture ----
const loop = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
const conflict = analyze({ jsonlFiles: [fx('synthetic-conflict.jsonl')] });

check('integration: high-confidence explicit-task loop yields a boss villain', () => {
  const { villains } = buildVillains(detectProblems(loop), { tone: 'serene' });
  assert.ok(villains.length >= 1);
  assert.equal(villains[0].role, 'boss');
});
check('integration: no secret or raw prompt text appears in any villain card', () => {
  const s = JSON.stringify(buildVillains(detectProblems(loop), { tone: 'spirited' }).villains);
  assert.ok(!s.includes('hunter2'));
  assert.ok(!s.includes('SECRETVALUE'));
  assert.ok(!s.toLowerCase().includes('login redirect bug'));
});
check('integration: low-confidence conflict never gets a villain', () => {
  const { villains } = buildVillains(detectProblems(conflict), { tone: 'serene' });
  assert.equal(villains.length, 0);
});

// ---- rendered report ----
const sereneMd = renderReport(loop, { language: 'en', tone: 'serene' }).markdown;
const offMd = renderReport(loop, { language: 'en', villains: 'off' }).markdown;

check('render: serene report shows the villain and then the evidence', () => {
  assert.ok(sereneMd.includes('Error-Cycle Wraith'));
  const idx = sereneMd.indexOf('Error-Cycle Wraith');
  const after = sereneMd.slice(idx);
  assert.ok(after.indexOf('Evidence:') > 0, 'evidence must follow the taunt');
  assert.ok(after.indexOf('Micro-quest:') > 0, 'micro-quest must follow the taunt');
  assert.ok(after.indexOf('Victory:') > 0, 'victory must follow the taunt');
});
check('render: villains=off shows the plain problem header, no villain name', () => {
  assert.ok(!offMd.includes('Error-Cycle Wraith'));
  assert.ok(offMd.includes('repeated-failure'));
});
check('render: emergency signal forces neutral tone and drops villains', () => {
  const m = buildReportModel(loop, { tone: 'spirited', signals: { secretExposure: true } });
  assert.equal(m.tone, 'neutral');
  assert.equal(m.villainsShown, 0);
});
check('render: sensitive fixture (conflict) shows no villains at any tone', () => {
  const m = buildReportModel(conflict, { tone: 'spicy' });
  assert.equal(m.tone, 'neutral');
  assert.equal(m.villainsShown, 0);
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} villain checks passed`);
void VILLAIN_THRESHOLD;
