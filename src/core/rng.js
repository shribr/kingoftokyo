// rng.js - Deterministic RNG utilities (Mulberry32) + seed derivation helpers
// Usage: const rng = createSeededRNG(seed); const v = rng(); // 0..1 float
// Non-destructive: does not mutate global Math.random.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a 32-bit hash for stable seed derivation from strings
export function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i=0;i<str.length;i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function combineSeed(...parts) {
  // Mix multiple numeric seeds (32-bit) into one via xor + mul
  return parts.reduce((acc, v) => {
    const n = (typeof v === 'number') ? (v >>> 0) : fnv1a32(String(v));
    let x = acc ^ n;
    x = Math.imul(x + 0x9e3779b9, 0x85ebca6b) >>> 0; // mix constants
    return x >>> 0;
  }, 0x811c9dc5) >>> 0;
}

export function createSeededRNG(seed) {
  return mulberry32(seed >>> 0);
}

// Base constant so test seeds are stable even if turnCycleId starts at 0
export const BASE_TEST_SEED = 0xA17C9E55;

// Derive a seed for an AI decision (roll-level) combining stable identifiers
export function deriveDecisionSeed(prefix, turnCycleId, decisionIndex, playerId) {
  return combineSeed(BASE_TEST_SEED, prefix || 'AI_DECISION', turnCycleId|0, decisionIndex|0, playerId|0);
}

// Create deterministic RNG context for an AI decision if deterministic mode active
export function maybeCreateDecisionRng(turnCycleId, decisionIndex, playerId) {
  if (!isDeterministicMode()) return null;
  const seed = deriveDecisionSeed('KOT_AI', turnCycleId, decisionIndex, playerId);
  return { seed, rng: createSeededRNG(seed) };
}

export function nextInt(rng, max) { return Math.floor(rng() * max); }

export function deriveRngForTurn(baseSeed, turnCycleId, rollIndex) {
  return createSeededRNG(combineSeed(baseSeed, turnCycleId, rollIndex));
}

export function isDeterministicMode() {
  // Prefer explicit browser flag if present
  if (typeof window !== 'undefined') {
    if (window.__KOT_TEST_MODE__) return true;
    // Fallback to env even if window polyfilled (Node test harness creates window object)
    return !!(typeof process !== 'undefined' && process.env && process.env.KOT_TEST_MODE);
  }
  return !!(typeof process !== 'undefined' && process.env && process.env.KOT_TEST_MODE);
}
