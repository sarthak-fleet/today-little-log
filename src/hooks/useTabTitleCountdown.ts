import { useEffect } from 'react';
import { useLifeMath } from './useLifeMath';

const BASE_TITLE = 'Today — every day counts';

/**
 * Hijacks the document.title with a live finite-time reminder.
 * Updates every 60s via useLifeMath's internal tick.
 */
export function useTabTitleCountdown() {
  const { daysLeft, hoursLeftToday, remainingMinutesToday } = useLifeMath(60_000);

  useEffect(() => {
    const todayPart = `${hoursLeftToday}h ${remainingMinutesToday}m left today`;
    const lifePart = daysLeft !== null ? `${daysLeft.toLocaleString()}d · ` : '';
    document.title = `${lifePart}${todayPart} — Today`;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [daysLeft, hoursLeftToday, remainingMinutesToday]);
}
