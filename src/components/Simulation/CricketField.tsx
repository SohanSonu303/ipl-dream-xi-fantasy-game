import { AnimatePresence, motion } from 'framer-motion';
import type { Field, ShotKind } from '@/engine';
import type { BatsHand } from '@/data/playerMeta';
import { BOWLER_POS, KEEPER_POS, STRIKER_POS } from '@/engine';

// ---------------------------------------------------------------------------
// The death-over field. Batter at the TOP, bowler at the BOTTOM. Renders the
// oval, the 30-yard ring, the pitch and the opposition's fielders, then flies
// the ball in two phases: the delivery (bowler → batter), then the shot
// (batter → wherever it ends up).
// ---------------------------------------------------------------------------

const SCALE = 150;
const CX = 160;
const CY = 160;

function px(p: { x: number; y: number }) {
  return { cx: CX + p.x * SCALE, cy: CY + p.y * SCALE };
}

export interface BallFlight {
  to: { x: number; y: number };
  kind: ShotKind;
  aerial: boolean;
  /** Delivery name to flash as the ball reaches the bat. */
  deliveryLabel: string;
  /** Bumped every shot so the ball re-animates from scratch. */
  key: number;
}

interface CricketFieldProps {
  field: Field;
  flight: BallFlight | null;
  bowlerName: string;
  strikerName: string;
  /** A left-hander's field is the mirror image of a right-hander's. */
  hand?: BatsHand;
}

export function CricketField({ field, flight, bowlerName, strikerName, hand = 'R' }: CricketFieldProps) {
  const striker = px(STRIKER_POS);
  const keeper = px(KEEPER_POS);
  const bowler = px(BOWLER_POS);
  // Mirror everything off the central pitch line for a left-hander, so the
  // scoring areas and the shot directions are correct for that hand.
  const mirror = hand === 'L' ? `translate(${CX * 2},0) scale(-1,1)` : undefined;

  return (
    <div className="relative">
      <svg viewBox="0 0 320 332" className="w-full select-none" role="img" aria-label="Cricket field">
        <defs>
          <radialGradient id="turf" cx="50%" cy="55%" r="65%">
            <stop offset="0%" stopColor="#3f9d52" />
            <stop offset="70%" stopColor="#2f7d40" />
            <stop offset="100%" stopColor="#246233" />
          </radialGradient>
          <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d9c79a" />
            <stop offset="100%" stopColor="#c9b27e" />
          </linearGradient>
        </defs>

        {/* Outfield */}
        <ellipse cx={CX} cy={CY} rx={SCALE} ry={SCALE * 0.98} fill="url(#turf)" stroke="#ffffff" strokeWidth={2.5} strokeOpacity={0.85} />
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse key={i} cx={CX} cy={CY} rx={SCALE - i * 24} ry={SCALE * 0.98 - i * 23} fill="none" stroke="#ffffff" strokeOpacity={i % 2 ? 0.04 : 0.07} strokeWidth={12} />
        ))}
        {/* 30-yard ring */}
        <ellipse cx={CX} cy={CY} rx={SCALE * 0.5} ry={SCALE * 0.5} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" />

        {/* Pitch (striker top → bowler bottom) */}
        <rect x={CX - 9} y={striker.cy - 4} width={18} height={bowler.cy - striker.cy + 8} rx={3} fill="url(#pitch)" stroke="#b6a06f" strokeWidth={0.5} />
        <line x1={CX - 9} y1={striker.cy} x2={CX + 9} y2={striker.cy} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} />
        <line x1={CX - 9} y1={bowler.cy} x2={CX + 9} y2={bowler.cy} stroke="#fff" strokeOpacity={0.7} strokeWidth={1} />

        {/* Mirrored group: off-centre fielders + the ball flip for a lefty,
            while the centred keeper/bowler/striker labels stay upright. */}
        <g transform={mirror}>
          {field.fielders.map((fl) => {
            if (fl.id === 'keeper' || fl.id === 'bowler') return null;
            const p = px(fl);
            return <circle key={fl.id} cx={p.cx} cy={p.cy} r={fl.deep ? 5 : 4.2} fill="#fb923c" stroke="#7c2d12" strokeWidth={1} />;
          })}
          {flight && <Ball key={flight.key} bowler={bowler} striker={striker} to={px(flight.to)} flight={flight} />}
        </g>

        {/* Keeper (behind striker, at top) */}
        <circle cx={keeper.cx} cy={keeper.cy} r={4.5} fill="#fb923c" stroke="#7c2d12" strokeWidth={1} />

        {/* Bowler (bottom) */}
        <circle cx={bowler.cx} cy={bowler.cy} r={4.8} fill="#f87171" stroke="#7f1d1d" strokeWidth={1} />
        <text x={bowler.cx} y={bowler.cy + 14} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fecaca">{shortName(bowlerName)}</text>

        {/* Striker — you (top) */}
        <circle cx={striker.cx} cy={striker.cy} r={5.5} fill="#f5c542" stroke="#7c5e08" strokeWidth={1.2} />
        <text x={striker.cx} y={striker.cy - 10} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fde68a">{shortName(strikerName)}</text>
      </svg>

      {/* Delivery-type flash, timed to the ball reaching the bat */}
      <AnimatePresence>
        {flight && (
          <motion.div
            key={flight.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, 1, 0], y: 0 }}
            transition={{ duration: 1, times: [0, 0.3, 0.7, 1], delay: DELIVERY_MS / 1000 }}
            className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-pitch-950/80 px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wide text-gold-soft ring-1 ring-gold/30"
          >
            {flight.deliveryLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Time (ms) for the delivery leg, bowler → bat. */
const DELIVERY_MS = 420;

function Ball({
  bowler,
  striker,
  to,
  flight,
}: {
  bowler: { cx: number; cy: number };
  striker: { cx: number; cy: number };
  to: { cx: number; cy: number };
  flight: BallFlight;
}) {
  // Shot leg geometry (bat → landing), with an arc when aerial.
  const dist = Math.hypot(to.cx - striker.cx, to.cy - striker.cy);
  const arc = flight.aerial ? Math.min(48, dist * 0.45) : 0;
  const midX = (striker.cx + to.cx) / 2;
  const midY = (striker.cy + to.cy) / 2 - arc;

  const shotDur = flight.kind === 'six' ? 0.8 : flight.kind === 'four' ? 0.66 : 0.5;
  const deliveryDur = DELIVERY_MS / 1000;
  const total = deliveryDur + shotDur;
  // Keyframe times across the whole sequence: bowler → bat → mid → landing.
  const tBat = deliveryDur / total;
  const tMid = tBat + (shotDur / total) * 0.5;
  const r = flight.kind === 'six' || flight.kind === 'four' ? 4.5 : 4;

  return (
    <>
      <motion.circle
        r={r}
        fill="#e2e8f0"
        stroke="#b91c1c"
        strokeWidth={1.4}
        initial={{ cx: bowler.cx, cy: bowler.cy }}
        animate={{ cx: [bowler.cx, striker.cx, midX, to.cx], cy: [bowler.cy, striker.cy, midY, to.cy] }}
        transition={{ duration: total, ease: 'easeOut', times: [0, tBat, tMid, 1] }}
      />
      {/* Contact spark at the bat */}
      <motion.circle
        cx={striker.cx}
        cy={striker.cy}
        fill="none"
        stroke="#f5c542"
        strokeWidth={2}
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: [0, 10], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.3, delay: deliveryDur, times: [0, 0.4, 1] }}
      />
      {/* Landing flash */}
      <motion.circle
        cx={to.cx}
        cy={to.cy}
        fill="none"
        stroke={flight.kind === 'wicket' ? '#ef4444' : flight.kind === 'six' || flight.kind === 'four' ? '#f5c542' : '#e2e8f0'}
        strokeWidth={2}
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: [0, 16], opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.5, delay: total, times: [0, 0.4, 1] }}
      />
    </>
  );
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : `${parts[0][0]} ${parts[parts.length - 1]}`;
}
