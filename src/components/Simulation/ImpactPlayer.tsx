import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Player, SquadSlot } from '@/types';
import type { ImpactSwap } from '@/store/gameStore';
import { TEAM_META, ROLE_SHORT } from '@/data/teams';
import { getTrait } from '@/data/playerMeta';
import { SectionLabel } from '@/components/Shared/ui';
import { cn, initials } from '@/utils';

interface ImpactPlayerProps {
  /** Ordered XI slots (position 0..10). */
  xi: SquadSlot[];
  bench: Player[];
  onResolve: (swap: ImpactSwap | null) => void;
}

/**
 * Mid-season break: optionally bring a bench player into the XI. The swap
 * re-simulates the rest of the season, so it's a genuine tactical decision.
 */
export function ImpactPlayer({ xi, bench, onResolve }: ImpactPlayerProps) {
  const [benchIndex, setBenchIndex] = useState<number | null>(null);
  const [xiPosition, setXiPosition] = useState<number | null>(null);

  const canConfirm = benchIndex !== null && xiPosition !== null;
  const incoming = benchIndex !== null ? bench[benchIndex] : null;
  const outgoing = xiPosition !== null ? xi.find((s) => s.position === xiPosition)?.player ?? null : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel relative mx-auto max-w-lg overflow-hidden p-5 sm:p-6"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(94,192,255,0.16),transparent_60%)]" />
      <div className="text-center">
        <span className="pill mx-auto border border-sky-400/30 bg-sky-500/10 text-sky-200">⏸ Mid-Season Break</span>
        <h2 className="heading-display mt-3 text-2xl font-700 uppercase">Impact Player</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-300">
          It’s the mid-season break — do you want to change your XI?
        </p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
          Bring a bench player in for the rest of the season (re-simulates your remaining games), or keep your side as-is.
        </p>
      </div>

      {/* Bench picker */}
      <div className="mt-5">
        <SectionLabel className="mb-2">Your Bench</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {bench.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setBenchIndex(i === benchIndex ? null : i)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors',
                benchIndex === i ? 'border-gold bg-gold/15 shadow-glow' : 'border-white/10 bg-white/5 hover:border-white/25',
              )}
            >
              <Monogram player={p} />
              <div className="min-w-0">
                <div className="truncate text-sm font-600">{p.name}</div>
                <div className="stat-label">{ROLE_SHORT[p.role]} · {p.overallRating} OVR</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* XI to replace */}
      <div className="mt-4">
        <SectionLabel className="mb-2">Replace From XI</SectionLabel>
        <div className="max-h-52 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
          {xi.map((slot) => {
            const p = slot.player;
            const selected = xiPosition === slot.position;
            return (
              <button
                key={slot.position}
                onClick={() => setXiPosition(selected ? null : slot.position)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                  selected ? 'border-red-400/60 bg-red-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/20',
                )}
              >
                <span className="w-5 shrink-0 text-center font-display text-xs font-700 text-slate-500">
                  {slot.position + 1}
                </span>
                <Monogram player={p} small />
                <span className="min-w-0 flex-1 truncate text-sm font-600">{p.name}</span>
                {getTrait(p.id) && <span className="text-gold-soft" title={getTrait(p.id)!.label}>★</span>}
                <span className="stat-label">{ROLE_SHORT[p.role]} · {p.overallRating}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live swap mapping — shows exactly who's coming in for whom. */}
      {(incoming || outgoing) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs sm:text-sm">
          <span className="font-600 text-emerald-300">{incoming ? `IN: ${incoming.name}` : 'Pick a bench player'}</span>
          <span className="text-slate-500">⟶</span>
          <span className="font-600 text-red-300">{outgoing ? `OUT: ${outgoing.name} (#${(xiPosition ?? 0) + 1})` : 'Pick who to replace'}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => onResolve(null)} className="btn-ghost px-6">
          Keep XI
        </button>
        <button
          onClick={() => canConfirm && onResolve({ benchIndex: benchIndex!, xiPosition: xiPosition! })}
          disabled={!canConfirm}
          className="btn-primary px-7"
        >
          Make the Sub
        </button>
      </div>
    </motion.div>
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
