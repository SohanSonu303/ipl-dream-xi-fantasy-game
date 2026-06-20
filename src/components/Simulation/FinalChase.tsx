import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FinalChase as FinalChaseData } from '@/engine';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { cn } from '@/utils';

interface FinalChaseProps {
  chase: FinalChaseData;
  userId: string;
  onComplete: () => void;
}

const BALL_MS = 850;

/**
 * Ball-by-ball reveal of the title-deciding final over with a live, swinging
 * win-probability bar. The outcome is already fixed by the engine — this is pure
 * drama before the trophy lift.
 */
export function FinalChase({ chase, userId, onComplete }: FinalChaseProps) {
  const { chasing, defending, need, deliveries, startWinProb, verdict } = chase;
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= deliveries.length;

  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setRevealed((r) => r + 1), BALL_MS);
    return () => window.clearTimeout(t);
  }, [revealed, done]);

  const shown = deliveries.slice(0, revealed);
  const last = shown[shown.length - 1];
  const needNow = last ? last.needAfter : need;
  const winPct = last ? last.winProb : startWinProb;
  const ballsBowled = revealed;
  const ballsLeft = Math.max(0, 6 - ballsBowled);

  // Frame win% around the user's team when they're in the Final; else the chaser.
  const userIsChasing = chasing.id === userId;
  const userInFinal = userIsChasing || defending.id === userId;
  const displayPct = userInFinal && !userIsChasing ? 100 - winPct : winPct;
  const displayTeam = userInFinal ? (userIsChasing ? chasing : defending) : chasing;

  return (
    <div className="panel relative mx-auto max-w-lg overflow-hidden p-6 text-center sm:p-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,0.16),transparent_65%)]" />
      <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">The Final · Last Over</span>

      {/* Chasing vs defending */}
      <div className="mt-5 flex items-center justify-center gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <TeamBadge code={chasing.code} size="sm" />
          <span className="font-600">{chasing.name}</span>
        </span>
        <span className="text-slate-500">chasing</span>
        <span className="flex items-center gap-1.5">
          <TeamBadge code={defending.code} size="sm" />
          <span className="font-600">{defending.name}</span>
        </span>
      </div>

      {/* Equation */}
      <div className="mt-5">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={needNow + '-' + ballsLeft + '-' + done}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="heading-display text-3xl font-700 uppercase tracking-tight sm:text-4xl"
          >
            {done ? (
              <span className="text-gold-soft">{verdict}</span>
            ) : needNow <= 0 ? (
              <span className="text-emerald-300">Scores level — it's done!</span>
            ) : (
              <span>
                Need <span className="text-gold">{needNow}</span> off{' '}
                <span className="text-gold">{ballsLeft}</span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Win probability bar */}
      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <TeamBadge code={displayTeam.code} size="sm" className="!h-4 !w-4 !text-[7px]" />
            <span className="truncate font-600">{displayTeam.name}</span>
          </span>
          <span className="font-display font-700 tabular-nums text-gold-soft">{displayPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-gold to-gold-deep"
            animate={{ width: `${displayPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="stat-label mt-1 text-left">Live Win Probability</div>
      </div>

      {/* Ball-by-ball strip — shrinks on small screens so 6 balls never overflow */}
      <div className="mt-6 flex items-center justify-center gap-1.5 sm:gap-2">
        {deliveries.map((d, i) => {
          const visible = i < revealed;
          const big = d.runs >= 4 || d.wicket;
          return (
            <motion.div
              key={d.ball}
              initial={false}
              animate={
                visible
                  ? { scale: 1, opacity: 1 }
                  : { scale: 0.8, opacity: 0.25 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className={cn(
                'grid aspect-square w-9 shrink-0 place-items-center rounded-full border font-display text-[11px] font-700 uppercase sm:w-12 sm:text-sm',
                !visible && 'border-white/10 bg-white/5 text-slate-600',
                visible && d.wicket && 'border-red-400/50 bg-red-500/20 text-red-200',
                visible && !d.wicket && big && 'border-gold/50 bg-gold/20 text-gold-soft shadow-glow',
                visible && !d.wicket && !big && 'border-white/15 bg-white/10 text-slate-200',
              )}
            >
              {visible ? d.label : d.ball}
            </motion.div>
          );
        })}
      </div>

      {done && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onComplete}
          className="btn-primary mx-auto mt-7 px-9"
        >
          Crown the Champion
        </motion.button>
      )}
    </div>
  );
}
