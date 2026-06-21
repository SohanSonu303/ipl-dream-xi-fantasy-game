// ---------------------------------------------------------------------------
// Core domain types for the IPL Dream XI Draft Simulator.
// The player dataset (players.json) is the single source of truth for ratings.
// ---------------------------------------------------------------------------

export type TeamCode =
  | 'CSK'
  | 'MI'
  | 'RCB'
  | 'KKR'
  | 'SRH'
  | 'GT'
  | 'RR'
  | 'PBKS'
  | 'DC'
  | 'LSG';

export type PlayerRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';

/**
 * Collectible card tier, weakest → strongest. A normal player has no rarity;
 * marquee names can occasionally surface in the draft (and in franchise squads)
 * as a boosted edition (e.g. a vintage-season Kohli or a 2011 Dhoni) carrying
 * one of these tiers.
 */
export type Rarity = 'IN_FORM' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Player {
  id: number;
  name: string;
  team: TeamCode;
  role: PlayerRole;
  battingRating: number;
  bowlingRating: number;
  overallRating: number;
  fantasyWeight: number;
  /** Set only on a boosted prime edition (a special draft pull). */
  rarity?: Rarity;
  /** Historical/flavour title for a prime edition, e.g. "Vintage '16". */
  editionTitle?: string;
  /** The player's normal overall rating, before the prime boost. */
  baseOverall?: number;
}

export interface PlayersDataset {
  season: string;
  playerCount: number;
  players: Player[];
  note?: string;
}

/** A filled squad slot — a drafted player pinned to a chosen position index. */
export interface SquadSlot {
  /** Position index 0..10 on the user's XI grid. */
  position: number;
  player: Player;
}

export interface TeamStrength {
  batting: number;
  bowling: number;
  overall: number;
  fantasy: number;
  /** Composite 0-100 power rating (includes the fair-play composition modifier). */
  teamPower: number;
  /** Team power before the composition modifier is applied. */
  basePower: number;
  /** Fair-play composition adjustment in power points (<= 0). */
  compositionModifier: number;
}

export interface CompositionCheck {
  key: string;
  label: string;
  ok: boolean;
  value: number;
  target: number;
  detail: string;
}

export interface Composition {
  counts: Record<PlayerRole, number>;
  bowlingOptions: number;
  battingDepth: number;
  hasKeeper: boolean;
  allRounders: number;
  /** Non-positive fair-play adjustment applied to team power. */
  modifier: number;
  balanced: boolean;
  checks: CompositionCheck[];
}

/** A team participating in the simulated season (user or AI franchise). */
export interface SeasonTeam {
  id: string;
  name: string;
  /** Franchise code for branding; user team borrows a neutral DREAM badge. */
  code: TeamCode | 'XI';
  isUser: boolean;
  strength: TeamStrength;
  /** Squad roster — used to award a Player of the Match. */
  players?: Player[];
  /** Drafted player id chosen as captain (user team only). */
  captainId?: number;
}

export interface MatchResult {
  id: string;
  homeId: string;
  awayId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
  loserId: string;
  margin: number;
  /** Standout performer of the match (drawn from the winning side). */
  playerOfMatchId?: number;
  playerOfMatchName?: string;
  playerOfMatchTeamId?: string;
}

export interface Standing {
  team: SeasonTeam;
  played: number;
  won: number;
  lost: number;
  points: number;
  netRating: number;
  position: number;
}

export type PlayoffStage =
  | 'QUALIFIER_1'
  | 'ELIMINATOR'
  | 'QUALIFIER_2'
  | 'FINAL';

export interface PlayoffMatch {
  stage: PlayoffStage;
  label: string;
  teamAId: string;
  teamBId: string;
  result?: MatchResult;
}

export type SeasonOutcome =
  | 'CHAMPION'
  | 'RUNNER_UP'
  | 'QUALIFIER_2_EXIT'
  | 'ELIMINATOR_EXIT'
  | 'FAILED_TO_QUALIFY';

export interface SeasonResult {
  standings: Standing[];
  leagueMatches: MatchResult[];
  playoffs: PlayoffMatch[];
  championId: string;
  runnerUpId: string;
  userOutcome: SeasonOutcome;
  userStanding: Standing;
}

export type GamePhase = 'home' | 'draft' | 'simulation' | 'results';

/**
 * Free play (fresh randomness), the reproducible Daily Challenge, or a
 * head-to-head friend battle against a shared XI.
 */
export type GameMode = 'free' | 'daily' | 'versus';
