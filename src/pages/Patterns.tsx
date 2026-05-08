import { useMemo } from 'react';
import { AlertTriangle, Brain, CalendarClock, CheckCircle2, ListChecks, Target, TrendingDown, Trophy } from 'lucide-react';
import { differenceInCalendarDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { useScoreboard, type ScoreboardItem, type ScoreboardLog, type ScoreboardDayNote } from '@/hooks/useScoreboard';
import { useTasks, type TaskItem } from '@/hooks/useTasks';

type InsightTone = 'neutral' | 'good' | 'warning';

const Patterns = () => {
  const { items, logs, dayNotes, today, monthStart } = useScoreboard();
  const { tasks } = useTasks();

  const patterns = useMemo(
    () => buildPatterns(items, logs, dayNotes, tasks, monthStart, today),
    [items, logs, dayNotes, tasks, monthStart, today],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Brain className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Patterns</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
          Personal operating system
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Month-to-date signals from score logs, low-score notes, and task pressure.
        </p>
      </section>

      <section className="px-4 max-w-6xl mx-auto pb-8 space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Active days" value={`${patterns.activeDays}/${patterns.trackedDays}`} />
          <Stat label="Avg day score" value={`${patterns.averageDayScore}%`} />
          <Stat label="Open tasks" value={`${patterns.todoCount}`} />
          <Stat label="Done tasks" value={`${patterns.doneCount}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <InsightCard
            icon={Trophy}
            label="Best operating day"
            value={patterns.bestDay}
            detail="Use this as the template for the next high-output day."
            tone="good"
          />
          <InsightCard
            icon={TrendingDown}
            label="Main drag"
            value={patterns.mainDrag}
            detail="This is the most repeated low-score signal or missed daily."
            tone="warning"
          />
          <InsightCard
            icon={CheckCircle2}
            label="Reliable ritual"
            value={patterns.reliableRitual}
            detail="Keep this stable before adding more tracking complexity."
            tone="good"
          />
          <InsightCard
            icon={Target}
            label="Next leverage task"
            value={patterns.nextTask}
            detail="Picked from open tasks using urgency quadrant, mana, and age."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <CalendarClock className="h-4 w-4" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]">Day rhythm</h2>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {patterns.days.map((day) => (
                <div key={day.date} className="rounded-lg border border-border bg-background p-2 text-center">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    {format(parseISO(day.date), 'EEE')}
                  </div>
                  <div className={`mt-1 font-display text-lg font-bold tabular-nums ${day.score === 0 ? 'text-destructive' : day.score >= 70 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {day.score}
                  </div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">%</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <ListChecks className="h-4 w-4" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]">Task pressure</h2>
            </div>
            <div className="space-y-3">
              {patterns.taskBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
                  <span className="text-sm text-muted-foreground">{bucket.label}</span>
                  <span className="font-display text-lg font-bold tabular-nums">{bucket.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em]">Friction log</h2>
          </div>
          {patterns.friction.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No repeated friction yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {patterns.friction.map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background p-3">
                  <div className="text-sm font-display font-semibold text-foreground">{item.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl md:text-2xl font-display font-bold text-foreground">{value}</div>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  detail: string;
  tone?: InsightTone;
}) {
  const toneClass = tone === 'good' ? 'text-emerald-600' : tone === 'warning' ? 'text-destructive' : 'text-primary';

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className={`h-4 w-4 ${toneClass}`} />
        <span>{label}</span>
      </div>
      <div className="mt-3 text-lg font-display font-bold text-foreground">{value}</div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </article>
  );
}

function buildPatterns(
  items: ScoreboardItem[],
  logs: ScoreboardLog[],
  dayNotes: ScoreboardDayNote[],
  tasks: TaskItem[],
  monthStart: string,
  today: string,
) {
  const days = eachDayOfInterval({
    start: parseISO(monthStart),
    end: parseISO(today),
  }).map((date) => format(date, 'yyyy-MM-dd'));
  const logByItemDate = new Map(logs.map((log) => [`${log.item_id}:${log.date}`, log]));
  const scoreDays = days.map((date) => {
    const score = scoreForDay(items, logByItemDate, date);
    return { date, score };
  });
  const activeDays = scoreDays.filter((day) => day.score > 0).length;
  const averageDayScore = scoreDays.length
    ? Math.round(scoreDays.reduce((sum, day) => sum + day.score, 0) / scoreDays.length)
    : 0;
  const best = scoreDays.reduce((winner, day) => (day.score > winner.score ? day : winner), scoreDays[0] ?? { date: today, score: 0 });
  const itemStats = itemCompletionStats(items, logs, days);
  const reliable = itemStats.length
    ? itemStats.reduce((winner, item) => (item.rate > winner.rate ? item : winner), itemStats[0])
    : null;
  const missed = itemStats.length
    ? itemStats.reduce((winner, item) => (item.missed > winner.missed ? item : winner), itemStats[0])
    : null;
  const reasonCounts = lowReasonCounts(dayNotes);
  const repeatedReason = reasonCounts[0];
  const todoTasks = tasks.filter((task) => task.status !== 'done');
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const nextTask = pickNextTask(todoTasks, today);
  const staleTasks = todoTasks.filter((task) => ageInDays(task, today) >= 14).length;
  const highManaTasks = todoTasks.filter((task) => (task.mana_cost ?? 0) >= 4).length;
  const urgentTasks = todoTasks.filter((task) => task.quadrant === 'q1').length;

  return {
    trackedDays: days.length,
    activeDays,
    averageDayScore,
    todoCount: todoTasks.length,
    doneCount: doneTasks.length,
    bestDay: best.score > 0 ? `${format(parseISO(best.date), 'MMM d')}: ${best.score}%` : 'No scored day yet',
    mainDrag: repeatedReason ? `${repeatedReason[0]} (${repeatedReason[1]}x)` : missed ? `${missed.label}: ${missed.missed} misses` : 'No drag detected yet',
    reliableRitual: reliable ? `${reliable.label}: ${reliable.rate}% hit rate` : 'No ritual data yet',
    nextTask: nextTask ? `${nextTask.title}${nextTask.quadrant ? ` (${nextTask.quadrant.toUpperCase()})` : ''}` : 'No open tasks',
    days: scoreDays.slice(-14),
    taskBuckets: [
      { label: 'Urgent open', value: urgentTasks },
      { label: 'High mana open', value: highManaTasks },
      { label: 'Stale 14d+', value: staleTasks },
    ],
    friction: [
      ...reasonCounts.slice(0, 3).map(([label, count]) => ({ label, detail: `${count} low-score note${count === 1 ? '' : 's'}` })),
      ...itemStats
        .filter((item) => item.missed > 0)
        .sort((a, b) => b.missed - a.missed)
        .slice(0, 3)
        .map((item) => ({ label: item.label, detail: `${item.missed} missed day${item.missed === 1 ? '' : 's'} this month` })),
    ].slice(0, 6),
  };
}

function scoreForDay(items: ScoreboardItem[], logByItemDate: Map<string, ScoreboardLog>, date: string) {
  const trackable = items.filter((item) => item.category === 'daily');
  if (trackable.length === 0) return 0;

  const score = trackable.reduce((sum, item) => {
    const log = logByItemDate.get(`${item.id}:${date}`);
    if (!log) return sum;
    if (item.kind === 'score') {
      const max = Math.max(1, item.max_score ?? item.ideal_score ?? 1);
      return sum + Math.min(1, Math.max(0, (log.value_score ?? 0) / max));
    }
    if (item.kind === 'check') return sum + (log.value_bool ? 1 : 0);
    return sum + (log.value_text?.trim() ? 1 : 0);
  }, 0);

  return Math.round((score / trackable.length) * 100);
}

function itemCompletionStats(items: ScoreboardItem[], logs: ScoreboardLog[], days: string[]) {
  const logByItemDate = new Map(logs.map((log) => [`${log.item_id}:${log.date}`, log]));
  return items
    .filter((item) => item.category === 'daily')
    .map((item) => {
      const hits = days.filter((day) => {
        const log = logByItemDate.get(`${item.id}:${day}`);
        if (!log) return false;
        if (item.kind === 'score') return Boolean(log.value_score && log.value_score > 0);
        if (item.kind === 'check') return Boolean(log.value_bool);
        return Boolean(log.value_text?.trim());
      }).length;
      return {
        label: item.label,
        hits,
        missed: days.length - hits,
        rate: days.length ? Math.round((hits / days.length) * 100) : 0,
      };
    });
}

function lowReasonCounts(dayNotes: ScoreboardDayNote[]) {
  const counts = new Map<string, number>();
  for (const note of dayNotes) {
    const reason = note.low_score_reason?.trim();
    if (!reason) continue;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function pickNextTask(tasks: TaskItem[], today: string) {
  return [...tasks].sort((a, b) => {
    const quadrantDelta = quadrantWeight(b.quadrant) - quadrantWeight(a.quadrant);
    if (quadrantDelta !== 0) return quadrantDelta;
    const manaDelta = (b.mana_cost ?? 0) - (a.mana_cost ?? 0);
    if (manaDelta !== 0) return manaDelta;
    return ageInDays(b, today) - ageInDays(a, today);
  })[0];
}

function quadrantWeight(quadrant: TaskItem['quadrant']) {
  if (quadrant === 'q1') return 4;
  if (quadrant === 'q2') return 3;
  if (quadrant === 'q3') return 2;
  if (quadrant === 'q4') return 1;
  return 0;
}

function ageInDays(task: TaskItem, today: string) {
  return Math.max(0, differenceInCalendarDays(parseISO(today), parseISO(task.created_at)));
}

export default Patterns;
