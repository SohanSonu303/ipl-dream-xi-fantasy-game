import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { VS_OPP_ID, hydrateSharedTeam } from '@/engine';
import { decodeTeam } from '@/utils/shareCode';
import { getTrait } from '@/data/playerMeta';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { StatBar } from '@/components/Shared/StatBar';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';

export function VersusPage() {
  const navigate = useNavigate();
  const { code = '' } = useParams();
  const startVersus = useGameStore((s) => s.startVersus);
  const resetGame = useGameStore((s) => s.resetGame);

  // Land on a clean store so a half-finished previous run doesn't leak in.
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const shared = useMemo(() => decodeTeam(code), [code]);
  const oppTeam = useMemo(
    () => (shared ? hydrateSharedTeam(shared, VS_OPP_ID, false) : null),
    [shared],
  );

  if (!shared || !oppTeam) {
    return (
      <PageTransition className="grid min-h-dvh place-items-center text-center">
        <div>
          <div className="text-5xl">🤷</div>
          <h1 className="heading-display mt-3 text-2xl font-700 uppercase">Invalid Challenge Link</h1>
          <p className="mt-2 text-sm text-slate-400">This challenge code couldn’t be read.</p>
          <button onClick={() => navigate('/')} className="btn-primary mx-auto mt-6 px-8">
            Go Home
          </button>
        </div>
      </PageTransition>
    );
  }

  const strength = oppTeam.strength;
  const players = oppTeam.players ?? [];

  const accept = () => {
    startVersus(shared);
    navigate('/draft');
  };

  return (
    <PageTransition className="pb-16">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate('/')} className="transition-opacity hover:opacity-80">
          <Brand />
        </button>
        <span className="pill border border-red-400/30 bg-red-500/10 text-red-200">⚔️ Friend Battle</span>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative overflow-hidden p-6 text-center sm:p-8"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(230,71,135,0.18),transparent_60%)]" />
        <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">You’ve Been Challenged</span>
        <div className="mt-4 flex items-center justify-center gap-3">
          <TeamBadge code="XI" size="lg" />
          <h1 className="heading-display text-3xl font-700 uppercase sm:text-4xl">{oppTeam.name}</h1>
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
          Draft your own Dream XI, then settle it over a <strong className="text-gold-soft">best-of-three</strong> series.
        </p>

        <div className="mx-auto mt-5 max-w-sm space-y-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className="stat-label">Their Power</span>
            <span className="heading-display text-2xl font-700 text-gold-soft">{strength.teamPower}</span>
          </div>
          <StatBar label="Batting" value={strength.batting} accent="#5ec0ff" />
          <StatBar label="Bowling" value={strength.bowling} accent="#ff8a5e" />
          <StatBar label="Fantasy" value={strength.fantasy} accent="#f5c542" />
        </div>

        <button onClick={accept} className="btn-primary mx-auto mt-6 px-10 py-4 text-lg">
          Accept — Draft Your XI
        </button>
      </motion.section>

      <section className="mt-6">
        <SectionLabel className="mb-3">Their Dream XI</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {players.map((p, i) => (
            <PlayerCard
              key={p.id}
              player={p}
              index={i}
              compact
              captain={p.id === oppTeam.captainId}
              trait={getTrait(p.id)?.label}
            />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
