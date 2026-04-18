import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { Moon, X } from 'lucide-react';

const LOCK_DURATION_MIN = 15;
const DISMISS_KEY = 'tll:sleep-lock-dismissed';
const LAST_SHOWN_KEY = 'tll:sleep-lock-last-shown';

function parseHHMM(s: string | null | undefined): { h: number; m: number } | null {
  if (!s) return null;
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  if (!match) return null;
  return { h: parseInt(match[1]), m: parseInt(match[2]) };
}

/**
 * Aggressive bedtime overlay. Shows when now is between bedtime and
 * bedtime+LOCK_DURATION_MIN (or if bedtime has passed by < 2h),
 * once per night (localStorage dismiss key keyed by yyyy-mm-dd).
 *
 * User can dismiss with a small score penalty, or close it after the
 * lockout passes.
 */
export function SleepLock() {
  const { user, profile } = useAuth({ includeProfile: true });
  const { award } = useUserStats();
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const i = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(i);
  }, []);

  useEffect(() => {
    if (!user || !profile?.sleep_target_bed) {
      setOpen(false);
      return;
    }
    const target = parseHHMM(profile.sleep_target_bed);
    if (!target) return;

    const today = new Date();
    const bedtime = new Date(today);
    bedtime.setHours(target.h, target.m, 0, 0);
    // If bedtime is earlier than current wake hours (e.g. 23:00 and user still up at 2am next day):
    // handle crossing midnight by checking if |bedtime - now| > 12h, then add a day to bedtime.
    if (bedtime.getTime() - now.getTime() > 12 * 60 * 60 * 1000) {
      bedtime.setDate(bedtime.getDate() - 1);
    }

    const minsAfterBedtime = (now.getTime() - bedtime.getTime()) / 60_000;
    const dateKey = today.toISOString().slice(0, 10);

    let dismissedTonight = false;
    try { dismissedTonight = localStorage.getItem(DISMISS_KEY) === dateKey; } catch { /* ignore */ }

    if (dismissed || dismissedTonight) {
      setOpen(false);
      return;
    }

    // Show if we are within the lock window.
    if (minsAfterBedtime >= 0 && minsAfterBedtime <= LOCK_DURATION_MIN) {
      setOpen(true);
      try { localStorage.setItem(LAST_SHOWN_KEY, dateKey); } catch { /* ignore */ }
    } else {
      setOpen(false);
    }
  }, [user, profile?.sleep_target_bed, now, dismissed]);

  const closeForGood = () => {
    const dateKey = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(DISMISS_KEY, dateKey); } catch { /* ignore */ }
    setDismissed(true);
    setOpen(false);
    // Score penalty for dismissing the lock.
    award(0, -3);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
      role="dialog"
      aria-label="Sleep lock"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center">
          <Moon className="h-10 w-10 text-destructive animate-pulse" />
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-destructive uppercase tracking-tight leading-none">
          Sleep. Now.
        </h1>
        <p className="text-base text-muted-foreground max-w-sm mx-auto">
          Past bedtime. Future-you at {profile?.sleep_target_wake ?? 'wake time'} pays for every
          minute you stay up. Close the app.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant="destructive"
            className="w-full"
            onClick={closeForGood}
          >
            <X className="h-4 w-4 mr-2" /> Override (−3 score)
          </Button>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Lock auto-closes in {LOCK_DURATION_MIN} min.
          </p>
        </div>
      </div>
    </div>
  );
}
