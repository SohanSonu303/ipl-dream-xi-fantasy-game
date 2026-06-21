import type { MatchResult, SeasonTeam } from '@/types';
import type { SharedTeam } from '@/utils/shareCode';
import { hashString, resetRng, seedRng } from '@/utils';
import { ALL_PLAYERS } from './draftEngine';
import { buildManagedTeam } from './seasonEngine';
import { simulateMatch } from './matchEngine';
import { resetForm } from './formEngine';

// ---------------------------------------------------------------------------
// Head-to-head friend battles. A shared XI is reconstructed from the dataset
// and played as a best-of-three series against the challenger's drafted XI. The
// series is seeded from both line-ups, so it's fair, reproducible and can't be
// re-rolled for a luckier result — your draft is your edge.
// ---------------------------------------------------------------------------

export const VS_USER_ID = 'VS_USER';
export const VS_OPP_ID = 'VS_OPP';

export interface VersusResult {
  user: SeasonTeam;
  opponent: SeasonTeam;
  matches: MatchResult[];
  userWins: number;
  oppWins: number;
  userWonSeries: boolean;
  bestOf: number;
}

/** Rebuild a full season team (with chemistry + captain) from a shared code. */
export function hydrateSharedTeam(
  shared: SharedTeam,
  id: string,
  isUser: boolean,
): SeasonTeam | null {
  const byId = new Map(ALL_PLAYERS.map((p) => [p.id, p]));
  const ordered = [...shared.slots].sort((a, b) => a[0] - b[0]);
  const players = [];
  for (const [, playerId] of ordered) {
    const p = byId.get(playerId);
    if (!p) return null; // unknown id — reject the whole code
    players.push(p);
  }
  if (players.length !== 11) return null;

  return buildManagedTeam({
    id,
    name: shared.name,
    code: 'XI',
    players,
    captainId: shared.captainId,
    isUser,
  });
}

function seriesKey(team: SeasonTeam): string {
  const ids = (team.players ?? []).map((p) => p.id).sort((a, b) => a - b).join(',');
  return `${ids}#${team.captainId ?? 0}`;
}

/** Play a best-of-N head-to-head series (default best-of-3). */
export function simulateSeries(
  user: SeasonTeam,
  opponent: SeasonTeam,
  bestOf = 3,
): VersusResult {
  const winsNeeded = Math.floor(bestOf / 2) + 1;

  // Deterministic from both XIs: the same two teams always produce the same
  // series, so neither player can fish for a better outcome.
  seedRng(hashString(`${seriesKey(user)}|${seriesKey(opponent)}`));
  resetForm(); // momentum builds within the series, fresh each time

  const matches: MatchResult[] = [];
  let userWins = 0;
  let oppWins = 0;

  for (let i = 0; i < bestOf && userWins < winsNeeded && oppWins < winsNeeded; i++) {
    // Alternate "home" advantage across the series for fairness.
    const home = i % 2 === 0 ? user : opponent;
    const away = i % 2 === 0 ? opponent : user;
    const m = simulateMatch(home, away, `VS_${i + 1}`, { knockout: true });
    matches.push(m);
    if (m.winnerId === user.id) userWins++;
    else oppWins++;
  }

  resetRng();

  return {
    user,
    opponent,
    matches,
    userWins,
    oppWins,
    userWonSeries: userWins > oppWins,
    bestOf,
  };
}
