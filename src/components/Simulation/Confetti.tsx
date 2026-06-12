import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { randomFloat, randomInt } from '@/utils';

const COLORS = ['#f5c542', '#ffe08a', '#5ec0ff', '#ff8a5e', '#7b3fa0', '#e6478b', '#21a0a0'];

/** Lightweight falling confetti burst for the champion celebration. */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: randomFloat(0, 100),
        delay: randomFloat(0, 1.2),
        duration: randomFloat(2.4, 4.2),
        size: randomInt(6, 11),
        color: COLORS[i % COLORS.length],
        rotate: randomInt(-180, 180),
        drift: randomFloat(-60, 60),
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: '-10%', x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '110%', x: p.drift, opacity: [0, 1, 1, 0.9], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
