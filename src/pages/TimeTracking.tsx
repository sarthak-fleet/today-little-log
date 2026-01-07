import { useEffect, useMemo, useState, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { useHabits } from '@/hooks/useHabits';
import { useTasks } from '@/hooks/useTasks';
import { useTimeSessions } from '@/hooks/useTimeSessions';
import { format } from 'date-fns';

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

const TimeTracking = () => {
  const { habits, isLoaded: habitsLoaded } = useHabits();
  const { tasks, isLoaded: tasksLoaded } = useTasks();
  const { sessions, isLoaded: sessionsLoaded, logSession, deleteSession, getTotalTimeToday } = useTimeSessions();

  const [mode, setMode] = useState<'task' | 'habit'>('task');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<string | null>(null);

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

  const handleStart = () => {
    startTimeRef.current = new Date().toISOString();
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    startTimeRef.current = null;
  };

  const handleLogSession = async () => {
    if (!startTimeRef.current || elapsedSeconds === 0) return;

    const referenceId = mode === 'task' ? selectedTaskId : selectedHabitId;
    if (!referenceId) return;

    await logSession({
      reference_type: mode,
      reference_id: referenceId,
      duration_seconds: elapsedSeconds,
      started_at: startTimeRef.current,
      ended_at: new Date().toISOString(),
    });

    handleReset();
  };

  const todayTotal = getTotalTimeToday();

  // Get reference label for a session
  const getSessionLabel = (session: { reference_type: 'task' | 'habit'; reference_id: string }) => {
    if (session.reference_type === 'task') {
      return tasks.find((t) => t.id === session.reference_id)?.title ?? 'Deleted task';
    }
    return habits.find((h) => h.id === session.reference_id)?.title ?? 'Deleted habit';
  };

  if (!habitsLoaded || !tasksLoaded || !sessionsLoaded) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading time tracking...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Time Tracking</h2>
            <p className="text-sm text-muted-foreground">Stay focused and log the time you invest.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={isRunning ? 'secondary' : 'outline'}>
              {isRunning ? 'Session running' : 'Idle'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Today: {formatDuration(todayTotal)}
            </span>
          </div>
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
              <p className="text-3xl font-semibold tracking-tight font-mono">{formatDuration(elapsedSeconds)}</p>
              <p className="text-xs text-muted-foreground mt-1">Elapsed time</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isRunning ? (
                <Button onClick={handleStart} disabled={!isSelectionReady}>
                  Start
                </Button>
              ) : (
                <Button onClick={handlePause} variant="secondary">
                  Pause
                </Button>
              )}
              <Button variant="ghost" onClick={handleReset} disabled={elapsedSeconds === 0 && !isRunning}>
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={handleLogSession}
                disabled={!isSelectionReady || elapsedSeconds === 0}
              >
                Log session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No sessions logged yet. Start tracking to see your history.
              </p>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {sessions.slice(0, 20).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {getSessionLabel(session)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.started_at), 'MMM d, h:mm a')} •{' '}
                          {formatDuration(session.duration_seconds)}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize shrink-0">
                        {session.reference_type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TimeTracking;
