import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SQUAD_SIZE, useGameStore } from '@/store/gameStore';
import { USER_TEAM_ID } from '@/engine';
import { SeasonProgress } from '@/components/Simulation/SeasonProgress';
import { LeagueTable } from '@/components/Simulation/LeagueTable';
import { PlayoffBracket } from '@/components/Simulation/PlayoffBracket';
import { ChampionReveal } from '@/components/Simulation/ChampionReveal';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';

type Stage = 'sim' | 'table' | 'playoffs' | 'champion';

export function SimulationPage() {
  const navigate = useNavigate();
  const squad = useGameStore((s) => s.squad);
  const seasonResult = useGameStore((s) => s.seasonResult);
  const runSimulation = useGameStore((s) => s.runSimulation);

  const [stage, setStage] = useState<Stage>('sim');
  const started = useRef(false);

  // Kick off a fresh season exactly once on entry (guard against direct nav).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (squad.length < SQUAD_SIZE) {
      navigate('/draft', { replace: true });
      return;
    }
    runSimulation();
  }, [squad.length, runSimulation, navigate]);

  const teamById = useMemo(
    () => new Map((seasonResult?.standings ?? []).map((s) => [s.team.id, s.team])),
    [seasonResult],
  );

  const userMatches = useMemo(
    () =>
      (seasonResult?.leagueMatches ?? []).filter(
        (m) => m.homeId === USER_TEAM_ID || m.awayId === USER_TEAM_ID,
      ),
    [seasonResult],
  );

  if (!seasonResult) {
    return (
      <PageTransition className="grid min-h-dvh place-items-center">
        <div className="text-center text-slate-400">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin-slow rounded-full border-2 border-gold/40 border-t-gold" />
          Preparing the season…
        </div>
      </PageTransition>
    );
  }

  const champion = teamById.get(seasonResult.championId)!;

  return (
    <PageTransition className="pb-16">
      <header className="flex items-center justify-between py-4">
        <Brand />
        <button
          onClick={() => navigate('/results')}
          className="text-xs font-600 uppercase tracking-wide text-slate-400 transition-colors hover:text-white"
        >
          Skip →
        </button>
      </header>

      <AnimatePresence mode="wait">
        {stage === 'sim' && (
          <motion.div key="sim" exit={{ opacity: 0, scale: 0.98 }} className="py-6">
            <SeasonProgress
              userMatches={userMatches}
              teamById={teamById}
              userId={USER_TEAM_ID}
              onComplete={() => setStage('table')}
            />
          </motion.div>
        )}

        {stage === 'table' && (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="mx-auto max-w-2xl py-2"
          >
            <div className="mb-3 text-center">
              <SectionLabel className="justify-center">Final League Table</SectionLabel>
              <p className="mt-1 text-xs text-slate-400">Top 4 advance to the playoffs</p>
            </div>
            <div className="panel p-3 sm:p-4">
              <LeagueTable standings={seasonResult.standings} highlightUserId={USER_TEAM_ID} animate />
            </div>
            <div className="mt-5 text-center">
              <button onClick={() => setStage('playoffs')} className="btn-primary px-8">
                Continue to Playoffs
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'playoffs' && (
          <motion.div
            key="playoffs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="mx-auto max-w-4xl py-2"
          >
            <div className="mb-4 text-center">
              <SectionLabel className="justify-center">Playoff Bracket</SectionLabel>
              <p className="mt-1 text-xs text-slate-400">Four matches stand between you and the trophy</p>
            </div>
            <PlayoffBracket
              playoffs={seasonResult.playoffs}
              teamById={teamById}
              championId={seasonResult.championId}
              userId={USER_TEAM_ID}
              animate
            />
            <div className="mt-6 text-center">
              <button onClick={() => setStage('champion')} className="btn-primary px-8">
                Crown the Champion
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'champion' && (
          <motion.div key="champion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
            <ChampionReveal
              champion={champion}
              userOutcome={seasonResult.userOutcome}
              onContinue={() => navigate('/results')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
