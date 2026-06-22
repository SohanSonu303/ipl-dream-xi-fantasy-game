import { create } from 'zustand';
import type {
  GameMode,
  GamePhase,
  MatchResult,
  Player,
  PlayerRole,
  SeasonOutcome,
  SeasonResult,
  SquadSlot,
  TeamCode,
  TeamStrength,
} from '@/types';
import {
  AUCTION_SIGN_LIMIT,
  MAX_REROLLS,
  SQUAD_SIZE,
  USER_TEAM_ID,
  VS_OPP_ID,
  VS_USER_ID,
  XI_SIZE,
  analyzeChemistry,
  analyzeComposition,
  analyzePositions,
  buildOffer,
  buildUserTeam,
  computeStrength,
  drawTeam,
  finalMargin,
  finishStagedSeason,
  hydrateSharedTeam,
  prepareStagedSeason,
  seedSlots,
  simulateSeries,
  type Chemistry,
  type PositionAnalysis,
  type StagedSeason,
  type VersusResult,
} from '@/engine';
import type { Composition } from '@/types';
import { hashString, random, resetRng, round, seedRng } from '@/utils';
import type { SharedTeam } from '@/utils/shareCode';
import { dailySeed, recordDailyResult, todayKey } from '@/data/daily';
import { getBenchSize, upgradeBench } from '@/data/profile';

/** The XI in batting order (slots 0..10). */
function xiOrdered(squad: SquadSlot[]): Player[] {
  return squad
    .filter((s) => s.position < XI_SIZE)
    .sort((a, b) => a.position - b.position)
    .map((s) => s.player);
}

/**
 * The XI indexed by true batting position (length 11, holes for unfilled
 * slots). Used for positional analysis so partial squads are judged by their
 * real slot rather than a compacted one.
 */
function xiByPosition(squad: SquadSlot[]): (Player | undefined)[] {
  const arr: (Player | undefined)[] = new Array(XI_SIZE).fill(undefined);
  for (const s of squad) {
    if (s.position < XI_SIZE) arr[s.position] = s.player;
  }
  return arr;
}

/** Bench players (slots 11..) in order. */
function benchOf(squad: SquadSlot[]): Player[] {
  return squad
    .filter((s) => s.position >= XI_SIZE)
    .sort((a, b) => a.position - b.position)
    .map((s) => s.player);
}

/** A mid-season Impact Player substitution: bench player in for an XI slot. */
export interface ImpactSwap {
  benchIndex: number;
  xiPosition: number;
}

function recordDailyToday(result: SeasonResult, teamName: string): void {
  recordDailyResult({
    date: todayKey(),
    outcome: result.userOutcome,
    position: result.userStanding.position,
    won: result.userStanding.won,
    lost: result.userStanding.lost,
    points: result.userStanding.points,
    teamPower: result.userStanding.team.strength.teamPower,
    teamName: teamName || DEFAULT_NAME,
  });
}

interface GameState {
  phase: GamePhase;
  /** Free play (fresh randomness) or the reproducible Daily Challenge. */
  mode: GameMode;
  teamName: string;
  squad: SquadSlot[];
  /** Drafted player id chosen as captain (optional leadership bonus). */
  captainId: number | null;
  currentTeam: TeamCode | null;
  lastTeam: TeamCode | null;
  rerollsUsed: number;
  /** The revealed random pack for the current roll — the only selectable players. */
  offer: Player[];
  /** Player chosen from the current roll, awaiting a squad position. */
  pendingPlayer: Player | null;
  /** Set true briefly to drive the roll/shuffle animation. */
  isRolling: boolean;
  seasonResult: SeasonResult | null;
  /** Decoded opponent XI for a friend battle (versus mode). */
  opponent: SharedTeam | null;
  /** Result of the head-to-head series. */
  versusResult: VersusResult | null;

  // --- staged season (impact player + playable final) ---
  /** Fixed first part of the season, awaiting the impact decision. */
  stagedSeason: StagedSeason | null;
  /** User's second-half league matches (after the impact decision). */
  userSecondHalf: MatchResult[];
  /** True once an impact swap has been made (one per season). */
  impactUsed: boolean;
  /** True when the final is unplayed because the user reached it. */
  userInFinal: boolean;
  /** The other finalist's id when the user reaches the final. */
  finalOpponentId: string | null;
  /** True once the season's coin/collection reward has been granted. */
  rewarded: boolean;

  /** Current bench size (2–5, grows via purchaseBenchUpgrade). */
  benchSize: number;

  // --- actions ---
  /**
   * Enter the draft. In free play you may pre-seed up to AUCTION_SIGN_LIMIT
   * headliners (chosen from your Collection / auction wins); the rest of the
   * squad is filled through the random rolls.
   */
  startDraft: (mode?: GameMode, seed?: Player[]) => void;
  /** Enter the draft pre-seeded with the (≤3) players signed at auction. */
  startAuctionDraft: (signed: Player[], teamName: string) => void;
  startVersus: (opponent: SharedTeam) => void;
  setTeamName: (name: string) => void;
  setCaptain: (playerId: number) => void;
  /** Replace the squad (used by the lineup editor to re-order the XI). */
  setSquad: (squad: SquadSlot[]) => void;
  rollTeam: () => void;
  reroll: () => void;
  pickPlayer: (player: Player) => void;
  cancelPick: () => void;
  assignToPosition: (position: number) => void;
  beginSeason: () => void;
  resolveSeason: (swaps: ImpactSwap[]) => void;
  applyFinalResult: (userWon: boolean, userScore: number, target: number) => void;
  runVersus: () => void;
  markRewarded: () => void;
  resetGame: () => void;
  purchaseBenchUpgrade: () => boolean;
}

const DEFAULT_NAME = 'My Dream XI';

const initialDraftState = {
  squad: [] as SquadSlot[],
  captainId: null as number | null,
  currentTeam: null as TeamCode | null,
  lastTeam: null as TeamCode | null,
  rerollsUsed: 0,
  offer: [] as Player[],
  pendingPlayer: null as Player | null,
  isRolling: false,
  seasonResult: null as SeasonResult | null,
  versusResult: null as VersusResult | null,
  stagedSeason: null as StagedSeason | null,
  userSecondHalf: [] as MatchResult[],
  impactUsed: false,
  userInFinal: false,
  finalOpponentId: null as string | null,
  rewarded: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'home',
  mode: 'free',
  teamName: DEFAULT_NAME,
  opponent: null,
  benchSize: getBenchSize(),
  ...initialDraftState,

  startDraft: (mode = 'free', seed = []) => {
    // Daily Challenge: seed the whole draw so every player gets the same rolls
    // and packs today. Free play restores fresh, non-deterministic randomness.
    if (mode === 'daily') seedRng(dailySeed());
    else resetRng();
    // Pre-placed headliners are a free-play perk only — the Daily must stay the
    // identical puzzle for everyone, so it always starts from an empty board.
    const squad = mode === 'free' ? seedSlots(seed.slice(0, AUCTION_SIGN_LIMIT)) : [];
    set({ phase: 'draft', mode, opponent: null, ...initialDraftState, squad });
  },

  startVersus: (opponent) => {
    // The challenger drafts their own XI with fresh randomness; only the series
    // itself is seeded (in simulateSeries) so the head-to-head stays fair.
    resetRng();
    set({ phase: 'draft', mode: 'versus', opponent, ...initialDraftState });
  },

  // Auction hands us up to 3 signed players, pre-placed into the XI. The rest of
  // the squad is filled through the normal random draft from here.
  startAuctionDraft: (signed, teamName) => {
    resetRng();
    set({
      phase: 'draft',
      mode: 'auction',
      opponent: null,
      ...initialDraftState,
      squad: seedSlots(signed),
      teamName: teamName || DEFAULT_NAME,
    });
  },

  setTeamName: (name) => set({ teamName: name.slice(0, 24) || DEFAULT_NAME }),

  setSquad: (squad) =>
    set((s) => {
      // If the captain got moved to the bench, drop the armband.
      const cap = squad.find((sl) => sl.player.id === s.captainId);
      const captainId = cap && cap.position < XI_SIZE ? s.captainId : null;
      return { squad: [...squad].sort((a, b) => a.position - b.position), captainId };
    }),

  setCaptain: (playerId) =>
    set((s) => {
      const slot = s.squad.find((sl) => sl.player.id === playerId);
      // Only an XI player (not a bench player) can be captain.
      if (!slot || slot.position >= XI_SIZE) return {};
      return { captainId: s.captainId === playerId ? null : playerId };
    }),

  rollTeam: () => {
    const { currentTeam, squad, isRolling, benchSize } = get();
    const effectiveSquadSize = XI_SIZE + benchSize;
    // Only roll when there's no active roll waiting on a pick.
    if (currentTeam || isRolling || squad.length >= effectiveSquadSize) return;
    const drafted = new Set(squad.map((s) => s.player.id));
    const next = drawTeam(get().lastTeam, drafted);
    const mode = get().mode;
    const allowPrime = mode !== 'versus';
    const develop = mode === 'free' || mode === 'auction';
    set({ isRolling: true });
    // The UI animation drives the reveal; settle shortly after.
    window.setTimeout(() => {
      set({
        currentTeam: next,
        lastTeam: next,
        isRolling: false,
        offer: buildOffer(next, drafted, undefined, allowPrime, develop),
      });
    }, 900);
  },

  reroll: () => {
    const { currentTeam, rerollsUsed, isRolling, squad } = get();
    if (!currentTeam || isRolling || rerollsUsed >= MAX_REROLLS) return;
    const drafted = new Set(squad.map((s) => s.player.id));
    const next = drawTeam(currentTeam, drafted);
    const mode = get().mode;
    const allowPrime = mode !== 'versus';
    const develop = mode === 'free' || mode === 'auction';
    set({ isRolling: true, pendingPlayer: null, currentTeam: null, offer: [] });
    window.setTimeout(() => {
      set({
        currentTeam: next,
        lastTeam: next,
        rerollsUsed: rerollsUsed + 1,
        isRolling: false,
        offer: buildOffer(next, drafted, undefined, allowPrime, develop),
      });
    }, 900);
  },

  pickPlayer: (player) => {
    const { squad, benchSize } = get();
    if (squad.length >= XI_SIZE + benchSize) return;
    set({ pendingPlayer: player });
  },

  cancelPick: () => set({ pendingPlayer: null }),

  assignToPosition: (position) => {
    const { pendingPlayer, squad } = get();
    if (!pendingPlayer) return;
    if (squad.some((s) => s.position === position)) return; // slot taken
    if (squad.some((s) => s.player.id === pendingPlayer.id)) return; // dupe guard

    const nextSquad = [...squad, { position, player: pendingPlayer }].sort(
      (a, b) => a.position - b.position,
    );
    set({
      squad: nextSquad,
      pendingPlayer: null,
      currentTeam: null, // consume the roll; next pick needs a fresh roll
      offer: [], // clear the spent pack
    });
  },

  // Stage 1: build the user's XI and play the fixed part of the season +
  // first half, pausing for the mid-season Impact Player decision.
  beginSeason: () => {
    const { squad, teamName, captainId, mode, benchSize } = get();
    if (squad.length !== XI_SIZE + benchSize) return;

    // Daily: seed from the date + initial XI so the run is reproducible and a
    // pure skill puzzle (you can't re-roll for a luckier result).
    if (mode === 'daily') {
      const xiKey = squad
        .map((s) => `${s.position}:${s.player.id}`)
        .sort()
        .join('|');
      seedRng(dailySeed() ^ hashString(`${captainId ?? 'noC'}#${xiKey}`));
    } else {
      resetRng();
    }

    const userTeam = buildUserTeam(teamName || DEFAULT_NAME, xiOrdered(squad), captainId);
    const stagedSeason = prepareStagedSeason(userTeam);

    set({
      phase: 'simulation',
      stagedSeason,
      seasonResult: null,
      userSecondHalf: [],
      impactUsed: false,
      userInFinal: false,
      finalOpponentId: null,
      rewarded: false, // reset so each new season run earns its own coins
    });
  },

  // Stage 2: apply any impact swaps, then finish the season (remaining games +
  // playoffs) with the resulting XI. The final is deferred if reached.
  resolveSeason: (swaps) => {
    const { stagedSeason, squad, teamName, captainId, mode } = get();
    if (!stagedSeason) return;

    let xi = xiOrdered(squad);
    let cap = captainId;
    const bench = benchOf(squad);

    // Each swap references the *original* bench index and XI position, so they
    // apply independently (the UI keeps both sides unique).
    for (const swap of swaps) {
      const incoming = bench[swap.benchIndex];
      const outgoing = xi[swap.xiPosition];
      if (incoming && outgoing) {
        xi = xi.map((p, i) => (i === swap.xiPosition ? incoming : p));
        if (cap === outgoing.id) cap = null; // captain subbed out
      }
    }

    const userTeam = buildUserTeam(teamName || DEFAULT_NAME, xi, cap);
    const finished = finishStagedSeason(stagedSeason, userTeam);

    // Lock in the Daily result now if the season is fully decided. If the user
    // reached the final, recording waits until the live over is bowled.
    if (mode === 'daily' && !finished.userInFinal) {
      recordDailyToday(finished.seasonResult, teamName);
    }

    resetRng(); // live over / confetti should feel alive
    set({
      seasonResult: finished.seasonResult,
      userSecondHalf: finished.userSecondHalf,
      userInFinal: finished.userInFinal,
      finalOpponentId: finished.finalOpponentId,
      impactUsed: swaps.length > 0,
      captainId: cap,
    });
  },

  // Stage 3 (only when the user is a finalist): fill in the final from the
  // outcome of the playable last over.
  applyFinalResult: (userWon, userScore, target) => {
    const { seasonResult, finalOpponentId, teamName, mode } = get();
    if (!seasonResult || !finalOpponentId) return;

    const playoffs = seasonResult.playoffs.map((p) => ({ ...p }));
    const finalIdx = playoffs.findIndex((p) => p.stage === 'FINAL');
    const fm = playoffs[finalIdx];

    const winnerId = userWon ? USER_TEAM_ID : finalOpponentId;
    const loserId = userWon ? finalOpponentId : USER_TEAM_ID;
    const margin = finalMargin(userScore, target);
    // Keep the bracket's score scale consistent with the other rounds.
    const loserPerf = round(78 + random() * 6, 2);
    const winnerPerf = round(loserPerf + margin, 2);
    const aIsWinner = fm.teamAId === winnerId;

    const result: MatchResult = {
      id: 'PO_FINAL',
      homeId: fm.teamAId,
      awayId: fm.teamBId,
      homeScore: aIsWinner ? winnerPerf : loserPerf,
      awayScore: aIsWinner ? loserPerf : winnerPerf,
      winnerId,
      loserId,
      margin,
    };
    playoffs[finalIdx] = { ...fm, result };

    const userOutcome: SeasonOutcome = userWon ? 'CHAMPION' : 'RUNNER_UP';
    const newSeason: SeasonResult = {
      ...seasonResult,
      playoffs,
      championId: winnerId,
      runnerUpId: loserId,
      userOutcome,
    };

    if (mode === 'daily') recordDailyToday(newSeason, teamName);
    set({ seasonResult: newSeason, userInFinal: false });
  },

  runVersus: () => {
    const { squad, teamName, captainId, opponent, benchSize } = get();
    if (squad.length !== XI_SIZE + benchSize || !opponent) return;

    const userTeam = buildUserTeam(teamName || DEFAULT_NAME, xiOrdered(squad), captainId);
    userTeam.id = VS_USER_ID; // distinct ids so the series can tell sides apart
    const oppTeam = hydrateSharedTeam(opponent, VS_OPP_ID, false);
    if (!oppTeam) return;

    const versusResult = simulateSeries(userTeam, oppTeam, 3);
    set({ phase: 'simulation', versusResult });
  },

  markRewarded: () => set({ rewarded: true }),

  purchaseBenchUpgrade: () => {
    const ok = upgradeBench();
    if (ok) set({ benchSize: getBenchSize() });
    return ok;
  },

  resetGame: () => {
    resetRng();
    set({
      phase: 'home',
      mode: 'free',
      teamName: DEFAULT_NAME,
      opponent: null,
      ...initialDraftState,
    });
  },
}));

// --- selectors / derived helpers -------------------------------------------

export function useDraftedIds(): Set<number> {
  return useGameStore((s) => new Set(s.squad.map((slot) => slot.player.id)));
}

/** The revealed random pack for the current roll (already excludes drafted). */
export function useSelectablePlayers(): Player[] {
  return useGameStore((s) => s.offer);
}

/** Strength of the starting XI (bench excluded). */
export function useSquadStrength(): TeamStrength | null {
  const squad = useGameStore((s) => s.squad);
  const xi = xiOrdered(squad);
  if (xi.length === 0) return null;
  return computeStrength(xi);
}

/** Live fair-play composition analysis of the starting XI. */
export function useComposition(): Composition {
  const squad = useGameStore((s) => s.squad);
  return analyzeComposition(xiOrdered(squad));
}

/** Live squad chemistry (club + national links) for the starting XI. */
export function useChemistry(): Chemistry {
  const squad = useGameStore((s) => s.squad);
  return analyzeChemistry(xiOrdered(squad));
}

/** Live batting-order fit analysis for the starting XI. */
export function usePositions(): PositionAnalysis {
  const squad = useGameStore((s) => s.squad);
  return analyzePositions(xiByPosition(squad));
}

/** Bench players (for the Impact Player picker). */
export function useBench(): Player[] {
  const squad = useGameStore((s) => s.squad);
  return benchOf(squad);
}

/** Count of XI players per role, for the balance meter. */
export function useRoleBalance(): Record<PlayerRole, number> {
  const squad = useGameStore((s) => s.squad);
  const base: Record<PlayerRole, number> = {
    BATTER: 0,
    BOWLER: 0,
    ALL_ROUNDER: 0,
    WICKET_KEEPER: 0,
  };
  for (const slot of squad) {
    if (slot.position < XI_SIZE) base[slot.player.role]++;
  }
  return base;
}

/** Current bench capacity (reactive — updates when a bench upgrade is purchased). */
export function useBenchSize(): number {
  return useGameStore((s) => s.benchSize);
}

export { SQUAD_SIZE, XI_SIZE, MAX_REROLLS };
