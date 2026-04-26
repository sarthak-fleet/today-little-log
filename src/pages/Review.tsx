import { useMemo } from 'react';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useScoreboard } from '@/hooks/useScoreboard';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { TodayPrompt } from '@/components/TodayPrompt';
import { LineChart, CalendarDays } from 'lucide-react';
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';

const Review = () => {
  const { rows: checkins } = useDailyCheckins();
  const { items, logs } = useScoreboard();
  const {
    getTodayEntry,
    getWeeklyEntry,
    getMonthlyEntry,
    saveEntry,
    isSunday,
    isLastDayOfMonth,
  } = useJournalEntries();

  const last7 = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 6);
    return eachDayOfInterval({ start, end: today }).map((d) => format(d, 'yyyy-MM-dd'));
  }, []);

  const itemKindById = useMemo(
    () => new Map(items.map((i) => [i.id, i.kind] as const)),
    [items],
  );

  const dayHits = useMemo(() => {
    const m = new Map<string, number>();
    for (const log of logs) {
      const kind = itemKindById.get(log.item_id);
      if (!kind) continue;
      const hit = kind === 'check' ? log.value_bool : Boolean(log.value_text && log.value_text.trim());
      if (hit) m.set(log.date, (m.get(log.date) ?? 0) + 1);
    }
    return m;
  }, [logs, itemKindById]);

  const weekHits = last7.reduce((s, d) => s + (dayHits.get(d) ?? 0), 0);
  const weekPossible = items.length * 7;
  const nonZeroDays = last7.filter((d) => (dayHits.get(d) ?? 0) > 0).length;

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const recentCheckins = checkins.filter((c) => c.date >= last7[0]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <LineChart className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Review</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
          Last 7 days
        </h1>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-8 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Non-zero days" value={`${nonZeroDays}/7`} />
          <Stat label="Hits" value={`${weekHits}${weekPossible ? `/${weekPossible}` : ''}`} />
          <Stat label="Streak window" value={`${weekStart}`} />
        </div>

        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-widest">Daily breakdown</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {last7.map((d) => {
              const hits = dayHits.get(d) ?? 0;
              return (
                <div key={d} className="rounded-lg border border-border bg-background p-2 text-center">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    {format(new Date(d), 'EEE')}
                  </div>
                  <div className={`mt-1 font-display font-bold tabular-nums ${
                    hits === 0 ? 'text-destructive' : hits >= items.length / 2 ? 'text-emerald-600' : 'text-foreground'
                  }`}>
                    {hits}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Recent AM/PM
          </h2>
          {recentCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nothing logged this week.</p>
          ) : (
            <ul className="space-y-3">
              {recentCheckins.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                    <span className="font-mono">{c.date}</span>
                    {c.pm_score != null && <span>· score {c.pm_score}/10</span>}
                    {c.psi_score != null && <span>· PSI {c.psi_score}</span>}
                  </div>
                  {c.am_intents && c.am_intents.length > 0 && (
                    <div className="text-foreground"><span className="text-muted-foreground">Intents: </span>{c.am_intents.filter(Boolean).join(' · ')}</div>
                  )}
                  {c.pm_wins && (
                    <div className="text-emerald-700 dark:text-emerald-400"><span className="text-muted-foreground">Won: </span>{c.pm_wins}</div>
                  )}
                  {c.pm_wastes && (
                    <div className="text-orange-700 dark:text-orange-400"><span className="text-muted-foreground">Wasted: </span>{c.pm_wastes}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-card">
          <h2 className="text-2xl font-display font-bold mb-4">Weekly + monthly journal</h2>
          <TodayPrompt
            todayEntry={getTodayEntry()}
            weeklyEntry={getWeeklyEntry()}
            monthlyEntry={getMonthlyEntry()}
            isSunday={isSunday()}
            isLastDayOfMonth={isLastDayOfMonth()}
            onSave={(content, type) => saveEntry(content, undefined, type)}
          />
        </div>
      </section>
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-display font-bold text-foreground mt-1">{value}</div>
    </div>
  );
}

export default Review;
