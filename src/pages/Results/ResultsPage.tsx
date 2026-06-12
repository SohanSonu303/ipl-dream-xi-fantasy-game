import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { SEASON_LABEL, USER_TEAM_ID } from '@/engine';
import { OUTCOME_META } from '@/data/outcomes';
import { ordinal } from '@/utils';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { LeagueTable } from '@/components/Simulation/LeagueTable';
import { PlayoffBracket } from '@/components/Simulation/PlayoffBracket';
import { ShareButton } from '@/components/Results/ShareButton';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';

export function ResultsPage() {
  const navigate = useNavigate();
  const seasonResult = useGameStore((s) => s.seasonResult);
  const squad = useGameStore((s) => s.squad);
  const teamName = useGameStore((s) => s.teamName);

  useEffect(() => {
    if (!seasonResult) navigate('/', { replace: true });
  }, [seasonResult, navigate]);

  const teamById = useMemo(
    () => new Map((seasonResult?.standings ?? []).map((s) => [s.team.id, s.team])),
    [seasonResult],
  );

  if (!seasonResult) return null;

  const { userStanding, userOutcome } = seasonResult;
  const outcome = OUTCOME_META[userOutcome];
  const strength = userStanding.team.strength;
  const champion = teamById.get(seasonResult.championId)!;
  const sortedSquad = [...squad].sort((a, b) => a.position - b.position);

  const shareText =
    `🏏 ${teamName} — ${outcome.label}\n` +
    `${SEASON_LABEL} Dream XI Draft\n` +
    `Finished ${ordinal(userStanding.position)} · ${userStanding.won}W-${userStanding.lost}L · ${userStanding.points} pts\n` +
    `Team Power ${strength.teamPower} (BAT ${strength.batting} / BOWL ${strength.bowling})\n` +
    `🏆 Champions: ${champion.name}`;

  const shareImage = {
    teamName,
    season: SEASON_LABEL,
    emoji: outcome.emoji,
    headline: outcome.headline,
    accent: outcome.accent,
    position: userStanding.position,
    totalTeams: seasonResult.standings.length,
    won: userStanding.won,
    lost: userStanding.lost,
    points: userStanding.points,
    teamPower: strength.teamPower,
    batting: strength.batting,
    bowling: strength.bowling,
    fantasy: strength.fantasy,
    championName: champion.name,
    players: sortedSquad.map((s) => s.player),
  };

  const fileBaseName = `${teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dream-xi'}-${userOutcome.toLowerCase()}`;

  // Navigate home and let HomePage reset the store on mount — resetting here
  // would null out `seasonResult` while this page is still exiting (AnimatePresence
  // mode="wait"), stranding the transition and never mounting Home.
  const playAgain = () => navigate('/');

  // Re-running the season is owned by the simulation page on mount.
  const reSimulate = () => navigate('/simulate');

  const stats = [
    { label: 'Final Position', value: ordinal(userStanding.position), accent: '#f5c542' },
    { label: 'Record (W-L)', value: `${userStanding.won}-${userStanding.lost}`, accent: '#5ec0ff' },
    { label: 'Points', value: String(userStanding.points), accent: '#a78bfa' },
    { label: 'Net Rating', value: `${userStanding.netRating >= 0 ? '+' : ''}${userStanding.netRating.toFixed(1)}`, accent: '#34d399' },
    { label: 'Team Power', value: String(strength.teamPower), accent: '#f5c542' },
    { label: 'Batting', value: String(strength.batting), accent: '#5ec0ff' },
    { label: 'Bowling', value: String(strength.bowling), accent: '#ff8a5e' },
    { label: 'Fantasy', value: String(strength.fantasy), accent: '#f472b6' },
  ];

  return (
    <PageTransition className="pb-16">
      <header className="flex items-center justify-between py-4">
        <Brand />
        <span className="pill border border-white/10 bg-white/5 text-slate-300">{SEASON_LABEL}</span>
      </header>

      {/* Outcome hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative overflow-hidden p-6 text-center sm:p-8"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{ background: `radial-gradient(circle at 50% -10%, ${outcome.accent}26, transparent 60%)` }}
        />
        <span className="text-5xl sm:text-6xl">{outcome.emoji}</span>
        <h1 className="heading-display mt-2 text-3xl font-700 uppercase sm:text-4xl" style={{ color: outcome.accent }}>
          {outcome.headline}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">{outcome.blurb}</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <span className="pill border border-gold/30 bg-gold/10 text-gold-soft">
            <TeamBadge code="XI" size="sm" className="!h-5 !w-5 !text-[8px]" />
            {teamName}
          </span>
          <span className="pill border border-white/10 bg-white/5 text-slate-200">
            {ordinal(userStanding.position)} of {seasonResult.standings.length}
          </span>
          <span className="pill border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
            {userStanding.won}W · {userStanding.lost}L
          </span>
          <span className="pill border border-white/10 bg-white/5 text-slate-200">
            🏆 {champion.name}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ShareButton image={shareImage} caption={shareText} fileBaseName={fileBaseName} />
          <button onClick={reSimulate} className="btn-ghost px-6">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Re-Simulate
          </button>
          <button onClick={playAgain} className="btn-primary px-6">
            Play Again
          </button>
        </div>
      </motion.section>

      {/* Stat tiles */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="panel p-4 text-center"
          >
            <div className="font-display text-2xl font-700 tabular-nums sm:text-3xl" style={{ color: s.accent }}>
              {s.value}
            </div>
            <div className="stat-label mt-1">{s.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Your XI */}
      <section className="mt-6">
        <SectionLabel className="mb-3">Your Dream XI</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sortedSquad.map((slot, i) => (
            <PlayerCard key={slot.player.id} player={slot.player} index={i} compact />
          ))}
        </div>
      </section>

      {/* League table + playoffs */}
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <SectionLabel className="mb-3">Final League Table</SectionLabel>
          <div className="panel p-3 sm:p-4">
            <LeagueTable standings={seasonResult.standings} highlightUserId={USER_TEAM_ID} />
          </div>
        </div>
        <div>
          <SectionLabel className="mb-3">Playoffs</SectionLabel>
          <div className="panel p-3 sm:p-4">
            <PlayoffBracket
              playoffs={seasonResult.playoffs}
              teamById={teamById}
              championId={seasonResult.championId}
              userId={USER_TEAM_ID}
            />
          </div>
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <button onClick={playAgain} className="btn-primary px-10 py-4 text-lg">
          Start a New Draft
        </button>
      </div>
    </PageTransition>
  );
}
