import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { SEASON_LABEL, USER_TEAM_ID } from '@/engine';
import { OUTCOME_META } from '@/data/outcomes';
import { currentStreak, dailyNumber } from '@/data/daily';
import { getTrait } from '@/data/playerMeta';
import { type DevGain, addCoins, collectCards, developFromSquad, recordGamePlayed, seasonReward } from '@/data/profile';
import { ordinal } from '@/utils';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { LeagueTable } from '@/components/Simulation/LeagueTable';
import { PlayoffBracket } from '@/components/Simulation/PlayoffBracket';
import { ShareButton } from '@/components/Results/ShareButton';
import { ChallengeButton } from '@/components/Results/ChallengeButton';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';

export function ResultsPage() {
  const navigate = useNavigate();
  const seasonResult = useGameStore((s) => s.seasonResult);
  const squad = useGameStore((s) => s.squad);
  const teamName = useGameStore((s) => s.teamName);
  const captainId = useGameStore((s) => s.captainId);
  const mode = useGameStore((s) => s.mode);
  const rewarded = useGameStore((s) => s.rewarded);
  const markRewarded = useGameStore((s) => s.markRewarded);
  const [reward, setReward] = useState<number | null>(null);
  const [grown, setGrown] = useState<DevGain[]>([]);

  useEffect(() => {
    if (!seasonResult) navigate('/', { replace: true });
  }, [seasonResult, navigate]);

  // Grant the season reward once: coins for the result + the XI joins your
  // permanent Collection. Daily is excluded from re-rewards by the same guard.
  useEffect(() => {
    if (!seasonResult || rewarded) return;
    const st = seasonResult.userStanding;
    const won = seasonResult.userOutcome === 'CHAMPION';
    const breakdown = seasonReward(seasonResult.userOutcome, st.won, st.position, mode === 'daily');
    addCoins(breakdown.total);
    collectCards(squad.map((s) => s.player));
    // Prospects who played this season grow toward their potential.
    const gains = developFromSquad(squad.filter((s) => s.position < 11).map((s) => s.player.id));
    recordGamePlayed(won);
    markRewarded();
    setReward(breakdown.total);
    setGrown(gains);
  }, [seasonResult, rewarded, mode, squad, markRewarded]);

  const teamById = useMemo(
    () => new Map((seasonResult?.standings ?? []).map((s) => [s.team.id, s.team])),
    [seasonResult],
  );

  // Player of the Season: the user's player with the most Player-of-the-Match
  // awards across the whole campaign (league + playoffs).
  const playerOfSeason = useMemo(() => {
    if (!seasonResult) return null;
    const all = [
      ...seasonResult.leagueMatches,
      ...seasonResult.playoffs.map((p) => p.result).filter(Boolean),
    ];
    const counts = new Map<number, number>();
    for (const m of all) {
      if (m && m.playerOfMatchTeamId === USER_TEAM_ID && m.playerOfMatchId != null) {
        counts.set(m.playerOfMatchId, (counts.get(m.playerOfMatchId) ?? 0) + 1);
      }
    }
    let bestId = -1;
    let bestCount = 0;
    for (const [id, c] of counts) {
      if (c > bestCount) {
        bestCount = c;
        bestId = id;
      }
    }
    if (bestId < 0) return null;
    const player = squad.find((s) => s.player.id === bestId)?.player;
    return player ? { player, awards: bestCount } : null;
  }, [seasonResult, squad]);

  if (!seasonResult) return null;

  const { userStanding, userOutcome } = seasonResult;
  const outcome = OUTCOME_META[userOutcome];
  const strength = userStanding.team.strength;
  const champion = teamById.get(seasonResult.championId)!;
  const sortedSquad = [...squad].sort((a, b) => a.position - b.position);
  const isDaily = mode === 'daily';
  const captainName = squad.find((s) => s.player.id === captainId)?.player.name ?? null;

  const shareText =
    `🏏 ${teamName} — ${outcome.label}\n` +
    `${isDaily ? `Daily Challenge #${dailyNumber()}` : `${SEASON_LABEL} Dream XI Draft`}\n` +
    `Finished ${ordinal(userStanding.position)} · ${userStanding.won}W-${userStanding.lost}L · ${userStanding.points} pts\n` +
    `Team Power ${strength.teamPower} (BAT ${strength.batting} / BOWL ${strength.bowling})\n` +
    (captainName ? `(C) ${captainName}\n` : '') +
    (playerOfSeason ? `⭐ Player of the Season: ${playerOfSeason.player.name} (${playerOfSeason.awards} MOTM)\n` : '') +
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
        {isDaily ? (
          <span className="pill border border-gold/30 bg-gold/10 text-gold-soft">
            🗓️ Daily #{dailyNumber()}
            {currentStreak() > 0 && <span className="ml-1 text-orange-300">· 🔥 {currentStreak()}</span>}
          </span>
        ) : (
          <span className="pill border border-white/10 bg-white/5 text-slate-300">{SEASON_LABEL}</span>
        )}
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

        {reward != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-sm"
          >
            <span className="font-display font-700 text-gold-soft">🪙 +{reward} coins</span>
            {userStanding.position <= 4 && <span className="text-emerald-300">+ Top-4 bonus 🎉</span>}
            <span className="text-slate-400">· XI added to your Collection · bigger auction purse next time</span>
          </motion.div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ShareButton image={shareImage} caption={shareText} fileBaseName={fileBaseName} />
          <ChallengeButton squad={squad} captainId={captainId} teamName={teamName} />
          {/* Daily is a single, deterministic run — re-simulating would change nothing. */}
          {!isDaily && (
            <button onClick={reSimulate} className="btn-ghost px-6">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Re-Simulate
            </button>
          )}
          <button onClick={playAgain} className="btn-primary px-6">
            {isDaily ? 'Back to Home' : 'Play Again'}
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

      {/* Player of the Season */}
      {playerOfSeason && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/[0.08] to-transparent p-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="stat-label">Player of the Season</div>
              <div className="font-display text-lg font-700 uppercase text-gold-soft">
                {playerOfSeason.player.name}
                {playerOfSeason.player.id === captainId && <span className="ml-1.5 text-sm text-gold">(C)</span>}
              </div>
            </div>
          </div>
          <span className="pill shrink-0 border border-gold/30 bg-gold/10 text-gold-soft">
            {playerOfSeason.awards} × MOTM
          </span>
        </motion.section>
      )}

      {/* Academy — prospects who grew */}
      {grown.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/[0.08] to-transparent p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xl">🌱</span>
            <SectionLabel>Academy · {grown.length} prospect{grown.length === 1 ? '' : 's'} developed</SectionLabel>
          </div>
          <div className="flex flex-wrap gap-2">
            {grown.map((g) => {
              const name = squad.find((s) => s.player.id === g.playerId)?.player.name ?? 'Player';
              const maxed = g.total >= g.potential;
              return (
                <span key={g.playerId} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs">
                  <span className="font-600 text-emerald-100">{name}</span>
                  <span className="font-display font-700 text-emerald-300">+{g.gain} OVR</span>
                  <span className="text-emerald-400/70">{maxed ? '· peaked' : `· ${g.total}/${g.potential}`}</span>
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Keep fielding your young guns — they get stronger every season you play them.</p>
        </motion.section>
      )}

      {/* Your XI */}
      <section className="mt-6">
        <SectionLabel className="mb-3">Your Dream XI</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sortedSquad.map((slot, i) => (
            <PlayerCard
              key={slot.player.id}
              player={slot.player}
              index={i}
              compact
              captain={slot.player.id === captainId}
              trait={getTrait(slot.player.id)?.label}
            />
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
