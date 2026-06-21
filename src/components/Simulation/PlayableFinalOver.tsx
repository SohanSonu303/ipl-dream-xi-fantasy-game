import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SeasonTeam } from '@/types';
import {
  type Field,
  type ShotChoice,
  type ShotResult,
  buildField,
  finalOverEffect,
  PITCH_META,
  resolveShot,
  rollConditions,
  setupFinalOver,
  SHOT_ZONES,
} from '@/engine';
import { RARITY_META } from '@/data/primeEditions';
import { getBatsHand } from '@/data/playerMeta';
import { CricketField, type BallFlight } from './CricketField';
import { Confetti } from './Confetti';
import { cn } from '@/utils';

interface PlayableFinalOverProps {
  userTeam: SeasonTeam;
  oppTeam: SeasonTeam;
  onComplete: (userWon: boolean, runs: number, target: number) => void;
}

interface PlayedBall {
  label: string;
  runs: number;
  wicket: boolean;
}

export function PlayableFinalOver({ userTeam, oppTeam, onComplete }: PlayableFinalOverProps) {
  // Toss + pitch for the over: a flat deck eases the chase, a seamer/turner
  // makes it brutal, and winning the toss is a small edge.
  const conditions = useMemo(() => rollConditions(), []);
  const effect = useMemo(() => finalOverEffect(conditions), [conditions]);
  const pitch = PITCH_META[conditions.pitch];
  const setup = useMemo(() => setupFinalOver(userTeam, oppTeam, effect.targetDelta), [userTeam, oppTeam, effect]);
  const { target, bowler, batters } = setup;

  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ball, setBall] = useState(0);
  const [batterIndex, setBatterIndex] = useState(0);
  const [deliveries, setDeliveries] = useState<PlayedBall[]>([]);
  const [last, setLast] = useState<ShotResult | null>(null);
  const [field, setField] = useState<Field>(() => buildField());
  const [flight, setFlight] = useState<BallFlight | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);

  const need = Math.max(0, target - runs);
  const ballsLeft = 6 - ball;
  const allOut = batterIndex >= batters.length;
  const striker = batters[Math.min(batterIndex, batters.length - 1)];
  const hand = striker ? getBatsHand(striker.id) : 'R';
  const userWon = runs >= target;

  const play = (choice: ShotChoice) => {
    if (done || allOut || locked || !striker) return;
    const result = resolveShot(bowler, striker, choice, field, effect.contestDelta);

    setLocked(true);
    setFlight({ to: result.landing, kind: result.kind, aerial: result.aerial, deliveryLabel: result.deliveryLabel, key: ball + 1 });

    // Delivery leg (~420ms) + shot leg (~500–800ms) + a small buffer.
    const aerial = result.aerial || result.kind === 'six';
    const settle = aerial ? 1500 : 1250;

    window.setTimeout(() => {
      const newRuns = runs + result.runs;
      const newWickets = wickets + (result.wicket ? 1 : 0);
      const newBall = ball + 1;
      const newBatterIndex = result.wicket ? batterIndex + 1 : batterIndex;

      setRuns(newRuns);
      setWickets(newWickets);
      setBall(newBall);
      setBatterIndex(newBatterIndex);
      setDeliveries((d) => [...d, { label: result.label, runs: result.runs, wicket: result.wicket }]);
      setLast(result);
      setFlight(null);
      setField(buildField()); // fresh field + gaps for the next ball
      setLocked(false);

      const won = newRuns >= target;
      if (won || newBall >= 6 || newBatterIndex >= batters.length) setDone(true);
    }, settle);
  };

  return (
    <div className="panel relative mx-auto max-w-md overflow-hidden p-4 text-center sm:p-5">
      {done && userWon && <Confetti count={80} />}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,0.16),transparent_65%)]" />
      <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">The Final · You’re Batting</span>

      {/* Toss + pitch */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
        <span className="pill border border-white/10 bg-white/5 text-slate-300">
          🪙 {conditions.tossWonByUser ? 'You won the toss' : 'Rival won the toss'}
        </span>
        <span
          className="pill border border-white/10 bg-white/5"
          style={{ color: pitch.favours === 'BAT' ? '#5ec0ff' : pitch.favours === 'BOWL' ? '#ff8a5e' : '#cbd5e1' }}
          title={pitch.blurb}
        >
          {pitch.emoji} {pitch.label}
        </span>
      </div>

      {/* Equation */}
      <div className="mt-3">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${need}-${ballsLeft}-${done}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="heading-display text-2xl font-700 uppercase sm:text-3xl"
          >
            {done ? (
              <span style={{ color: userWon ? '#34d399' : '#cbd5e1' }}>{userWon ? 'Champions!' : 'Fell Short'}</span>
            ) : need <= 0 ? (
              <span className="text-emerald-300">Target chased!</span>
            ) : (
              <span>
                Need <span className="text-gold">{need}</span> off <span className="text-gold">{ballsLeft}</span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-0.5 text-[11px] text-slate-400">
          Target {target} · {runs} scored · {batters.length - wickets} wkts in hand
        </div>
      </div>

      {/* Bowler vs striker */}
      <div className="mt-2 flex items-center justify-center gap-2 text-xs">
        <PlayerTag name={bowler.name} rating={bowler.bowlingRating} rl="BOWL" rarity={bowler.rarity} tone="#fb7185" />
        <span className="text-slate-500">vs</span>
        <PlayerTag name={striker?.name ?? '—'} rating={striker?.battingRating ?? 0} rl={hand === 'L' ? 'LHB' : 'RHB'} rarity={striker?.rarity} tone="#f5c542" />
      </div>

      {/* The field */}
      <div className="mt-3">
        <CricketField field={field} flight={flight} bowlerName={bowler.name} strikerName={striker?.name ?? 'Batter'} hand={hand} />
      </div>

      {/* Commentary */}
      <div className="mt-1 grid h-10 place-items-center">
        <AnimatePresence mode="wait">
          {last && !locked && (
            <motion.p
              key={deliveries.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={cn(
                'text-sm',
                last.kind === 'wicket' ? 'text-red-300' : last.kind === 'six' || last.kind === 'four' ? 'text-gold-soft' : 'text-slate-300',
              )}
            >
              {last.text}
            </motion.p>
          )}
          {locked && (
            <motion.p key="watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-400">
              …
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Ball strip */}
      <div className="mt-1 flex items-center justify-center gap-1.5">
        {Array.from({ length: 6 }, (_, i) => {
          const d = deliveries[i];
          const big = d && (d.runs >= 4 || d.wicket);
          return (
            <motion.div
              key={i}
              initial={false}
              animate={d ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className={cn(
                'grid aspect-square w-8 shrink-0 place-items-center rounded-full border font-display text-[11px] font-700 uppercase',
                !d && 'border-white/10 bg-white/5 text-slate-600',
                d && d.wicket && 'border-red-400/50 bg-red-500/20 text-red-200',
                d && !d.wicket && big && 'border-gold/50 bg-gold/20 text-gold-soft shadow-glow',
                d && !d.wicket && !big && 'border-white/15 bg-white/10 text-slate-200',
              )}
            >
              {d ? d.label : i + 1}
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      {done ? (
        <button onClick={() => onComplete(userWon, runs, target)} className="btn-primary mx-auto mt-3 px-9">
          {userWon ? 'Lift the Trophy' : 'See Result'}
        </button>
      ) : (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <span>🏏</span>
            <span>Read the bowler and pick your shot — you commit before the ball</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {SHOT_ZONES.map((z) => (
              <button
                key={z.key}
                onClick={() => play(z.key)}
                disabled={locked}
                className="relative flex flex-col items-center rounded-lg border border-white/12 bg-white/5 px-1 py-2 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                <span className="font-display text-[12px] font-700 uppercase leading-none">{z.shot}</span>
                <span className="mt-0.5 text-[8px] uppercase tracking-wide text-slate-500">{z.region.replace('the ', '')}</span>
                <RiskPips risk={z.risk} />
              </button>
            ))}
          </div>
          <button
            onClick={() => play('BLOCK')}
            disabled={locked}
            className="mt-1.5 w-full rounded-lg border border-white/12 bg-white/5 py-1.5 text-xs font-600 uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Block · play safe
          </button>
        </div>
      )}
    </div>
  );
}

/** Inherent risk of the shot (not a hint about this ball): 1 safe → 3 risky. */
function RiskPips({ risk }: { risk: 1 | 2 | 3 }) {
  return (
    <span className="mt-1 flex gap-0.5" title={risk === 1 ? 'Low risk' : risk === 2 ? 'Medium risk' : 'High risk / high reward'}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1 w-1 rounded-full',
            i <= risk ? (risk === 3 ? 'bg-red-400' : risk === 2 ? 'bg-gold' : 'bg-emerald-400') : 'bg-white/15',
          )}
        />
      ))}
    </span>
  );
}

function PlayerTag({
  name,
  rating,
  rl,
  rarity,
  tone,
}: {
  name: string;
  rating: number;
  rl: string;
  rarity?: import('@/types').Rarity;
  tone: string;
}) {
  const rm = rarity ? RARITY_META[rarity] : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">
      {rm && <span style={{ color: rm.color }}>{rm.emblem}</span>}
      <span className="max-w-[88px] truncate font-600 text-slate-200">{name}</span>
      <span className="font-display font-700" style={{ color: tone }}>{rating}</span>
      <span className="stat-label">{rl}</span>
    </span>
  );
}
