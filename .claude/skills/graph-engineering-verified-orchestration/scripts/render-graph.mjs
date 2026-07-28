#!/usr/bin/env node
// Deterministic graph-ledger renderer for graph-engineering-verified-orchestration.
// Reads a graph ledger JSON file and emits a Mermaid flowchart (app surfaces),
// an ASCII wave view (CLI surfaces), or both. No network, no timestamps:
// identical input always produces identical output, so the output is verifiable.
//
// Usage:
//   node render-graph.mjs <graph.json> [--format=mermaid|ascii|both]
//
// Ledger JSON schema:
//   {
//     "goal": "one measurable outcome",
//     "graph_version": "v1",
//     "nodes": [{ "id": "N1", "label": "short label", "status": "ready", "wave": 1, "risk": "R1" }],
//     "edges": [{ "from": "N1", "to": "N2", "artifact": "named artifact" }]
//   }
// status: ready | running | accepted | rejected | blocked (unknown values render as ready).

import fs from 'node:fs';

const STATUS_CLASS = {
  accepted: 'success',
  running: 'accent',
  ready: 'step',
  blocked: 'danger',
  rejected: 'danger'
};
const STATUS_MARKER = {
  accepted: 'ok',
  running: 'run',
  ready: 'pend',
  blocked: 'block',
  rejected: 'rej'
};

function usage() {
  console.log('Usage: node render-graph.mjs <graph.json> [--format=mermaid|ascii|both]');
}

// Keep letters and digits from every script, drop emoji, and force ASCII
// dashes so output follows the kit writing-style rule.
export function sanitizeLabel(text, maxLen = 60) {
  const noEmoji = String(text ?? '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/["\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return noEmoji.length > maxLen ? `${noEmoji.slice(0, maxLen - 3)}...` : noEmoji;
}

function sanitizeId(id) {
  return String(id ?? '').replace(/[^A-Za-z0-9_]/g, '_');
}

export function parseLedger(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON: ${error.message}`);
  }
  if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
    throw new Error('ledger must contain a non-empty "nodes" array');
  }
  const edges = Array.isArray(data.edges) ? data.edges : [];
  const ids = new Set();
  const nodes = data.nodes.map((node, index) => {
    if (!node || typeof node.id !== 'string' || !node.id.trim()) {
      throw new Error(`node at index ${index} is missing a string "id"`);
    }
    if (ids.has(node.id)) throw new Error(`duplicate node id: ${node.id}`);
    ids.add(node.id);
    return {
      id: node.id,
      label: sanitizeLabel(node.label ?? node.id),
      status: String(node.status ?? 'ready'),
      wave: Number.isInteger(node.wave) ? node.wave : null,
      risk: typeof node.risk === 'string' ? node.risk : null
    };
  });
  const cleanEdges = edges.map((edge, index) => {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(`edge at index ${index} references an unknown node`);
    }
    return { from: edge.from, to: edge.to, artifact: sanitizeLabel(edge.artifact ?? '', 40) };
  });
  return { goal: sanitizeLabel(data.goal ?? ''), version: sanitizeLabel(data.graph_version ?? 'v1'), nodes, edges: cleanEdges };
}

// Throws with the cycle path when the graph is not a DAG.
export function assertAcyclic(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) adjacency.get(edge.from).push(edge.to);
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    state.set(id, 1);
    stack.push(id);
    for (const next of adjacency.get(id)) {
      if (state.get(next) === 1) {
        const cycle = stack.slice(stack.indexOf(next)).concat(next).join(' -> ');
        throw new Error(`graph contains a cycle: ${cycle}`);
      }
      if (!state.has(next)) visit(next);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const node of nodes) if (!state.has(node.id)) visit(node.id);
}

// Longest path by node count over the DAG, deterministic tie-break by id.
export function criticalPath(nodes, edges) {
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    adjacency.get(edge.from).push(edge.to);
    indegree.set(edge.to, indegree.get(edge.to) + 1);
  }
  for (const list of adjacency.values()) list.sort();
  const queue = nodes.map((node) => node.id).filter((id) => indegree.get(id) === 0).sort();
  const best = new Map(nodes.map((node) => [node.id, [node.id]]));
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of adjacency.get(id)) {
      const candidate = best.get(id).concat(next);
      const current = best.get(next);
      if (candidate.length > current.length || (candidate.length === current.length && candidate.join('') < current.join(''))) {
        best.set(next, candidate);
      }
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  let result = [];
  for (const path of best.values()) {
    if (path.length > result.length || (path.length === result.length && path.join('') < result.join(''))) result = path;
  }
  return result;
}

export function renderMermaid(ledger) {
  const lines = [
    '---',
    'config:',
    '  theme: base',
    '  themeVariables:',
    '    fontFamily: cascadia mono, consolas, noto sans mono, menlo, monospace',
    '    fontSize: 15px',
    '    lineColor: "#444444"',
    '    textColor: "#111111"',
    '    edgeLabelBackground: "#FFFFFF"',
    '    clusterBkg: "#FFF9DB"',
    '    clusterBorder: "#444444"',
    '---',
    'flowchart TD'
  ];
  const waves = [...new Set(ledger.nodes.filter((n) => n.wave !== null).map((n) => n.wave))].sort((a, b) => a - b);
  const inWave = new Set();
  for (const wave of waves) {
    lines.push(`    subgraph Wave${wave}["Wave ${wave}"]`);
    for (const node of ledger.nodes.filter((n) => n.wave === wave).sort((a, b) => a.id.localeCompare(b.id))) {
      inWave.add(node.id);
      lines.push(`        ${sanitizeId(node.id)}["${node.label}"]`);
    }
    lines.push('    end');
  }
  for (const node of ledger.nodes.filter((n) => !inWave.has(n.id))) {
    lines.push(`    ${sanitizeId(node.id)}["${node.label}"]`);
  }
  const sortedEdges = [...ledger.edges].sort((a, b) => `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
  for (const edge of sortedEdges) {
    const label = edge.artifact ? `|"${edge.artifact}"|` : '';
    lines.push(`    ${sanitizeId(edge.from)} -->${label} ${sanitizeId(edge.to)}`);
  }
  lines.push(
    '    classDef step fill:#8ECAFF,stroke:#444444,stroke-width:2px,color:#111111',
    '    classDef success fill:#8CE99A,stroke:#444444,stroke-width:2px,color:#111111',
    '    classDef danger fill:#FF8787,stroke:#444444,stroke-width:2px,color:#111111',
    '    classDef accent fill:#D0BFFF,stroke:#444444,stroke-width:2px,color:#111111'
  );
  const byClass = new Map();
  for (const node of ledger.nodes) {
    const cls = STATUS_CLASS[node.status] ?? 'step';
    if (!byClass.has(cls)) byClass.set(cls, []);
    byClass.get(cls).push(sanitizeId(node.id));
  }
  for (const [cls, ids] of [...byClass.entries()].sort()) {
    lines.push(`    class ${ids.sort().join(',')} ${cls}`);
  }
  return lines.join('\n');
}

export function renderAscii(ledger) {
  const lines = [];
  if (ledger.goal) lines.push(`goal: ${ledger.goal}`);
  lines.push(`graph: ${ledger.version} nodes=${ledger.nodes.length} edges=${ledger.edges.length}`);
  const waves = [...new Set(ledger.nodes.filter((n) => n.wave !== null).map((n) => n.wave))].sort((a, b) => a - b);
  const inWave = new Set();
  for (const wave of waves) {
    lines.push('', `wave ${wave}`);
    for (const node of ledger.nodes.filter((n) => n.wave === wave).sort((a, b) => a.id.localeCompare(b.id))) {
      inWave.add(node.id);
      const marker = STATUS_MARKER[node.status] ?? 'pend';
      const risk = node.risk ? ` ${node.risk}` : '';
      lines.push(`  [${marker.padEnd(5)}] ${node.id} ${node.label}${risk}`);
    }
  }
  const loose = ledger.nodes.filter((n) => !inWave.has(n.id));
  if (loose.length) {
    lines.push('', 'no wave assigned');
    for (const node of loose.sort((a, b) => a.id.localeCompare(b.id))) {
      const marker = STATUS_MARKER[node.status] ?? 'pend';
      lines.push(`  [${marker.padEnd(5)}] ${node.id} ${node.label}`);
    }
  }
  if (ledger.edges.length) {
    lines.push('', 'edges');
    const sortedEdges = [...ledger.edges].sort((a, b) => `${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`));
    for (const edge of sortedEdges) {
      const artifact = edge.artifact ? ` (artifact: ${edge.artifact})` : '';
      lines.push(`  ${edge.from} -> ${edge.to}${artifact}`);
    }
  }
  lines.push('', `critical path: ${criticalPath(ledger.nodes, ledger.edges).join(' -> ')}`);
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  const formatOption = args.find((arg) => arg.startsWith('--format='));
  const format = formatOption ? formatOption.split('=')[1] : 'both';
  if (!file || args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(file ? 0 : 1);
  }
  if (!['mermaid', 'ascii', 'both'].includes(format)) {
    console.error(`Error: unknown --format=${format} (expected mermaid, ascii, or both)`);
    process.exit(1);
  }
  try {
    const ledger = parseLedger(fs.readFileSync(file, 'utf8'));
    assertAcyclic(ledger.nodes, ledger.edges);
    if (format === 'mermaid' || format === 'both') console.log(renderMermaid(ledger));
    if (format === 'both') console.log('\n---\n');
    if (format === 'ascii' || format === 'both') console.log(renderAscii(ledger));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) main();
