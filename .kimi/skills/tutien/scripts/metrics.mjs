import { sha16 } from './normalize-events.mjs';

// Deterministic metric engine. Every function returns plain data derived only
// from its inputs; no randomness, no timestamps of its own, no raw text.

export function groupTasks(events, { gapMinutes = 60 } = {}) {
  const tasks = new Map();
  const counters = new Map();
  const lastTs = new Map();
  for (const ev of events) {
    if (ev.eventType === 'commit') continue;
    const session = ev.sessionId ?? 'unknown';
    let key, grouping, confidence;
    if (ev.taskId) {
      key = `explicit:${session}:${ev.taskId}`;
      grouping = 'explicit';
      confidence = 'high';
    } else {
      if (!counters.has(session)) counters.set(session, 0);
      let idx = counters.get(session);
      const t = ev.timestamp ? Date.parse(ev.timestamp) : NaN;
      const last = lastTs.get(session);
      if (last != null && Number.isFinite(t) && t - last > gapMinutes * 60000) {
        idx += 1;
        counters.set(session, idx);
      }
      if (Number.isFinite(t)) lastTs.set(session, t);
      key = `derived:${session}:${idx}`;
      grouping = 'derived';
      confidence = 'medium';
    }
    if (!tasks.has(key)) tasks.set(key, { taskId: key, sessionId: session, grouping, confidence, eventIds: [] });
    tasks.get(key).eventIds.push(ev.eventId);
  }
  return [...tasks.values()];
}

export function normalizeExact(text) {
  return text.normalize('NFC').replace(/\r\n/g, '\n').trim();
}

// Loose form for near-repeat comparison: lowercase and collapse whitespace
// outside fenced code blocks; strip a leading slash-command token.
export function normalizeLoose(text) {
  return normalizeExact(text)
    .replace(/^\/[\w-]+\s+/, '')
    .split(/(```[\s\S]*?```)/)
    .map((seg, i) => (i % 2 === 1 ? seg : seg.toLowerCase().replace(/\s+/g, ' ')))
    .join('')
    .trim();
}

function trigrams(s) {
  const out = new Set();
  for (let i = 0; i <= s.length - 3; i++) out.add(s.slice(i, i + 3));
  return out;
}

export function diceSimilarity(a, b) {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const g of ta) if (tb.has(g)) inter += 1;
  return (2 * inter) / (ta.size + tb.size);
}

export function repetitionMetrics(events, tasks, { nearThreshold = 0.9, minLength = 30 } = {}) {
  const byId = new Map(events.map((e) => [e.eventId, e]));
  const order = new Map(events.map((e, i) => [e.eventId, i]));
  const exactRepeats = [];
  const nearRepeats = [];
  const retryLoopCandidates = [];

  for (const task of tasks) {
    const users = task.eventIds
      .map((id) => byId.get(id))
      .filter((e) => e.role === 'user' && e.eventType === 'message' && e.text);
    if (users.length < 2) continue;

    const parent = new Map(users.map((e) => [e.eventId, e.eventId]));
    const find = (x) => {
      while (parent.get(x) !== x) {
        parent.set(x, parent.get(parent.get(x)));
        x = parent.get(x);
      }
      return x;
    };
    const union = (a, b) => parent.set(find(a), find(b));

    const exactGroups = new Map();
    for (const e of users) {
      const key = normalizeExact(e.text);
      if (!exactGroups.has(key)) exactGroups.set(key, []);
      exactGroups.get(key).push(e);
    }
    for (const group of exactGroups.values()) {
      for (let i = 1; i < group.length; i++) union(group[i].eventId, group[0].eventId);
      if (group.length >= 2) {
        exactRepeats.push({
          taskId: task.taskId,
          count: group.length,
          eventIds: group.map((e) => e.eventId),
          textDigest: sha16(normalizeExact(group[0].text))
        });
      }
    }

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const a = users[i];
        const b = users[j];
        if (normalizeExact(a.text) === normalizeExact(b.text)) continue;
        const la = normalizeLoose(a.text);
        const lb = normalizeLoose(b.text);
        if (la.length < minLength || lb.length < minLength) continue;
        const sim = diceSimilarity(la, lb);
        if (sim >= nearThreshold) {
          nearRepeats.push({
            taskId: task.taskId,
            eventIds: [a.eventId, b.eventId],
            similarity: Math.round(sim * 1000) / 1000
          });
          union(a.eventId, b.eventId);
        }
      }
    }

    let run = [users[0]];
    const flush = () => {
      if (run.length >= 3) {
        retryLoopCandidates.push({
          taskId: task.taskId,
          count: run.length,
          eventIds: run.map((e) => e.eventId),
          confidence: task.grouping === 'explicit' ? 0.85 : 0.6
        });
      }
    };
    for (let i = 1; i < users.length; i++) {
      const prev = run[run.length - 1];
      const cur = users[i];
      const sameClass = find(prev.eventId) === find(cur.eventId);
      const between = events
        .slice(order.get(prev.eventId) + 1, order.get(cur.eventId))
        .some((e) => e.role !== 'user');
      if (sameClass && between) run.push(cur);
      else {
        flush();
        run = [cur];
      }
    }
    flush();
  }
  return { exactRepeats, nearRepeats, retryLoopCandidates };
}

const NEGATION_RE = /\b(?:do not|don't|never)\s+([a-z][\w\s/-]{2,60})/gi;
const STOPWORDS = new Set(['the', 'a', 'an', 'to', 'this', 'that', 'of', 'in', 'on', 'for', 'any']);

// Conservative lexical detector: only a "never/do not X" instruction followed
// in the same task by a later prompt requesting X. Candidates only, with
// confidence — a later correction that replaces the earlier instruction is a
// revision, which is why confidence stays at 0.6 and review is expected.
export function conflictCandidates(events, tasks) {
  const byId = new Map(events.map((e) => [e.eventId, e]));
  const out = [];
  for (const task of tasks) {
    const users = task.eventIds
      .map((id) => byId.get(id))
      .filter((e) => e.role === 'user' && e.eventType === 'message' && e.text);
    for (let i = 0; i < users.length; i++) {
      for (const match of users[i].text.matchAll(NEGATION_RE)) {
        const words = match[1]
          .toLowerCase()
          .split(/[^\w/-]+/)
          .filter((w) => w && !STOPWORDS.has(w))
          .slice(0, 2);
        if (words.length < 2) continue;
        for (let j = i + 1; j < users.length; j++) {
          const later = users[j].text.toLowerCase();
          if (words.every((w) => later.includes(w)) && !/(?:do not|don't|never)\s/.test(later)) {
            out.push({
              category: 'user-user',
              taskId: task.taskId,
              eventIds: [users[i].eventId, users[j].eventId],
              phraseDigest: sha16(words.join(' ')),
              confidence: 0.6
            });
          }
        }
      }
    }
  }
  return out;
}

export function issueMetrics(events, taskKeyByEvent = new Map()) {
  const failures = [];
  const recoveries = [];
  const revertCandidates = [];
  const failEvents = [];
  const passEventIds = [];
  let passes = 0;
  events.forEach((e, idx) => {
    if (e.eventType === 'test' || e.eventType === 'tool_result') {
      if (e.outcome === 'fail') {
        failures.push({ eventId: e.eventId, label: e.label ?? null, taskId: taskKeyByEvent.get(e.eventId) ?? null });
        failEvents.push({ e, idx });
      } else if (e.outcome === 'pass') {
        passes += 1;
        passEventIds.push(e.eventId);
      }
    }
    if (e.eventType === 'commit' && e.commit?.isRevert) {
      revertCandidates.push({ eventId: e.eventId, hash: e.commit.hash ?? null, confidence: 0.5 });
    }
  });
  for (const { e: failEv, idx } of failEvents) {
    const rec = events
      .slice(idx + 1)
      .find(
        (e) =>
          (e.eventType === 'test' || e.eventType === 'tool_result') &&
          e.outcome === 'pass' &&
          (e.label ?? null) === (failEv.label ?? null)
      );
    if (rec) {
      recoveries.push({
        issueEventId: failEv.eventId,
        recoveryEventId: rec.eventId,
        taskId: taskKeyByEvent.get(failEv.eventId) ?? null
      });
    }
  }
  return { passes, passEventIds, failures, recoveries, revertCandidates };
}

// Reported, estimated, and unknown usage stay disjoint. Only records marked
// cumulative are streaming counters (keep the last one); independent chunks
// that merely share a requestId are summed. Totals come from the normalized
// usableTotal, so unusable usage records can never contribute.
export function tokenMetrics(events) {
  const byRequest = new Map();
  const singles = [];
  let dedupedStreamUpdates = 0;
  for (const e of events) {
    if (!e.usage) continue;
    const rid = e.usage.requestId;
    if (rid) {
      if (!byRequest.has(rid)) byRequest.set(rid, []);
      byRequest.get(rid).push(e);
    } else {
      singles.push(e);
    }
  }
  const counted = [];
  for (const group of byRequest.values()) {
    if (group.some((e) => e.usage.cumulative)) {
      counted.push(group[group.length - 1]);
      dedupedStreamUpdates += group.length - 1;
    } else {
      counted.push(...group);
    }
  }
  counted.push(...singles);
  let reportedTotal = 0;
  let estimatedTotal = 0;
  for (const e of counted) {
    const total = e.usage.usableTotal;
    if (total == null) continue;
    if (e.usage.accuracy === 'reported') reportedTotal += total;
    else if (e.usage.accuracy === 'estimated') estimatedTotal += total;
  }
  const unknownTurns = events.filter(
    (e) =>
      e.eventType === 'message' &&
      e.role === 'assistant' &&
      (!e.usage || !['reported', 'estimated'].includes(e.usage.accuracy))
  ).length;
  return { reportedTotal, estimatedTotal, unknownTurns, countedRequests: counted.length, dedupedStreamUpdates };
}

export function coverageMetrics(events, tasks, tokens) {
  const sessions = new Set(
    events.filter((e) => e.eventType !== 'commit' && e.sessionId).map((e) => e.sessionId)
  );
  const userPrompts = events.filter((e) => e.eventType === 'message' && e.role === 'user').length;
  const commits = events.filter((e) => e.eventType === 'commit').length;
  const ts = events.map((e) => e.timestamp).filter(Boolean).sort();
  const assistant = events.filter((e) => e.eventType === 'message' && e.role === 'assistant');
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 1000 : 0);
  const reportedPct = pct(assistant.filter((e) => e.usage?.accuracy === 'reported').length, assistant.length);
  const estimatedPct = pct(assistant.filter((e) => e.usage?.accuracy === 'estimated').length, assistant.length);
  const explicitPct = pct(tasks.filter((t) => t.grouping === 'explicit').length, tasks.length);
  const confidence =
    reportedPct >= 0.7 && explicitPct >= 0.5 ? 'high' : reportedPct >= 0.4 || explicitPct >= 0.5 ? 'medium' : 'low';
  return {
    sessions: sessions.size,
    userPrompts,
    commits,
    window: { start: ts[0] ?? null, end: ts[ts.length - 1] ?? null },
    tokenCoverage: { reportedTurnsPct: reportedPct, estimatedTurnsPct: estimatedPct, unknownTurns: tokens.unknownTurns },
    confidence
  };
}
