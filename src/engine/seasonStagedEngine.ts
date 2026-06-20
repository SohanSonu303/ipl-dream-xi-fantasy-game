import type { MatchResult, SeasonResult, SeasonTeam } from '@/types';
import {
  LEAGUE_MATCHES_PER_TEAM,
  USER_TEAM_ID,
  buildFranchiseTeams,
  buildSchedule,
  computeStandings,
} from './seasonEngine';
import { simulateMatch } from './matchEngine';
import { deriveOutcome, simulatePlayoffs } from './playoffEngine';

// ---------------------------------------------------------------------------
// Staged season so the mid-season Impact Player swap can actually matter. We
// fix everything that doesn't depend on the user (franchise-vs-franchise games)
// and the user's first-half fixtures, pause for the swap, then re-simulate the
// user's remaining games + playoffs with the (possibly changed) XI.
// ---------------------------------------------------------------------------

export interface StagedSeason {
  /** The user's XI as it stood for the first half (for reveal team lookups). */
  userTeam: SeasonTeam;
  franchises: SeasonTeam[];
  /** Franchise-vs-franchise matches — never affected by the user's XI. */
  nonUserMatches: MatchResult[];
  /** User's first-half league matches, played with the original XI. */
  userFirstHalf: MatchResult[];
  /** User's remaining fixtures as [homeId, awayId], to play after the swap. */
  remainingUserFixtures: Array<[string, string]>;
  /** Id-numbering offset so second-half match ids stay unique. */
  startIndex: number;
}

export interface FinishedSeason {
  seasonResult: SeasonResult;
  userInFinal: boolean;
  /** User's second-half league matches (for the resumed reveal). */
  userSecondHalf: MatchResult[];
  /** The other finalist when the user reaches the final (else null). */
  finalOpponentId: string | null;
}

/** Play the fixed part of the season and the user's first half. */
export function prepareStagedSeason(userTeam: SeasonTeam): StagedSeason {
  const franchises = buildFranchiseTeams();
  const teams = [userTeam, ...franchises];
  const byId = new Map(teams.map((t) => [t.id, t]));
  const schedule = buildSchedule(teams.map((t) => t.id), LEAGUE_MATCHES_PER_TEAM);

  const nonUserMatches: MatchResult[] = [];
  const userFixtures: Array<[string, string]> = [];

  schedule.forEach(([homeId, awayId], idx) => {
    if (homeId === USER_TEAM_ID || awayId === USER_TEAM_ID) {
      userFixtures.push([homeId, awayId]);
    } else {
      nonUserMatches.push(simulateMatch(byId.get(homeId)!, byId.get(awayId)!, `L${idx + 1}`));
    }
  });

  const splitAt = Math.ceil(userFixtures.length / 2);
  const userFirstHalf = userFixtures
    .slice(0, splitAt)
    .map(([h, a], i) => simulateMatch(byId.get(h)!, byId.get(a)!, `LU${i + 1}`));

  return {
    userTeam,
    franchises,
    nonUserMatches,
    userFirstHalf,
    remainingUserFixtures: userFixtures.slice(splitAt),
    startIndex: splitAt,
  };
}

/**
 * Finish the season with the (possibly swapped) user team: play the remaining
 * user fixtures, build the table, then the playoffs — deferring the final if the
 * user reaches it so it can be played live.
 */
export function finishStagedSeason(staged: StagedSeason, userTeam: SeasonTeam): FinishedSeason {
  const teams = [userTeam, ...staged.franchises];
  const byId = new Map(teams.map((t) => [t.id, t]));

  const userSecondHalf = staged.remainingUserFixtures.map(([h, a], i) =>
    simulateMatch(byId.get(h)!, byId.get(a)!, `LU${staged.startIndex + i + 1}`),
  );

  const leagueMatches = [...staged.nonUserMatches, ...staged.userFirstHalf, ...userSecondHalf];
  const standings = computeStandings(teams, leagueMatches);

  const { playoffs, championId, runnerUpId, userInFinal } = simulatePlayoffs(standings, {
    deferFinalForId: USER_TEAM_ID,
  });

  const userStanding = standings.find((s) => s.team.id === USER_TEAM_ID)!;
  // When the user is in the final it's unplayed, so the outcome is provisional
  // (overwritten once the live over is bowled).
  const userOutcome = userInFinal
    ? 'RUNNER_UP'
    : deriveOutcome(USER_TEAM_ID, standings, playoffs);

  let finalOpponentId: string | null = null;
  if (userInFinal) {
    const final = playoffs.find((p) => p.stage === 'FINAL')!;
    finalOpponentId = final.teamAId === USER_TEAM_ID ? final.teamBId : final.teamAId;
  }

  return {
    seasonResult: {
      standings,
      leagueMatches,
      playoffs,
      championId,
      runnerUpId,
      userOutcome,
      userStanding,
    },
    userInFinal,
    userSecondHalf,
    finalOpponentId,
  };
}
