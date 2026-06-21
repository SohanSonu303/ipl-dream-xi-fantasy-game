import type { TeamStrength } from '@/types';
import { clamp, random, round } from '@/utils';

// ---------------------------------------------------------------------------
// Pitch & conditions. Every surface plays differently: a featherbed flat track
// is a batter's dream, a green seamer and a dusty turner reward a strong attack.
// The pitch is the same for both sides, so it doesn't pick a winner — it rewards
// the side better *built* for the conditions, adding pre-game intrigue and
// variety across a season.
// ---------------------------------------------------------------------------

export type PitchType = 'FLAT' | 'GREEN' | 'DUSTY' | 'BALANCED';

export interface PitchMeta {
  type: PitchType;
  label: string;
  emoji: string;
  /** Which discipline the surface rewards. */
  favours: 'BAT' | 'BOWL' | 'NONE';
  blurb: string;
}

export const PITCH_META: Record<PitchType, PitchMeta> = {
  FLAT: { type: 'FLAT', label: 'Flat Track', emoji: '🛣️', favours: 'BAT', blurb: 'A batting belter — runs on offer.' },
  GREEN: { type: 'GREEN', label: 'Green Top', emoji: '🌱', favours: 'BOWL', blurb: 'Seam movement — the quicks will fancy it.' },
  DUSTY: { type: 'DUSTY', label: 'Dust Bowl', emoji: '🏜️', favours: 'BOWL', blurb: 'Turning square — spinners into the game.' },
  BALANCED: { type: 'BALANCED', label: 'Balanced', emoji: '⚖️', favours: 'NONE', blurb: 'A fair contest between bat and ball.' },
};

const PITCH_WEIGHTS: Array<[PitchType, number]> = [
  ['BALANCED', 0.4],
  ['FLAT', 0.24],
  ['GREEN', 0.18],
  ['DUSTY', 0.18],
];

/** Roll a pitch for a match (seeded-safe). */
export function rollPitch(): PitchType {
  let r = random();
  for (const [t, w] of PITCH_WEIGHTS) {
    if (r < w) return t;
    r -= w;
  }
  return 'BALANCED';
}

/**
 * Performance adjustment a side earns on a pitch, from how well its strengths
 * suit the surface. Symmetric (both sides see the same pitch), so it favours the
 * better-suited team rather than handing anyone a free win.
 */
export function pitchPerfMod(s: TeamStrength, pitch: PitchType): number {
  switch (pitch) {
    case 'FLAT':
      return clamp((s.batting - 80) * 0.06, -3, 3);
    case 'GREEN':
      return clamp((s.bowling - 80) * 0.06, -3, 3);
    case 'DUSTY':
      return clamp((s.bowling - 80) * 0.05, -3, 3);
    default:
      return 0;
  }
}

export interface FinalOverConditions {
  pitch: PitchType;
  /** 'YOU' won the toss (small edge) or the rival did. */
  tossWonByUser: boolean;
}

/** Roll the toss + pitch for the playable final over. */
export function rollConditions(): FinalOverConditions {
  return { pitch: rollPitch(), tossWonByUser: random() < 0.5 };
}

/** How the pitch (and toss) bend the playable final over. */
export function finalOverEffect(c: FinalOverConditions): { targetDelta: number; contestDelta: number } {
  let targetDelta = 0;
  let contestDelta = 0;
  switch (c.pitch) {
    case 'FLAT':
      targetDelta = -2;
      contestDelta = 6;
      break;
    case 'GREEN':
      targetDelta = 2;
      contestDelta = -6;
      break;
    case 'DUSTY':
      targetDelta = 1;
      contestDelta = -4;
      break;
    default:
      break;
  }
  if (c.tossWonByUser) targetDelta -= 1; // winning the toss is a small edge
  return { targetDelta: round(targetDelta, 0), contestDelta };
}
