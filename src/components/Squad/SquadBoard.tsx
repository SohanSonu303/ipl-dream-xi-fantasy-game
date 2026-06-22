import { AnimatePresence, motion } from 'framer-motion';
import type { Player, SquadSlot } from '@/types';
import { XI_SIZE, analyzePositions } from '@/engine';
import { TEAM_META, ROLE_SHORT } from '@/data/teams';
import { RARITY_META } from '@/data/primeEditions';
import { getTrait } from '@/data/playerMeta';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { cn, initials } from '@/utils';

/** Positional hints — these now matter (see positionEngine). */
export const SLOT_HINTS = [
  'Opener',
  'Top Order',
  'Top Order',
  'Middle Order',
  'Middle Order',
  'Finisher',
  'All-Rounder',
  'All-Rounder',
  'Spinner',
  'Pace',
  'Pace',
];

interface SquadBoardProps {
  squad: SquadSlot[];
  pendingPlayer: Player | null;
  onAssign: (position: number) => void;
  squadSize?: number;
}

export function SquadBoard({ squad, pendingPlayer, onAssign, squadSize = XI_SIZE + 2 }: SquadBoardProps) {
  const byPosition = new Map(squad.map((s) => [s.position, s]));
  const assigning = Boolean(pendingPlayer);

  // Per-slot batting-order fit for the placed XI players, indexed by true slot.
  const xi: (Player | undefined)[] = new Array(XI_SIZE).fill(undefined);
  for (const s of squad) {
    if (s.position < XI_SIZE) xi[s.position] = s.player;
  }
  const fitByPos = new Map(analyzePositions(xi).fits.map((f) => [f.pos, f]));

  const renderSlot = (pos: number, bench: boolean) => {
    const slot = byPosition.get(pos);
    const empty = !slot;
    const selectable = assigning && empty;
    return (
      <div key={pos} className="relative">
        <AnimatePresence mode="popLayout">
          {slot ? (
            <FilledSlot key="filled" slot={slot} fit={bench ? undefined : fitByPos.get(pos)} bench={bench} />
          ) : (
            <motion.button
              key="empty"
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onAssign(pos)}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              whileTap={selectable ? { scale: 0.97 } : undefined}
              className={cn(
                'flex h-[58px] w-full items-center gap-3 rounded-xl border border-dashed px-3 text-left transition-colors',
                selectable
                  ? 'cursor-pointer border-gold/70 bg-gold/10 shadow-glow animate-pulse'
                  : 'cursor-default border-white/12 bg-white/[0.03]',
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 font-display text-sm font-700 text-slate-500">
                {bench ? '↩' : pos + 1}
              </span>
              <div className="min-w-0">
                <div className="stat-label">{bench ? 'Bench' : SLOT_HINTS[pos]}</div>
                <div className="text-xs text-slate-500">{selectable ? 'Place here' : 'Empty slot'}</div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: XI_SIZE }, (_, pos) => renderSlot(pos, false))}
      </div>
      <div>
        <div className="stat-label mb-1.5 flex items-center gap-1.5">
          <span>Bench</span>
          <span className="text-slate-600">· impact subs</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: squadSize - XI_SIZE }, (_, i) => renderSlot(XI_SIZE + i, true))}
        </div>
      </div>
    </div>
  );
}

function FilledSlot({
  slot,
  fit,
  bench,
}: {
  slot: SquadSlot;
  fit?: { ok: boolean; synergy: boolean };
  bench?: boolean;
}) {
  const { player } = slot;
  const meta = TEAM_META[player.team];
  const trait = getTrait(player.id);
  const rarity = player.rarity ? RARITY_META[player.rarity] : null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={cn(
        'flex h-[58px] w-full items-center gap-3 overflow-hidden rounded-xl border px-2.5',
        rarity ? 'border-transparent' : 'border-white/10',
        bench ? 'bg-pitch-800/60' : 'bg-pitch-800',
      )}
      style={
        rarity
          ? { boxShadow: `inset 3px 0 0 ${rarity.color}, 0 0 0 1px ${rarity.color}88` }
          : { boxShadow: `inset 3px 0 0 ${meta.accent}` }
      }
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-sm font-700 ring-1 ring-white/15"
        style={{ background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`, color: meta.ink }}
      >
        {initials(player.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-600 leading-tight">{player.name}</span>
          {rarity && (
            <span
              className="shrink-0 rounded px-1 py-px text-[8px] font-700 uppercase tracking-wide"
              style={{ background: `${rarity.color}22`, color: rarity.color }}
              title={`${rarity.label} · ${player.editionTitle}`}
            >
              {player.editionTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <TeamBadge code={player.team} size="sm" className="!h-4 !w-4 !text-[7px] !rounded" />
          <span>{player.team}</span>
          <span className="text-slate-600">·</span>
          <span>{ROLE_SHORT[player.role]}</span>
          {trait && <span className="text-gold-soft" title={trait.label}>★</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 pr-1">
        {!bench && fit && (
          <span
            title={fit.synergy ? 'Perfect fit for this slot' : fit.ok ? 'Good fit' : 'Out of position'}
            className={cn(
              'text-xs',
              fit.synergy ? 'text-gold-soft' : fit.ok ? 'text-emerald-400/80' : 'text-red-400/80',
            )}
          >
            {fit.synergy ? '★' : fit.ok ? '✓' : '⚠'}
          </span>
        )}
        <div className="flex flex-col items-center">
          <span className="font-display text-base font-700" style={{ color: rarity ? rarity.color : meta.accent }}>
            {player.overallRating}
          </span>
          <span className="stat-label">OVR</span>
        </div>
      </div>
    </motion.div>
  );
}
