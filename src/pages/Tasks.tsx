import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GuestNotice } from '@/components/GuestNotice';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Loader2, Clock, StickyNote, Plus, ListChecks } from 'lucide-react';
import { useTasks, TaskItem } from '@/hooks/useTasks';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const TaskRow = ({
  task,
  index,
  onToggle,
  onDelete,
  isDragDisabled,
}: {
  task: TaskItem;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isDragDisabled: boolean;
}) => (
  <Draggable draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...(!isDragDisabled ? provided.dragHandleProps : {})}
        className={`group flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 ${
          snapshot.isDragging
            ? 'bg-primary/5 shadow-lg ring-1 ring-primary/20 scale-[1.02]'
            : task.status === 'done'
              ? 'bg-muted/30 hover:bg-muted/50'
              : 'bg-card hover:bg-card/80 shadow-sm hover:shadow-md'
        } ${!isDragDisabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => onToggle(task.id)}
          className={`shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 transition-colors ${
            task.status === 'done'
              ? 'border-primary/40 data-[state=checked]:bg-primary/60'
              : 'border-border hover:border-primary/60'
          }`}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={`text-[15px] leading-snug ${
              task.status === 'done'
                ? 'line-through text-muted-foreground/60'
                : 'text-foreground font-medium'
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {task.notes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/70 max-w-[200px] truncate">
                <StickyNote className="h-3 w-3 shrink-0" />
                {task.notes}
              </span>
            )}
            {task.estimate_minutes !== undefined && task.estimate_minutes > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                <Clock className="h-3 w-3 shrink-0" />
                {task.estimate_minutes}m
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0 mt-0.5"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    )}
  </Draggable>
);

const Tasks = () => {
  const { tasks, isLoaded, isSaving, isLoggedIn, addTask, toggleTask, deleteTask, reorderTasks } =
    useTasks();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [estimate, setEstimate] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [activeTab, setActiveTab] = useState('open');

  const parsedEstimate = Number.parseInt(estimate, 10);
  const isEstimateValid = estimate.trim() === '' || (!Number.isNaN(parsedEstimate) && parsedEstimate >= 0);

  const handleAddTask = () => {
    if (!title.trim() || !isEstimateValid) return;
    addTask({
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : undefined,
      estimate_minutes: estimate.trim() ? parsedEstimate : undefined,
    });
    setTitle('');
    setNotes('');
    setEstimate('');
    setShowExtras(false);
  };

  const taskCounts = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    return { total, done, open: total - done };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const filters: Record<string, (s: string) => boolean> = {
      open: (s) => s === 'todo',
      done: (s) => s === 'done',
      all: () => true,
    };
    return tasks.filter((t) => (filters[activeTab] ?? filters.all)(t.status));
  }, [tasks, activeTab]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const sourceTask = filteredTasks[result.source.index];
    const destTask = filteredTasks[result.destination.index];
    const fullCopy = [...tasks];
    const srcIdx = fullCopy.findIndex((t) => t.id === sourceTask.id);
    const destIdx = fullCopy.findIndex((t) => t.id === destTask.id);
    const [removed] = fullCopy.splice(srcIdx, 1);
    fullCopy.splice(destIdx, 0, removed);
    reorderTasks(fullCopy);
  };

  if (!isLoaded) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const totalMinutes = tasks
    .filter((t) => t.status === 'todo' && t.estimate_minutes)
    .reduce((sum, t) => sum + (t.estimate_minutes ?? 0), 0);

  const progressPercent = taskCounts.total > 0 ? Math.round((taskCounts.done / taskCounts.total) * 100) : 0;

  return (
    <AppLayout isSaving={isSaving}>
      {!isLoggedIn && (
        <div className="max-w-xl mx-auto px-4 pt-4">
          <GuestNotice message="Log in to save your tasks across devices" />
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 py-6 md:py-10 space-y-8">
        {/* Header with progress */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-foreground leading-tight">Tasks</h2>
                <p className="text-sm text-muted-foreground">
                  {taskCounts.open} open{totalMinutes > 0 && ` · ~${totalMinutes} min`}
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {taskCounts.done}/{taskCounts.total}
            </span>
          </div>
          {/* Progress bar */}
          {taskCounts.total > 0 && (
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/70 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Add task — clean inline form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add a task..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              onFocus={() => setShowExtras(true)}
              className="text-[15px] h-11 bg-card shadow-sm border-border/40 focus:border-primary/40 rounded-xl"
            />
            <Button
              onClick={handleAddTask}
              disabled={!title.trim() || !isEstimateValid}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          {showExtras && (
            <div className="grid gap-2 sm:grid-cols-2 animate-in slide-in-from-top-1 duration-200">
              <Input
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm h-9 bg-card/60 border-border/30 rounded-lg"
              />
              <Input
                type="number"
                min={0}
                placeholder="Est. minutes"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="text-sm h-9 bg-card/60 border-border/30 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Task list */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="open">
              Open
              {taskCounts.open > 0 && (
                <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{taskCounts.open}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="done">
              Done
              {taskCounts.done > 0 && (
                <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{taskCounts.done}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="task-list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-1.5"
                >
                  {filteredTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/50 py-14 text-center">
                      <p className="text-sm text-muted-foreground/60">No tasks here yet</p>
                    </div>
                  ) : (
                    filteredTasks.map((task, index) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        index={index}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        isDragDisabled={activeTab !== 'open' && activeTab !== 'all'}
                      />
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;