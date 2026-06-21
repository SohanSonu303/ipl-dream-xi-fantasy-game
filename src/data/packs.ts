import type { Player, Rarity } from '@/types';
import { ALL_PLAYERS } from '@/engine';
import { makeEdition } from '@/data/primeEditions';
import { collectCards, recordPackOpened, spendCoins } from '@/data/profile';

// ---------------------------------------------------------------------------
// Packs — the Ultimate Team dopamine loop. Spend the coins you earn to open a
// pack and pull a handful of cards, each with a rarity rolled from that pack's
// odds. Everything you pull is added to your permanent Collection.
// ---------------------------------------------------------------------------

export interface PackDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  cards: number;
  /** Only players at/above this overall can appear. */
  minRating: number;
  /** Rarity odds (the remainder is an ordinary, un-boosted card). */
  odds: Array<{ rarity: Rarity; chance: number }>;
  /** Lowest rarity guaranteed on every card (null = can be an ordinary card). */
  floor: Rarity | null;
  blurb: string;
}

export const PACKS: PackDef[] = [
  {
    id: 'bronze',
    name: 'Bronze Pack',
    emoji: '📦',
    cost: 250,
    cards: 1,
    minRating: 0,
    floor: null,
    odds: [
      { rarity: 'IN_FORM', chance: 0.3 },
      { rarity: 'RARE', chance: 0.1 },
      { rarity: 'EPIC', chance: 0.02 },
    ],
    blurb: '1 card · the everyday pull',
  },
  {
    id: 'silver',
    name: 'Silver Pack',
    emoji: '🥈',
    cost: 600,
    cards: 1,
    minRating: 80,
    floor: 'IN_FORM',
    odds: [
      { rarity: 'RARE', chance: 0.3 },
      { rarity: 'EPIC', chance: 0.1 },
      { rarity: 'LEGENDARY', chance: 0.015 },
    ],
    blurb: '1 card · guaranteed in-form or better',
  },
  {
    id: 'gold',
    name: 'Gold Pack',
    emoji: '🏅',
    cost: 1300,
    cards: 1,
    minRating: 84,
    floor: 'RARE',
    odds: [
      { rarity: 'EPIC', chance: 0.32 },
      { rarity: 'LEGENDARY', chance: 0.06 },
    ],
    blurb: '1 card · guaranteed Rare+, big chances',
  },
];

export function getPack(id: string): PackDef | undefined {
  return PACKS.find((p) => p.id === id);
}

const RARITY_RANK: Record<Rarity, number> = { IN_FORM: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };

/** Roll a rarity for one card given the pack's odds + floor. */
function rollRarity(pack: PackDef): Rarity | null {
  let r = Math.random();
  let picked: Rarity | null = null;
  for (const o of pack.odds) {
    if (r < o.chance) {
      picked = o.rarity;
      break;
    }
    r -= o.chance;
  }
  // Apply the floor: never below the guaranteed minimum.
  if (pack.floor) {
    if (!picked || RARITY_RANK[picked] < RARITY_RANK[pack.floor]) picked = pack.floor;
  }
  return picked;
}

/** Pull `n` distinct random players at/above the pack's rating floor. */
function pickPlayers(pack: PackDef): Player[] {
  const pool = ALL_PLAYERS.filter((p) => p.overallRating >= pack.minRating);
  const chosen: Player[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (chosen.length < pack.cards && guard++ < 500) {
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(p.id)) continue;
    used.add(p.id);
    chosen.push(p);
  }
  return chosen;
}

/**
 * Open a pack: charges coins, rolls the cards, files them in the Collection and
 * returns them for the reveal. Returns null if the player can't afford it.
 */
export function openPack(pack: PackDef): Player[] | null {
  if (!spendCoins(pack.cost)) return null;
  const players = pickPlayers(pack).map((p) => {
    const rarity = rollRarity(pack);
    return rarity ? makeEdition(p, rarity) : p;
  });
  collectCards(players);
  recordPackOpened();
  return players;
}
