/**
 * Dopamine economy — user pre-commits to rewards at XP prices.
 * Spending XP is logged via quick_logs (kind='redemption').
 * Catalog lives in localStorage so it's yours alone.
 */

const STORE_KEY = 'tll:rewards-catalog';

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export const DEFAULT_REWARDS: Reward[] = [
  { id: 'r-movie', name: '1 movie night', cost: 500 },
  { id: 'r-game', name: '1h guilt-free gaming', cost: 300 },
  { id: 'r-tv', name: '1 episode of anime/TV', cost: 150 },
  { id: 'r-cheat', name: 'Cheat meal', cost: 400 },
  { id: 'r-weekend', name: 'Full rest Saturday', cost: 800 },
];

export function readRewards(): Reward[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_REWARDS;
}

export function writeRewards(list: Reward[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function addReward(r: Reward) {
  const list = readRewards();
  writeRewards([...list, r]);
}

export function removeReward(id: string) {
  writeRewards(readRewards().filter((r) => r.id !== id));
}
