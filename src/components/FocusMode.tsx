import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStats } from '@/hooks/useUserStats';
import { useAuth } from '@/hooks/useAuth';
import { Target, X, Flame, Check } from 'lucide-react';

const SESSION_KEY = 'tll:focus-session';
const PRESETS = [25, 45, 90];

interface Session {
  startedAt: string;
  durationMin: number;
  taskTitle: string;
  interruptions: number;
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

export function FocusMode() {
  const { user } = useAuth();
  const { award } = useUserStats();

  const [session, setSession] = useState<Session | null>(() => readSession());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedMin, setPickedMin] = useState(45);
  const [pickedTask, setPickedTask] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const tickRef = useRef<number | null>(null);

  const update = useCallback((next: Session | null) => {
    setSession(next);
    writeSession(next);
  }, []);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const ms = Date.now() - new Date(session.startedAt).getTime();
      setElapsed(Math.floor(ms / 1000));
    };
    tick();
    tickRef.current = window.setInterval(tick, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [session]);

  // Tab-switch penalty: count visibility transitions to hidden as interruptions.
  useEffect(() => {
    if (!session) return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        update({ ...session, interruptions: session.interruptions + 1 });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [session, update]);

  const finish = useCallback(async () => {
    if (!session) return;
    const min = session.durationMin;
    const xp = Math.max(5, min - session.interruptions * 5);
    await award(xp, 2);
    update(null);
    setElapsed(0);
    setCompleted(true);
    setTimeout(() => setCompleted(false), 4000);
  }, [session, award, update]);

  // Auto-finish at duration.
  useEffect(() => {
    if (!session) return;
    if (elapsed >= session.durationMin * 60) finish();
  }, [elapsed, session, finish]);

  if (!user) return null;

  const totalSec = (session?.durationMin ?? 0) * 60;
  const remaining = Math.max(0, totalSec - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const progress = totalSec > 0 ? Math.min(1, elapsed / totalSec) : 0;

  if (session) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/40 p-5 space-y-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">Focus block</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => update(null)} aria-label="Abort">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="font-display font-semibold text-foreground">{session.taskTitle || '—'}</div>
        <div className="flex items-baseline gap-3">
          <span className="font-display font-extrabold tabular-nums text-4xl text-foreground">
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </span>
          <span className="text-xs text-muted-foreground">left of {session.durationMin}min</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />
            <span className="font-mono">{session.interruptions}</span> tab-switch{session.interruptions === 1 ? '' : 'es'}
          </span>
          <span>−5 XP per switch</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary">
        <Target className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">Focus block</span>
        {completed && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 inline-flex items-center gap-1 ml-auto">
            <Check className="h-3 w-3" /> Logged
          </span>
        )}
      </div>

      {!pickerOpen ? (
        <Button size="sm" onClick={() => setPickerOpen(true)}>Start a block</Button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setPickedMin(m)}
                className={`flex-1 h-9 rounded-md text-sm font-semibold border transition-colors ${
                  pickedMin === m
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          <Input
            value={pickedTask}
            onChange={(e) => setPickedTask(e.target.value)}
            placeholder="What's the one thing for this block?"
            className="bg-background"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!pickedTask.trim()}
              onClick={() => {
                update({
                  startedAt: new Date().toISOString(),
                  durationMin: pickedMin,
                  taskTitle: pickedTask.trim(),
                  interruptions: 0,
                });
                setPickerOpen(false);
              }}
            >
              Start {pickedMin}m
            </Button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Each tab-switch costs 5 XP. Stay locked in.
      </p>
    </div>
  );
}
