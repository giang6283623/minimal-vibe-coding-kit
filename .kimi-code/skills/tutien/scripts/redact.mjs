// Redaction layer: every piece of ingested text passes through here before
// any other module sees it. Raw secret-bearing input never leaves this file.

const SENSITIVE_QUERY_KEY = /^(token|key|secret|password|passwd|pwd|auth|authorization|signature|sig|code|apikey|api_key|access_token|session)$/i;

export function sanitizeUrl(url) {
  try {
    const u = new URL(url);
    u.username = '';
    u.password = '';
    for (const k of [...u.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(k)) u.searchParams.set(k, 'REDACTED');
    }
    u.hash = '';
    return u.toString();
  } catch {
    return '[unparseable-url-redacted]';
  }
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
const BEARER_RE = /\b(bearer|token|apikey|api[-_]key|authorization)([:=]\s*)\S+/gi;
const AWS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/g;

export function redactText(text) {
  return String(text)
    .replace(URL_RE, (m) => sanitizeUrl(m))
    .replace(BEARER_RE, (_m, k, sep) => `${k}${sep}[REDACTED]`)
    .replace(AWS_KEY_RE, '[REDACTED]');
}
