import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpRight, Flame, Clock, Trash2, AlertTriangle } from 'lucide-react';

type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';

const LABELS: Record<Quadrant, { name: string; subtitle: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  q1: { name: 'Do now', subtitle: 'Urgent + important', tone: 'border-destructive/50 bg-destructive/5', icon: Flame },
  q2: { name: 'Schedule', subtitle: 'Important, not urgent', tone: 'border-primary/50 bg-primary/5', icon: ArrowUpRight },
  q3: { name: 'Delegate / batch', subtitle: 'Urgent, not important', tone: 'border-accent/50 bg-accent/5', icon: Clock },
  q4: { name: 'Delete', subtitle: 'Neither — why is it on your list?', tone: 'border-border bg-muted/40', icon: Trash2 },
};

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
  quadrant?: Quadrant | null;
}

interface Props {
  tasks: Task[];
  onChange?: (tasks: Task[]) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Drag-free Eisenhower grid. Click a task to cycle quadrant, or use the
 * chip menu. Writes through to /api/tasks via the provided callbacks.
 */
export function EisenhowerBoard({ tasks: incoming, onToggle, onDelete }: Props) {
  const [tasks, setTasks] = useState<Task[]>(incoming);

  // Sync when parent changes.
  useMemo(() => { setTasks(incoming); }, [incoming]);

  const grouped = useMemo(() => {
    const map: Record<Quadrant, Task[]> & { unassigned: Task[] } = { q1: [], q2: [], q3: [], q4: [], unassigned: [] };
    tasks.forEach((t) => {
      if (t.quadrant && (['q1','q2','q3','q4'] as const).includes(t.quadrant)) map[t.quadrant].push(t);
      else map.unassigned.push(t);
    });
    return map;
  }, [tasks]);

  const setQuadrant = async (id: string, q: Quadrant | null) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, quadrant: q } : t)));
    await apiFetch('/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify({ id, quadrant: q }),
    }).catch(() => {});
  };

  return (
    <div className="space-y-4">
      {grouped.unassigned.length > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-4 bg-muted/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            <AlertTriangle className="h-3.5 w-3.5" /> Unquadranted ({grouped.unassigned.length})
          </div>
          <ul className="space-y-1.5">
            {grouped.unassigned.map((t) => (
              <TaskRow key={t.id} task={t} onSetQuadrant={setQuadrant} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['q1', 'q2', 'q3', 'q4'] as const).map((q) => {
          const { name, subtitle, tone, icon: Icon } = LABELS[q];
          const items = grouped[q];
          return (
            <div key={q} className={`rounded-2xl border-2 ${tone} p-4 min-h-[160px]`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase tracking-widest">{name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mb-3">{subtitle}</div>
              {items.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">—</div>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((t) => (
                    <TaskRow key={t.id} task={t} onSetQuadrant={setQuadrant} onToggle={onToggle} onDelete={onDelete} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  task, onSetQuadrant, onToggle, onDelete,
}: {
  task: Task;
  onSetQuadrant: (id: string, q: Quadrant | null) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-lg bg-background/60 px-2 py-1.5 text-sm">
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={() => onToggle?.(task.id)}
        className="h-3.5 w-3.5"
      />
      <span className={`flex-1 truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {task.title}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
        {(['q1','q2','q3','q4'] as const).map((q) => (
          <Button
            key={q}
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[10px] font-mono"
            onClick={() => onSetQuadrant(task.id, task.quadrant === q ? null : q)}
            title={LABELS[q].name}
          >
            {q.toUpperCase()}
          </Button>
        ))}
        {onDelete && (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </li>
  );
}
