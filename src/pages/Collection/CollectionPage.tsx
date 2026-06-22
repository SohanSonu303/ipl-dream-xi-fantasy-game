import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Player } from '@/types';
import {
  type CollectedCard,
  collectionSummary,
  getCoins,
  getCollection,
  sellCard,
  isPeaked,
  getBenchSize,
  MAX_BENCH,
  BENCH_UPGRADE_COST,
  SELL_PRICE,
  PEAKED_SELL_BONUS,
} from '@/data/profile';
import { PACKS, type PackDef, openPack } from '@/data/packs';
import { RARITY_META } from '@/data/primeEditions';
import { TEAM_META } from '@/data/teams';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { Confetti } from '@/components/Simulation/Confetti';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';
import { useGameStore } from '@/store/gameStore';
import { cn, initials } from '@/utils';

interface SellTarget {
  card: CollectedCard;
  price: number;
  peaked: boolean;
}

export function CollectionPage() {
  const navigate = useNavigate();
  const purchaseBenchUpgrade = useGameStore((s) => s.purchaseBenchUpgrade);
  const [coins, setCoins] = useState(() => getCoins());
  const [cards, setCards] = useState<CollectedCard[]>(() => getCollection());
  const [reveal, setReveal] = useState<Player[] | null>(null);
  const [sellTarget, setSellTarget] = useState<SellTarget | null>(null);
  const [soldToast, setSoldToast] = useState<string | null>(null);
  const [benchSize, setBenchSize] = useState(() => getBenchSize());
  const summary = useMemo(() => collectionSummary(), [cards]);

  const refresh = () => {
    setCoins(getCoins());
    setCards(getCollection());
    setBenchSize(getBenchSize());
  };

  const buy = (pack: PackDef) => {
    const pulled = openPack(pack);
    if (!pulled) return;
    setReveal(pulled);
    refresh();
  };

  const openSellConfirm = (card: CollectedCard) => {
    const peaked = isPeaked(card.playerId);
    const price = peaked ? PEAKED_SELL_BONUS : SELL_PRICE[card.rarity ?? 'BASE'] ?? 30;
    setSellTarget({ card, price, peaked });
  };

  const confirmSell = () => {
    if (!sellTarget) return;
    const earned = sellCard(sellTarget.card.key);
    if (earned !== null) {
      setSoldToast(`+${earned} coins`);
      setTimeout(() => setSoldToast(null), 2200);
    }
    setSellTarget(null);
    refresh();
  };

  const buyBenchUpgrade = () => {
    const ok = purchaseBenchUpgrade();
    if (ok) refresh();
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
          Pull cards from packs, sell duplicates for coins, and the players you own give you an edge at the auction table.
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

      {/* Bench upgrade */}
      <section className="mt-6">
        <SectionLabel className="mb-3">Upgrades</SectionLabel>
        <div className="panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-xl">
                🪑
              </span>
              <div>
                <div className="font-display text-sm font-700 uppercase text-sky-200">Bench Expansion</div>
                <div className="stat-label mt-0.5">
                  {benchSize >= MAX_BENCH
                    ? `Fully expanded — ${MAX_BENCH} bench slots`
                    : `Current: ${benchSize} bench slots → ${benchSize + 1} after upgrade`}
                </div>
              </div>
            </div>
            {benchSize >= MAX_BENCH ? (
              <span className="pill shrink-0 border border-gold/30 bg-gold/10 text-gold-soft">MAX</span>
            ) : (
              <button
                onClick={buyBenchUpgrade}
                disabled={coins < BENCH_UPGRADE_COST}
                className={cn(
                  'shrink-0 rounded-xl px-4 py-2 font-display text-sm font-700 uppercase tracking-wide transition-colors',
                  coins >= BENCH_UPGRADE_COST
                    ? 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30 border border-sky-400/30'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed',
                )}
                title={coins < BENCH_UPGRADE_COST ? `Need ${BENCH_UPGRADE_COST} coins` : undefined}
              >
                🪙 {BENCH_UPGRADE_COST.toLocaleString()}
              </button>
            )}
          </div>
          {benchSize < MAX_BENCH && (
            <p className="mt-2 text-xs text-slate-500">
              Extra bench slots let you draft more players and make deeper Impact Player swaps mid-season.
              {benchSize > MIN_BENCH && ` (${MAX_BENCH - benchSize} upgrade${MAX_BENCH - benchSize > 1 ? 's' : ''} remaining)`}
            </p>
          )}
        </div>
      </section>

      {/* Binder */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Binder · {summary.unique} cards</SectionLabel>
          {cards.length > 0 && (
            <span className="text-xs text-slate-500">Tap card to sell</span>
          )}
        </div>
        {cards.length === 0 ? (
          <div className="panel grid place-items-center p-10 text-center text-sm text-slate-500">
            Your binder is empty. Open a pack or finish a season to start collecting.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {cards.map((c) => (
                <CollectionTile key={c.key} card={c} onSell={() => openSellConfirm(c)} />
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-600">
              Peaked prospects sell for a premium · Duplicates show ×N badge
            </p>
          </>
        )}
      </section>

      <div className="mt-8 flex justify-center">
        <button onClick={() => navigate('/')} className="btn-ghost px-8">
          Back to Home
        </button>
      </div>

      {/* Pack reveal modal */}
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

      {/* Sell confirmation modal */}
      <AnimatePresence>
        {sellTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-pitch-950/85 p-4 backdrop-blur-sm"
            onClick={() => setSellTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="panel w-full max-w-sm p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {sellTarget.peaked ? (
                <>
                  <div className="text-3xl">★</div>
                  <h2 className="heading-display mt-2 text-xl font-700 uppercase text-gold-soft">Cash Out Legend</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    <strong className="text-white">{sellTarget.card.name}</strong> has hit their development peak —
                    a hard-earned milestone over many seasons. Cash them out for a premium?
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl">💸</div>
                  <h2 className="heading-display mt-2 text-xl font-700 uppercase">Sell Card?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Release <strong className="text-white">{sellTarget.card.name}</strong>
                    {sellTarget.card.rarity ? ` (${sellTarget.card.rarity})` : ''} from your collection.
                    {sellTarget.card.count > 1 && (
                      <> You own {sellTarget.card.count} copies — one will be removed.</>
                    )}
                  </p>
                </>
              )}
              <div
                className="mx-auto mt-4 w-fit rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 font-display text-lg font-700 text-gold-soft"
              >
                🪙 +{sellTarget.price}
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setSellTarget(null)} className="btn-ghost flex-1 justify-center">
                  Cancel
                </button>
                <button
                  onClick={confirmSell}
                  className="flex-1 rounded-xl border border-emerald-400/40 bg-emerald-500/20 py-2.5 font-display text-sm font-700 uppercase tracking-wide text-emerald-300 transition-colors hover:bg-emerald-500/30"
                >
                  {sellTarget.peaked ? 'Cash Out' : 'Sell'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sold toast */}
      <AnimatePresence>
        {soldToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-5 py-2.5 font-display text-sm font-700 text-emerald-300 shadow-lg"
          >
            {soldToast}
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

function CollectionTile({ card, onSell }: { card: CollectedCard; onSell: () => void }) {
  const meta = TEAM_META[card.team as keyof typeof TEAM_META] ?? TEAM_META.CSK;
  const rm = card.rarity ? RARITY_META[card.rarity] : null;
  const peaked = isPeaked(card.playerId);
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
      {peaked && (
        <span className="absolute left-1 top-1 rounded bg-gold/20 px-1 text-[8px] font-700 text-gold-soft" title="Development maxed out">★</span>
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
      <button
        onClick={onSell}
        className={cn(
          'mt-1.5 w-full rounded-lg py-0.5 text-[9px] font-700 uppercase tracking-wide transition-colors',
          peaked
            ? 'bg-gold/15 text-gold-soft hover:bg-gold/25'
            : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300',
        )}
      >
        {peaked ? '★ Cash Out' : 'Sell'}
      </button>
    </div>
  );
}
