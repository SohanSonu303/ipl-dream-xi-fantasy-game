import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { GameMode } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { usePlayers } from '@/data/usePlayers';
import { TEAM_CODES } from '@/data/teams';
import { OUTCOME_META } from '@/data/outcomes';
import {
  currentStreak,
  dailyNumber,
  getDailyRecord,
  type DailyRecord,
} from '@/data/daily';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { PageTransition, Brand } from '@/components/Shared/ui';
import { CoinPill } from '@/pages/Collection/CollectionPage';
import { getCoins } from '@/data/profile';
import { MAX_REROLLS, SEASON_LABEL } from '@/engine';
import { ordinal } from '@/utils';

const FEATURES = [
  { title: 'Roll & Draft', desc: 'Spin a random franchise, pick a star, fill your XI.' },
  { title: 'Build Strength', desc: 'Balance batting, bowling and fantasy power.' },
  { title: 'Simulate', desc: 'Play a full league, fight through the playoffs.' },
  { title: 'Lift the Trophy', desc: 'Chase the title and share your run.' },
];

export function HomePage() {
  const navigate = useNavigate();
  const startDraft = useGameStore((s) => s.startDraft);
  const resetGame = useGameStore((s) => s.resetGame);
  const { data } = usePlayers();

  // Returning to the home screen always restores the original, empty state.
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Daily Challenge status (recomputed after resetGame so it reflects storage).
  const daily = useMemo(
    () => ({
      number: dailyNumber(),
      record: getDailyRecord(),
      streak: currentStreak(),
    }),
    [],
  );

  const coins = useMemo(() => getCoins(), []);

  const begin = (mode: GameMode = 'free') => {
    if (mode === 'daily' && daily.record) return; // one play per day
    if (mode === 'auction') {
      navigate('/auction');
      return;
    }
    // Free play stops off at the headliner picker first (bring owned cards into
    // the XI); the Daily Challenge goes straight to its fixed, seeded draft.
    if (mode === 'free') {
      navigate('/pre-draft');
      return;
    }
    startDraft(mode);
    navigate('/draft');
  };

  return (
    <PageTransition className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between py-5">
        <Brand />
        <div className="flex items-center gap-2">
          <CoinPill coins={coins} />
          <span className="hidden pill border border-white/10 bg-white/5 text-slate-300 sm:inline-flex">{SEASON_LABEL}</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="pill mb-5 border border-gold/30 bg-gold/10 text-gold-soft"
        >
          ● Live Draft Simulator
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="heading-display text-5xl font-700 uppercase leading-[0.9] tracking-tight sm:text-7xl md:text-8xl"
        >
          <span className="block text-stroke text-slate-100">Build Your</span>
          <span className="block bg-gradient-to-b from-gold-soft via-gold to-gold-deep bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(245,197,66,0.35)]">
            IPL Dream XI
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-5 max-w-xl text-balance text-sm text-slate-300 sm:text-base"
        >
          Draft eleven superstars through randomized team rolls, engineer the strongest squad,
          then simulate an entire {SEASON_LABEL} season — league, playoffs and a shot at the trophy.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <button onClick={() => begin('free')} className="btn-primary group px-10 py-4 text-lg">
            Start Draft
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs text-slate-500">
            {data?.players.length ?? 100} players · {TEAM_CODES.length} franchises ·{' '}
            {MAX_REROLLS} reroll{MAX_REROLLS === 1 ? '' : 's'}
          </span>

          {/* Secondary modes */}
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
            <button onClick={() => begin('auction')} className="btn-ghost border-sky-400/40 text-sky-200">
              ⚖️ Auction Draft
            </button>
            <button onClick={() => navigate('/collection')} className="btn-ghost border-purple-400/40 text-purple-200">
              🃏 Collection
            </button>
          </div>

          <DailyCard
            number={daily.number}
            streak={daily.streak}
            record={daily.record}
            onPlay={() => begin('daily')}
          />
        </motion.div>

        {/* Team marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-2.5"
        >
          {TEAM_CODES.map((code, i) => (
            <motion.div
              key={code}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 240, damping: 18 }}
            >
              <TeamBadge code={code} size="md" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Feature strip */}
      <div className="grid grid-cols-2 gap-3 py-8 md:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.08 }}
            className="panel p-4"
          >
            <div className="heading-display text-2xl font-700 text-gold/80">{String(i + 1).padStart(2, '0')}</div>
            <div className="mt-1 font-display text-sm font-600 uppercase tracking-wide">{f.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
}

function DailyCard({
  number,
  streak,
  record,
  onPlay,
}: {
  number: number;
  streak: number;
  record: DailyRecord | null;
  onPlay: () => void;
}) {
  const played = record != null;
  const outcome = record ? OUTCOME_META[record.outcome] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="mt-4 w-full max-w-sm rounded-2xl border border-gold/20 bg-gradient-to-b from-gold/[0.06] to-transparent p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🗓️</span>
          <span className="font-display text-sm font-700 uppercase tracking-wide text-gold-soft">
            Daily Challenge
          </span>
        </div>
        <span className="pill border border-white/10 bg-white/5 text-[10px] text-slate-300">
          #{number}
        </span>
      </div>

      <p className="mt-1.5 text-left text-xs leading-relaxed text-slate-400">
        Same rolls for everyone today — your picks alone decide the result. One shot, no re-sims.
      </p>

      {played && outcome ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span>{outcome.emoji}</span>
              <span className="truncate font-display text-sm font-700 uppercase" style={{ color: outcome.accent }}>
                {outcome.label}
              </span>
            </div>
            <div className="stat-label mt-0.5">
              {ordinal(record!.position)} · {record!.won}W-{record!.lost}L · come back tomorrow
            </div>
          </div>
          <span className="shrink-0 text-emerald-300" title="Played today">✓</span>
        </div>
      ) : (
        <button onClick={onPlay} className="btn-ghost mt-3 w-full justify-center border-gold/40 text-gold-soft">
          Play Today’s Challenge
        </button>
      )}

      {streak > 0 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-orange-300">
          🔥 <span className="font-700 tabular-nums">{streak}</span> day streak
        </div>
      )}
    </motion.div>
  );
}
