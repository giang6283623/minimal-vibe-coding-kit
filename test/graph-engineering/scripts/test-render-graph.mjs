#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  sanitizeLabel,
  escapeMermaidText,
  toAsciiText,
  parseLedger,
  assertAcyclic,
  criticalPath,
  topologicalLayers,
  deriveBlockers,
  resolveWidth,
  renderMermaid,
  renderAscii,
  renderAscii3d
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
check('parseLedger: rejects ids that collide after mermaid sanitization', () =>
  assert.throws(() => parseLedger('{"nodes":[{"id":"A-B"},{"id":"A_B"}]}'), /collide after id sanitization/));
check('parseLedger: rejects unsafe or long ids', () => {
  assert.throws(() => parseLedger('{"nodes":[{"id":"not allowed"}]}'), /must use 1-24 ASCII/);
  assert.throws(() => parseLedger(`{"nodes":[{"id":"${'A'.repeat(25)}"}]}`), /must use 1-24 ASCII/);
});
check('parseLedger: rejects unknown status and risk values', () => {
  assert.throws(() => parseLedger('{"nodes":[{"id":"A","status":"unknown"}]}'), /unknown status/);
  assert.throws(() => parseLedger('{"nodes":[{"id":"A","risk":"R9"}]}'), /unknown risk/);
});
check('parseLedger: rejects invalid waves and duplicate edge tuples', () => {
  assert.throws(() => parseLedger('{"nodes":[{"id":"A","wave":0}]}'), /positive integer/);
  assert.throws(
    () => parseLedger('{"nodes":[{"id":"A"},{"id":"B"}],"edges":[{"from":"A","to":"B","artifact":"x"},{"from":"A","to":"B","artifact":"x"}]}'),
    /duplicate edge/
  );
});

// ---- cycle guard ----
check('assertAcyclic: accepts the DAG fixture', () => assertAcyclic(ledger.nodes, ledger.edges));
check('assertAcyclic: rejects a cycle and prints its path', () => {
  const nodes = [{ id: 'A' }, { id: 'B' }];
  const edges = [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }];
  assert.throws(() => assertAcyclic(nodes, edges), /cycle: A -> B -> A/);
});
check('criticalPath: ties use the node id sequence without concatenation collisions', () => {
  const nodes = [{ id: 'AB' }, { id: 'C' }, { id: 'A' }, { id: 'BC' }];
  const edges = [{ from: 'AB', to: 'C' }, { from: 'A', to: 'BC' }];
  assert.deepEqual(criticalPath(nodes, edges), ['A', 'BC']);
  assert.deepEqual(criticalPath([...nodes].reverse(), [...edges].reverse()), ['A', 'BC']);
});
check('topologicalLayers: derives deterministic dependency depth', () =>
  assert.deepEqual(topologicalLayers(ledger.nodes, ledger.edges), [
    ['N1'],
    ['N2', 'N3', 'N4'],
    ['N5'],
    ['N6']
  ]));
check('deriveBlockers: reports explicit and upstream blockers', () =>
  assert.deepEqual(deriveBlockers(ledger.nodes, ledger.edges), [
    { id: 'N5', reasons: ['waiting on N3 (running)', 'waiting on N4 (ready)'] },
    { id: 'N6', reasons: ['status=blocked', 'waiting on N5 (ready)'] }
  ]));

// ---- label sanitization follows the writing-style rule ----
check('sanitizeLabel: strips emoji and em/en dashes', () =>
  assert.equal(sanitizeLabel('ship it — now 🚀 ok'), 'ship it - now ok'));
check('sanitizeLabel: caps long labels', () =>
  assert.equal(sanitizeLabel('x'.repeat(100)).length, 60));
check('sanitizeLabel: strips bidi controls and Mermaid text encodes delimiters', () => {
  assert.equal(sanitizeLabel(`safe\u202Etext`), 'safetext');
  assert.equal(escapeMermaidText('a]-->B[x|y'), 'a&#93;--&gt;B&#91;x&#124;y');
});
check('toAsciiText: preserves meaning with printable ASCII escapes', () => {
  const text = toAsciiText('Đồ thị 中文');
  assert.equal(/[^\x20-\x7E]/.test(text), false);
  assert.match(text, /\\u\{4E2D\}/);
});

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
check('mermaid: uses strict mode and neutralizes crafted label or artifact syntax', () => {
  const crafted = parseLedger(JSON.stringify({
    nodes: [
      { id: 'A', label: 'a]-->N9[accepted' },
      { id: 'B', label: 'target' }
    ],
    edges: [{ from: 'A', to: 'B', artifact: 'x|y' }]
  }));
  const hardened = renderMermaid(crafted);
  assert.match(hardened, /securityLevel: strict/);
  assert.match(hardened, /a&#93;--&gt;N9&#91;accepted/);
  assert.match(hardened, /x&#124;y/);
  assert.equal(hardened.includes('a]-->N9[accepted'), false);
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
check('ascii: loose nodes retain risk metadata', () => {
  const loose = parseLedger('{"nodes":[{"id":"A","label":"loose","risk":"R2"}]}');
  assert.match(renderAscii(loose), /\[pend\s*\] A loose R2/);
});

// ---- ascii 3D topology output ----
const ascii3d = renderAscii3d(ledger, { width: 80 });
check('ascii-3d: renders topological depth and pseudo-3D boxes', () => {
  assert.match(ascii3d, /layout: ascii-3d width=80/);
  assert.match(ascii3d, /depth 0/);
  assert.match(ascii3d, /\| \* \[ok\s*\] N1 blind-spot report R0 W1\s+\|\\/);
  assert.match(ascii3d, /\\_{10,}\\/);
  assert.match(ascii3d, /blind-spot report R0 W1\s+\|\\[\s\S]*depth 1[\s\S]*writing-style rule[\s\S]*\n\n  \+-+/);
});
check('ascii-3d: numbers dependencies and preserves artifacts', () => {
  assert.match(ascii3d, /e02\* N1 -> N3/);
  assert.match(ascii3d, /artifact: viz contract/);
  assert.equal((ascii3d.match(/e05\* N3 -> N5/g) || []).length, 1);
});
check('ascii-3d: reports schedule, blockers, and structural critical path', () => {
  assert.match(ascii3d, /schedule waves/);
  assert.match(ascii3d, /N5: waiting on N3 \(running\); waiting on N4 \(ready\)/);
  assert.match(ascii3d, /critical path: N1 -> N3 -> N5 -> N6/);
});
check('ascii-3d: emits printable ASCII only and respects width', () => {
  assert.equal(/[^\x0A\x20-\x7E]/.test(ascii3d), false);
  assert.equal(ascii3d.split('\n').every((line) => line.length <= 80), true);
});
const compact = renderAscii3d(ledger, { width: 40 });
check('ascii-3d: narrow width uses a wrapped compact fallback without losing edges', () => {
  assert.match(compact, /layout: compact width=40/);
  assert.match(compact, /e07\* N5 -> N6 artifact=docs diff/);
  assert.equal(compact.split('\n').every((line) => line.length <= 40), true);
});
check('resolveWidth: explicit, TTY, and non-TTY behavior is bounded', () => {
  assert.equal(resolveWidth(['--width=40'], { isTTY: true, columns: 120 }, {}), 40);
  assert.equal(resolveWidth([], { isTTY: false, columns: 140 }, { COLUMNS: '140' }), 80);
  assert.equal(resolveWidth([], { isTTY: true, columns: 120 }, {}), 120);
  assert.throws(() => resolveWidth(['--width=39'], { isTTY: true, columns: 80 }, {}), /between 40 and 160/);
});
check('ascii-3d: width boundary selects the intended layout and rejects invalid render widths', () => {
  assert.match(renderAscii3d(ledger, { width: 63 }), /layout: compact width=63/);
  assert.match(renderAscii3d(ledger, { width: 64 }), /layout: ascii-3d width=64/);
  assert.throws(() => renderAscii3d(ledger, { width: 39 }), /between 40 and 160/);
});
check('ascii-3d: dense layers and Unicode labels use safe compact output', () => {
  const dense = parseLedger(JSON.stringify({
    goal: 'Đồ thị 中文',
    nodes: Array.from({ length: 9 }, (_, index) => ({ id: `N${index + 1}`, label: `nút 中文 ${index + 1}` }))
  }));
  const output = renderAscii3d(dense, { width: 80 });
  assert.match(output, /layout: compact width=80/);
  assert.match(output, /\\u\{4E2D\}/);
  assert.equal(/[^\x0A\x20-\x7E]/.test(output), false);
});

// ---- determinism ----
check('renderer is deterministic', () => {
  assert.equal(renderMermaid(parseLedger(raw)), mermaid);
  assert.equal(renderAscii(parseLedger(raw)), ascii);
  assert.equal(renderAscii3d(parseLedger(raw), { width: 80 }), ascii3d);
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
check('CLI: --format=ascii-3d renders topology at an explicit width', () => {
  const run = spawnSync(process.execPath, [rendererPath, path.join(fixtures, 'sample-graph.json'), '--format=ascii-3d', '--width=40'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /layout: compact width=40/);
  assert.equal(run.stdout.trimEnd().split('\n').every((line) => line.length <= 40), true);
});
check('CLI: cyclic input exits non-zero', () => {
  // Unique temp dir so the test can never overwrite or delete a repo fixture.
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'render-graph-test-'));
  const cyclic = path.join(tempRoot, 'cyclic-graph.json');
  try {
    fs.writeFileSync(cyclic, '{"nodes":[{"id":"A"},{"id":"B"}],"edges":[{"from":"A","to":"B"},{"from":"B","to":"A"}]}');
    const run = spawnSync(process.execPath, [rendererPath, cyclic], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /cycle/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

console.log(`\nrender-graph: ${passed} checks passed`);
