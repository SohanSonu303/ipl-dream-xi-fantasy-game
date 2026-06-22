import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@/types';
import { XI_SIZE } from '@/engine';
import { getCollection, applyDevelopment, getCoins } from '@/data/profile';
import { ALL_PLAYERS } from '@/engine';
import { makeEdition } from '@/data/primeEditions';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';
import { CoinPill } from '@/pages/Collection/CollectionPage';
import { encodeTeam, buildChallengeUrl } from '@/utils/shareCode';
import type { Rarity } from '@/types';

function cardToPlayer(playerId: number, rarity: Rarity | null): Player | null {
  const base = ALL_PLAYERS.find((p) => p.id === playerId);
  if (!base) return null;
  const grown = applyDevelopment(base);
  return rarity ? makeEdition(grown, rarity) : grown;
}

export function BuildChallengePage() {
  const navigate = useNavigate();
  const coins = useMemo(() => getCoins(), []);

  const owned = useMemo(() => {
    const seen = new Set<number>();
    const out: Player[] = [];
    for (const c of getCollection()) {
      if (seen.has(c.playerId)) continue;
      seen.add(c.playerId);
      const p = cardToPlayer(c.playerId, c.rarity);
      if (p) out.push(p);
    }
    return out;
  }, []);

  const [teamName, setTeamName] = useState('My Dream XI');
  const [picked, setPicked] = useState<number[]>([]);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const isFull = picked.length >= XI_SIZE;

  const toggle = (player: Player) => {
    setPicked((prev) => {
      if (prev.includes(player.id)) {
        if (captainId === player.id) setCaptainId(null);
        return prev.filter((id) => id !== player.id);
      }
      if (prev.length >= XI_SIZE) return prev;
      return [...prev, player.id];
    });
  };

  const toggleCaptain = (playerId: number) => {
    setCaptainId((prev) => (prev === playerId ? null : playerId));
  };

  const generateLink = async () => {
    // Assign positions 0-10 in pick order
    const slots: Array<[number, number]> = picked.map((id, pos) => [pos, id]);
    const code = encodeTeam({ name: teamName.slice(0, 24) || 'My Dream XI', captainId, slots });
    const url = buildChallengeUrl(code);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Can you beat my Dream XI?',
          text: `${teamName} challenges you to a best-of-3 series!`,
          url,
        });
        setShared(url);
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this challenge link:', url);
    }
    setShared(url);
  };

  const pickedPlayers = picked
    .map((id) => owned.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));

  return (
    <PageTransition className="pb-28">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate('/')} className="transition-opacity hover:opacity-80">
          <Brand />
        </button>
        <div className="flex items-center gap-3">
          <CoinPill coins={coins} />
          <span className="pill border border-white/10 bg-white/5 text-slate-300">
            {picked.length}/{XI_SIZE} picked
          </span>
        </div>
      </header>

      <div className="text-center">
        <h1 className="heading-display text-2xl font-700 uppercase sm:text-3xl">Build Challenge XI</h1>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
          Pick <strong className="text-white">11 players</strong> from your collection, choose a captain, then share the link with a friend.
        </p>
      </div>

      {owned.length === 0 ? (
        <div className="panel mt-6 grid place-items-center gap-3 p-10 text-center">
          <span className="text-3xl">🃏</span>
          <p className="max-w-sm text-sm text-slate-400">
            Your collection is empty — open packs or win at the auction first, then come back to build a challenge XI.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => navigate('/collection')} className="btn-ghost border-purple-400/40 text-purple-200">
              🃏 Open Packs
            </button>
            <button onClick={() => navigate('/')} className="btn-ghost">
              Back to Home
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between">
            <SectionLabel>Your Collection</SectionLabel>
            <span className="text-xs text-slate-500">{owned.length} owned · pick 11</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {owned.map((player, i) => {
              const isPicked = picked.includes(player.id);
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  index={i}
                  onSelect={toggle}
                  selected={isPicked}
                  disabled={!isPicked && isFull}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Sticky action bar */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-pitch-900/90 backdrop-blur-md"
      >
        <div className="mx-auto max-w-6xl px-4 py-3">
          {isFull ? (
            <div className="space-y-2">
              {/* Team name */}
              <div className="flex items-center gap-2">
                <span className="stat-label shrink-0">Team:</span>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={24}
                  className="min-w-0 flex-1 bg-transparent font-display text-sm font-600 uppercase tracking-wide text-gold-soft outline-none placeholder:text-slate-600"
                  placeholder="My Dream XI"
                />
              </div>

              {/* Captain picker */}
              <div>
                <span className="stat-label">Captain (optional):</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {pickedPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => toggleCaptain(p.id)}
                      className={`rounded-lg border px-2 py-0.5 text-xs font-600 transition-colors ${
                        captainId === p.id
                          ? 'border-gold bg-gold/20 text-gold-soft'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {captainId === p.id && '★ '}{p.name}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={generateLink} className="btn-primary w-full justify-center">
                Share Challenge Link ⚔️
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="stat-label">Build your challenge XI</div>
                <div className="truncate font-display text-sm font-700 uppercase">
                  {picked.length > 0 ? `${picked.length}/11 selected` : 'Select 11 players from your collection'}
                </div>
              </div>
              <button onClick={() => navigate('/')} className="btn-ghost shrink-0">
                Cancel
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Shared confirmation */}
      <AnimatePresence>
        {shared && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-pitch-950/85 p-4 backdrop-blur-sm"
            onClick={() => setShared(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="panel w-full max-w-sm p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-3xl">⚔️</div>
              <h2 className="heading-display mt-2 text-xl font-700 uppercase text-gold-soft">Challenge Sent!</h2>
              <p className="mt-2 text-sm text-slate-400">
                Your link has been copied. Share it with a friend — they'll draft their own XI and face yours in a best-of-3 series.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => { setShared(null); navigate('/'); }}
                  className="btn-primary justify-center"
                >
                  Back to Home
                </button>
                <button onClick={() => setShared(null)} className="btn-ghost justify-center text-sm">
                  Build Another
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
