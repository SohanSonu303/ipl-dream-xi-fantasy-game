import type { MatchResult, SeasonTeam } from '@/types';
import { randomFloat, round } from '@/utils';

/** Match variance window applied on top of team power. */
const VARIANCE = 12;

/**
 * One innings' worth of "score" for a team in a match.
 *
 * matchScore = teamPower + random(-12, +12)
 *
 * The spec phrases this as multiplication, but a swing of ±12 *added* to power
 * is what produces believable upsets while still rewarding stronger squads —
 * multiplying by a value that can go negative would make power meaningless.
 */
function matchScore(team: SeasonTeam): number {
  return team.strength.teamPower + randomFloat(-VARIANCE, VARIANCE);
}

/** Simulate a single match. There are no ties — power decides a dead heat. */
export function simulateMatch(
  home: SeasonTeam,
  away: SeasonTeam,
  id: string,
): MatchResult {
  let homeScore = matchScore(home);
  let awayScore = matchScore(away);

  // Guarantee a winner: nudge by the (deterministic-enough) power edge.
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
