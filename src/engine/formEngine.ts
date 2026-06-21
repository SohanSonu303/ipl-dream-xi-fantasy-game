import type { SeasonTeam } from '@/types';
import { clamp } from '@/utils';

// ---------------------------------------------------------------------------
// Player form / momentum. When a player wins Player of the Match their form
// rises, and a side carrying in-form players performs a little better in its
// *subsequent* matches. This applies to the user's XI and every AI franchise
// alike, so a hot streak is a real, league-wide momentum swing — the form table
// shifts as the season unfolds rather than being fixed at draft time.
//
// Form is kept in a module-level map that is reset at the start of each
// simulation. Because the bonus is read live inside the match engine, it never
// requires the precomputed team strengths to be rebuilt.
// ---------------------------------------------------------------------------

/** Form points a Player-of-the-Match award adds. */
export const MOM_FORM_GAIN = 4;
/** A single player's form is capped (≈ two MOMs) so it can't run away. */
const MAX_PLAYER_FORM = 8;
/** Cap on the team-wide form bonus, in performance points. */
const FORM_BONUS_CAP = 6;

const form = new Map<number, number>();

/** Clear all form — call at the start of a season / series. */
export function resetForm(): void {
  form.clear();
}

/** Bump a player's form after a standout (MOM) performance. */
export function gainForm(playerId: number): void {
  form.set(playerId, Math.min(MAX_PLAYER_FORM, (form.get(playerId) ?? 0) + MOM_FORM_GAIN));
}

/** A player's current form (0 = no momentum). */
export function playerForm(playerId: number): number {
  return form.get(playerId) ?? 0;
}

/** Is this player riding a hot streak right now? */
export function isInForm(playerId: number): boolean {
  return (form.get(playerId) ?? 0) > 0;
}

/** Live performance bonus a side earns from its in-form players. */
export function teamFormBonus(team: SeasonTeam): number {
  const roster = team.players;
  if (!roster || roster.length === 0) return 0;
  let sum = 0;
  for (const p of roster) sum += form.get(p.id) ?? 0;
  return clamp(sum * 0.25, 0, FORM_BONUS_CAP);
}
