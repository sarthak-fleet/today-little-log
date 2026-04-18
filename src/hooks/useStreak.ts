import { useMemo } from 'react';
import { useDailyCheckins } from './useDailyCheckins';
import { format, subDays } from 'date-fns';

/**
 * Current AM+PM streak length. A day counts as a hit if `hit === true`
 * (set server-side when any AM or PM field is filled). Streak is the
 * longest unbroken run ending today/yesterday.
 */
export function useStreak() {
  const { rows, isLoaded } = useDailyCheckins();

  return useMemo(() => {
    if (!isLoaded) return { current: 0, longest: 0, loaded: false };

    const hitDates = new Set(rows.filter((r) => r.hit).map((r) => r.date));

    let current = 0;
    // allow today OR yesterday to anchor the streak (so evening reviewers don't lose a day)
    let cursor = new Date();
    const todayStr = format(cursor, 'yyyy-MM-dd');
    const yesterday = format(subDays(cursor, 1), 'yyyy-MM-dd');
    if (!hitDates.has(todayStr) && !hitDates.has(yesterday)) {
      cursor = subDays(cursor, 999); // break
    } else if (!hitDates.has(todayStr)) {
      cursor = subDays(cursor, 1);
    }

    while (hitDates.has(format(cursor, 'yyyy-MM-dd'))) {
      current += 1;
      cursor = subDays(cursor, 1);
    }

    // Longest = longest contiguous run in the full set.
    const sorted = [...hitDates].sort();
    let longest = 0, run = 0;
    let prev: string | null = null;
    for (const d of sorted) {
      if (prev && +new Date(d) - +new Date(prev) === 86_400_000) {
        run += 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prev = d;
    }

    return { current, longest, loaded: true };
  }, [rows, isLoaded]);
}
