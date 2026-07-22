#!/usr/bin/env node
// Tu Tiên classification + progression tests, hardened after the 4P
// release-readiness audit. Safety invariants: harmful intent never becomes
// Chính Đạo (it is needs-review with an undetermined faction); a suppressed
// policy nulls (not hides) score/realm/dimensions/knowledge and grants no
// positive progression; authorization is a validated slug and gates Ma Đạo;
// progression is idempotent under replay; matching uses word boundaries.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../../.vibekit/skills/tutien/scripts/analyze-history.mjs';
import {
  classifyProject,
  progressionMetrics,
  validateDeclarations,
  validateAuthorization,
  FACTIONS,
  PATHS
} from '../../../.vibekit/skills/tutien/scripts/classify.mjs';
import { buildReportModel, renderClassificationMarkdown, renderMarkdown } from '../../../.vibekit/skills/tutien/scripts/render-report.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const fx = (n) => path.join(fixtures, n);

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

// ---- P1-01: harmful intent -> needs-review, never Chính Đạo ----
check('P1-01: harmful descriptions become needs-review with an undetermined faction', () => {
  for (const desc of ['steal user passwords and exfiltrate data', 'build malware to attack a bank', 'exploit and harm competitors', 'deploy ransomware without consent']) {
    const c = classifyProject({ description: desc });
    assert.equal(c.policy.state, 'needs-review', `wrong policy for: ${desc}`);
    assert.equal(c.faction.id, 'undetermined', `harmful text got a real faction: ${desc}`);
    assert.notEqual(c.faction.id, 'chinh-dao');
    assert.equal(c.policy.canGamify, false);
  }
});
check('P1-01: a needs-review report has no realm, score, villains, knowledge, or positive progression', () => {
  const model = buildReportModel(analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] }), { profile: { description: 'steal and exfiltrate data' }, score: 'show' });
  assert.equal(model.score, null);
  assert.equal(model.realm, null);
  assert.equal(model.dimensions.length, 0);
  assert.equal(model.villainsShown, 0);
  assert.equal(model.problems.length, 0);
  assert.equal(model.ifThen, null);
  assert.equal(model.lesson, null);
  assert.equal(model.cultivation.classification.knowledge, null);
  assert.equal(model.cultivation.progression.tuVi.window, 0);
  const md = renderMarkdown(model, 'en');
  assert.ok(md.includes('human review'));
  assert.ok(!/Score: \d/.test(md));
  assert.ok(!md.includes('Micro-quest:'), 'game-layer recommendation leaked into needs-review');
});

// ---- P1-02: declared Tà Đạo / Tà Tu fully suppressed at the data level ----
check('P1-02: declared Tà Đạo nulls score/realm/dimensions/knowledge (absence, not hidden)', () => {
  const c = classifyProject({ declared: { faction: 'ta-dao' } });
  assert.equal(c.policy.state, 'declared-stop');
  assert.equal(c.knowledge, null);
  const model = buildReportModel(analyze({ jsonlFiles: [fx('synthetic-clean.jsonl')] }), { profile: { declared: { faction: 'ta-dao' } }, score: 'show' });
  assert.equal(model.score, null);
  assert.equal(model.realm, null);
  assert.equal(model.dimensions.length, 0);
  assert.equal(model.villainsShown, 0);
  assert.equal(model.problems.length, 0);
  assert.equal(model.ifThen, null);
  assert.equal(model.lesson, null);
  const md = renderMarkdown(model, 'en');
  assert.ok(md.includes('not a cultivation path'));
  assert.ok(!/Score: \d/.test(md));
  assert.doesNotMatch(md, /tâm pháp/iu, 'knowledge advice leaked into a stopped report');
  assert.ok(!md.includes('Counter-technique:'), 'problem advice leaked into a stopped report');
});
check('P1-02: a stopped report grants no Tu Vi/Công Đức but still tracks Nghiệp Lực', () => {
  const analysis = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
  const pr = progressionMetrics(analysis, { canGamify: false });
  assert.equal(pr.tuVi.window, 0);
  assert.equal(pr.congDuc.window, 0);
  assert.equal(pr.ngoTinh, null);
  assert.equal(pr.doThuanThuc, null);
  assert.ok(pr.nghiepLuc.window >= 0);
});
check('P1-02: Tà Tu combined with any other path fails closed', () => {
  assert.throws(() => classifyProject({ declared: { paths: ['ta', 'kiem'] } }), /exclusive stop declaration/);
  assert.ok(validateDeclarations({ paths: ['ta', 'huyen'] }).length);
  // ta alone is a valid stop declaration
  assert.equal(classifyProject({ declared: { paths: ['ta'] } }).policy.state, 'declared-stop');
});

// ---- P1-03: authorization validated + gates Ma Đạo ----
check('P1-03: Ma Đạo without authorization is authorization-required and withholds gamification', () => {
  const c = classifyProject({ description: 'red team offensive security engagement' });
  assert.equal(c.faction.id, 'ma-dao');
  assert.equal(c.policy.state, 'authorization-required');
  assert.equal(c.policy.canGamify, false);
});
check('P1-03: a valid authorization slug clears the gate', () => {
  const c = classifyProject({ description: 'red team engagement', authorization: 'client-SOW-2026' });
  assert.equal(c.policy.state, 'clear');
  assert.equal(c.faction.authorization.recorded, true);
  assert.equal(c.faction.authorization.reference, 'client-SOW-2026');
});
check('P1-03: secret-shaped, markup, and URL authorization values are rejected and never rendered', () => {
  for (const bad of ['token=SECRETVALUE', 'https://evil.example/x', '<script>alert(1)</script>', 'a b c', 'x'.repeat(80)]) {
    const v = validateAuthorization(bad);
    assert.equal(v.recorded, false, `accepted bad auth: ${bad}`);
    assert.equal(v.reference, null);
    const md = renderMarkdown(buildReportModel(analyze({ jsonlFiles: [fx('synthetic-clean.jsonl')] }), { profile: { description: 'red team engagement', authorization: bad } }), 'en');
    assert.ok(!md.includes('SECRETVALUE') && !md.includes('<script>') && !md.includes('evil.example'), `auth value leaked: ${bad}`);
  }
});

// ---- P1-04: progression idempotency ----
check('P1-04: replaying identical evidence leaves lifetime metrics unchanged', () => {
  const analysis = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
  const first = progressionMetrics(analysis, { salt: 'p' });
  const second = progressionMetrics(analysis, { prior: first, salt: 'p' });
  assert.equal(second.tuVi.lifetime, first.tuVi.lifetime, 'Tu Vi farmed on replay');
  assert.equal(second.congDuc.lifetime, first.congDuc.lifetime);
  assert.equal(second.nghiepLuc.lifetime, first.nghiepLuc.lifetime);
  assert.equal(second.daoHanh.windows, first.daoHanh.windows, 'Đạo Hạnh farmed on replay');
  assert.equal(second.tuVi.window, 0);
  assert.ok(second.overlap > 0);
});
check('P1-04: a window with one new validated event adds only that contribution', () => {
  const base = analyze({ jsonlFiles: [fx('synthetic-clean.jsonl')] });
  const first = progressionMetrics(base, { salt: 'p' });
  // Same evidence plus one extra passing test event.
  const augmented = JSON.parse(JSON.stringify(base));
  augmented.issues.passes += 1;
  augmented.issues.passEventIds = [...augmented.issues.passEventIds, 'brand-new-pass-id'];
  const second = progressionMetrics(augmented, { prior: first, salt: 'p' });
  assert.equal(second.tuVi.window, 1, 'should add exactly one new pass contribution');
  assert.equal(second.tuVi.lifetime, first.tuVi.lifetime + 1);
  assert.equal(second.daoHanh.windows, first.daoHanh.windows + 1);
});
check('P1-04: overlap is detected and reported', () => {
  const analysis = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
  const first = progressionMetrics(analysis, { salt: 'p' });
  assert.equal(progressionMetrics(analysis, { prior: first, salt: 'p' }).overlap, first.seen.length);
});

// ---- P2-01: word-boundary matching ----
check('P2-01: substring collisions no longer create false paths', () => {
  assert.deepEqual(classifyProject({ description: 'build documentation' }).paths.map((p) => p.id), []);
  assert.deepEqual(classifyProject({ description: 'rapid iteration' }).paths.map((p) => p.id), []);
  assert.deepEqual(classifyProject({ description: 'kitchen recipes' }).paths.map((p) => p.id), []);
  assert.deepEqual(classifyProject({ description: 'metadata glossary' }).paths.map((p) => p.id), []);
});
check('P2-01: real whole-word signals still match', () => {
  assert.ok(classifyProject({ description: 'a data pipeline and a ui design' }).paths.some((p) => p.id === 'dan'));
  assert.ok(classifyProject({ description: 'a data pipeline and a ui design' }).paths.some((p) => p.id === 'huyen'));
});

// ---- security is Ảnh Tu, dual-use, orthogonal affiliation ----
check('authorized security is Ảnh Tu with a dual-use note, not Tà Tu', () => {
  const c = classifyProject({ description: 'authorized penetration test and forensics investigation, osint' });
  assert.ok(c.paths.some((p) => p.id === 'anh'));
  assert.ok(!c.paths.some((p) => p.id === 'ta'));
  assert.equal(c.dualUse, true);
  assert.ok(c.explanation.en.some((l) => l.includes('technical difficulty is not evil')));
});
check('affiliation is orthogonal to faction', () => {
  const solo = classifyProject({ authorsCount: 1, description: 'red team engagement', authorization: 'sow1' });
  assert.equal(solo.affiliation.id, 'tan-tu');
  assert.equal(solo.faction.id, 'ma-dao');
  assert.equal(classifyProject({ authorsCount: 4 }).affiliation.id, 'tong-mon');
});

// ---- P2-04: primary path + Thần Thông ----
check('P2-04: knowledge follows the first declared path, not alphabetical order', () => {
  const c = classifyProject({ declared: { paths: ['huyen-co', 'kiem'] } });
  assert.equal(c.primaryPath, 'huyen-co');
  assert.ok(c.knowledge.thanThong, 'Thần Thông must be produced');
  const md = renderMarkdown(buildReportModel(analyze({ jsonlFiles: [fx('synthetic-clean.jsonl')] }), { profile: { declared: { paths: ['huyen-co', 'kiem'] } } }), 'en');
  assert.ok(md.includes('Thần Thông'));
});

// ---- taxonomy + validation basics ----
check('invalid declarations are rejected', () => {
  assert.ok(validateDeclarations({ faction: 'nope' }).length);
  assert.throws(() => classifyProject({ declared: { faction: 'nope' } }), /unknown faction/);
});
check('every faction and path has a bilingual gloss', () => {
  for (const f of Object.values(FACTIONS)) assert.ok(f.gloss.vi && f.gloss.en);
  for (const p of Object.values(PATHS)) assert.ok(p.gloss.vi && p.gloss.en);
});

check('Vietnamese classification follows sentence case and clean punctuation', () => {
  const classification = classifyProject({
    description: 'creative agent security workflow',
    primaryLanguage: 'js',
    projectType: 'single-repo',
    authorsCount: 2,
    declared: { paths: [] }
  });
  const md = renderClassificationMarkdown(classification, 'vi');
  const prose = md.replace(/`[^`]*`/g, '');
  const proseWithoutListMarkers = prose.replace(/^\s*- /gm, '');
  assert.match(md, /^## Đạo và truyền thừa/m);
  assert.ok(!proseWithoutListMarkers.includes(' - '));
  assert.doesNotMatch(prose, /\b(prompt|workflow|review|engagement|validation|commit|agent|skill)\b/iu);
});
check('progression is deterministic and token-independent', () => {
  const analysis = analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] });
  assert.deepEqual(progressionMetrics(analysis, { salt: 'p' }), progressionMetrics(analysis, { salt: 'p' }));
  const inflated = JSON.parse(JSON.stringify(analysis));
  inflated.tokens.reportedTotal *= 1000;
  assert.deepEqual(progressionMetrics(analysis, { salt: 'p' }), progressionMetrics(inflated, { salt: 'p' }));
});
check('classification section carries no secret from a secret-bearing fixture', () => {
  const md = renderMarkdown(buildReportModel(analyze({ jsonlFiles: [fx('synthetic-repeat-loop.jsonl')] }), { profile: { description: 'coding kit' } }), 'en');
  assert.ok(!md.includes('hunter2') && !md.includes('SECRETVALUE'));
  assert.ok(md.includes('Dao & Lineage') && md.includes('Progression'));
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} classify checks passed`);
