import type { Player, SeasonTeam } from '@/types';
import { getTrait } from '@/data/playerMeta';
import { getMatchup } from './matchupEngine';
import { clamp, random, randomFloat, round } from '@/utils';

// ---------------------------------------------------------------------------
// The playable final over. When the user reaches the final they bat the last
// over live, ball by ball. Each ball: the opponent's death bowler delivers, you
// choose how to play it, and the result is decided by bowler skill vs batter
// skill vs your intent — e.g. a specialist's yorker + a big swing = wicket, but
// a loose ball to a quality batter can be launched for six. Your runs decide the
// title.
// ---------------------------------------------------------------------------

export type Intent = 'BLOCK' | 'PUSH' | 'BIG';
export type BallType = 'YORKER' | 'GOOD' | 'LOOSE';

export interface BallOutcome {
  runs: number;
  wicket: boolean;
  ballType: BallType;
  label: string; // '•', '1', '2', 'FOUR', 'SIX', 'W'
  text: string; // short commentary
}

export interface FinalOverSetup {
  target: number;
  bowler: Player;
  /** Batters who'll face the over, in order (striker first). */
  batters: Player[];
}

function traitBowlBoost(p: Player): number {
  const key = getTrait(p.id)?.key;
  return key === 'DEATH_OVERS_KING' || key === 'PACE_SPEARHEAD' ? 6 : 0;
}

/** Pick the opponent's best death bowler to bowl the final over. */
function pickDeathBowler(team: SeasonTeam): Player {
  const roster = team.players ?? [];
  const options = roster.filter((p) => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER');
  const pool = options.length > 0 ? options : roster;
  return [...pool].sort(
    (a, b) => b.bowlingRating + traitBowlBoost(b) - (a.bowlingRating + traitBowlBoost(a)),
  )[0];
}

/**
 * Set up the chase: a target off six balls (tougher when the opponent is the
 * stronger side) and the death-order batters (XI slots 6–11). Putting a real
 * finisher at slot 6 pays off here.
 */
export function setupFinalOver(userTeam: SeasonTeam, oppTeam: SeasonTeam, targetDelta = 0): FinalOverSetup {
  // A challenging but achievable last over: typically ~12–16 to win, adjusted
  // for the power gap between sides. `targetDelta` folds in pitch/toss conditions.
  const target = Math.round(
    clamp(13 + (oppTeam.strength.teamPower - userTeam.strength.teamPower) * 0.3 + randomFloat(-2, 2) + targetDelta, 8, 17),
  );
  const xi = userTeam.players ?? [];
  // Death order: the finisher slot (index 5) onward, then the tail.
  const batters = [5, 6, 7, 8, 9, 10].map((i) => xi[i]).filter(Boolean) as Player[];
  return { target, bowler: pickDeathBowler(oppTeam), batters };
}

/** Roll the kind of delivery — better bowlers land more yorkers, fewer freebies. */
export function rollBallType(bowler: Player): BallType {
  const skill = bowler.bowlingRating / 100;
  const pYorker = clamp(0.15 + (bowler.bowlingRating - 70) / 100, 0.1, 0.55);
  const pLoose = clamp(0.4 - skill * 0.3, 0.12, 0.42);
  const r = random();
  if (r < pYorker) return 'YORKER';
  if (r > 1 - pLoose) return 'LOOSE';
  return 'GOOD';
}

/**
 * Resolve one delivery given the batter's intent. The ball type is rolled here
 * (you commit to a shot before you know exactly what's coming — that's the read).
 */
export function resolveBall(bowler: Player, batter: Player, intent: Intent): BallOutcome {
  const ballType = rollBallType(bowler);
  const batSkill = batter.battingRating / 100; // 0..1
  const bowlSkill = bowler.bowlingRating / 100;
  // Head-to-head record: a bowler with the wood over this batter takes more
  // wickets and concedes fewer boundaries; a favourable match-up for the batter
  // does the opposite. Positive edge => bowler advantage.
  const edge = getMatchup(bowler, batter).edge;

  const mk = (runs: number, wicket: boolean, text: string): BallOutcome => ({
    runs,
    wicket,
    ballType,
    label: wicket ? 'W' : runs === 0 ? '•' : runs === 4 ? 'FOUR' : runs === 6 ? 'SIX' : String(runs),
    text,
  });

  if (intent === 'BLOCK') {
    if (random() < 0.01) return mk(0, true, 'Beaten all ends up — bowled!');
    return random() < 0.7 ? mk(0, false, 'Solid defence. Dot ball.') : mk(1, false, 'Dabbed for a single.');
  }

  if (intent === 'PUSH') {
    const baseW = ballType === 'YORKER' ? 0.09 : ballType === 'GOOD' ? 0.045 : 0.02;
    if (random() < clamp(baseW - batSkill * 0.03 + edge * 0.04, 0.004, 0.14)) {
      return mk(0, true, 'Squeezed out — and a wicket falls!');
    }
    if (ballType === 'LOOSE') return random() < 0.4 + batSkill * 0.3 ? mk(2, false, 'Worked into the gap for two.') : mk(1, false, 'Pushed for a single.');
    if (ballType === 'GOOD') return mk(1, false, 'Nudged for a single.');
    return random() < 0.5 ? mk(0, false, 'Yorker dug out. No run.') : mk(1, false, 'Jammed out for one.');
  }

  // BIG — go for the boundary. Death bowling is hard to get away cleanly.
  const baseW = ballType === 'YORKER' ? 0.62 : ballType === 'GOOD' ? 0.4 : 0.18;
  const wicketP = clamp(baseW * (1.35 - batSkill) * (0.85 + bowlSkill * 0.5) * (1 + edge * 0.45), 0.05, 0.96);
  if (random() < wicketP) {
    const how =
      ballType === 'YORKER'
        ? 'Yorker on the toes — swings and misses, BOWLED!'
        : 'Goes big but picks out the fielder — OUT!';
    return mk(0, true, how);
  }
  // Survived the swing — how well did it connect? (a bowler edge dulls the bat)
  const sixP = clamp(
    (ballType === 'LOOSE' ? 0.62 : ballType === 'GOOD' ? 0.42 : 0.24) * (0.55 + batSkill * 0.7) * (1 - edge * 0.35),
    0.06,
    0.85,
  );
  if (random() < sixP) return mk(6, false, 'SIX! Launched into the crowd!');
  if (random() < 0.5) return mk(4, false, 'FOUR! Found the gap.');
  return random() < 0.6 ? mk(2, false, 'Mis-timed but two taken.') : mk(1, false, 'Inside edge, single.');
}

/** Map the user's runs vs the target to a believable winning margin. */
export function finalMargin(scored: number, target: number): number {
  return Math.max(1, round(Math.abs(scored - target) + randomFloat(0, 4), 0));
}
