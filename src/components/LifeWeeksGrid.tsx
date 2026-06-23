import { useMemo } from 'react';
import {
  useLifeMath,
  LIFE_WEEKS_COLS,
  LIFE_WEEKS_YEARS,
  LIFE_WEEKS_TOTAL,
} from '@/hooks/useLifeMath';

interface LifeWeeksGridProps {
  /** CSS max width; defaults to full */
  className?: string;
}

/**
 * Tim-Urban-style "Your Life in Weeks" grid.
 * 90 rows (years) × 52 cols (weeks). Past = primary, current = pulsing, future = muted.
 */
export function LifeWeeksGrid({ className = '' }: LifeWeeksGridProps) {
  const life = useLifeMath(60_000);

  const cells = useMemo(() => {
    const curr = life.currentWeekIndex ?? -1;
    const total = LIFE_WEEKS_TOTAL;
    const arr = new Array<number>(total);
    for (let i = 0; i < total; i++) {
      if (curr < 0)
        arr[i] = 0; // no DOB — show all empty
      else if (i < curr)
        arr[i] = 2; // past
      else if (i === curr)
        arr[i] = 1; // current
      else arr[i] = 0; // future
    }
    return arr;
  }, [life.currentWeekIndex]);

  if (life.currentWeekIndex === null) {
    return (
      <div
        className={`rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground ${className}`}
      >
        Set your date of birth to unlock your life grid. Top navbar → cake icon.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <span>90 years · 52 weeks each</span>
        <span>
          {life.weeksLived?.toLocaleString()} / {LIFE_WEEKS_TOTAL.toLocaleString()} weeks
        </span>
      </div>
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${LIFE_WEEKS_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${LIFE_WEEKS_YEARS}, minmax(0, 1fr))`,
        }}
        aria-label="Life in weeks grid"
      >
        {cells.map((state, i) => {
          let cls = 'rounded-[2px] aspect-square';
          if (state === 2) cls += ' bg-primary/90';
          else if (state === 1)
            cls += ' bg-accent animate-pulse shadow-[0_0_6px_hsl(var(--accent))]';
          else cls += ' bg-muted/60 border border-border/40';
          return <div key={i} className={cls} />;
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-primary/90" /> lived
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-accent animate-pulse" /> this week
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[2px] bg-muted/60 border border-border/40" /> unlived
        </span>
      </div>
    </div>
  );
}
