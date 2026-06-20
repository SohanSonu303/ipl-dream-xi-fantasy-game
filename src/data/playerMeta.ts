// ---------------------------------------------------------------------------
// Supplementary player metadata kept separate from players.json so that file
// stays the single source of truth for *ratings*. Here we add nationality
// (for national-team chemistry) and signature traits (for in-match bonuses).
// ---------------------------------------------------------------------------

export type Country =
  | 'India'
  | 'Australia'
  | 'England'
  | 'South Africa'
  | 'New Zealand'
  | 'West Indies'
  | 'Afghanistan'
  | 'Sri Lanka';

/** Nationality by player id (from public squad listings). */
const COUNTRY_BY_ID: Record<number, Country> = {
  1: 'Afghanistan', 2: 'India', 3: 'India', 4: 'India', 5: 'India',
  6: 'Australia', 7: 'India', 8: 'South Africa', 9: 'England', 10: 'West Indies',
  11: 'India', 12: 'West Indies', 13: 'South Africa', 14: 'Australia', 15: 'India',
  16: 'India', 17: 'Australia', 18: 'Australia', 19: 'India', 20: 'India',
  21: 'India', 22: 'India', 23: 'India', 24: 'Australia', 25: 'India',
  26: 'England', 27: 'India', 28: 'India', 29: 'New Zealand', 30: 'England',
  31: 'India', 32: 'South Africa', 33: 'Australia', 34: 'India', 35: 'England',
  36: 'Australia', 37: 'India', 38: 'Afghanistan', 39: 'India', 40: 'India',
  41: 'India', 42: 'India', 43: 'India', 44: 'India', 45: 'India',
  46: 'South Africa', 47: 'South Africa', 48: 'India', 49: 'India', 50: 'New Zealand',
  51: 'India', 52: 'India', 53: 'New Zealand', 54: 'South Africa', 55: 'South Africa',
  56: 'India', 57: 'New Zealand', 58: 'India', 59: 'India', 60: 'India',
  61: 'India', 62: 'West Indies', 63: 'Australia', 64: 'England', 65: 'Afghanistan',
  66: 'India', 67: 'India', 68: 'India', 69: 'India', 70: 'South Africa',
  71: 'India', 72: 'India', 73: 'India', 74: 'India', 75: 'India',
  76: 'Australia', 77: 'India', 78: 'India', 79: 'India', 80: 'India',
  81: 'South Africa', 82: 'India', 83: 'India', 84: 'India', 85: 'New Zealand',
  86: 'India', 87: 'South Africa', 88: 'India', 89: 'India', 90: 'India',
  91: 'South Africa', 92: 'India', 93: 'New Zealand', 94: 'India', 95: 'India',
  96: 'India', 97: 'India', 98: 'India', 99: 'India', 100: 'India',
};

export function getCountry(playerId: number): Country | null {
  return COUNTRY_BY_ID[playerId] ?? null;
}

// --- Signature traits -------------------------------------------------------
// Each trait grants a conditional bonus the (scalar) match engine can evaluate:
//   flat       — always-on team performance bonus (power points)
//   underdog   — extra when this side is weaker than the opponent (clutch)
//   knockout   — extra in playoff / series-decider matches (big-game temperament)
//   sparkChance— added probability of a match-winning special performance

export type TraitKey =
  | 'CHASE_MASTER'
  | 'POWERPLAY_ENFORCER'
  | 'FINISHER'
  | 'DEATH_OVERS_KING'
  | 'SPIN_WIZARD'
  | 'PACE_SPEARHEAD'
  | 'CAPTAIN_COOL';

export interface TraitEffect {
  flat?: number;
  underdog?: number;
  knockout?: number;
  sparkChance?: number;
}

export interface TraitMeta {
  key: TraitKey;
  label: string;
  icon: string;
  blurb: string;
  effect: TraitEffect;
}

export const TRAIT_META: Record<TraitKey, TraitMeta> = {
  CHASE_MASTER: {
    key: 'CHASE_MASTER',
    label: 'Chase Master',
    icon: '🎯',
    blurb: 'Ice cold under pressure — lifts the side when chasing down a stronger team.',
    effect: { underdog: 6 },
  },
  POWERPLAY_ENFORCER: {
    key: 'POWERPLAY_ENFORCER',
    label: 'Powerplay Enforcer',
    icon: '🚀',
    blurb: 'Explosive starts that set the tone with the bat up top.',
    effect: { flat: 3 },
  },
  FINISHER: {
    key: 'FINISHER',
    label: 'Finisher',
    icon: '🏁',
    blurb: 'Nerveless in the death overs — and a different beast in the big games.',
    effect: { flat: 1.5, knockout: 5 },
  },
  DEATH_OVERS_KING: {
    key: 'DEATH_OVERS_KING',
    label: 'Death Overs King',
    icon: '💀',
    blurb: 'Yorkers on tap at the back end — squeezes the life out of a chase.',
    effect: { flat: 2, sparkChance: 0.05 },
  },
  SPIN_WIZARD: {
    key: 'SPIN_WIZARD',
    label: 'Spin Wizard',
    icon: '🌀',
    blurb: 'Bamboozles batters through the middle and chokes the run flow.',
    effect: { flat: 3 },
  },
  PACE_SPEARHEAD: {
    key: 'PACE_SPEARHEAD',
    label: 'Pace Spearhead',
    icon: '⚡',
    blurb: 'Raw pace that takes wickets when the stakes are highest.',
    effect: { flat: 1.5, knockout: 4 },
  },
  CAPTAIN_COOL: {
    key: 'CAPTAIN_COOL',
    label: 'Captain Cool',
    icon: '🧊',
    blurb: 'Calm, all-round influence that steadies the whole XI.',
    effect: { flat: 2 },
  },
};

/** Signature trait by player id (curated marquee names). */
const TRAIT_BY_ID: Record<number, TraitKey> = {
  // Chase masters
  5: 'CHASE_MASTER', 19: 'CHASE_MASTER', 22: 'CHASE_MASTER',
  // Powerplay enforcers
  6: 'POWERPLAY_ENFORCER', 7: 'POWERPLAY_ENFORCER', 31: 'POWERPLAY_ENFORCER', 30: 'POWERPLAY_ENFORCER',
  // Finishers
  84: 'FINISHER', 43: 'FINISHER', 63: 'FINISHER', 37: 'FINISHER', 8: 'FINISHER',
  // Death-overs kings
  2: 'DEATH_OVERS_KING', 28: 'DEATH_OVERS_KING', 52: 'DEATH_OVERS_KING', 29: 'DEATH_OVERS_KING',
  // Spin wizards
  1: 'SPIN_WIZARD', 39: 'SPIN_WIZARD', 27: 'SPIN_WIZARD', 12: 'SPIN_WIZARD', 38: 'SPIN_WIZARD',
  // Pace spearheads
  14: 'PACE_SPEARHEAD', 18: 'PACE_SPEARHEAD', 13: 'PACE_SPEARHEAD', 26: 'PACE_SPEARHEAD', 41: 'PACE_SPEARHEAD',
  // Captain cool / all-round influence
  15: 'CAPTAIN_COOL', 16: 'CAPTAIN_COOL', 3: 'CAPTAIN_COOL', 4: 'CAPTAIN_COOL',
};

export function getTrait(playerId: number): TraitMeta | null {
  const key = TRAIT_BY_ID[playerId];
  return key ? TRAIT_META[key] : null;
}
