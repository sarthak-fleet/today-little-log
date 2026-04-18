import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface FoodItem {
  id: string;
  name: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  unit: string;
}

export interface FoodLogEntry {
  id: string;
  date: string;
  servings: number;
  meal_type: string | null;
  food_item_id: string;
  name: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  unit: string;
}

const TARGET_KEY = 'tll:macro-targets';
interface Targets { calories: number; protein_g: number; carbs_g: number; fat_g: number }
const DEFAULT_TARGETS: Targets = { calories: 2100, protein_g: 150, carbs_g: 200, fat_g: 70 };

export function getMacroTargets(): Targets {
  try {
    const raw = localStorage.getItem(TARGET_KEY);
    return raw ? { ...DEFAULT_TARGETS, ...JSON.parse(raw) } : DEFAULT_TARGETS;
  } catch { return DEFAULT_TARGETS; }
}
export function setMacroTargets(t: Partial<Targets>) {
  try { localStorage.setItem(TARGET_KEY, JSON.stringify({ ...getMacroTargets(), ...t })); } catch { /* ignore */ }
}

export function useFoodLog() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setIsLoaded(true); return; }
    Promise.all([
      apiFetch<FoodItem[]>('/api/food-items').catch(() => [] as FoodItem[]),
      apiFetch<FoodLogEntry[]>('/api/food-logs').catch(() => [] as FoodLogEntry[]),
    ])
      .then(([it, lg]) => { setItems(it ?? []); setLogs(lg ?? []); })
      .finally(() => setIsLoaded(true));
  }, [user, loading]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter((l) => l.date === today);

  const totals = useMemo(() => {
    return todayLogs.reduce(
      (acc, l) => {
        const m = l.servings;
        acc.calories += l.calories_per_serving * m;
        acc.protein_g += l.protein_g * m;
        acc.carbs_g += l.carbs_g * m;
        acc.fat_g += l.fat_g * m;
        return acc;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }, [todayLogs]);

  const addItem = useCallback(
    async (data: Omit<FoodItem, 'id'>): Promise<FoodItem | null> => {
      if (!user) return null;
      const saved = await apiFetch<FoodItem>('/api/food-items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setItems((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      return saved;
    },
    [user],
  );

  const logFood = useCallback(
    async (food_item_id: string, servings: number, meal_type?: string, date: string = today) => {
      if (!user) return;
      const saved = await apiFetch<{ id: string; date: string; servings: number; meal_type: string | null; food_item_id: string }>('/api/food-logs', {
        method: 'POST',
        body: JSON.stringify({ food_item_id, servings, meal_type, date }),
      });
      const it = items.find((i) => i.id === food_item_id);
      if (!it) return;
      const entry: FoodLogEntry = {
        id: saved.id,
        date: saved.date,
        servings: saved.servings,
        meal_type: saved.meal_type,
        food_item_id: saved.food_item_id,
        name: it.name,
        calories_per_serving: it.calories_per_serving,
        protein_g: it.protein_g,
        carbs_g: it.carbs_g,
        fat_g: it.fat_g,
        unit: it.unit,
      };
      setLogs((prev) => [entry, ...prev]);
    },
    [user, items, today],
  );

  const removeLog = useCallback(
    async (id: string) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      if (user) await apiFetch('/api/food-logs', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {});
    },
    [user],
  );

  return { items, logs, todayLogs, totals, targets: getMacroTargets(), isLoaded, addItem, logFood, removeLog };
}
