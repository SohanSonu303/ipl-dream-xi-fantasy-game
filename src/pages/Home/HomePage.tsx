import { useEffect, useMemo, useState } from 'react';
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
import { clearAllData, getCoins } from '@/data/profile';
import { MAX_REROLLS, SEASON_LABEL } from '@/engine';
import { ordinal } from '@/utils';

// ── Guide section data ───────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    icon: '🎲',
    title: 'How to Draft',
    color: '#38bdf8',
    borderColor: 'border-sky-400/25',
    bgColor: 'bg-sky-500/[0.07]',
    bullets: [
      'Roll a random IPL franchise to reveal 3 players from that squad.',
      `You get ${MAX_REROLLS} rerolls per draft to swap to a different franchise if you don't like the options.`,
      'Pick 1 player per roll and assign them to a batting-order slot (XI) or bench.',
      'Fill all 13 slots — 11 starters + 2 bench — to complete your squad.',
      'Already own cards? Bring up to 3 as Headliners — they land directly in your XI before rolling starts.',
    ],
  },
  {
    icon: '💰',
    title: 'Coins',
    color: '#f5c542',
    borderColor: 'border-gold/25',
    bgColor: 'bg-gold/[0.06]',
    bullets: [
      'You earn coins after every finished season — more for better results.',
      'Champion: 250 · Runner-up: 140 · Eliminated in Q2: 100 · Eliminator exit: 70 · Group stage: 40.',
      '+8 coins per league win · +75 if you finish Top 4 · +40 bonus for the Daily Challenge.',
      'Spend coins on packs in the Collection: Bronze 250 · Silver 600 · Gold 1,300.',
      'Your coin bank slowly grows your auction budget — every 160 coins above 600 adds 1 cr of purse (up to +50 cr).',
    ],
  },
  {
    icon: '🃏',
    title: 'Collection & Cards',
    color: '#c084fc',
    borderColor: 'border-purple-400/25',
    bgColor: 'bg-purple-500/[0.07]',
    bullets: [
      'Cards land in your Collection when you open packs or win at auction.',
      'Five rarities: Base (no boost) → In-Form → Rare → Epic → Legendary — each tier boosts batting, bowling and overall rating.',
      'Bring any owned card into the draft as a Headliner — the rarity bonus carries into the simulation.',
      'Prospects (young talents) grow their base rating by 2 per season you field them, up to their potential cap.',
      'Duplicate cards of the same rarity don\'t stack — only an upgrade rarity is worth buying again.',
    ],
  },
  {
    icon: '⚖️',
    title: 'Auction Draft',
    color: '#34d399',
    borderColor: 'border-emerald-400/25',
    bgColor: 'bg-emerald-500/[0.07]',
    bullets: [
      'Bid against an AI rival in a live IPL-style player auction before your draft starts.',
      'Sign up to 3 marquee players — they go straight into your XI as pre-placed headliners.',
      'If you own a card of that player in any rarity, you get a 25% discount on the winning bid.',
      'Already own the same rarity? That card won\'t appear — only upgrade versions show as lots.',
      'Auction budget starts at 18 cr. Your coin bank grows it slowly over time. Spend wisely — you only have 6 balls.',
    ],
  },
  {
    icon: '🏆',
    title: 'Seasons & Modes',
    color: '#fb923c',
    borderColor: 'border-orange-400/25',
    bgColor: 'bg-orange-500/[0.07]',
    bullets: [
      'Free Play: unlimited, fully random drafts with fresh results every time.',
      'Auction Draft: sign 3 stars at auction first, then draft the remaining 10 through rolls.',
      'Daily Challenge: every player gets the exact same rolls today — your decisions alone decide the result. One attempt per day.',
      'Versus Mode: draft your XI, share a code with a friend, and battle head-to-head in a best-of-3 series.',
      'Season: 10-team IPL-style league (14 matches) → qualifying playoffs → knockout final.',
    ],
  },
  {
    icon: '⚡',
    title: 'The Final Over',
    color: '#fbbf24',
    borderColor: 'border-yellow-400/25',
    bgColor: 'bg-yellow-500/[0.07]',
    bullets: [
      'Reach the IPL final and you bat the last 6 balls live — your runs decide the title.',
      'The field shows open zones as glowing green arcs (no deep rider = boundary available) and blue dots for covered zones.',
      'Bowler tendency bars show how likely each delivery type is — plan around the bowler\'s strengths.',
      'Cricket Brain (🧠) is available once per over — tap it to reveal the exact delivery before you commit to a shot.',
      'Match your shot zone to an open field gap AND the likely delivery for maximum runs and minimum wicket risk.',
    ],
  },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const startDraft = useGameStore((s) => s.startDraft);
  const resetGame = useGameStore((s) => s.resetGame);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeCode, setChallengeCode] = useState('');
  const { data } = usePlayers();

  useEffect(() => {
    resetGame();
  }, [resetGame]);

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
    if (mode === 'daily' && daily.record) return;
    if (mode === 'auction') { navigate('/auction'); return; }
    if (mode === 'free') { navigate('/pre-draft'); return; }
    startDraft(mode);
    navigate('/draft');
  };

  const acceptChallenge = () => {
    if (!challengeCode.trim()) return;
    // Extract bare code from a full URL like "https://…#/vs/CODE extra text"
    const match = challengeCode.match(/[#/]vs\/([A-Za-z0-9_-]+)/);
    const code = match ? match[1] : challengeCode.trim().split(/\s/)[0];
    setShowChallenge(false);
    setChallengeCode('');
    navigate(`/vs/${code}`);
  };

  return (
    <PageTransition className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between py-5">
        <Brand />
        <div className="flex items-center gap-2">
          <CoinPill coins={coins} />
          <span className="hidden pill border border-white/10 bg-white/5 text-slate-300 sm:inline-flex">{SEASON_LABEL}</span>
        </div>
      </header>

      {/* Hero */}
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
            {data?.players.length ?? 100} players · {TEAM_CODES.length} franchises · {MAX_REROLLS} rerolls
          </span>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
            <button onClick={() => begin('auction')} className="btn-ghost border-sky-400/40 text-sky-200">
              ⚖️ Auction Draft
            </button>
            <button onClick={() => navigate('/collection')} className="btn-ghost border-purple-400/40 text-purple-200">
              🃏 Collection
            </button>
            <button onClick={() => setShowChallenge(true)} className="btn-ghost border-red-400/40 text-red-200">
              ⚔️ Challenge
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

      {/* ── How to Play ── */}
      <section className="py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-6 text-center"
        >
          <span className="pill border border-white/10 bg-white/5 text-slate-300">How to Play</span>
          <h2 className="heading-display mt-3 text-2xl font-700 uppercase sm:text-3xl">Game Guide</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Everything you need to know — draft mechanics, coins, collection and the live final over.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE_SECTIONS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.07 }}
              className={`rounded-2xl border p-4 sm:p-5 ${s.borderColor} ${s.bgColor}`}
            >
              {/* Icon + title */}
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg">
                  {s.icon}
                </span>
                <h3
                  className="font-display text-base font-700 uppercase tracking-wide"
                  style={{ color: s.color }}
                >
                  {s.title}
                </h3>
              </div>

              {/* Bullets */}
              <ul className="space-y-2">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color, opacity: 0.7 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Reset Data ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="border-t border-white/8 py-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-slate-500">Want a clean slate? This will erase all your progress.</p>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="btn-ghost border-red-400/40 text-red-300 hover:bg-red-500/10 active:scale-95"
          >
            🗑️ Erase All Data
          </button>
        </div>
      </motion.section>

      {/* ── Challenge a Friend Modal ── */}
      {showChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-pitch-950/90 p-4 backdrop-blur-sm"
          onClick={() => setShowChallenge(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="panel w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="heading-display text-center text-xl font-700 uppercase">⚔️ Challenge a Friend</h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Paste a friend's challenge link or code, or build your own XI to share.
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="stat-label mb-1 block">Friend's Challenge Code or Link</label>
                <input
                  value={challengeCode}
                  onChange={(e) => setChallengeCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && acceptChallenge()}
                  placeholder="Paste code or URL here…"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-red-400/50"
                  autoFocus
                />
              </div>
              <button
                onClick={acceptChallenge}
                disabled={!challengeCode.trim()}
                className="btn-primary w-full justify-center disabled:opacity-40"
              >
                Accept Challenge →
              </button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-600">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                onClick={() => { setShowChallenge(false); navigate('/build-challenge'); }}
                className="btn-ghost w-full justify-center border-red-400/30 text-red-200"
              >
                Build My Challenge XI →
              </button>
            </div>

            <button
              onClick={() => setShowChallenge(false)}
              className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* ── Reset Confirmation Modal ── */}
      {showResetConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-pitch-950/90 p-4 backdrop-blur-sm"
          onClick={() => setShowResetConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="panel w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">⚠️</div>
            <h2 className="heading-display mt-3 text-xl font-700 uppercase">Erase Everything?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              This permanently deletes your coins, card collection, daily history and win streaks.
              There is no undo.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn-ghost flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setShowResetConfirm(false);
                  window.location.reload();
                }}
                className="flex-1 rounded-xl border border-red-400/40 bg-red-500/20 py-2.5 font-display text-sm font-700 uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/30"
              >
                Erase All
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
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
          Play Today's Challenge
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
