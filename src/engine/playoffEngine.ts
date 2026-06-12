import type {
  PlayoffMatch,
  SeasonOutcome,
  SeasonTeam,
  Standing,
} from '@/types';
import { simulateMatch } from './matchEngine';

export interface PlayoffResult {
  playoffs: PlayoffMatch[];
  championId: string;
  runnerUpId: string;
}

/**
 * Run the four-match IPL playoff:
 *   Qualifier 1 : 1 v 2  -> winner to Final, loser to Qualifier 2
 *   Eliminator  : 3 v 4  -> winner to Qualifier 2, loser out
 *   Qualifier 2 : Q1 loser v Eliminator winner -> winner to Final, loser out
 *   Final       : Q1 winner v Q2 winner -> Champion / Runner-up
 */
export function simulatePlayoffs(standings: Standing[]): PlayoffResult {
  const t = (i: number): SeasonTeam => standings[i].team;

  const q1 = simulateMatch(t(0), t(1), 'PO_Q1');
  const elim = simulateMatch(t(2), t(3), 'PO_ELIM');

  const teamById = new Map(standings.map((s) => [s.team.id, s.team]));
  const q1Loser = teamById.get(q1.loserId)!;
  const elimWinner = teamById.get(elim.winnerId)!;

  const q2 = simulateMatch(q1Loser, elimWinner, 'PO_Q2');

  const q1Winner = teamById.get(q1.winnerId)!;
  const q2Winner = teamById.get(q2.winnerId)!;

  const final = simulateMatch(q1Winner, q2Winner, 'PO_FINAL');

  const playoffs: PlayoffMatch[] = [
    { stage: 'QUALIFIER_1', label: 'Qualifier 1', teamAId: t(0).id, teamBId: t(1).id, result: q1 },
    { stage: 'ELIMINATOR', label: 'Eliminator', teamAId: t(2).id, teamBId: t(3).id, result: elim },
    { stage: 'QUALIFIER_2', label: 'Qualifier 2', teamAId: q1Loser.id, teamBId: elimWinner.id, result: q2 },
    { stage: 'FINAL', label: 'Final', teamAId: q1Winner.id, teamBId: q2Winner.id, result: final },
  ];

  return {
    playoffs,
    championId: final.winnerId,
    runnerUpId: final.loserId,
  };
}

/** Map the user's journey through the bracket to a single outcome label. */
export function deriveOutcome(
  userId: string,
  standings: Standing[],
  playoffs: PlayoffMatch[],
): SeasonOutcome {
  const position = standings.find((s) => s.team.id === userId)?.position ?? 99;
  if (position > 4) return 'FAILED_TO_QUALIFY';

  const elim = playoffs.find((p) => p.stage === 'ELIMINATOR')!;
  const q2 = playoffs.find((p) => p.stage === 'QUALIFIER_2')!;
  const final = playoffs.find((p) => p.stage === 'FINAL')!;

  if (final.result!.winnerId === userId) return 'CHAMPION';
  if (final.result!.loserId === userId) return 'RUNNER_UP';
  if (q2.result!.loserId === userId) return 'QUALIFIER_2_EXIT';
  if (elim.result!.loserId === userId) return 'ELIMINATOR_EXIT';

  // Qualified, lost Qualifier 1, then lost Qualifier 2 -> covered above.
  // Any remaining path means knocked out in Qualifier 2.
  return 'QUALIFIER_2_EXIT';
}
