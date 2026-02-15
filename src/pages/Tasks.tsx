import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GuestNotice } from '@/components/GuestNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2, GripVertical, Clock, StickyNote } from 'lucide-react';
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
        className={`group flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
          snapshot.isDragging
            ? 'border-primary/40 bg-primary/5 shadow-lg'
            : 'border-border/50 bg-card hover:border-border'
        }`}
      >
        {!isDragDisabled && (
          <div
            {...provided.dragHandleProps}
            className="cursor-grab w-2 self-stretch flex items-center"
          />
        )}
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => onToggle(task.id)}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-tight truncate ${
              task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
          >
            {task.title}
          </p>
          {task.notes && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
              <StickyNote className="h-3 w-3 shrink-0" />
              {task.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.estimate_minutes !== undefined && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.estimate_minutes}m
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
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

    // We need to work on the full tasks array
    const sourceTask = filteredTasks[result.source.index];
    const destTask = filteredTasks[result.destination.index];

    // Find indices in the full array
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

  return (
    <AppLayout isSaving={isSaving}>
      {!isLoggedIn && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <GuestNotice message="Log in to save your tasks across devices" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Tasks</h2>
            <p className="text-sm text-muted-foreground">
              {taskCounts.open} open{totalMinutes > 0 && ` · ~${totalMinutes} min`}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {taskCounts.done}/{taskCounts.total} done
          </Badge>
        </div>

        {/* Add form */}
        <Card className="border-border/60">
          <CardContent className="pt-5 space-y-3">
            <Input
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              className="text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Est. minutes"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  className="text-sm"
                />
                <Button
                  onClick={handleAddTask}
                  disabled={!title.trim() || !isEstimateValid}
                  size="sm"
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task list */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="task-list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {filteredTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
                      No tasks here yet.
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
