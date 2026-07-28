#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  sanitizeLabel,
  parseLedger,
  assertAcyclic,
  criticalPath,
  renderMermaid,
  renderAscii
} from '../../../.vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, '..', 'fixtures');
const rendererPath = path.join(here, '../../../.vibekit/skills/graph-engineering-verified-orchestration/scripts/render-graph.mjs');

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

const raw = fs.readFileSync(path.join(fixtures, 'sample-graph.json'), 'utf8');
const ledger = parseLedger(raw);

// ---- input validation ----
check('parseLedger: accepts the sample fixture', () => {
  assert.equal(ledger.nodes.length, 6);
  assert.equal(ledger.edges.length, 7);
});
check('parseLedger: rejects malformed JSON', () =>
  assert.throws(() => parseLedger('{nope'), /invalid JSON/));
check('parseLedger: rejects missing nodes array', () =>
  assert.throws(() => parseLedger('{"edges":[]}'), /nodes/));
check('parseLedger: rejects duplicate node ids', () =>
  assert.throws(() => parseLedger('{"nodes":[{"id":"A"},{"id":"A"}]}'), /duplicate/));
check('parseLedger: rejects edges to unknown nodes', () =>
  assert.throws(() => parseLedger('{"nodes":[{"id":"A"}],"edges":[{"from":"A","to":"B"}]}'), /unknown node/));

// ---- cycle guard ----
check('assertAcyclic: accepts the DAG fixture', () => assertAcyclic(ledger.nodes, ledger.edges));
check('assertAcyclic: rejects a cycle and prints its path', () => {
  const nodes = [{ id: 'A' }, { id: 'B' }];
  const edges = [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }];
  assert.throws(() => assertAcyclic(nodes, edges), /cycle: A -> B -> A/);
});

// ---- label sanitization follows the writing-style rule ----
check('sanitizeLabel: strips emoji and em/en dashes', () =>
  assert.equal(sanitizeLabel('ship it — now 🚀 ok'), 'ship it - now ok'));
check('sanitizeLabel: caps long labels', () =>
  assert.equal(sanitizeLabel('x'.repeat(100)).length, 60));

// ---- mermaid output ----
const mermaid = renderMermaid(ledger);
check('mermaid: emits a styled flowchart with kit theme', () => {
  assert.match(mermaid, /flowchart TD/);
  assert.match(mermaid, /edgeLabelBackground: "#FFFFFF"/);
  assert.match(mermaid, /classDef success/);
});
check('mermaid: waves become subgraphs', () => assert.match(mermaid, /subgraph Wave2\["Wave 2"\]/));
check('mermaid: edges carry artifact labels', () =>
  assert.match(mermaid, /N1 -->\|"blind-spot report"\| N2/));
check('mermaid: statuses map to classes', () => {
  assert.match(mermaid, /class N1,N2 success/);
  assert.match(mermaid, /class N3 accent/);
  assert.match(mermaid, /class N6 danger/);
});

// ---- ascii output ----
const ascii = renderAscii(ledger);
check('ascii: shows goal, waves, markers, edges, critical path', () => {
  assert.match(ascii, /goal: Close skill blind spots/);
  assert.match(ascii, /wave 2/);
  assert.match(ascii, /\[ok\s*\] N1 blind-spot report R0/);
  assert.match(ascii, /\[block\] N6 final verification/);
  assert.match(ascii, /N3 -> N5 \(artifact: viz contract\)/);
  assert.match(ascii, /critical path: N1 -> N3 -> N5 -> N6/);
});
check('ascii: contains no emoji or em/en dashes', () =>
  assert.equal(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u2013\u2014]/u.test(ascii), false));

// ---- determinism ----
check('renderer is deterministic', () => {
  assert.equal(renderMermaid(parseLedger(raw)), mermaid);
  assert.equal(renderAscii(parseLedger(raw)), ascii);
});

// ---- CLI behavior ----
check('CLI: renders both formats by default', () => {
  const run = spawnSync(process.execPath, [rendererPath, path.join(fixtures, 'sample-graph.json')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /flowchart TD/);
  assert.match(run.stdout, /critical path:/);
});
check('CLI: --format=ascii prints only the ascii view', () => {
  const run = spawnSync(process.execPath, [rendererPath, path.join(fixtures, 'sample-graph.json'), '--format=ascii'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout.includes('flowchart TD'), false);
  assert.match(run.stdout, /wave 2/);
});
check('CLI: cyclic input exits non-zero', () => {
  const cyclic = path.join(fixtures, 'cyclic-graph.json');
  fs.writeFileSync(cyclic, '{"nodes":[{"id":"A"},{"id":"B"}],"edges":[{"from":"A","to":"B"},{"from":"B","to":"A"}]}');
  try {
    const run = spawnSync(process.execPath, [rendererPath, cyclic], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /cycle/);
  } finally {
    fs.rmSync(cyclic, { force: true });
  }
});

console.log(`\nrender-graph: ${passed} checks passed`);
