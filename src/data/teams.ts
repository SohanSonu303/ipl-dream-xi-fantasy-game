import type { TeamCode } from '@/types';

export interface TeamMeta {
  code: TeamCode;
  name: string;
  short: string;
  /** Primary accent used for glows, borders, bars. */
  accent: string;
  /** Secondary accent for gradients. */
  accent2: string;
  /** Readable text color on top of the accent. */
  ink: string;
}

export const TEAM_META: Record<TeamCode, TeamMeta> = {
  CSK: { code: 'CSK', name: 'Chennai Super Kings', short: 'Chennai', accent: '#fdb913', accent2: '#1a4ea3', ink: '#1a1400' },
  MI: { code: 'MI', name: 'Mumbai Indians', short: 'Mumbai', accent: '#2e86de', accent2: '#d4af37', ink: '#04101f' },
  RCB: { code: 'RCB', name: 'Royal Challengers Bengaluru', short: 'Bengaluru', accent: '#e63946', accent2: '#1a1a1a', ink: '#ffffff' },
  KKR: { code: 'KKR', name: 'Kolkata Knight Riders', short: 'Kolkata', accent: '#7b3fa0', accent2: '#f5c542', ink: '#ffffff' },
  SRH: { code: 'SRH', name: 'Sunrisers Hyderabad', short: 'Hyderabad', accent: '#ff7a1a', accent2: '#000000', ink: '#1a0d00' },
  GT: { code: 'GT', name: 'Gujarat Titans', short: 'Gujarat', accent: '#1b6ca8', accent2: '#bb9a4a', ink: '#ffffff' },
  RR: { code: 'RR', name: 'Rajasthan Royals', short: 'Rajasthan', accent: '#e6478b', accent2: '#0a1f5c', ink: '#ffffff' },
  PBKS: { code: 'PBKS', name: 'Punjab Kings', short: 'Punjab', accent: '#d11f2d', accent2: '#b0b0b0', ink: '#ffffff' },
  DC: { code: 'DC', name: 'Delhi Capitals', short: 'Delhi', accent: '#2561c9', accent2: '#e03a3e', ink: '#ffffff' },
  LSG: { code: 'LSG', name: 'Lucknow Super Giants', short: 'Lucknow', accent: '#21a0a0', accent2: '#0c2c63', ink: '#ffffff' },
};

export const TEAM_CODES = Object.keys(TEAM_META) as TeamCode[];

export const ROLE_LABELS: Record<string, string> = {
  BATTER: 'Batter',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-Rounder',
  WICKET_KEEPER: 'Wk-Batter',
};

export const ROLE_SHORT: Record<string, string> = {
  BATTER: 'BAT',
  BOWLER: 'BOWL',
  ALL_ROUNDER: 'AR',
  WICKET_KEEPER: 'WK',
};
