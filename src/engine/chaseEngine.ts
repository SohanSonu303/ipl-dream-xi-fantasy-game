import type { MatchResult, SeasonTeam } from '@/types';
import { clamp, random } from '@/utils';

// ---------------------------------------------------------------------------
// Final-over "broadcast theatre". The Final is already decided by the match
// engine — this synthesises a tense last over consistent with that result, so
// the title is settled with ball-by-ball drama and a swinging win-probability
// bar rather than a silent cut to the trophy. It never changes who wins.
// ---------------------------------------------------------------------------

export interface Delivery {
  /** Ball number within the final over (1-6). */
  ball: number;
  runs: number;
  wicket: boolean;
  /** Display label: "•", "1", "FOUR", "SIX", "W". */
  label: string;
  /** Runs the chasing side still needs after this ball. */
  needAfter: number;
  /** Chasing side's win probability (0-100) after this ball. */
  winProb: number;
}

export interface FinalChase {
  chasing: SeasonTeam;
  defending: SeasonTeam;
  /** Runs the chasing side needs off the final over. */
  need: number;
  /** Win probability (0-100) for the chasing side at the start of the over. */
  startWinProb: number;
  deliveries: Delivery[];
  chasingWon: boolean;
  /** Runs actually scored across the over. */
  scored: number;
  /** Short headline summarising how it finished. */
  verdict: string;
}

function runLabel(runs: number, wicket: boolean): string {
  if (wicket) return 'W';
  if (runs === 0) return '•';
  if (runs === 4) return 'FOUR';
  if (runs === 6) return 'SIX';
  return String(runs);
}

/**
 * Split a total of `sum` runs across `balls` deliveries, each a realistic
 * single-ball value (0-6). Used to construct a chase that reaches a known total.
 */
function distributeRuns(sum: number, balls: number): number[] {
  const out: number[] = [];
  let remaining = sum;
  for (let i = 0; i < balls; i++) {
    const ballsLeft = balls - i;
    const maxThis = Math.min(6, remaining); // never strand more than 6/ball can clear
    const minThis = Math.max(0, remaining - 6 * (ballsLeft - 1));
    // Bias toward the average needed per ball so the over feels natural.
    const avg = remaining / ballsLeft;
    const jittered = Math.round(avg + (random() - 0.5) * 2.4);
    out.push(clamp(jittered, minThis, maxThis));
    remaining -= out[i];
  }
  return out;
}

/** Chasing side's win probability given runs still needed and balls remaining. */
function winProb(needAfter: number, ballsLeft: number, chasingWon: boolean): number {
  if (needAfter <= 0) return 100;
  if (ballsLeft <= 0) return chasingWon ? 100 : 0;
  const rrr = needAfter / ballsLeft; // required runs per ball
  const p = 1 / (1 + Math.exp((rrr - 1.6) * 1.5));
  return Math.round(clamp(p * 100, 2, 98));
}

/**
 * Build a believable final over for the title decider. The chasing side may be
 * the eventual winner or loser (broadcast variety), but the over always
 * resolves to the real `result.winnerId`.
 */
export function buildFinalChase(
  result: MatchResult,
  byId: Map<string, SeasonTeam>,
): FinalChase {
  const winner = byId.get(result.winnerId)!;
  const loser = byId.get(result.loserId)!;

  // Tighter games (small margin) leave fewer runs to get and last-ball nerves.
  const need = Math.round(clamp(17 - result.margin * 0.7, 6, 16));

  // Who is chasing is cosmetic; the real winner lifts the trophy either way.
  const winnerChasing = random() < 0.5;
  const chasing = winnerChasing ? winner : loser;
  const defending = winnerChasing ? loser : winner;
  const chasingWon = winnerChasing;

  // Decide the per-ball runs up front so the over is guaranteed consistent with
  // the real result: a chasing win crosses the target exactly on the last ball;
  // a chasing loss finishes a few runs short, with the odd wicket for drama.
  let runsPerBall: number[];
  const wicketBalls = new Set<number>();
  if (chasingWon) {
    const lastBall = clamp(Math.round(1 + random() * 5), 1, Math.min(6, need));
    runsPerBall = [...distributeRuns(need - lastBall, 5), lastBall];
  } else {
    const shortfall = clamp(Math.round(1 + random() * 5), 1, need - 1);
    const target = need - shortfall;
    const droppedBalls = random() < 0.6 ? (random() < 0.4 ? 2 : 1) : 0;
    const scoringBalls = 6 - droppedBalls;
    const spread = distributeRuns(target, scoringBalls);
    // Interleave the wicket(s) among the over.
    runsPerBall = [];
    let s = 0;
    const wicketAt = new Set<number>();
    while (wicketAt.size < droppedBalls) wicketAt.add(Math.floor(random() * 6));
    for (let i = 0; i < 6; i++) {
      if (wicketAt.has(i)) {
        runsPerBall.push(0);
        wicketBalls.add(i);
      } else {
        runsPerBall.push(spread[s++] ?? 0);
      }
    }
  }

  const deliveries: Delivery[] = [];
  let scored = 0;

  for (let i = 0; i < 6; i++) {
    const ball = i + 1;
    const ballsLeftAfter = 5 - i;
    const wicket = wicketBalls.has(i);
    const runs = wicket ? 0 : runsPerBall[i];

    scored += runs;
    const needAfter = Math.max(0, need - scored);
    deliveries.push({
      ball,
      runs,
      wicket,
      label: runLabel(runs, wicket),
      needAfter,
      winProb: winProb(needAfter, ballsLeftAfter, chasingWon),
    });

    if (chasingWon && scored >= need) break; // early celebration
  }

  const lastBall = deliveries.length === 6 && chasingWon;
  const verdict = chasingWon
    ? lastBall
      ? `${chasing.name} get home off the last ball!`
      : `${chasing.name} chase it down!`
    : `${defending.name} defend the total!`;

  return {
    chasing,
    defending,
    need,
    startWinProb: winProb(need, 6, chasingWon),
    deliveries,
    chasingWon,
    scored,
    verdict,
  };
}
