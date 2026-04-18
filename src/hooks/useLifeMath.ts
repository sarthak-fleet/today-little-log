import { useEffect, useState } from 'react';
import {
  differenceInCalendarDays,
  differenceInDays,
  endOfDay,
  parseISO,
  isValid,
  startOfDay,
} from 'date-fns';

export const AVERAGE_LIFESPAN_DAYS = 30000;
export const LIFE_WEEKS_YEARS = 90;
export const LIFE_WEEKS_COLS = 52;
export const LIFE_WEEKS_TOTAL = LIFE_WEEKS_YEARS * LIFE_WEEKS_COLS;

// Waking hours assumption: 6am–11pm = 17h
const WAKE_HOUR = 6;
const SLEEP_HOUR = 23;

const DOB_STORAGE_KEY = 'tll:dob';

export function setCachedDob(dob: string | null) {
  try {
    if (dob) localStorage.setItem(DOB_STORAGE_KEY, dob);
    else localStorage.removeItem(DOB_STORAGE_KEY);
  } catch {
    // ignore SSR / privacy mode
  }
}

export function getCachedDob(): string | null {
  try {
    return localStorage.getItem(DOB_STORAGE_KEY);
  } catch {
    return null;
  }
}

export interface LifeMath {
  dob: string | null;
  dayOfLife: number | null;
  daysLeft: number | null;
  pctLived: number | null;
  pctLeft: number | null;
  weeksLived: number | null;
  weeksTotal: number;
  currentWeekIndex: number | null;
  // today
  minutesElapsedToday: number;
  minutesLeftToday: number;
  hoursLeftToday: number;
  remainingMinutesToday: number;
  // waking window (6am–11pm)
  wakingMinutesElapsed: number;
  wakingMinutesLeft: number;
  isInsideWakingWindow: boolean;
  isEndOfDayCrunch: boolean; // <2 hrs waking left
  now: Date;
}

const MS_PER_MIN = 60_000;

function compute(dob: string | null, now: Date): LifeMath {
  const start = startOfDay(now);
  const end = endOfDay(now);
  const minutesElapsedToday = Math.floor((now.getTime() - start.getTime()) / MS_PER_MIN);
  const minutesLeftToday = Math.max(0, Math.floor((end.getTime() - now.getTime()) / MS_PER_MIN));
  const hoursLeftToday = Math.floor(minutesLeftToday / 60);
  const remainingMinutesToday = minutesLeftToday % 60;

  const wakeStart = new Date(now);
  wakeStart.setHours(WAKE_HOUR, 0, 0, 0);
  const wakeEnd = new Date(now);
  wakeEnd.setHours(SLEEP_HOUR, 0, 0, 0);
  const wakingSpanMin = Math.floor((wakeEnd.getTime() - wakeStart.getTime()) / MS_PER_MIN);
  const wakingMinutesElapsed = Math.max(0, Math.min(wakingSpanMin, Math.floor((now.getTime() - wakeStart.getTime()) / MS_PER_MIN)));
  const wakingMinutesLeft = Math.max(0, wakingSpanMin - wakingMinutesElapsed);
  const isInsideWakingWindow = now >= wakeStart && now <= wakeEnd;
  const isEndOfDayCrunch = isInsideWakingWindow && wakingMinutesLeft < 120;

  let dayOfLife: number | null = null;
  let daysLeft: number | null = null;
  let pctLived: number | null = null;
  let pctLeft: number | null = null;
  let weeksLived: number | null = null;
  let currentWeekIndex: number | null = null;

  if (dob) {
    const birth = parseISO(dob);
    if (isValid(birth)) {
      dayOfLife = differenceInDays(now, birth) + 1;
      daysLeft = Math.max(0, AVERAGE_LIFESPAN_DAYS - dayOfLife);
      pctLived = Math.min(100, (dayOfLife / AVERAGE_LIFESPAN_DAYS) * 100);
      pctLeft = 100 - pctLived;
      weeksLived = Math.floor(differenceInCalendarDays(now, birth) / 7);
      currentWeekIndex = Math.min(LIFE_WEEKS_TOTAL - 1, weeksLived);
    }
  }

  return {
    dob,
    dayOfLife,
    daysLeft,
    pctLived,
    pctLeft,
    weeksLived,
    weeksTotal: LIFE_WEEKS_TOTAL,
    currentWeekIndex,
    minutesElapsedToday,
    minutesLeftToday,
    hoursLeftToday,
    remainingMinutesToday,
    wakingMinutesElapsed,
    wakingMinutesLeft,
    isInsideWakingWindow,
    isEndOfDayCrunch,
    now,
  };
}

/**
 * Central finite-time math. Ticks every `intervalMs` (default 30s).
 * Pass `tickMs` lower to drive live second tickers.
 */
export function useLifeMath(tickMs: number = 30_000): LifeMath {
  const [dob, setDob] = useState<string | null>(() => getCachedDob());
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const i = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(i);
  }, [tickMs]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DOB_STORAGE_KEY) setDob(e.newValue);
    };
    const onCustom = () => setDob(getCachedDob());
    window.addEventListener('storage', onStorage);
    window.addEventListener('tll:dob-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('tll:dob-changed', onCustom);
    };
  }, []);

  return compute(dob, now);
}
