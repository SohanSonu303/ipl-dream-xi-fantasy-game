import type { TeamCode } from '@/types';
import { TEAM_META } from '@/data/teams';
import { cn } from '@/utils';

interface TeamBadgeProps {
  code: TeamCode | 'XI';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES: Record<NonNullable<TeamBadgeProps['size']>, string> = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-11 w-11 text-xs',
  lg: 'h-16 w-16 text-base',
  xl: 'h-24 w-24 text-xl',
};

/** Returns the accent palette for any badge code (user 'XI' uses gold). */
export function badgeAccents(code: TeamCode | 'XI'): { accent: string; accent2: string; ink: string } {
  if (code === 'XI') return { accent: '#f5c542', accent2: '#c9971f', ink: '#1a1400' };
  const m = TEAM_META[code];
  return { accent: m.accent, accent2: m.accent2, ink: m.ink };
}

export function TeamBadge({ code, size = 'md', className }: TeamBadgeProps) {
  const { accent, accent2, ink } = badgeAccents(code);
  return (
    <div
      className={cn(
        'relative grid place-items-center rounded-xl font-display font-700 uppercase shadow-inner-top ring-1 ring-white/20',
        SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(150deg, ${accent} 0%, ${accent2} 100%)`,
        color: ink,
      }}
    >
      <span className="drop-shadow-sm">{code}</span>
    </div>
  );
}
