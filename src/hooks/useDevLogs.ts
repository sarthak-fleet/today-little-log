import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';
import { XP_REWARDS } from '@/lib/xp';
import { format } from 'date-fns';

export interface DevLog {
  id: string;
  date: string;
  leetcode_count: number;
  deep_work_minutes: number;
  commits: number;
  summary: string | null;
}

const GUEST_KEY = 'tll:guest-dev-logs';

function readGuest(): DevLog[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeGuest(r: DevLog[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}

export function useDevLogs() {
  const { user, loading } = useAuth();
  const { award } = useUserStats();
  const [logs, setLogs] = useState<DevLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      apiFetch<DevLog[]>('/api/dev-logs')
        .then((r) => setLogs(r ?? []))
        .catch(() => {})
        .finally(() => setIsLoaded(true));
    } else {
      setLogs(readGuest());
      setIsLoaded(true);
    }
  }, [user, loading]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLog = logs.find((l) => l.date === today);

  const save = useCallback(
    async (patch: Partial<Omit<DevLog, 'id' | 'date'>>, date: string = today) => {
      const wasEmpty = !todayLog || (todayLog.leetcode_count === 0 && todayLog.deep_work_minutes === 0 && todayLog.commits === 0);

      if (user) {
        const saved = await apiFetch<DevLog>('/api/dev-logs', {
          method: 'POST',
          body: JSON.stringify({ date, ...patch }),
        });
        setLogs((prev) => {
          const rest = prev.filter((l) => l.date !== date);
          return [saved, ...rest].sort((a, b) => b.date.localeCompare(a.date));
        });
      } else {
        setLogs((prev) => {
          const existing = prev.find((l) => l.date === date);
          const rest = prev.filter((l) => l.date !== date);
          const merged: DevLog = {
            id: existing?.id ?? crypto.randomUUID(),
            date,
            leetcode_count: patch.leetcode_count ?? existing?.leetcode_count ?? 0,
            deep_work_minutes: patch.deep_work_minutes ?? existing?.deep_work_minutes ?? 0,
            commits: patch.commits ?? existing?.commits ?? 0,
            summary: patch.summary ?? existing?.summary ?? null,
          };
          const next = [merged, ...rest].sort((a, b) => b.date.localeCompare(a.date));
          writeGuest(next);
          return next;
        });
      }

      if (wasEmpty) {
        // Reward for first-touch today; deep-work minutes drive XP.
        const dw = patch.deep_work_minutes ?? 0;
        await award(XP_REWARDS.TASK_DONE + Math.floor(dw / 15), 1);
      }
    },
    [user, award, today, todayLog],
  );

  const weekSummary = useMemo(() => {
    const last7 = logs.slice(0, 7);
    return {
      leetcode: last7.reduce((s, l) => s + l.leetcode_count, 0),
      deepWork: last7.reduce((s, l) => s + l.deep_work_minutes, 0),
      commits: last7.reduce((s, l) => s + l.commits, 0),
      days: last7.filter((l) => l.leetcode_count + l.deep_work_minutes + l.commits > 0).length,
    };
  }, [logs]);

  return { logs, today, todayLog, isLoaded, save, weekSummary };
}
