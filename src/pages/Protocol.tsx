import { useMemo } from 'react';
import { RULES, SHIFTS, MILESTONES, currentShift } from '@/lib/protocol';
import { useDailyCheckins } from '@/hooks/useDailyCheckins';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { useUrgeLogs } from '@/hooks/useUrgeLogs';
import { Check, AlertTriangle, Lock, Clock } from 'lucide-react';
import { format, subDays, startOfWeek } from 'date-fns';

/**
 * Your rules. One page. Violations visible.
 */
const Protocol = () => {
  const shift = currentShift();
  const { todayRow } = useDailyCheckins();
  const { logs: weight } = useWeightLogs();
  const { logs: urges } = useUrgeLogs();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weightLoggedToday = weight.some((w) => w.date === today);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const urgeOverridesThisWeek = urges.filter((u) => u.status === 'acted' && new Date(u.logged_at) >= weekStart).length;

  const ruleChecks = useMemo(() => {
    return RULES.map((r) => ({ rule: r, ...r.check({
      today,
      todayCheckin: todayRow,
      weightLoggedToday,
      urgeOverridesThisWeek,
      dailyTemptationCount: 0,
      shift,
    })}));
  }, [todayRow, weightLoggedToday, urgeOverridesThisWeek, shift, today]);

  const violations = ruleChecks.filter((r) => r.violated);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <Lock className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Protocol</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Your non-negotiables. <span className="text-primary italic">Enforced.</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl">
          Sleep 02:00–09:00. Workout 09:30. 4.5h deep-work Shift 3. No TV before PM ritual.
          {violations.length > 0 && <span className="text-destructive font-semibold"> · {violations.length} rule{violations.length === 1 ? '' : 's'} open.</span>}
        </p>
      </section>

      {/* Current shift banner */}
      <section className="px-4 max-w-4xl mx-auto pb-6">
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Currently</div>
            <div className="font-display font-bold text-foreground">{shift.label}</div>
          </div>
          <div className="ml-auto text-sm text-muted-foreground italic">{shift.nowCta}</div>
        </div>
      </section>

      {/* Rules */}
      <section className="px-4 max-w-4xl mx-auto pb-8">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Rules</div>
        <ul className="space-y-2">
          {ruleChecks.map(({ rule, violated, reason }) => (
            <li key={rule.id} className={`rounded-xl border p-4 flex items-start gap-3 ${violated ? 'border-destructive/60 bg-destructive/5' : 'border-border bg-card'}`}>
              <div className={`mt-1 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${violated ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-600'}`}>
                {violated ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-display font-semibold ${violated ? 'text-destructive' : 'text-foreground'}`}>{rule.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{rule.detail}</div>
                {violated && reason && <div className="text-xs text-destructive mt-1 italic">{reason}</div>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Schedule */}
      <section className="px-4 max-w-4xl mx-auto pb-8">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Daily schedule</div>
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {SHIFTS.map((s) => {
            const active = shift.id === s.id;
            const timeLabel = `${String(s.startH).padStart(2, '0')}:${String(s.startM).padStart(2, '0')}–${String(s.endH).padStart(2, '0')}:${String(s.endM).padStart(2, '0')}`;
            return (
              <div key={s.id} className={`flex items-center gap-3 py-2 px-4 border-b border-border last:border-b-0 ${active ? 'bg-primary/5' : ''}`}>
                <span className={`font-mono text-xs w-28 flex-shrink-0 ${active ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{timeLabel}</span>
                <span className={`flex-1 text-sm ${active ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{s.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.mode}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Milestones */}
      <section className="px-4 max-w-4xl mx-auto pb-20">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">12-week milestones</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
            <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Week</th>
                <th className="px-3 py-2 text-right">Weight Δ</th>
                <th className="px-3 py-2 text-right">LeetCode total</th>
                <th className="px-3 py-2 text-right">Apps sent</th>
                <th className="px-3 py-2 text-right">Ritual hit rate</th>
              </tr>
            </thead>
            <tbody>
              {MILESTONES.map((m) => (
                <tr key={m.week} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">W{m.week}</td>
                  <td className="px-3 py-2 text-right font-mono">{m.weightDelta == null ? '—' : `${m.weightDelta} kg`}</td>
                  <td className="px-3 py-2 text-right font-mono">{m.leetcodeTotal}</td>
                  <td className="px-3 py-2 text-right font-mono">{m.appsSent}</td>
                  <td className="px-3 py-2 text-right font-mono">{Math.round(m.ritualHitRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground italic">
          Walk-away clause: if week 2 flat, protocol fires you. No apology. No second chances without a redesign.
        </p>
      </section>
    </div>
  );
};

export default Protocol;
