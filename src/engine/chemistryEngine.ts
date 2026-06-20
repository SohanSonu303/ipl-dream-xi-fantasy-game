import type { Player } from '@/types';
import { TEAM_META } from '@/data/teams';
import { getCountry } from '@/data/playerMeta';
import { clamp, round } from '@/utils';

// ---------------------------------------------------------------------------
// Squad chemistry. Players who share an IPL franchise or a national side have
// built-in understanding, which boosts the XI's power. It's a draft lever: do
// you grab the best player on offer, or the one who links with your side? This
// is a *user* perk (like the captain) — franchises are left at clean, real
// strength so they remain the benchmark you're trying to beat.
// ---------------------------------------------------------------------------

/** Display points per shared pair (flavour shown in the UI). */
const CLUB_PAIR_POINTS = 2;
const COUNTRY_PAIR_POINTS = 1;

/** Power conversion (a light nudge — chemistry flavours, it doesn't decide games). */
const CLUB_PAIR_POWER = 0.15;
const COUNTRY_PAIR_POWER = 0.06;
const POWER_CAP = 1;

export interface ChemistryLink {
  kind: 'club' | 'country';
  group: string;
  /** Player names in this linked group. */
  players: string[];
  /** Display chemistry points contributed by this group. */
  points: number;
}

export interface Chemistry {
  clubPairs: number;
  countryPairs: number;
  /** Flavour total: clubPairs·5 + countryPairs·3. */
  points: number;
  /** Power points added to the XI (capped). */
  powerBonus: number;
  /** Notable linked groups (size ≥ 2), strongest first. */
  links: ChemistryLink[];
}

/** Pairs within a group of n: n·(n-1)/2. */
function pairs(n: number): number {
  return (n * (n - 1)) / 2;
}

function groupBy(players: Player[], key: (p: Player) => string | null): Map<string, Player[]> {
  const map = new Map<string, Player[]>();
  for (const p of players) {
    const k = key(p);
    if (!k) continue;
    const list = map.get(k);
    if (list) list.push(p);
    else map.set(k, [p]);
  }
  return map;
}

export function analyzeChemistry(players: Player[]): Chemistry {
  const byClub = groupBy(players, (p) => p.team);
  const byCountry = groupBy(players, (p) => getCountry(p.id));

  let clubPairs = 0;
  let countryPairs = 0;
  const links: ChemistryLink[] = [];

  for (const [code, group] of byClub) {
    if (group.length < 2) continue;
    const n = pairs(group.length);
    clubPairs += n;
    links.push({
      kind: 'club',
      group: TEAM_META[group[0].team]?.short ?? code,
      players: group.map((p) => p.name),
      points: n * CLUB_PAIR_POINTS,
    });
  }

  for (const [country, group] of byCountry) {
    if (group.length < 2) continue;
    const n = pairs(group.length);
    countryPairs += n;
    links.push({
      kind: 'country',
      group: country,
      players: group.map((p) => p.name),
      points: n * COUNTRY_PAIR_POINTS,
    });
  }

  links.sort((a, b) => b.points - a.points);

  const powerBonus = round(
    clamp(clubPairs * CLUB_PAIR_POWER + countryPairs * COUNTRY_PAIR_POWER, 0, POWER_CAP),
    1,
  );

  return {
    clubPairs,
    countryPairs,
    points: clubPairs * CLUB_PAIR_POINTS + countryPairs * COUNTRY_PAIR_POINTS,
    powerBonus,
    links,
  };
}

export { CLUB_PAIR_POINTS, COUNTRY_PAIR_POINTS };
