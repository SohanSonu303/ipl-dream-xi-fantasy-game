import type { SquadSlot } from '@/types';

// ---------------------------------------------------------------------------
// Compact, URL-safe encoding of a drafted XI so a team can be shared as a link
// (#/vs/<code>) and a friend can play head-to-head against it. The code carries
// only what's needed to reconstruct the side: player ids by position, the
// captain, and the team name. Ratings/traits are looked up from the dataset.
// ---------------------------------------------------------------------------

export interface SharedTeam {
  name: string;
  captainId: number | null;
  /** [position, playerId] pairs. */
  slots: Array<[number, number]>;
}

interface PackedTeam {
  v: 1;
  n: string;
  c: number; // captain id, -1 for none
  s: Array<[number, number]>;
}

function b64urlEncode(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(code: string): string {
  let b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  // Re-add the padding we stripped on encode — browser atob() rejects unpadded.
  while (b64.length % 4 !== 0) b64 += '=';
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeTeam(team: SharedTeam): string {
  const packed: PackedTeam = {
    v: 1,
    n: team.name.slice(0, 24),
    c: team.captainId ?? -1,
    s: team.slots,
  };
  return b64urlEncode(JSON.stringify(packed));
}

export function decodeTeam(code: string): SharedTeam | null {
  try {
    // Some share targets append the message onto the URL (e.g. ".../vs/CODE Can
    // you beat...?"). Keep only the leading run of valid base64url characters.
    const clean = (code.match(/^[A-Za-z0-9\-_]+/) ?? [''])[0];
    if (!clean) return null;
    const packed = JSON.parse(b64urlDecode(clean)) as Partial<PackedTeam>;
    if (packed.v !== 1 || !Array.isArray(packed.s)) return null;
    const slots = packed.s.filter(
      (pair): pair is [number, number] =>
        Array.isArray(pair) && pair.length === 2 && pair.every((n) => Number.isFinite(n)),
    );
    if (slots.length !== 11) return null;
    return {
      name: typeof packed.n === 'string' && packed.n ? packed.n : 'Rival XI',
      captainId: typeof packed.c === 'number' && packed.c >= 0 ? packed.c : null,
      slots,
    };
  } catch {
    return null;
  }
}

/** Encode a drafted squad straight from the store shape (XI only, no bench). */
export function encodeSquad(
  squad: SquadSlot[],
  captainId: number | null,
  name: string,
): string {
  return encodeTeam({
    name,
    captainId,
    slots: squad.filter((s) => s.position < 11).map((s) => [s.position, s.player.id]),
  });
}

/** Full shareable challenge URL for the current host (works with HashRouter). */
export function buildChallengeUrl(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/vs/${code}`;
}
