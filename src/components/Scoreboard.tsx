import { useEffect, useMemo, useState } from 'react';
import { useScoreboard } from '@/hooks/useScoreboard';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  X,
  Check,
  Flame,
  ListChecks,
  Pencil,
  CalendarCheck,
  CalendarRange,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cadenceFromCategory, type ScoreCategory, type ScoreKind } from '@/lib/scoreboardDefaults';

function isHit(log: { value_bool: boolean; value_text: string | null } | undefined, kind: ScoreKind): boolean {
  if (!log) return false;
  return kind === 'check' ? log.value_bool : Boolean(log.value_text && log.value_text.trim());
}

function isBreach(log: { value_bool: boolean; value_text: string | null } | undefined): boolean {
  return Boolean(log?.value_bool || (log?.value_text && log.value_text.trim()));
}

const groups: Array<{
  id: ScoreCategory;
  title: string;
  shortTitle: string;
  icon: typeof ListChecks;
  description: string;
}> = [
  { id: 'daily', title: 'Daily', shortTitle: 'Daily', icon: ListChecks, description: 'Everyday baselines' },
  { id: 'weekly', title: 'Weekly', shortTitle: 'Weekly', icon: CalendarCheck, description: 'Once-a-week upkeep' },
  { id: 'monthly', title: 'Monthly', shortTitle: 'Month', icon: CalendarRange, description: 'Monthly reviews' },
  { id: 'not_to_do', title: 'Not-to-dos', shortTitle: 'Avoid', icon: ShieldCheck, description: 'Daily constraints' },
];

export function Scoreboard() {
  const { user } = useAuth();
  const { items, logs, today, logFor, addItem, seedDefaults, removeItem, renameItem, setLog, isLoaded } = useScoreboard();

  const hour = new Date().getHours();
  const isMorning = hour < 12;
  const isEveningAudit = hour >= 18;
  const isLateZero = hour >= 15;
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<ScoreKind>('check');
  const [newCategory, setNewCategory] = useState<ScoreCategory>('daily');
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    if (isLoaded && items.length === 0) {
      void seedDefaults();
    }
  }, [isLoaded, items.length, seedDefaults]);

  const historyDays = useMemo(() => (
    Array.from({ length: 84 }, (_, index) => format(subDays(new Date(), 83 - index), 'yyyy-MM-dd'))
  ), []);

  const logByItemDate = useMemo(() => {
    const m = new Map<string, { value_bool: boolean; value_text: string | null }>();
    for (const log of logs) {
      m.set(`${log.item_id}:${log.date}`, log);
    }
    return m;
  }, [logs]);

  const streak = useMemo(() => {
    const dailyItems = items.filter((item) => item.category === 'daily');
    if (dailyItems.length === 0) return 0;
    const itemKindById = new Map(dailyItems.map((i) => [i.id, i.kind] as const));
    const hitsByDate = new Map<string, number>();
    for (const log of logs) {
      const kind = itemKindById.get(log.item_id);
      if (!kind) continue;
      if (isHit(log, kind)) {
        hitsByDate.set(log.date, (hitsByDate.get(log.date) ?? 0) + 1);
      }
    }
    let cursor = new Date();
    if ((hitsByDate.get(format(cursor, 'yyyy-MM-dd')) ?? 0) === 0) {
      cursor = subDays(cursor, 1);
    }
    let n = 0;
    while ((hitsByDate.get(format(cursor, 'yyyy-MM-dd')) ?? 0) > 0) {
      n += 1;
      cursor = subDays(cursor, 1);
    }
    return n;
  }, [items, logs]);

  const dueTodayItems = items.filter((i) => i.category === 'daily');
  const todayHits = dueTodayItems.filter((i) => isHit(logFor(i.id), i.kind)).length;
  const total = dueTodayItems.length;
  const fullHouse = total > 0 && todayHits === total;
  const nonZeroToday = todayHits >= 1;
  const duplicateLabel = items.some((item) => item.label.trim().toLowerCase() === newLabel.trim().toLowerCase());

  const submitAdd = async () => {
    if (!newLabel.trim() || duplicateLabel) return;
    await addItem(newLabel, newKind, cadenceFromCategory(newCategory), newCategory);
    setNewLabel('');
  };

  const startEdit = (id: string, currentLabel: string) => {
    setEditing(id);
    setEditLabel(currentLabel);
  };

  const submitEdit = async () => {
    if (editing && editLabel.trim()) {
      await renameItem(editing, editLabel);
    }
    setEditing(null);
    setEditLabel('');
  };

  if (!user) return null;

  return (
    <div className={`rounded-2xl p-5 space-y-4 border transition-all ${
      fullHouse
        ? 'bg-gradient-to-br from-emerald-500/15 to-primary/15 border-emerald-500/40 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]'
        : nonZeroToday
        ? 'bg-card border-border shadow-soft'
        : isLateZero
        ? 'bg-destructive/10 border-destructive/60 shadow-[0_0_36px_-14px_hsl(var(--destructive))]'
        : 'bg-card border-destructive/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className={`h-4 w-4 ${nonZeroToday ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground">
            Daily scoreboard
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Flame className={`h-3 w-3 ${streak > 0 ? 'text-orange-500' : ''}`} />
            <span className="font-display font-bold text-foreground tabular-nums">{streak}</span> streak
          </span>
          <span className={`font-mono ${fullHouse ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {todayHits}/{total}
          </span>
        </div>
      </div>

      <div className={`rounded-xl border px-3 py-2 text-xs ${
        isLateZero && !nonZeroToday
          ? 'border-destructive/50 bg-destructive/10 text-destructive'
          : 'border-border bg-background text-muted-foreground'
      }`}>
        {isMorning
          ? 'Morning: commit to the smallest real wins before the day gets noisy.'
          : isEveningAudit
          ? 'Evening: missed daily items need one honest sentence. Breaches get logged, not hidden.'
          : isLateZero && !nonZeroToday
          ? 'Late day, zero progress. Do one baseline before touching the softer parts of the app.'
          : 'Keep the next action visible. One real mark keeps the day from becoming vague.'}
      </div>

      {isLoaded && items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Preparing your daily structure.
        </p>
      )}

      <div className="space-y-5">
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.category === group.id);
          if (groupItems.length === 0) return null;
          const Icon = group.icon;
          return (
            <section key={group.id} className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{group.title}</span>
              </div>

              <ul className="space-y-1.5">
                {groupItems.map((item) => {
                  const log = logFor(item.id);
                  const isNotToDo = item.category === 'not_to_do';
                  const hit = isNotToDo ? false : isHit(log, item.kind);
                  const breached = isNotToDo && isBreach(log);
                  const isEditing = editing === item.id;
                  const stats = getHistoryStats(item.id, item.kind, item.category, historyDays, logByItemDate);
                  return (
                    <li
                      key={item.id}
                      className={`group rounded-xl border p-3 transition-colors ${
                        breached
                          ? 'bg-destructive/10 border-destructive/40'
                          : hit
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-background border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isNotToDo ? (
                          <button
                            onClick={() => setLog(item.id, { value_bool: !breached, value_text: breached ? null : log?.value_text ?? 'Breach' })}
                            className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                              breached
                                ? 'bg-destructive text-destructive-foreground'
                                : 'bg-muted border border-border hover:border-destructive'
                            }`}
                            aria-label={breached ? 'Clear breach' : 'Log breach'}
                          >
                            {breached && <X className="h-3.5 w-3.5" />}
                          </button>
                        ) : item.kind === 'check' ? (
                          <button
                            onClick={() => setLog(item.id, { value_bool: !hit })}
                            className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                              hit
                                ? 'bg-emerald-500 text-white'
                                : 'bg-muted border border-border hover:border-primary'
                            }`}
                            aria-label={hit ? 'Mark undone' : 'Mark done'}
                          >
                            {hit && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <span className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-mono ${
                            hit ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            →
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                            <div className="min-w-0">
                              {isEditing ? (
                                <Input
                                  autoFocus
                                  value={editLabel}
                                  onChange={(e) => setEditLabel(e.target.value)}
                                  onBlur={submitEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitEdit();
                                    if (e.key === 'Escape') { setEditing(null); setEditLabel(''); }
                                  }}
                                  className="h-7 text-sm bg-background"
                                />
                              ) : (
                                <button
                                  onClick={() => startEdit(item.id, item.label)}
                                  className="text-left font-display font-medium text-sm text-foreground hover:underline decoration-dotted"
                                >
                                  {item.label}
                                </button>
                              )}

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                <span>{stats.label}: {stats.hits}/{historyDays.length}</span>
                                <span>{stats.rate}%</span>
                                <span>{stats.currentStreak} {stats.streakLabel}</span>
                              </div>
                            </div>

                            <HistoryStrip
                              itemId={item.id}
                              kind={item.kind}
                              category={item.category}
                              days={historyDays}
                              logByItemDate={logByItemDate}
                              onToggle={(date, nextValue) => setLog(item.id, {
                                value_bool: nextValue,
                                value_text: item.category === 'not_to_do' && nextValue ? 'Breach' : undefined,
                              }, date)}
                            />
                          </div>

                          {isNotToDo && (
                            <Input
                              value={log?.value_text ?? ''}
                              onChange={(e) => setLog(item.id, { value_bool: Boolean(e.target.value.trim()), value_text: e.target.value })}
                              placeholder="Trigger / breach note"
                              className="mt-2 h-8 text-xs bg-background"
                            />
                          )}

                          {!isNotToDo && item.kind === 'output' && (
                            <Input
                              value={log?.value_text ?? ''}
                              onChange={(e) => setLog(item.id, { value_text: e.target.value })}
                              placeholder={item.label.toLowerCase() === 'deep work' ? 'minutes + output / proof' : 'link / one-liner'}
                              className="mt-2 h-8 text-xs bg-background"
                            />
                          )}

                          {isEveningAudit && !isNotToDo && item.kind === 'check' && !hit && (
                            <Input
                              value={log?.value_text ?? ''}
                              onChange={(e) => setLog(item.id, { value_text: e.target.value })}
                              placeholder="Missed because..."
                              className="mt-2 h-8 text-xs bg-background border-orange-500/40"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(item.id, item.label)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <button
          onClick={() => setIsCreating((value) => !value)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Create item
          </span>
          {isCreating ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {isCreating && (
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {groups.map((group) => {
                const Icon = group.icon;
                const selected = newCategory === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => setNewCategory(group.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className="h-4 w-4" />
                      <span>{group.title}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{group.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
              <div className="flex bg-muted/50 rounded-md p-0.5 text-[10px] font-semibold uppercase tracking-wider">
                <button
                  onClick={() => setNewKind('check')}
                  className={`px-2 py-1 rounded ${newKind === 'check' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Check
                </button>
                <button
                  onClick={() => setNewKind('output')}
                  className={`px-2 py-1 rounded ${newKind === 'output' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Output
                </button>
              </div>

              <div>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); }}
                  placeholder={newKind === 'check' ? 'Add item' : 'Add output'}
                  className="h-9 text-sm bg-background"
                />
                {duplicateLabel && (
                  <p className="mt-1 text-[11px] text-destructive">That item already exists.</p>
                )}
              </div>

              <Button size="sm" onClick={submitAdd} disabled={!newLabel.trim() || duplicateLabel}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          {fullHouse
            ? `Daily full house: ${total}/${total}.`
            : nonZeroToday
            ? `${todayHits}/${total} daily done. Push for one more before bed.`
            : `Zero so far. One toggle = streak alive.`}
          <span className="opacity-60"> · {today}</span>
        </p>
      )}
    </div>
  );
}

function HistoryStrip({
  itemId,
  kind,
  category,
  days,
  logByItemDate,
  onToggle,
}: {
  itemId: string;
  kind: ScoreKind;
  category: ScoreCategory;
  days: string[];
  logByItemDate: Map<string, { value_bool: boolean; value_text: string | null }>;
  onToggle: (date: string, nextValue: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(28,0.5rem)] gap-1 sm:grid-cols-[repeat(42,0.5rem)] md:grid-cols-[repeat(84,0.5rem)]" aria-label="History">
      {days.map((date, index) => {
        const log = logByItemDate.get(`${itemId}:${date}`);
        const hit = category === 'not_to_do' ? isBreach(log) : isHit(log, kind);
        const hideOnMobile = index < 56;
        const hideOnTablet = index < 42;
        const className = `h-2 w-2 rounded-[2px] transition-colors ${
          hideOnMobile ? 'hidden md:block' : hideOnTablet ? 'hidden sm:block' : ''
        } ${hit
          ? category === 'not_to_do' ? 'bg-destructive hover:bg-destructive/80' : 'bg-emerald-500 hover:bg-emerald-600'
          : 'bg-muted hover:bg-muted-foreground/40'}`;
        if (kind !== 'check' && category !== 'not_to_do') {
          return (
            <span
              key={date}
              title={`${date}: ${hit ? 'done' : 'empty'}`}
              className={className}
            />
          );
        }
        return (
          <button
            key={date}
            title={`${date}: ${hit ? 'done' : 'empty'}`}
            onClick={() => onToggle(date, !hit)}
            className={className}
            aria-label={`${hit ? 'Clear' : 'Mark'} ${date}`}
          />
        );
      })}
    </div>
  );
}

function getHistoryStats(
  itemId: string,
  kind: ScoreKind,
  category: ScoreCategory,
  days: string[],
  logByItemDate: Map<string, { value_bool: boolean; value_text: string | null }>,
) {
  const hits = days.reduce((count, date) => (
    count + ((category === 'not_to_do' ? isBreach(logByItemDate.get(`${itemId}:${date}`)) : isHit(logByItemDate.get(`${itemId}:${date}`), kind)) ? 1 : 0)
  ), 0);

  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const marked = category === 'not_to_do'
      ? isBreach(logByItemDate.get(`${itemId}:${days[index]}`))
      : isHit(logByItemDate.get(`${itemId}:${days[index]}`), kind);
    if (category === 'not_to_do' ? marked : !marked) break;
    currentStreak += 1;
  }

  return {
    hits,
    currentStreak,
    label: category === 'not_to_do' ? 'breaches' : 'hits',
    streakLabel: category === 'not_to_do' ? 'clean streak' : 'streak',
    rate: Math.round((hits / days.length) * 100),
  };
}
