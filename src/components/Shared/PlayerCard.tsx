import { motion } from 'framer-motion';
import type { Player } from '@/types';
import { TEAM_META, ROLE_LABELS, ROLE_SHORT } from '@/data/teams';
import { cn, initials } from '@/utils';

interface PlayerCardProps {
  player: Player;
  onSelect?: (player: Player) => void;
  selected?: boolean;
  disabled?: boolean;
  index?: number;
  /** Compact card omits the stat bars (used in tight squad slots). */
  compact?: boolean;
  /** Marks this player as the team captain with a (C) badge. */
  captain?: boolean;
  /** Signature trait label, shown as a chip. */
  trait?: string;
}

export function PlayerCard({
  player,
  onSelect,
  selected = false,
  disabled = false,
  index = 0,
  compact = false,
  captain = false,
  trait,
}: PlayerCardProps) {
  const meta = TEAM_META[player.team];
  const interactive = Boolean(onSelect) && !disabled;

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 16, rotateX: -6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={interactive ? { y: -6, scale: 1.015 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      onClick={interactive ? () => onSelect?.(player) : undefined}
      disabled={!interactive}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-colors',
        'bg-gradient-to-b from-pitch-800 to-pitch-900',
        selected ? 'border-gold ring-2 ring-gold/60' : 'border-white/10',
        interactive ? 'cursor-pointer hover:border-white/25' : 'cursor-default',
        disabled && 'opacity-50 saturate-50',
      )}
    >
      {/* Accent header strip */}
      <div
        className="relative h-1 w-full sm:h-1.5"
        style={{ background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent2})` }}
      />

      {captain && (
        <span
          className="absolute left-2 top-2.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-gold font-display text-[10px] font-700 text-pitch-950 shadow-glow"
          title="Captain"
        >
          C
        </span>
      )}

      {/* Top row: team + role + overall */}
      <div className="flex items-start justify-between px-2 pt-2 sm:px-3 sm:pt-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className="pill px-1.5 py-0.5 text-[9px] sm:px-2 sm:text-[10px]"
            style={{ background: `${meta.accent}22`, color: meta.accent }}
          >
            {player.team}
          </span>
          <span className="stat-label truncate">{compact ? ROLE_SHORT[player.role] : ROLE_LABELS[player.role]}</span>
        </div>
        <div className="flex flex-col items-center">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-700 sm:h-11 sm:w-11 sm:rounded-xl sm:text-lg"
            style={{ background: `${meta.accent}1a`, color: meta.accent, boxShadow: `inset 0 0 0 1px ${meta.accent}55` }}
          >
            {player.overallRating}
          </span>
          <span className="stat-label mt-0.5">OVR</span>
        </div>
      </div>

      {/* Monogram "portrait" */}
      <div className="relative mx-2 mt-1.5 grid place-items-center overflow-hidden rounded-xl py-2.5 sm:mx-3 sm:mt-2 sm:py-4">
        <div
          className="absolute inset-0 opacity-90"
          style={{ background: `radial-gradient(circle at 50% 35%, ${meta.accent}33, transparent 70%)` }}
        />
        <div
          className="relative grid h-11 w-11 place-items-center rounded-full font-display text-lg font-700 ring-2 ring-white/15 sm:h-16 sm:w-16 sm:text-2xl"
          style={{
            background: `linear-gradient(160deg, ${meta.accent}, ${meta.accent2})`,
            color: meta.ink,
          }}
        >
          {initials(player.name)}
        </div>
      </div>

      {/* Name */}
      <div className="px-2 pb-1 sm:px-3">
        <h3 className="heading-display truncate text-[12px] font-600 leading-tight sm:text-[15px]" title={player.name}>
          {player.name}
        </h3>
        {trait && compact && (
          <span className="mt-0.5 block truncate text-[9px] font-600 uppercase tracking-wide text-gold-soft" title={trait}>
            ★ {trait}
          </span>
        )}
      </div>

      {/* Stats */}
      {!compact && (
        <div className="space-y-1.5 px-2 pb-2.5 pt-1 sm:space-y-2 sm:px-3 sm:pb-3">
          <MiniStat label="BAT" value={player.battingRating} accent={meta.accent} />
          <MiniStat label="BOWL" value={player.bowlingRating} accent={meta.accent} />
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <span className="stat-label min-w-0 truncate">Fantasy</span>
            <span className="pill shrink-0 bg-gold/15 px-2 py-0.5 text-[10px] text-gold-soft sm:text-xs">
              ★ {player.fantasyWeight.toFixed(2)}
            </span>
          </div>
          {trait && (
            <div className="flex items-center gap-1 rounded-lg border border-gold/25 bg-gold/10 px-2 py-1">
              <span className="text-[10px]">★</span>
              <span className="truncate text-[10px] font-600 uppercase tracking-wide text-gold-soft" title={trait}>
                {trait}
              </span>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="absolute right-2 top-3 grid h-6 w-6 place-items-center rounded-full bg-gold text-pitch-950 shadow-glow">
          <CheckIcon />
        </div>
      )}
    </motion.button>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="stat-label w-8 shrink-0 sm:w-9">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${value}%`, background: accent, boxShadow: `0 0 8px ${accent}66` }}
        />
      </div>
      <span className="w-6 text-right font-display text-xs font-600 tabular-nums sm:w-7">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M4 10l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
