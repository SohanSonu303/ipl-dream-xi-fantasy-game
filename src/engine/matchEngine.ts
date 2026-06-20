import type { MatchResult, Player, SeasonTeam } from '@/types';
import { getTrait } from '@/data/playerMeta';
import { clamp, random, randomFloat, round } from '@/utils';

/** Extra context that lets signature traits fire (e.g. big-game temperament). */
export interface MatchContext {
  /** Playoff / series-decider — unlocks knockout trait bonuses. */
  knockout?: boolean;
}

/** Cap on the combined signature-trait performance bonus per side. */
const TRAIT_BONUS_CAP = 3;
/** Cap on how much traits can raise a side's spark probability. */
const TRAIT_SPARK_CAP = 0.15;

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

// Tuned for genuine jeopardy: the better side is favoured but upsets are common,
// so no XI wins everything (a strong side ~70% head-to-head, not ~95%).
/** Spread of each side's day-to-day form (in power points) — the main luck source. */
const FORM_SCALE = 24;
/** Weight on out-classing the opponent in a discipline (lower = less snowballing). */
const MATCHUP_WEIGHT = 0.08;
/** Probability a side produces a special, momentum-shifting performance. */
const SPARK_CHANCE = 0.18;
const SPARK_MIN = 6;
const SPARK_MAX = 22;

/**
 * Approximately normal value in ~[-2, 2] (mean 0) via the central limit
 * theorem — the sum of four uniforms. Gives a believable bell curve: clustered
 * around par with fat-ish tails for the occasional thrashing or collapse.
 */
function bellSwing(): number {
  return random() + random() + random() + random() - 2;
}

/**
 * Award a Player of the Match from the winning side. Picked with a weighted
 * draw favouring high fantasy-weight stars, with the captain given an extra
 * leadership boost — so naming a captain meaningfully shapes the narrative.
 */
function awardPlayerOfMatch(team: SeasonTeam): Player | null {
  const roster = team.players;
  if (!roster || roster.length === 0) return null;

  const weights = roster.map((p) => {
    let w = p.fantasyWeight + 0.2; // floor so any player can have a day out
    if (team.captainId === p.id) w *= 1.6; // captain's leadership shines
    if (getTrait(p.id)) w *= 1.3; // signature stars grab the headlines
    return w;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = random() * total;
  for (let i = 0; i < roster.length; i++) {
    r -= weights[i];
    if (r <= 0) return roster[i];
  }
  return roster[roster.length - 1];
}

/**
 * Sum the signature-trait performance bonus a side earns this match, plus any
 * spark-probability boost. Traits are individual attributes, so they apply to
 * franchises and the user's XI alike — drafting trait stars onto your side is
 * how you claw the edge back.
 */
function traitProfile(
  team: SeasonTeam,
  opp: SeasonTeam,
  ctx: MatchContext,
): { bonus: number; sparkChance: number } {
  const roster = team.players;
  if (!roster || roster.length === 0) return { bonus: 0, sparkChance: 0 };

  const underdog = team.strength.teamPower < opp.strength.teamPower;
  let bonus = 0;
  let sparkChance = 0;

  for (const p of roster) {
    const trait = getTrait(p.id);
    if (!trait) continue;
    const e = trait.effect;
    bonus += e.flat ?? 0;
    if (underdog) bonus += e.underdog ?? 0;
    if (ctx.knockout) bonus += e.knockout ?? 0;
    sparkChance += e.sparkChance ?? 0;
  }

  return {
    bonus: clamp(bonus, 0, TRAIT_BONUS_CAP),
    sparkChance: clamp(sparkChance, 0, TRAIT_SPARK_CAP),
  };
}

function performance(team: SeasonTeam, opp: SeasonTeam, ctx: MatchContext): number {
  const s = team.strength;
  const o = opp.strength;

  // Non-linear: you only gain when you out-rate them in a discipline, so a
  // batting-heavy side punishes a weak attack, a strong attack chokes big bats.
  const batEdge = Math.max(0, s.batting - o.bowling);
  const bowlEdge = Math.max(0, s.bowling - o.batting);
  const matchup = (batEdge + bowlEdge) * MATCHUP_WEIGHT;

  const { bonus, sparkChance } = traitProfile(team, opp, ctx);

  const form = bellSwing() * FORM_SCALE;
  const spark = random() < SPARK_CHANCE + sparkChance ? randomFloat(SPARK_MIN, SPARK_MAX) : 0;

  return s.teamPower + matchup + form + spark + bonus;
}

/** Simulate a single match. There are no ties — power breaks a dead heat. */
export function simulateMatch(
  home: SeasonTeam,
  away: SeasonTeam,
  id: string,
  ctx: MatchContext = {},
): MatchResult {
  let homeScore = performance(home, away, ctx);
  let awayScore = performance(away, home, ctx);

  if (homeScore === awayScore) {
    homeScore += home.strength.teamPower - away.strength.teamPower || 0.1;
  }

  const homeWins = homeScore > awayScore;
  const winner = homeWins ? home : away;
  const motm = awardPlayerOfMatch(winner);

  return {
    id,
    homeId: home.id,
    awayId: away.id,
    homeScore: round(homeScore, 2),
    awayScore: round(awayScore, 2),
    winnerId: homeWins ? home.id : away.id,
    loserId: homeWins ? away.id : home.id,
    margin: round(Math.abs(homeScore - awayScore), 2),
    playerOfMatchId: motm?.id,
    playerOfMatchName: motm?.name,
    playerOfMatchTeamId: motm ? winner.id : undefined,
  };
}
