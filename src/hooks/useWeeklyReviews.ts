import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { useUserStats } from './useUserStats';
import { XP_REWARDS } from '@/lib/xp';
import { format, startOfWeek } from 'date-fns';

export interface WeeklyReview {
  id: string;
  week_start: string;
  achieved: string | null;
  gratitude: string | null;
}

const GUEST_KEY = 'tll:guest-weekly-reviews';

function readGuest(): WeeklyReview[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeGuest(r: WeeklyReview[]) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}

export function useWeeklyReviews() {
  const { user, loading } = useAuth();
  const { award } = useUserStats();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      apiFetch<WeeklyReview[]>('/api/weekly-reviews')
        .then((r) => setReviews(r ?? []))
        .catch(() => {})
        .finally(() => setIsLoaded(true));
    } else {
      setReviews(readGuest());
      setIsLoaded(true);
    }
  }, [user, loading]);

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const thisWeek = reviews.find((r) => r.week_start === currentWeekStart);

  const save = useCallback(
    async (achieved: string, gratitude: string) => {
      const wasEmpty = !thisWeek || (!thisWeek.achieved && !thisWeek.gratitude);
      if (user) {
        const saved = await apiFetch<WeeklyReview>('/api/weekly-reviews', {
          method: 'POST',
          body: JSON.stringify({ week_start: currentWeekStart, achieved, gratitude }),
        });
        setReviews((prev) => {
          const rest = prev.filter((r) => r.week_start !== currentWeekStart);
          return [saved, ...rest].sort((a, b) => b.week_start.localeCompare(a.week_start));
        });
      } else {
        setReviews((prev) => {
          const existing = prev.find((r) => r.week_start === currentWeekStart);
          const rest = prev.filter((r) => r.week_start !== currentWeekStart);
          const merged: WeeklyReview = {
            id: existing?.id ?? crypto.randomUUID(),
            week_start: currentWeekStart,
            achieved,
            gratitude,
          };
          const next = [merged, ...rest].sort((a, b) => b.week_start.localeCompare(a.week_start));
          writeGuest(next);
          return next;
        });
      }
      if (wasEmpty && (achieved.trim() || gratitude.trim())) {
        await award(XP_REWARDS.PM_REVIEW * 2, 4);
      }
    },
    [user, award, currentWeekStart, thisWeek],
  );

  return { reviews, isLoaded, currentWeekStart, thisWeek, save };
}
