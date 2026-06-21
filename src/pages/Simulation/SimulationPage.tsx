import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SQUAD_SIZE, XI_SIZE, useBench, useGameStore } from '@/store/gameStore';
import { USER_TEAM_ID, buildFinalChase } from '@/engine';
import { SeasonProgress } from '@/components/Simulation/SeasonProgress';
import { ImpactPlayer } from '@/components/Simulation/ImpactPlayer';
import { LeagueTable } from '@/components/Simulation/LeagueTable';
import { PlayoffBracket } from '@/components/Simulation/PlayoffBracket';
import { FinalChase } from '@/components/Simulation/FinalChase';
import { PlayableFinalOver } from '@/components/Simulation/PlayableFinalOver';
import { ChampionReveal } from '@/components/Simulation/ChampionReveal';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';

type Stage = 'firstHalf' | 'impact' | 'secondHalf' | 'table' | 'playoffs' | 'final' | 'champion';

/** Per-match reveal pace — slow enough to feel like a live run-through. */
const REVEAL_STEP_MS = 700;

export function SimulationPage() {
  const navigate = useNavigate();
  const squad = useGameStore((s) => s.squad);
  const stagedSeason = useGameStore((s) => s.stagedSeason);
  const seasonResult = useGameStore((s) => s.seasonResult);
  const userSecondHalf = useGameStore((s) => s.userSecondHalf);
  const userInFinal = useGameStore((s) => s.userInFinal);
  const finalOpponentId = useGameStore((s) => s.finalOpponentId);
  const beginSeason = useGameStore((s) => s.beginSeason);
  const resolveSeason = useGameStore((s) => s.resolveSeason);
  const applyFinalResult = useGameStore((s) => s.applyFinalResult);
  const bench = useBench();

  const [stage, setStage] = useState<Stage>('firstHalf');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (squad.length < SQUAD_SIZE) {
      navigate('/draft', { replace: true });
      return;
    }
    beginSeason();
  }, [squad.length, beginSeason, navigate]);

  const teamById = useMemo(() => {
    if (seasonResult) return new Map(seasonResult.standings.map((s) => [s.team.id, s.team]));
    if (stagedSeason) {
      return new Map([stagedSeason.userTeam, ...stagedSeason.franchises].map((t) => [t.id, t]));
    }
    return new Map();
  }, [seasonResult, stagedSeason]);

  const xiSlots = useMemo(
    () => squad.filter((s) => s.position < XI_SIZE).sort((a, b) => a.position - b.position),
    [squad],
  );

  // First-half Player-of-the-Match tally for the user's own players — drives
  // the "performed well / in form" badges on the impact screen.
  const firstHalfMom = useMemo(() => {
    const m = new Map<number, number>();
    for (const match of stagedSeason?.userFirstHalf ?? []) {
      if (match.playerOfMatchTeamId === USER_TEAM_ID && match.playerOfMatchId != null) {
        m.set(match.playerOfMatchId, (m.get(match.playerOfMatchId) ?? 0) + 1);
      }
    }
    return m;
  }, [stagedSeason]);

  // Cosmetic final chase (used only when the user is NOT in the final).
  const finalChase = useMemo(() => {
    const finalMatch = seasonResult?.playoffs.find((p) => p.stage === 'FINAL');
    if (!finalMatch?.result || teamById.size === 0) return null;
    return buildFinalChase(finalMatch.result, teamById);
  }, [seasonResult, teamById]);

  // Bailing out mid-flow: make sure a valid result exists before /results.
  const skip = () => {
    const st = useGameStore.getState();
    if (!st.seasonResult) st.resolveSeason([]);
    const after = useGameStore.getState();
    if (after.userInFinal && after.finalOpponentId) {
      const userPow = after.seasonResult?.userStanding.team.strength.teamPower ?? 70;
      const standings = after.seasonResult?.standings ?? [];
      const oppPow = standings.find((s) => s.team.id === after.finalOpponentId)?.team.strength.teamPower ?? 70;
      const userWon = Math.random() < 0.5 + (userPow - oppPow) * 0.02;
      after.applyFinalResult(userWon, userWon ? 12 : 8, 10);
    }
    navigate('/results');
  };

  if (!stagedSeason) {
    return (
      <PageTransition className="grid min-h-dvh place-items-center">
        <div className="text-center text-slate-400">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin-slow rounded-full border-2 border-gold/40 border-t-gold" />
          Preparing the season…
        </div>
      </PageTransition>
    );
  }

  const champion = seasonResult ? teamById.get(seasonResult.championId) : undefined;
  const userTeam = teamById.get(USER_TEAM_ID);
  const finalOpp = finalOpponentId ? teamById.get(finalOpponentId) : undefined;

  return (
    <PageTransition className="pb-16">
      <header className="flex items-center justify-between py-4">
        <Brand />
        <button
          onClick={skip}
          className="text-xs font-600 uppercase tracking-wide text-slate-400 transition-colors hover:text-white"
        >
          Skip →
        </button>
      </header>

      <AnimatePresence mode="wait">
        {stage === 'firstHalf' && (
          <motion.div key="firstHalf" exit={{ opacity: 0, scale: 0.98 }} className="py-6">
            <SeasonProgress
              userMatches={stagedSeason.userFirstHalf}
              teamById={teamById}
              userId={USER_TEAM_ID}
              title="First Half"
              stepMs={REVEAL_STEP_MS}
              onComplete={() => setStage('impact')}
            />
          </motion.div>
        )}

        {stage === 'impact' && (
          <motion.div key="impact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="py-6">
            <ImpactPlayer
              xi={xiSlots}
              bench={bench}
              momByPlayer={firstHalfMom}
              onResolve={(swaps) => {
                resolveSeason(swaps);
                setStage('secondHalf');
              }}
            />
          </motion.div>
        )}

        {stage === 'secondHalf' && (
          <motion.div key="secondHalf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="py-6">
            <SeasonProgress
              userMatches={userSecondHalf}
              teamById={teamById}
              userId={USER_TEAM_ID}
              title="Run to the Playoffs"
              stepMs={REVEAL_STEP_MS}
              onComplete={() => setStage('table')}
            />
          </motion.div>
        )}

        {stage === 'table' && seasonResult && (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="mx-auto max-w-2xl py-2">
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

        {stage === 'playoffs' && seasonResult && (
          <motion.div key="playoffs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="mx-auto max-w-4xl py-2">
            <div className="mb-4 text-center">
              <SectionLabel className="justify-center">Playoff Bracket</SectionLabel>
              <p className="mt-1 text-xs text-slate-400">
                {userInFinal ? "You're in the Final — time to bat!" : 'Four matches stand between you and the trophy'}
              </p>
            </div>
            <PlayoffBracket
              playoffs={seasonResult.playoffs}
              teamById={teamById}
              championId={seasonResult.championId}
              userId={USER_TEAM_ID}
              animate
            />
            <div className="mt-6 text-center">
              <button
                onClick={() => setStage(userInFinal || finalChase ? 'final' : 'champion')}
                className="btn-primary px-8"
              >
                {userInFinal ? 'Bat the Final Over' : finalChase ? 'Play the Final' : 'Crown the Champion'}
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'final' && (
          <motion.div key="final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="py-6">
            {userInFinal && userTeam && finalOpp ? (
              <PlayableFinalOver
                userTeam={userTeam}
                oppTeam={finalOpp}
                onComplete={(won, runs, target) => {
                  applyFinalResult(won, runs, target);
                  setStage('champion');
                }}
              />
            ) : finalChase ? (
              <FinalChase chase={finalChase} userId={USER_TEAM_ID} onComplete={() => setStage('champion')} />
            ) : (
              <div className="grid place-items-center py-10">
                <button onClick={() => setStage('champion')} className="btn-primary px-8">
                  Crown the Champion
                </button>
              </div>
            )}
          </motion.div>
        )}

        {stage === 'champion' && seasonResult && champion && (
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
