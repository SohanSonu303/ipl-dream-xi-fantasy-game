import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MatchResult, SeasonTeam } from '@/types';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { cn } from '@/utils';

interface SeasonProgressProps {
  userMatches: MatchResult[];
  teamById: Map<string, SeasonTeam>;
  userId: string;
  onComplete: () => void;
  /** Title shown above the run-through. */
  title?: string;
  /** Delay between revealed matches (ms). Higher = more watchable. */
  stepMs?: number;
}

/** Animated league run-through: reveals the user's results one by one. */
export function SeasonProgress({
  userMatches,
  teamById,
  userId,
  onComplete,
  title = 'Season In Progress',
  stepMs = 150,
}: SeasonProgressProps) {
  const [revealed, setRevealed] = useState(0);
  const total = userMatches.length;

  useEffect(() => {
    if (revealed >= total) {
      const t = window.setTimeout(onComplete, 650);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setRevealed((r) => r + 1), stepMs);
    return () => window.clearTimeout(t);
  }, [revealed, total, onComplete, stepMs]);

  const shown = userMatches.slice(0, revealed);
  const wins = shown.filter((m) => m.winnerId === userId).length;
  const losses = shown.length - wins;
  const latest = shown[shown.length - 1];
  const latestWon = latest?.winnerId === userId;
  const oppId = latest ? (latest.homeId === userId ? latest.awayId : latest.homeId) : null;
  const opp = oppId ? teamById.get(oppId) : null;
  const pct = total === 0 ? 100 : Math.round((revealed / total) * 100);

  return (
    <div className="panel mx-auto max-w-lg p-6 text-center sm:p-8">
      <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">Simulating League</span>
      <h2 className="heading-display mt-4 text-2xl font-700 uppercase sm:text-3xl">{title}</h2>

      {/* Latest result flash */}
      <div className="mt-6 grid h-24 place-items-center">
        <AnimatePresence mode="popLayout">
          {latest && opp ? (
            <motion.div
              key={revealed}
              initial={{ opacity: 0, y: 14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3"
            >
              <span
                className={cn(
                  'rounded-lg px-2.5 py-1 font-display text-sm font-700 uppercase',
                  latestWon ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
                )}
              >
                {latestWon ? 'Won' : 'Lost'}
              </span>
              <span className="text-sm text-slate-400">vs</span>
              <span className="flex items-center gap-2">
                <TeamBadge code={opp.code} size="sm" />
                <span className="font-600">{opp.name}</span>
              </span>
              {latest.playerOfMatchName && (
                <span className="ml-1 hidden items-center gap-1 text-xs text-gold-soft sm:flex">
                  <span>★</span>
                  <span className="max-w-[8rem] truncate">{latest.playerOfMatchName}</span>
                </span>
              )}
            </motion.div>
          ) : (
            <span className="text-sm text-slate-500">Taking the field…</span>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
          <span>
            Match {Math.min(revealed, total)} / {total}
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold-deep"
            animate={{ width: `${pct}%` }}
            transition={{ ease: 'linear', duration: stepMs / 1000 }}
          />
        </div>
      </div>

      {/* Running tally */}
      <div className="mt-5 flex items-center justify-center gap-6">
        <Tally label="Won" value={wins} accent="text-emerald-300" />
        <div className="h-8 w-px bg-white/10" />
        <Tally label="Lost" value={losses} accent="text-red-300" />
      </div>
    </div>
  );
}

function Tally({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="text-center">
      <div className={cn('font-display text-3xl font-700 tabular-nums', accent)}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
