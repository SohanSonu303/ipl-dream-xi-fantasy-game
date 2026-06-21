import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Player, SquadSlot } from '@/types';
import type { ImpactSwap } from '@/store/gameStore';
import { TEAM_META, ROLE_SHORT } from '@/data/teams';
import { getTrait } from '@/data/playerMeta';
import { RARITY_META } from '@/data/primeEditions';
import { SectionLabel } from '@/components/Shared/ui';
import { cn, initials } from '@/utils';

interface ImpactPlayerProps {
  /** Ordered XI slots (position 0..10). */
  xi: SquadSlot[];
  bench: Player[];
  /** First-half Player-of-the-Match count for each of the user's players. */
  momByPlayer: Map<number, number>;
  onResolve: (swaps: ImpactSwap[]) => void;
}

/**
 * Mid-season break: bring bench players into the XI. Each swap
 * re-simulates the rest of the season, so it's a genuine tactical decision —
 * and you can see who's in form and what card each player is before deciding.
 */
/** A suggested XI player for a bench man to replace — the best upgrade on offer. */
interface SubRec {
  pos: number;
  targetName: string;
  delta: number;
  sameRole: boolean;
}

/** Best XI slot this bench player improves: same-role upgrades win, then size. */
function recommendTarget(p: Player, xi: SquadSlot[]): SubRec | null {
  let best: SubRec | null = null;
  let bestScore = 0;
  for (const slot of xi) {
    const delta = p.overallRating - slot.player.overallRating;
    if (delta <= 0) continue;
    const sameRole = slot.player.role === p.role;
    const score = (sameRole ? 1000 : 0) + delta;
    if (score > bestScore) {
      bestScore = score;
      best = { pos: slot.position, targetName: slot.player.name, delta, sameRole };
    }
  }
  return best;
}

export function ImpactPlayer({ xi, bench, momByPlayer, onResolve }: ImpactPlayerProps) {
  // benchIndex -> xiPosition. Both sides stay unique.
  const [swaps, setSwaps] = useState<Record<number, number>>({});
  const [activeBench, setActiveBench] = useState<number | null>(null);

  // For each bench player: how good a sub are they, and who should they replace?
  // "Value" blends recent form (MOM awards) with the size of the upgrade so the
  // strongest option is flagged ⭐ Best sub.
  const recs = useMemo(() => {
    return bench.map((p, i) => {
      const rec = recommendTarget(p, xi);
      const moms = momByPlayer.get(p.id) ?? 0;
      const value = moms * 6 + (rec ? rec.delta + (rec.sameRole ? 3 : 0) : -5);
      return { i, rec, moms, value };
    });
  }, [bench, xi, momByPlayer]);

  const bestSubIndex = useMemo(() => {
    const ranked = [...recs].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    return ranked.length ? ranked[0].i : null;
  }, [recs]);

  const usedPositions = new Set(Object.values(swaps));
  const swapList: ImpactSwap[] = Object.entries(swaps).map(([b, p]) => ({ benchIndex: +b, xiPosition: p }));
  const activeName = activeBench !== null ? bench[activeBench]?.name : null;
  const activeRecPos =
    activeBench !== null ? (recs.find((r) => r.i === activeBench)?.rec?.pos ?? null) : null;

  const clickBench = (i: number) => {
    if (i in swaps) {
      const next = { ...swaps };
      delete next[i];
      setSwaps(next);
      setActiveBench(null);
      return;
    }
    setActiveBench(activeBench === i ? null : i);
  };

  const clickXi = (pos: number) => {
    if (activeBench === null) return;
    if (usedPositions.has(pos) && swaps[activeBench] !== pos) return; // taken by another swap
    setSwaps({ ...swaps, [activeBench]: pos });
    setActiveBench(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel relative mx-auto max-w-lg overflow-hidden p-5 sm:p-6"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(94,192,255,0.16),transparent_60%)]" />
      <div className="text-center">
        <span className="pill mx-auto border border-sky-400/30 bg-sky-500/10 text-sky-200">⏸ Mid-Season Break</span>
        <h2 className="heading-display mt-3 text-2xl font-700 uppercase">Impact Players</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-300">
          Bring your bench in for the rest of the season — make as many changes as you like.
        </p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
          {activeName
            ? `Now tap who ${activeName} replaces in the XI ↓`
            : 'Tap a bench player, then tap who they replace. ⭐ = best sub · 🔥 = in form.'}
        </p>
      </div>

      {/* Bench picker */}
      <div className="mt-5">
        <SectionLabel className="mb-2">Your Bench · best subs first</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {bench.map((p, i) => {
            const mapped = i in swaps;
            const active = activeBench === i;
            const targetPos = swaps[i];
            const targetName = targetPos != null ? xi.find((s) => s.position === targetPos)?.player.name : null;
            const rec = recs.find((r) => r.i === i)?.rec ?? null;
            const isBest = bestSubIndex === i;
            return (
              <button
                key={p.id}
                onClick={() => clickBench(i)}
                className={cn(
                  'relative flex flex-col gap-1 rounded-xl border px-2.5 py-2 text-left transition-colors',
                  active
                    ? 'border-gold bg-gold/15 shadow-glow'
                    : mapped
                      ? 'border-emerald-400/60 bg-emerald-500/10'
                      : isBest
                        ? 'border-gold/50 bg-gold/[0.07] hover:border-gold/70'
                        : 'border-white/10 bg-white/5 hover:border-white/25',
                )}
              >
                {isBest && !mapped && (
                  <span className="absolute -top-2 right-2 rounded-full bg-gold px-1.5 py-px text-[8px] font-700 uppercase tracking-wide text-pitch-950 shadow-glow">
                    ⭐ Best sub
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Monogram player={p} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-600">{p.name}</div>
                    <div className="stat-label">{ROLE_SHORT[p.role]} · {p.overallRating} OVR</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <RarityChip player={p} />
                  <FormBadge count={momByPlayer.get(p.id) ?? 0} />
                </div>
                {mapped ? (
                  <div className="truncate text-[10px] font-600 text-emerald-300">→ replacing {targetName}</div>
                ) : rec ? (
                  <div className="truncate text-[10px] font-600 text-sky-300/90" title={`+${rec.delta} OVR over ${rec.targetName}`}>
                    ↑ Best in for {rec.targetName} (#{rec.pos + 1}){rec.sameRole ? ' · same role' : ''}
                  </div>
                ) : (
                  <div className="truncate text-[10px] text-slate-500">No upgrade in the XI — squad cover</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* XI to replace */}
      <div className="mt-4">
        <SectionLabel className="mb-2">Your XI {activeBench !== null && <span className="text-gold-soft">· tap to replace</span>}</SectionLabel>
        <div className="max-h-56 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
          {xi.map((slot) => {
            const p = slot.player;
            const isOut = usedPositions.has(slot.position);
            const isSuggested = !isOut && slot.position === activeRecPos;
            const moms = momByPlayer.get(p.id) ?? 0;
            return (
              <button
                key={slot.position}
                onClick={() => clickXi(slot.position)}
                disabled={activeBench === null || (isOut && swaps[activeBench] !== slot.position)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                  isOut
                    ? 'border-red-400/60 bg-red-500/15'
                    : isSuggested
                      ? 'border-gold/70 bg-gold/10 shadow-glow'
                      : activeBench !== null
                        ? 'border-white/10 bg-white/[0.03] hover:border-gold/50 hover:bg-gold/5'
                        : 'border-white/10 bg-white/[0.03]',
                )}
              >
                <span className="w-5 shrink-0 text-center font-display text-xs font-700 text-slate-500">
                  {slot.position + 1}
                </span>
                <Monogram player={p} small />
                <span className="min-w-0 flex-1 truncate text-sm font-600">{p.name}</span>
                {isSuggested && <span className="shrink-0 text-[9px] font-700 uppercase tracking-wide text-gold-soft">⭐ suggested</span>}
                {moms > 0 && <FormBadge count={moms} compact />}
                <RarityChip player={p} compact />
                {getTrait(p.id) && <span className="text-gold-soft" title={getTrait(p.id)!.label}>★</span>}
                <span className="stat-label">{ROLE_SHORT[p.role]} · {p.overallRating}</span>
                {isOut && <span className="text-[10px] font-700 uppercase text-red-300">out</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Swap summary */}
      {swapList.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {swapList.map((s) => {
            const inc = bench[s.benchIndex];
            const out = xi.find((x) => x.position === s.xiPosition)?.player;
            return (
              <div key={s.benchIndex} className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs sm:text-sm">
                <span className="font-600 text-emerald-300">IN {inc?.name}</span>
                <span className="text-slate-500">⟶</span>
                <span className="font-600 text-red-300">OUT {out?.name} (#{s.xiPosition + 1})</span>
                <button onClick={() => removeSwap(setSwaps, swaps, s.benchIndex)} className="ml-1 text-slate-400 hover:text-white" title="Undo">✕</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => onResolve([])} className="btn-ghost px-6">
          Keep XI
        </button>
        <button
          onClick={() => onResolve(swapList)}
          disabled={swapList.length === 0}
          className="btn-primary px-7"
        >
          {swapList.length > 1 ? `Make ${swapList.length} Subs` : 'Make the Sub'}
        </button>
      </div>
    </motion.div>
  );
}

function removeSwap(setSwaps: (s: Record<number, number>) => void, swaps: Record<number, number>, benchIndex: number) {
  const next = { ...swaps };
  delete next[benchIndex];
  setSwaps(next);
}

function RarityChip({ player, compact }: { player: Player; compact?: boolean }) {
  if (!player.rarity) {
    return compact ? null : <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-600 uppercase tracking-wide text-slate-400">Standard</span>;
  }
  const rm = RARITY_META[player.rarity];
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-700 uppercase tracking-wide"
      style={{ background: `${rm.color}22`, color: rm.color }}
      title={`${rm.label} · ${player.editionTitle ?? ''}`}
    >
      {rm.emblem} {compact ? rm.label : `${rm.label}${player.editionTitle ? ` · ${player.editionTitle}` : ''}`}
    </span>
  );
}

function FormBadge({ count, compact }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-700 uppercase tracking-wide text-orange-300"
      title={`In form — ${count} Player-of-the-Match award${count === 1 ? '' : 's'} this half`}
    >
      🔥 {compact ? count : `In Form · ${count} MOM`}
    </span>
  );
}

function Monogram({ player, small }: { player: Player; small?: boolean }) {
  const meta = TEAM_META[player.team];
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-lg font-display font-700 ring-1 ring-white/15',
        small ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
      )}
      style={{ background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`, color: meta.ink }}
    >
      {initials(player.name)}
    </span>
  );
}
