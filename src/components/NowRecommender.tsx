import { useMemo, useState } from 'react';
import { useTasks, type TaskItem } from '@/hooks/useTasks';
import { useMana } from '@/hooks/useMana';
import { useLifeMath } from '@/hooks/useLifeMath';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { Button } from '@/components/ui/button';
import { Sparkles, Shuffle, Zap, CheckCircle2, CircleDashed } from 'lucide-react';

/**
 * Condensed "what-to-do-now" card. Drops into the home page so that
 * ranked task picks are a scroll away, not a tab away.
 */
export function NowRecommender({ limit = 5 }: { limit?: number }) {
  const { tasks, toggleTask } = useTasks();
  const { state: mana } = useMana();
  const life = useLifeMath(60_000);
  const { todayRow } = useDailyCheckins();
  const [random, setRandom] = useState<TaskItem | null>(null);

  const ranked = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'todo')
      .map((t) => {
        const q = t.quadrant === 'q1' ? 40 : t.quadrant === 'q2' ? 30 : t.quadrant === 'q3' ? 10 : t.quadrant === 'q4' ? -20 : 0;
        const cost = t.mana_cost ?? 3;
        const affordable = !mana || cost <= mana.bank_remaining;
        const mScore = affordable ? 15 - cost : -50;
        const tScore = life.isEndOfDayCrunch && (t.estimate_minutes ?? 30) > 30 ? -15 : 5;
        return { task: t, score: q + mScore + tScore, affordable };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [tasks, mana, life.isEndOfDayCrunch, limit]);

  const pickRandom = () => {
    const pool = tasks.filter((t) => t.status === 'todo');
    if (pool.length === 0) return;
    setRandom(pool[Math.floor(Math.random() * pool.length)]);
  };

  const psiHint = todayRow?.psi_score != null && todayRow.psi_score > 70;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Do this now</span>
        </div>
        <div className="flex items-center gap-2">
          {psiHint && <span className="text-[10px] text-orange-600 uppercase tracking-widest">high psi · lighter options</span>}
          <Button size="sm" variant="ghost" className="h-7" onClick={pickRandom}>
            <Shuffle className="h-3.5 w-3.5 mr-1" /> Random
          </Button>
        </div>
      </div>

      {random && (
        <div className="rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30 p-3 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-accent mb-1">Random pick</div>
          <div className="font-display font-bold text-foreground">{random.title}</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => { toggleTask(random.id); setRandom(null); }}>Do it</Button>
            <Button size="sm" variant="ghost" onClick={pickRandom}>Another</Button>
          </div>
        </div>
      )}

      {ranked.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">No open tasks. Add some in Tasks.</div>
      ) : (
        <ul className="space-y-1.5">
          {ranked.map(({ task, affordable }) => (
            <li key={task.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
              <button onClick={() => toggleTask(task.id)} className="text-muted-foreground hover:text-primary">
                {task.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
              </button>
              <span className={`flex-1 truncate text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </span>
              {!affordable && <span className="text-[9px] text-destructive font-semibold uppercase">over budget</span>}
              {task.quadrant && <span className="text-[10px] text-primary font-mono uppercase">{task.quadrant}</span>}
              <span className="text-[10px] text-muted-foreground font-mono inline-flex items-center gap-0.5">
                <Zap className="h-2.5 w-2.5" />{task.mana_cost ?? 3}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
