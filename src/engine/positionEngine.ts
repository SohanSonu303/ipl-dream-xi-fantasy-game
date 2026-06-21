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

/**
 * A unit-of-the-XI check: is a section (top order / finisher / bowling attack)
 * actually staffed by the right *type* of player, not just the right headcount?
 */
export interface PositionCheck {
  key: 'top_order' | 'finisher' | 'bowling_slots';
  label: string;
  ok: boolean;
  /** How many slots in this section are filled by the wrong type. */
  misplaced: number;
  detail: string;
}

export interface PositionAnalysis {
  /** Net power adjustment from how the XI is arranged. */
  modifier: number;
  fits: PositionFit[];
  /** Section-by-section "right type in the right slot" checks. */
  checks: PositionCheck[];
  /** True when every section is correctly staffed (a real, balanced shape). */
  balanced: boolean;
}

const BATTING_ROLES = new Set<PlayerRole>(['BATTER', 'WICKET_KEEPER', 'ALL_ROUNDER']);
const BOWLING_ROLES = new Set<PlayerRole>(['BOWLER', 'ALL_ROUNDER']);

/** Count how many of the given slots are filled by a wrong-type player. */
function countMisplaced(xi: XI, slots: number[], allowed: Set<PlayerRole>): number {
  let bad = 0;
  for (const i of slots) {
    const p = xi[i];
    if (p && !allowed.has(p.role)) bad++;
  }
  return bad;
}

/**
 * Build the positional balance checklist. A *complete* T20 shape is more than
 * the right role counts — the run-scorers must sit up top, a genuine finisher
 * must hold the death-batting slot, and specialist bowlers must occupy the tail
 * bowling slots. These run on the ordered XI (index = batting position 0..10).
 */
function buildChecks(xi: XI): PositionCheck[] {
  const topBad = countMisplaced(xi, [0, 1, 2], BATTING_ROLES);
  const finisher = xi[5];
  const finisherOk = !finisher || BATTING_ROLES.has(finisher.role);
  const bowlBad = countMisplaced(xi, [8, 9, 10], BOWLING_ROLES);

  return [
    {
      key: 'top_order',
      label: 'Top Order',
      ok: topBad === 0,
      misplaced: topBad,
      detail: topBad === 0 ? 'Run-scorers up top' : `${topBad} bowler(s) shoehorned into the top order`,
    },
    {
      key: 'finisher',
      label: 'Finisher Slot',
      ok: finisherOk,
      misplaced: finisherOk ? 0 : 1,
      detail: finisherOk ? 'Death-overs batter at 6' : 'A specialist bowler is batting at the death',
    },
    {
      key: 'bowling_slots',
      label: 'Bowling Slots (9–11)',
      ok: bowlBad === 0,
      misplaced: bowlBad,
      detail: bowlBad === 0 ? 'Specialist bowlers at the tail' : `${bowlBad} batting slot(s) wasting a bowling position`,
    },
  ];
}

/**
 * An XI indexed by batting position (0..10). May be sparse during drafting —
 * a hole (`undefined`) is simply an unfilled slot and contributes nothing.
 */
export type XI = ReadonlyArray<Player | undefined>;

/**
 * Analyse an XI given in batting order (index = position 0..10). Accepts a
 * sparse array so partial squads are judged by *true* slot, not a compacted one.
 */
export function analyzePositions(orderedXI: XI): PositionAnalysis {
  let total = 0;
  let filled = 0;
  const fits: PositionFit[] = [];

  orderedXI.forEach((player, pos) => {
    if (!player || pos >= SLOT_PROFILE.length) return;
    filled++;
    const fit = roleFit(player.role, SLOT_PROFILE[pos]);
    const syn = traitSynergy(player, pos);
    total += fit + syn;
    fits.push({ pos, ok: fit >= 0, synergy: syn > 0 });
  });

  const checks = buildChecks(orderedXI);
  const balanced = filled > 0 && checks.every((c) => c.ok);

  // Misplacing players hurts a lot (order matters), but the upside is small so a
  // tidy order can't, by itself, make a side unbeatable.
  return { modifier: round(clamp(total, -16, 2), 1), fits, checks, balanced };
}
