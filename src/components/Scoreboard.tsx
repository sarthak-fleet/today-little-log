import { useMemo, useRef, useState } from 'react';
import { useScoreboard, type ScoreboardItem } from '@/hooks/useScoreboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { CalendarDays, Lock, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { eachDayOfInterval, endOfMonth, format, isAfter, isToday, startOfMonth } from 'date-fns';

type ScoreInputValue = string | boolean;
type ScoreInputs = Record<string, ScoreInputValue>;

interface ScoreEntryNote {
  kind: 'score-inputs-v1';
  sourceKey: string;
  inputs: ScoreInputs;
  note: string;
}

function scoreFor(item: ScoreboardItem, value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(item.min_score, Math.min(item.max_score, Math.round(parsed)));
}

function clampScore(item: ScoreboardItem, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(item.min_score, Math.min(item.max_score, Math.round(value)));
}

function numberInput(inputs: ScoreInputs, key: string): number {
  const value = inputs[key];
  if (typeof value === 'boolean') return value ? 1 : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function boolInput(inputs: ScoreInputs, key: string): boolean {
  return inputs[key] === true;
}

function timeToMinutes(value: ScoreInputValue | undefined): number | null {
  if (typeof value !== 'string' || !value.includes(':')) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function parseEntryNote(value: string, sourceKey: string | null): ScoreEntryNote | null {
  if (!sourceKey) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ScoreEntryNote>;
    if (parsed.kind !== 'score-inputs-v1' || parsed.sourceKey !== sourceKey) return null;
    return {
      kind: 'score-inputs-v1',
      sourceKey,
      inputs: parsed.inputs ?? {},
      note: parsed.note ?? '',
    };
  } catch {
    return null;
  }
}

function encodeEntryNote(sourceKey: string, inputs: ScoreInputs, note: string): string {
  return JSON.stringify({
    kind: 'score-inputs-v1',
    sourceKey,
    inputs,
    note,
  } satisfies ScoreEntryNote);
}

function displayNote(value: string, sourceKey: string | null): string {
  return parseEntryNote(value, sourceKey)?.note ?? value;
}

function hasAutoInputs(item: ScoreboardItem): boolean {
  return [
    'sleep',
    'steps',
    'focus-hours',
    'exercise',
    'journal-daily-tick',
    'diet',
    'connections',
    'adult-content',
    'creatine-supplements',
    'hygiene',
    'sitting-entertainment',
    'social-media',
  ].includes(item.source_key ?? '');
}

function calculatedScore(item: ScoreboardItem, inputs: ScoreInputs): number {
  switch (item.source_key) {
    case 'sleep': {
      const hours = numberInput(inputs, 'hours');
      const wakeMinutes = timeToMinutes(inputs.wakeTime);
      const sleepScore = Math.max(0, 7 - Math.ceil(Math.max(0, 7 - hours) / 0.5));
      const wakeScore = wakeMinutes === null
        ? 0
        : Math.max(0, 7 - Math.ceil(Math.max(0, wakeMinutes - 6 * 60) / 30));
      return clampScore(item, sleepScore + wakeScore);
    }
    case 'steps':
      return clampScore(item, Math.floor(numberInput(inputs, 'steps') / 1000));
    case 'focus-hours':
      return clampScore(item, numberInput(inputs, 'hours') * 3);
    case 'exercise': {
      const count = ['stretch', 'cardio', 'strength'].filter((key) => boolInput(inputs, key)).length;
      return count === 0 ? 0 : count === 1 ? 5 : count === 2 ? 8 : 10;
    }
    case 'journal-daily-tick':
      return boolInput(inputs, 'done') ? 3 : 0;
    case 'diet': {
      const protein = numberInput(inputs, 'protein') >= 100 ? 3 : 0;
      const fiber = numberInput(inputs, 'fiber') >= 20 ? 2 : 0;
      const windowHours = numberInput(inputs, 'windowHours');
      const windowScore = windowHours <= 0 ? 0 : windowHours <= 6 ? 4 : windowHours <= 8 ? 3 : windowHours <= 10 ? 2 : 0;
      const junkPenalty = inputs.junk === 'minor' ? -1 : inputs.junk === 'moderate' ? -2 : inputs.junk === 'major' ? -3 : 0;
      return clampScore(item, protein + fiber + windowScore + junkPenalty);
    }
    case 'connections':
      return boolInput(inputs, 'done') ? 3 : 0;
    case 'adult-content':
      return boolInput(inputs, 'consumed') ? -10 : 0;
    case 'creatine-supplements':
      return boolInput(inputs, 'done') ? 2 : 0;
    case 'hygiene': {
      const brush = boolInput(inputs, 'brush') ? 2 : 0;
      const bath = boolInput(inputs, 'bath') ? 2 : 0;
      return brush + bath;
    }
    case 'sitting-entertainment': {
      const hours = numberInput(inputs, 'hours');
      return clampScore(item, hours <= 1 ? 0 : -2 * Math.ceil(hours - 1));
    }
    case 'social-media': {
      const minutes = numberInput(inputs, 'minutes');
      return clampScore(item, minutes <= 30 ? 0 : -2 * Math.ceil((minutes - 30) / 30));
    }
    default:
      return 0;
  }
}

interface ScoreboardProps {
  readOnly?: boolean;
}

export function Scoreboard({ readOnly = false }: ScoreboardProps) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const {
    items,
    logs,
    dayNotes,
    todayLogs,
    today,
    logFor,
    dayNoteFor,
    setLog,
    setLowScoreReason,
    lockMonth,
    isLocked,
    isConfigured,
    isLoaded,
    trackingStartDate,
    addItem,
    updateItem,
    removeItem,
  } = useScoreboard(currentMonth);

  const scoringMatrixRef = useRef<HTMLElement>(null);
  const [editorState, setEditorState] = useState<{ mode: 'add' } | { mode: 'edit'; item: ScoreboardItem } | null>(null);

  const days = useMemo(() => {
    const now = new Date();
    return eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  }, []);

  const idealToday = items.reduce((sum, item) => sum + item.ideal_score, 0);
  const peakToday = items.reduce((sum, item) => sum + item.max_score, 0);
  const todayTotal = items.reduce((sum, item) => sum + (logFor(item.id)?.value_score ?? 0), 0);
  const todayPercent = idealToday > 0 ? Math.round((todayTotal / idealToday) * 100) : 0;

  const totalsByDate = useMemo(() => {
    const itemIds = new Set(items.map((item) => item.id));
    const totals = new Map<string, number>();
    for (const log of logs) {
      if (!itemIds.has(log.item_id)) continue;
      totals.set(log.date, (totals.get(log.date) ?? 0) + (log.value_score ?? 0));
    }
    return totals;
  }, [items, logs]);

  const reasonByDate = useMemo(() => {
    const reasons = new Map<string, string>();
    for (const note of dayNotes) {
      if (note.low_score_reason?.trim()) reasons.set(note.date, note.low_score_reason);
    }
    return reasons;
  }, [dayNotes]);

  const elapsedDays = days.filter((day) => {
    const date = format(day, 'yyyy-MM-dd');
    return date >= trackingStartDate && !isAfter(day, new Date());
  });

  const missedDays = useMemo(() => {
    if (!isLoaded || items.length === 0) return 0;
    return elapsedDays.filter((day) => {
      const date = format(day, 'yyyy-MM-dd');
      return date < today && !totalsByDate.has(date);
    }).length;
  }, [isLoaded, items, elapsedDays, today, totalsByDate]);

  const showRecoveryBanner = !readOnly && isLoaded && missedDays > 0 && todayLogs.length === 0;

  const monthMaxSoFar = idealToday * elapsedDays.length;
  const monthTotalSoFar = elapsedDays.reduce((sum, day) => sum + (totalsByDate.get(format(day, 'yyyy-MM-dd')) ?? 0), 0);
  const monthPercent = monthMaxSoFar > 0 ? Math.round((monthTotalSoFar / monthMaxSoFar) * 100) : 0;
  const currentItemIds = new Set(items.map((item) => item.id));
  const loggedTodayCount = todayLogs.filter((log) => (
    currentItemIds.has(log.item_id)
    && (
      (log.value_score !== null && log.value_score !== undefined)
      || Boolean(log.value_text?.trim())
    )
  )).length;
  const remainingToday = Math.max(0, items.length - loggedTodayCount);
  const todayProgress = Math.max(0, Math.min(100, todayPercent));
  const monthProgress = Math.max(0, Math.min(100, monthPercent));

  const submitLockMonth = async () => {
    const confirmed = window.confirm(
      `Lock ${format(new Date(), 'MMMM yyyy')}? You will not be able to edit tasks, criteria, notes, or scores for this month after locking.`,
    );
    if (!confirmed) return;
    await lockMonth();
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-border bg-card p-4 shadow-soft md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                Today's scoreboard
              </div>
              <h1 className="mt-2 text-4xl font-display font-extrabold tracking-tight text-foreground md:text-5xl">
                {todayTotal}<span className="text-muted-foreground">/{idealToday}</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d')} · {todayPercent}% of ideal · peak {peakToday}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:min-w-[22rem]">
              <Stat label="Logged" value={`${loggedTodayCount}/${items.length}`} />
              <Stat label="Left" value={`${remainingToday}`} />
              <Stat label="Month" value={`${monthTotalSoFar}/${monthMaxSoFar}`} />
              <Stat label="Pace" value={`${monthPercent}%`} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProgressTile label="Today" value={`${todayPercent}%`} progress={todayProgress} />
            <ProgressTile label="Month to date" value={`${monthPercent}%`} progress={monthProgress} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-soft md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Daily closeout
              </p>
              <h2 className="mt-2 font-display text-lg font-bold text-foreground">
                {isLocked ? 'Month locked' : 'Score note'}
              </h2>
            </div>
            {isLocked ? (
              <div className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                <Lock className="h-3.5 w-3.5" />
                Locked
              </div>
            ) : !readOnly ? (
              <Button variant="outline" size="sm" onClick={submitLockMonth}>
                <Lock className="h-4 w-4" />
                Lock month
              </Button>
            ) : null}
          </div>

          {readOnly ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Scores are shown without editing controls.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Attach the real reason to today's total, not an individual row.
              </p>
              <Textarea
                disabled={isLocked}
                value={dayNoteFor()?.low_score_reason ?? ''}
                onChange={(event) => setLowScoreReason(event.target.value)}
                placeholder="Why was today's score low?"
                className="mt-3 min-h-24 bg-background"
              />
            </>
          )}
        </div>
      </section>

      {showRecoveryBanner && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 md:p-5">
          <p className="text-sm font-semibold text-foreground">
            {missedDays === 1 ? 'One day went unlogged — no big deal.' : `${missedDays} days went unlogged — that's okay.`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Streaks break. The only day that matters right now is today.
          </p>
          <Button
            variant="default"
            size="sm"
            className="mt-3"
            onClick={() => scoringMatrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Write today ↓
          </Button>
        </section>
      )}

      <section ref={scoringMatrixRef} className="rounded-lg border border-border bg-card p-4 shadow-soft md:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              Habits, rituals & everything
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {readOnly ? "Today's scores" : `${format(new Date(), 'MMMM yyyy')} scoring matrix`}
            </h2>
            {!readOnly && (
              <p className="text-sm text-muted-foreground">
                {isLocked
                  ? 'This month is locked. You can review it, but not change daily scores or reasons.'
                  : 'One row per thing you track. Add, edit, or remove rows — this matrix is yours.'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-muted-foreground">{currentMonth}</div>
            {!readOnly && !isLocked && (
              <Button size="sm" onClick={() => setEditorState({ mode: 'add' })} className="gap-1">
                <Plus className="h-4 w-4" />
                Add row
              </Button>
            )}
          </div>
        </div>

        {isLocked && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
            Locked months are immutable. To set a new precedence, use next month and create a fresh scoring matrix.
          </div>
        )}

        {!isLoaded ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
            {isConfigured
              ? 'No scoring tasks are configured for this month yet.'
              : 'No scoring matrix exists for this month.'}
          </div>
        ) : (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {items.map((item) => (
              <ScoreRow
                key={item.id}
                item={item}
                score={logFor(item.id)?.value_score}
                note={logFor(item.id)?.value_text ?? ''}
                isLocked={isLocked}
                readOnly={readOnly}
                onChange={(patch) => setLog(item.id, patch)}
                onEdit={() => setEditorState({ mode: 'edit', item })}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      {!readOnly && (
        <section className="rounded-lg border border-border bg-card p-4 shadow-soft md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Month view</h2>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={`${day}-${index}`} className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {day}
            </div>
          ))}
          {Array.from({ length: days[0].getDay() }, (_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {days.map((day) => {
            const date = format(day, 'yyyy-MM-dd');
            const total = totalsByDate.get(date) ?? 0;
            const reason = reasonByDate.get(date);
            const future = isAfter(day, new Date());
            const notCounted = date < trackingStartDate;
            const percent = idealToday > 0 ? Math.round((total / idealToday) * 100) : 0;
            return (
              <div
                key={date}
                title={reason ? `${date}: ${reason}` : date}
                className={`min-h-16 rounded-lg border p-1.5 sm:min-h-20 sm:p-2 transition-colors ${
                  isToday(day)
                    ? 'border-primary bg-primary/10'
                    : future || notCounted
                    ? 'border-border bg-muted/20 text-muted-foreground'
                    : percent >= 80
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : percent >= 50
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-border bg-background'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{format(day, 'd')}</span>
                  {!future && !notCounted && idealToday > 0 && <span className="text-[10px] text-muted-foreground">{percent}%</span>}
                </div>
                {!future && notCounted && (
                  <div className="mt-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:mt-4 sm:text-[10px]">
                    Not counted
                  </div>
                )}
                {!future && !notCounted && (
                  <>
                    <div className="mt-2 text-xs font-display font-bold tabular-nums sm:mt-4 sm:text-sm">
                      {total}<span className="text-muted-foreground">/{idealToday}</span>
                    </div>
                    {reason && (
                      <div className="mt-1 truncate text-[10px] text-muted-foreground">
                        Reason noted
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        </section>
      )}

      {!readOnly && editorState && (
        <ScoreItemEditor
          state={editorState}
          onClose={() => setEditorState(null)}
          onSubmit={async ({ label, maxScore, criteria }) => {
            if (editorState.mode === 'add') {
              await addItem({ label, maxScore, criteria });
            } else {
              await updateItem(editorState.item.id, { label, max_score: maxScore, criteria });
            }
            setEditorState(null);
          }}
        />
      )}
    </div>
  );
}

function ScoreItemEditor({
  state,
  onClose,
  onSubmit,
}: {
  state: { mode: 'add' } | { mode: 'edit'; item: ScoreboardItem };
  onClose: () => void;
  onSubmit: (values: { label: string; maxScore: number; criteria: string }) => Promise<void>;
}) {
  const initial = state.mode === 'edit' ? state.item : null;
  const [label, setLabel] = useState(initial?.label ?? '');
  const [maxScore, setMaxScore] = useState<string>(String(initial?.max_score ?? 5));
  const [criteria, setCriteria] = useState(initial?.criteria ?? '');
  const trimmed = label.trim();
  const parsedMax = Math.max(1, Math.round(Number(maxScore) || 1));
  const canSubmit = trimmed.length > 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.mode === 'add' ? 'Add row' : `Edit "${initial?.label}"`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="score-label">Title</Label>
            <Input
              id="score-label"
              autoFocus
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Read 30 min, Cold shower, Drink water…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="score-max">Max score per day</Label>
            <Input
              id="score-max"
              type="number"
              min={1}
              value={maxScore}
              onChange={(event) => setMaxScore(event.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Daily score will be clamped between 0 and {parsedMax}.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="score-criteria">Scoring rule (optional)</Label>
            <Textarea
              id="score-criteria"
              rows={3}
              value={criteria}
              onChange={(event) => setCriteria(event.target.value)}
              placeholder="What earns full points? What loses points?"
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!canSubmit}
              onClick={() => onSubmit({ label: trimmed, maxScore: parsedMax, criteria })}
            >
              {state.mode === 'add' ? 'Add row' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressTile({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-display text-sm font-bold text-foreground">{value}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ScoreRow({
  item,
  score,
  note,
  isLocked,
  readOnly,
  onChange,
  onEdit,
  onRemove,
}: {
  item: ScoreboardItem;
  score: number | null | undefined;
  note: string;
  isLocked: boolean;
  readOnly: boolean;
  onChange: (patch: { value_score?: number | null; value_text?: string | null }) => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const entryNote = parseEntryNote(note, item.source_key);
  const inputs = entryNote?.inputs ?? {};
  const proofNote = displayNote(note, item.source_key);
  const autoInputs = hasAutoInputs(item);
  const scoreValue = autoInputs && entryNote ? calculatedScore(item, inputs) : score;

  const updateInputs = (patch: ScoreInputs) => {
    if (!item.source_key) return;
    const nextInputs = { ...inputs, ...patch };
    onChange({
      value_score: calculatedScore(item, nextInputs),
      value_text: encodeEntryNote(item.source_key, nextInputs, proofNote),
    });
  };

  const updateNote = (value: string) => {
    if (autoInputs && item.source_key) {
      onChange({ value_text: encodeEntryNote(item.source_key, inputs, value) });
      return;
    }
    onChange({ value_text: value });
  };

  return (
    <div data-scoreboard-item className="rounded-lg border border-border bg-background p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_5.75rem] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold text-foreground">{item.label}</h3>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              {item.ideal_score === item.max_score ? `/${item.max_score}` : `/${item.ideal_score} ideal`}
            </span>
            {!readOnly && !isLocked && (onEdit || onRemove) && (
              <span className="ml-auto flex items-center gap-1">
                {onEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${item.label}`}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={onEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${item.label}`}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove row?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes "{item.label}" from the matrix along with all of its logged scores. Can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </span>
            )}
          </div>
          {!readOnly && item.criteria && (
            <details className="mt-2 group">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
                Scoring rule
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.criteria}</p>
            </details>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-2 text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
          {autoInputs ? (
            <div className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
              {scoreValue ?? 0}
            </div>
          ) : readOnly ? (
            <div className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
              {score ?? 0}
            </div>
          ) : (
            <Input
              disabled={isLocked}
              type="number"
              min={item.min_score}
              max={item.max_score}
              value={score ?? ''}
              onChange={(event) => onChange({ value_score: scoreFor(item, event.target.value) })}
              placeholder="0"
              className="h-9 bg-background text-lg font-bold tabular-nums"
              aria-label={`${item.label} score`}
            />
          )}
        </div>
      </div>

      {autoInputs && !readOnly && (
        <ScoreInputsForm
          item={item}
          inputs={inputs}
          isLocked={isLocked}
          onChange={updateInputs}
        />
      )}

      {autoInputs && !readOnly && !entryNote && score !== null && score !== undefined && (
        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
          This row has an older manual score. Enter raw inputs to replace it with an automatic score.
        </div>
      )}

      {readOnly ? (
        proofNote && (
          <p className="mt-2 rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground">
            {proofNote}
          </p>
        )
      ) : (
        <Input
          disabled={isLocked}
          value={proofNote}
          onChange={(event) => updateNote(event.target.value)}
          placeholder="Optional note / proof"
          className="mt-2 h-9 bg-card text-sm"
        />
      )}
    </div>
  );
}

function ScoreInputsForm({
  item,
  inputs,
  isLocked,
  onChange,
}: {
  item: ScoreboardItem;
  inputs: ScoreInputs;
  isLocked: boolean;
  onChange: (patch: ScoreInputs) => void;
}) {
  switch (item.source_key) {
    case 'sleep':
      return (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Field label="Sleep hours">
            <Input disabled={isLocked} type="number" min="0" step="0.5" value={String(inputs.hours ?? '')} onChange={(event) => onChange({ hours: event.target.value })} placeholder="7" />
          </Field>
          <Field label="Wake-up time">
            <Input disabled={isLocked} type="time" value={String(inputs.wakeTime ?? '')} onChange={(event) => onChange({ wakeTime: event.target.value })} />
          </Field>
        </div>
      );
    case 'steps':
      return (
        <div className="mt-2">
          <Field label="Steps">
            <Input disabled={isLocked} type="number" min="0" step="100" value={String(inputs.steps ?? '')} onChange={(event) => onChange({ steps: event.target.value })} placeholder="10000" />
          </Field>
        </div>
      );
    case 'focus-hours':
      return (
        <div className="mt-2">
          <Field label="Focus hours">
            <Input disabled={isLocked} type="number" min="0" step="0.25" value={String(inputs.hours ?? '')} onChange={(event) => onChange({ hours: event.target.value })} placeholder="6" />
          </Field>
        </div>
      );
    case 'exercise':
      return (
        <CheckGrid
          options={[
            ['stretch', 'Stretch'],
            ['cardio', 'Cardio'],
            ['strength', 'Strength'],
          ]}
          inputs={inputs}
          isLocked={isLocked}
          onChange={onChange}
        />
      );
    case 'journal-daily-tick':
      return <CheckGrid options={[['done', 'Journal + daily ticking done']]} inputs={inputs} isLocked={isLocked} onChange={onChange} />;
    case 'diet':
      return (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Protein grams">
            <Input disabled={isLocked} type="number" min="0" value={String(inputs.protein ?? '')} onChange={(event) => onChange({ protein: event.target.value })} placeholder="100" />
          </Field>
          <Field label="Fiber grams">
            <Input disabled={isLocked} type="number" min="0" value={String(inputs.fiber ?? '')} onChange={(event) => onChange({ fiber: event.target.value })} placeholder="20" />
          </Field>
          <Field label="Eating window hours">
            <Input disabled={isLocked} type="number" min="0" step="0.5" value={String(inputs.windowHours ?? '')} onChange={(event) => onChange({ windowHours: event.target.value })} placeholder="8" />
          </Field>
          <Field label="Junk food">
            <select
              disabled={isLocked}
              value={String(inputs.junk ?? 'none')}
              onChange={(event) => onChange({ junk: event.target.value })}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground"
            >
              <option value="none">None</option>
              <option value="minor">Minor (-1)</option>
              <option value="moderate">Moderate (-2)</option>
              <option value="major">Major (-3)</option>
            </select>
          </Field>
        </div>
      );
    case 'connections':
      return <CheckGrid options={[['done', 'Intentional connection done']]} inputs={inputs} isLocked={isLocked} onChange={onChange} />;
    case 'adult-content':
      return <CheckGrid options={[['consumed', 'Adult content consumed']]} inputs={inputs} isLocked={isLocked} onChange={onChange} />;
    case 'creatine-supplements':
      return <CheckGrid options={[['done', 'Creatine / supplements done']]} inputs={inputs} isLocked={isLocked} onChange={onChange} />;
    case 'hygiene':
      return (
        <CheckGrid
          options={[
            ['brush', 'Brush'],
            ['bath', 'Bath / clean reset'],
          ]}
          inputs={inputs}
          isLocked={isLocked}
          onChange={onChange}
        />
      );
    case 'sitting-entertainment':
      return (
        <div className="mt-2">
          <Field label="Sitting entertainment hours">
            <Input disabled={isLocked} type="number" min="0" step="0.25" value={String(inputs.hours ?? '')} onChange={(event) => onChange({ hours: event.target.value })} placeholder="1" />
          </Field>
        </div>
      );
    case 'social-media':
      return (
        <div className="mt-2">
          <Field label="Social media minutes">
            <Input disabled={isLocked} type="number" min="0" step="5" value={String(inputs.minutes ?? '')} onChange={(event) => onChange({ minutes: event.target.value })} placeholder="30" />
          </Field>
        </div>
      );
    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CheckGrid({
  options,
  inputs,
  isLocked,
  onChange,
}: {
  options: Array<[string, string]>;
  inputs: ScoreInputs;
  isLocked: boolean;
  onChange: (patch: ScoreInputs) => void;
}) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map(([key, label]) => (
        <label key={key} className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
          <input
            disabled={isLocked}
            type="checkbox"
            checked={boolInput(inputs, key)}
            onChange={(event) => onChange({ [key]: event.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
