// Plain-text transcript adapter. Roles come only from explicit line markers;
// token usage is always "unknown" here, never estimated silently.

const ROLE_RE = /^(user|human|assistant|ai|người dùng|trợ lý)\s*:\s*(.*)$/i;
const ROLE_MAP = {
  user: 'user',
  human: 'user',
  'người dùng': 'user',
  assistant: 'assistant',
  ai: 'assistant',
  'trợ lý': 'assistant'
};

export function parseTranscript(content) {
  const events = [];
  const warnings = [];
  let current = null;
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(ROLE_RE);
    if (m) {
      if (current) events.push(current);
      current = {
        type: 'message',
        source: 'transcript',
        session: 'transcript',
        role: ROLE_MAP[m[1].toLowerCase()],
        text: m[2],
        usage: { accuracy: 'unknown' }
      };
    } else if (current) {
      current.text += `\n${line}`;
    }
  }
  if (current) events.push(current);
  if (events.length === 0) warnings.push('no role markers found; transcript ignored');
  return { events, warnings };
}
