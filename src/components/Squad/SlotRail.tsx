import { motion } from 'framer-motion';
import type { Player, SquadSlot } from '@/types';
import { SQUAD_SIZE } from '@/engine';
import { TEAM_META } from '@/data/teams';
import { cn, initials } from '@/utils';

interface SlotRailProps {
  squad: SquadSlot[];
  pendingPlayer: Player | null;
  onAssign: (position: number) => void;
  className?: string;
}

/**
 * Compact, numbers-only squad rail for narrow screens. It sits beside the draft
 * pack so a picked player can be slotted with one tap — no scrolling down to the
 * full squad board. Filled slots show the player's monogram in team colours;
 * empty slots glow and become tappable while a pick is pending.
 */
export function SlotRail({ squad, pendingPlayer, onAssign, className }: SlotRailProps) {
  const byPosition = new Map(squad.map((s) => [s.position, s]));
  const assigning = Boolean(pendingPlayer);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="stat-label text-center">XI</span>
      {Array.from({ length: SQUAD_SIZE }, (_, pos) => {
        const slot = byPosition.get(pos);

        if (slot) {
          const meta = TEAM_META[slot.player.team];
          return (
            <div
              key={pos}
              title={`${pos + 1}. ${slot.player.name}`}
              className="relative grid h-9 place-items-center overflow-hidden rounded-lg ring-1 ring-white/15"
              style={{
                background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`,
                color: meta.ink,
              }}
            >
              <span className="text-[11px] font-700 leading-none">{initials(slot.player.name)}</span>
              <span className="absolute left-0.5 top-0.5 text-[8px] font-700 leading-none opacity-70">
                {pos + 1}
              </span>
            </div>
          );
        }

        const selectable = assigning;
        return (
          <motion.button
            key={pos}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onAssign(pos)}
            whileTap={selectable ? { scale: 0.9 } : undefined}
            className={cn(
              'grid h-9 place-items-center rounded-lg border text-xs font-700 tabular-nums transition-colors',
              selectable
                ? 'cursor-pointer animate-pulse border-gold/70 bg-gold/15 text-gold-soft'
                : 'border-dashed border-white/15 text-slate-500',
            )}
          >
            {pos + 1}
          </motion.button>
        );
      })}
    </div>
  );
}
