import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';
import { XP_REWARDS, SCORE_DELTAS } from '@/lib/xp';

export type UrgeStatus = 'cooldown' | 'resisted' | 'acted';

export interface UrgeLog {
  id: string;
  trigger: string;
  reflection: string | null;
  status: UrgeStatus;
  logged_at: string;
  expires_at: string;
}

const GUEST_KEY = 'tll:guest-urge-logs';

function readGuest(): UrgeLog[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeGuest(rows: UrgeLog[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
}

export function useUrgeLogs() {
  const { user, loading } = useAuth();
  const { award } = useUserStats();
  const [logs, setLogs] = useState<UrgeLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      apiFetch<UrgeLog[]>('/api/urge-logs')
        .then((rows) => setLogs(rows ?? []))
        .catch(() => {})
        .finally(() => setIsLoaded(true));
    } else {
      setLogs(readGuest());
      setIsLoaded(true);
    }
  }, [user, loading]);

  const logUrge = useCallback(
    async (trigger: string, reflection?: string) => {
      const now = new Date();
      const expires_at = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const optimistic: UrgeLog = {
        id: crypto.randomUUID(),
        trigger,
        reflection: reflection ?? null,
        status: 'cooldown',
        logged_at: now.toISOString(),
        expires_at,
      };
      setLogs((prev) => [optimistic, ...prev]);
      if (user) {
        try {
          const saved = await apiFetch<UrgeLog>('/api/urge-logs', {
            method: 'POST',
            body: JSON.stringify({ trigger, reflection }),
          });
          setLogs((prev) => [saved, ...prev.filter((l) => l.id !== optimistic.id)]);
          await award(XP_REWARDS.URGE_COOLDOWN, 2);
          return saved;
        } catch {
          setLogs((prev) => prev.filter((l) => l.id !== optimistic.id));
          return null;
        }
      } else {
        const next = [optimistic, ...readGuest()];
        writeGuest(next);
        await award(XP_REWARDS.URGE_COOLDOWN, 2);
        return optimistic;
      }
    },
    [user, award],
  );

  const resolve = useCallback(
    async (id: string, status: 'resisted' | 'acted', reflection?: string) => {
      setLogs((prev) => prev.map((l) => l.id === id ? { ...l, status, reflection: reflection ?? l.reflection } : l));
      if (user) {
        await apiFetch('/api/urge-logs', {
          method: 'PATCH',
          body: JSON.stringify({ id, status, reflection }),
        }).catch(() => {});
      } else {
        const next = readGuest().map((l) => l.id === id ? { ...l, status, reflection: reflection ?? l.reflection } : l);
        writeGuest(next);
      }
      if (status === 'resisted') {
        await award(XP_REWARDS.URGE_RESISTED, SCORE_DELTAS.URGE_RESISTED);
      } else {
        await award(0, SCORE_DELTAS.URGE_ACTED);
      }
    },
    [user, award],
  );

  return { logs, isLoaded, logUrge, resolve };
}
