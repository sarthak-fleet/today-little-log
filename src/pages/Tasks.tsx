import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';

const Tasks = () => {
  const { tasks, isLoaded, addTask, toggleTask, deleteTask } = useTasks();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [estimate, setEstimate] = useState('');

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Task Management</h2>
            <p className="text-sm text-muted-foreground">Plan, prioritize, and keep momentum.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{taskCounts.open} open</Badge>
            <Badge variant="outline">{taskCounts.done} done</Badge>
          </div>
        </div>

        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Add a task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Title</Label>
              <Input
                id="taskTitle"
                placeholder="Write a clear, actionable task"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taskNotes">Notes (optional)</Label>
                <Input
                  id="taskNotes"
                  placeholder="Context or next step"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskEstimate">Estimate (minutes)</Label>
                <Input
                  id="taskEstimate"
                  type="number"
                  min={0}
                  placeholder="e.g. 30"
                  value={estimate}
                  onChange={(event) => setEstimate(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button onClick={handleAddTask} disabled={!title.trim() || !isEstimateValid}>
                Add task
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="open">
          <TabsList className="mb-4">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          {[
            { key: 'open', filter: (status: string) => status === 'todo' },
            { key: 'done', filter: (status: string) => status === 'done' },
            { key: 'all', filter: () => true },
          ].map(({ key, filter }) => (
            <TabsContent key={key} value={key}>
              {tasks.filter((task) => filter(task.status)).length === 0 ? (
                <Card className="border-dashed border-border/70">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No tasks here yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tasks
                    .filter((task) => filter(task.status))
                    .map((task) => (
                      <Card key={task.id} className="border-border/60">
                        <CardContent className="flex items-start justify-between gap-4 py-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={task.status === 'done'}
                              onCheckedChange={() => toggleTask(task.id)}
                              className="mt-1"
                            />
                            <div className="space-y-1">
                              <p className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </p>
                              {task.notes && (
                                <p className="text-sm text-muted-foreground">{task.notes}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {task.estimate_minutes !== undefined && (
                                  <span>{task.estimate_minutes} min</span>
                                )}
                                <span className="uppercase tracking-wide">{task.status}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Tasks;
