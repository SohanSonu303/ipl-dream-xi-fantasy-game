import { motion } from 'framer-motion';
import type { SeasonOutcome, SeasonTeam } from '@/types';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { OUTCOME_META } from '@/data/outcomes';
import { Confetti } from './Confetti';

interface ChampionRevealProps {
  champion: SeasonTeam;
  userOutcome: SeasonOutcome;
  onContinue: () => void;
}

export function ChampionReveal({ champion, userOutcome, onContinue }: ChampionRevealProps) {
  const outcome = OUTCOME_META[userOutcome];
  const userIsChampion = userOutcome === 'CHAMPION';

  return (
    <div className="panel relative mx-auto max-w-lg overflow-hidden p-8 text-center">
      <Confetti count={userIsChampion ? 90 : 50} />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,0.22),transparent_65%)]" />

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        className="mx-auto text-6xl"
      >
        🏆
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-3"
      >
        <div className="stat-label">Season Champions</div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <TeamBadge code={champion.code} size="lg" />
          <h2 className="heading-display text-2xl font-700 uppercase sm:text-3xl">{champion.name}</h2>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 220, damping: 18 }}
        className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border px-6 py-4"
        style={{ borderColor: `${outcome.accent}66`, background: `${outcome.accent}14` }}
      >
        <span className="text-3xl">{outcome.emoji}</span>
        <span className="heading-display mt-1 text-xl font-700 uppercase" style={{ color: outcome.accent }}>
          {outcome.headline}
        </span>
        <span className="mt-1 max-w-xs text-xs text-slate-300">{outcome.blurb}</span>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        onClick={onContinue}
        className="btn-primary mx-auto mt-7 px-9"
      >
        View Full Results
      </motion.button>
    </div>
  );
}
