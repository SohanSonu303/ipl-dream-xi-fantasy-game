import { create } from 'zustand';
import type {
  GamePhase,
  Player,
  PlayerRole,
  SeasonResult,
  SquadSlot,
  TeamCode,
  TeamStrength,
} from '@/types';
import {
  MAX_REROLLS,
  SQUAD_SIZE,
  analyzeComposition,
  buildOffer,
  buildUserTeam,
  computeStrength,
  drawTeam,
  simulateSeason,
} from '@/engine';
import type { Composition } from '@/types';

interface GameState {
  phase: GamePhase;
  teamName: string;
  squad: SquadSlot[];
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

  // --- actions ---
  startDraft: () => void;
  setTeamName: (name: string) => void;
  rollTeam: () => void;
  reroll: () => void;
  pickPlayer: (player: Player) => void;
  cancelPick: () => void;
  assignToPosition: (position: number) => void;
  removeFromSquad: (position: number) => void;
  runSimulation: () => void;
  resetGame: () => void;
}

const DEFAULT_NAME = 'My Dream XI';

const initialDraftState = {
  squad: [] as SquadSlot[],
  currentTeam: null as TeamCode | null,
  lastTeam: null as TeamCode | null,
  rerollsUsed: 0,
  offer: [] as Player[],
  pendingPlayer: null as Player | null,
  isRolling: false,
  seasonResult: null as SeasonResult | null,
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'home',
  teamName: DEFAULT_NAME,
  ...initialDraftState,

  startDraft: () =>
    set({ phase: 'draft', ...initialDraftState }),

  setTeamName: (name) => set({ teamName: name.slice(0, 24) || DEFAULT_NAME }),

  rollTeam: () => {
    const { currentTeam, squad, isRolling } = get();
    // Only roll when there's no active roll waiting on a pick.
    if (currentTeam || isRolling || squad.length >= SQUAD_SIZE) return;
    const drafted = new Set(squad.map((s) => s.player.id));
    const next = drawTeam(get().lastTeam, drafted);
    set({ isRolling: true });
    // The UI animation drives the reveal; settle shortly after.
    window.setTimeout(() => {
      set({
        currentTeam: next,
        lastTeam: next,
        isRolling: false,
        offer: buildOffer(next, drafted),
      });
    }, 900);
  },

  reroll: () => {
    const { currentTeam, rerollsUsed, isRolling, squad } = get();
    if (!currentTeam || isRolling || rerollsUsed >= MAX_REROLLS) return;
    const drafted = new Set(squad.map((s) => s.player.id));
    const next = drawTeam(currentTeam, drafted);
    set({ isRolling: true, pendingPlayer: null, currentTeam: null, offer: [] });
    window.setTimeout(() => {
      set({
        currentTeam: next,
        lastTeam: next,
        rerollsUsed: rerollsUsed + 1,
        isRolling: false,
        offer: buildOffer(next, drafted),
      });
    }, 900);
  },

  pickPlayer: (player) => {
    if (get().squad.length >= SQUAD_SIZE) return;
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

  removeFromSquad: (position) =>
    set({ squad: get().squad.filter((s) => s.position !== position) }),

  runSimulation: () => {
    const { squad, teamName } = get();
    if (squad.length !== SQUAD_SIZE) return;
    const players = squad.map((s) => s.player);
    const strength = computeStrength(players);
    const userTeam = buildUserTeam(teamName || DEFAULT_NAME, strength);
    const seasonResult = simulateSeason(userTeam);
    set({ phase: 'simulation', seasonResult });
  },

  resetGame: () => set({ phase: 'home', teamName: DEFAULT_NAME, ...initialDraftState }),
}));

// --- selectors / derived helpers -------------------------------------------

export function useDraftedIds(): Set<number> {
  return useGameStore((s) => new Set(s.squad.map((slot) => slot.player.id)));
}

/** The revealed random pack for the current roll (already excludes drafted). */
export function useSelectablePlayers(): Player[] {
  return useGameStore((s) => s.offer);
}

export function useSquadStrength(): TeamStrength | null {
  const squad = useGameStore((s) => s.squad);
  if (squad.length === 0) return null;
  return computeStrength(squad.map((s) => s.player));
}

/** Live fair-play composition analysis of the current squad. */
export function useComposition(): Composition {
  const squad = useGameStore((s) => s.squad);
  return analyzeComposition(squad.map((s) => s.player));
}

/** Count of drafted players per role, for the balance meter. */
export function useRoleBalance(): Record<PlayerRole, number> {
  const squad = useGameStore((s) => s.squad);
  const base: Record<PlayerRole, number> = {
    BATTER: 0,
    BOWLER: 0,
    ALL_ROUNDER: 0,
    WICKET_KEEPER: 0,
  };
  for (const slot of squad) base[slot.player.role]++;
  return base;
}

export { SQUAD_SIZE, MAX_REROLLS };
