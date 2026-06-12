import type { Player } from '@/types';
import { TEAM_META, ROLE_SHORT } from '@/data/teams';
import { ordinal } from '@/utils';

export interface ShareImageInput {
  teamName: string;
  season: string;
  emoji: string;
  headline: string;
  accent: string;
  position: number;
  totalTeams: number;
  won: number;
  lost: number;
  points: number;
  teamPower: number;
  batting: number;
  bowling: number;
  fantasy: number;
  championName: string;
  players: Player[];
}

const W = 1080;
const H = 1350;
const PAD = 72;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Pick a font size that makes `text` fit within `maxWidth`. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  startSize: number,
  family: string,
): number {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const DISPLAY = "'Oswald', 'Barlow Condensed', system-ui, sans-serif";
const BODY = "'Inter', system-ui, sans-serif";

/**
 * Render the shareable team card to a PNG blob using the Canvas 2D API so it is
 * fully self-contained (no DOM-to-image library, no font/CORS surprises).
 */
export async function generateShareImage(d: ShareImageInput): Promise<Blob> {
  // Ensure the web fonts used by the rest of the app are ready before drawing.
  try {
    await (document.fonts?.ready ?? Promise.resolve());
  } catch {
    /* fonts optional — fall back to system fonts */
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0c1120');
  bg.addColorStop(1, '#05070f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent glow top-centre
  const glow = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 640);
  glow.addColorStop(0, 'rgba(245,197,66,0.18)');
  glow.addColorStop(1, 'rgba(245,197,66,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 520);

  // Top accent bar
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#ffe08a');
  bar.addColorStop(1, '#c9971f');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W, 10);

  ctx.textBaseline = 'alphabetic';

  // Eyebrow
  ctx.fillStyle = '#f5c542';
  ctx.font = `700 26px ${BODY}`;
  ctx.letterSpacing = '4px';
  ctx.fillText(`IPL DREAM XI · ${d.season.toUpperCase()}`, PAD, 92);
  ctx.letterSpacing = '0px';

  // Team name
  ctx.fillStyle = '#ffffff';
  const nameUpper = d.teamName.toUpperCase();
  fitFont(ctx, nameUpper, W - 2 * PAD, 700, 80, DISPLAY);
  ctx.fillText(nameUpper, PAD, 172);

  // Outcome (emoji + headline)
  ctx.font = `400 60px ${BODY}`;
  ctx.fillText(d.emoji, PAD, 256);
  const emojiW = ctx.measureText(d.emoji).width + 22;
  ctx.fillStyle = d.accent;
  const headUpper = d.headline.toUpperCase();
  fitFont(ctx, headUpper, W - PAD - (PAD + emojiW), 700, 46, DISPLAY);
  ctx.fillText(headUpper, PAD + emojiW, 250);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 296);
  ctx.lineTo(W - PAD, 296);
  ctx.stroke();

  // Stat tiles
  const tiles = [
    { v: ordinal(d.position), l: `OF ${d.totalTeams}` },
    { v: `${d.won}–${d.lost}`, l: 'W – L' },
    { v: String(d.points), l: 'POINTS' },
    { v: String(d.teamPower), l: 'TEAM POWER' },
  ];
  const tileGap = 18;
  const tileW = (W - 2 * PAD - tileGap * (tiles.length - 1)) / tiles.length;
  const tileY = 326;
  const tileH = 132;
  tiles.forEach((t, i) => {
    const x = PAD + i * (tileW + tileGap);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, x, tileY, tileW, tileH, 18);
    ctx.fill();
    ctx.fillStyle = i === 0 || i === 3 ? '#f5c542' : '#ffffff';
    ctx.font = `700 50px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText(t.v, x + tileW / 2, tileY + 74);
    ctx.fillStyle = '#8b94a7';
    ctx.font = `700 19px ${BODY}`;
    ctx.letterSpacing = '2px';
    ctx.fillText(t.l, x + tileW / 2, tileY + 104);
    ctx.letterSpacing = '0px';
  });
  ctx.textAlign = 'left';

  // Secondary line + champion
  ctx.fillStyle = '#aab2c2';
  ctx.font = `600 24px ${BODY}`;
  ctx.fillText(`BAT ${d.batting}   ·   BOWL ${d.bowling}   ·   FANTASY ${d.fantasy}`, PAD, 512);
  ctx.fillStyle = '#f5c542';
  ctx.font = `600 24px ${BODY}`;
  const champLabel = `🏆 Champions: ${d.championName}`;
  fitFont(ctx, champLabel, W - 2 * PAD, 600, 24, BODY);
  ctx.fillText(champLabel, PAD, 552);

  // XI heading
  ctx.fillStyle = '#f5c542';
  roundRect(ctx, PAD, 588, 6, 24, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 30px ${DISPLAY}`;
  ctx.letterSpacing = '2px';
  ctx.fillText('YOUR DREAM XI', PAD + 20, 610);
  ctx.letterSpacing = '0px';

  // XI rows
  const startY = 632;
  const rowH = 60;
  d.players.forEach((p, i) => {
    const meta = TEAM_META[p.team];
    const top = startY + i * rowH;
    const cy = top + rowH / 2;

    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      roundRect(ctx, PAD - 8, top + 4, W - 2 * PAD + 16, rowH - 8, 12);
      ctx.fill();
    }

    // Team chip
    const chipW = 88;
    const chipH = 40;
    const chip = ctx.createLinearGradient(PAD, cy - chipH / 2, PAD + chipW, cy + chipH / 2);
    chip.addColorStop(0, meta.accent);
    chip.addColorStop(1, meta.accent2);
    ctx.fillStyle = chip;
    roundRect(ctx, PAD, cy - chipH / 2, chipW, chipH, 10);
    ctx.fill();
    ctx.fillStyle = meta.ink;
    ctx.font = `700 22px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText(p.team, PAD + chipW / 2, cy + 8);
    ctx.textAlign = 'left';

    // OVR (far right)
    ctx.fillStyle = '#f5c542';
    ctx.font = `700 34px ${DISPLAY}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(p.overallRating), W - PAD, cy + 12);

    // Role short (left of OVR)
    ctx.fillStyle = '#8b94a7';
    ctx.font = `700 20px ${BODY}`;
    ctx.fillText(ROLE_SHORT[p.role], W - PAD - 78, cy + 8);
    ctx.textAlign = 'left';

    // Name (fit between chip and role)
    ctx.fillStyle = '#ffffff';
    const nameX = PAD + chipW + 24;
    const nameMax = W - PAD - 190 - nameX;
    fitFont(ctx, p.name, nameMax, 600, 30, BODY);
    ctx.fillText(p.name, nameX, cy + 10);
  });

  // Footer
  ctx.fillStyle = '#5b6478';
  ctx.font = `700 22px ${BODY}`;
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillText('DRAFT · SIMULATE · CHASE THE TITLE', W / 2, H - 44);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
