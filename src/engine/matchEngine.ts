import type { MatchResult, SeasonTeam } from '@/types';
import { randomFloat, round } from '@/utils';

// ---------------------------------------------------------------------------
// Match engine. A result is decided by each side's "performance on the day",
// which blends four things so the best squad is favoured but never guaranteed:
//
//   1. teamPower  — overall class (ratings + fair-play composition).
//   2. matchup    — a non-linear reward for exploiting the opponent's weakness
//                   (out-batting their attack / out-bowling their batters).
//   3. form       — a bell-curve swing: most days near your level, some games
//                   you fire, some you flop. This is the main source of luck.
//   4. spark      — an occasional individual star-turn (a blinder) that can
//                   topple a stronger side outright. Pure upset fuel.
//
// Higher performance wins; there are no ties.
// ---------------------------------------------------------------------------

/** Spread of each side's day-to-day form (in power points). */
const FORM_SCALE = 17;
/** Weight on out-classing the opponent in a discipline. */
const MATCHUP_WEIGHT = 0.18;
/** Probability a side produces a special, momentum-shifting performance. */
const SPARK_CHANCE = 0.16;
const SPARK_MIN = 6;
const SPARK_MAX = 22;

/**
 * Approximately normal value in ~[-2, 2] (mean 0) via the central limit
 * theorem — the sum of four uniforms. Gives a believable bell curve: clustered
 * around par with fat-ish tails for the occasional thrashing or collapse.
 */
function bellSwing(): number {
  return Math.random() + Math.random() + Math.random() + Math.random() - 2;
}

function performance(team: SeasonTeam, opp: SeasonTeam): number {
  const s = team.strength;
  const o = opp.strength;

  // Non-linear: you only gain when you out-rate them in a discipline, so a
  // batting-heavy side punishes a weak attack, a strong attack chokes big bats.
  const batEdge = Math.max(0, s.batting - o.bowling);
  const bowlEdge = Math.max(0, s.bowling - o.batting);
  const matchup = (batEdge + bowlEdge) * MATCHUP_WEIGHT;

  const form = bellSwing() * FORM_SCALE;
  const spark = Math.random() < SPARK_CHANCE ? randomFloat(SPARK_MIN, SPARK_MAX) : 0;

  return s.teamPower + matchup + form + spark;
}

/** Simulate a single match. There are no ties — power breaks a dead heat. */
export function simulateMatch(
  home: SeasonTeam,
  away: SeasonTeam,
  id: string,
): MatchResult {
  let homeScore = performance(home, away);
  let awayScore = performance(away, home);

  if (homeScore === awayScore) {
    homeScore += home.strength.teamPower - away.strength.teamPower || 0.1;
  }

  const homeWins = homeScore > awayScore;
  return {
    id,
    homeId: home.id,
    awayId: away.id,
    homeScore: round(homeScore, 2),
    awayScore: round(awayScore, 2),
    winnerId: homeWins ? home.id : away.id,
    loserId: homeWins ? away.id : home.id,
    margin: round(Math.abs(homeScore - awayScore), 2),
  };
}
