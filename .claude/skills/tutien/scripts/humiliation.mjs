// Explicit, revocable intensity control for fictional cultivation sparring.
// Level 0 is always the fail-closed result for missing, malformed, fractional,
// or out-of-range values. The profile carries abstract composition controls,
// never reusable insult sentences.

const TARGET = 'fictional-cultivation-avatar-and-evidenced-action';

const LEVELS = [
  {
    level: 0,
    key: 'off',
    band: 'off',
    directness: 'none',
    sarcasmDensity: 'none',
    fictionalStatusPressure: 'none',
    maxDirectAddresses: 0,
    allowAvatarDefeat: false,
    allowLossOfFace: false
  },
  {
    level: 1,
    key: 'raised-eyebrow',
    band: 'light',
    directness: 'indirect',
    sarcasmDensity: 'trace',
    fictionalStatusPressure: 'none',
    maxDirectAddresses: 1,
    allowAvatarDefeat: false,
    allowLossOfFace: false
  },
  {
    level: 2,
    key: 'dry-tease',
    band: 'light',
    directness: 'brief',
    sarcasmDensity: 'light',
    fictionalStatusPressure: 'low',
    maxDirectAddresses: 1,
    allowAvatarDefeat: false,
    allowLossOfFace: false
  },
  {
    level: 3,
    key: 'smug-rival',
    band: 'sharp',
    directness: 'direct',
    sarcasmDensity: 'moderate',
    fictionalStatusPressure: 'low',
    maxDirectAddresses: 1,
    allowAvatarDefeat: false,
    allowLossOfFace: false
  },
  {
    level: 4,
    key: 'cutting-correction',
    band: 'sharp',
    directness: 'direct',
    sarcasmDensity: 'high',
    fictionalStatusPressure: 'moderate',
    maxDirectAddresses: 1,
    allowAvatarDefeat: false,
    allowLossOfFace: false
  },
  {
    level: 5,
    key: 'sect-reprimand',
    band: 'severe',
    directness: 'confrontational',
    sarcasmDensity: 'high',
    fictionalStatusPressure: 'moderate',
    maxDirectAddresses: 1,
    allowAvatarDefeat: true,
    allowLossOfFace: false
  },
  {
    level: 6,
    key: 'public-duel-defeat',
    band: 'severe',
    directness: 'confrontational',
    sarcasmDensity: 'sustained',
    fictionalStatusPressure: 'high',
    maxDirectAddresses: 1,
    allowAvatarDefeat: true,
    allowLossOfFace: false
  },
  {
    level: 7,
    key: 'merciless-move-roast',
    band: 'severe',
    directness: 'aggressive-fiction',
    sarcasmDensity: 'sustained',
    fictionalStatusPressure: 'high',
    maxDirectAddresses: 2,
    allowAvatarDefeat: true,
    allowLossOfFace: false
  },
  {
    level: 8,
    key: 'tribunal-loss-of-face',
    band: 'merciless',
    directness: 'aggressive-fiction',
    sarcasmDensity: 'dominant',
    fictionalStatusPressure: 'very-high',
    maxDirectAddresses: 2,
    allowAvatarDefeat: true,
    allowLossOfFace: true
  },
  {
    level: 9,
    key: 'villain-domination',
    band: 'merciless',
    directness: 'villain-dominant',
    sarcasmDensity: 'dominant',
    fictionalStatusPressure: 'extreme',
    maxDirectAddresses: 2,
    allowAvatarDefeat: true,
    allowLossOfFace: true
  },
  {
    level: 10,
    key: 'total-theatrical-rout',
    band: 'merciless',
    directness: 'villain-dominant',
    sarcasmDensity: 'maximal-with-clarity',
    fictionalStatusPressure: 'total-fictional-rout',
    maxDirectAddresses: 2,
    allowAvatarDefeat: true,
    allowLossOfFace: true
  }
].map((profile) => Object.freeze({
  ...profile,
  target: profile.level === 0 ? 'none' : TARGET,
  requiresExplicitConsent: profile.level > 0,
  requiresEvidence: profile.level > 0
}));

export const HUMILIATION_LEVELS = Object.freeze(LEVELS);

export function normalizeHumiliationLevel(value) {
  const raw = String(value ?? '').trim();
  if (!/^(?:0|[1-9]|10)$/.test(raw)) return 0;
  const level = Number(raw);
  return Number.isInteger(level) && level >= 0 && level <= 10 ? level : 0;
}

export function humiliationProfile(value) {
  return HUMILIATION_LEVELS[normalizeHumiliationLevel(value)];
}

export function humiliationImpliesDuel(value) {
  return normalizeHumiliationLevel(value) > 0;
}
