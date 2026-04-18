import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';

export type GoalCategory = 'dev' | 'weight' | 'career' | 'other';

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  target_date: string | null;
  target_value_num: number | null;
  target_value_text: string | null;
  probability: number;
  created_at: string;
  updated_at: string;
}

export interface GoalAction {
  id: string;
  goal_id: string;
  action_at: string;
  delta: number;
  source: string | null;
  note: string | null;
}

export function useGoals() {
  const { user, loading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<GoalAction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setIsLoaded(true); return; }
    Promise.all([
      apiFetch<Goal[]>('/api/goals').catch(() => [] as Goal[]),
      apiFetch<GoalAction[]>('/api/goal-actions').catch(() => [] as GoalAction[]),
    ]).then(([g, a]) => {
      setGoals(g ?? []);
      setActions(a ?? []);
    }).finally(() => setIsLoaded(true));
  }, [user, loading]);

  const createGoal = useCallback(async (data: Omit<Goal, 'id' | 'probability' | 'created_at' | 'updated_at'>) => {
    const saved = await apiFetch<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(data) });
    setGoals((prev) => [...prev, saved]);
    return saved;
  }, []);

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    const saved = await apiFetch<Goal>('/api/goals', { method: 'PATCH', body: JSON.stringify({ id, ...patch }) });
    setGoals((prev) => prev.map((g) => (g.id === id ? saved : g)));
    return saved;
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await apiFetch('/api/goals', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {});
  }, []);

  const nudge = useCallback(async (goal_id: string, delta: number, source?: string, note?: string) => {
    const { action, probability } = await apiFetch<{ action: GoalAction; probability: number }>('/api/goal-actions', {
      method: 'POST',
      body: JSON.stringify({ goal_id, delta, source, note }),
    });
    setActions((prev) => [action, ...prev]);
    setGoals((prev) => prev.map((g) => (g.id === goal_id ? { ...g, probability } : g)));
  }, []);

  return { goals, actions, isLoaded, createGoal, updateGoal, deleteGoal, nudge };
}
