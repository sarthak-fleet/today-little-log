import { useEffect, useState } from 'react';
import { useDevLogs } from '@/hooks/useDevLogs';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Code2, Brain, GitCommit, Timer, Check } from 'lucide-react';

export function DevRitualTracker() {
  const { user } = useAuth();
  const { todayLog, save, weekSummary, logs } = useDevLogs();
  const [leet, setLeet] = useState('');
  const [dw, setDw] = useState('');
  const [commits, setCommits] = useState('');
  const [summary, setSummary] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (todayLog) {
      setLeet(String(todayLog.leetcode_count || ''));
      setDw(String(todayLog.deep_work_minutes || ''));
      setCommits(String(todayLog.commits || ''));
      setSummary(todayLog.summary ?? '');
    }
  }, [todayLog?.id]);

  if (!user) return null;

  const submit = async () => {
    await save({
      leetcode_count: parseInt(leet) || 0,
      deep_work_minutes: parseInt(dw) || 0,
      commits: parseInt(commits) || 0,
      summary: summary.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const dwHours = Math.floor((todayLog?.deep_work_minutes ?? 0) / 60);
  const dwRem = (todayLog?.deep_work_minutes ?? 0) % 60;

  return (
    <div className="space-y-5">
      {/* Week summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Code2} label="Leet 7d" value={weekSummary.leetcode.toString()} />
        <Stat icon={Brain} label="Deep work 7d" value={`${Math.floor(weekSummary.deepWork / 60)}h ${weekSummary.deepWork % 60}m`} />
        <Stat icon={GitCommit} label="Commits 7d" value={weekSummary.commits.toString()} />
        <Stat icon={Timer} label="Active days" value={`${weekSummary.days}/7`} />
      </div>

      {/* Today log form */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Code2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">Today</span>
          </div>
          {todayLog && (todayLog.leetcode_count + todayLog.deep_work_minutes + todayLog.commits > 0) && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> {dwHours}h {dwRem}m deep, {todayLog.leetcode_count} leet, {todayLog.commits} commits
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <LabeledInput label="Leet problems" value={leet} onChange={setLeet} placeholder="0" />
          <LabeledInput label="Deep-work min" value={dw} onChange={setDw} placeholder="0" />
          <LabeledInput label="Commits" value={commits} onChange={setCommits} placeholder="0" />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Shipped</label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            placeholder="Feature, bug fix, PR merged, breakthrough."
            className="bg-background resize-none"
          />
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={submit}>
            {saved ? <><Check className="h-4 w-4 mr-1" /> Saved</> : 'Log dev day'}
          </Button>
        </div>
      </div>

      {/* Recent mini list */}
      {logs.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Recent</div>
          <ul className="divide-y divide-border">
            {logs.slice(0, 7).map((l) => (
              <li key={l.id} className="py-2 text-sm grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono w-24">{l.date}</span>
                <span className="text-foreground truncate">
                  {l.leetcode_count > 0 && <span className="mr-3"><Code2 className="h-3 w-3 inline mr-1 opacity-60" />{l.leetcode_count}</span>}
                  {l.deep_work_minutes > 0 && <span className="mr-3"><Brain className="h-3 w-3 inline mr-1 opacity-60" />{Math.floor(l.deep_work_minutes / 60)}h{l.deep_work_minutes % 60}m</span>}
                  {l.commits > 0 && <span className="mr-3"><GitCommit className="h-3 w-3 inline mr-1 opacity-60" />{l.commits}</span>}
                  {l.summary && <span className="text-muted-foreground italic">— {l.summary}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-lg font-display font-bold text-foreground mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background"
      />
    </div>
  );
}
