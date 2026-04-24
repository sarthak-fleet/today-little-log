import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserStats } from '@/hooks/useUserStats';
import { useQuickLogs } from '@/hooks/useQuickLogs';
import { useDevLogs } from '@/hooks/useDevLogs';
import { useAuth } from '@/hooks/useAuth';
import { Target, Eye, EyeOff, X, Coffee, Flame, Check } from 'lucide-react';

const SESSION_KEY = 'tll:focus-session';
const BOUNTY_KEY = 'tll:focus-bounty';

interface Session {
  startedAt: string;
  durationMin: number;
  taskTitle: string;
  interruptions: number;
  lastHiddenAt: string | null;
  totalHiddenMs: number;
}

const PRESETS = [25, 50, 90];

/**
 * Full-screen focus overlay. Hides everything else. Watches tab
 * visibility — each hide increments interruption counter. Logs XP +
 * dev_log minutes on clean finish.
 */
export function FocusMode() {
  const { user } = useAuth();
  const { award } = useUserStats();
  const { add: logQuick } = useQuickLogs();
  const { save: saveDev } = useDevLogs();

  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedMin, setPickedMin] = useState<number>(50);
  const [pickedTask, setPickedTask] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [interruption, setInterruption] = useState<string>('');
  const [completed, setCompleted] = useState(false);
  const tickRef = useRef<number | null>(null);

  // ── persistence ──────────────────────────────
  const writeSession = (s: Session | null) => {
    setSession(s);
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  };

  // ── ticker ───────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const update = () => {
      const now = Date.now();
      const start = +new Date(session.startedAt);
      setElapsed(Math.floor((now - start) / 1000));
    };
    update();
    tickRef.current = window.setInterval(update, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [session]);

  const finish = useCallback(async () => {
    if (!session) return;
    setCompleted(true);
    const min = Math.floor(elapsed / 60);
    const clean = session.interruptions === 0;
    await award(min + (clean ? 20 : 0), clean ? 5 : 2);
    await saveDev({ deep_work_minutes: min, summary: `Focus: ${session.taskTitle}` });
    await logQuick('win', min, `FOCUS ${min}min · ${session.taskTitle} · ${session.interruptions} interrupts`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, elapsed, award, saveDev, logQuick]);

  // ── tab visibility watcher ───────────────────
  useEffect(() => {
    if (!session) return;
    const onVis = () => {
      if (!session) return;
      const now = Date.now();
      if (document.hidden) {
        writeSession({ ...session, lastHiddenAt: new Date().toISOString() });
      } else if (session.lastHiddenAt) {
        const hiddenFor = now - +new Date(session.lastHiddenAt);
        writeSession({
          ...session,
          lastHiddenAt: null,
          interruptions: session.interruptions + 1,
          totalHiddenMs: session.totalHiddenMs + hiddenFor,
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.startedAt]);

  // ── auto-finish when duration elapses ────────
  useEffect(() => {
    if (!session || completed) return;
    if (elapsed >= session.durationMin * 60) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, session, completed]);

  const start = () => {
    if (!pickedTask.trim()) return;
    const s: Session = {
      startedAt: new Date().toISOString(),
      durationMin: pickedMin,
      taskTitle: pickedTask.trim(),
      interruptions: 0,
      lastHiddenAt: null,
      totalHiddenMs: 0,
    };
    writeSession(s);
    setElapsed(0);
    setPickerOpen(false);
    setPickedTask('');
    setCompleted(false);
  };

  const abort = async () => {
    if (!session) return;
    await logQuick('note', elapsed, `FOCUS ABORTED: ${session.taskTitle} after ${Math.floor(elapsed / 60)}min (${session.interruptions} interruptions)`);
    await award(0, -3);
    writeSession(null);
  };

  const logInterruption = async () => {
    if (!interruption.trim() || !session) return;
    await logQuick('temptation', 1, interruption.trim());
    setInterruption('');
  };

  if (!user) return null;

  // ── trigger card (when not in session) ────────
  if (!session) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Target className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Focus mode</span>
        </div>
        {!pickerOpen ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Lock screen. Hide nav. Tab switches cost score.
            </p>
            <Button onClick={() => setPickerOpen(true)}>
              <Flame className="h-3.5 w-3.5 mr-1" /> Start
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={pickedMin === p ? 'default' : 'outline'}
                  onClick={() => setPickedMin(p)}
                >
                  {p}m
                </Button>
              ))}
            </div>
            <Input
              autoFocus
              value={pickedTask}
              onChange={(e) => setPickedTask(e.target.value)}
              placeholder="What's the one thing?"
              className="bg-background"
              onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={start} disabled={!pickedTask.trim()}>Lock in</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── in-session full-screen overlay ────────────
  const totalSec = session.durationMin * 60;
  const remaining = Math.max(0, totalSec - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const progress = Math.min(1, elapsed / totalSec);
  const tone = session.interruptions === 0 ? 'text-primary' : session.interruptions <= 2 ? 'text-orange-600' : 'text-destructive';

  if (completed) {
    const min = Math.floor(elapsed / 60);
    const clean = session.interruptions === 0;
    return (
      <div className="fixed inset-0 z-[70] bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-5xl font-display font-extrabold text-foreground">Done.</h1>
          <div className="text-sm text-muted-foreground">
            <div><span className="font-bold text-foreground">{min} min</span> on <span className="italic">{session.taskTitle}</span></div>
            <div className="mt-1">{session.interruptions} interruption{session.interruptions === 1 ? '' : 's'} · +{min + (clean ? 20 : 0)} XP</div>
          </div>
          <Button size="lg" className="w-full" onClick={() => writeSession(null)}>
            <Coffee className="h-4 w-4 mr-2" /> Break
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Target className="h-3 w-3 text-primary" /> Focus
          </span>
          <span>{session.durationMin}m total</span>
        </div>

        <h1 className="font-display font-extrabold text-foreground text-3xl md:text-4xl leading-tight">
          {session.taskTitle}
        </h1>

        <div className="space-y-3">
          <div className="font-mono font-bold text-7xl md:text-8xl text-center tabular-nums text-foreground">
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`inline-flex items-center gap-1.5 font-mono ${tone}`}>
            {session.interruptions === 0 ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {session.interruptions} tab switch{session.interruptions === 1 ? '' : 'es'}
          </span>
          {session.totalHiddenMs > 0 && (
            <span className="font-mono text-muted-foreground">
              {Math.round(session.totalHiddenMs / 1000)}s away
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={interruption}
            onChange={(e) => setInterruption(e.target.value)}
            placeholder="Urge? Name it. Don't act."
            className="bg-background"
            onKeyDown={(e) => { if (e.key === 'Enter') logInterruption(); }}
          />
          <Button size="sm" variant="outline" onClick={logInterruption} disabled={!interruption.trim()}>
            Log
          </Button>
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <Button size="sm" variant="ghost" onClick={abort} className="text-destructive">
            <X className="h-3.5 w-3.5 mr-1" /> Abandon (−3 score)
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center italic">
          Tab away = logged. Close tab = run ends. Phone = other room.
        </p>
      </div>
    </div>
  );
}
