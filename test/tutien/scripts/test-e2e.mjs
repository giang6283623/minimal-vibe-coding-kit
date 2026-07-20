#!/usr/bin/env node
// Subprocess-level end-to-end tests for the /tutien runner: every advertised
// action, the preview -> approval -> analyze boundary, and off-mode
// suppression — exercised through a real `node run-tutien.mjs` process in an
// isolated working directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.resolve(here, '../../../.vibekit/skills/tutien/scripts/run-tutien.mjs');
const fixture = path.resolve(here, '../fixtures/synthetic-repeat-loop.jsonl');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tutien-e2e-'));
fs.mkdirSync(path.join(work, '.vibekit'), { recursive: true });
const localFixture = path.join(work, 'export.jsonl');
fs.copyFileSync(fixture, localFixture);

function tutien(args) {
  const res = spawnSync(process.execPath, [runner, ...args.split(' ').filter(Boolean)], {
    cwd: work,
    encoding: 'utf8'
  });
  return { code: res.status, out: `${res.stdout}\n${res.stderr}` };
}

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

const src = `sources=${localFixture}`;

// off-mode suppression: explicit report actions are refused while off.
check('e2e: explicit action while mode is off is refused', () => {
  const r = tutien(`preview ${src}`);
  assert.equal(r.code, 2);
  assert.match(r.out, /mode is off/);
});
check('e2e: bare invocation re-activates the mode and previews', () => {
  const r = tutien(src);
  assert.equal(r.code, 0);
  assert.match(r.out, /tutien preview/);
  assert.match(r.out, /approve=[0-9a-f]{16}/);
});
check('e2e: status reports the mode and pending approval', () => {
  const r = tutien('status');
  assert.equal(r.code, 0);
  assert.match(r.out, /mode: on/);
  assert.match(r.out, /pending approval: [0-9a-f]{16}/);
});

// approval boundary
check('e2e: analyze without approval is refused', () => {
  const r = tutien(`analyze ${src}`);
  assert.equal(r.code, 2);
  assert.match(r.out, /requires explicit approval/);
});
check('e2e: analyze with a wrong token is refused', () => {
  const r = tutien(`analyze approve=0000000000000000 ${src}`);
  assert.equal(r.code, 2);
  assert.match(r.out, /does not match the previewed scope/);
});
let token = null;
check('e2e: preview prints a scope token and file sizes without reading content', () => {
  const r = tutien(`preview ${src}`);
  assert.equal(r.code, 0);
  assert.match(r.out, /bytes\)/);
  token = r.out.match(/approve=([0-9a-f]{16})/)?.[1];
  assert.ok(token, 'no token printed');
});
check('e2e: analyze with the previewed token renders the report and writes a snapshot', () => {
  const r = tutien(`analyze approve=${token} ${src} snapshot=true language=en score=show`);
  assert.equal(r.code, 0);
  assert.match(r.out, /Cultivation Chronicle/);
  assert.match(r.out, /snapshot written:/);
  const snaps = fs.readdirSync(path.join(work, '.vibekit/reports/tutien/snapshots'));
  assert.equal(snaps.length, 1);
  const snap = fs.readFileSync(path.join(work, '.vibekit/reports/tutien/snapshots', snaps[0]), 'utf8');
  assert.ok(!snap.includes('hunter2') && !snap.includes('SECRETVALUE'), 'secret leaked into snapshot');
  assert.ok(fs.existsSync(path.join(work, '.vibekit/reports/tutien/latest.md')));
});
check('e2e: an approval token is single-use', () => {
  const r = tutien(`analyze approve=${token} ${src}`);
  assert.equal(r.code, 2);
  assert.match(r.out, /does not match the previewed scope/);
});

// compare + explain
check('e2e: compare needs two snapshots, then reports a trend', () => {
  assert.equal(tutien('compare').code, 2);
  const p = tutien(`preview ${src}`);
  const t2 = p.out.match(/approve=([0-9a-f]{16})/)[1];
  assert.equal(tutien(`analyze approve=${t2} ${src} snapshot=true`).code, 0);
  const r = tutien('compare');
  assert.equal(r.code, 0);
  assert.match(r.out, /"trend"/);
});
check('e2e: explain describes a metric formula', () => {
  const r = tutien('explain metric=reportedTotal');
  assert.equal(r.code, 0);
  assert.match(r.out, /counted once/);
});
check('e2e: classify prints a Dao & Lineage classification', () => {
  const r = tutien('classify paths=kiem language=en');
  assert.equal(r.code, 0);
  assert.match(r.out, /Dao & Lineage/);
  assert.match(r.out, /Faction:/);
  assert.match(r.out, /Cultivation paths:/);
});
check('e2e: a declared Tà Đạo classification refuses to gamify', () => {
  const r = tutien('classify faction=ta-dao language=en');
  assert.equal(r.code, 0);
  assert.match(r.out, /not a cultivation path/);
});
check('e2e: an invalid declared faction is refused', () => {
  const r = tutien('classify faction=bogus');
  assert.equal(r.code, 2);
  assert.match(r.out, /unknown faction/);
});

// off again
check('e2e: off disables the mode and suppresses later explicit actions', () => {
  assert.match(tutien('off').out, /mode is off/);
  const r = tutien(`analyze approve=deadbeefdeadbeef ${src}`);
  assert.equal(r.code, 2);
  assert.match(r.out, /mode is off/);
});
check('e2e: a natural end request clears approval and restores normal kit style', () => {
  assert.equal(tutien('on').code, 0);
  assert.equal(tutien(`preview ${src}`).code, 0);
  const stopped = tutien('please end tutien mode');
  assert.equal(stopped.code, 0);
  assert.match(stopped.out, /Normal kit writing style restored/);
  const status = tutien('status');
  assert.match(status.out, /mode: off/);
  assert.match(status.out, /pending approval: none/);
});

console.log(process.exitCode ? 'RESULT: failures above' : `RESULT: all ${passed} e2e checks passed`);
