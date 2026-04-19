import { useMemo, useState } from 'react';
import { LEISURE_BUDGET, LEISURE_TOTAL } from '@/lib/protocol';
import { useQuickLogs } from '@/hooks/useQuickLogs';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popcorn, Gamepad2, Tv, Users, Check } from 'lucide-react';
import { subDays } from 'date-fns';

const CAT_META: Record<typeof LEISURE_BUDGET[number]['category'], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'tv-movie': { label: 'TV / movie', icon: Tv },
  gaming:     { label: 'Gaming',     icon: Gamepad2 },
  anime:      { label: 'Anime',      icon: Popcorn },
  social:     { label: 'Social',     icon: Users },
  walk:       { label: 'Walk',       icon: Users },
};

/**
 * Planned, capped entertainment. Avoids "all work no play" failure
 * mode. Logs are stored in quick_logs with value_text starting
 * "LEISURE:<category>:" so the review can compute weekly totals.
 */
export function LeisureBudget() {
  const { user } = useAuth();
  const { logs, add } = useQuickLogs();
  const [minutesBy, setMinutesBy] = useState<Record<string, string>>({});

  const usedByCat = useMemo(() => {
    const since = subDays(new Date(), 7);
    const m: Record<string, number> = {};
    for (const l of logs) {
      if (!l.value_text?.startsWith('LEISURE:')) continue;
      if (new Date(l.logged_at) < since) continue;
      const parts = l.value_text.split(':');
      const cat = parts[1];
      const minutes = l.value_num ?? 0;
      m[cat] = (m[cat] ?? 0) + minutes;
    }
    return m;
  }, [logs]);

  if (!user) return null;

  const log = async (cat: string) => {
    const raw = minutesBy[cat];
    const min = parseInt(raw);
    if (!Number.isFinite(min) || min <= 0) return;
    await add('note', min, `LEISURE:${cat}:logged`);
    setMinutesBy((m) => ({ ...m, [cat]: '' }));
  };

  const usedTotal = Object.values(usedByCat).reduce((a, b) => a + b, 0) / 60;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/5 border border-accent/30 p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent">
          <Popcorn className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Leisure budget</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          <span className={`font-bold ${usedTotal > LEISURE_TOTAL ? 'text-destructive' : 'text-foreground'}`}>{usedTotal.toFixed(1)}h</span>/{LEISURE_TOTAL}h wk
        </span>
      </div>

      <ul className="space-y-2">
        {LEISURE_BUDGET.filter((b) => b.category !== 'walk').map((slot) => {
          const usedMin = usedByCat[slot.category] ?? 0;
          const usedH = usedMin / 60;
          const pct = Math.min(100, (usedH / slot.hoursPerWeek) * 100);
          const over = usedH > slot.hoursPerWeek;
          const { label, icon: Icon } = CAT_META[slot.category];
          return (
            <li key={slot.category} className="rounded-xl bg-background/60 border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${over ? 'text-destructive' : 'text-accent'}`} />
                <span className="font-medium text-sm text-foreground flex-1">{label}</span>
                <span className={`text-[11px] font-mono ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {usedH.toFixed(1)}/{slot.hoursPerWeek}h
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full transition-all ${over ? 'bg-destructive' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground italic">{slot.note}</div>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  value={minutesBy[slot.category] ?? ''}
                  onChange={(e) => setMinutesBy((m) => ({ ...m, [slot.category]: e.target.value }))}
                  placeholder="min"
                  className="h-7 text-xs w-20 bg-background"
                />
                <Button size="sm" className="h-7" onClick={() => log(slot.category)} disabled={!minutesBy[slot.category]}>
                  <Check className="h-3 w-3 mr-1" /> Log
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground italic">
        Planned rest beats stolen rest. Log honestly — over-budget = red = penalty next week.
      </p>
    </div>
  );
}
