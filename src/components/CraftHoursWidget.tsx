import { useState } from 'react';
import { useDevLogs } from '@/hooks/useDevLogs';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Code2, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Compact craft-time tracker for the Schedule page. Replaces the
 * full-page Dev surface — only ask for the numbers that matter:
 * minutes dedicated today + shipped summary.
 */
export function CraftHoursWidget() {
  const { user } = useAuth();
  const { todayLog, save, weekSummary, logs } = useDevLogs();
  const [minutes, setMinutes] = useState('');
  const [summary, setSummary] = useState('');
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const submit = async () => {
    const add = parseInt(minutes);
    if (!Number.isFinite(add) && !summary.trim()) return;
    const prev = todayLog?.deep_work_minutes ?? 0;
    await save({
      deep_work_minutes: prev + (Number.isFinite(add) ? add : 0),
      summary: summary.trim() || todayLog?.summary || null,
    });
    setMinutes('');
    setSummary('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const todayMin = todayLog?.deep_work_minutes ?? 0;
  const todayH = Math.floor(todayMin / 60);
  const todayM = todayMin % 60;
  const wkH = Math.floor(weekSummary.deepWork / 60);
  const wkM = weekSummary.deepWork % 60;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Code2 className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Craft hours</span>
        </div>
        <div className="flex gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Today <span className="font-mono text-foreground">{todayH}h {todayM}m</span></span>
          <span>7d <span className="font-mono text-foreground">{wkH}h {wkM}m</span></span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input
          type="number"
          placeholder="+min dedicated"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          className="bg-background md:w-40"
        />
        <Input
          placeholder="What you shipped (optional)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          className="bg-background flex-1"
        />
        <Button size="sm" onClick={submit}>
          {saved ? <><Check className="h-3.5 w-3.5 mr-1" /> Saved</> : <><Plus className="h-3.5 w-3.5 mr-1" /> Add</>}
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="space-y-1 max-h-28 overflow-y-auto text-xs">
          {logs.slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono w-20 flex-shrink-0">{format(new Date(l.date), 'MMM d')}</span>
              <span className="font-mono flex-shrink-0">{Math.floor(l.deep_work_minutes / 60)}h {l.deep_work_minutes % 60}m</span>
              {l.summary && <span className="truncate italic">— {l.summary}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
