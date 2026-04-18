import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLifeMath } from '@/hooks/useLifeMath';
import { quoteOfDay } from '@/lib/mementoMori';
import { useAuth } from '@/hooks/useAuth';
import { Skull } from 'lucide-react';
import { IdentitySetter } from './IdentitySetter';
import { useUserStats } from '@/hooks/useUserStats';
import { XP_REWARDS, SCORE_DELTAS } from '@/lib/xp';

const DISMISS_KEY_PREFIX = 'tll:shock-dismissed:';

function todayKey() {
  return DISMISS_KEY_PREFIX + format(new Date(), 'yyyy-MM-dd');
}

function hasDismissedToday(): boolean {
  try {
    return localStorage.getItem(todayKey()) !== null;
  } catch {
    return true; // fail closed — don't block
  }
}

function markDismissed() {
  try {
    localStorage.setItem(todayKey(), new Date().toISOString());
  } catch {
    // ignore
  }
}

/**
 * Daily confrontation modal. Shown once per calendar day on first app open.
 * If DOB is not set, prompts for it inline (without it, life math is meaningless).
 */
export function ShockCard() {
  const { user, profile, updateDob } = useAuth({ includeProfile: true });
  const { award } = useUserStats();
  const life = useLifeMath(60_000);
  const quote = quoteOfDay();

  const [open, setOpen] = useState(false);
  const [dobInput, setDobInput] = useState('');

  useEffect(() => {
    if (!user) return; // guest — skip
    if (hasDismissedToday()) return;
    // Slight delay so it doesn't race the initial paint
    const t = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  const handleDismiss = () => {
    markDismissed();
    award(XP_REWARDS.SHOCK_DISMISS, SCORE_DELTAS.DAILY_ENGAGEMENT);
    setOpen(false);
  };

  const handleSaveDob = async () => {
    if (!dobInput) return;
    await updateDob(dobInput);
    // useAuth writes to localStorage in its updateDob path (see updateDob change).
  };

  const hasDob = !!profile?.dob || !!life.dob;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="max-w-lg border-primary/30 bg-background/95 backdrop-blur-md p-8 gap-6">
        <div className="flex items-center gap-3 text-primary">
          <Skull className="h-6 w-6" />
          <DialogTitle className="text-xs font-semibold uppercase tracking-[0.25em]">
            Memento Mori
          </DialogTitle>
        </div>

        {hasDob && life.dayOfLife !== null && life.daysLeft !== null ? (
          <div className="space-y-4">
            <div>
              <div className="text-5xl md:text-6xl font-display font-extrabold text-foreground leading-none">
                Day {life.dayOfLife.toLocaleString()}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                of a ~{(30000).toLocaleString()}-day life.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/40 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Lived</div>
                <div className="text-2xl font-display font-bold text-primary">
                  {life.pctLived?.toFixed(1)}%
                </div>
              </div>
              <div className="bg-primary/10 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Left</div>
                <div className="text-2xl font-display font-bold text-accent">
                  {life.daysLeft.toLocaleString()}d
                </div>
              </div>
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${life.pctLived ?? 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Without your birthday this app can't count what's left. Enter it once.
            </p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dobInput}
                onChange={(e) => setDobInput(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <Button onClick={handleSaveDob} disabled={!dobInput}>Save</Button>
            </div>
          </div>
        )}

        {hasDob && <IdentitySetter compact />}

        <blockquote className="border-l-2 border-primary/60 pl-4 italic text-foreground/90">
          "{quote.text}"
          {quote.source && <div className="not-italic text-xs text-muted-foreground mt-1">— {quote.source}</div>}
        </blockquote>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            onClick={handleDismiss}
          >
            I won't waste today.
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
