import type { Player, Rarity, SeasonOutcome } from '@/types';
import { getPotential, isProspect } from '@/data/playerMeta';
import { clamp, round } from '@/utils';

// ---------------------------------------------------------------------------
// Persistent player profile — the meta-progression that makes you want to come
// back: coins you earn every game, and a permanent Collection (binder) of every
// card you've drafted or pulled from a pack. Stored locally so it survives
// across sessions on this device.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'dreamxi:profile:v1';
const STARTING_COINS = 600;

/** A unique key per collectible variant (a Legendary Kohli ≠ a base Kohli). */
export function cardKey(playerId: number, rarity?: Rarity): string {
  return `${playerId}:${rarity ?? 'BASE'}`;
}

export interface CollectedCard {
  key: string;
  playerId: number;
  name: string;
  team: string;
  rarity: Rarity | null;
  editionTitle: string | null;
  overallRating: number;
  count: number;
  firstSeen: number;
}

export interface ProfileStats {
  gamesPlayed: number;
  seasonsWon: number;
  packsOpened: number;
  coinsEarned: number;
}

export interface Profile {
  coins: number;
  collection: Record<string, CollectedCard>;
  /** Career growth points banked per prospect (playerId → points). */
  development: Record<number, number>;
  stats: ProfileStats;
}

function emptyProfile(): Profile {
  return {
    coins: STARTING_COINS,
    collection: {},
    development: {},
    stats: { gamesPlayed: 0, seasonsWon: 0, packsOpened: 0, coinsEarned: 0 },
  };
}

export function loadProfile(): Profile {
  if (typeof localStorage === 'undefined') return emptyProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      coins: parsed.coins ?? STARTING_COINS,
      collection: parsed.collection ?? {},
      development: parsed.development ?? {},
      stats: { ...emptyProfile().stats, ...(parsed.stats ?? {}) },
    };
  } catch {
    return emptyProfile();
  }
}

function save(profile: Profile): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

export function getCoins(): number {
  return loadProfile().coins;
}

/** Add coins (e.g. season reward) and return the new balance. */
export function addCoins(amount: number): number {
  const p = loadProfile();
  p.coins += Math.max(0, Math.round(amount));
  p.stats.coinsEarned += Math.max(0, Math.round(amount));
  save(p);
  return p.coins;
}

/** Spend coins if affordable; returns true on success. */
export function spendCoins(amount: number): boolean {
  const p = loadProfile();
  if (p.coins < amount) return false;
  p.coins -= amount;
  save(p);
  return true;
}

/** Add one or more cards to the collection (merging counts). */
export function collectCards(players: Player[]): void {
  if (players.length === 0) return;
  const p = loadProfile();
  for (const pl of players) {
    const key = cardKey(pl.id, pl.rarity);
    const existing = p.collection[key];
    if (existing) {
      existing.count += 1;
    } else {
      p.collection[key] = {
        key,
        playerId: pl.id,
        name: pl.name,
        team: pl.team,
        rarity: pl.rarity ?? null,
        editionTitle: pl.editionTitle ?? null,
        overallRating: pl.overallRating,
        count: 1,
        firstSeen: Date.now(),
      };
    }
  }
  save(p);
}

export function ownsCard(playerId: number, rarity?: Rarity): boolean {
  return cardKey(playerId, rarity) in loadProfile().collection;
}

/** Does the player own *any* card (any rarity) for this player id? */
export function ownsAnyOf(playerId: number): boolean {
  const col = loadProfile().collection;
  return Object.values(col).some((c) => c.playerId === playerId);
}

/** All collected cards, strongest rarity first. */
export function getCollection(): CollectedCard[] {
  const order: Record<string, number> = { LEGENDARY: 4, EPIC: 3, RARE: 2, IN_FORM: 1 };
  return Object.values(loadProfile().collection).sort(
    (a, b) => (order[b.rarity ?? ''] ?? 0) - (order[a.rarity ?? ''] ?? 0) || b.overallRating - a.overallRating,
  );
}

export interface CollectionSummary {
  total: number;
  unique: number;
  byRarity: Record<string, number>;
  legendary: number;
}

export function collectionSummary(): CollectionSummary {
  const cards = Object.values(loadProfile().collection);
  const byRarity: Record<string, number> = { LEGENDARY: 0, EPIC: 0, RARE: 0, IN_FORM: 0, BASE: 0 };
  let total = 0;
  for (const c of cards) {
    total += c.count;
    byRarity[c.rarity ?? 'BASE'] = (byRarity[c.rarity ?? 'BASE'] ?? 0) + 1;
  }
  return { total, unique: cards.length, byRarity, legendary: byRarity.LEGENDARY };
}

export interface RewardBreakdown {
  outcome: number;
  wins: number;
  top4: number;
  daily: number;
  total: number;
}

/** Coins awarded for a finished season, itemised so the UI can show why. */
export function seasonReward(
  outcome: SeasonOutcome,
  wins: number,
  position: number,
  isDaily: boolean,
): RewardBreakdown {
  const base: Record<SeasonOutcome, number> = {
    CHAMPION: 250,
    RUNNER_UP: 140,
    QUALIFIER_2_EXIT: 100,
    ELIMINATOR_EXIT: 70,
    FAILED_TO_QUALIFY: 40,
  };
  const r: RewardBreakdown = {
    outcome: base[outcome],
    wins: wins * 8,
    top4: position <= 4 ? 75 : 0,
    daily: isDaily ? 40 : 0,
    total: 0,
  };
  r.total = r.outcome + r.wins + r.top4 + r.daily;
  return r;
}

/** Bump lifetime stats after a finished season. */
export function recordGamePlayed(won: boolean): void {
  const p = loadProfile();
  p.stats.gamesPlayed += 1;
  if (won) p.stats.seasonsWon += 1;
  save(p);
}

export function recordPackOpened(): void {
  const p = loadProfile();
  p.stats.packsOpened += 1;
  save(p);
}

// --- Career growth ----------------------------------------------------------

/** Overall-rating points a prospect gains per season you field them. */
const DEV_PER_SEASON = 2;

/** Growth banked for a player so far (0 = none / not a prospect). */
export function getDev(playerId: number): number {
  return loadProfile().development[playerId] ?? 0;
}

/** A prospect who has more growth left in them. */
export function isRising(playerId: number): boolean {
  return isProspect(playerId) && getDev(playerId) < getPotential(playerId);
}

export interface DevGain {
  playerId: number;
  gain: number;
  total: number;
  potential: number;
}

/**
 * Develop the prospects in a squad after a season — each gains points up to
 * their potential. Returns the players who grew (for a results "academy" note).
 */
export function developFromSquad(playerIds: number[]): DevGain[] {
  const p = loadProfile();
  const gains: DevGain[] = [];
  for (const id of playerIds) {
    if (!isProspect(id)) continue;
    const pot = getPotential(id);
    const cur = p.development[id] ?? 0;
    if (cur >= pot) continue;
    const next = Math.min(pot, cur + DEV_PER_SEASON);
    p.development[id] = next;
    gains.push({ playerId: id, gain: next - cur, total: next, potential: pot });
  }
  if (gains.length) save(p);
  return gains;
}

function capRating(n: number): number {
  return clamp(Math.round(n), 0, 99);
}

/**
 * Apply a prospect's banked growth to a card. Boosts their dominant
 * discipline(s) and overall, and stamps `devBoost` for the UI. A no-op for
 * players with no development.
 */
export function applyDevelopment(player: Player): Player {
  const dev = getDev(player.id);
  if (dev <= 0) return player;
  const bumpBat = player.role !== 'BOWLER';
  const bumpBowl = player.role === 'BOWLER' || player.role === 'ALL_ROUNDER';
  return {
    ...player,
    devBoost: dev,
    battingRating: bumpBat ? capRating(player.battingRating + dev) : player.battingRating,
    bowlingRating: bumpBowl ? capRating(player.bowlingRating + dev) : player.bowlingRating,
    overallRating: capRating(player.overallRating + dev),
    fantasyWeight: round(Math.min(0.99, player.fantasyWeight + dev * 0.005), 2),
  };
}
