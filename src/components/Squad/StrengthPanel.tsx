import type { Composition, PlayerRole, TeamStrength } from '@/types';
import type { Chemistry, PositionAnalysis } from '@/engine';
import { RatingRing } from '@/components/Shared/RatingRing';
import { StatBar } from '@/components/Shared/StatBar';
import { ROLE_LABELS } from '@/data/teams';
import { SectionLabel } from '@/components/Shared/ui';
import { cn } from '@/utils';

interface StrengthPanelProps {
  strength: TeamStrength | null;
  roleBalance: Record<PlayerRole, number>;
  composition: Composition;
  chemistry: Chemistry;
  positions: PositionAnalysis;
  count: number;
}

const ROLE_ORDER: PlayerRole[] = ['BATTER', 'ALL_ROUNDER', 'WICKET_KEEPER', 'BOWLER'];

export function StrengthPanel({ strength, roleBalance, composition, chemistry, positions, count }: StrengthPanelProps) {
  const penalty = strength?.compositionModifier ?? 0;
  const misfits = positions.fits.filter((f) => !f.ok).length;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Squad Power</SectionLabel>
        <span className="text-xs text-slate-500">{count}/11</span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <RatingRing value={strength?.teamPower ?? 0} size={84} stroke={8} label="Power" />
        <div className="flex-1 space-y-2.5">
          <StatBar label="Batting" value={strength?.batting ?? 0} accent="#5ec0ff" />
          <StatBar label="Bowling" value={strength?.bowling ?? 0} accent="#ff8a5e" />
          <StatBar label="Fantasy" value={strength?.fantasy ?? 0} accent="#f5c542" />
        </div>
      </div>

      {/* Fair-play composition */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="stat-label">Fair-Play Balance</span>
          {penalty < 0 ? (
            <span className="pill bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">
              −{Math.abs(penalty)} power
            </span>
          ) : (
            count > 0 && (
              <span className="pill bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                Complete side
              </span>
            )
          )}
        </div>
        <div className="space-y-1.5">
          {composition.checks.map((c) => (
            <div key={c.key} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px]',
                  c.ok ? 'bg-emerald-500/25 text-emerald-300' : 'bg-red-500/20 text-red-300',
                )}
              >
                {c.ok ? '✓' : '!'}
              </span>
              <span className="flex-1 text-slate-300">{c.label}</span>
              <span className={cn('tabular-nums', c.ok ? 'text-slate-400' : 'text-red-300')}>
                {c.value}/{c.target}
              </span>
            </div>
          ))}
        </div>
        {penalty < 0 && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Incomplete sides are penalised equally for you and every franchise. Power before penalty:{' '}
            <span className="text-slate-300">{strength?.basePower ?? 0}</span>.
          </p>
        )}
      </div>

      {/* Chemistry */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="stat-label">Chemistry</span>
          {chemistry.powerBonus > 0 ? (
            <span className="pill bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
              +{chemistry.powerBonus} power
            </span>
          ) : (
            <span className="pill bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">no links yet</span>
          )}
        </div>
        {chemistry.links.length > 0 ? (
          <div className="space-y-1.5">
            {chemistry.links.slice(0, 3).map((link) => (
              <div key={`${link.kind}-${link.group}`} className="flex items-center gap-2 text-xs">
                <span className="shrink-0">{link.kind === 'club' ? '🔗' : '🌐'}</span>
                <span className="flex-1 truncate text-slate-300" title={link.players.join(', ')}>
                  <span className="font-600 text-slate-200">{link.group}</span>
                  <span className="text-slate-500"> · {link.players.length} linked</span>
                </span>
                <span className="tabular-nums text-emerald-300">+{link.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-500">
            Draft players from the same club or country to build chemistry and boost power.
          </p>
        )}
      </div>

      {/* Positional balance — right type in the right slot */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="stat-label">Positional Balance</span>
          {positions.modifier > 0 ? (
            <span className="pill bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
              +{positions.modifier} power
            </span>
          ) : positions.modifier < 0 ? (
            <span className="pill bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">
              {positions.modifier} power
            </span>
          ) : (
            <span className="pill bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">neutral</span>
          )}
        </div>
        <div className="space-y-1.5">
          {positions.checks.map((c) => (
            <div key={c.key} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px]',
                  c.ok ? 'bg-emerald-500/25 text-emerald-300' : 'bg-red-500/20 text-red-300',
                )}
              >
                {c.ok ? '✓' : '!'}
              </span>
              <span className="flex-1 text-slate-300">{c.label}</span>
              <span className={cn('truncate text-right text-[10px]', c.ok ? 'text-slate-500' : 'text-red-300')}>
                {c.ok ? 'ok' : `${c.misplaced} off`}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {misfits > 0
            ? `${misfits} player${misfits === 1 ? '' : 's'} out of position — a complete side needs the right type in every slot, not just the right counts.`
            : 'Balanced shape. Finishers at the death, specialist bowlers at 9–11 for trait bonuses.'}
        </p>
      </div>

      {/* Role tally */}
      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="stat-label mb-2">Role Balance</div>
        <div className="grid grid-cols-4 gap-2">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="rounded-lg bg-white/[0.04] px-2 py-2 text-center">
              <div className="font-display text-lg font-700 tabular-nums">{roleBalance[role]}</div>
              <div className="stat-label leading-tight">{ROLE_LABELS[role]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
