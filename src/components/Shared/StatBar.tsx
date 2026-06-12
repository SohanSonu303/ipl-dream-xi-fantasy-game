import { cn } from '@/utils';

interface StatBarProps {
  label: string;
  value: number; // 0-100
  accent?: string;
  className?: string;
  showValue?: boolean;
}

/** Labelled horizontal meter for batting / bowling / fantasy strengths. */
export function StatBar({ label, value, accent = '#f5c542', className, showValue = true }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="stat-label">{label}</span>
        {showValue && <span className="font-display text-sm font-600 tabular-nums">{Math.round(value)}</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}aa, ${accent})`,
            boxShadow: `0 0 12px ${accent}66`,
            transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}
