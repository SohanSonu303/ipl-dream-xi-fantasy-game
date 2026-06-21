import type { Player, PlayerRole, Rarity, SquadSlot } from '@/types';
import { ALL_PLAYERS, BENCH_SIZE } from './draftEngine';
import { rollPrimeEdition } from '@/data/primeEditions';
import { applyDevelopment, ownsAnyOf } from '@/data/profile';
import { clamp, shuffle } from '@/utils';

// ---------------------------------------------------------------------------
// Budget auction — the IPL auction fantasy. You're handed a purse and a stream
// of players come under the hammer one at a time. Bid against an AI rival, but
// spend wisely: you must walk away with a full squad. Players you already
// own in your Collection come at a discount — your binder pays off here.
// ---------------------------------------------------------------------------

/** A brand-new manager's starting purse, in crore. */
export const AUCTION_BUDGET_BASE = 18;
/** Coin balance a fresh profile starts with (mirrors profile STARTING_COINS). */
const BASELINE_COINS = 600;
/** The most marquee players you can pre-sign at auction — the rest you draft. */
export const AUCTION_SIGN_LIMIT = 3;
/** Full squad size (XI + bench), filled out by the draft after signing. */
export const AUCTION_SQUAD_SIZE = 11 + BENCH_SIZE;

/**
 * Your auction purse: 18 cr to start, growing slowly as you bank coins.
 * Capped at a modest ceiling to keep spending meaningful.
 */
export function auctionBudget(coins: number): number {
  const growth = clamp(Math.floor((coins - BASELINE_COINS) / 160), 0, 50);
  return AUCTION_BUDGET_BASE + growth;
}
/** Discount on the price you pay for a player already in your Collection. */
export const OWNED_DISCOUNT = 0.25;

const RARITY_PRICE: Record<Rarity, number> = { IN_FORM: 2, RARE: 4, EPIC: 8, LEGENDARY: 14 };

export interface AuctionLot {
  player: Player;
  basePrice: number;
  /** The most the AI rival is willing to pay. */
  aiMax: number;
  /** Already in the user's Collection — eligible for the discount. */
  owned: boolean;
}

/** Base price (crore) for a player, by class and rarity. */
export function priceOf(player: Player): number {
  const t = clamp((player.overallRating - 68) / 32, 0, 1);
  let price = 2 + t * t * 20;
  if (player.rarity) price += RARITY_PRICE[player.rarity];
  return Math.max(2, Math.round(price));
}

/** Minimum raise at the current bid. */
export function bidIncrement(currentBid: number): number {
  return currentBid >= 20 ? 3 : currentBid >= 8 ? 2 : 1;
}

/** Will the AI counter the user's current bid? Only up to its valuation. */
export function aiWillBid(lot: AuctionLot, currentBid: number): boolean {
  return currentBid + bidIncrement(currentBid) <= lot.aiMax;
}

/** What the user actually pays on winning — applies the Collection discount. */
export function finalPrice(lot: AuctionLot, winningBid: number): number {
  return lot.owned ? Math.max(1, Math.round(winningBid * (1 - OWNED_DISCOUNT))) : winningBid;
}

/** Build the stream of lots for one auction. */
export function buildLots(count = 40): AuctionLot[] {
  return shuffle(ALL_PLAYERS)
    .slice(0, count)
    .map((p) => rollPrimeEdition(applyDevelopment(p)))
    .map((player) => {
      const basePrice = priceOf(player);
      const aiMax = Math.round(basePrice * (1 + Math.random() * 0.7));
      return { player, basePrice, aiMax, owned: ownsAnyOf(player.id) };
    });
}

// --- Auto-arrange the bought squad into a sensible XI -----------------------

type SlotCat = 'BAT' | 'AR' | 'BOWL';
const SLOT_PLAN: SlotCat[] = ['BAT', 'BAT', 'BAT', 'BAT', 'BAT', 'BAT', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL'];

/** How well a player fits a slot category (higher = better). */
function fitScore(p: Player, cat: SlotCat): number {
  switch (cat) {
    case 'BAT':
      return p.battingRating - (p.role === 'BOWLER' ? 60 : 0);
    case 'BOWL':
      return p.bowlingRating - (p.role === 'BATTER' || p.role === 'WICKET_KEEPER' ? 60 : 0);
    case 'AR':
      return p.role === 'ALL_ROUNDER' ? p.overallRating + 20 : (p.battingRating + p.bowlingRating) / 2;
  }
}

/**
 * Turn the bought players into positioned squad slots: a balanced XI (the
 * right type in each slot) plus the bench. Guarantees a keeper is in the
 * XI when one was bought.
 */
export function arrangeSquad(players: Player[]): SquadSlot[] {
  const pool = [...players];
  const xi: Player[] = new Array(11);

  // Fill each XI slot with the best remaining fit.
  SLOT_PLAN.forEach((cat, pos) => {
    let bestI = -1;
    let best = -Infinity;
    pool.forEach((p, i) => {
      const s = fitScore(p, cat);
      if (s > best) {
        best = s;
        bestI = i;
      }
    });
    if (bestI >= 0) {
      xi[pos] = pool[bestI];
      pool.splice(bestI, 1);
    }
  });

  // Ensure a keeper is in the XI if one is on the bench but none made the XI.
  const keeperInXi = xi.some((p) => p?.role === 'WICKET_KEEPER');
  const benchKeeperI = pool.findIndex((p) => p.role === 'WICKET_KEEPER');
  if (!keeperInXi && benchKeeperI >= 0) {
    // Swap the bench keeper in for the weakest top-order batter.
    let weakI = 0;
    for (let i = 1; i < 6; i++) if ((xi[i]?.battingRating ?? 99) < (xi[weakI]?.battingRating ?? 99)) weakI = i;
    pool.push(xi[weakI]);
    xi[weakI] = pool.splice(benchKeeperI, 1)[0];
  }

  const slots: SquadSlot[] = [];
  xi.forEach((player, pos) => {
    if (player) slots.push({ position: pos, player });
  });
  // Remaining players → bench (positions 11..).
  pool.slice(0, BENCH_SIZE).forEach((player, i) => slots.push({ position: 11 + i, player }));
  return slots;
}

/**
 * Pre-place the (≤3) signed players into their best-fitting XI slots, leaving
 * the rest of the grid empty for the player to fill through the random draft.
 */
export function seedSlots(players: Player[]): SquadSlot[] {
  const used = new Set<number>();
  const slots: SquadSlot[] = [];
  for (const p of [...players].sort((a, b) => b.overallRating - a.overallRating)) {
    let bestPos = -1;
    let best = -Infinity;
    for (let pos = 0; pos < 11; pos++) {
      if (used.has(pos)) continue;
      const s = fitScore(p, SLOT_PLAN[pos]);
      if (s > best) {
        best = s;
        bestPos = pos;
      }
    }
    if (bestPos >= 0) {
      used.add(bestPos);
      slots.push({ position: bestPos, player: p });
    }
  }
  return slots;
}

export const AUCTION_ROLE_LABEL: Record<PlayerRole, string> = {
  BATTER: 'Batter',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-Rounder',
  WICKET_KEEPER: 'Keeper',
};
