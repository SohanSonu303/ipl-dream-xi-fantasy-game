// ---------------------------------------------------------------------------
// Small, dependency-free helpers shared across the app.
// ---------------------------------------------------------------------------

/** Join class names, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// --- Seedable randomness -----------------------------------------------------
// Every random helper below draws from `random()`. By default that's
// `Math.random` (free play). The Daily Challenge calls `seedRng(seed)` so the
// whole draw + simulation stream is reproducible: same seed → same rolls, packs
// and match variance, making it a fair, shareable, skill-based puzzle.

let rngState: (() => number) | null = null;

/** Mulberry32 — a tiny, fast, well-distributed seeded PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random in [0, 1) — seeded when a seed is active, else `Math.random`. */
export function random(): number {
  return rngState ? rngState() : Math.random();
}

/** Seed the global RNG for a reproducible run (Daily Challenge). */
export function seedRng(seed: number): void {
  rngState = mulberry32(seed >>> 0);
}

/** Restore non-deterministic randomness (free play). */
export function resetRng(): void {
  rngState = null;
}

/** Deterministic 32-bit string hash (FNV-1a) — used to derive seeds. */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Inclusive random integer in [min, max]. */
export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/** Random float in [min, max). */
export function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min;
}

/** Pick a random element from a non-empty array. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

/** Return a new shuffled copy (Fisher–Yates). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Two-letter monogram from a player's name, e.g. "Rashid Khan" -> "RK". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Ordinal suffix: 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Round to a fixed number of decimals, returning a number. */
export function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
