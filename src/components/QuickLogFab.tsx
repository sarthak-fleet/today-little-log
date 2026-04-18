import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuickLogs, type QuickLogKind } from '@/hooks/useQuickLogs';
import { useAuth } from '@/hooks/useAuth';
import { Droplet, Dumbbell, AlertTriangle, Trophy, StickyNote, Plus, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const OPTIONS: { kind: QuickLogKind; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { kind: 'water', label: 'Water', icon: Droplet, tone: 'text-sky-600 bg-sky-500/10 border-sky-500/30' },
  { kind: 'workout', label: 'Workout', icon: Dumbbell, tone: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  { kind: 'win', label: 'Win', icon: Trophy, tone: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  { kind: 'temptation', label: 'Temptation', icon: AlertTriangle, tone: 'text-orange-600 bg-orange-500/10 border-orange-500/30' },
  { kind: 'note', label: 'Note', icon: StickyNote, tone: 'text-muted-foreground bg-muted border-border' },
];

const KIND_ICON: Record<QuickLogKind, React.ComponentType<{ className?: string }>> = {
  water: Droplet, workout: Dumbbell, temptation: AlertTriangle, win: Trophy, note: StickyNote,
  schedule_checkin: StickyNote,
};

/**
 * Floating "Q"uick-log action button. Keystroke Q opens. One-tap to log water / workout / win / temptation / note.
 */
export function QuickLogFab() {
  const { user } = useAuth();
  const { logs, add } = useQuickLogs();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<QuickLogKind | null>(null);
  const [text, setText] = useState('');
  const [num, setNum] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleQuickTap = async (kind: QuickLogKind) => {
    if (kind === 'water') { await add('water', 1); return; }
    if (kind === 'workout') { setMode(kind); return; }
    setMode(kind);
  };

  const submit = async () => {
    if (!mode) return;
    const n = num ? parseFloat(num) : undefined;
    await add(mode, Number.isFinite(n) ? n : undefined, text || undefined);
    setMode(null); setText(''); setNum(''); setOpen(false);
  };

  if (!user) return null;

  const todayLogs = logs.filter((l) => {
    const d = new Date(l.logged_at);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick log (Q)"
        title="Quick log (press Q)"
        className="fixed bottom-6 right-6 md:bottom-14 md:right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-glow hover:shadow-card hover:scale-105 transition-all flex items-center justify-center group"
      >
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" />
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setMode(null); setText(''); setNum(''); } }}>
        <DialogContent className="max-w-md bg-background/95 backdrop-blur-md p-6 gap-5 border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-4 w-4" />
            <DialogTitle className="text-xs font-semibold uppercase tracking-[0.25em]">Quick log</DialogTitle>
          </div>

          {!mode ? (
            <>
              <div className="grid grid-cols-5 gap-2">
                {OPTIONS.map(({ kind, label, icon: Icon, tone }) => (
                  <button
                    key={kind}
                    onClick={() => handleQuickTap(kind)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 ${tone} hover:scale-[1.03] transition-transform`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-semibold">{label}</span>
                  </button>
                ))}
              </div>

              {todayLogs.length > 0 && (
                <div className="border-t border-border pt-4 space-y-1.5 max-h-48 overflow-y-auto">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Today</div>
                  {todayLogs.map((l) => {
                    const Icon = KIND_ICON[l.kind];
                    return (
                      <div key={l.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="capitalize">{l.kind}</span>
                        {l.value_num != null && <span className="font-mono">{l.value_num}</span>}
                        {l.value_text && <span className="truncate flex-1">— {l.value_text}</span>}
                        <span className="text-[10px] opacity-60 ml-auto">{formatDistanceToNow(new Date(l.logged_at), { addSuffix: true })}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">Tip: press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Q</kbd> anywhere to open this.</p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium capitalize text-foreground">Logging: {mode}</div>
              {(mode === 'workout' || mode === 'water') && (
                <Input
                  type="number"
                  placeholder={mode === 'workout' ? 'Minutes' : 'Glasses'}
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className="bg-background"
                  autoFocus
                />
              )}
              <Textarea
                placeholder={
                  mode === 'temptation' ? 'What\'s calling you?'
                  : mode === 'win' ? 'What moved the needle?'
                  : mode === 'note' ? 'Jot it.'
                  : 'Notes (optional)'
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="bg-background resize-none"
                autoFocus={mode !== 'workout' && mode !== 'water'}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setMode(null); setText(''); setNum(''); }}>Back</Button>
                <Button size="sm" onClick={submit}>Log</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
