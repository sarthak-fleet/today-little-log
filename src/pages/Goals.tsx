import { useState } from 'react';
import { useGoals, type GoalCategory, type Goal } from '@/hooks/useGoals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Target, Plus, TrendingUp, TrendingDown, Trash2, Code2, Scale, Briefcase, Sparkles } from 'lucide-react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

const CATEGORY_META: Record<GoalCategory, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  dev: { label: 'Dev', icon: Code2, tone: 'bg-primary/10 text-primary border-primary/30' },
  weight: { label: 'Body', icon: Scale, tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  career: { label: 'Career', icon: Briefcase, tone: 'bg-accent/10 text-accent border-accent/30' },
  other: { label: 'Other', icon: Sparkles, tone: 'bg-muted text-muted-foreground border-border' },
};

const Goals = () => {
  const { goals, isLoaded, createGoal, updateGoal, deleteGoal, nudge } = useGoals();
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ title: '', category: 'dev' as GoalCategory, target_date: '' });

  const add = async () => {
    if (!draft.title.trim()) return;
    await createGoal({
      title: draft.title.trim(),
      category: draft.category,
      target_date: draft.target_date || null,
      target_value_num: null,
      target_value_text: null,
    });
    setDraft({ title: '', category: 'dev', target_date: '' });
    setShowNew(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Target className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Goals</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Every action is a vote <span className="text-primary italic font-medium">for or against.</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Hit the +1 button when you do work that moves this goal. Hit −1 when you do the opposite. Probabilities update live.
        </p>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-20 space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowNew((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" /> {showNew ? 'Cancel' : 'New goal'}
          </Button>
        </div>

        {showNew && (
          <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-3">
            <Input placeholder="Goal title (e.g. Land a $Xk job by Dec)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="bg-background" />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as GoalCategory })}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="dev">Dev</option>
                <option value="weight">Body</option>
                <option value="career">Career</option>
                <option value="other">Other</option>
              </select>
              <Input type="date" value={draft.target_date} onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} className="bg-background" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={add} disabled={!draft.title.trim()}>Create</Button>
            </div>
          </div>
        )}

        {!isLoaded ? (
          <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
        ) : goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No goals yet. Name the three that matter.
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <GoalRow key={g.id} goal={g} onNudge={nudge} onDelete={deleteGoal} onUpdate={updateGoal} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

function GoalRow({ goal, onNudge, onDelete }: { goal: Goal; onNudge: (id: string, delta: number) => void; onDelete: (id: string) => void; onUpdate: (id: string, p: Partial<Goal>) => void }) {
  const meta = CATEGORY_META[goal.category] ?? CATEGORY_META.other;
  const Icon = meta.icon;
  const daysTo = goal.target_date ? differenceInCalendarDays(parseISO(goal.target_date), new Date()) : null;
  const prob = Math.round(goal.probability);
  const probColor = prob >= 65 ? 'text-emerald-600'
    : prob >= 40 ? 'text-primary'
    : prob >= 20 ? 'text-orange-600'
    : 'text-destructive';

  return (
    <li className="rounded-2xl bg-card border border-border p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${meta.tone} flex-shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-foreground truncate">{goal.title}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
              <span className="uppercase tracking-widest">{meta.label}</span>
              {goal.target_date && (
                <>
                  <span>·</span>
                  <span>{format(parseISO(goal.target_date), 'MMM d')} ({daysTo ?? 0}d)</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`font-display font-extrabold text-2xl tabular-nums ${probColor}`}>{prob}%</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">odds</div>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" className="h-8 w-12 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30" variant="outline" onClick={() => onNudge(goal.id, 2)}>
              <TrendingUp className="h-3.5 w-3.5 mr-0.5" />+2
            </Button>
            <Button size="sm" className="h-8 w-12 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30" variant="outline" onClick={() => onNudge(goal.id, -2)}>
              <TrendingDown className="h-3.5 w-3.5 mr-0.5" />−2
            </Button>
          </div>
          <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${prob >= 50 ? 'bg-gradient-to-r from-primary to-accent' : 'bg-destructive'}`}
          style={{ width: `${prob}%` }}
        />
      </div>
    </li>
  );
}

export default Goals;
