import type { Player, PlayerRole } from '@/types';
import { getTrait } from '@/data/playerMeta';
import { clamp, round } from '@/utils';

// ---------------------------------------------------------------------------
// Batting-order matters. Each of the eleven slots has an ideal player profile;
// putting the right type — and the right signature trait — in the right slot
// boosts team power, while shoehorning a bowler into the top order (or a batter
// at the death) costs you. This makes *arranging* the XI a real decision, not
// just cosmetics.
// ---------------------------------------------------------------------------

type SlotProfile = 'TOP' | 'MIDDLE' | 'FINISHER' | 'ALLROUND' | 'SPIN' | 'PACE';

/** Profile for each batting position 0..10 (mirrors SLOT_HINTS in SquadBoard). */
const SLOT_PROFILE: SlotProfile[] = [
  'TOP', 'TOP', 'TOP', 'MIDDLE', 'MIDDLE', 'FINISHER', 'ALLROUND', 'ALLROUND', 'SPIN', 'PACE', 'PACE',
];

const BATTING_SLOTS = new Set<SlotProfile>(['TOP', 'MIDDLE', 'FINISHER']);
const BOWLING_SLOTS = new Set<SlotProfile>(['SPIN', 'PACE']);

/** Fit of a role in a slot, in power points (+ good, − misplaced). */
function roleFit(role: PlayerRole, profile: SlotProfile): number {
  if (BATTING_SLOTS.has(profile)) {
    if (role === 'BATTER' || role === 'WICKET_KEEPER') return 1;
    if (role === 'ALL_ROUNDER') return 0;
    return -2.5; // a specialist bowler in the top/middle order
  }
  if (BOWLING_SLOTS.has(profile)) {
    if (role === 'BOWLER') return 1;
    if (role === 'ALL_ROUNDER') return 0;
    return -2.5; // a pure batter/keeper at 9–11
  }
  // ALLROUND slot
  if (role === 'ALL_ROUNDER') return 1;
  return 0;
}

/** Trait that lands in its sweet-spot slot earns a synergy bonus. */
function traitSynergy(player: Player, pos: number): number {
  const trait = getTrait(player.id);
  if (!trait) return 0;
  switch (trait.key) {
    case 'POWERPLAY_ENFORCER':
      return pos <= 2 ? 1.5 : 0;
    case 'CHASE_MASTER':
      return pos >= 2 && pos <= 4 ? 1.2 : 0;
    case 'FINISHER':
      return pos === 5 ? 2 : 0;
    case 'SPIN_WIZARD':
      return pos === 8 ? 1.5 : 0;
    case 'DEATH_OVERS_KING':
    case 'PACE_SPEARHEAD':
      return pos >= 9 ? 1.5 : 0;
    default:
      return 0;
  }
}

export interface PositionFit {
  pos: number;
  ok: boolean;
  synergy: boolean;
}

export interface PositionAnalysis {
  /** Net power adjustment from how the XI is arranged. */
  modifier: number;
  fits: PositionFit[];
}

/**
 * Analyse an XI given in batting order (index = position 0..10).
 */
export function analyzePositions(orderedXI: Player[]): PositionAnalysis {
  let total = 0;
  const fits: PositionFit[] = [];

  orderedXI.forEach((player, pos) => {
    if (pos >= SLOT_PROFILE.length) return;
    const fit = roleFit(player.role, SLOT_PROFILE[pos]);
    const syn = traitSynergy(player, pos);
    total += fit + syn;
    fits.push({ pos, ok: fit >= 0, synergy: syn > 0 });
  });

  // Misplacing players still hurts a lot (order matters), but the upside is
  // small so a tidy order can't, by itself, make a side unbeatable.
  return { modifier: round(clamp(total, -14, 2), 1), fits };
}
