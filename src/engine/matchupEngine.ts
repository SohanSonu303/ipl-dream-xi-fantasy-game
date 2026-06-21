import type { Player } from '@/types';
import { getTrait } from '@/data/playerMeta';
import { clamp, hashString } from '@/utils';

// ---------------------------------------------------------------------------
// Batter-vs-bowler matchups. A T20 contest isn't only raw ratings — some
// bowlers simply have the wood over a particular batter (and some batters
// dominate a particular bowler), regardless of the scorecard. This engine
// derives a per-pairing "head-to-head record" that tilts the individual duel:
//
//   1. skill gap — the bowler's class against the batter's class (a nudge;
//      the ball engine already weighs raw ratings).
//   2. history   — a *deterministic* rivalry seeded from the two player ids, so
//      the same pairing always carries the same record. This is what makes an
//      opponent "have a good record against the current batter".
//   3. traits    — wicket-taking signatures (death/pace/spin) press the edge;
//      clutch batting signatures (chase/finisher/powerplay) claw it back.
//
// The result is a signed `edge` in [-0.6, 0.6]: positive favours the bowler,
// negative favours the batter. The ball engine reads it to bend the wicket and
// boundary odds, so the duel "favours based on stats" plus the standing record.
// ---------------------------------------------------------------------------

export type MatchupFavours = 'BOWLER' | 'BATTER' | 'EVEN';

export interface Matchup {
  edge: number;
  favours: MatchupFavours;
  /** True when the edge is pronounced (a real rivalry, not a coin-flip). */
  strong: boolean;
  /** Broadcast-style note describing the head-to-head. */
  note: string;
}

const WICKET_TRAITS = new Set(['DEATH_OVERS_KING', 'PACE_SPEARHEAD', 'SPIN_WIZARD']);
const CLUTCH_BAT_TRAITS = new Set(['CHASE_MASTER', 'FINISHER', 'POWERPLAY_ENFORCER']);

/** Deterministic history term in [-0.35, 0.35] for this exact pairing. */
function historyEdge(bowlerId: number, batterId: number): number {
  const h = hashString(`mu:${bowlerId}>${batterId}`);
  // Map the 32-bit hash to [0, 1) then re-centre to [-0.35, 0.35].
  return ((h % 1000) / 1000 - 0.5) * 0.7;
}

function traitEdge(bowler: Player, batter: Player): number {
  let e = 0;
  const bowlTrait = getTrait(bowler.id)?.key;
  const batTrait = getTrait(batter.id)?.key;
  if (bowlTrait && WICKET_TRAITS.has(bowlTrait)) e += 0.12;
  if (batTrait && CLUTCH_BAT_TRAITS.has(batTrait)) e -= 0.12;
  return e;
}

/** Compute the head-to-head edge between a bowler and a batter. */
export function getMatchup(bowler: Player, batter: Player): Matchup {
  const skillGap = (bowler.bowlingRating - batter.battingRating) / 100; // ~[-0.9, 0.9]
  const history = historyEdge(bowler.id, batter.id);
  const traits = traitEdge(bowler, batter);

  const edge = clamp(history * 0.8 + traits + skillGap * 0.25, -0.6, 0.6);
  const favours: MatchupFavours = edge > 0.08 ? 'BOWLER' : edge < -0.08 ? 'BATTER' : 'EVEN';
  const strong = Math.abs(edge) >= 0.3;

  const note = buildNote(bowler.name, batter.name, favours, strong);
  return { edge, favours, strong, note };
}

function buildNote(bowler: string, batter: string, favours: MatchupFavours, strong: boolean): string {
  if (favours === 'BOWLER') {
    return strong
      ? `${bowler} has the wood over ${batter} — dismissed him cheaply before.`
      : `${bowler} has the slight edge in this duel.`;
  }
  if (favours === 'BATTER') {
    return strong
      ? `${batter} has feasted on ${bowler} historically — favourable match-up.`
      : `${batter} reads ${bowler} well.`;
  }
  return 'Even contest — no clear record between these two.';
}
