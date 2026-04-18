import { useMemo, useState } from 'react';
import { useTasks, type TaskItem } from '@/hooks/useTasks';
import { useMana } from '@/hooks/useMana';
import { useLifeMath } from '@/hooks/useLifeMath';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Shuffle, Zap, CheckCircle2, CircleDashed, Plus } from 'lucide-react';

/**
 * Decision-paralysis killer. Ranks tasks by (quadrant weight × mana
 * affordability × task size). "Random task" button for the times
 * when ranking doesn't help and any move beats none.
 */
const WhatToDo = () => {
  const { tasks, toggleTask, updateTask } = useTasks();
  const { state: mana } = useMana();
  const life = useLifeMath(60_000);
  const { todayRow } = useDailyCheckins();

  const [random, setRandom] = useState<TaskItem | null>(null);

  const ranked = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'todo')
      .map((t) => {
        const qScore = t.quadrant === 'q1' ? 40 : t.quadrant === 'q2' ? 30 : t.quadrant === 'q3' ? 10 : t.quadrant === 'q4' ? -20 : 0;
        const manaCost = t.mana_cost ?? 3;
        const affordable = !mana || manaCost <= mana.bank_remaining;
        const manaScore = affordable ? 15 - manaCost : -50;
        const timeScore = life.isEndOfDayCrunch && (t.estimate_minutes ?? 30) > 30 ? -15 : 5;
        return { task: t, score: qScore + manaScore + timeScore, affordable };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [tasks, mana, life.isEndOfDayCrunch]);

  const pickRandom = () => {
    const pool = tasks.filter((t) => t.status === 'todo');
    if (pool.length === 0) return;
    setRandom(pool[Math.floor(Math.random() * pool.length)]);
  };

  const hasPsi = todayRow?.psi_score != null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Now</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          You have <span className="text-primary italic font-medium">{life.hoursLeftToday}h {life.remainingMinutesToday}m</span>.
          <br />
          Start with this.
        </h1>
        {hasPsi && todayRow!.psi_score! > 70 && (
          <p className="mt-3 text-sm text-orange-600">High PSI day ({todayRow!.psi_score}). Picking lighter options.</p>
        )}
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top picks right now</div>
          <Button size="sm" variant="outline" onClick={pickRandom}>
            <Shuffle className="h-4 w-4 mr-1.5" /> Random
          </Button>
        </div>
        {random && (
          <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/30 p-5 shadow-card mb-3">
            <div className="text-[10px] uppercase tracking-widest text-accent mb-1.5">Random pick</div>
            <div className="font-display font-bold text-lg text-foreground">{random.title}</div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => { toggleTask(random.id); setRandom(null); }}>Do it</Button>
              <Button size="sm" variant="ghost" onClick={pickRandom}>Another</Button>
            </div>
          </div>
        )}
        {ranked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No tasks yet. Add something from <a className="text-primary underline" href="/tasks">Tasks</a>.
          </div>
        ) : (
          <ul className="space-y-2">
            {ranked.map(({ task, score, affordable }) => (
              <RankedRow
                key={task.id}
                task={task}
                score={score}
                affordable={affordable}
                onToggle={() => toggleTask(task.id)}
                onSetCost={(cost) => updateTask(task.id, { mana_cost: cost })}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

function RankedRow({
  task, score, affordable, onToggle, onSetCost,
}: {
  task: TaskItem; score: number; affordable: boolean;
  onToggle: () => void; onSetCost: (c: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(task.mana_cost ?? 3));

  const commit = () => {
    const n = parseInt(draft);
    if (Number.isFinite(n) && n >= 0) onSetCost(n);
    setEditing(false);
  };

  return (
    <li className="rounded-xl bg-card border border-border p-3 shadow-soft hover:shadow-card transition-shadow">
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="flex-shrink-0 text-muted-foreground hover:text-primary">
          {task.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'} truncate`}>
              {task.title}
            </span>
            {!affordable && <span className="text-[10px] text-destructive font-semibold uppercase tracking-wider">over budget</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            {task.quadrant && <span className="uppercase font-semibold text-primary">{task.quadrant}</span>}
            {task.estimate_minutes && <span>{task.estimate_minutes}m</span>}
            <span className="font-mono">score {score}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs">
          {editing ? (
            <Input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
              className="h-7 w-14 bg-background"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title="Mana cost"
            >
              <Zap className="h-3 w-3" />
              <span className="font-mono">{task.mana_cost ?? 3}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default WhatToDo;
