import { cn } from '@/utils';

interface RatingRingProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  accent?: string;
  className?: string;
}

/** Circular gauge used for overall rating / team power. */
export function RatingRing({
  value,
  size = 64,
  stroke = 6,
  label,
  accent = '#f5c542',
  className,
}: RatingRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${accent}80)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <span className="font-display text-lg font-700">{Math.round(value)}</span>
        {label && <span className="stat-label mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
