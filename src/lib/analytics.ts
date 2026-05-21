/**
 * Owner-facing analytics — the fixed 4-event taxonomy.
 *
 * Every fleet project emits exactly these four events — `signup`, `activated`,
 * `core_action`, `returned` — so a single PostHog project can build one
 * cross-fleet funnel (signup -> activated -> core_action) and a D1/D7 retention
 * insight, with no custom dashboard.
 *
 * Every event carries `project: "today-little-log"`. This wrapper is
 * intentionally thin so it can later be promoted into
 * `@saas-maker/posthog-client`.
 *
 * today-little-log is a Vite SPA — there is no server runtime, so this module
 * is browser-only. PostHog is already initialized by `src/lib/monitoring.ts`
 * (`installBrowserMonitoring`); this module just emits through the same client.
 */
import { track } from '@saas-maker/posthog-client';

const PROJECT = 'today-little-log' as const;

/** The product-specific action behind a `core_action` event. */
export type CoreAction =
  /** A scoreboard item was logged / scored for a day. */
  | 'scoreboard_logged'
  /** A journal entry was saved. */
  | 'journal_saved';

interface AnalyticsEventMap {
  /** First session after an account is created. */
  signup: { project: typeof PROJECT };
  /** The user reaches first real value — their first logged score. */
  activated: { project: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project: typeof PROJECT; action: CoreAction };
  /** A return session by a user with prior activity. */
  returned: { project: typeof PROJECT };
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], 'project'>,
): void {
  try {
    track(event, { project: PROJECT, ...props });
  } catch {
    // Analytics must NEVER break a user flow. Swallow and move on.
  }
}

/** Fire once, on the first session after an account is created. */
export function trackSignup(): void {
  emit('signup', {});
}

/** Fire once, when the user first reaches real product value (first score logged). */
export function trackActivated(): void {
  emit('activated', {});
}

/** Fire on each completion of the core product action. */
export function trackCoreAction(action: CoreAction): void {
  emit('core_action', { action });
}

/** Fire on session start for a user who has prior activity. */
export function trackReturned(): void {
  emit('returned', {});
}

// --- Once-per-user / once-per-session gating -------------------------------
//
// `signup`, `activated`, and `returned` should fire at most once per user.
// We gate them through localStorage so a refresh doesn't double-count.

const SIGNUP_KEY = 'tll:analytics-signup-fired';
const ACTIVATED_KEY = 'tll:analytics-activated-fired';
const SESSION_KEY = 'tll:analytics-session-fired';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

/** Fire `signup` once per browser, the first time we see a signed-in user. */
export function trackSignupOnce(): void {
  if (readFlag(SIGNUP_KEY)) return;
  writeFlag(SIGNUP_KEY);
  trackSignup();
}

/** Fire `activated` once per browser, the first time the user logs a score. */
export function trackActivatedOnce(): void {
  if (readFlag(ACTIVATED_KEY)) return;
  writeFlag(ACTIVATED_KEY);
  trackActivated();
}

/**
 * Fire `returned` once per session, but only for a user who has prior
 * activity (i.e. has already been `activated`). Powers the D1/D7 retention
 * insight.
 */
export function trackReturnedOnce(): void {
  if (!readFlag(ACTIVATED_KEY)) return; // no prior activity — not a "return"
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    return;
  }
  trackReturned();
}
