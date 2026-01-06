import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useHabits } from '@/hooks/useHabits';
import { useTasks } from '@/hooks/useTasks';

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

const TimeTracking = () => {
  const { habits, isLoaded: habitsLoaded } = useHabits();
  const { tasks, isLoaded: tasksLoaded } = useTasks();
  const [mode, setMode] = useState<'task' | 'habit'>('task');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const activeTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);
  const activeHabit = useMemo(
    () => habits.find((habit) => habit.id === selectedHabitId),
    [habits, selectedHabitId],
  );
  const activeLabel = mode === 'task' ? activeTask?.title : activeHabit?.title;

  const isSelectionReady = mode === 'task' ? !!activeTask : !!activeHabit;

  if (!habitsLoaded || !tasksLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading time tracking...</div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Time Tracking</h2>
            <p className="text-sm text-muted-foreground">Stay focused and log the time you invest.</p>
          </div>
          <Badge variant={isRunning ? 'secondary' : 'outline'}>
            {isRunning ? 'Session running' : 'Idle'}
          </Badge>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Select what you are working on</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(value) => setMode(value as 'task' | 'habit')}>
              <TabsList className="mb-4">
                <TabsTrigger value="task">Task</TabsTrigger>
                <TabsTrigger value="habit">Habit</TabsTrigger>
              </TabsList>
              <TabsContent value="task">
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.length === 0 && <SelectItem value="empty" disabled>No tasks yet</SelectItem>}
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="habit">
                <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a habit" />
                  </SelectTrigger>
                  <SelectContent>
                    {habits.length === 0 && <SelectItem value="empty" disabled>No habits yet</SelectItem>}
                    {habits.map((habit) => (
                      <SelectItem key={habit.id} value={habit.id}>
                        {habit.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
            <div className="mt-4 text-sm text-muted-foreground">
              {activeLabel ? (
                <span>
                  Focused on <span className="font-medium text-foreground">{activeLabel}</span>
                </span>
              ) : (
                <span>Select a task or habit to start tracking.</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Session timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-6 text-center">
              <p className="text-3xl font-semibold tracking-tight">{formatDuration(elapsedSeconds)}</p>
              <p className="text-xs text-muted-foreground mt-1">Elapsed time</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setIsRunning((prev) => !prev)}
                disabled={!isSelectionReady}
                variant={isRunning ? 'secondary' : 'default'}
              >
                {isRunning ? 'Pause' : 'Start'}
              </Button>
              <Button variant="ghost" onClick={() => setElapsedSeconds(0)} disabled={elapsedSeconds === 0}>
                Reset
              </Button>
              <Button variant="outline" disabled={!isSelectionReady || elapsedSeconds === 0}>
                Log session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TimeTracking;
