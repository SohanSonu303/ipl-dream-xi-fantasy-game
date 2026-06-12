import { motion } from 'framer-motion';
import type { Standing } from '@/types';
import { TeamBadge } from '@/components/Shared/TeamBadge';
import { cn } from '@/utils';

interface LeagueTableProps {
  standings: Standing[];
  highlightUserId: string;
  /** Stagger rows in on mount (used on the reveal screen). */
  animate?: boolean;
}

export function LeagueTable({ standings, highlightUserId, animate = false }: LeagueTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="grid grid-cols-[28px_1fr_28px_28px_28px_36px_48px] items-center gap-1 bg-white/[0.04] px-3 py-2 text-[10px] font-700 uppercase tracking-wider text-slate-400 sm:grid-cols-[32px_1fr_32px_32px_32px_40px_56px] sm:gap-2 sm:px-4">
        <span>#</span>
        <span>Team</span>
        <span className="text-center">P</span>
        <span className="text-center">W</span>
        <span className="text-center">L</span>
        <span className="text-center">Pts</span>
        <span className="text-right">NRR</span>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {standings.map((s, i) => {
          const isUser = s.team.id === highlightUserId;
          const qualifies = s.position <= 4;
          return (
            <motion.div
              key={s.team.id}
              initial={animate ? { opacity: 0, x: -16 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: animate ? i * 0.07 : 0, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'grid grid-cols-[28px_1fr_28px_28px_28px_36px_48px] items-center gap-1 px-3 py-2 text-sm sm:grid-cols-[32px_1fr_32px_32px_32px_40px_56px] sm:gap-2 sm:px-4',
                isUser ? 'bg-gold/15' : qualifies ? 'bg-emerald-500/[0.06]' : '',
              )}
            >
              <span className="flex items-center">
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-md font-display text-xs font-700 tabular-nums',
                    qualifies ? 'bg-emerald-500/25 text-emerald-200' : 'text-slate-400',
                  )}
                >
                  {s.position}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <TeamBadge code={s.team.code} size="sm" />
                <span className={cn('truncate font-600', isUser && 'text-gold-soft')}>
                  {s.team.name}
                  {isUser && <span className="ml-1 text-[10px] uppercase text-gold/70">· You</span>}
                </span>
              </span>
              <span className="text-center tabular-nums text-slate-300">{s.played}</span>
              <span className="text-center tabular-nums text-slate-200">{s.won}</span>
              <span className="text-center tabular-nums text-slate-400">{s.lost}</span>
              <span className="text-center font-display font-700 tabular-nums">{s.points}</span>
              <span className={cn('text-right tabular-nums', s.netRating >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                {s.netRating >= 0 ? '+' : ''}
                {s.netRating.toFixed(1)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
