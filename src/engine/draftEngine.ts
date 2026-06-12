import type { Player, PlayersDataset, TeamCode } from '@/types';
import { TEAM_CODES } from '@/data/teams';
import { pick, shuffle } from '@/utils';
import dataset from '@/data/players.json';

const DATA = dataset as PlayersDataset;

export const ALL_PLAYERS: Player[] = DATA.players;
export const SEASON_LABEL = DATA.season;

const BY_TEAM: Record<string, Player[]> = TEAM_CODES.reduce(
  (acc, code) => {
    acc[code] = ALL_PLAYERS.filter((p) => p.team === code);
    return acc;
  },
  {} as Record<string, Player[]>,
);

/** All players for a given franchise (full dataset squad). */
export function playersForTeam(team: TeamCode): Player[] {
  return BY_TEAM[team] ?? [];
}

/**
 * Players from `team` that are still selectable, i.e. not already drafted.
 * A player can only ever be drafted once.
 */
export function selectablePlayers(team: TeamCode, draftedIds: Set<number>): Player[] {
  return playersForTeam(team)
    .filter((p) => !draftedIds.has(p.id))
    .sort((a, b) => b.overallRating - a.overallRating);
}

/** Does this franchise still have at least one undrafted player? */
function hasSelectable(team: TeamCode, draftedIds: Set<number>): boolean {
  return playersForTeam(team).some((p) => !draftedIds.has(p.id));
}

/**
 * Roll a franchise that still has players to offer, avoiding `previous` so a
 * reroll always feels fresh. Guarantees the rolled team can field a pack, so a
 * roll is never a dead end (important now that rerolls are scarce).
 */
export function drawTeam(previous: TeamCode | null, draftedIds: Set<number>): TeamCode {
  let candidates = TEAM_CODES.filter((t) => t !== previous && hasSelectable(t, draftedIds));
  if (candidates.length === 0) candidates = TEAM_CODES.filter((t) => hasSelectable(t, draftedIds));
  return pick(candidates);
}

/**
 * Build the random "draft pack": a shuffled subset of the team's undrafted
 * players. Only these are revealed, so the very best player isn't always on
 * offer — this is the deliberate randomness that keeps the user from cherry-
 * picking an overpowered XI. Returns fewer than OFFER_SIZE only if the team is
 * nearly exhausted.
 */
export function buildOffer(
  team: TeamCode,
  draftedIds: Set<number>,
  size: number = OFFER_SIZE,
): Player[] {
  const available = playersForTeam(team).filter((p) => !draftedIds.has(p.id));
  return shuffle(available).slice(0, size);
}

export const SQUAD_SIZE = 11;
export const MAX_REROLLS = 1;
/** How many players are revealed per roll. */
export const OFFER_SIZE = 3;
