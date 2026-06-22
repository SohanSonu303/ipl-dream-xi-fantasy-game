import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Player, PlayerRole } from '@/types';
import { useGameStore } from '@/store/gameStore';
import {
  type AuctionLot,
  AUCTION_SIGN_LIMIT,
  aiWillBid,
  auctionBudget,
  bidIncrement,
  buildLots,
  finalPrice,
} from '@/engine';
import { collectCards, getCoins } from '@/data/profile';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';
import { ROLE_SHORT } from '@/data/teams';
import { cn } from '@/utils';

type Sold = { lot: AuctionLot; paid: number; by: 'YOU' | 'AI' } | null;
type Signing = { player: Player; paid: number };

export function AuctionPage() {
  const navigate = useNavigate();
  const startAuctionDraft = useGameStore((s) => s.startAuctionDraft);

  const lots = useMemo(() => buildLots(40), []);
  const startBudget = useMemo(() => auctionBudget(getCoins()), []);
  const [lotIndex, setLotIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(lots[0]?.basePrice ?? 2);
  const [highBidder, setHighBidder] = useState<'YOU' | 'AI' | null>(null);
  const [budget, setBudget] = useState(startBudget);
  const [signings, setSignings] = useState<Signing[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [sold, setSold] = useState<Sold>(null);
  const teamName = 'My Auction XI';

  const lot = lots[lotIndex];
  const complete = signings.length >= AUCTION_SIGN_LIMIT;
  const nextBid = highBidder === null ? currentBid : currentBid + bidIncrement(currentBid);
  const nextCost = lot ? finalPrice(lot, nextBid) : 0;
  const canAfford = nextCost <= budget;
  const busy = aiThinking || sold != null;

  const roleCounts = useMemo(() => {
    const c: Record<PlayerRole, number> = { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKET_KEEPER: 0 };
    for (const s of signings) c[s.player.role]++;
    return c;
  }, [signings]);

  const advance = (boughtNow: Signing[]) => {
    setSold(null);
    const next = lotIndex + 1;
    if (boughtNow.length >= AUCTION_SIGN_LIMIT || next >= lots.length) {
      proceedToDraft(boughtNow);
      return;
    }
    setLotIndex(next);
    setCurrentBid(lots[next].basePrice);
    setHighBidder(null);
  };

  const winLot = (l: AuctionLot, bid: number) => {
    const paid = finalPrice(l, bid);
    const next = [...signings, { player: l.player, paid }];
    setBudget((b) => b - paid);
    setSignings(next);
    collectCards([l.player]);
    setSold({ lot: l, paid, by: 'YOU' });
    window.setTimeout(() => advance(next), 1100);
  };

  /** Resell a signing — the purse is refunded in full and the slot freed. */
  const sell = (index: number) => {
    const s = signings[index];
    if (!s) return;
    setBudget((b) => b + s.paid);
    setSignings((prev) => prev.filter((_, i) => i !== index));
  };

  const placeBid = () => {
    if (!lot || busy || complete) return;
    const myBid = highBidder === null ? currentBid : currentBid + bidIncrement(currentBid);
    if (finalPrice(lot, myBid) > budget) return;
    setCurrentBid(myBid);
    setHighBidder('YOU');
    setAiThinking(true);
    window.setTimeout(() => {
      setAiThinking(false);
      if (aiWillBid(lot, myBid)) {
        setCurrentBid(myBid + bidIncrement(myBid));
        setHighBidder('AI');
      } else {
        winLot(lot, myBid); // AI bows out — sold to you
      }
    }, 750);
  };

  const passLot = () => {
    if (!lot || busy || complete || highBidder === 'YOU') return;
    setSold({ lot, paid: currentBid, by: 'AI' });
    window.setTimeout(() => advance(signings), 900);
  };

  // Finish: take your (≤3) signings into the draft, where you fill the rest of
  // the squad through the random rolls.
  const proceedToDraft = (signed: Signing[]) => {
    const players = signed.slice(0, AUCTION_SIGN_LIMIT).map((s) => s.player);
    startAuctionDraft(players, teamName);
    navigate('/draft');
  };

  return (
    <PageTransition className="pb-28">
      <header className="flex items-center justify-between py-4">
        <button onClick={() => navigate('/')} className="transition-opacity hover:opacity-80">
          <Brand />
        </button>
        <div className="flex items-center gap-2">
          <span className="pill border border-emerald-400/30 bg-emerald-500/10 font-display text-sm font-700 text-emerald-200">
            💰 {budget} cr
          </span>
          <span className="pill border border-white/10 bg-white/5 text-slate-300">
            {signings.length}/{AUCTION_SIGN_LIMIT} signed
          </span>
        </div>
      </header>

      <div className="text-center">
        <h1 className="heading-display text-2xl font-700 uppercase sm:text-3xl">The Auction</h1>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
          Sign up to <strong className="text-gold-soft">{AUCTION_SIGN_LIMIT}</strong> marquee players here — then you draft the
          rest of your XI from random rolls. Owned cards come 25% off.
        </p>
        <p className="mx-auto mt-1 text-[11px] text-emerald-300/80">
          Purse {startBudget} cr · grows as you bank coins from wins & top-4 finishes.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Current lot */}
        <section className="panel p-4 sm:p-5">
          {complete ? (
            <div className="grid place-items-center gap-3 py-10 text-center">
              <span className="text-4xl">✅</span>
              <h2 className="heading-display text-xl font-700 uppercase">{AUCTION_SIGN_LIMIT} Signed!</h2>
              <p className="max-w-sm text-sm text-slate-400">Your marquee men are locked in. Now draft the rest of your XI.</p>
              <button onClick={() => proceedToDraft(signings)} className="btn-primary px-8">Draft the Rest →</button>
            </div>
          ) : lot ? (
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <div className="mx-auto w-full max-w-[200px]">
                <PlayerCard player={lot.player} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <SectionLabel>Under the Hammer</SectionLabel>
                  <span className="text-xs text-slate-500">Lot {lotIndex + 1}/{lots.length}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-700 tabular-nums text-gold-soft">{currentBid} cr</span>
                  {lot.owned && <span className="pill bg-purple-500/15 text-[10px] text-purple-200">Owned · −25%</span>}
                </div>
                <div className="mt-1 h-5 text-xs">
                  <AnimatePresence mode="wait">
                    {sold ? (
                      <motion.span key="sold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={sold.by === 'YOU' ? 'text-emerald-300' : 'text-slate-400'}>
                        {sold.by === 'YOU' ? `SOLD to you for ${sold.paid} cr!` : `Sold to rival for ${sold.paid} cr.`}
                      </motion.span>
                    ) : aiThinking ? (
                      <motion.span key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-orange-300">Rival is thinking…</motion.span>
                    ) : highBidder ? (
                      <motion.span key="hb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={highBidder === 'YOU' ? 'text-emerald-300' : 'text-red-300'}>
                        {highBidder === 'YOU' ? 'You hold the top bid' : 'Rival leads — bid again?'}
                      </motion.span>
                    ) : (
                      <motion.span key="base" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500">Base price · open the bidding</motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  <button
                    onClick={placeBid}
                    disabled={busy || !canAfford || highBidder === 'YOU'}
                    className="rounded-xl bg-gold py-2.5 font-display text-sm font-700 uppercase tracking-wide text-pitch-950 transition-colors hover:bg-gold-soft disabled:bg-white/10 disabled:text-slate-500"
                  >
                    Bid {nextBid} cr
                  </button>
                  <button
                    onClick={passLot}
                    disabled={busy || highBidder === 'YOU'}
                    className="rounded-xl border border-white/15 bg-white/5 py-2.5 font-display text-sm font-700 uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    {highBidder === 'AI' ? 'Let it go' : 'Pass'}
                  </button>
                </div>
                {!canAfford && highBidder !== 'YOU' && (
                  <p className="mt-1.5 text-center text-[11px] text-red-300/80">Not enough in the purse for this bid.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Squad so far */}
        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Your Signings</SectionLabel>
            <button
              onClick={() => proceedToDraft(signings)}
              className="rounded-lg border border-gold/40 px-2 py-0.5 text-[11px] font-700 uppercase tracking-wide text-gold-soft hover:bg-gold/10"
            >
              {signings.length >= AUCTION_SIGN_LIMIT ? 'Draft rest →' : 'Skip to draft →'}
            </button>
          </div>
          {/* Role tally */}
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
            {(['BATTER', 'ALL_ROUNDER', 'WICKET_KEEPER', 'BOWLER'] as PlayerRole[]).map((r) => (
              <div key={r} className={cn('rounded-lg px-1 py-1.5', roleCounts[r] === 0 ? 'bg-red-500/10' : 'bg-white/5')}>
                <div className="font-display text-base font-700 tabular-nums">{roleCounts[r]}</div>
                <div className="stat-label leading-tight">{ROLE_SHORT[r]}</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">Grab your stars here — keeper, bowlers and the rest you'll draft.</p>
          <div className="mt-3 max-h-[320px] space-y-1 overflow-y-auto scrollbar-thin pr-1">
            {signings.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No signings yet — bid for a star, or skip straight to the draft.</p>
            ) : (
              signings.map((s, i) => (
                <div key={`${s.player.id}-${i}`} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-xs">
                  <span className="w-4 text-center text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-600">{s.player.name}</span>
                  <span className="text-slate-500">{ROLE_SHORT[s.player.role]}</span>
                  <span className="font-display font-700 text-slate-300">{s.player.overallRating}</span>
                  <span className="text-emerald-300/80" title="Price paid">{s.paid}cr</span>
                  <button
                    onClick={() => sell(i)}
                    className="rounded border border-red-400/30 px-1.5 py-0.5 text-[10px] font-700 uppercase text-red-300 hover:bg-red-500/10"
                    title="Resell — full refund to your purse"
                  >
                    Sell
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
