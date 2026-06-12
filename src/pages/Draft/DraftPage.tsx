import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MAX_REROLLS,
  SQUAD_SIZE,
  useComposition,
  useGameStore,
  useRoleBalance,
  useSelectablePlayers,
  useSquadStrength,
} from '@/store/gameStore';
import { PlayerCard } from '@/components/Shared/PlayerCard';
import { TeamReel } from '@/components/Draft/TeamReel';
import { SquadBoard } from '@/components/Squad/SquadBoard';
import { SlotRail } from '@/components/Squad/SlotRail';
import { StrengthPanel } from '@/components/Squad/StrengthPanel';
import { PageTransition, Brand, SectionLabel } from '@/components/Shared/ui';
import { cn } from '@/utils';

export function DraftPage() {
  const navigate = useNavigate();
  const {
    squad,
    teamName,
    currentTeam,
    isRolling,
    pendingPlayer,
    rerollsUsed,
    setTeamName,
    rollTeam,
    reroll,
    pickPlayer,
    cancelPick,
    assignToPosition,
    removeFromSquad,
  } = useGameStore();

  const pool = useSelectablePlayers();
  const strength = useSquadStrength();
  const roleBalance = useRoleBalance();
  const composition = useComposition();

  const isFull = squad.length >= SQUAD_SIZE;
  const canRoll = !currentTeam && !pendingPlayer && !isRolling && !isFull;
  const canReroll = Boolean(currentTeam) && !pendingPlayer && !isRolling && rerollsUsed < MAX_REROLLS;

  // Auto-roll the very first team so the board is never blank on arrival.
  useEffect(() => {
    if (squad.length === 0 && !currentTeam && !isRolling && rerollsUsed === 0) {
      rollTeam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goSimulate = () => navigate('/simulate');

  return (
    <PageTransition className="pb-28">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <button onClick={() => navigate('/')} className="transition-opacity hover:opacity-80">
          <Brand />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="stat-label">Team Name</span>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={24}
              className="w-40 bg-transparent text-right font-display text-sm font-600 uppercase tracking-wide text-gold-soft outline-none placeholder:text-slate-600"
              placeholder="My Dream XI"
            />
          </div>
          <div className="h-8 w-px bg-white/10" />
          <RerollPips used={rerollsUsed} />
        </div>
      </header>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel>Draft Squad</SectionLabel>
          <span className="font-display text-sm font-700 tabular-nums">
            {squad.length}
            <span className="text-slate-500">/{SQUAD_SIZE}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold-deep"
            initial={false}
            animate={{ width: `${(squad.length / SQUAD_SIZE) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* ---- Draft stage ---- */}
        <section className="order-1">
          {isFull ? (
            <SquadCompleteCard onSimulate={goSimulate} power={strength?.teamPower ?? 0} />
          ) : (
            <div className="panel p-4 sm:p-5">
              <TeamReel rolling={isRolling} settledTeam={currentTeam} />

              {/* Controls */}
              <div className="mt-3 flex items-center justify-center gap-3">
                {canRoll && (
                  <button onClick={rollTeam} className="btn-primary px-8">
                    {squad.length === 0 ? 'Roll First Team' : 'Roll Next Team'}
                  </button>
                )}
                {canReroll && (
                  <button onClick={reroll} className="btn-ghost">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Reroll · {MAX_REROLLS - rerollsUsed} left
                  </button>
                )}
                {isRolling && <span className="text-sm text-slate-400">Rolling…</span>}
              </div>

              {/* Assign banner */}
              <AnimatePresence>
                {pendingPlayer && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2"
                  >
                    <span className="text-sm">
                      Placing <strong className="text-gold-soft">{pendingPlayer.name}</strong> — choose a squad slot →
                    </span>
                    <button onClick={cancelPick} className="text-xs font-600 uppercase tracking-wide text-slate-300 hover:text-white">
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player pool — compact slot rail (mobile/tablet) sits beside the pack
                  so a pick can be slotted with one tap, no scrolling. */}
              <div className="mt-4 flex gap-2.5">
                <SlotRail
                  squad={squad}
                  pendingPlayer={pendingPlayer}
                  onAssign={assignToPosition}
                  className="w-11 shrink-0 lg:hidden"
                />
                <div className="min-w-0 flex-1">
                  {currentTeam && !isRolling ? (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <SectionLabel>Pick One</SectionLabel>
                        <span className="text-xs text-slate-500">{pool.length} revealed</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                          {pool.map((player, i) => (
                            <PlayerCard
                              key={player.id}
                              player={player}
                              index={i}
                              onSelect={pickPlayer}
                              selected={pendingPlayer?.id === player.id}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                      <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                        A random hand — the rest are hidden, so you can’t always grab the top star.
                        {pendingPlayer ? ' Tap a number on the left to slot your pick.' : ''}
                      </p>
                      {pool.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">
                          Every player from this franchise is already drafted. Reroll for a new team.
                        </p>
                      )}
                    </>
                  ) : (
                    !isRolling && (
                      <p className="grid h-full place-items-center py-10 text-center text-sm text-slate-500">
                        Roll a franchise to reveal its players.
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ---- Squad + strength ---- */}
        <section className="order-2 space-y-5 lg:sticky lg:top-4 lg:self-start">
          <StrengthPanel
            strength={strength}
            roleBalance={roleBalance}
            composition={composition}
            count={squad.length}
          />
          <div className="panel p-4">
            <SectionLabel className="mb-3">Your XI</SectionLabel>
            <SquadBoard
              squad={squad}
              pendingPlayer={pendingPlayer}
              onAssign={assignToPosition}
              onRemove={removeFromSquad}
            />
          </div>
        </section>
      </div>

      {/* Sticky simulate bar when full */}
      <AnimatePresence>
        {isFull && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-pitch-900/90 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="stat-label">Squad complete</div>
                <div className="truncate font-display text-base font-700 uppercase">
                  {teamName} · Power {strength?.teamPower ?? 0}
                </div>
              </div>
              <button onClick={goSimulate} className="btn-primary shrink-0 px-8">
                Simulate Season
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function RerollPips({ used }: { used: number }) {
  return (
    <div className="flex flex-col items-end">
      <span className="stat-label">Rerolls</span>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: MAX_REROLLS }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              i < MAX_REROLLS - used ? 'bg-gold shadow-glow' : 'bg-white/15',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SquadCompleteCard({ onSimulate, power }: { onSimulate: () => void; power: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel relative overflow-hidden p-8 text-center"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(245,197,66,0.18),transparent_60%)]" />
      <span className="pill mx-auto border border-gold/30 bg-gold/10 text-gold-soft">XI Locked In</span>
      <h2 className="heading-display mt-4 text-3xl font-700 uppercase">Your Dream XI is ready</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-300">
        Eleven drafted, balanced and rated. Team Power sits at{' '}
        <strong className="text-gold-soft">{power}</strong>. Time to chase the trophy.
      </p>
      <button onClick={onSimulate} className="btn-primary mx-auto mt-6 px-10 py-4 text-lg">
        Simulate Season
      </button>
    </motion.div>
  );
}
