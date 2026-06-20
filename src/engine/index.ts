import type { SeasonResult, SeasonTeam } from '@/types';
import { buildFranchiseTeams, simulateLeague, USER_TEAM_ID } from './seasonEngine';
import { deriveOutcome, simulatePlayoffs } from './playoffEngine';

export * from './draftEngine';
export * from './teamStrengthEngine';
export * from './compositionEngine';
export * from './chemistryEngine';
export * from './positionEngine';
export * from './seasonEngine';
export * from './seasonStagedEngine';
export * from './matchEngine';
export * from './playoffEngine';
export * from './chaseEngine';
export * from './playableEngine';
export * from './versusEngine';

/**
 * Full season pipeline: drop the user's XI into the franchise league,
 * play the league stage, run the playoffs and derive the user's outcome.
 */
export function simulateSeason(userTeam: SeasonTeam): SeasonResult {
  const teams: SeasonTeam[] = [userTeam, ...buildFranchiseTeams()];

  const { matches, standings } = simulateLeague(teams);
  const { playoffs, championId, runnerUpId } = simulatePlayoffs(standings);

  const userOutcome = deriveOutcome(USER_TEAM_ID, standings, playoffs);
  const userStanding = standings.find((s) => s.team.id === USER_TEAM_ID)!;

  return {
    standings,
    leagueMatches: matches,
    playoffs,
    championId,
    runnerUpId,
    userOutcome,
    userStanding,
  };
}
