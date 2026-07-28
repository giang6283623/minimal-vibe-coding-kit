#!/usr/bin/env node
// Deterministic graph-ledger renderer for graph-engineering-verified-orchestration.
// Reads a graph ledger JSON file and emits a Mermaid flowchart (app surfaces),
// an ASCII wave view (CLI surfaces), or both. No network, no timestamps:
// identical input always produces identical output, so the output is verifiable.
//
// Usage:
//   node render-graph.mjs <graph.json> [--format=mermaid|ascii|ascii-3d|both] [--width=40..160]
//
// Ledger JSON schema:
//   {
//     "goal": "one measurable outcome",
//     "graph_version": "v1",
//     "nodes": [{ "id": "N1", "label": "short label", "status": "ready", "wave": 1, "risk": "R1" }],
//     "edges": [{ "from": "N1", "to": "N2", "artifact": "named artifact" }]
//   }
// status: ready | running | accepted | rejected | blocked (unknown values fail closed).

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
const VALID_STATUS = new Set(Object.keys(STATUS_MARKER));
const VALID_RISK = new Set(['R0', 'R1', 'R2']);
const MIN_WIDTH = 40;
const MAX_WIDTH = 160;

function usage() {
  console.log('Usage: node render-graph.mjs <graph.json> [--format=mermaid|ascii|ascii-3d|both] [--width=40..160]');
}

// Keep letters and digits from every script, drop emoji, and force ASCII
// dashes so output follows the kit writing-style rule.
export function sanitizeLabel(text, maxLen = 60) {
  const noEmoji = String(text ?? '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\u0000-\u001F\u007F"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return noEmoji.length > maxLen ? `${noEmoji.slice(0, maxLen - 3)}...` : noEmoji;
}

export function escapeMermaidText(text) {
  return sanitizeLabel(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/\|/g, '&#124;')
    .replace(/`/g, '&#96;');
}

// Preserve readable Latin text when possible and escape every remaining
// non-ASCII code point. The ASCII renderer therefore emits printable ASCII
// only without silently deleting meaningful labels.
export function toAsciiText(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/gu, (char) => `\\u{${char.codePointAt(0).toString(16).toUpperCase()}}`);
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
    if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,23}$/.test(node.id)) {
      throw new Error(`node id "${node.id}" must use 1-24 ASCII letters, digits, dot, underscore, colon, or dash`);
    }
    const status = String(node.status ?? 'ready');
    if (!VALID_STATUS.has(status)) {
      throw new Error(`node "${node.id}" has unknown status "${status}"`);
    }
    const risk = node.risk === undefined || node.risk === null ? null : String(node.risk);
    if (risk !== null && !VALID_RISK.has(risk)) {
      throw new Error(`node "${node.id}" has unknown risk "${risk}"`);
    }
    const hasWave = node.wave !== undefined && node.wave !== null;
    if (hasWave && (!Number.isInteger(node.wave) || node.wave < 1)) {
      throw new Error(`node "${node.id}" wave must be a positive integer`);
    }
    return {
      id: node.id,
      label: sanitizeLabel(node.label ?? node.id),
      status,
      wave: hasWave ? node.wave : null,
      risk
    };
  });
  // Mermaid node ids are sanitized, so distinct raw ids such as "A-B" and
  // "A_B" could collapse into one rendered node. Reject that instead.
  const sanitizedIds = new Map();
  for (const node of nodes) {
    const key = sanitizeId(node.id);
    const existing = sanitizedIds.get(key);
    if (existing !== undefined) {
      throw new Error(`node ids "${existing}" and "${node.id}" collide after id sanitization ("${key}")`);
    }
    sanitizedIds.set(key, node.id);
  }
  const edgeKeys = new Set();
  const cleanEdges = edges.map((edge, index) => {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(`edge at index ${index} references an unknown node`);
    }
    const artifact = sanitizeLabel(edge.artifact ?? '', 40);
    const key = `${edge.from}\u0000${edge.to}\u0000${artifact}`;
    if (edgeKeys.has(key)) {
      throw new Error(`duplicate edge: ${edge.from} -> ${edge.to} (${artifact || 'no artifact'})`);
    }
    edgeKeys.add(key);
    return { from: edge.from, to: edge.to, artifact };
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

function compareIdPaths(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return left.length - right.length;
}

// Longest path by node count over the DAG, deterministic tie-break by id sequence.
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
      if (candidate.length > current.length || (candidate.length === current.length && compareIdPaths(candidate, current) < 0)) {
        best.set(next, candidate);
      }
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  let result = [];
  for (const path of best.values()) {
    if (path.length > result.length || (path.length === result.length && compareIdPaths(path, result) < 0)) result = path;
  }
  return result;
}

export function topologicalLayers(nodes, edges) {
  assertAcyclic(nodes, edges);
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const depth = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    adjacency.get(edge.from).push(edge.to);
    indegree.set(edge.to, indegree.get(edge.to) + 1);
  }
  for (const targets of adjacency.values()) targets.sort();
  const queue = nodes.map((node) => node.id).filter((id) => indegree.get(id) === 0).sort();
  while (queue.length) {
    const id = queue.shift();
    for (const next of adjacency.get(id)) {
      depth.set(next, Math.max(depth.get(next), depth.get(id) + 1));
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }
  const maxDepth = Math.max(...depth.values());
  const layers = Array.from({ length: maxDepth + 1 }, () => []);
  for (const node of [...nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    layers[depth.get(node.id)].push(node.id);
  }
  return layers;
}

export function deriveBlockers(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) incoming.get(edge.to).push(edge.from);
  return [...nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((node) => {
      const reasons = [];
      if (node.status === 'blocked' || node.status === 'rejected') {
        reasons.push(`status=${node.status}`);
      }
      for (const upstreamId of incoming.get(node.id).sort()) {
        const upstream = byId.get(upstreamId);
        if (upstream.status !== 'accepted') {
          reasons.push(`waiting on ${upstream.id} (${upstream.status})`);
        }
      }
      return { id: node.id, reasons };
    })
    .filter((item) => item.reasons.length > 0);
}

export function resolveWidth(args = [], stream = process.stdout, env = process.env) {
  const option = args.find((arg) => arg.startsWith('--width='));
  if (option) {
    const raw = option.slice('--width='.length);
    if (!/^\d+$/.test(raw)) throw new Error(`invalid --width=${raw}`);
    const width = Number(raw);
    if (width < MIN_WIDTH || width > MAX_WIDTH) {
      throw new Error(`--width must be between ${MIN_WIDTH} and ${MAX_WIDTH}`);
    }
    return width;
  }
  if (!stream?.isTTY) return 80;
  const terminalWidth = Number.isInteger(stream.columns) ? stream.columns : Number(env.COLUMNS);
  if (!Number.isFinite(terminalWidth)) return 80;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(terminalWidth)));
}

function sortedEdges(edges) {
  return [...edges].sort((left, right) => {
    const leftKey = `${left.from}\u0000${left.to}\u0000${left.artifact}`;
    const rightKey = `${right.from}\u0000${right.to}\u0000${right.artifact}`;
    return leftKey.localeCompare(rightKey);
  });
}

function wrapAsciiLine(text, width, continuation = '  ') {
  const lines = [];
  let remaining = toAsciiText(text);
  let prefix = '';
  while (prefix.length + remaining.length > width) {
    const available = width - prefix.length;
    let cut = remaining.lastIndexOf(' ', available);
    if (cut <= 0) cut = available;
    lines.push(`${prefix}${remaining.slice(0, cut).trimEnd()}`);
    remaining = remaining.slice(cut).trimStart();
    prefix = continuation.slice(0, Math.max(0, width - 1));
  }
  lines.push(`${prefix}${remaining}`);
  return lines;
}

function nodeSummary(node, isCritical) {
  const marker = STATUS_MARKER[node.status];
  const risk = node.risk ? ` ${node.risk}` : '';
  const wave = node.wave === null ? '' : ` W${node.wave}`;
  return `${isCritical ? '*' : ' '} [${marker.padEnd(5)}] ${node.id} ${toAsciiText(node.label)}${risk}${wave}`;
}

function clippedNodeSummary(node, isCritical, maxLength) {
  const marker = STATUS_MARKER[node.status];
  const risk = node.risk ? ` ${node.risk}` : '';
  const wave = node.wave === null ? '' : ` W${node.wave}`;
  const fixed = `${isCritical ? '*' : ' '} [${marker.padEnd(5)}] ${node.id}`;
  const suffix = `${risk}${wave}`;
  const available = Math.max(0, maxLength - fixed.length - suffix.length - 1);
  const label = toAsciiText(node.label);
  const clipped = label.length > available
    ? (available >= 3 ? `${label.slice(0, available - 3)}...` : '')
    : label;
  return `${fixed}${clipped ? ` ${clipped}` : ''}${suffix}`.slice(0, maxLength);
}

function renderAsciiBox(node, isCritical, depth, width) {
  const indent = ' '.repeat(Math.min(depth * 2, 10));
  const innerWidth = Math.max(20, Math.min(68, width - indent.length - 6));
  const content = clippedNodeSummary(node, isCritical, innerWidth);
  const border = `+${'-'.repeat(innerWidth + 2)}+`;
  return [
    `${indent}${border}`,
    `${indent}| ${content.padEnd(innerWidth)} |\\`,
    `${indent}${border} \\`,
    `${indent} \\${'_'.repeat(innerWidth + 2)}\\`
  ];
}

export function renderMermaid(ledger) {
  const lines = [
    '---',
    'config:',
    '  securityLevel: strict',
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
      lines.push(`        ${sanitizeId(node.id)}["${escapeMermaidText(node.label)}"]`);
    }
    lines.push('    end');
  }
  for (const node of ledger.nodes.filter((n) => !inWave.has(n.id))) {
    lines.push(`    ${sanitizeId(node.id)}["${escapeMermaidText(node.label)}"]`);
  }
  for (const edge of sortedEdges(ledger.edges)) {
    const label = edge.artifact ? `|"${escapeMermaidText(edge.artifact)}"|` : '';
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
    const cls = STATUS_CLASS[node.status];
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
  if (ledger.goal) lines.push(`goal: ${toAsciiText(ledger.goal)}`);
  lines.push(`graph: ${toAsciiText(ledger.version)} nodes=${ledger.nodes.length} edges=${ledger.edges.length}`);
  const waves = [...new Set(ledger.nodes.filter((n) => n.wave !== null).map((n) => n.wave))].sort((a, b) => a - b);
  const inWave = new Set();
  for (const wave of waves) {
    lines.push('', `wave ${wave}`);
    for (const node of ledger.nodes.filter((n) => n.wave === wave).sort((a, b) => a.id.localeCompare(b.id))) {
      inWave.add(node.id);
      const marker = STATUS_MARKER[node.status];
      const risk = node.risk ? ` ${node.risk}` : '';
      lines.push(`  [${marker.padEnd(5)}] ${node.id} ${toAsciiText(node.label)}${risk}`);
    }
  }
  const loose = ledger.nodes.filter((n) => !inWave.has(n.id));
  if (loose.length) {
    lines.push('', 'no wave assigned');
    for (const node of loose.sort((a, b) => a.id.localeCompare(b.id))) {
      const marker = STATUS_MARKER[node.status];
      const risk = node.risk ? ` ${node.risk}` : '';
      lines.push(`  [${marker.padEnd(5)}] ${node.id} ${toAsciiText(node.label)}${risk}`);
    }
  }
  if (ledger.edges.length) {
    lines.push('', 'edges');
    for (const edge of sortedEdges(ledger.edges)) {
      const artifact = edge.artifact ? ` (artifact: ${toAsciiText(edge.artifact)})` : '';
      lines.push(`  ${edge.from} -> ${edge.to}${artifact}`);
    }
  }
  lines.push('', `critical path: ${criticalPath(ledger.nodes, ledger.edges).join(' -> ')}`);
  return lines.join('\n');
}

function appendAscii3dSummary(lines, ledger, width, critical) {
  const waves = [...new Set(ledger.nodes.filter((node) => node.wave !== null).map((node) => node.wave))]
    .sort((left, right) => left - right);
  lines.push('', 'schedule waves');
  if (waves.length === 0) lines.push('  none assigned');
  for (const wave of waves) {
    const ids = ledger.nodes
      .filter((node) => node.wave === wave)
      .map((node) => node.id)
      .sort()
      .join(', ');
    lines.push(...wrapAsciiLine(`  W${wave}: ${ids}`, width, '      '));
  }

  const blockers = deriveBlockers(ledger.nodes, ledger.edges);
  lines.push('', 'blockers');
  if (blockers.length === 0) lines.push('  none');
  for (const blocker of blockers) {
    lines.push(...wrapAsciiLine(`  ${blocker.id}: ${blocker.reasons.join('; ')}`, width, '      '));
  }

  lines.push('', ...wrapAsciiLine(`critical path: ${critical.join(' -> ')}`, width, '  '));
}

function renderAsciiCompact(ledger, width, layers, critical, edges, edgeLabels) {
  const lines = [];
  const criticalNodes = new Set(critical);
  const criticalEdges = new Set(critical.slice(0, -1).map((id, index) => `${id}\u0000${critical[index + 1]}`));
  if (ledger.goal) lines.push(...wrapAsciiLine(`goal: ${ledger.goal}`, width, '  '));
  lines.push(...wrapAsciiLine(`graph: ${ledger.version} nodes=${ledger.nodes.length} edges=${ledger.edges.length}`, width, '  '));
  lines.push(`layout: compact width=${width}`);
  lines.push(...wrapAsciiLine('legend: *=critical; statuses=ok,run,pend,block,rej; risk=R0..R2; W=wave', width, '  '));
  lines.push('', 'topological layers');
  const byId = new Map(ledger.nodes.map((node) => [node.id, node]));
  for (let depth = 0; depth < layers.length; depth += 1) {
    for (const id of layers[depth]) {
      lines.push(...wrapAsciiLine(`  L${depth} ${nodeSummary(byId.get(id), criticalNodes.has(id))}`, width, '      '));
    }
  }
  lines.push('', 'dependencies');
  if (edges.length === 0) lines.push('  none');
  for (const edge of edges) {
    const marker = criticalEdges.has(`${edge.from}\u0000${edge.to}`) ? '*' : ' ';
    const artifact = edge.artifact ? ` artifact=${edge.artifact}` : '';
    lines.push(...wrapAsciiLine(`  ${edgeLabels.get(edge)}${marker} ${edge.from} -> ${edge.to}${artifact}`, width, '       '));
  }
  appendAscii3dSummary(lines, ledger, width, critical);
  return lines.join('\n');
}

export function renderAscii3d(ledger, options = {}) {
  const width = options.width ?? 80;
  if (!Number.isInteger(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
    throw new Error(`ASCII 3D width must be between ${MIN_WIDTH} and ${MAX_WIDTH}`);
  }
  const layers = topologicalLayers(ledger.nodes, ledger.edges);
  const critical = criticalPath(ledger.nodes, ledger.edges);
  const criticalNodes = new Set(critical);
  const criticalEdges = new Set(critical.slice(0, -1).map((id, index) => `${id}\u0000${critical[index + 1]}`));
  const edges = sortedEdges(ledger.edges);
  const edgeDigits = Math.max(2, String(edges.length).length);
  const edgeLabels = new Map(edges.map((edge, index) => [edge, `e${String(index + 1).padStart(edgeDigits, '0')}`]));
  if (width < 64 || ledger.nodes.length > 24 || layers.some((layer) => layer.length > 8)) {
    return renderAsciiCompact(ledger, width, layers, critical, edges, edgeLabels);
  }

  const lines = [];
  const byId = new Map(ledger.nodes.map((node) => [node.id, node]));
  if (ledger.goal) lines.push(...wrapAsciiLine(`goal: ${ledger.goal}`, width, '  '));
  lines.push(...wrapAsciiLine(`graph: ${ledger.version} nodes=${ledger.nodes.length} edges=${ledger.edges.length}`, width, '  '));
  lines.push(`layout: ascii-3d width=${width}`);
  lines.push(...wrapAsciiLine('legend: *=critical; statuses=ok,run,pend,block,rej; risk=R0..R2; W=wave', width, '  '));

  for (let depth = 0; depth < layers.length; depth += 1) {
    lines.push('', `depth ${depth}`);
    for (let index = 0; index < layers[depth].length; index += 1) {
      const id = layers[depth][index];
      lines.push(...renderAsciiBox(byId.get(id), criticalNodes.has(id), depth, width));
      if (index < layers[depth].length - 1) lines.push('');
    }
    const ids = new Set(layers[depth]);
    const outgoing = edges.filter((edge) => ids.has(edge.from));
    if (outgoing.length > 0) {
      lines.push('', '  dependency bridge');
      for (const edge of outgoing) {
        const marker = criticalEdges.has(`${edge.from}\u0000${edge.to}`) ? '*' : ' ';
        lines.push(...wrapAsciiLine(
          `  ${edgeLabels.get(edge)}${marker} ${edge.from} -> ${edge.to}`,
          width,
          '       '
        ));
        if (edge.artifact) {
          lines.push(...wrapAsciiLine(`       artifact: ${edge.artifact}`, width, '       '));
        }
      }
      lines.push('  |', '  v');
    }
  }

  appendAscii3dSummary(lines, ledger, width, critical);
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
  if (!['mermaid', 'ascii', 'ascii-3d', 'both'].includes(format)) {
    console.error(`Error: unknown --format=${format} (expected mermaid, ascii, ascii-3d, or both)`);
    process.exit(1);
  }
  try {
    const ledger = parseLedger(fs.readFileSync(file, 'utf8'));
    assertAcyclic(ledger.nodes, ledger.edges);
    if (format === 'mermaid' || format === 'both') console.log(renderMermaid(ledger));
    if (format === 'both') console.log('\n---\n');
    if (format === 'ascii') console.log(renderAscii(ledger));
    if (format === 'ascii-3d' || format === 'both') {
      console.log(renderAscii3d(ledger, { width: resolveWidth(args) }));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) main();
