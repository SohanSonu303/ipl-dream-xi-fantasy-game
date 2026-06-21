import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Player, SquadSlot } from '@/types';
import { analyzePositions, arrangeSquad, XI_SIZE } from '@/engine';
import { SLOT_HINTS } from '@/components/Squad/SquadBoard';
import { TEAM_META, ROLE_SHORT } from '@/data/teams';
import { RARITY_META } from '@/data/primeEditions';
import { getTrait } from '@/data/playerMeta';
import { SectionLabel } from '@/components/Shared/ui';
import { cn, initials } from '@/utils';

interface LineupBuilderProps {
  /** The players to arrange (XI + bench). */
  players: Player[];
  /** Existing arrangement to start from; otherwise auto-balanced. */
  initial?: SquadSlot[];
  confirmLabel?: string;
  onConfirm: (slots: SquadSlot[]) => void;
  onCancel?: () => void;
}

/** Build the starting 13-long slot array from an arrangement or auto-balance. */
function initialSlots(players: Player[], initial?: SquadSlot[]): Player[] {
  if (initial && initial.length === players.length) {
    const arr: Player[] = new Array(players.length);
    for (const s of initial) arr[s.position] = s.player;
    return arr;
  }
  const arr: Player[] = new Array(players.length);
  for (const s of arrangeSquad(players)) arr[s.position] = s.player;
  return arr;
}

/**
 * Tap-to-swap lineup editor: choose exactly which players bat where in your XI
 * and who sits on the bench. Live position-fit ticks show when the right type is
 * in the right slot.
 */
export function LineupBuilder({ players, initial, confirmLabel = 'Confirm Lineup', onConfirm, onCancel }: LineupBuilderProps) {
  const total = players.length;
  const [slots, setSlots] = useState<Player[]>(() => initialSlots(players, initial));
  const [selected, setSelected] = useState<number | null>(null);

  const fitByPos = useMemo(() => {
    const xi = slots.slice(0, XI_SIZE);
    return new Map(analyzePositions(xi).fits.map((f) => [f.pos, f]));
  }, [slots]);

  const tap = (i: number) => {
    if (selected === null) {
      setSelected(i);
    } else if (selected === i) {
      setSelected(null);
    } else {
      setSlots((prev) => {
        const next = [...prev];
        [next[i], next[selected]] = [next[selected], next[i]];
        return next;
      });
      setSelected(null);
    }
  };

  const autoArrange = () => {
    setSlots(initialSlots(players));
    setSelected(null);
  };

  const confirm = () => onConfirm(slots.map((player, position) => ({ position, player })));

  const row = (pos: number, bench: boolean) => {
    const player = slots[pos];
    const fit = bench ? undefined : fitByPos.get(pos);
    const meta = TEAM_META[player.team];
    const rm = player.rarity ? RARITY_META[player.rarity] : null;
    const isSel = selected === pos;
    return (
      <button
        key={pos}
        onClick={() => tap(pos)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
          isSel ? 'border-gold bg-gold/15 shadow-glow' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
        )}
      >
        <span className="w-9 shrink-0 text-center">
          <span className="font-display text-xs font-700 text-slate-300">{bench ? '🪑' : pos + 1}</span>
          {!bench && <span className="block stat-label leading-none">{SLOT_HINTS[pos]?.split(' ')[0]}</span>}
        </span>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display text-[10px] font-700 ring-1 ring-white/15"
          style={{ background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`, color: meta.ink }}
        >
          {initials(player.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-600">{player.name}</span>
            {rm && <span style={{ color: rm.color }}>{rm.emblem}</span>}
            {getTrait(player.id) && <span className="text-gold-soft">★</span>}
          </span>
          <span className="stat-label">{ROLE_SHORT[player.role]} · {player.overallRating} OVR</span>
        </span>
        {!bench && fit && (
          <span className={cn('text-xs', fit.synergy ? 'text-gold-soft' : fit.ok ? 'text-emerald-400/80' : 'text-red-400/80')}>
            {fit.synergy ? '★' : fit.ok ? '✓' : '⚠'}
          </span>
        )}
      </button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel>Set Your XI {selected !== null && <span className="text-gold-soft">· tap a slot to swap</span>}</SectionLabel>
        <button onClick={autoArrange} className="text-[11px] font-700 uppercase tracking-wide text-sky-300 hover:text-sky-200">Auto-arrange</button>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">Tap a player, then tap another slot to swap them. Slots 1–11 are your XI; the rest are bench.</p>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {Array.from({ length: Math.min(XI_SIZE, total) }, (_, i) => row(i, false))}
      </div>
      {total > XI_SIZE && (
        <>
          <div className="stat-label mb-1 mt-3">Bench</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {Array.from({ length: total - XI_SIZE }, (_, i) => row(XI_SIZE + i, true))}
          </div>
        </>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {onCancel && (
          <button onClick={onCancel} className="btn-ghost px-6">Cancel</button>
        )}
        <button onClick={confirm} className="btn-primary px-8">{confirmLabel}</button>
      </div>
    </motion.div>
  );
}
