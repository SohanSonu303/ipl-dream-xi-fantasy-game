import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { usePlayers } from '@/data/usePlayers';
import { TEAM_CODES } from '@/data/teams';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { PageTransition, Brand } from '@/components/Shared/ui';
import { MAX_REROLLS, SEASON_LABEL } from '@/engine';

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

  const begin = () => {
    startDraft();
    navigate('/draft');
  };

  return (
    <PageTransition className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between py-5">
        <Brand />
        <span className="pill border border-white/10 bg-white/5 text-slate-300">{SEASON_LABEL}</span>
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
          <button onClick={begin} className="btn-primary group px-10 py-4 text-lg">
            Start Draft
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-xs text-slate-500">
            {data?.players.length ?? 100} players · {TEAM_CODES.length} franchises ·{' '}
            {MAX_REROLLS} reroll{MAX_REROLLS === 1 ? '' : 's'}
          </span>
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
