import crypto from 'node:crypto';
import { redactText } from './redact.mjs';

export const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

const digestOrNull = (v) => (v == null ? null : sha16(String(v)));

// Timestamps are canonicalized to UTC ISO or dropped; free-form strings never
// pass through as metadata.
function canonicalTimestamp(ts) {
  if (ts == null) return null;
  const t = Date.parse(ts);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

// A usage record is usable only when a positive, finite total can be
// computed. An export claiming accuracy=reported with no numbers must not
// unlock token coverage or a realm score.
function usableTotal(u) {
  if (Number.isFinite(u.total) && u.total > 0) return u.total;
  const sum = (u.input ?? 0) + (u.output ?? 0) + (u.reasoning ?? 0);
  return Number.isFinite(sum) && sum > 0 ? sum : null;
}

// Raw adapter events -> normalized events. The event source is owned by the
// caller (analyze overwrites `__source` per adapter batch), never by the
// export content. Free text is redacted once and kept in memory only.
// Session, task, and label identifiers are digested so metadata fields can
// never carry raw content into analysis output; commit subjects are dropped
// (their redacted form already travels as event text).
export function normalizeEvents(rawEvents) {
  return rawEvents.map((raw, i) => {
    const source = raw.__source ?? 'generic-jsonl';
    const text = raw.text != null ? redactText(raw.text) : null;
    const sessionId = digestOrNull(raw.session);
    let usage = null;
    if (raw.usage) {
      const total = usableTotal(raw.usage);
      usage = {
        input: raw.usage.input ?? null,
        cachedInput: raw.usage.cachedInput ?? null,
        output: raw.usage.output ?? null,
        reasoning: raw.usage.reasoning ?? null,
        total: raw.usage.total ?? null,
        usableTotal: total,
        accuracy: total == null ? 'unknown' : (raw.usage.accuracy ?? 'unknown'),
        requestId: raw.usage.requestId ?? null,
        cumulative: raw.usage.cumulative === true
      };
    }
    return {
      eventId: sha16(`${source}:${sessionId ?? ''}:${i}:${raw.type}:${text ?? ''}`),
      source,
      sessionId,
      taskId: digestOrNull(raw.task),
      timestamp: canonicalTimestamp(raw.ts),
      role: raw.role ?? (raw.type === 'commit' ? 'git' : raw.type === 'message' ? null : 'tool'),
      eventType: raw.type,
      text,
      textDigest: text ? sha16(text) : null,
      textLength: text ? text.length : 0,
      usage,
      outcome: raw.outcome ?? null,
      label: digestOrNull(raw.label),
      commit: raw.commit ? { hash: raw.commit.hash ?? null, isRevert: raw.commit.isRevert === true } : null
    };
  });
}
