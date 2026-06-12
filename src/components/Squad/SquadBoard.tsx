import { AnimatePresence, motion } from 'framer-motion';
import type { Player, SquadSlot } from '@/types';
import { SQUAD_SIZE } from '@/engine';
import { TEAM_META, ROLE_SHORT } from '@/data/teams';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { cn, initials } from '@/utils';

/** Positional hints — purely cosmetic; any player may fill any slot. */
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
  onRemove: (position: number) => void;
}

export function SquadBoard({ squad, pendingPlayer, onAssign, onRemove }: SquadBoardProps) {
  const byPosition = new Map(squad.map((s) => [s.position, s]));
  const assigning = Boolean(pendingPlayer);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: SQUAD_SIZE }, (_, pos) => {
        const slot = byPosition.get(pos);
        const empty = !slot;
        const selectable = assigning && empty;

        return (
          <div key={pos} className="relative">
            <AnimatePresence mode="popLayout">
              {slot ? (
                <FilledSlot key="filled" slot={slot} onRemove={() => onRemove(pos)} />
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
                    {pos + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="stat-label">{SLOT_HINTS[pos]}</div>
                    <div className="text-xs text-slate-500">{selectable ? 'Place here' : 'Empty slot'}</div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function FilledSlot({ slot, onRemove }: { slot: SquadSlot; onRemove: () => void }) {
  const { player } = slot;
  const meta = TEAM_META[player.team];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="group flex h-[58px] w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-pitch-800 px-2.5"
      style={{ boxShadow: `inset 3px 0 0 ${meta.accent}` }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-sm font-700 ring-1 ring-white/15"
        style={{ background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`, color: meta.ink }}
      >
        {initials(player.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-600 leading-tight">{player.name}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <TeamBadge code={player.team} size="sm" className="!h-4 !w-4 !text-[7px] !rounded" />
          <span>{player.team}</span>
          <span className="text-slate-600">·</span>
          <span>{ROLE_SHORT[player.role]}</span>
        </div>
      </div>
      <div className="flex flex-col items-center pr-0.5">
        <span className="font-display text-base font-700" style={{ color: meta.accent }}>
          {player.overallRating}
        </span>
        <span className="stat-label">OVR</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${player.name}`}
        className="ml-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-red-500/20 hover:text-red-300"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}
