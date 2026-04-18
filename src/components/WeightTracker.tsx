import { useMemo, useState } from 'react';
import { useWeightLogs, setTargetKg, getTargetKg } from '@/hooks/useWeightLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale, TrendingDown, TrendingUp, Target, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function WeightTracker() {
  const { logs, isLoaded, logWeight, remove, trajectory } = useWeightLogs();
  const [kg, setKg] = useState('');
  const [target, setTarget] = useState(() => getTargetKg().toString());
  const [editTarget, setEditTarget] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLog = logs.find((l) => l.date === today);

  const handleLog = async () => {
    const n = parseFloat(kg);
    if (!Number.isFinite(n) || n <= 0) return;
    await logWeight(today, n);
    setKg('');
  };

  const saveTarget = () => {
    const n = parseFloat(target);
    if (Number.isFinite(n) && n > 0) setTargetKg(n);
    setEditTarget(false);
  };

  const chart = useMemo(() => {
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
    const min = Math.min(...sorted.map((l) => l.kg));
    const max = Math.max(...sorted.map((l) => l.kg));
    const span = max - min || 1;
    const pts = sorted.map((l, i) => {
      const x = (i / Math.max(1, sorted.length - 1)) * 100;
      const y = 100 - ((l.kg - min) / span) * 100;
      return { x, y, l };
    });
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    return { d, pts, min, max };
  }, [logs]);

  if (!isLoaded) {
    return <div className="h-48 rounded-2xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      {/* Current + target + trend card */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Current</div>
              <div className="font-display font-bold text-2xl text-foreground leading-none">
                {trajectory ? trajectory.current.toFixed(1) : '—'}
                <span className="text-sm font-medium text-muted-foreground ml-1">kg</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {editTarget ? (
              <div className="flex items-center gap-1">
                <Input type="number" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} className="w-20 h-8" />
                <Button size="sm" className="h-8" onClick={saveTarget}>Set</Button>
              </div>
            ) : (
              <button onClick={() => setEditTarget(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Target <span className="text-foreground font-semibold">{getTargetKg()} kg</span>
              </button>
            )}
          </div>
        </div>

        {trajectory && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className={`flex items-center gap-1.5 ${trajectory.kgPerDay < 0 ? 'text-emerald-600' : trajectory.kgPerDay > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {trajectory.kgPerDay < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              <span className="font-mono tabular-nums">{(trajectory.kgPerDay * 7).toFixed(2)} kg/wk</span>
            </div>
            {trajectory.daysToTarget !== null && (
              <div className="text-muted-foreground">
                ~<span className="text-foreground font-semibold">{trajectory.daysToTarget}</span> days to target at current pace
              </div>
            )}
            {trajectory.daysToTarget === null && trajectory.current > trajectory.target && (
              <div className="text-destructive text-xs">Trajectory isn't taking you to {trajectory.target} kg yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Today log input */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          {todayLog ? 'Today logged — log again to update' : 'Log today'}
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            placeholder={todayLog ? `${todayLog.kg} kg` : 'Weight (kg)'}
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLog(); }}
            className="bg-background"
          />
          <Button onClick={handleLog} disabled={!kg}>Log</Button>
        </div>
      </div>

      {/* Chart */}
      {chart && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Last {chart.pts.length} entries</div>
            <div className="text-[10px] text-muted-foreground font-mono">{chart.min.toFixed(1)} – {chart.max.toFixed(1)} kg</div>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32">
            <path d={chart.d} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {chart.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="hsl(var(--accent))" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
      )}

      {/* Recent log list */}
      {logs.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Recent</div>
          <ul className="divide-y divide-border">
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 font-mono">{format(parseISO(l.date), 'MMM d, yyyy')}</span>
                  <span className="font-display font-semibold text-foreground">{l.kg.toFixed(1)} kg</span>
                </div>
                <button
                  onClick={() => remove(l.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
