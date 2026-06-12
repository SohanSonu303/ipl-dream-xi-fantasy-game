import { useQuery } from '@tanstack/react-query';
import type { Player } from '@/types';
import { ALL_PLAYERS, SEASON_LABEL } from '@/engine';

/**
 * Player data lives in a bundled JSON file (the game's source of truth), so
 * there's no network call — but we surface it through TanStack Query to keep a
 * single, cache-friendly access point that the rest of the app reads from.
 */
export function usePlayers() {
  return useQuery<{ season: string; players: Player[] }>({
    queryKey: ['players'],
    queryFn: async () => ({ season: SEASON_LABEL, players: ALL_PLAYERS }),
    staleTime: Infinity,
  });
}
