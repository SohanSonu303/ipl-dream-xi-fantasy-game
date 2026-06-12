import type { Player, TeamStrength } from '@/types';
import { clamp, round } from '@/utils';
import { analyzeComposition } from './compositionEngine';

/** Average of a numeric selector across players (0 for an empty list). */
function avg(players: Player[], sel: (p: Player) => number): number {
  if (players.length === 0) return 0;
  return players.reduce((sum, p) => sum + sel(p), 0) / players.length;
}

/**
 * Compute the four strength dimensions and the composite team power.
 *
 * Per the design spec:
 *   batting  = avg(battingRating)
 *   bowling  = avg(bowlingRating)
 *   overall  = avg(overallRating)
 *   fantasy  = avg(fantasyWeight) * 100      (0-100 scale)
 *
 * basePower is the weighted blend (overall 0.50, batting 0.20, bowling 0.20,
 * fantasy 0.10). The spec writes this with "*" between terms, but the only
 * interpretation that yields the stated 0-100 result — and that rewards
 * stronger squads — is a weighted sum, which is what we use.
 *
 * teamPower then applies the fair-play composition modifier (see
 * compositionEngine): a complete side keeps its full base power, an incomplete
 * one (no keeper, too few bowlers, thin batting) is penalised. The same rule
 * runs for the user's XI and every franchise, so the league stays fair.
 */
export function computeStrength(players: Player[]): TeamStrength {
  const batting = avg(players, (p) => p.battingRating);
  const bowling = avg(players, (p) => p.bowlingRating);
  const overall = avg(players, (p) => p.overallRating);
  const fantasy = avg(players, (p) => p.fantasyWeight) * 100;

  const basePower = overall * 0.5 + batting * 0.2 + bowling * 0.2 + fantasy * 0.1;
  const { modifier } = analyzeComposition(players);
  const teamPower = clamp(basePower + modifier, 0, 100);

  return {
    batting: round(batting),
    bowling: round(bowling),
    overall: round(overall),
    fantasy: round(fantasy),
    basePower: round(basePower),
    compositionModifier: round(modifier, 1),
    teamPower: round(teamPower),
  };
}
