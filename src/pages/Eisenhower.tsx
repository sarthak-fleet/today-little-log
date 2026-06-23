import { EisenhowerBoard } from '@/components/EisenhowerBoard';
import { useTasks } from '@/hooks/useTasks';
import { LayoutGrid } from 'lucide-react';

const Eisenhower = () => {
  const { tasks, isLoaded, toggleTask, deleteTask } = useTasks();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <LayoutGrid className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Prioritize</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
          Not every task earns <span className="text-primary italic font-medium">your today.</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl">
          Sort by Eisenhower. Hover a task to set its quadrant. Q4 = delete, probably.
        </p>
      </section>

      <section className="px-4 max-w-6xl mx-auto pb-20">
        {!isLoaded ? (
          <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No tasks yet. Add some in{' '}
            <a className="text-primary underline" href="/tasks">
              Tasks
            </a>
            .
          </div>
        ) : (
          <EisenhowerBoard
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              quadrant: t.quadrant ?? null,
            }))}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
      </section>
    </div>
  );
};

export default Eisenhower;
