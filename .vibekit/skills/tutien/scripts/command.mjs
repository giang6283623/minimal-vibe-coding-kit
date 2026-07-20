// Parses a /tutien invocation. The skill is user-invoked only
// (disable-model-invocation: true), so nothing here runs unless the user
// typed /tutien. `off`/`on` toggle the session mode; a report action only
// runs when the mode is on.

const ACTIONS = new Set(['on', 'off', 'status', 'preview', 'analyze', 'compare', 'explain', 'classify']);
const TONE_ALIASES = new Map([
  ['serene', 'serene'],
  ['spirited', 'spirited'],
  ['neutral', 'neutral'],
  // Backward-compatible aliases. They are accepted but no longer advertised,
  // keeping the public vocabulary calm and unambiguous across agent surfaces.
  ['gentle', 'serene'],
  ['spicy', 'spirited']
]);

export const TUTIEN_EXPERIENCE = Object.freeze({
  kind: 'wholesome-coding-classification-game',
  purpose: 'stress-relief-and-mindful-reflection',
  narrativeStyle: 'refined-mystical-xianxia',
  semanticNamespace: 'tutien-coding-cultivation-v1'
});

const STOP_REQUESTS = [
  /^(?:(?:please\s+)|(?:(?:can|could|would)\s+you\s+(?:please\s+)?))?(?:off|stop|end|exit|disable)(?:\s+(?:now|please))?[.!]?$/i,
  /^(?:(?:please\s+)|(?:(?:can|could|would)\s+you\s+(?:please\s+)?))?(?:stop|end|exit|disable)\s+(?:\/?tutien|tu\s+tien)(?:\s+mode)?(?:\s+(?:now|please))?[.!]?$/i,
  /^(?:(?:vui\s+lòng|hãy|giúp\s+tôi)\s+)?(?:dừng|tắt|kết\s+thúc|thoát)(?:\s+(?:nhé|ngay))?[.!]?$/iu,
  /^(?:(?:vui\s+lòng|hãy|giúp\s+tôi)\s+)?(?:dừng|tắt|kết\s+thúc|thoát)\s+(?:\/?tutien|tu\s+tiên)(?:\s+(?:mode|chế\s+độ))?(?:\s+(?:nhé|ngay))?[.!]?$/iu
];

export function normalizeTone(value) {
  return TONE_ALIASES.get(String(value ?? '').toLowerCase()) ?? 'serene';
}

export function isStopRequest(argsString = '') {
  const normalized = String(argsString).trim().replace(/\s+/g, ' ');
  return STOP_REQUESTS.some((re) => re.test(normalized));
}

export function parseInvocation(argsString = '') {
  const tokens = String(argsString).trim().split(/\s+/).filter(Boolean);
  const options = {
    scope: 'repo',
    privacy: 'aggregate-only',
    language: 'auto',
    tone: 'serene',
    villains: 'on',
    score: 'hidden',
    includeExcerpts: false,
    range: 'all',
    sources: []
  };
  let action = null;

  // A direct request to end the experience always wins over report parsing.
  // This keeps prose mode and approval state from lingering after the user
  // asks to return to the kit's normal voice.
  if (isStopRequest(argsString)) {
    return { action: 'off', isModeToggle: true, explicitAction: true, options };
  }

  for (const tok of tokens) {
    const eq = tok.indexOf('=');
    if (eq === -1) {
      if (!action && ACTIONS.has(tok)) action = tok;
      continue;
    }
    const key = tok.slice(0, eq);
    const value = tok.slice(eq + 1);
    switch (key) {
      case 'language': options.language = value; break;
      case 'tone': options.tone = normalizeTone(value); break;
      case 'villains': options.villains = value === 'off' ? 'off' : 'on'; break;
      case 'score': options.score = value === 'show' ? 'show' : 'hidden'; break;
      case 'scope': options.scope = value; break;
      case 'privacy': options.privacy = value; break;
      case 'range': options.range = value; break;
      case 'include-excerpts': options.includeExcerpts = value === 'true'; break;
      case 'sources': options.sources = value.split(',').filter(Boolean); break;
      case 'previous': options.previous = value; break;
      case 'metric': options.metric = value; break;
      case 'approve': options.approve = value; break;
      case 'snapshot': options.snapshot = value === 'true'; break;
      case 'faction': options.faction = value; break;
      case 'affiliation': options.affiliation = value; break;
      case 'paths': options.paths = value.split(',').filter(Boolean); break;
      case 'domains': options.domains = value.split(',').filter(Boolean); break;
      case 'authorization': options.authorization = value; break;
      default: break;
    }
  }

  // Default action when the user typed only `/tutien`: a safe preview. A bare
  // invocation (no explicit action word) also re-activates the mode; an
  // explicit report action while the mode is off is refused by the runner.
  const explicitAction = action !== null;
  if (!action) action = 'preview';
  const isModeToggle = action === 'on' || action === 'off' || action === 'status';
  return { action, isModeToggle, explicitAction, options };
}

// The livelier `spirited` voice is explicit opt-in. Safety-sensitive contexts
// always use neutral prose. Legacy tone names normalize to the new namespace.
export function resolveTone(requestedTone, { sensitive = false } = {}) {
  if (sensitive) return 'neutral';
  return normalizeTone(requestedTone);
}
