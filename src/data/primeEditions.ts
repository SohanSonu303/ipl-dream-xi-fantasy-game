// ---------------------------------------------------------------------------
// Prime Editions — collectible "form / peak" cards across four tiers.
//
//   IN_FORM  → a player in good touch (small bump, common)
//   RARE     → a purple-patch run (modest bump)
//   EPIC     → a career-best season (big bump, rarer)
//   LEGENDARY→ an all-time great edition (huge bump, curated marquee names only)
//
// Most draft pulls are the ordinary IPL 2026 card. Marquee names can surface as
// a vintage-season version of themselves (e.g. a 2016 Kohli or a 2011 Dhoni),
// and the same odds apply to the AI franchises' squads — so the opposition
// fields its own boosted cards and the league stays balanced.
//
// Key design rule: a prime edition keeps the player's real `id`, so it is still
// the *same* player for de-duplication — it's simply a luckier, stronger pull.
// Boosted ratings flow through every engine untouched because the card is still
// a plain `Player`. All rolls draw from the shared seeded `random()`, so the
// Daily Challenge stays fully reproducible.
// ---------------------------------------------------------------------------

import type { Player, Rarity } from '@/types';
import { clamp, random, round } from '@/utils';

export interface RarityMeta {
  tier: Rarity;
  label: string;
  /** Accent colour (inline-styled, no Tailwind config needed). */
  color: string;
  /** Soft glow colour for the card frame. */
  glow: string;
  /** Glyph stamped on the card as the rarity emblem. */
  emblem: string;
  /** Card background wash (top → fades out). */
  wash: string;
  /** Whether the card carries an animated sheen sweep. */
  sheen: boolean;
  /** Short blurb shown on the card. */
  blurb: string;
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
  IN_FORM: {
    tier: 'IN_FORM',
    label: 'In Form',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.5)',
    emblem: '▲',
    wash: 'rgba(52,211,153,0.12)',
    sheen: false,
    blurb: 'In good touch',
  },
  RARE: {
    tier: 'RARE',
    label: 'Rare',
    color: '#5ec0ff',
    glow: 'rgba(94,192,255,0.55)',
    emblem: '◆',
    wash: 'rgba(94,192,255,0.14)',
    sheen: false,
    blurb: 'Purple patch',
  },
  EPIC: {
    tier: 'EPIC',
    label: 'Epic',
    color: '#b57bff',
    glow: 'rgba(181,123,255,0.6)',
    emblem: '✦',
    wash: 'rgba(181,123,255,0.18)',
    sheen: true,
    blurb: 'Career-best season',
  },
  LEGENDARY: {
    tier: 'LEGENDARY',
    label: 'Legendary',
    color: '#ffb020',
    glow: 'rgba(255,176,32,0.7)',
    emblem: '👑',
    wash: 'rgba(255,176,32,0.22)',
    sheen: true,
    blurb: 'All-time great',
  },
};

export function rarityMeta(rarity: Rarity): RarityMeta {
  return RARITY_META[rarity];
}

/** Strongest → weakest, for any ordering needs. */
export const RARITY_ORDER: Rarity[] = ['LEGENDARY', 'EPIC', 'RARE', 'IN_FORM'];

/** Stat overrides a curated prime edition stamps onto the base player. */
interface EditionOverride {
  battingRating?: number;
  bowlingRating?: number;
  overallRating?: number;
  fantasyWeight?: number;
}

interface CuratedEdition {
  rarity: Rarity;
  title: string;
  /** Independent chance this exact edition is the one that surfaces. */
  chance: number;
  override: EditionOverride;
}

// Curated marquee editions, keyed by player id. A player may list several — the
// roll tries them in order (legendary first), so the rarest is also the longest
// shot. Ratings are capped at 99 when applied.
const CURATED: Record<number, CuratedEdition[]> = {
  // Virat Kohli — the 973-run summer.
  5: [
    { rarity: 'LEGENDARY', title: "Vintage '16", chance: 0.05, override: { battingRating: 99, overallRating: 99, fantasyWeight: 0.99 } },
    { rarity: 'EPIC', title: 'Chase King', chance: 0.12, override: { battingRating: 98, overallRating: 97, fantasyWeight: 0.97 } },
  ],
  // MS Dhoni — the 2011 World Cup-winning captain.
  84: [
    { rarity: 'LEGENDARY', title: "Captain Cool '11", chance: 0.06, override: { battingRating: 92, overallRating: 95, fantasyWeight: 0.97 } },
    { rarity: 'EPIC', title: 'Helicopter', chance: 0.13, override: { battingRating: 88, overallRating: 90, fantasyWeight: 0.92 } },
  ],
  // Rohit Sharma — 2019 World Cup run-machine.
  15: [
    { rarity: 'LEGENDARY', title: "World Cup '19", chance: 0.05, override: { battingRating: 99, overallRating: 98, fantasyWeight: 0.98 } },
    { rarity: 'EPIC', title: 'Hitman Peak', chance: 0.12, override: { battingRating: 97, overallRating: 96, fantasyWeight: 0.96 } },
  ],
  // Jasprit Bumrah — the unplayable death spell.
  2: [
    { rarity: 'LEGENDARY', title: 'Death Spell', chance: 0.05, override: { bowlingRating: 99, overallRating: 99, fantasyWeight: 0.99 } },
    { rarity: 'EPIC', title: 'Yorker Machine', chance: 0.12, override: { bowlingRating: 99, overallRating: 97, fantasyWeight: 0.97 } },
  ],
  // Rashid Khan — mystery-spin masterclass.
  1: [{ rarity: 'EPIC', title: 'Mystery Master', chance: 0.13, override: { bowlingRating: 99, overallRating: 98, fantasyWeight: 0.98 } }],
  // Suryakumar Yadav — 360° peak.
  3: [{ rarity: 'EPIC', title: '360° Mode', chance: 0.13, override: { battingRating: 99, overallRating: 97, fantasyWeight: 0.97 } }],
  // Sunil Narine — the 2024 title-run opener.
  12: [{ rarity: 'EPIC', title: "Title Run '24", chance: 0.12, override: { battingRating: 90, bowlingRating: 96, overallRating: 95, fantasyWeight: 0.95 } }],
  // Ravindra Jadeja — Sir Jadeja all-round peak.
  16: [{ rarity: 'EPIC', title: 'Sir Jadeja', chance: 0.12, override: { battingRating: 85, bowlingRating: 94, overallRating: 94, fantasyWeight: 0.94 } }],
  // Hardik Pandya — 2024 champion captain.
  37: [{ rarity: 'EPIC', title: "Champion '24", chance: 0.12, override: { battingRating: 89, bowlingRating: 88, overallRating: 93, fantasyWeight: 0.93 } }],
  // Jofra Archer — the Super Over hero.
  26: [{ rarity: 'LEGENDARY', title: 'Super Over', chance: 0.05, override: { bowlingRating: 98, overallRating: 96, fantasyWeight: 0.96 } }],
  21: [{ rarity: 'EPIC', title: 'Fearless', chance: 0.12, override: { battingRating: 96, overallRating: 95, fantasyWeight: 0.95 } }], // Rishabh Pant
  9: [{ rarity: 'EPIC', title: "Orange Cap '22", chance: 0.12, override: { battingRating: 98, overallRating: 96, fantasyWeight: 0.96 } }], // Jos Buttler
  6: [{ rarity: 'EPIC', title: 'Maverick', chance: 0.12, override: { battingRating: 98, overallRating: 96, fantasyWeight: 0.96 } }], // Travis Head
  19: [{ rarity: 'EPIC', title: 'Anchor', chance: 0.12, override: { battingRating: 96, overallRating: 94, fantasyWeight: 0.94 } }], // KL Rahul
  // New marquee additions.
  125: [{ rarity: 'EPIC', title: 'Dre Russ', chance: 0.12, override: { battingRating: 90, bowlingRating: 84, overallRating: 90, fantasyWeight: 0.9 } }], // Andre Russell
  133: [{ rarity: 'EPIC', title: 'Big Show', chance: 0.12, override: { battingRating: 92, bowlingRating: 74, overallRating: 91, fantasyWeight: 0.91 } }], // Glenn Maxwell
  117: [{ rarity: 'EPIC', title: 'Mystery Spin', chance: 0.12, override: { bowlingRating: 92, overallRating: 90, fantasyWeight: 0.9 } }], // Wanindu Hasaranga
  129: [{ rarity: 'EPIC', title: 'Captain Faf', chance: 0.12, override: { battingRating: 92, overallRating: 90, fantasyWeight: 0.9 } }], // Faf du Plessis
};

// --- Generic tiers ----------------------------------------------------------
// Any high-rated player without a curated edition can still shine, just with a
// plain "in form / peak" frame rather than a historical title.

const GENERIC_BOOST: Record<Rarity, { stat: number; fantasy: number }> = {
  IN_FORM: { stat: 2, fantasy: 0.01 },
  RARE: { stat: 4, fantasy: 0.02 },
  EPIC: { stat: 7, fantasy: 0.04 },
  LEGENDARY: { stat: 11, fantasy: 0.06 },
};

const GENERIC_TITLE: Record<Rarity, string> = {
  IN_FORM: 'In Form',
  RARE: 'Hot Streak',
  EPIC: 'Peak Form',
  LEGENDARY: 'Career Best',
};

/** Pick a generic tier (or none) for a single roll value, scaled by class. */
function genericTier(ovr: number, r: number): Rarity | null {
  if (ovr >= 88) {
    if (r < 0.04) return 'EPIC';
    if (r < 0.13) return 'RARE';
    if (r < 0.32) return 'IN_FORM';
    return null;
  }
  if (ovr >= 82) {
    if (r < 0.07) return 'RARE';
    if (r < 0.25) return 'IN_FORM';
    return null;
  }
  if (ovr >= 76) {
    if (r < 0.16) return 'IN_FORM';
    return null;
  }
  return null;
}

function cap(n: number): number {
  return clamp(Math.round(n), 0, 99);
}

/** Apply a curated edition's overrides on top of the base player. */
function applyEdition(player: Player, ed: CuratedEdition): Player {
  return {
    ...player,
    rarity: ed.rarity,
    editionTitle: ed.title,
    baseOverall: player.overallRating,
    battingRating: ed.override.battingRating != null ? cap(ed.override.battingRating) : player.battingRating,
    bowlingRating: ed.override.bowlingRating != null ? cap(ed.override.bowlingRating) : player.bowlingRating,
    overallRating: ed.override.overallRating != null ? cap(ed.override.overallRating) : player.overallRating,
    fantasyWeight: ed.override.fantasyWeight != null ? round(ed.override.fantasyWeight, 2) : player.fantasyWeight,
  };
}

/** Boost the player's dominant discipline(s) for a generic prime edition. */
function applyGeneric(player: Player, rarity: Rarity): Player {
  const { stat, fantasy } = GENERIC_BOOST[rarity];
  const bumpBat = player.role !== 'BOWLER';
  const bumpBowl = player.role === 'BOWLER' || player.role === 'ALL_ROUNDER';
  return {
    ...player,
    rarity,
    editionTitle: GENERIC_TITLE[rarity],
    baseOverall: player.overallRating,
    battingRating: bumpBat ? cap(player.battingRating + stat) : player.battingRating,
    bowlingRating: bumpBowl ? cap(player.bowlingRating + stat) : player.bowlingRating,
    overallRating: cap(player.overallRating + stat),
    fantasyWeight: round(Math.min(0.99, player.fantasyWeight + fantasy), 2),
  };
}

/**
 * Roll a draft / squad card. With small, rarity-weighted odds the player
 * surfaces as a boosted edition; otherwise the ordinary card is returned
 * unchanged. Already-prime cards are passed through untouched (idempotent).
 */
export function rollPrimeEdition(player: Player): Player {
  if (player.rarity) return player;

  const curated = CURATED[player.id];
  if (curated) {
    let acc = 0;
    const r = random();
    for (const ed of curated) {
      acc += ed.chance;
      if (r < acc) return applyEdition(player, ed);
    }
    // Fall through: even a curated star can simply be "in form" some days.
    const tier = genericTier(player.overallRating, random());
    return tier ? applyGeneric(player, tier) : player;
  }

  const tier = genericTier(player.overallRating, random());
  return tier ? applyGeneric(player, tier) : player;
}
