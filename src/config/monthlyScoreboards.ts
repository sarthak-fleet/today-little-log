export interface MonthlyScoreboardItemConfig {
  key: string;
  label: string;
  minScore?: number;
  maxScore: number;
  idealScore: number;
  criteria: string;
}

export interface MonthlyScoreboardConfig {
  month: string;
  trackingStartDate: string;
  items: MonthlyScoreboardItemConfig[];
  seededEntries?: MonthlyScoreboardEntryConfig[];
}

export interface MonthlyScoreboardEntryLogConfig {
  sourceKey: string;
  valueScore: number;
  valueText?: string;
}

export interface MonthlyScoreboardEntryConfig {
  date: string;
  lowScoreReason?: string;
  logs: MonthlyScoreboardEntryLogConfig[];
}

const monthlyScoreboards: Record<string, MonthlyScoreboardConfig> = {
  '2026-05': {
    month: '2026-05',
    trackingStartDate: '2026-05-05',
    seededEntries: [
      {
        date: '2026-05-05',
        lowScoreReason:
          'Got Stripe callback, got excited, got new laptop, and ended up setting things up very late at night.',
        logs: [
          { sourceKey: 'sleep', valueScore: 0 },
          { sourceKey: 'steps', valueScore: 10, valueText: '11.5k steps' },
          { sourceKey: 'focus-hours', valueScore: 12, valueText: '4 hours of focus work' },
          { sourceKey: 'exercise', valueScore: 0 },
          {
            sourceKey: 'journal-daily-tick',
            valueScore: 0,
            valueText: 'Did daily ticking only, no journal',
          },
          {
            sourceKey: 'diet',
            valueScore: 8,
            valueText: '100g+ protein, 20g+ fiber, 8h eating window, no junk',
          },
          { sourceKey: 'connections', valueScore: 3, valueText: 'Talked with friend a lot' },
          { sourceKey: 'adult-content', valueScore: 0 },
          { sourceKey: 'creatine-supplements', valueScore: 2 },
          { sourceKey: 'hygiene', valueScore: 4, valueText: 'Brush + bath done' },
          { sourceKey: 'sitting-entertainment', valueScore: -2, valueText: '1 extra hour' },
          { sourceKey: 'social-media', valueScore: 0, valueText: 'No usage' },
        ],
      },
    ],
    items: [
      {
        key: 'sleep',
        label: 'Sleep',
        maxScore: 14,
        idealScore: 14,
        criteria:
          '14 max. 7h sleep + 6am wake = 14. Start from 7 pts for ~7h sleep, subtract 1 for each 30 min short. Add 1 for each 30 min earlier than 8am, subtract 1 for each 30 min later than 8am. Do not go below 0.',
      },
      {
        key: 'steps',
        label: 'Steps',
        maxScore: 10,
        idealScore: 10,
        criteria: '1 point per 1,000 steps. 10k steps = 10. Cap at 10.',
      },
      {
        key: 'focus-hours',
        label: 'Focus hours',
        maxScore: 30,
        idealScore: 18,
        criteria:
          '3 points per intentional focus hour across projects, learning, exploration, or office work. 6h = ideal 18. Extra focus can score above ideal, capped at 30.',
      },
      {
        key: 'exercise',
        label: 'Exercise',
        maxScore: 10,
        idealScore: 8,
        criteria: 'Stretch, cardio, strength. 5 = any one mode. 8 = any two modes. 10 = all three.',
      },
      {
        key: 'journal-daily-tick',
        label: 'Journal + daily ticking',
        maxScore: 3,
        idealScore: 3,
        criteria: '3 = scoreboard filled, low-score reason entered when needed, and journal done.',
      },
      {
        key: 'diet',
        label: 'Diet',
        minScore: -3,
        maxScore: 9,
        idealScore: 8,
        criteria:
          'Protein 100g+ = +3. Fiber 20g+ = +2. Eating window: <=6h = +4, >6h to <=8h = +3, >8h to <=10h = +2, >10h = 0. Junk penalty: minor -1, moderate -2, major -3. Ideal is 8; perfect is 9.',
      },
      {
        key: 'connections',
        label: 'Connections',
        maxScore: 3,
        idealScore: 3,
        criteria:
          '3 = intentional connection: call, meaningful conversation, meet, or deliberate relationship effort.',
      },
      {
        key: 'adult-content',
        label: 'Adult content',
        minScore: -10,
        maxScore: 0,
        idealScore: 0,
        criteria: '0 = none. -10 = consumed adult content.',
      },
      {
        key: 'creatine-supplements',
        label: 'Creatine + supplements',
        maxScore: 2,
        idealScore: 2,
        criteria: '2 = creatine/supplements done.',
      },
      {
        key: 'hygiene',
        label: 'Hygiene',
        maxScore: 4,
        idealScore: 4,
        criteria: '4 = brush + bath / clean reset done.',
      },
      {
        key: 'sitting-entertainment',
        label: 'Sitting entertainment',
        minScore: -10,
        maxScore: 0,
        idealScore: 0,
        criteria:
          'Games, movies, shows, passive sitting entertainment. 0 = <=1h. -2 for each hour over 1h. Cap at -10.',
      },
      {
        key: 'social-media',
        label: 'Social media',
        minScore: -10,
        maxScore: 0,
        idealScore: 0,
        criteria: '0 = <=30 min or intentional use. -2 for every 30 min over 30 min. Cap at -10.',
      },
    ],
  },
};

export function getMonthlyScoreboardConfig(month: string): MonthlyScoreboardConfig | null {
  return monthlyScoreboards[month] ?? null;
}
