import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';

export interface UserStats {
  life_score: number;
  xp: number;
  last_activity_date: string | null;
}

const GUEST_STATS_KEY = 'tll:guest-stats';

function readGuestStats(): UserStats {
  try {
    const raw = localStorage.getItem(GUEST_STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { life_score: 50, xp: 0, last_activity_date: null };
}

function writeGuestStats(s: UserStats) {
  try {
    localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string | null, b: string) {
  if (!a) return 0;
  return Math.max(
    0,
    Math.round((+new Date(b + 'T00:00:00Z') - +new Date(a + 'T00:00:00Z')) / 86_400_000),
  );
}

function applyDecay(s: UserStats): UserStats {
  const idle = daysBetween(s.last_activity_date, todayStr());
  if (idle <= 0) return s;
  return { ...s, life_score: Math.max(0, s.life_score - idle) };
}

export function useUserStats() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats>(() => readGuestStats());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      apiFetch<UserStats>('/api/user-stats')
        .then((s) => setStats(s))
        .catch(() => {})
        .finally(() => setLoaded(true));
    } else {
      setStats(applyDecay(readGuestStats()));
      setLoaded(true);
    }
  }, [user, authLoading]);

  const award = useCallback(
    async (xp: number, scoreDelta: number = 0) => {
      if (user) {
        try {
          const updated = await apiFetch<UserStats>('/api/user-stats', {
            method: 'POST',
            body: JSON.stringify({ xp, score: scoreDelta }),
          });
          setStats(updated);
        } catch {
          // swallow
        }
      } else {
        setStats((prev) => {
          const decayed = applyDecay(prev);
          const next: UserStats = {
            life_score: Math.max(0, Math.min(100, decayed.life_score + scoreDelta)),
            xp: Math.max(0, decayed.xp + xp),
            last_activity_date: todayStr(),
          };
          writeGuestStats(next);
          return next;
        });
      }
    },
    [user],
  );

  return { stats, loaded, award };
}
