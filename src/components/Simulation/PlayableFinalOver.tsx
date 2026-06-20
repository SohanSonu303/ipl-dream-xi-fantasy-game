import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SeasonTeam } from '@/types';
import {
  type BallOutcome,
  type Intent,
  resolveBall,
  setupFinalOver,
} from '@/engine';
import { getTrait } from '@/data/playerMeta';
import { Confetti } from './Confetti';
import { cn } from '@/utils';

interface PlayableFinalOverProps {
  userTeam: SeasonTeam;
  oppTeam: SeasonTeam;
  onComplete: (userWon: boolean, runs: number, target: number) => void;
}

const INTENTS: Array<{ key: Intent; label: string; hint: string }> = [
  { key: 'BLOCK', label: 'Block', hint: 'Safe · 0–1' },
  { key: 'PUSH', label: 'Push', hint: 'Rotate · 1–2' },
  { key: 'BIG', label: 'Big Hit', hint: 'Risk · 4/6 or out' },
];

export function PlayableFinalOver({ userTeam, oppTeam, onComplete }: PlayableFinalOverProps) {
  const setup = useMemo(() => setupFinalOver(userTeam, oppTeam), [userTeam, oppTeam]);
  const { target, bowler, batters } = setup;

  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ball, setBall] = useState(0);
  const [batterIndex, setBatterIndex] = useState(0);
  const [deliveries, setDeliveries] = useState<BallOutcome[]>([]);
  const [last, setLast] = useState<BallOutcome | null>(null);
  const [done, setDone] = useState(false);

  const need = Math.max(0, target - runs);
  const ballsLeft = 6 - ball;
  const allOut = batterIndex >= batters.length;
  const striker = batters[Math.min(batterIndex, batters.length - 1)];
  const bowlerTrait = getTrait(bowler.id);
  const strikerTrait = getTrait(striker?.id ?? -1);
  const userWon = runs >= target;

  const play = (intent: Intent) => {
    if (done || allOut) return;
    const outcome = resolveBall(bowler, striker, intent);

    const newRuns = runs + outcome.runs;
    const newWickets = wickets + (outcome.wicket ? 1 : 0);
    const newBall = ball + 1;
    const newBatterIndex = outcome.wicket ? batterIndex + 1 : batterIndex;

    setRuns(newRuns);
    setWickets(newWickets);
    setBall(newBall);
    setBatterIndex(newBatterIndex);
    setDeliveries((d) => [...d, outcome]);
    setLast(outcome);

    const won = newRuns >= target;
    const over = won || newBall >= 6 || newBatterIndex >= batters.length;
    if (over) setDone(true);
  };

  return (
    <div className="panel relative mx-auto max-w-lg overflow-hidden p-5 text-center sm:p-6">
      {done && userWon && <Confetti count={80} />}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,0.18),transparent_65%)]" />
      <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">The Final · You’re Batting</span>

      {/* Equation */}
      <div className="mt-4">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${need}-${ballsLeft}-${done}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="heading-display text-3xl font-700 uppercase sm:text-4xl"
          >
            {done ? (
              <span style={{ color: userWon ? '#34d399' : '#cbd5e1' }}>
                {userWon ? 'Champions!' : 'Fell Short'}
              </span>
            ) : need <= 0 ? (
              <span className="text-emerald-300">Target chased!</span>
            ) : (
              <span>
                Need <span className="text-gold">{need}</span> off{' '}
                <span className="text-gold">{ballsLeft}</span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-1 text-xs text-slate-400">
          Target {target} · {runs} scored · {batters.length - wickets} wkts in hand
        </div>
      </div>

      {/* Bowler vs batter */}
      <div className="mt-5 flex items-stretch justify-center gap-3 text-left">
        <FaceCard label="Bowling" name={bowler.name} rating={bowler.bowlingRating} ratingLabel="BOWL" trait={bowlerTrait?.label} tone="red" />
        <div className="grid place-items-center text-xs font-700 uppercase text-slate-500">vs</div>
        <FaceCard label="On Strike" name={striker?.name ?? '—'} rating={striker?.battingRating ?? 0} ratingLabel="BAT" trait={strikerTrait?.label} tone="gold" />
      </div>

      {/* Ball strip */}
      <div className="mt-5 flex items-center justify-center gap-1.5 sm:gap-2">
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
                'grid aspect-square w-9 shrink-0 place-items-center rounded-full border font-display text-[11px] font-700 uppercase sm:w-11 sm:text-xs',
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

      {/* Commentary */}
      <div className="mt-3 grid h-10 place-items-center">
        <AnimatePresence mode="wait">
          {last && (
            <motion.p
              key={deliveries.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm text-slate-300"
            >
              {last.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {done ? (
        <button
          onClick={() => onComplete(userWon, runs, target)}
          className="btn-primary mx-auto mt-2 px-9"
        >
          {userWon ? 'Lift the Trophy' : 'See Result'}
        </button>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {INTENTS.map((it) => (
            <button
              key={it.key}
              onClick={() => play(it.key)}
              className={cn(
                'flex flex-col items-center rounded-xl border px-2 py-2.5 transition-colors',
                it.key === 'BIG'
                  ? 'border-gold/40 bg-gold/10 hover:bg-gold/20'
                  : 'border-white/15 bg-white/5 hover:bg-white/10',
              )}
            >
              <span className="font-display text-sm font-700 uppercase">{it.label}</span>
              <span className="stat-label mt-0.5">{it.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FaceCard({
  label,
  name,
  rating,
  ratingLabel,
  trait,
  tone,
}: {
  label: string;
  name: string;
  rating: number;
  ratingLabel: string;
  trait?: string;
  tone: 'red' | 'gold';
}) {
  return (
    <div
      className={cn(
        'flex-1 rounded-xl border p-2.5',
        tone === 'red' ? 'border-red-400/25 bg-red-500/[0.07]' : 'border-gold/25 bg-gold/[0.07]',
      )}
    >
      <div className="stat-label">{label}</div>
      <div className="mt-0.5 truncate text-sm font-700">{name}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="font-display text-lg font-700" style={{ color: tone === 'red' ? '#fb7185' : '#f5c542' }}>
          {rating}
        </span>
        <span className="stat-label">{ratingLabel}</span>
      </div>
      {trait && (
        <div className="mt-1 truncate text-[10px] font-600 uppercase tracking-wide text-slate-400" title={trait}>
          ★ {trait}
        </div>
      )}
    </div>
  );
}
