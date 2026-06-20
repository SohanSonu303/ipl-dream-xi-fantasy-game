import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { VS_USER_ID } from '@/engine';
import { Confetti } from '@/components/Simulation/Confetti';
import { ChallengeButton } from '@/components/Results/ChallengeButton';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';
import { cn } from '@/utils';

export function VersusResultPage() {
  const navigate = useNavigate();
  const versusResult = useGameStore((s) => s.versusResult);
  const squad = useGameStore((s) => s.squad);
  const captainId = useGameStore((s) => s.captainId);
  const teamName = useGameStore((s) => s.teamName);

  useEffect(() => {
    if (!versusResult) navigate('/', { replace: true });
  }, [versusResult, navigate]);

  if (!versusResult) return null;

  const { user, opponent, matches, userWins, oppWins, userWonSeries } = versusResult;

  return (
    <PageTransition className="pb-16">
      <header className="flex items-center justify-between py-4">
        <Brand />
        <span className="pill border border-red-400/30 bg-red-500/10 text-red-200">⚔️ Friend Battle</span>
      </header>

      {/* Series verdict */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative overflow-hidden p-6 text-center sm:p-8"
      >
        {userWonSeries && <Confetti count={70} />}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: userWonSeries
              ? 'radial-gradient(circle at 50% -10%, rgba(52,211,153,0.22), transparent 60%)'
              : 'radial-gradient(circle at 50% -10%, rgba(148,163,184,0.18), transparent 60%)',
          }}
        />
        <span className="text-5xl sm:text-6xl">{userWonSeries ? '🏆' : '🫡'}</span>
        <h1
          className="heading-display mt-2 text-3xl font-700 uppercase sm:text-4xl"
          style={{ color: userWonSeries ? '#34d399' : '#cbd5e1' }}
        >
          {userWonSeries ? 'Series Won!' : 'Series Lost'}
        </h1>

        {/* Scoreline */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <SideScore name={user.name} code="XI" score={userWins} win={userWonSeries} />
          <span className="heading-display text-xl text-slate-500">vs</span>
          <SideScore name={opponent.name} code="XI" score={oppWins} win={!userWonSeries} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ChallengeButton squad={squad} captainId={captainId} teamName={teamName} />
          <button onClick={() => navigate('/')} className="btn-primary px-8">
            New Draft
          </button>
        </div>
      </motion.section>

      {/* Match-by-match */}
      <section className="mt-6">
        <SectionLabel className="mb-3">Series Breakdown</SectionLabel>
        <div className="space-y-2.5">
          {matches.map((m, i) => {
            const userWon = m.winnerId === VS_USER_ID;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="panel flex items-center justify-between gap-3 p-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="stat-label w-12 shrink-0">Game {i + 1}</span>
                  <span
                    className={cn(
                      'rounded-lg px-2.5 py-1 font-display text-xs font-700 uppercase',
                      userWon ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
                    )}
                  >
                    {userWon ? 'Won' : 'Lost'}
                  </span>
                  <span className="text-sm text-slate-400">by {Math.round(m.margin)}</span>
                </div>
                {m.playerOfMatchName && (
                  <span className="flex items-center gap-1 text-xs text-gold-soft">
                    <span>★</span>
                    <span className="max-w-[9rem] truncate">{m.playerOfMatchName}</span>
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>
    </PageTransition>
  );
}

function SideScore({
  name,
  code,
  score,
  win,
}: {
  name: string;
  code: 'XI';
  score: number;
  win: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <TeamBadge code={code} size="md" className={win ? 'ring-2 ring-emerald-400/60' : undefined} />
      <span className="max-w-[7rem] truncate text-xs font-600 text-slate-300">{name}</span>
      <span className="heading-display text-4xl font-700 tabular-nums" style={{ color: win ? '#34d399' : '#94a3b8' }}>
        {score}
      </span>
    </div>
  );
}
