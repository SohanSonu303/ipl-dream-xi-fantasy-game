import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/utils';

/** Standard page enter/exit wrapper for route transitions. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative mx-auto w-full max-w-6xl px-4 sm:px-6', className)}
    >
      {children}
    </motion.main>
  );
}

/** Broadcast-style eyebrow label with a gold tick. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="h-3.5 w-1 rounded-full bg-gold" />
      <span className="text-xs font-700 uppercase tracking-[0.22em] text-slate-300">{children}</span>
    </div>
  );
}

/** App wordmark. */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-gold-soft to-gold-deep text-pitch-950 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M15 3l6 6-9 9-6 1 1-6 8-10z" />
        </svg>
      </span>
      <span className="heading-display text-sm font-700 uppercase tracking-[0.16em] text-slate-100">
        Dream XI
      </span>
    </div>
  );
}
