import { useEffect, useMemo, useState } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { useQuickLogs } from '@/hooks/useQuickLogs';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, SkipForward, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

type CheckStatus = 'done' | 'skipped' | 'extra' | 'less';

interface BlockCheck {
  blockId: string;
  status: CheckStatus;
  reason?: string;
}

function serialize(c: BlockCheck): string {
  return JSON.stringify(c);
}

function tryParse(text: string | null): BlockCheck | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && typeof parsed.blockId === 'string') return parsed as BlockCheck;
  } catch {
    // ignore
  }
  return null;
}

const STATUS_META: Record<CheckStatus, { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  done: { label: 'Done', tone: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30', icon: Check },
  extra: { label: 'More time', tone: 'text-primary bg-primary/10 border-primary/30', icon: Plus },
  less: { label: 'Less time', tone: 'text-orange-600 bg-orange-500/10 border-orange-500/30', icon: Minus },
  skipped: { label: 'Skipped', tone: 'text-destructive bg-destructive/10 border-destructive/30', icon: SkipForward },
};

/**
 * Today's schedule check-in row. For each block the user marks
 * done / more time / less time / skipped + optional reason.
 * Persists via `quick_logs` with kind='schedule_checkin' + value_text=JSON.
 * Reuses the existing table so the feature needs no new migration.
 */
export function ScheduleCheckin() {
  const { blocks, isLoaded } = useSchedule();
  const { logs, add } = useQuickLogs();
  const { user } = useAuth();

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [editing, setEditing] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const todayChecks = useMemo(() => {
    const map = new Map<string, BlockCheck & { loggedAt: string }>();
    for (const l of logs) {
      if (l.kind !== 'schedule_checkin') continue;
      const d = new Date(l.logged_at);
      if (format(d, 'yyyy-MM-dd') !== today) continue;
      const parsed = tryParse(l.value_text);
      if (!parsed) continue;
      // Latest wins.
      if (!map.has(parsed.blockId) || map.get(parsed.blockId)!.loggedAt < l.logged_at) {
        map.set(parsed.blockId, { ...parsed, loggedAt: l.logged_at });
      }
    }
    return map;
  }, [logs, today]);

  useEffect(() => {
    // Close reason editor if the block's check disappears.
    if (editing && !blocks.find((b) => b.id === editing)) setEditing(null);
  }, [blocks, editing]);

  const logStatus = async (blockId: string, status: CheckStatus) => {
    await add('schedule_checkin', undefined, serialize({ blockId, status, reason: reason || undefined }));
    setEditing(null);
    setReason('');
  };

  if (!user) return null;
  if (!isLoaded) return <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />;
  if (blocks.length === 0) return null;

  const sorted = [...blocks].sort((a, b) => a.startHour - b.startHour);

  const done = sorted.filter((b) => todayChecks.get(b.id)?.status === 'done').length;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Today's check-in</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">{done}/{sorted.length} done</span>
      </div>

      <ul className="divide-y divide-border">
        {sorted.map((block) => {
          const checked = todayChecks.get(block.id);
          const meta = checked ? STATUS_META[checked.status] : null;
          const StatusIcon = meta?.icon;
          const hh = (n: number) => `${String(Math.floor(n)).padStart(2, '0')}:${String(Math.round((n % 1) * 60)).padStart(2, '0')}`;
          return (
            <li key={block.id} className="py-2.5 space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: block.color }} />
                <span className="font-mono text-[11px] text-muted-foreground w-28 flex-shrink-0">
                  {hh(block.startHour)}–{hh(block.endHour)}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-foreground">{block.title || '(untitled)'}</span>
                {meta && StatusIcon && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.tone}`}>
                    <StatusIcon className="h-3 w-3" /> {meta.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 pl-[11px]">
                {(Object.keys(STATUS_META) as CheckStatus[]).map((s) => {
                  const m = STATUS_META[s];
                  const Icon = m.icon;
                  const active = checked?.status === s;
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={active ? 'default' : 'ghost'}
                      className={`h-7 px-2 text-[10px] gap-1 ${active ? '' : m.tone}`}
                      onClick={() => (s === 'skipped' || s === 'less') ? setEditing(block.id) : logStatus(block.id, s)}
                    >
                      <Icon className="h-3 w-3" /> {m.label}
                    </Button>
                  );
                })}
              </div>

              {editing === block.id && (
                <div className="pl-4 flex items-center gap-2">
                  <Input
                    placeholder="Why? (optional, 1 line)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') logStatus(block.id, 'skipped'); }}
                    className="h-7 text-xs bg-background"
                    autoFocus
                  />
                  <Button size="sm" className="h-7" onClick={() => logStatus(block.id, 'skipped')}>Log</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[10px] text-muted-foreground">
        Deviations feed tomorrow's schedule recommendations.
      </p>
    </div>
  );
}
