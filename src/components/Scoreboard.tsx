import { useMemo, useState } from 'react';
import { useScoreboard, type ScoreKind } from '@/hooks/useScoreboard';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Check, Flame, ListChecks, Pencil } from 'lucide-react';
import { format, subDays } from 'date-fns';

function isHit(log: { value_bool: boolean; value_text: string | null } | undefined, kind: ScoreKind): boolean {
  if (!log) return false;
  return kind === 'check' ? log.value_bool : Boolean(log.value_text && log.value_text.trim());
}

export function Scoreboard() {
  const { user } = useAuth();
  const { items, logs, today, logFor, addItem, removeItem, renameItem, setLog, isLoaded } = useScoreboard();

  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<ScoreKind>('check');
  const [editing, setEditing] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const streak = useMemo(() => {
    if (items.length === 0) return 0;
    const itemKindById = new Map(items.map((i) => [i.id, i.kind] as const));
    const hitsByDate = new Map<string, number>();
    for (const log of logs) {
      const kind = itemKindById.get(log.item_id);
      if (!kind) continue;
      if (isHit(log, kind)) {
        hitsByDate.set(log.date, (hitsByDate.get(log.date) ?? 0) + 1);
      }
    }
    let cursor = new Date();
    if ((hitsByDate.get(format(cursor, 'yyyy-MM-dd')) ?? 0) === 0) {
      cursor = subDays(cursor, 1);
    }
    let n = 0;
    while ((hitsByDate.get(format(cursor, 'yyyy-MM-dd')) ?? 0) > 0) {
      n += 1;
      cursor = subDays(cursor, 1);
    }
    return n;
  }, [items, logs]);

  const todayHits = items.filter((i) => isHit(logFor(i.id), i.kind)).length;
  const total = items.length;
  const fullHouse = total > 0 && todayHits === total;
  const nonZeroToday = todayHits >= 1;

  const submitAdd = async () => {
    if (!newLabel.trim()) return;
    await addItem(newLabel, newKind);
    setNewLabel('');
  };

  const startEdit = (id: string, currentLabel: string) => {
    setEditing(id);
    setEditLabel(currentLabel);
  };

  const submitEdit = async () => {
    if (editing && editLabel.trim()) {
      await renameItem(editing, editLabel);
    }
    setEditing(null);
    setEditLabel('');
  };

  if (!user) return null;

  return (
    <div className={`rounded-2xl p-5 space-y-4 border transition-all ${
      fullHouse
        ? 'bg-gradient-to-br from-emerald-500/15 to-primary/15 border-emerald-500/40 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]'
        : nonZeroToday
        ? 'bg-card border-border shadow-soft'
        : 'bg-card border-destructive/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className={`h-4 w-4 ${nonZeroToday ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground">
            Daily scoreboard
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Flame className={`h-3 w-3 ${streak > 0 ? 'text-orange-500' : ''}`} />
            <span className="font-display font-bold text-foreground tabular-nums">{streak}</span> streak
          </span>
          <span className={`font-mono ${fullHouse ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {todayHits}/{total}
          </span>
        </div>
      </div>

      {isLoaded && items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No items yet. Add the daily checks that, if done, make today not a zero day.
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((item) => {
          const log = logFor(item.id);
          const hit = isHit(log, item.kind);
          const isEditing = editing === item.id;
          return (
            <li
              key={item.id}
              className={`group rounded-xl border p-3 transition-colors ${
                hit ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-background border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                {item.kind === 'check' ? (
                  <button
                    onClick={() => setLog(item.id, { value_bool: !hit })}
                    className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                      hit
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted border border-border hover:border-primary'
                    }`}
                    aria-label={hit ? 'Mark undone' : 'Mark done'}
                  >
                    {hit && <Check className="h-3.5 w-3.5" />}
                  </button>
                ) : (
                  <span className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-mono ${
                    hit ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    →
                  </span>
                )}

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={submitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEdit();
                        if (e.key === 'Escape') { setEditing(null); setEditLabel(''); }
                      }}
                      className="h-7 text-sm bg-background"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(item.id, item.label)}
                      className="text-left font-display font-medium text-sm text-foreground hover:underline decoration-dotted"
                    >
                      {item.label}
                    </button>
                  )}

                  {item.kind === 'output' && (
                    <Input
                      value={log?.value_text ?? ''}
                      onChange={(e) => setLog(item.id, { value_text: e.target.value })}
                      placeholder="link / one-liner"
                      className="mt-2 h-8 text-xs bg-background"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(item.id, item.label)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        <div className="flex bg-muted/50 rounded-md p-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <button
            onClick={() => setNewKind('check')}
            className={`px-2 py-1 rounded ${newKind === 'check' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Check
          </button>
          <button
            onClick={() => setNewKind('output')}
            className={`px-2 py-1 rounded ${newKind === 'output' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Output
          </button>
        </div>
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); }}
          placeholder={newKind === 'check' ? 'e.g. Exercise done' : 'e.g. Build block output'}
          className="h-8 text-sm bg-background flex-1"
        />
        <Button size="sm" onClick={submitAdd} disabled={!newLabel.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {items.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          {fullHouse
            ? `Full house: ${total}/${total}. Stack day.`
            : nonZeroToday
            ? `${todayHits}/${total} done. Push for one more before bed.`
            : `Zero so far. One toggle = streak alive.`}
          <span className="opacity-60"> · {today}</span>
        </p>
      )}
    </div>
  );
}
