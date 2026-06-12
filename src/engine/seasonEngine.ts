import type {
  MatchResult,
  SeasonTeam,
  Standing,
  TeamCode,
  TeamStrength,
} from '@/types';
import { TEAM_CODES, TEAM_META } from '@/data/teams';
import { playersForTeam } from './draftEngine';
import { computeStrength } from './teamStrengthEngine';
import { simulateMatch } from './matchEngine';
import { round, shuffle } from '@/utils';

/** League matches each team plays before the playoffs. */
export const LEAGUE_MATCHES_PER_TEAM = 18;

/** The user's drafted XI joins the ten franchises -> an 11-team league. */
export const USER_TEAM_ID = 'USER_DREAM_XI';

/** Build the ten AI franchises from their real dataset squads. */
export function buildFranchiseTeams(): SeasonTeam[] {
  return TEAM_CODES.map((code: TeamCode) => {
    const squad = playersForTeam(code);
    return {
      id: `FR_${code}`,
      name: TEAM_META[code].name,
      code,
      isUser: false,
      strength: computeStrength(squad),
    };
  });
}

/** Wrap the user's drafted XI as a season team. */
export function buildUserTeam(name: string, strength: TeamStrength): SeasonTeam {
  return {
    id: USER_TEAM_ID,
    name,
    code: 'XI',
    isUser: true,
    strength,
  };
}

/**
 * Build a balanced schedule where every team plays exactly `perTeam` matches.
 * Uses the round-robin "circle method" greedily, then pairs any residual
 * fixtures between the most-needy teams so totals land exactly.
 */
export function buildSchedule(ids: string[], perTeam: number): Array<[string, string]> {
  const teams = shuffle(ids);
  if (teams.length % 2 === 1) teams.push('__BYE__');
  const n = teams.length;
  const half = n / 2;

  const need: Record<string, number> = {};
  ids.forEach((id) => (need[id] = perTeam));

  const fixtures: Array<[string, string]> = [];
  let rotation = teams.slice();
  const maxRounds = perTeam * n + n;

  for (let r = 0; r < maxRounds && ids.some((id) => need[id] > 0); r++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === '__BYE__' || b === '__BYE__') continue;
      if (need[a] > 0 && need[b] > 0) {
        fixtures.push([a, b]);
        need[a]--;
        need[b]--;
      }
    }
    // Rotate all but the first entry (standard circle method).
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop() as string);
    rotation = [fixed, ...rest];
  }

  // Residual pass: pair the two most-needy teams until none remain.
  for (;;) {
    const remaining = ids.filter((id) => need[id] > 0).sort((a, b) => need[b] - need[a]);
    if (remaining.length < 2) break;
    const [a, b] = remaining;
    fixtures.push([a, b]);
    need[a]--;
    need[b]--;
  }

  return fixtures;
}

export interface LeagueSimulation {
  matches: MatchResult[];
  standings: Standing[];
}

/** Simulate the full league stage and produce a ranked points table. */
export function simulateLeague(teams: SeasonTeam[]): LeagueSimulation {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const schedule = buildSchedule(
    teams.map((t) => t.id),
    LEAGUE_MATCHES_PER_TEAM,
  );

  const matches: MatchResult[] = schedule.map(([homeId, awayId], idx) =>
    simulateMatch(byId.get(homeId)!, byId.get(awayId)!, `L${idx + 1}`),
  );

  // Tally records and a net-rating proxy (aggregate score differential).
  const tally = new Map<string, { won: number; lost: number; played: number; diff: number }>();
  teams.forEach((t) => tally.set(t.id, { won: 0, lost: 0, played: 0, diff: 0 }));

  for (const m of matches) {
    const h = tally.get(m.homeId)!;
    const a = tally.get(m.awayId)!;
    h.played++;
    a.played++;
    h.diff += m.homeScore - m.awayScore;
    a.diff += m.awayScore - m.homeScore;
    if (m.winnerId === m.homeId) {
      h.won++;
      a.lost++;
    } else {
      a.won++;
      h.lost++;
    }
  }

  const standings: Standing[] = teams
    .map((team) => {
      const t = tally.get(team.id)!;
      return {
        team,
        played: t.played,
        won: t.won,
        lost: t.lost,
        points: t.won * 2,
        netRating: round(t.diff / Math.max(1, t.played), 2),
        position: 0,
      };
    })
    .sort((a, b) => b.points - a.points || b.netRating - a.netRating || b.team.strength.teamPower - a.team.strength.teamPower)
    .map((s, i) => ({ ...s, position: i + 1 }));

  return { matches, standings };
}
