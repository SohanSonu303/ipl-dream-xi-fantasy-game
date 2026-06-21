import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Player } from '@/types';
import {
  type CollectedCard,
  collectionSummary,
  getCoins,
  getCollection,
} from '@/data/profile';
import { PACKS, type PackDef, openPack } from '@/data/packs';
import { RARITY_META } from '@/data/primeEditions';
import { TEAM_META } from '@/data/teams';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { Confetti } from '@/components/Simulation/Confetti';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';
import { cn, initials } from '@/utils';

export function CollectionPage() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState(() => getCoins());
  const [cards, setCards] = useState<CollectedCard[]>(() => getCollection());
  const [reveal, setReveal] = useState<Player[] | null>(null);
  const summary = useMemo(() => collectionSummary(), [cards]);

  const refresh = () => {
    setCoins(getCoins());
    setCards(getCollection());
  };

  const buy = (pack: PackDef) => {
    const pulled = openPack(pack);
    if (!pulled) return;
    setReveal(pulled);
    refresh();
  };

  const bestPull = reveal ? [...reveal].sort((a, b) => rank(b) - rank(a))[0] : null;

  return (
    <PageTransition className="pb-16">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate('/')} className="transition-opacity hover:opacity-80">
          <Brand />
        </button>
        <CoinPill coins={coins} />
      </header>

      <div className="text-center">
        <h1 className="heading-display text-3xl font-700 uppercase sm:text-4xl">Your Collection</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Pull cards from packs, build your binder, and the players you own give you an edge at the auction table.
        </p>
      </div>

      {/* Summary */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Cards Owned" value={summary.total} accent="#f5c542" />
        <SummaryTile label="Unique" value={summary.unique} accent="#5ec0ff" />
        <SummaryTile label="Legendary" value={summary.legendary} accent="#ffb020" />
        <SummaryTile label="Epic" value={summary.byRarity.EPIC ?? 0} accent="#b57bff" />
      </section>

      {/* Pack store */}
      <section className="mt-6">
        <SectionLabel className="mb-3">Open a Pack</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACKS.map((pack) => {
            const afford = coins >= pack.cost;
            return (
              <motion.div
                key={pack.id}
                whileHover={afford ? { y: -4 } : undefined}
                className={cn('panel flex flex-col p-4', !afford && 'opacity-60')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pack.emoji}</span>
                  <div>
                    <div className="font-display text-sm font-700 uppercase">{pack.name}</div>
                    <div className="stat-label">{pack.blurb}</div>
                  </div>
                </div>
                <button
                  onClick={() => buy(pack)}
                  disabled={!afford}
                  className={cn(
                    'mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2 font-display text-sm font-700 uppercase tracking-wide transition-colors',
                    afford ? 'bg-gold text-pitch-950 hover:bg-gold-soft' : 'bg-white/10 text-slate-500',
                  )}
                >
                  🪙 {pack.cost}
                </button>
              </motion.div>
            );
          })}
        </div>
        {coins < PACKS[0].cost && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Low on coins? Play a season or the Daily Challenge to earn more.
          </p>
        )}
      </section>

      {/* Binder */}
      <section className="mt-7">
        <SectionLabel className="mb-3">Binder · {summary.unique} cards</SectionLabel>
        {cards.length === 0 ? (
          <div className="panel grid place-items-center p-10 text-center text-sm text-slate-500">
            Your binder is empty. Open a pack or finish a season to start collecting.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {cards.map((c) => (
              <CollectionTile key={c.key} card={c} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex justify-center">
        <button onClick={() => navigate('/')} className="btn-ghost px-8">
          Back to Home
        </button>
      </div>

      {/* Pack reveal */}
      <AnimatePresence>
        {reveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-pitch-950/80 p-4 backdrop-blur-sm"
            onClick={() => setReveal(null)}
          >
            {bestPull?.rarity === 'LEGENDARY' && <Confetti count={90} />}
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-pitch-900 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 text-center">
                <div className="heading-display text-xl font-700 uppercase text-gold-soft">Pack Opened!</div>
                <div className="stat-label mt-0.5">{reveal.length} new cards added to your binder</div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {reveal.map((p, i) => (
                  <PlayerCard key={`${p.id}-${i}`} player={p} index={i} compact />
                ))}
              </div>
              <button onClick={() => setReveal(null)} className="btn-primary mx-auto mt-4 px-8">
                Nice!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function rank(p: Player): number {
  const order: Record<string, number> = { LEGENDARY: 4, EPIC: 3, RARE: 2, IN_FORM: 1 };
  return p.rarity ? order[p.rarity] ?? 0 : 0;
}

export function CoinPill({ coins }: { coins: number }) {
  return (
    <span className="pill border border-gold/30 bg-gold/10 font-display text-sm font-700 text-gold-soft">
      🪙 {coins.toLocaleString()}
    </span>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="panel p-4 text-center">
      <div className="font-display text-2xl font-700 tabular-nums" style={{ color: accent }}>{value}</div>
      <div className="stat-label mt-1">{label}</div>
    </div>
  );
}

function CollectionTile({ card }: { card: CollectedCard }) {
  const meta = TEAM_META[card.team as keyof typeof TEAM_META] ?? TEAM_META.CSK;
  const rm = card.rarity ? RARITY_META[card.rarity] : null;
  return (
    <div
      className="relative flex flex-col items-center overflow-hidden rounded-xl border bg-gradient-to-b from-pitch-800 to-pitch-900 p-2 text-center"
      style={rm ? { borderColor: rm.color, boxShadow: `0 0 0 1px ${rm.color}, 0 0 10px ${rm.glow}` } : { borderColor: 'rgba(255,255,255,0.1)' }}
    >
      {rm && (
        <span className="absolute right-1 top-1 text-[10px]" style={{ color: rm.color }} title={rm.label}>{rm.emblem}</span>
      )}
      {card.count > 1 && (
        <span className="absolute left-1 top-1 rounded bg-pitch-950/80 px-1 text-[8px] font-700 text-slate-300">×{card.count}</span>
      )}
      <span
        className="mt-2 grid h-10 w-10 place-items-center rounded-full font-display text-sm font-700 ring-1 ring-white/15"
        style={{ background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`, color: meta.ink }}
      >
        {initials(card.name)}
      </span>
      <div className="mt-1 w-full truncate text-[11px] font-600 leading-tight" title={card.name}>{card.name}</div>
      {rm && card.editionTitle && (
        <div className="w-full truncate text-[8px] font-700 uppercase tracking-wide" style={{ color: rm.color }}>{card.editionTitle}</div>
      )}
      <div className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400">
        <span>{card.team}</span>
        <span className="text-slate-600">·</span>
        <span className="font-display font-700" style={{ color: rm ? rm.color : meta.accent }}>{card.overallRating}</span>
      </div>
    </div>
  );
}
