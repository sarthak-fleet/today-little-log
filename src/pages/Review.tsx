import { useMemo } from 'react';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { useDevLogs } from '@/hooks/useDevLogs';
import { useQuickLogs } from '@/hooks/useQuickLogs';
import { useUrgeLogs } from '@/hooks/useUrgeLogs';
import { useGoals } from '@/hooks/useGoals';
import { format, subDays, startOfWeek } from 'date-fns';
import { TrendingDown, TrendingUp, Scale, Code2, Flame, Target, AlertTriangle, Brain } from 'lucide-react';
import { WeeklyAutoReport } from '@/components/WeeklyAutoReport';
import { RewardsStore } from '@/components/RewardsStore';

/**
 * The only dashboard that matters. Week-over-week deltas across
 * every dimension. Includes walk-away banner when metrics flat.
 */
const Review = () => {
  const { rows: checkins } = useDailyCheckins();
  const { logs: weight } = useWeightLogs();
  const { logs: dev } = useDevLogs();
  const { logs: quicks } = useQuickLogs();
  const { logs: urges } = useUrgeLogs();
  const { goals } = useGoals();

  const now = new Date();
  const weekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);

  // Helpers — split logs into this-week vs last-week buckets.
  const byWeek = <T extends { date?: string; logged_at?: string }>(rows: T[], getter: (r: T) => Date) => {
    const thisWk: T[] = [];
    const lastWk: T[] = [];
    for (const r of rows) {
      const d = getter(r);
      if (d >= weekAgo) thisWk.push(r);
      else if (d >= twoWeeksAgo) lastWk.push(r);
    }
    return { thisWk, lastWk };
  };

  // Weight delta
  const weightStats = useMemo(() => {
    if (weight.length < 2) return null;
    const sorted = [...weight].sort((a, b) => a.date.localeCompare(b.date));
    const current = sorted[sorted.length - 1].kg;
    const first = sorted[0].kg;
    const weekOld = sorted.find((w) => new Date(w.date) >= weekAgo)?.kg ?? current;
    return { current, totalDelta: current - first, weekDelta: current - weekOld };
  }, [weight, weekAgo]);

  // Dev deep-work minutes
  const devStats = useMemo(() => {
    const { thisWk, lastWk } = byWeek(dev, (r) => new Date(r.date));
    const thisMin = thisWk.reduce((s, l) => s + l.deep_work_minutes, 0);
    const lastMin = lastWk.reduce((s, l) => s + l.deep_work_minutes, 0);
    const thisLeet = thisWk.reduce((s, l) => s + l.leetcode_count, 0);
    const thisCommits = thisWk.reduce((s, l) => s + l.commits, 0);
    return { thisMin, lastMin, thisLeet, thisCommits };
  }, [dev]);

  // Ritual hit rate
  const ritualStats = useMemo(() => {
    const { thisWk } = byWeek(checkins, (r) => new Date(r.date));
    const thisHit = thisWk.filter((c) => c.hit).length;
    return { thisHit, thisTotal: 7 };
  }, [checkins]);

  // Urges (resisted vs acted)
  const urgeStats = useMemo(() => {
    const { thisWk } = byWeek(urges, (r) => new Date(r.logged_at));
    const resisted = thisWk.filter((u) => u.status === 'resisted').length;
    const acted = thisWk.filter((u) => u.status === 'acted').length;
    return { resisted, acted, total: thisWk.length };
  }, [urges]);

  // Temptations logged (early-warning)
  const temptationCount = useMemo(() => {
    const { thisWk } = byWeek(quicks, (r) => new Date(r.logged_at));
    return thisWk.filter((l) => l.kind === 'temptation').length;
  }, [quicks]);

  // Sleep avg
  const sleepAvg = useMemo(() => {
    const { thisWk } = byWeek(checkins, (r) => new Date(r.date));
    const vals = thisWk.map((c) => c.sleep_hours).filter((x): x is number => x != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [checkins]);

  // Walk-away verdict — if 2+ critical metrics flat, banner fires.
  const flags: string[] = [];
  if (weightStats && Math.abs(weightStats.weekDelta) < 0.3) flags.push('Weight flat this week.');
  if (devStats.thisMin < 120 && devStats.lastMin < 120) flags.push('Deep-work under 2h both weeks.');
  if (ritualStats.thisHit < 4) flags.push(`Rituals only ${ritualStats.thisHit}/7.`);
  if (sleepAvg != null && sleepAvg < 6.5) flags.push(`Sleep averaging ${sleepAvg.toFixed(1)}h.`);
  if (urgeStats.acted > 1) flags.push(`${urgeStats.acted} urges acted on this week.`);

  const shouldWalkAway = flags.length >= 2;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Brain className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Weekly review</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Last 7 days. <span className="text-primary italic">Honest read.</span>
        </h1>
      </section>

      {/* Walk-away banner */}
      {shouldWalkAway && (
        <section className="px-4 max-w-4xl mx-auto pb-6">
          <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-destructive font-display font-bold text-lg">Protocol isn't working.</div>
              <ul className="mt-2 text-sm text-destructive/80 list-disc list-inside space-y-0.5">
                {flags.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <p className="mt-3 text-sm text-foreground">
                Two options: redesign the rules so they fit, or admit motivation is the blocker. Don't fake week 3.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Core metric tiles */}
      <section className="px-4 max-w-4xl mx-auto pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {weightStats && <Tile
            icon={Scale}
            label="Weight"
            value={`${weightStats.current.toFixed(1)} kg`}
            delta={weightStats.weekDelta}
            unit="kg"
            goodDirection="down"
          />}
          <Tile
            icon={Code2}
            label="Deep-work / wk"
            value={`${Math.floor(devStats.thisMin / 60)}h ${devStats.thisMin % 60}m`}
            delta={devStats.thisMin - devStats.lastMin}
            unit="min"
            goodDirection="up"
          />
          <Tile
            icon={Flame}
            label="Rituals hit"
            value={`${ritualStats.thisHit}/7`}
            delta={null}
            unit=""
            goodDirection="up"
          />
          <Tile
            icon={Target}
            label="LeetCode / wk"
            value={String(devStats.thisLeet)}
            delta={null}
            unit=""
            goodDirection="up"
          />
        </div>
      </section>

      {/* AI review + rewards store */}
      <section className="px-4 max-w-4xl mx-auto pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeeklyAutoReport />
        <RewardsStore />
      </section>

      {/* Behaviour breakdown */}
      <section className="px-4 max-w-4xl mx-auto pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Urges">
          <Row label="Resisted" value={urgeStats.resisted} tone="good" />
          <Row label="Acted" value={urgeStats.acted} tone={urgeStats.acted > 1 ? 'bad' : 'neutral'} />
          <Row label="Temptations logged" value={temptationCount} tone="neutral" />
        </Panel>
        <Panel title="Sleep + PSI">
          <Row label="Avg sleep" value={sleepAvg != null ? `${sleepAvg.toFixed(1)}h` : '—'} tone={sleepAvg != null && sleepAvg >= 7 ? 'good' : sleepAvg != null && sleepAvg < 6.5 ? 'bad' : 'neutral'} />
          <Row label="Avg PSI" value={(() => {
            const psi = checkins.slice(0, 7).map((c) => c.psi_score).filter((x): x is number => x != null);
            if (psi.length === 0) return '—';
            return Math.round(psi.reduce((a, b) => a + b, 0) / psi.length);
          })()} tone="neutral" />
          <Row label="Commits / wk" value={devStats.thisCommits} tone="neutral" />
        </Panel>
      </section>

      {/* Goals probability trend */}
      {goals.length > 0 && (
        <section className="px-4 max-w-4xl mx-auto pb-8">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Goals</div>
          <ul className="space-y-2">
            {goals.map((g) => (
              <li key={g.id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-4">
                <span className="text-xs uppercase tracking-widest text-muted-foreground w-20 flex-shrink-0">{g.category}</span>
                <span className="flex-1 font-display font-semibold text-foreground truncate">{g.title}</span>
                <span className="font-display font-bold text-2xl tabular-nums text-primary flex-shrink-0">{Math.round(g.probability)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

function Tile({ icon: Icon, label, value, delta, unit, goodDirection }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; delta: number | null; unit: string;
  goodDirection: 'up' | 'down';
}) {
  const good = delta != null && (goodDirection === 'down' ? delta < 0 : delta > 0);
  const bad = delta != null && (goodDirection === 'down' ? delta > 0 : delta < 0);
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display font-bold text-2xl text-foreground leading-none">{value}</div>
      {delta != null && (
        <div className={`mt-1 inline-flex items-center gap-0.5 text-xs font-mono ${good ? 'text-emerald-600' : bad ? 'text-destructive' : 'text-muted-foreground'}`}>
          {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {delta > 0 ? '+' : ''}{typeof delta === 'number' ? delta.toFixed(unit === 'kg' ? 1 : 0) : delta}{unit}
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string | number; tone: 'good' | 'bad' | 'neutral' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-display font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export default Review;
