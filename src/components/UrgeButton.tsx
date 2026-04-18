import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useUrgeLogs } from '@/hooks/useUrgeLogs';
import { useAuth } from '@/hooks/useAuth';
import { Flame, X, Check } from 'lucide-react';

const BREATH_SECONDS = 300; // 5 min

type Phase = 'name' | 'breathe' | 'reflect' | 'done';

export function UrgeButton() {
  const { user } = useAuth();
  const { logUrge } = useUrgeLogs();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('name');
  const [trigger, setTrigger] = useState('');
  const [reflection, setReflection] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'breathe') {
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= BREATH_SECONDS) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase('reflect');
            return BREATH_SECONDS;
          }
          return e + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const reset = () => {
    setPhase('name');
    setTrigger('');
    setReflection('');
    setElapsed(0);
  };

  const startBreath = () => {
    if (!trigger.trim()) return;
    setElapsed(0);
    setPhase('breathe');
  };

  const skipBreath = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('reflect');
  };

  const submit = async () => {
    await logUrge(trigger.trim(), reflection.trim() || undefined);
    setPhase('done');
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  if (!user) return null;

  const pct = Math.round((elapsed / BREATH_SECONDS) * 100);
  const minutes = Math.floor((BREATH_SECONDS - elapsed) / 60);
  const secs = (BREATH_SECONDS - elapsed) % 60;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 md:bottom-32 md:right-6 z-40 h-12 w-12 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-105 transition-all flex items-center justify-center group"
        aria-label="URGE — log a temptation"
        title="URGE (log a temptation)"
      >
        <Flame className="h-5 w-5 group-hover:animate-pulse" />
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-lg bg-background/95 backdrop-blur-md p-8 gap-5 border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <Flame className="h-5 w-5" />
            <DialogTitle className="text-xs font-semibold uppercase tracking-[0.3em]">Urge</DialogTitle>
          </div>

          {phase === 'name' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-display font-bold text-foreground">What is calling you?</h2>
              <Input
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="e.g. install that game from Hacker News"
                className="bg-background"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') startBreath(); }}
              />
              <p className="text-sm text-muted-foreground">
                Naming it weakens it. Next: 5-minute breathe. Then reflect. Then 24-hour cooldown before you can act.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={close}>Cancel</Button>
                <Button onClick={startBreath} disabled={!trigger.trim()}>Continue</Button>
              </div>
            </div>
          )}

          {phase === 'breathe' && (
            <div className="space-y-5 text-center py-6">
              <div className="relative mx-auto w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 283} 283`}
                    style={{ transition: 'stroke-dasharray 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-mono font-bold text-3xl text-foreground tabular-nums">
                    {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">breathe</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                In for 4, hold 4, out for 6. Again.
              </p>
              <button onClick={skipBreath} className="text-xs text-muted-foreground underline hover:text-foreground">
                Skip breathing
              </button>
            </div>
          )}

          {phase === 'reflect' && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-bold text-foreground">Will this matter in 7 days?</h2>
              <p className="text-sm text-muted-foreground">
                What are you actually avoiding? Fear? Boredom? Fatigue?
              </p>
              <Textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={4}
                placeholder="Write what's underneath."
                className="bg-background resize-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={submit}>Skip</Button>
                <Button onClick={submit}>Log urge</Button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="space-y-4 text-center py-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Logged.</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                24-hour cooldown started. If you still want it tomorrow, you've earned it.
                Most urges won't survive the wait.
              </p>
              <Button onClick={close} className="w-full">Back to what matters.</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
