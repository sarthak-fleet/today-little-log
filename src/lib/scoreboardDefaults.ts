export type ScoreKind = 'check' | 'output';
export type ScoreCadence = 'daily' | 'weekly' | 'monthly';
export type ScoreCategory = 'daily' | 'weekly' | 'monthly' | 'not_to_do';

export interface DefaultScoreboardItem {
  label: string;
  kind: ScoreKind;
  cadence: ScoreCadence;
  category: ScoreCategory;
  position: number;
}

export const scoreCategoryBasePosition: Record<ScoreCategory, number> = {
  daily: 0,
  weekly: 1000,
  monthly: 2000,
  not_to_do: 3000,
};

export function categoryFromPosition(position: number): ScoreCategory {
  if (position >= scoreCategoryBasePosition.not_to_do) return 'not_to_do';
  if (position >= scoreCategoryBasePosition.monthly) return 'monthly';
  if (position >= scoreCategoryBasePosition.weekly) return 'weekly';
  return 'daily';
}

export function cadenceFromCategory(category: ScoreCategory): ScoreCadence {
  if (category === 'weekly') return 'weekly';
  if (category === 'monthly') return 'monthly';
  return 'daily';
}

const daily: Array<Pick<DefaultScoreboardItem, 'label' | 'kind'>> = [
  { label: 'Sleep', kind: 'check' },
  { label: 'Hygiene', kind: 'check' },
  { label: 'Diet', kind: 'check' },
  { label: 'Exercise', kind: 'check' },
  { label: 'Deep work', kind: 'output' },
  { label: 'Social life', kind: 'check' },
  { label: 'Read/listen', kind: 'check' },
  { label: 'Journal', kind: 'check' },
];

const weekly = [
  'Review',
  'Catch-up',
  'Network/outbound',
];

const monthly = [
  'Wealth sync',
];

const notToDos = [
  'No phone in bed',
  'No porn / doom scrolling',
  'No entertainment before deep work',
];

export const defaultScoreboardItems: DefaultScoreboardItem[] = [
  ...daily.map((item, index) => ({
    label: item.label,
    kind: item.kind,
    cadence: 'daily' as const,
    category: 'daily' as const,
    position: scoreCategoryBasePosition.daily + index,
  })),
  ...weekly.map((label, index) => ({
    label,
    kind: 'check' as const,
    cadence: 'weekly' as const,
    category: 'weekly' as const,
    position: scoreCategoryBasePosition.weekly + index,
  })),
  ...monthly.map((label, index) => ({
    label,
    kind: 'check' as const,
    cadence: 'monthly' as const,
    category: 'monthly' as const,
    position: scoreCategoryBasePosition.monthly + index,
  })),
  ...notToDos.map((label, index) => ({
    label,
    kind: 'check' as const,
    cadence: 'daily' as const,
    category: 'not_to_do' as const,
    position: scoreCategoryBasePosition.not_to_do + index,
  })),
];
