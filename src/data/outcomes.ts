import type { SeasonOutcome } from '@/types';

export interface OutcomeMeta {
  label: string;
  headline: string;
  emoji: string;
  accent: string;
  blurb: string;
}

export const OUTCOME_META: Record<SeasonOutcome, OutcomeMeta> = {
  CHAMPION: {
    label: 'Champions',
    headline: 'You Won The Title!',
    emoji: '🏆',
    accent: '#f5c542',
    blurb: 'Glory! Your Dream XI lifted the trophy in front of a roaring stadium.',
  },
  RUNNER_UP: {
    label: 'Runners-Up',
    headline: 'So Close — Finalists',
    emoji: '🥈',
    accent: '#cbd5e1',
    blurb: 'You went all the way to the Final. Heartbreak by a whisker.',
  },
  QUALIFIER_2_EXIT: {
    label: 'Qualifier 2 Exit',
    headline: 'Out In Qualifier 2',
    emoji: '🔥',
    accent: '#fb923c',
    blurb: 'One win from the Final, but the run ended in Qualifier 2.',
  },
  ELIMINATOR_EXIT: {
    label: 'Eliminator Exit',
    headline: 'Knocked Out — Eliminator',
    emoji: '⚡',
    accent: '#60a5fa',
    blurb: 'You made the playoffs but fell at the Eliminator hurdle.',
  },
  FAILED_TO_QUALIFY: {
    label: 'Missed Playoffs',
    headline: 'Just Missed Out',
    emoji: '💔',
    accent: '#94a3b8',
    blurb: 'A tough league campaign — the top four stayed out of reach this time.',
  },
};
