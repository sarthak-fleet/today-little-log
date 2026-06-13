import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  BookOpen,
  CalendarDays,
  LineChart,
  ListChecks,
  Minus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useScoreboard, type ScoreboardItem, type ScoreboardLog } from '@/hooks/useScoreboard';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { TodayPrompt } from '@/components/TodayPrompt';
import { EntryEditor } from '@/components/EntryEditor';
import { formatEntryPreview, getMoodFromContent, MOOD_META } from '@/lib/journalContent';
import { categoryFromPosition } from '@/lib/scoreboardDefaults';

const Review = () => {
  const { rows: checkins } = useDailyCheckins();
  const { items, logs, monthStart, monthEnd, isLoaded } = useScoreboard();
  const {
    entries,
    getTodayEntry,
    getWeeklyEntry,
    getMonthlyEntry,
    getNextWeekPlanEntry,
    getNextWeekKey,
    saveEntry,
    isSunday,
    isLastDayOfMonth,
    isLoaded: journalLoaded,
    isSaving: journalSaving,
  } = useJournalEntries();

  const today = useMemo(() => new Date(), []);
  const todayKey = format(today, 'yyyy-MM-dd');

  const thisWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const thisWeekEnd = useMemo(() => endOfWeek(today, { weekStartsOn: 1 }), [today]);
  const lastWeekStart = useMemo(() => subDays(thisWeekStart, 7), [thisWeekStart]);
  const lastWeekEnd = useMemo(() => subDays(thisWeekStart, 1), [thisWeekStart]);

  const thisWeekDays = useMemo(
    () => eachDayOfInterval({ start: thisWeekStart, end: thisWeekEnd }).map((d) => format(d, 'yyyy-MM-dd')),
    [thisWeekStart, thisWeekEnd],
  );
  const lastWeekDays = useMemo(
    () => eachDayOfInterval({ start: lastWeekStart, end: lastWeekEnd }).map((d) => format(d, 'yyyy-MM-dd')),
    [lastWeekStart, lastWeekEnd],
  );
  const elapsedDays = useMemo(() => thisWeekDays.filter((d) => d <= todayKey), [thisWeekDays, todayKey]);

  const dailyItems = useMemo(
    () => items.filter((item) => categoryFromPosition(item.position) === 'daily'),
    [items],
  );
  const notToDos = useMemo(
    () => items.filter((item) => categoryFromPosition(item.position) === 'not_to_do'),
    [items],
  );
  const logByItemDate = useMemo(
    () => new Map(logs.map((log) => [`${log.item_id}:${log.date}`, log] as const)),
    [logs],
  );

  const scoreFor = (date: string) => scoreForDay(dailyItems, logByItemDate, date);

  const daysWithLogs = elapsedDays.filter((d) => dailyItems.some((item) => logByItemDate.has(`${item.id}:${d}`)));
  const daysLogged = daysWithLogs.length;
  const thisWeekAvg = daysLogged
    ? Math.round(daysWithLogs.reduce((s, d) => s + scoreFor(d), 0) / daysLogged)
    : 0;
  const bestDay = daysWithLogs.reduce<{ date: string; score: number } | null>((winner, d) => {
    const score = scoreFor(d);
    if (!winner || score > winner.score) return { date: d, score };
    return winner;
  }, null);

  // Delta vs last week is only meaningful when both weeks are within the loaded
  // month — useScoreboard fetches one month at a time, so cross-month weeks
  // would mis-report a drop. Showing the comparison only when honest is the
  // smaller, safer surface.
  const lastWeekFullyLoaded = lastWeekStart >= parseISO(monthStart) && lastWeekEnd <= parseISO(monthEnd);
  const lastWeekLogged = lastWeekFullyLoaded
    ? lastWeekDays.filter((d) => dailyItems.some((item) => logByItemDate.has(`${item.id}:${d}`)))
    : [];
  const lastWeekAvg = lastWeekLogged.length
    ? Math.round(lastWeekLogged.reduce((s, d) => s + scoreFor(d), 0) / lastWeekLogged.length)
    : null;
  const delta = lastWeekAvg !== null && daysLogged > 0 ? thisWeekAvg - lastWeekAvg : null;

  const weekEntries = useMemo(() => {
    if (thisWeekDays.length === 0) return [];
    const first = thisWeekDays[0];
    const last = thisWeekDays[thisWeekDays.length - 1];
    return entries
      .filter((entry) => entry.entry_type === 'daily' && entry.date >= first && entry.date <= last)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, thisWeekDays]);

  const patterns = useMemo(
    () => getWeeklyPatterns(dailyItems, notToDos, logs, thisWeekDays),
    [dailyItems, notToDos, logs, thisWeekDays],
  );
  const planningPrompts = useMemo(() => getPlanningPrompts(patterns), [patterns]);
  const reflectionQuestion = useMemo(
    () => getReflectionQuestion(thisWeekAvg, daysLogged, patterns),
    [thisWeekAvg, daysLogged, patterns],
  );

  const nextWeekStart = format(new Date(getNextWeekKey()), 'MMM d');
  const weekCheckins = checkins.filter((c) => c.date >= thisWeekDays[0] && c.date <= thisWeekDays[thisWeekDays.length - 1]);
  const weekLabel = `${format(thisWeekStart, 'MMM d')} – ${format(thisWeekEnd, 'MMM d')}`;
  const elapsedCount = elapsedDays.length;

  const headline = (() => {
    if (!isLoaded) return 'Loading your week…';
    if (daysLogged === 0) {
      return `${elapsedCount}/7 days in. Nothing scored yet — log today to unlock your recap.`;
    }
    const bestLine = bestDay
      ? ` · best day ${format(parseISO(bestDay.date), 'EEE')} (${bestDay.score}%)`
      : '';
    return `${daysLogged}/${elapsedCount} days logged · avg ${thisWeekAvg}%${bestLine}.`;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Week recap</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
          {weekLabel}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{headline}</p>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-12 space-y-6">
        <RewardHero
          isLoaded={isLoaded}
          daysLogged={daysLogged}
          elapsedCount={elapsedCount}
          thisWeekAvg={thisWeekAvg}
          delta={delta}
          bestDay={bestDay}
          hasItems={dailyItems.length > 0}
        />

        {isLoaded && daysLogged > 0 && (
          <>
            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-widest">Daily breakdown</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                {thisWeekDays.map((d) => {
                  const elapsed = d <= todayKey;
                  const score = elapsed ? scoreFor(d) : -1;
                  const isToday = d === todayKey;
                  return (
                    <div
                      key={d}
                      className={`rounded-lg border p-2 text-center transition-colors ${
                        isToday ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'
                      }`}
                    >
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                        {format(parseISO(d), 'EEE')}
                      </div>
                      <div
                        className={`mt-1 font-display text-base md:text-lg font-bold tabular-nums ${
                          !elapsed
                            ? 'text-muted-foreground/40'
                            : score === 0
                            ? 'text-destructive/80'
                            : score >= 70
                            ? 'text-emerald-600'
                            : 'text-foreground'
                        }`}
                      >
                        {!elapsed ? '—' : score}
                      </div>
                      <div className="mt-0.5 text-[9px] text-muted-foreground">
                        {elapsed ? '%' : 'soon'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-widest">Weekly patterns</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <PatternCard icon={Trophy} label="Best streak" value={patterns.bestStreak} tone="good" />
                <PatternCard icon={TrendingDown} label="Most skipped" value={patterns.mostSkipped} tone="bad" />
                <PatternCard icon={Ban} label="Not-to-do breaches" value={patterns.breaches} tone="bad" />
                <PatternCard icon={LineChart} label="Repeated reason" value={patterns.repeatedReason} />
              </div>
            </div>

            {weekEntries.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="text-[11px] uppercase tracking-widest">Daily entries this week</span>
                  </div>
                  <Link to="/journal" className="text-xs font-medium text-primary hover:underline">
                    Open journal
                  </Link>
                </div>
                <ul className="space-y-3">
                  {weekEntries.map((entry) => {
                    const mood = getMoodFromContent(entry.content);
                    const moodMeta = mood ? MOOD_META[mood] : null;
                    return (
                      <li
                        key={entry.id}
                        className="rounded-xl border border-border bg-background p-3 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {format(parseISO(entry.date), 'EEEE, MMM d')}
                          </span>
                          {moodMeta && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {moodMeta.emoji} {moodMeta.label}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-foreground line-clamp-6">
                          {formatEntryPreview(entry.content) || entry.content}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                {reflectionQuestion && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-primary/70 mb-1">Reflection</p>
                    <p className="text-sm text-foreground">{reflectionQuestion}</p>
                    <Link to="/journal" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                      Write in journal →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {weekCheckins.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  AM/PM this week
                </h2>
                <ul className="space-y-3">
                  {weekCheckins.map((c) => (
                    <li key={c.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground mb-1">
                        <span className="font-mono">{c.date}</span>
                        {c.pm_score != null && <span>· score {c.pm_score}/10</span>}
                        {c.psi_score != null && <span>· PSI {c.psi_score}</span>}
                      </div>
                      {c.am_intents && c.am_intents.length > 0 && (
                        <div className="text-foreground">
                          <span className="text-muted-foreground">Intents: </span>
                          {c.am_intents.filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {c.pm_wins && (
                        <div className="text-emerald-700 dark:text-emerald-400">
                          <span className="text-muted-foreground">Won: </span>
                          {c.pm_wins}
                        </div>
                      )}
                      {c.pm_wastes && (
                        <div className="text-orange-700 dark:text-orange-400">
                          <span className="text-muted-foreground">Wasted: </span>
                          {c.pm_wastes}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <ListChecks className="h-3.5 w-3.5" />
            <span className="text-[11px] uppercase tracking-widest">Next-week planning</span>
          </div>
          {daysLogged > 0 && (
            <div className="grid gap-3 md:grid-cols-3 mb-4">
              {planningPrompts.map((prompt) => (
                <div key={prompt.label} className="rounded-xl border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {prompt.label}
                  </div>
                  <div className="mt-2 text-sm font-display font-semibold text-foreground">
                    {prompt.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          <EntryEditor
            entry={getNextWeekPlanEntry()}
            entryType="next_week"
            title={`Plan for week of ${nextWeekStart}`}
            placeholder="Pick 3 outcomes, 1 constraint to remove, and the first Monday action."
            onSave={(content, type) => saveEntry(content, undefined, type)}
            isSaving={journalSaving}
          />
        </div>

        <div className="bg-card rounded-3xl p-5 md:p-8 shadow-card">
          <h2 className="text-2xl font-display font-bold mb-4">Weekly + monthly journal</h2>
          {!journalLoaded ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-muted/40 rounded" />
              <div className="h-32 w-full bg-muted/40 rounded-xl" />
            </div>
          ) : (
            <>
              <TodayPrompt
                todayEntry={getTodayEntry()}
                weeklyEntry={getWeeklyEntry()}
                monthlyEntry={getMonthlyEntry()}
                isSunday={isSunday()}
                isLastDayOfMonth={isLastDayOfMonth()}
                onSave={(content, type) => saveEntry(content, undefined, type)}
                hideDaily
                isSaving={journalSaving}
              />
              {!isSunday() && !isLastDayOfMonth() && (
                <p className="text-sm text-muted-foreground mt-4">
                  Weekly reflection unlocks on Sunday. Monthly summary unlocks on the last day of the month.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

function RewardHero({
  isLoaded,
  daysLogged,
  elapsedCount,
  thisWeekAvg,
  delta,
  bestDay,
  hasItems,
}: {
  isLoaded: boolean;
  daysLogged: number;
  elapsedCount: number;
  thisWeekAvg: number;
  delta: number | null;
  bestDay: { date: string; score: number } | null;
  hasItems: boolean;
}) {
  if (!isLoaded) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 animate-pulse">
        <div className="h-3 w-24 bg-muted/40 rounded mb-3" />
        <div className="h-10 w-40 bg-muted/40 rounded mb-2" />
        <div className="h-3 w-48 bg-muted/40 rounded" />
      </div>
    );
  }

  if (!hasItems) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
          No scoreboard yet
        </div>
        <p className="text-sm text-foreground mb-3">
          Add a few items to your scoreboard so this week has something to recap.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Set up scoreboard
        </Link>
      </div>
    );
  }

  if (daysLogged === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
          Recap starts after day one
        </div>
        <p className="text-sm text-foreground mb-3">
          You're {elapsedCount}/7 days in. Score even one item today and your week comes alive
          here.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Log today
        </Link>
      </div>
    );
  }

  const isPartial = daysLogged < elapsedCount;
  const deltaTone = delta === null
    ? 'neutral'
    : delta > 0
    ? 'good'
    : delta < 0
    ? 'bad'
    : 'neutral';
  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaClass =
    deltaTone === 'good'
      ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
      : deltaTone === 'bad'
      ? 'text-destructive bg-destructive/10 border-destructive/30'
      : 'text-muted-foreground bg-muted/40 border-border';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
            {isPartial ? 'Week so far' : 'Your week'}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl md:text-6xl font-extrabold tabular-nums text-foreground">
              {thisWeekAvg}
            </span>
            <span className="text-2xl md:text-3xl font-display font-bold text-muted-foreground">%</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${deltaClass}`}>
              <DeltaIcon className="h-3 w-3" />
              {delta === null
                ? 'No prior week yet'
                : delta === 0
                ? 'Same as last week'
                : `${delta > 0 ? '+' : ''}${delta}% vs last week`}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              {daysLogged}/{elapsedCount} days logged
            </span>
          </div>
        </div>
        {bestDay && (
          <div className="hidden sm:block rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-widest text-emerald-700/80 dark:text-emerald-300/80 flex items-center justify-end gap-1">
              <Trophy className="h-3 w-3" /> Best day
            </div>
            <div className="mt-1 font-display text-lg font-bold text-foreground">
              {format(parseISO(bestDay.date), 'EEE')}
            </div>
            <div className="text-xs text-muted-foreground">{bestDay.score}%</div>
          </div>
        )}
      </div>
      {bestDay && (
        <div className="sm:hidden mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
            <Trophy className="h-3 w-3" /> Best day {format(parseISO(bestDay.date), 'EEE')}
          </span>
          <span className="font-display font-bold text-foreground">{bestDay.score}%</span>
        </div>
      )}
    </div>
  );
}

function PatternCard({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: typeof LineChart;
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${
          tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : ''
        }`} />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-display font-semibold text-foreground">{value}</div>
    </div>
  );
}

function scoreForDay(
  dailyItems: ScoreboardItem[],
  logByItemDate: Map<string, ScoreboardLog>,
  date: string,
) {
  if (dailyItems.length === 0) return 0;
  const score = dailyItems.reduce((sum, item) => {
    const log = logByItemDate.get(`${item.id}:${date}`);
    if (!log) return sum;
    if (item.kind === 'score') {
      const max = Math.max(1, item.max_score ?? item.ideal_score ?? 1);
      return sum + Math.min(1, Math.max(0, (log.value_score ?? 0) / max));
    }
    if (item.kind === 'check') return sum + (log.value_bool ? 1 : 0);
    return sum + (log.value_text?.trim() ? 1 : 0);
  }, 0);
  return Math.round((score / dailyItems.length) * 100);
}

function getWeeklyPatterns(
  dailyItems: ScoreboardItem[],
  notToDos: ScoreboardItem[],
  logs: ScoreboardLog[],
  days: string[],
) {
  const logByItemDate = new Map(logs.map((log) => [`${log.item_id}:${log.date}`, log] as const));
  const dailyStats = dailyItems.map((item) => {
    let hits = 0;
    let current = 0;
    let best = 0;
    for (const day of days) {
      const log = logByItemDate.get(`${item.id}:${day}`);
      const hit = item.kind === 'score'
        ? Boolean(log?.value_score && log.value_score > 0)
        : item.kind === 'check'
        ? Boolean(log?.value_bool)
        : Boolean(log?.value_text && log.value_text.trim());
      if (hit) {
        hits += 1;
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    return { item, hits, skips: days.length - hits, best };
  });

  const best = dailyStats.length > 0
    ? dailyStats.reduce((winner, row) => (row.best > winner.best ? row : winner), dailyStats[0])
    : null;
  const worst = dailyStats.length > 0
    ? dailyStats.reduce((winner, row) => (row.skips > winner.skips ? row : winner), dailyStats[0])
    : null;
  const breachCount = notToDos.reduce(
    (sum, item) =>
      sum +
      days.filter((day) => {
        const log = logByItemDate.get(`${item.id}:${day}`);
        return Boolean(log?.value_bool || (log?.value_text && log.value_text.trim()));
      }).length,
    0,
  );

  const reasonCounts = new Map<string, number>();
  for (const item of dailyItems) {
    if (item.kind !== 'check') continue;
    for (const day of days) {
      const log = logByItemDate.get(`${item.id}:${day}`);
      if (log?.value_bool || !log?.value_text?.trim()) continue;
      const reason = log.value_text.trim();
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }
  const repeatedReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    bestStreak: best && best.best > 0
      ? `${best.item.label}: ${best.best} day${best.best === 1 ? '' : 's'}`
      : 'No streak yet',
    mostSkipped: worst && worst.skips > 0
      ? `${worst.item.label}: ${worst.skips} missed`
      : 'No misses yet',
    breaches: `${breachCount} this week`,
    repeatedReason: repeatedReason ? `${repeatedReason[0]} (${repeatedReason[1]}x)` : 'No repeated reason yet',
  };
}

function getPlanningPrompts(patterns: ReturnType<typeof getWeeklyPatterns>) {
  return [
    { label: 'Protect', value: patterns.bestStreak },
    { label: 'Repair', value: patterns.mostSkipped },
    { label: 'Reduce', value: patterns.breaches },
  ];
}

function getReflectionQuestion(
  avg: number,
  daysLogged: number,
  patterns: ReturnType<typeof getWeeklyPatterns>,
): string | null {
  if (daysLogged === 0) return null;
  const anchorItem = patterns.bestStreak !== 'No streak yet' ? patterns.bestStreak.split(':')[0] : null;
  const skippedItem = patterns.mostSkipped !== 'No misses yet' ? patterns.mostSkipped.split(':')[0] : null;
  if (avg >= 70 && anchorItem) {
    return `${anchorItem} was your anchor this week. What made it stick — and can you design next week to protect it?`;
  }
  if (avg >= 70) {
    return 'Strong week. What specifically drove your best days — and can you lock that pattern in?';
  }
  if (avg >= 40 && skippedItem) {
    return `${skippedItem} kept slipping. What's the real blocker — motivation, time, or environment?`;
  }
  if (avg >= 40) {
    return 'Mixed week. Where did the gap open between your intentions and your actions?';
  }
  return 'Tough stretch. What was the biggest external drag, and what one thing stays fully under your control?';
}

export default Review;
