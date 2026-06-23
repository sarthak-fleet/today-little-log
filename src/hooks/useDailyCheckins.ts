import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';
import { XP_REWARDS, SCORE_DELTAS } from '@/lib/xp';
import { format } from 'date-fns';

export interface DailyCheckin {
  id: string;
  date: string;
  am_intents: string[] | null;
  am_regret: string | null;
  sleep_hours: number | null;
  psi_score: number | null;
  pm_wins: string | null;
  pm_wastes: string | null;
  pm_score: number | null;
  hit: boolean;
}

const GUEST_KEY = 'tll:guest-checkins';

function readGuest(): DailyCheckin[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuest(r: DailyCheckin[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function useDailyCheckins() {
  const { user, loading } = useAuth();
  const { award } = useUserStats();
  const [rows, setRows] = useState<DailyCheckin[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      apiFetch<DailyCheckin[]>('/api/daily-checkins')
        .then((r) => setRows(r ?? []))
        .catch(() => {})
        .finally(() => setIsLoaded(true));
    } else {
      setRows(readGuest());
      setIsLoaded(true);
    }
  }, [user, loading]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayRow = rows.find((r) => r.date === today);

  const save = useCallback(
    async (patch: Partial<Omit<DailyCheckin, 'id' | 'date' | 'hit'>>, date: string = today) => {
      const wasAmEmpty = !(todayRow?.am_intents?.length || todayRow?.am_regret);
      const wasPmEmpty = !(todayRow?.pm_wins || todayRow?.pm_wastes || todayRow?.pm_score);

      if (user) {
        const saved = await apiFetch<DailyCheckin>('/api/daily-checkins', {
          method: 'POST',
          body: JSON.stringify({ date, ...patch }),
        });
        setRows((prev) => {
          const others = prev.filter((r) => r.date !== date);
          return [saved, ...others].sort((a, b) => b.date.localeCompare(a.date));
        });
      } else {
        setRows((prev) => {
          const others = prev.filter((r) => r.date !== date);
          const existing = prev.find((r) => r.date === date);
          const merged: DailyCheckin = {
            id: existing?.id ?? crypto.randomUUID(),
            date,
            am_intents: patch.am_intents ?? existing?.am_intents ?? null,
            am_regret: patch.am_regret ?? existing?.am_regret ?? null,
            sleep_hours: patch.sleep_hours ?? existing?.sleep_hours ?? null,
            psi_score: patch.psi_score ?? existing?.psi_score ?? null,
            pm_wins: patch.pm_wins ?? existing?.pm_wins ?? null,
            pm_wastes: patch.pm_wastes ?? existing?.pm_wastes ?? null,
            pm_score: patch.pm_score ?? existing?.pm_score ?? null,
            hit: true,
          };
          const next = [merged, ...others].sort((a, b) => b.date.localeCompare(a.date));
          writeGuest(next);
          return next;
        });
      }

      // XP awards (only if the ritual was previously empty for today).
      const newlyAm = wasAmEmpty && (patch.am_intents?.length || patch.am_regret);
      const newlyPm = wasPmEmpty && (patch.pm_wins || patch.pm_wastes || patch.pm_score);
      if (newlyAm) await award(XP_REWARDS.AM_INTENT, SCORE_DELTAS.DAILY_ENGAGEMENT);
      if (newlyPm) await award(XP_REWARDS.PM_REVIEW, SCORE_DELTAS.DAILY_ENGAGEMENT);
    },
    [user, award, today, todayRow]
  );

  return { rows, today, todayRow, isLoaded, save };
}
