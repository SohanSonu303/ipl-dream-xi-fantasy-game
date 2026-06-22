import type { Player } from '@/types';
import { clamp, random, shuffle } from '@/utils';
import { getMatchup } from './matchupEngine';

// ---------------------------------------------------------------------------
// The playable final over, on a real field.
//
// The batter sits at the TOP, the bowler runs in from the BOTTOM. Each ball is
// a hidden contest: the bowler delivers one of five ball types (you don't know
// which until it arrives), and you commit a shot first. Every shot has
// deliveries it *punishes* and deliveries it's *dangerous* against — pull a
// short ball for six, but a yorker on the same shot bowls you. The score is
// settled by batter class − bowler class − head-to-head edge + the shot-vs-ball
// read + randomness, with the (unseen) field able to cut off a boundary or hold
// a catch. No gaps are shown — it's a read, not a cheat sheet.
//
// Geometry is normalised: centre (0,0), SVG y-axis points DOWN. The striker is
// above centre (negative y), the bowler below (positive y), so the scoring fan
// opens downward, in front of the batter.
// ---------------------------------------------------------------------------

export const FIELD_RX = 1;
export const FIELD_RY = 0.98;

export const STRIKER_POS = { x: 0, y: -0.52 };
export const KEEPER_POS = { x: 0, y: -0.74 };
export const BOWLER_POS = { x: 0, y: 0.5 };

export type ShotZoneKey = 'POINT' | 'COVER' | 'STRAIGHT' | 'MIDWICKET' | 'SQUARE_LEG';

export interface ShotZone {
  key: ShotZoneKey;
  /** Shot name shown on the control. */
  shot: string;
  /** Region name for commentary. */
  region: string;
  /** Angle in degrees, clockwise from straight (down, toward the bowler). */
  angle: number;
  side: 'off' | 'leg' | 'straight';
  /** Can this shot clear the rope (go aerial for six)? */
  aerial: boolean;
  /** 1 = safe, 3 = high risk / high reward. */
  risk: 1 | 2 | 3;
}

// Left → right across the front of the wicket.
export const SHOT_ZONES: ShotZone[] = [
  { key: 'POINT', shot: 'Cut', region: 'point', angle: -78, side: 'off', aerial: false, risk: 2 },
  { key: 'COVER', shot: 'Drive', region: 'the covers', angle: -38, side: 'off', aerial: false, risk: 1 },
  { key: 'STRAIGHT', shot: 'Loft', region: 'long-on', angle: 0, side: 'straight', aerial: true, risk: 3 },
  { key: 'MIDWICKET', shot: 'Flick', region: 'midwicket', angle: 38, side: 'leg', aerial: true, risk: 2 },
  { key: 'SQUARE_LEG', shot: 'Pull', region: 'square leg', angle: 78, side: 'leg', aerial: true, risk: 3 },
];

export type ShotChoice = ShotZoneKey | 'BLOCK';

// --- Deliveries -------------------------------------------------------------

export type DeliveryType = 'YORKER' | 'FULL' | 'LENGTH' | 'SHORT' | 'LOOSE';

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  YORKER: 'Yorker',
  FULL: 'Full',
  LENGTH: 'On a length',
  SHORT: 'Short',
  LOOSE: 'Loose',
};

/** Roll a hidden delivery — better bowlers land more yorkers and lengths. */
export function rollDelivery(bowler: Player): DeliveryType {
  const br = bowler.bowlingRating;
  const weights: Array<[DeliveryType, number]> = [
    ['YORKER', clamp(0.08 + (br - 70) / 120, 0.05, 0.34)],
    ['LENGTH', 0.28],
    ['FULL', 0.2],
    ['SHORT', 0.16],
    ['LOOSE', clamp(0.34 - (br - 70) / 120, 0.08, 0.4)],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = random() * total;
  for (const [d, w] of weights) {
    r -= w;
    if (r <= 0) return d;
  }
  return 'LENGTH';
}

type ShotMatch = 'ideal' | 'ok' | 'danger';

const IDEAL: Record<ShotZoneKey, DeliveryType[]> = {
  POINT: ['SHORT', 'LOOSE'],
  COVER: ['FULL', 'LENGTH'],
  STRAIGHT: ['FULL', 'LOOSE'],
  MIDWICKET: ['FULL', 'LENGTH'],
  SQUARE_LEG: ['SHORT', 'LOOSE'],
};
const DANGER: Record<ShotZoneKey, DeliveryType[]> = {
  POINT: ['YORKER', 'FULL'],
  COVER: ['SHORT'],
  STRAIGHT: ['YORKER'],
  MIDWICKET: ['SHORT', 'LOOSE'],
  SQUARE_LEG: ['YORKER', 'FULL'],
};

function shotMatch(key: ShotZoneKey, delivery: DeliveryType): ShotMatch {
  if (IDEAL[key].includes(delivery)) return 'ideal';
  if (DANGER[key].includes(delivery)) return 'danger';
  return 'ok';
}

/**
 * Delivery probability weights for this bowler — same values used internally
 * by rollDelivery, exposed so the UI can show tendency bars before each ball.
 */
export function getDeliveryWeights(
  bowler: Player,
): Array<{ type: DeliveryType; label: string; pct: number }> {
  const br = bowler.bowlingRating;
  const raw: Array<[DeliveryType, number]> = [
    ['YORKER', clamp(0.08 + (br - 70) / 120, 0.05, 0.34)],
    ['LENGTH', 0.28],
    ['FULL', 0.2],
    ['SHORT', 0.16],
    ['LOOSE', clamp(0.34 - (br - 70) / 120, 0.08, 0.4)],
  ];
  const total = raw.reduce((s, [, w]) => s + w, 0);
  return raw.map(([type, w]) => ({
    type,
    label: DELIVERY_LABEL[type],
    pct: Math.round((w / total) * 100),
  }));
}

/** How a shot reads against a known delivery — for UI coaching when Cricket Brain is active. */
export function getShotMatch(choice: ShotZoneKey, delivery: DeliveryType): ShotMatch {
  return shotMatch(choice, delivery);
}

// --- Field ------------------------------------------------------------------

export interface Fielder {
  id: string;
  x: number;
  y: number;
  deep: boolean;
  zone?: ShotZoneKey;
}

export interface Field {
  fielders: Fielder[];
  /** Zones with no deep rider — kept hidden from the UI now. */
  openZones: ShotZoneKey[];
}

const RAD = Math.PI / 180;

/** A point at fractional radius `r` along a zone angle, from the field centre. */
function pointAt(angle: number, r: number): { x: number; y: number } {
  const t = angle * RAD;
  return { x: FIELD_RX * r * Math.sin(t), y: FIELD_RY * r * Math.cos(t) };
}

function zoneOf(key: ShotZoneKey): ShotZone {
  return SHOT_ZONES.find((z) => z.key === key)!;
}

/**
 * Set a death field with the full XI on show: keeper, bowler, a slip, an
 * infielder in every zone, and deep riders on three zones (the other two are
 * left open — the scoring gaps, now unmarked). Eleven in all.
 */
export function buildField(): Field {
  const order = shuffle(SHOT_ZONES.map((z) => z.key));
  const protectedZones = order.slice(0, 3);
  const openZones = order.slice(3);

  const fielders: Fielder[] = [
    { id: 'keeper', x: KEEPER_POS.x, y: KEEPER_POS.y, deep: false },
    { id: 'bowler', x: BOWLER_POS.x, y: BOWLER_POS.y, deep: false },
    // Slip / short third, just behind square.
    { id: 'slip', x: -0.18, y: KEEPER_POS.y + 0.05, deep: false },
  ];

  // An infielder in every zone (saving the single).
  for (const z of SHOT_ZONES) {
    const p = pointAt(z.angle, 0.42);
    fielders.push({ id: `in_${z.key}`, x: p.x, y: p.y, deep: false, zone: z.key });
  }
  // Boundary riders on the protected zones.
  for (const key of protectedZones) {
    const p = pointAt(zoneOf(key).angle, 0.85);
    fielders.push({ id: `deep_${key}`, x: p.x, y: p.y, deep: true, zone: key });
  }

  return { fielders, openZones };
}

function deepFielder(field: Field, key: ShotZoneKey): Fielder | undefined {
  return field.fielders.find((f) => f.deep && f.zone === key);
}
function anyFielder(field: Field, key: ShotZoneKey): Fielder {
  return field.fielders.find((f) => f.zone === key) ?? field.fielders[0];
}

/** ~N(0,1) in [-2,2] via the central-limit trick. */
function bell(): number {
  return random() + random() + random() + random() - 2;
}

// --- Resolution -------------------------------------------------------------

export type ShotKind = 'dot' | 'run' | 'four' | 'six' | 'wicket';

export interface ShotResult {
  runs: number;
  wicket: boolean;
  label: string;
  text: string;
  kind: ShotKind;
  /** Where the ball ends up, in normalised field space (for the animation). */
  landing: { x: number; y: number };
  aerial: boolean;
  zone?: ShotZoneKey;
  delivery: DeliveryType;
  deliveryLabel: string;
}

export function resolveShot(
  bowler: Player,
  batter: Player,
  choice: ShotChoice,
  field: Field,
  /** Pitch/conditions tilt on the contest (+ helps the batter). */
  contestDelta = 0,
  /** Pre-revealed delivery (from Cricket Brain). Skips the random roll when set. */
  forcedDelivery?: DeliveryType,
): ShotResult {
  const delivery = forcedDelivery ?? rollDelivery(bowler);
  const dLabel = DELIVERY_LABEL[delivery];
  const edge = getMatchup(bowler, batter).edge; // + = bowler has the wood

  // Defensive shot: very low risk, low reward.
  if (choice === 'BLOCK') {
    const wP = clamp(0.015 + (delivery === 'YORKER' ? 0.02 : 0) + edge * 0.01, 0.005, 0.06);
    if (random() < wP) {
      return mk(0, true, `${dLabel} sneaks through the defence — bowled!`, 'wicket', { x: 0, y: STRIKER_POS.y + 0.14 }, false, delivery, dLabel);
    }
    const one = random() < 0.3;
    return mk(one ? 1 : 0, false, one ? `${dLabel}, dabbed for a single.` : `${dLabel}, solid defence. Dot ball.`, one ? 'run' : 'dot', { x: one ? 0.12 : 0, y: -0.2 }, false, delivery, dLabel);
  }

  const zone = zoneOf(choice);
  const match = shotMatch(choice, delivery);
  const batC = batter.battingRating;
  const bowlC = bowler.bowlingRating;

  // Contest score — higher is better for the batter.
  let c =
    50 +
    (batC - 72) * 0.7 -
    (bowlC - 80) * 0.7 -
    edge * 22 +
    bell() * 24 +
    contestDelta +
    (match === 'ideal' ? 16 : match === 'danger' ? -20 : 0);

  // Wicket chance — danger balls and a beaten contest get you out.
  let wP = (match === 'danger' ? 0.18 : match === 'ok' ? 0.055 : 0.025) * (1.25 - batC / 100) * (1 + edge * 0.35);
  if (c < 22) wP += 0.08;
  wP = clamp(wP, 0.01, 0.5);

  if (random() < wP) {
    const bowled = delivery === 'YORKER';
    const f = bowled ? null : deepFielder(field, choice) ?? anyFielder(field, choice);
    const where = bowled
      ? `${dLabel} crashes into the stumps — ${zone.shot} too early, BOWLED!`
      : delivery === 'SHORT'
        ? `Top-edges the ${zone.shot.toLowerCase()} — skies it, caught!`
        : `Goes for the ${zone.shot.toLowerCase()} but picks out ${zone.region} — caught!`;
    return mk(0, true, where, 'wicket', f ? { x: f.x, y: f.y } : { x: 0, y: STRIKER_POS.y + 0.1 }, !bowled, delivery, dLabel, choice);
  }

  c = clamp(c, 0, 100);
  const protectedZone = !field.openZones.includes(choice);

  // Boundary band — lowered threshold so good contact more often finds the rope.
  if (c >= 58) {
    const sixP = clamp((c - 62) / 22 + (batC - 80) / 200 + (match === 'ideal' ? 0.12 : 0), 0.14, 0.88);
    const goesSix = zone.aerial && c >= 64 && random() < sixP;

    // The unseen field: a deep rider can swallow a big one or save the four.
    if (protectedZone) {
      if (goesSix && random() < 0.14) {
        const f = deepFielder(field, choice)!;
        return mk(0, true, `Launched — but holed out to the man at deep ${zone.region}!`, 'wicket', { x: f.x, y: f.y }, true, delivery, dLabel, choice);
      }
      if (!goesSix) {
        const f = deepFielder(field, choice)!;
        return mk(2, false, `${zone.shot} well struck but the deep rider at ${zone.region} cuts it off — two.`, 'run', { x: f.x * 0.92, y: f.y * 0.92 }, false, delivery, dLabel, choice);
      }
    }

    const land = pointAt(zone.angle, goesSix ? 1.03 : 0.97);
    return goesSix
      ? mk(6, false, `${zone.shot} — SIX! Sailed over ${zone.region}!`, 'six', land, true, delivery, dLabel, choice)
      : mk(4, false, `${zone.shot} races away through ${zone.region} — FOUR!`, 'four', land, false, delivery, dLabel, choice);
  }

  // Worked into the field for ones and twos.
  if (c >= 44) {
    const f = deepFielder(field, choice) ?? anyFielder(field, choice);
    return mk(2, false, `${zone.shot} placed toward ${zone.region} — they come back for two.`, 'run', { x: f.x * 0.85, y: f.y * 0.85 }, false, delivery, dLabel, choice);
  }
  if (c >= 28) {
    const inf = pointAt(zone.angle, 0.38);
    return mk(1, false, `${zone.shot} into the infield at ${zone.region} — single.`, 'run', inf, false, delivery, dLabel, choice);
  }
  return mk(0, false, `${dLabel} — beaten by it, no run.`, 'dot', pointAt(zone.angle, 0.22), false, delivery, dLabel, choice);
}

function mk(
  runs: number,
  wicket: boolean,
  text: string,
  kind: ShotKind,
  landing: { x: number; y: number },
  aerial: boolean,
  delivery: DeliveryType,
  deliveryLabel: string,
  zone?: ShotZoneKey,
): ShotResult {
  const label = wicket ? 'W' : runs === 0 ? '•' : runs === 4 ? 'FOUR' : runs === 6 ? 'SIX' : String(runs);
  return { runs, wicket, label, text, kind, landing, aerial, zone, delivery, deliveryLabel };
}
