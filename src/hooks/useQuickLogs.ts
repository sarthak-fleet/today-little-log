import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';
import { XP_REWARDS } from '@/lib/xp';

export type QuickLogKind = 'water' | 'workout' | 'temptation' | 'win' | 'note' | 'schedule_checkin';

export interface QuickLog {
  id: string;
  kind: QuickLogKind;
  value_num: number | null;
  value_text: string | null;
  logged_at: string;
}

const GUEST_KEY = 'tll:guest-quick-logs';

function readGuest(): QuickLog[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuest(logs: QuickLog[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function useQuickLogs() {
  const { user, loading } = useAuth();
  const { award } = useUserStats();
  const [logs, setLogs] = useState<QuickLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      apiFetch<QuickLog[]>('/api/quick-logs')
        .then((rows) => setLogs(rows ?? []))
        .catch(() => {})
        .finally(() => setIsLoaded(true));
    } else {
      setLogs(readGuest());
      setIsLoaded(true);
    }
  }, [user, loading]);

  const add = useCallback(
    async (kind: QuickLogKind, value_num?: number, value_text?: string) => {
      const optimistic: QuickLog = {
        id: crypto.randomUUID(),
        kind,
        value_num: value_num ?? null,
        value_text: value_text ?? null,
        logged_at: new Date().toISOString(),
      };
      setLogs((prev) => [optimistic, ...prev]);
      if (user) {
        try {
          const saved = await apiFetch<QuickLog>('/api/quick-logs', {
            method: 'POST',
            body: JSON.stringify({ kind, value_num, value_text }),
          });
          setLogs((prev) => [saved, ...prev.filter((l) => l.id !== optimistic.id)]);
        } catch {
          setLogs((prev) => prev.filter((l) => l.id !== optimistic.id));
          return;
        }
      } else {
        const next = [optimistic, ...readGuest()];
        writeGuest(next);
      }
      // Award XP (temptation alone doesn't count as a "win").
      const xp = kind === 'temptation' ? 1 : XP_REWARDS.QUICK_LOG;
      await award(xp, 1);
    },
    [user, award],
  );

  const remove = useCallback(
    async (id: string) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      if (user) {
        await apiFetch('/api/quick-logs', { method: 'DELETE', body: JSON.stringify({ id }) }).catch(() => {});
      } else {
        writeGuest(readGuest().filter((l) => l.id !== id));
      }
    },
    [user],
  );

  return { logs, isLoaded, add, remove };
}
