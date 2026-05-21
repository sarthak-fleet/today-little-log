import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trackReturnedOnce, trackSignupOnce } from '@/lib/analytics';

/**
 * Session-level analytics wiring. Mounted once near the router root.
 *
 *  - `signup`   — fired once per browser, the first time we observe a
 *                 signed-in user (account created → first session).
 *  - `returned` — fired once per session, for a user who already has prior
 *                 activity (has been `activated`). Powers D1/D7 retention.
 *
 * `activated` and `core_action` are emitted from `useScoreboard` /
 * `useJournalEntries` at their real trigger points.
 */
export function AnalyticsTracker() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      trackSignupOnce();
    }
    // `returned` self-gates on prior activity + per-session, so it is safe
    // to call for guests and signed-in users alike.
    trackReturnedOnce();
  }, [user, loading]);

  return null;
}
