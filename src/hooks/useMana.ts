import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';

export interface ManaState {
  date: string;
  daily_max: number;
  bank_remaining: number;
}

export function useMana() {
  const { user, loading } = useAuth();
  const [state, setState] = useState<ManaState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setIsLoaded(true); return; }
    apiFetch<ManaState>('/api/mana')
      .then(setState)
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, [user, loading]);

  const setDailyMax = useCallback(async (daily_max: number) => {
    const next = await apiFetch<ManaState>('/api/mana', { method: 'POST', body: JSON.stringify({ daily_max }) });
    setState(next);
  }, []);

  const spend = useCallback(async (cost: number) => {
    const next = await apiFetch<ManaState>('/api/mana', { method: 'POST', body: JSON.stringify({ delta: -cost }) });
    setState(next);
  }, []);

  const refund = useCallback(async (cost: number) => {
    const next = await apiFetch<ManaState>('/api/mana', { method: 'POST', body: JSON.stringify({ delta: cost }) });
    setState(next);
  }, []);

  return { state, isLoaded, setDailyMax, spend, refund };
}
