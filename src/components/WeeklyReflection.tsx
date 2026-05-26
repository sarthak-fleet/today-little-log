import { ArrowDownRight, ArrowUpRight, Sparkles } from 'lucide-react';

const SAMPLE_DAYS = [
  { day: 'Mon', score: 48, peak: 70, note: 'Slept 7.5h, deep work morning.' },
  { day: 'Tue', score: 52, peak: 70, note: 'Walked at lunch — felt clearer.' },
  { day: 'Wed', score: 31, peak: 70, note: 'Bad sleep, scattered focus.' },
  { day: 'Thu', score: 58, peak: 70, note: 'Strength + stretch, full focus block.' },
  { day: 'Fri', score: 44, peak: 70, note: '2h of doomscrolling at night.' },
  { day: 'Sat', score: 61, peak: 70, note: 'Long walk, called family.' },
  { day: 'Sun', score: 39, peak: 70, note: 'Lazy day — caught up on sleep.' },
];

export function WeeklyReflection() {
  const total = SAMPLE_DAYS.reduce((sum, day) => sum + day.score, 0);
  const peak = SAMPLE_DAYS.reduce((sum, day) => sum + day.peak, 0);
  const best = SAMPLE_DAYS.reduce((acc, day) => (day.score > acc.score ? day : acc));
  const worst = SAMPLE_DAYS.reduce((acc, day) => (day.score < acc.score ? day : acc));
  const percent = Math.round((total / peak) * 100);

  return (
    <section className="mx-auto mt-4 max-w-5xl px-4">
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-soft">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Sample weekly reflection
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          After seven small entries, your week summarizes itself. Here's what one
          week of micro-logging looks like:
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            {total}
          </span>
          <span className="text-sm text-muted-foreground">/ {peak} this week ({percent}% of ideal)</span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {SAMPLE_DAYS.map((day) => {
            const dayPercent = Math.round((day.score / day.peak) * 100);
            const tone =
              dayPercent >= 80
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : dayPercent >= 50
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-border bg-background';
            return (
              <div
                key={day.day}
                className={`rounded-lg border p-2 text-center ${tone}`}
                title={day.note}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {day.day}
                </div>
                <div className="mt-1 font-display text-sm font-bold tabular-nums text-foreground">
                  {day.score}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Highlight
            icon={<ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            label={`Best day — ${best.day}`}
            score={`${best.score}/${best.peak}`}
            note={best.note}
          />
          <Highlight
            icon={<ArrowDownRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            label={`Hardest day — ${worst.day}`}
            score={`${worst.score}/${worst.peak}`}
            note={worst.note}
          />
        </div>

        <p className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-sm italic text-muted-foreground">
          Pattern: weeks with two morning walks scored ~30% higher than weeks
          without. The tiny entries told the story.
        </p>
      </div>
    </section>
  );
}

function Highlight({
  icon,
  label,
  score,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  score: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 font-display text-lg font-bold tabular-nums text-foreground">
        {score}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}
