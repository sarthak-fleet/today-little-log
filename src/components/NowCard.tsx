import { useEffect, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useMana } from '@/hooks/useMana';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useLifeMath } from '@/hooks/useLifeMath';
import { currentShift, minutesUntilEndOfShift, shiftProgress, type Shift } from '@/lib/protocol';
import { Button } from '@/components/ui/button';
import { Clock, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Shift-aware "now" card. Primary surface on home. One job: tell user
 * what they should be doing in this 30min–3hr window. Replaces the
 * old sprawling dashboard energy.
 */
export function NowCard() {
  const { tasks, toggleTask } = useTasks();
  const { state: mana } = useMana();
  const { todayRow } = useDailyCheckins();
  const life = useLifeMath(60_000);
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift>(() => currentShift());

  // Re-evaluate shift every 60s.
  useEffect(() => {
    const i = window.setInterval(() => setShift(currentShift()), 60_000);
    return () => window.clearInterval(i);
  }, []);

  const minsLeft = minutesUntilEndOfShift(shift);
  const progress = shiftProgress(shift);

  // Pick one task for this shift, if any apply.
  const nextTask = (() => {
    const allowed = shift.allowsTaskCategories;
    if (!allowed) return null;
    return tasks
      .filter((t) => t.status === 'todo')
      .filter((t) => {
        if (!allowed.includes('dev') && !allowed.includes('career')) return true;
        // Simple match: task quadrant q1/q2 priority during deep shifts.
        return t.quadrant === 'q1' || t.quadrant === 'q2' || !t.quadrant;
      })
      .sort((a, b) => {
        const ac = a.mana_cost ?? 3, bc = b.mana_cost ?? 3;
        if (!mana) return 0;
        return ac - bc;
      })[0];
  })();

  // Warnings (what user is missing right now)
  const warnings: string[] = [];
  const amEmpty = !todayRow?.am_intents?.length && !todayRow?.am_regret;
  const pmEmpty = !todayRow?.pm_wins && !todayRow?.pm_wastes && todayRow?.pm_score == null;
  if (['wake', 'workout', 'recovery', 'job-deep'].includes(shift.id) && amEmpty) warnings.push('AM ritual still open.');
  if (shift.id === 'pm-ritual' && pmEmpty) warnings.push('PM ritual — close the day.');
  if (shift.id === 'shift3a' && mana && mana.bank_remaining < 3) warnings.push('Mana low. Pick something light.');

  const toneByShift: Record<Shift['id'], string> = {
    sleep:        'from-slate-500/20 to-slate-700/20 border-slate-500/40',
    wake:         'from-amber-500/20 to-orange-500/20 border-amber-500/40',
    workout:      'from-emerald-500/20 to-primary/20 border-emerald-500/40',
    recovery:     'from-muted to-muted/60 border-border',
    'job-deep':   'from-primary/20 to-accent/20 border-primary/40',
    'job-shallow':'from-muted to-muted/50 border-border',
    dinner:       'from-amber-500/10 to-orange-500/10 border-amber-500/30',
    decompress:   'from-slate-500/10 to-slate-700/10 border-slate-500/30',
    shift3a:      'from-primary/30 to-accent/30 border-primary/60',
    break:        'from-muted to-muted/50 border-border',
    shift3b:      'from-accent/30 to-primary/30 border-accent/60',
    'pm-ritual':  'from-destructive/20 to-orange-600/20 border-destructive/50',
    winddown:     'from-slate-600/20 to-slate-800/20 border-slate-500/40',
  };

  return (
    <div className={`rounded-3xl border-2 p-6 shadow-card bg-gradient-to-br ${toneByShift[shift.id]}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">
            <Clock className="h-3 w-3" /> Right now
            <span className="opacity-50">·</span>
            <span>{shift.label}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">
            {shift.nowCta}
          </h2>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">ends in</div>
          <div className="font-display font-bold text-xl tabular-nums text-foreground">
            {Math.floor(minsLeft / 60)}h {minsLeft % 60}m
          </div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-black/10 overflow-hidden mb-4">
        <div className="h-full bg-foreground/60 transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 space-y-1">
          {warnings.map((w) => (
            <div key={w} className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> {w}
            </div>
          ))}
        </div>
      )}

      {nextTask && (
        <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-border/50 p-4 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Next task</div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-display font-semibold text-foreground truncate">{nextTask.title}</div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground font-mono">
                <Zap className="h-3 w-3" />{nextTask.mana_cost ?? 3}
              </span>
              <Button size="sm" onClick={() => toggleTask(nextTask.id)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="text-muted-foreground">
          Day <span className="font-bold text-foreground">{life.dayOfLife?.toLocaleString() ?? '—'}</span>
          {life.daysLeft !== null && <> · <span className="font-bold text-foreground">{life.daysLeft.toLocaleString()}</span> left</>}
        </span>
        {mana && (
          <span className="text-muted-foreground">
            · Mana <span className="font-bold text-foreground">{mana.bank_remaining}/{mana.daily_max}</span>
          </span>
        )}
        {todayRow?.psi_score != null && (
          <span className="text-muted-foreground">
            · PSI <span className="font-bold text-foreground">{todayRow.psi_score}</span>
          </span>
        )}
      </div>

      {shift.allowsTaskCategories && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/now')}>See all ranked</Button>
          <Button size="sm" variant="ghost" onClick={() => navigate('/tasks')}>Add task</Button>
        </div>
      )}
    </div>
  );
}
