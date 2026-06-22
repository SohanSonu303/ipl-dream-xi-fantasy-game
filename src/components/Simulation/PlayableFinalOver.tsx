import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SeasonTeam } from '@/types';
import {
  type DeliveryType,
  type Field,
  type ShotChoice,
  type ShotResult,
  type ShotZoneKey,
  buildField,
  finalOverEffect,
  getDeliveryWeights,
  getShotMatch,
  PITCH_META,
  resolveShot,
  rollConditions,
  rollDelivery,
  setupFinalOver,
  SHOT_ZONES,
} from '@/engine';
import { RARITY_META } from '@/data/primeEditions';
import { getBatsHand } from '@/data/playerMeta';
import { CricketField, type BallFlight } from './CricketField';
import { Confetti } from './Confetti';
import { cn } from '@/utils';

interface PlayableFinalOverProps {
  userTeam: SeasonTeam;
  oppTeam: SeasonTeam;
  onComplete: (userWon: boolean, runs: number, target: number) => void;
}

interface PlayedBall {
  label: string;
  runs: number;
  wicket: boolean;
}

// Colour per delivery type for the tendency bars.
const DELIVERY_COLOR: Record<DeliveryType, string> = {
  YORKER: '#f87171',  // red   — dangerous
  LENGTH: '#94a3b8',  // slate — standard
  FULL:   '#94a3b8',  // slate — standard
  SHORT:  '#fbbf24',  // amber — bouncer
  LOOSE:  '#34d399',  // green — opportunity
};

export function PlayableFinalOver({ userTeam, oppTeam, onComplete }: PlayableFinalOverProps) {
  const conditions = useMemo(() => rollConditions(), []);
  const effect = useMemo(() => finalOverEffect(conditions), [conditions]);
  const pitch = PITCH_META[conditions.pitch];
  const setup = useMemo(() => setupFinalOver(userTeam, oppTeam, effect.targetDelta), [userTeam, oppTeam, effect]);
  const { target, bowler, batters } = setup;

  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ball, setBall] = useState(0);
  const [batterIndex, setBatterIndex] = useState(0);
  const [deliveries, setDeliveries] = useState<PlayedBall[]>([]);
  const [last, setLast] = useState<ShotResult | null>(null);
  const [field, setField] = useState<Field>(() => buildField());
  const [flight, setFlight] = useState<BallFlight | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);

  // ── Cricket Brain state ──────────────────────────────────────────────────
  const [brainUsed, setBrainUsed] = useState(false);
  const [revealedDelivery, setRevealedDelivery] = useState<DeliveryType | null>(null);

  const need = Math.max(0, target - runs);
  const ballsLeft = 6 - ball;
  const allOut = batterIndex >= batters.length;
  const striker = batters[Math.min(batterIndex, batters.length - 1)];
  const hand = striker ? getBatsHand(striker.id) : 'R';
  const userWon = runs >= target;

  // Bowler tendency weights — fixed for the over (bowler doesn't change).
  const tendencies = useMemo(() => getDeliveryWeights(bowler), [bowler]);

  // ── Cricket Brain: reveal the exact next delivery once per over ──────────
  const useBrain = () => {
    if (brainUsed || locked || done || allOut) return;
    setRevealedDelivery(rollDelivery(bowler));
    setBrainUsed(true);
  };

  // ── Play a ball ──────────────────────────────────────────────────────────
  const play = (choice: ShotChoice) => {
    if (done || allOut || locked || !striker) return;

    // Consume the revealed delivery (if brain was used) before resolving.
    const forced = revealedDelivery;
    setRevealedDelivery(null);

    const result = resolveShot(bowler, striker, choice, field, effect.contestDelta, forced ?? undefined);

    setLocked(true);
    setFlight({ to: result.landing, kind: result.kind, aerial: result.aerial, deliveryLabel: result.deliveryLabel, key: ball + 1 });

    const aerial = result.aerial || result.kind === 'six';
    const settle = aerial ? 1500 : 1250;

    window.setTimeout(() => {
      const newRuns = runs + result.runs;
      const newWickets = wickets + (result.wicket ? 1 : 0);
      const newBall = ball + 1;
      const newBatterIndex = result.wicket ? batterIndex + 1 : batterIndex;

      setRuns(newRuns);
      setWickets(newWickets);
      setBall(newBall);
      setBatterIndex(newBatterIndex);
      setDeliveries((d) => [...d, { label: result.label, runs: result.runs, wicket: result.wicket }]);
      setLast(result);
      setFlight(null);
      setField(buildField());
      setLocked(false);

      const won = newRuns >= target;
      if (won || newBall >= 6 || newBatterIndex >= batters.length) setDone(true);
    }, settle);
  };

  return (
    <div className="panel relative mx-auto max-w-md overflow-hidden p-4 text-center sm:p-5">
      {done && userWon && <Confetti count={80} />}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,0.16),transparent_65%)]" />

      {/* Header */}
      <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">The Final · You're Batting</span>

      {/* Toss + pitch */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
        <span className="pill border border-white/10 bg-white/5 text-slate-300">
          🪙 {conditions.tossWonByUser ? 'You won the toss' : 'Rival won the toss'}
        </span>
        <span
          className="pill border border-white/10 bg-white/5"
          style={{ color: pitch.favours === 'BAT' ? '#5ec0ff' : pitch.favours === 'BOWL' ? '#ff8a5e' : '#cbd5e1' }}
          title={pitch.blurb}
        >
          {pitch.emoji} {pitch.label}
        </span>
      </div>

      {/* Equation */}
      <div className="mt-3">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${need}-${ballsLeft}-${done}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="heading-display text-2xl font-700 uppercase sm:text-3xl"
          >
            {done ? (
              <span style={{ color: userWon ? '#34d399' : '#cbd5e1' }}>{userWon ? 'Champions!' : 'Fell Short'}</span>
            ) : need <= 0 ? (
              <span className="text-emerald-300">Target chased!</span>
            ) : (
              <span>
                Need <span className="text-gold">{need}</span> off <span className="text-gold">{ballsLeft}</span>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-0.5 text-[11px] text-slate-400">
          Target {target} · {runs} scored · {batters.length - wickets} wkts in hand
        </div>
      </div>

      {/* Bowler vs striker */}
      <div className="mt-2 flex items-center justify-center gap-2 text-xs">
        <PlayerTag name={bowler.name} rating={bowler.bowlingRating} rl="BOWL" rarity={bowler.rarity} tone="#fb7185" />
        <span className="text-slate-500">vs</span>
        <PlayerTag name={striker?.name ?? '—'} rating={striker?.battingRating ?? 0} rl={hand === 'L' ? 'LHB' : 'RHB'} rarity={striker?.rarity} tone="#f5c542" />
      </div>

      {/* ── LAYER 2: Bowler Tendency Bars + Cricket Brain button ── */}
      {!done && (
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-700 uppercase tracking-wider text-slate-500">Bowler Tendencies</span>
            {/* ── LAYER 3: Cricket Brain ── */}
            <button
              onClick={useBrain}
              disabled={brainUsed || locked || done || allOut}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-700 uppercase tracking-wide transition-all',
                !brainUsed
                  ? 'border border-purple-400/40 bg-purple-500/20 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.25)] hover:bg-purple-500/30 active:scale-95'
                  : 'cursor-default text-slate-600',
              )}
              title={brainUsed ? 'Already used this over' : 'Reveal the exact next delivery — use it wisely!'}
            >
              🧠 {brainUsed ? 'Brain Used' : 'Read Delivery'}
            </button>
          </div>

          <div className="space-y-1">
            {tendencies.map(({ type, label, pct }) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-right text-[10px] font-600" style={{ color: DELIVERY_COLOR[type] }}>
                  {label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ backgroundColor: DELIVERY_COLOR[type], opacity: 0.7 }}
                    />
                  </div>
                </div>
                <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-slate-500">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Delivery reveal banner (Cricket Brain active) ── */}
      <AnimatePresence>
        {revealedDelivery && !done && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-purple-500/10 px-3 py-2">
              <span className="text-sm">⚡</span>
              <span className="font-display text-sm font-700 uppercase tracking-wide text-purple-200">
                {revealedDelivery} incoming!
              </span>
              <span className="text-[10px] text-purple-400">— pick your best shot</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LAYER 1: The field with gap arcs ── */}
      <div className="mt-3">
        <CricketField
          field={field}
          flight={flight}
          bowlerName={bowler.name}
          strikerName={striker?.name ?? 'Batter'}
          hand={hand}
          openZones={field.openZones}
        />
      </div>

      {/* Commentary */}
      <div className="mt-1 grid h-10 place-items-center">
        <AnimatePresence mode="wait">
          {last && !locked && (
            <motion.p
              key={deliveries.length}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={cn(
                'text-sm',
                last.kind === 'wicket' ? 'text-red-300' : last.kind === 'six' || last.kind === 'four' ? 'text-gold-soft' : 'text-slate-300',
              )}
            >
              {last.text}
            </motion.p>
          )}
          {locked && (
            <motion.p key="watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-400">
              …
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Ball strip */}
      <div className="mt-1 flex items-center justify-center gap-1.5">
        {Array.from({ length: 6 }, (_, i) => {
          const d = deliveries[i];
          const big = d && (d.runs >= 4 || d.wicket);
          return (
            <motion.div
              key={i}
              initial={false}
              animate={d ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              className={cn(
                'grid aspect-square w-8 shrink-0 place-items-center rounded-full border font-display text-[11px] font-700 uppercase',
                !d && 'border-white/10 bg-white/5 text-slate-600',
                d && d.wicket && 'border-red-400/50 bg-red-500/20 text-red-200',
                d && !d.wicket && big && 'border-gold/50 bg-gold/20 text-gold-soft shadow-glow',
                d && !d.wicket && !big && 'border-white/15 bg-white/10 text-slate-200',
              )}
            >
              {d ? d.label : i + 1}
            </motion.div>
          );
        })}
      </div>

      {/* Controls */}
      {done ? (
        <button onClick={() => onComplete(userWon, runs, target)} className="btn-primary mx-auto mt-3 px-9">
          {userWon ? 'Lift the Trophy' : 'See Result'}
        </button>
      ) : (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] text-slate-400">
            {revealedDelivery
              ? 'Shot quality shown — green = ideal, red = danger'
              : 'Read the field gaps · pick your shot'}
          </div>

          {/* ── Shot buttons: open zone + delivery match badges ── */}
          <div className="grid grid-cols-5 gap-1">
            {SHOT_ZONES.map((z) => {
              const isOpen = field.openZones.includes(z.key as ShotZoneKey);
              const matchQuality = revealedDelivery ? getShotMatch(z.key as ShotZoneKey, revealedDelivery) : null;
              return (
                <button
                  key={z.key}
                  onClick={() => play(z.key)}
                  disabled={locked}
                  className={cn(
                    'relative flex flex-col items-center rounded-lg border px-0.5 py-2 transition-colors disabled:opacity-40',
                    matchQuality === 'ideal' && 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_8px_rgba(52,211,153,0.15)]',
                    matchQuality === 'danger' && 'border-red-400/60 bg-red-500/10',
                    matchQuality === 'ok' && 'border-white/12 bg-white/5 hover:bg-white/10',
                    !matchQuality && 'border-white/12 bg-white/5 hover:bg-white/10',
                  )}
                >
                  <span className="font-display text-[11px] font-700 uppercase leading-none">{z.shot}</span>
                  <span className="mt-0.5 text-[8px] uppercase tracking-wide text-slate-500 leading-none">
                    {z.region.replace('the ', '')}
                  </span>
                  <RiskPips risk={z.risk} />
                  {/* Badges row */}
                  <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {isOpen && (
                      <span className="rounded px-1 py-px text-[7px] font-700 uppercase bg-emerald-500/25 text-emerald-300 leading-tight">
                        GAP
                      </span>
                    )}
                    {matchQuality === 'ideal' && (
                      <span className="rounded px-1 py-px text-[7px] font-700 bg-emerald-500/25 text-emerald-300 leading-tight">
                        ✓
                      </span>
                    )}
                    {matchQuality === 'danger' && (
                      <span className="rounded px-1 py-px text-[7px] font-700 bg-red-500/25 text-red-300 leading-tight">
                        ✗
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => play('BLOCK')}
            disabled={locked}
            className="mt-1.5 w-full rounded-lg border border-white/12 bg-white/5 py-1.5 text-xs font-600 uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Block · play safe
          </button>
        </div>
      )}
    </div>
  );
}

function RiskPips({ risk }: { risk: 1 | 2 | 3 }) {
  return (
    <span className="mt-1 flex gap-0.5" title={risk === 1 ? 'Low risk' : risk === 2 ? 'Medium risk' : 'High risk / high reward'}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1 w-1 rounded-full',
            i <= risk ? (risk === 3 ? 'bg-red-400' : risk === 2 ? 'bg-gold' : 'bg-emerald-400') : 'bg-white/15',
          )}
        />
      ))}
    </span>
  );
}

function PlayerTag({
  name,
  rating,
  rl,
  rarity,
  tone,
}: {
  name: string;
  rating: number;
  rl: string;
  rarity?: import('@/types').Rarity;
  tone: string;
}) {
  const rm = rarity ? RARITY_META[rarity] : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5">
      {rm && <span style={{ color: rm.color }}>{rm.emblem}</span>}
      <span className="max-w-[88px] truncate font-600 text-slate-200">{name}</span>
      <span className="font-display font-700" style={{ color: tone }}>{rating}</span>
      <span className="stat-label">{rl}</span>
    </span>
  );
}
