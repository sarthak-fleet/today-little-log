import { format, startOfWeek, differenceInDays } from 'date-fns';

/**
 * Commitment memory — Monday's AM intents become Thursday's audit.
 * Reads from existing daily_checkins so no new schema.
 */

export interface CheckinLite {
  date: string;
  am_intents?: string[] | null;
  am_regret?: string | null;
}

export function isAuditDay(date = new Date()): boolean {
  const d = date.getDay();
  return d === 4 || d === 5; // Thu or Fri
}

export function findMondayCommitments(rows: CheckinLite[], date = new Date()): CheckinLite | null {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const mondayStr = format(monday, 'yyyy-MM-dd');
  return rows.find((r) => r.date === mondayStr) ?? null;
}

export function daysSinceMonday(date = new Date()): number {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return differenceInDays(date, monday);
}
