import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';
import { XP_REWARDS } from '@/lib/xp';

export interface WeightLog {
  id: string;
  date: string;
  kg: number;
  notes: string | null;
}

const GUEST_KEY = 'tll:guest-weight-logs';
const TARGET_KG_KEY = 'tll:weight-target-kg';

function readGuest(): WeightLog[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuest(rows: WeightLog[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
}

export function getTargetKg(): number {
  try {
    const v = localStorage.getItem(TARGET_KG_KEY);
    return v ? parseFloat(v) : 70;
  } catch {
    return 70;
  }
}

export function setTargetKg(kg: number) {
  try { localStorage.setItem(TARGET_KG_KEY, String(kg)); } catch { /* ignore */ }
}

export function useWeightLogs() {
  const { user, loading } = useAuth();
  const { award } = useUserStats();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      apiFetch<WeightLog[]>('/api/weight-logs')
        .then((rows) => setLogs(rows ?? []))
        .catch(() => {})
        .finally(() => setIsLoaded(true));
    } else {
      setLogs(readGuest());
      setIsLoaded(true);
    }
  }, [user, loading]);

  const logWeight = useCallback(
    async (date: string, kg: number, notes?: string) => {
      if (user) {
        const saved = await apiFetch<WeightLog>('/api/weight-logs', {
          method: 'POST',
          body: JSON.stringify({ date, kg, notes: notes ?? null }),
        });
        setLogs((prev) => {
          const rest = prev.filter((l) => l.date !== date);
          return [saved, ...rest].sort((a, b) => b.date.localeCompare(a.date));
        });
      } else {
        setLogs((prev) => {
          const rest = prev.filter((l) => l.date !== date);
          const next = [{ id: crypto.randomUUID(), date, kg, notes: notes ?? null }, ...rest].sort((a, b) => b.date.localeCompare(a.date));
          writeGuest(next);
          return next;
        });
      }
      await award(XP_REWARDS.WEIGHT_LOG, 1);
    },
    [user, award],
  );

  const remove = useCallback(
    async (id: string) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      if (user) {
        await apiFetch('/api/weight-logs', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {});
      } else {
        writeGuest(readGuest().filter((l) => l.id !== id));
      }
    },
    [user],
  );

  // Trajectory calc over the most recent 14 entries (log chronological oldest→newest).
  const trajectory = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const current = sorted[sorted.length - 1].kg;
    const target = getTargetKg();
    if (sorted.length < 2) {
      return { current, target, kgPerDay: 0, daysToTarget: null as number | null };
    }
    const recent = sorted.slice(-14);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const days = Math.max(1, (+new Date(last.date) - +new Date(first.date)) / 86_400_000);
    const kgPerDay = (last.kg - first.kg) / days;
    const remaining = current - target;
    const daysToTarget = kgPerDay < 0 && remaining > 0 ? Math.round(remaining / Math.abs(kgPerDay)) : null;
    return { current, target, kgPerDay, daysToTarget };
  }, [logs]);

  return { logs, isLoaded, logWeight, remove, trajectory };
}
