import type { Composition, CompositionCheck, Player, PlayerRole } from '@/types';
import { clamp, round } from '@/utils';

// ---------------------------------------------------------------------------
// Fair-play composition rules.
//
// A real T20 XI must be a *complete* side, not just eleven high ratings. These
// rules are applied identically to the user's XI and to every AI franchise, so
// no one gains from an illegal/unbalanced shape. The dataset only carries four
// roles (BATTER / BOWLER / ALL_ROUNDER / WICKET_KEEPER) — there is no spin/pace
// flag — so bowling is judged on *depth of bowling options*, not pace vs spin.
//
// The result is a non-positive `modifier` (in team-power points): 0 for a
// complete side, negative when something essential is missing.
// ---------------------------------------------------------------------------

/** A keeper is mandatory. */
const MIN_KEEPERS = 1;
/** 20 overs need ~5 bowling options at a 4-over cap. */
const MIN_BOWLING_OPTIONS = 5;
/** Players who can bat: a credible batting line-up needs ~6. */
const MIN_BATTING_DEPTH = 6;

const NO_KEEPER_PENALTY = 8;
const PER_MISSING_BOWLER = 3;
const PER_MISSING_BATTER = 2.5;
const NO_SPECIALIST_BATTER_PENALTY = 3;

const MAX_PENALTY = 18;

function emptyCounts(): Record<PlayerRole, number> {
  return { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKET_KEEPER: 0 };
}

/**
 * Analyse a squad's role shape and produce the fair-play modifier plus a
 * human-readable checklist for the UI. Works on partial squads too (it simply
 * reports the gaps), so it doubles as live draft guidance.
 */
export function analyzeComposition(players: Player[]): Composition {
  const counts = emptyCounts();
  for (const p of players) counts[p.role]++;

  const bowlingOptions = counts.BOWLER + counts.ALL_ROUNDER;
  const battingDepth = counts.BATTER + counts.WICKET_KEEPER + counts.ALL_ROUNDER;
  const hasKeeper = counts.WICKET_KEEPER >= MIN_KEEPERS;

  let modifier = 0;
  if (!hasKeeper) modifier -= NO_KEEPER_PENALTY;
  if (bowlingOptions < MIN_BOWLING_OPTIONS) {
    modifier -= (MIN_BOWLING_OPTIONS - bowlingOptions) * PER_MISSING_BOWLER;
  }
  if (battingDepth < MIN_BATTING_DEPTH) {
    modifier -= (MIN_BATTING_DEPTH - battingDepth) * PER_MISSING_BATTER;
  }
  if (counts.BATTER === 0 && players.length > 0) modifier -= NO_SPECIALIST_BATTER_PENALTY;

  modifier = clamp(round(modifier, 1), -MAX_PENALTY, 0);

  const checks: CompositionCheck[] = [
    {
      key: 'keeper',
      label: 'Wicket-Keeper',
      ok: hasKeeper,
      value: counts.WICKET_KEEPER,
      target: MIN_KEEPERS,
      detail: hasKeeper ? 'Gloves covered' : 'No keeper in the XI',
    },
    {
      key: 'bowling',
      label: 'Bowling Attack',
      ok: bowlingOptions >= MIN_BOWLING_OPTIONS,
      value: bowlingOptions,
      target: MIN_BOWLING_OPTIONS,
      detail:
        bowlingOptions >= MIN_BOWLING_OPTIONS
          ? '20 overs covered'
          : `${MIN_BOWLING_OPTIONS - bowlingOptions} more bowling option(s) needed`,
    },
    {
      key: 'batting',
      label: 'Batting Depth',
      ok: battingDepth >= MIN_BATTING_DEPTH,
      value: battingDepth,
      target: MIN_BATTING_DEPTH,
      detail:
        battingDepth >= MIN_BATTING_DEPTH
          ? 'Solid line-up'
          : `${MIN_BATTING_DEPTH - battingDepth} more batting option(s) needed`,
    },
  ];

  return {
    counts,
    bowlingOptions,
    battingDepth,
    hasKeeper,
    allRounders: counts.ALL_ROUNDER,
    modifier,
    balanced: modifier === 0 && players.length > 0,
    checks,
  };
}
