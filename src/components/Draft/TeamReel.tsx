import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TeamCode } from '@/types';
import { TEAM_CODES, TEAM_META } from '@/data/teams';
import { TeamBadge } from '@/components/Shared/TeamBadge';

interface TeamReelProps {
  rolling: boolean;
  settledTeam: TeamCode | null;
}

/**
 * Slot-machine style team reveal. While `rolling`, it flickers through random
 * franchises; once it settles, the drawn team locks in with a flourish.
 */
export function TeamReel({ rolling, settledTeam }: TeamReelProps) {
  const [flicker, setFlicker] = useState<TeamCode>(TEAM_CODES[0]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (rolling) {
      timer.current = window.setInterval(() => {
        setFlicker(TEAM_CODES[Math.floor(Math.random() * TEAM_CODES.length)]);
      }, 70);
    } else if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [rolling]);

  const showCode = rolling ? flicker : settledTeam;
  const meta = showCode ? TEAM_META[showCode] : null;

  return (
    <div className="relative grid place-items-center py-2">
      {/* glow */}
      {meta && (
        <div
          className="absolute h-40 w-40 rounded-full blur-3xl transition-colors duration-300"
          style={{ background: `${meta.accent}40` }}
        />
      )}

      <AnimatePresence mode="popLayout">
        {showCode ? (
          <motion.div
            key={rolling ? `flick-${showCode}` : `settled-${showCode}`}
            initial={rolling ? { opacity: 0.4, scale: 0.9 } : { opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={rolling ? { duration: 0.06 } : { type: 'spring', stiffness: 260, damping: 16 }}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            <div className="relative">
              {!rolling && (
                <span
                  className="absolute inset-0 rounded-xl"
                  style={{ boxShadow: `0 0 0 0 ${meta?.accent}` }}
                />
              )}
              <TeamBadge code={showCode} size="xl" />
            </div>
            {!rolling && meta && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center"
              >
                <div className="heading-display text-xl font-700 uppercase">{meta.name}</div>
                <div className="stat-label mt-0.5">Tap a player to draft</div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-10 grid h-24 w-24 place-items-center rounded-2xl border-2 border-dashed border-white/15 text-4xl text-white/30"
          >
            ?
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
