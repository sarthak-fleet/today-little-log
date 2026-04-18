/**
 * The Protocol — your non-negotiables. Agent reads this to decide
 * what to show, what to nudge, what to block.
 *
 * Night-owl variant (user works best 20:00–01:00).
 */

export interface Shift {
  id: 'sleep' | 'wake' | 'workout' | 'recovery' | 'job-deep' | 'job-shallow' | 'dinner' | 'decompress' | 'shift3a' | 'break' | 'shift3b' | 'pm-ritual' | 'winddown';
  label: string;
  startH: number; // hour 0-23
  startM: number;
  endH: number;
  endM: number;
  /** What the /now card shows during this shift */
  nowCta: string;
  /** Strict = block other features; Flex = show but don't block */
  mode: 'strict' | 'flex';
  /** Categories of task this shift accepts when user opens /now */
  allowsTaskCategories?: ('dev' | 'career' | 'other')[];
}

// 24h schedule — tweak in one place.
export const SHIFTS: Shift[] = [
  { id: 'sleep',       label: 'Sleep',           startH: 2, startM: 0,  endH: 9,  endM: 0,  nowCta: 'Sleep.',                                   mode: 'strict' },
  { id: 'wake',        label: 'AM ritual',       startH: 9, startM: 0,  endH: 9,  endM: 30, nowCta: 'Fill AM ritual. No phone first.',          mode: 'strict' },
  { id: 'workout',     label: 'Workout',         startH: 9, startM: 30, endH: 10, endM: 30, nowCta: 'Workout. 45 min. Log it.',                 mode: 'strict' },
  { id: 'recovery',    label: 'Shower + breakfast', startH: 10, startM: 30, endH: 11, endM: 30, nowCta: 'Eat protein. 40g+.',                   mode: 'flex' },
  { id: 'job-deep',    label: 'Job deep',        startH: 11, startM: 30, endH: 15, endM: 0,  nowCta: 'Job — hardest work of the day.',          mode: 'flex' },
  { id: 'job-shallow', label: 'Job shallow',     startH: 15, startM: 0,  endH: 18, endM: 0,  nowCta: 'Job — meetings, email, shallow.',         mode: 'flex' },
  { id: 'dinner',      label: 'Dinner',          startH: 18, startM: 0,  endH: 19, endM: 0,  nowCta: 'Dinner. Log macros.',                     mode: 'flex' },
  { id: 'decompress',  label: 'Decompress',      startH: 19, startM: 0,  endH: 20, endM: 0,  nowCta: 'Walk. Read. NO screens.',                 mode: 'strict' },
  { id: 'shift3a',     label: 'Shift 3 — Block A (Dev)', startH: 20, startM: 0,  endH: 21, endM: 45, nowCta: 'Deep block: LeetCode or side-project.', mode: 'strict', allowsTaskCategories: ['dev'] },
  { id: 'break',       label: 'Break',           startH: 21, startM: 45, endH: 22, endM: 15, nowCta: 'Snack. Stretch. No scrolling.',           mode: 'flex' },
  { id: 'shift3b',     label: 'Shift 3 — Block B (Career)', startH: 22, startM: 15, endH: 0, endM: 15, nowCta: 'Apply. Interview prep. System design.', mode: 'strict', allowsTaskCategories: ['career', 'dev'] },
  { id: 'pm-ritual',   label: 'PM ritual',       startH: 0,  startM: 15, endH: 1,  endM: 0,  nowCta: 'PM ritual. Weight. Wins. Wastes. 1-10.',  mode: 'strict' },
  { id: 'winddown',    label: 'Wind down',       startH: 1,  startM: 0,  endH: 2,  endM: 0,  nowCta: 'Paper book only. Dim lights.',            mode: 'strict' },
];

function toMinutes(h: number, m: number) { return h * 60 + m; }

function minutesNow(date = new Date()) { return date.getHours() * 60 + date.getMinutes(); }

export function currentShift(date = new Date()): Shift {
  const now = minutesNow(date);
  for (const s of SHIFTS) {
    const start = toMinutes(s.startH, s.startM);
    const end = toMinutes(s.endH, s.endM);
    if (start <= end) {
      if (now >= start && now < end) return s;
    } else {
      // Wraps midnight (e.g. 22:15 → 00:15)
      if (now >= start || now < end) return s;
    }
  }
  // Fallback — shouldn't happen since schedule covers 24h.
  return SHIFTS[0];
}

export function shiftProgress(s: Shift, date = new Date()): number {
  const now = minutesNow(date);
  const start = toMinutes(s.startH, s.startM);
  const end = toMinutes(s.endH, s.endM);
  const span = start <= end ? end - start : (1440 - start) + end;
  const elapsed = start <= end ? now - start : (now >= start ? now - start : (1440 - start) + now);
  return Math.max(0, Math.min(1, elapsed / span));
}

export function minutesUntilEndOfShift(s: Shift, date = new Date()): number {
  const now = minutesNow(date);
  const end = toMinutes(s.endH, s.endM);
  const start = toMinutes(s.startH, s.startM);
  if (start <= end) return Math.max(0, end - now);
  return now >= start ? (1440 - now) + end : Math.max(0, end - now);
}

// ── Rules (the non-negotiables) ──────────────────────────────

export interface Rule {
  id: string;
  title: string;
  detail: string;
  /** Given recent app state, is this rule currently violated? */
  check: (ctx: RuleContext) => { violated: boolean; reason?: string };
}

export interface RuleContext {
  today: string; // yyyy-MM-dd
  todayCheckin: { am_intents?: string[] | null; am_regret?: string | null; pm_wins?: string | null; pm_wastes?: string | null; pm_score?: number | null; sleep_hours?: number | null } | null;
  weightLoggedToday: boolean;
  urgeOverridesThisWeek: number;
  dailyTemptationCount: number;
  shift: Shift;
}

export const RULES: Rule[] = [
  {
    id: 'am-ritual',
    title: 'AM ritual before anything',
    detail: 'By 09:30 the AM ritual must be filled. No phone first 30 min.',
    check: ({ today, todayCheckin, shift }) => {
      if (shift.id === 'sleep' || shift.id === 'wake') return { violated: false };
      const filled = (todayCheckin?.am_intents?.length ?? 0) > 0 || !!todayCheckin?.am_regret;
      return { violated: !filled, reason: filled ? undefined : 'AM ritual not logged today.' };
    },
  },
  {
    id: 'pm-ritual',
    title: 'PM ritual before bed',
    detail: 'By 01:00 the day must be closed. Wins, wastes, score 1-10.',
    check: ({ todayCheckin, shift }) => {
      if (shift.id !== 'pm-ritual' && shift.id !== 'winddown' && shift.id !== 'sleep') return { violated: false };
      const filled = !!(todayCheckin?.pm_wins || todayCheckin?.pm_wastes || todayCheckin?.pm_score);
      return { violated: !filled, reason: filled ? undefined : 'PM ritual open — close the day.' };
    },
  },
  {
    id: 'weight-log',
    title: 'Weigh every day',
    detail: 'One weigh-in per day. Morning ideal. Before bed acceptable.',
    check: ({ weightLoggedToday, shift }) => {
      if (shift.id === 'sleep' || shift.id === 'wake' || shift.id === 'workout') return { violated: false };
      return { violated: !weightLoggedToday, reason: weightLoggedToday ? undefined : 'No weight log today.' };
    },
  },
  {
    id: 'urge-budget',
    title: 'Max 1 urge override per week',
    detail: 'The URGE button exists. Using it ≥ acting on it. Override acts.',
    check: ({ urgeOverridesThisWeek }) => ({
      violated: urgeOverridesThisWeek > 1,
      reason: urgeOverridesThisWeek > 1 ? `${urgeOverridesThisWeek} overrides this week. Budget is 1.` : undefined,
    }),
  },
  {
    id: 'shift-category',
    title: 'Shift 3 is sacred',
    detail: 'During Block A/B only dev + career tasks. No Q3/Q4 filler.',
    check: () => ({ violated: false }), // informational
  },
  {
    id: 'sleep-anchor',
    title: 'Sleep 02:00–09:00',
    detail: 'Hard anchor. SleepLock fires at 02:00. Override = −3 score.',
    check: () => ({ violated: false }),
  },
];

// ── Week-over-week milestones ────────────────────────────────

export interface WeekMilestone {
  week: number;
  weightDelta: number | null; // kg change from baseline
  leetcodeTotal: number;
  appsSent: number;
  ritualHitRate: number; // 0-1
}

export const MILESTONES: WeekMilestone[] = [
  { week: 1, weightDelta: 0, leetcodeTotal: 7, appsSent: 0, ritualHitRate: 0.9 },
  { week: 2, weightDelta: -1, leetcodeTotal: 20, appsSent: 5, ritualHitRate: 1.0 },
  { week: 4, weightDelta: -3, leetcodeTotal: 40, appsSent: 10, ritualHitRate: 1.0 },
  { week: 8, weightDelta: -7, leetcodeTotal: 80, appsSent: 20, ritualHitRate: 0.95 },
  { week: 12, weightDelta: -12, leetcodeTotal: 120, appsSent: 40, ritualHitRate: 0.9 },
];
