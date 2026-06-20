import type { SeasonOutcome } from '@/types';
import { hashString } from '@/utils';

// ---------------------------------------------------------------------------
// Daily Challenge: one shared, reproducible draw per calendar day. Everyone who
// plays "today" rolls from the same seeded RNG stream, so the same decisions
// yield the same result — a fair, Wordle-style puzzle you can compare with
// friends. Results are stored locally so the day can't be re-rolled for a better
// score, and a streak rewards coming back.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'dreamxi:daily:v1';
/** Anchor date for the human-friendly "Daily #N" counter. */
const EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01

/** Local calendar day key, e.g. "2026-06-20". */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Seed for the day — identical for every player on the same date. */
export function dailySeed(d: Date = new Date()): number {
  return hashString(`dreamxi-${todayKey(d)}`);
}

/** Sequential puzzle number for display ("Daily #171"). */
export function dailyNumber(d: Date = new Date()): number {
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(1, Math.floor((today - EPOCH) / 86_400_000) + 1);
}

export interface DailyRecord {
  date: string;
  outcome: SeasonOutcome;
  position: number;
  won: number;
  lost: number;
  points: number;
  teamPower: number;
  teamName: string;
  playedAt: number;
}

interface DailyStore {
  results: Record<string, DailyRecord>;
}

function load(): DailyStore {
  if (typeof localStorage === 'undefined') return { results: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { results: {} };
    const parsed = JSON.parse(raw) as Partial<DailyStore>;
    return { results: parsed.results ?? {} };
  } catch {
    return { results: {} };
  }
}

function save(store: DailyStore): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable — non-fatal, daily just won't persist */
  }
}

/** The stored result for a given day, if it has been played. */
export function getDailyRecord(date: Date = new Date()): DailyRecord | null {
  return load().results[todayKey(date)] ?? null;
}

export function hasPlayedToday(date: Date = new Date()): boolean {
  return getDailyRecord(date) != null;
}

/** Persist today's result (first play wins; never overwrites). */
export function recordDailyResult(record: Omit<DailyRecord, 'playedAt'>): void {
  const store = load();
  if (store.results[record.date]) return; // already locked in for the day
  store.results[record.date] = { ...record, playedAt: Date.now() };
  save(store);
}

/** Count of consecutive days played, ending today or yesterday. */
export function currentStreak(date: Date = new Date()): number {
  const store = load();
  let streak = 0;
  const cursor = new Date(date);

  // Allow the streak to count even if today hasn't been played yet (it stays
  // alive until the day ends), so check from today backwards.
  if (!store.results[todayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);

  while (store.results[todayKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Total Daily Challenges ever completed. */
export function totalDailiesPlayed(): number {
  return Object.keys(load().results).length;
}
