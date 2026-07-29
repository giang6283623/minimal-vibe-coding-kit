#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';
import { parseInvocation } from '../../../.vibekit/skills/tutien/scripts/command.mjs';
import {
  HUMILIATION_LEVELS,
  humiliationImpliesDuel,
  humiliationProfile,
  normalizeHumiliationLevel
} from '../../../.vibekit/skills/tutien/scripts/humiliation.mjs';
import { buildReportModel } from '../../../.vibekit/skills/tutien/scripts/render-report.mjs';
import { buildResponseBrief } from '../../../.vibekit/skills/tutien/scripts/response-brief.mjs';
import { containsBannedCategory, violatesHardBoundary } from '../../../.vibekit/skills/tutien/scripts/villains.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.resolve(here, '../fixtures/synthetic-repeat-loop.jsonl');
const runner = path.resolve(here, '../../../.vibekit/skills/tutien/scripts/run-tutien.mjs');

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

check('levels: 0 through 10 have complete, distinct abstract profiles', () => {
  assert.equal(HUMILIATION_LEVELS.length, 11);
  assert.deepEqual(HUMILIATION_LEVELS.map((profile) => profile.level), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(new Set(HUMILIATION_LEVELS.map((profile) => profile.key)).size, 11);
  assert.equal(humiliationProfile(10).allowAvatarDefeat, true);
  assert.equal(humiliationProfile(10).allowLossOfFace, true);
  assert.equal(humiliationProfile(0).target, 'none');
});

check('levels: malformed, fractional, negative, and out-of-range values fail closed to 0', () => {
  for (const value of [undefined, '', -1, 11, 3.5, '3.5', '<script>', '01', '1e1']) {
    assert.equal(normalizeHumiliationLevel(value), 0, String(value));
  }
  for (let level = 0; level <= 10; level += 1) {
    assert.equal(normalizeHumiliationLevel(level), level);
    assert.equal(normalizeHumiliationLevel(String(level)), level);
  }
});

check('command: parses the levels action and explicit level 10', () => {
  const levels = parseInvocation('levels');
  assert.equal(levels.action, 'levels');
  const selected = parseInvocation('on humiliation=10');
  assert.equal(selected.options.humiliation, 10);
  assert.ok(selected.providedOptions.includes('humiliation'));
  assert.equal(humiliationImpliesDuel(selected.options.humiliation), true);
});

const loop = analyze({ jsonlFiles: [fixture] });

check('model: level 10 implies duel and reaches the response brief when evidence supports a villain', () => {
  const model = buildReportModel(loop, { tone: 'spirited', banter: 'flaw', humiliation: 10 });
  assert.equal(model.banterMode, 'duel');
  assert.equal(model.humiliationLevel, 10);
  assert.equal(model.humiliationProfile.key, 'total-theatrical-rout');
  assert.ok(model.villainCards.length > 0);
  assert.ok(model.villainCards.every((card) => card.humiliation.level === 10));
  assert.ok(model.villainCards.every((card) => card.target === 'fictional-cultivation-avatar-and-evidenced-action'));
  const brief = buildResponseBrief(model, { language: 'vi' });
  assert.equal(brief.composition.humiliationLevel, 10);
  assert.equal(brief.composition.humiliationContract.consent, 'explicit-current-session');
  assert.equal(brief.composition.humiliationContract.allowAvatarDefeat, true);
  assert.equal(brief.composition.humiliationContract.allowLossOfFace, true);
  assert.equal(brief.composition.humiliationContract.hardBoundary, 'never-real-person-protected-trait-vulnerability-threat-or-private-data');
  assert.equal(brief.composition.roleAddress.visibleSecondPerson, 'đạo hữu');
  assert.equal(brief.composition.roleAddress.internalTargetLabels, 'metadata-only-never-render-as-addressee');
  assert.ok(brief.composition.roleAddress.forbiddenVisibleAddresseeLabels.includes('vai tu sĩ hư cấu'));
  assert.ok(brief.findings.some((finding) => finding.villain?.humiliation?.level === 10));
});

check('brief: role address is language-natural while internal labels remain non-renderable', () => {
  const model = buildReportModel(loop, { tone: 'spirited', humiliation: 10 });
  const vi = buildResponseBrief(model, { language: 'vi' }).composition.roleAddress;
  const en = buildResponseBrief(model, { language: 'en' }).composition.roleAddress;
  assert.equal(vi.visibleSecondPerson, 'đạo hữu');
  assert.equal(en.visibleSecondPerson, 'you');
  assert.equal(vi.establishedInWorldTitleMayOverride, true);
  assert.equal(en.establishedInWorldTitleMayOverride, true);
  assert.equal(vi.setupExplanationException, 'control-and-safety-explanations-only');
  assert.equal(en.setupExplanationException, 'control-and-safety-explanations-only');
});

check('model: suppression gates force effective level 0', () => {
  const noVillains = buildReportModel(loop, { tone: 'spirited', villains: 'off', humiliation: 10 });
  const neutral = buildReportModel(loop, { tone: 'neutral', humiliation: 10 });
  const emergency = buildReportModel(loop, { tone: 'spirited', humiliation: 10, signals: { userDistress: true } });
  for (const model of [noVillains, neutral, emergency]) {
    assert.equal(model.humiliationLevel, 0);
    assert.equal(model.humiliationProfile.key, 'off');
    assert.equal(model.villainsShown, 0);
  }
});

check('hard boundary: fictional loss of face is allowed while real-person degradation stays blocked', () => {
  assert.equal(violatesHardBoundary('The fictional cultivation avatar loses face after the failed array.'), false);
  assert.equal(containsBannedCategory('đạo hữu thật ngu xuẩn'), true);
  assert.equal(violatesHardBoundary('I will hurt you'), true);
  assert.equal(violatesHardBoundary('your financial failure proves you are worthless'), true);
});

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-humiliation-'));
fs.mkdirSync(path.join(work, '.vibekit'), { recursive: true });
const localFixture = path.join(work, 'export.jsonl');
fs.copyFileSync(fixture, localFixture);

function tutien(args) {
  const result = spawnSync(process.execPath, [runner, ...args.split(' ').filter(Boolean)], {
    cwd: work,
    encoding: 'utf8'
  });
  return { code: result.status, out: `${result.stdout}\n${result.stderr}` };
}

check('state: activation without a level asks and remains fail-closed at level 0', () => {
  const activated = tutien('on language=en');
  assert.equal(activated.code, 0);
  assert.match(activated.out, /Choose fictional-avatar humiliation from level 0 through 10/);
  assert.match(activated.out, /10 total theatrical rout/);
  const status = tutien('status language=en');
  assert.match(status.out, /fictional-avatar humiliation: 0\/10 \(not selected, effective 0\)/);
});

check('state: the levels action exposes the complete choice while active', () => {
  const result = tutien('levels language=en');
  assert.equal(result.code, 0);
  assert.match(result.out, /0 off/);
  assert.match(result.out, /5 sect reprimand/);
  assert.match(result.out, /10 total theatrical rout/);
});

check('state: explicit level 10 persists into analysis and its brief', () => {
  const selected = tutien('on humiliation=10 language=en');
  assert.equal(selected.code, 0);
  assert.match(selected.out, /Selected fictional-avatar humiliation: 10\/10/);
  assert.match(tutien('status language=en').out, /fictional-avatar humiliation: 10\/10 \(selected\)/);
  assert.match(tutien('status language=en').out, /banter mode: duel/);

  const preview = tutien(`preview language=en sources=${localFixture}`);
  const token = preview.out.match(/approve=([0-9a-f]{16})/)?.[1];
  assert.ok(token);
  const analyzed = tutien(`analyze language=en approve=${token} sources=${localFixture} story=off`);
  assert.equal(analyzed.code, 0);
  const brief = JSON.parse(fs.readFileSync(path.join(work, '.vibekit/reports/tutien/latest-brief.json'), 'utf8'));
  assert.equal(brief.composition.humiliationLevel, 10);
  assert.equal(brief.composition.humiliationContract.key, 'total-theatrical-rout');
});

check('state: invalid selection fails closed and off clears consent immediately', () => {
  assert.equal(tutien('on humiliation=11 language=en').code, 0);
  assert.match(tutien('status language=en').out, /fictional-avatar humiliation: 0\/10 \(selected\)/);
  assert.equal(tutien('off language=en').code, 0);
  const state = JSON.parse(fs.readFileSync(path.join(work, '.vibekit/reports/tutien/state.json'), 'utf8'));
  assert.equal(state.humiliationLevel, 0);
  assert.equal(state.humiliationSelected, false);
  assert.equal(state.banterMode, 'flaw');
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} humiliation checks passed`);
