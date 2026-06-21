import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Player, Rarity } from '@/types';
import { ALL_PLAYERS, AUCTION_SIGN_LIMIT } from '@/engine';
import { useGameStore } from '@/store/gameStore';
import { getCollection, applyDevelopment } from '@/data/profile';
import { makeEdition } from '@/data/primeEditions';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';

/**
 * Rebuild a playable Player from a collected card — apply the player's career
 * growth, then stamp the card's rarity edition on top so the boosted ratings
 * carry into the draft.
 */
function cardToPlayer(playerId: number, rarity: Rarity | null): Player | null {
  const base = ALL_PLAYERS.find((p) => p.id === playerId);
  if (!base) return null;
  const grown = applyDevelopment(base);
  return rarity ? makeEdition(grown, rarity) : grown;
}

/**
 * Pre-draft headliners: before the random draft begins, bring up to
 * AUCTION_SIGN_LIMIT players you already own (pulled from packs or signed at the
 * auction) straight into your XI. The rest of the squad is still filled through
 * the random rolls, so the draft stays a draft.
 */
export function PreDraftPage() {
  const navigate = useNavigate();
  const startDraft = useGameStore((s) => s.startDraft);

  // One entry per player (strongest owned card), reconstructed as a Player.
  const owned = useMemo(() => {
    const seen = new Set<number>();
    const out: Player[] = [];
    for (const c of getCollection()) {
      if (seen.has(c.playerId)) continue; // getCollection is strongest-first
      seen.add(c.playerId);
      const p = cardToPlayer(c.playerId, c.rarity);
      if (p) out.push(p);
    }
    return out;
  }, []);

  const [picked, setPicked] = useState<number[]>([]); // player ids, in pick order
  const limitReached = picked.length >= AUCTION_SIGN_LIMIT;

  const toggle = (player: Player) => {
    setPicked((prev) => {
      if (prev.includes(player.id)) return prev.filter((id) => id !== player.id);
      if (prev.length >= AUCTION_SIGN_LIMIT) return prev;
      return [...prev, player.id];
    });
  };

  const begin = () => {
    const seed = picked
      .map((id) => owned.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));
    startDraft('free', seed);
    navigate('/draft');
  };

  return (
    <PageTransition className="pb-28">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate('/')} className="transition-opacity hover:opacity-80">
          <Brand />
        </button>
        <span className="pill border border-white/10 bg-white/5 text-slate-300">
          {picked.length}/{AUCTION_SIGN_LIMIT} headliners
        </span>
      </header>

      <div className="text-center">
        <h1 className="heading-display text-2xl font-700 uppercase sm:text-3xl">Pick Your Headliners</h1>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
          Bring up to <strong className="text-gold-soft">{AUCTION_SIGN_LIMIT}</strong> players you own — pack pulls or
          auction signings — straight into your XI. Everyone else you draft from the random rolls.
        </p>
      </div>

      {owned.length === 0 ? (
        <div className="panel mt-6 grid place-items-center gap-3 p-10 text-center">
          <span className="text-3xl">🃏</span>
          <p className="max-w-sm text-sm text-slate-400">
            You don’t own any cards yet. Open packs in the Collection or win at the auction to build a stable of
            headliners — then bring them straight into a draft.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => navigate('/collection')} className="btn-ghost border-purple-400/40 text-purple-200">
              🃏 Open Packs
            </button>
            <button onClick={begin} className="btn-primary px-8">
              Start Random Draft →
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between">
            <SectionLabel>Your Collection</SectionLabel>
            <span className="text-xs text-slate-500">{owned.length} owned</span>
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
                  disabled={!isPicked && limitReached}
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="stat-label">{picked.length > 0 ? 'Headliners locked' : 'No headliners'}</div>
            <div className="truncate font-display text-sm font-700 uppercase">
              {picked.length > 0 ? `${picked.length} pre-placed · draft the rest` : 'Skip to a fully random draft'}
            </div>
          </div>
          <button onClick={begin} className="btn-primary shrink-0 px-8">
            {picked.length > 0 ? 'Draft the Rest →' : 'Start Draft →'}
          </button>
        </div>
      </motion.div>
    </PageTransition>
  );
}
