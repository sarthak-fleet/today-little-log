import { useState } from 'react';
import { useReportSaving } from '@/components/SavingContext';
import { GuestNotice } from '@/components/GuestNotice';
import { useHabits, type Habit } from '@/hooks/useHabits';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Target, CheckCircle2, Pencil, History } from 'lucide-react';
import { HabitsSkeleton } from '@/components/PageSkeleton';
import { format, subDays } from 'date-fns';

type HabitsProps = {
  embedded?: boolean;
};

const Habits = ({ embedded = false }: HabitsProps) => {
  const {
    habits,
    logs,
    isLoaded,
    isSaving,
    isLoggedIn,
    addHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    getLog,
    getTodayLog,
  } = useHabits();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [historyHabit, setHistoryHabit] = useState<Habit | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logModal, setLogModal] = useState<{
    open: boolean;
    habit: Habit | null;
    value: string;
  }>({
    open: false,
    habit: null,
    value: '',
  });
  const [formData, setFormData] = useState<Omit<Habit, 'id'>>({
    title: '',
    target_type: 'target',
    track_type: 'count',
    frequency: 'daily',
    target_value: 1,
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), 'EEEE, MMM d');
  const historyDays = Array.from({ length: 30 }, (_, index) => {
    const date = subDays(new Date(), 29 - index);
    return format(date, 'yyyy-MM-dd');
  });

  const resetForm = () => {
    setFormData({
      title: '',
      target_type: 'target',
      track_type: 'count',
      frequency: 'daily',
      target_value: 1,
    });
    setEditingHabit(null);
  };

  const handleOpenDialog = (habit?: Habit) => {
    if (habit) {
      setEditingHabit(habit);
      setFormData({
        title: habit.title,
        target_type: habit.target_type,
        track_type: habit.track_type,
        frequency: habit.frequency,
        target_value: habit.target_value,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    if (editingHabit) {
      await updateHabit(editingHabit.id, formData);
    } else {
      await addHabit(formData);
    }
    handleCloseDialog();
  };

  const handleOpenLog = (habit: Habit) => {
    const todayValue = getTodayLog(habit.id, today);
    setLogModal({
      open: true,
      habit,
      value: todayValue > 0 ? String(todayValue) : '',
    });
  };

  const handleCloseLog = () => {
    setLogModal({
      open: false,
      habit: null,
      value: '',
    });
  };

  const handleSaveLog = async () => {
    if (!logModal.habit) return;
    const parsed = Number.parseInt(logModal.value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return;
    await logHabit(logModal.habit.id, parsed, today);
    handleCloseLog();
  };

  const getProgress = (habit: Habit) => {
    const current = getLog(habit.id, today);
    const todayValue = getTodayLog(habit.id, today);
    const percentage =
      habit.target_value > 0 ? Math.min((current / habit.target_value) * 100, 100) : 0;
    const remaining = habit.target_value - current;
    return { current, todayValue, percentage, remaining };
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatValue = (habit: Habit, value: number) =>
    habit.track_type === 'time' ? formatTime(value) : value.toString();

  const getDayValue = (habitId: string, date: string) =>
    logs.find((log) => log.habit_id === habitId && log.date === date)?.value ?? 0;

  const getDayLog = (habitId: string, date: string) =>
    logs.find((log) => log.habit_id === habitId && log.date === date);

  const isGoalMet = (habit: Habit, value: number) =>
    habit.target_type === 'limit' ? value <= habit.target_value : value >= habit.target_value;

  const getHistoryStats = (habit: Habit) => {
    const values = historyDays.map((date) => ({ date, value: getDayValue(habit.id, date) }));
    const completedDays = values.filter(({ value }) => isGoalMet(habit, value)).length;
    let streak = 0;
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (!isGoalMet(habit, values[index].value)) break;
      streak += 1;
    }

    return {
      values,
      completedDays,
      completionRate: Math.round((completedDays / historyDays.length) * 100),
      streak,
    };
  };

  useReportSaving(isSaving);

  const parsedLogValue = Number.parseInt(logModal.value, 10);
  const isLogValueValid =
    logModal.value.trim().length > 0 && !Number.isNaN(parsedLogValue) && parsedLogValue >= 0;

  if (!isLoaded) return <HabitsSkeleton />;

  return (
    <div className={cn('bg-background text-foreground', embedded ? '' : 'min-h-screen')}>
      {!embedded && (
        <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 text-primary/80 mb-3">
            <Target className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">Ritual items</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold leading-tight text-foreground">
            Repetition. <span className="text-primary italic font-medium">The only shortcut.</span>
          </h1>
        </section>
      )}

      {!isLoggedIn && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <GuestNotice message="Log in to save your ritual items across devices" />
        </div>
      )}

      <div className={cn('max-w-4xl mx-auto px-4', embedded ? 'pb-2' : 'pb-20')}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              Daily ritual items
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One checklist for the repeated things worth remembering, with history per item.
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => (open ? handleOpenDialog() : handleCloseDialog())}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingHabit ? 'Edit ritual item' : 'Create ritual item'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Drink water, Exercise..."
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.target_type}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, target_type: v as 'target' | 'limit' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="target">Target (aim for)</SelectItem>
                        <SelectItem value="limit">Limit (stay under)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Track by</Label>
                    <Select
                      value={formData.track_type}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, track_type: v as 'count' | 'time' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="time">Time (minutes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, frequency: v as 'daily' | 'weekly' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{formData.target_type === 'target' ? 'Target' : 'Limit'}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.target_value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          target_value: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={!formData.title.trim()}>
                  {editingHabit ? 'Save changes' : 'Create item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No ritual items yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create the first daily item you want history for
            </p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {habits.map((habit) => {
              const { current, todayValue, percentage, remaining } = getProgress(habit);
              const isLimit = habit.target_type === 'limit';
              const isOverLimit = isLimit && current > habit.target_value;
              const isComplete = !isLimit && current >= habit.target_value;
              const cardTone = isOverLimit
                ? 'border-destructive/50 bg-destructive/5'
                : isLimit
                  ? 'border-accent/30 bg-accent/5'
                  : isComplete
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border/50 bg-card';
              const progressTone = isLimit
                ? isOverLimit
                  ? 'bg-destructive'
                  : 'bg-accent'
                : 'bg-primary';
              const summaryText =
                habit.frequency === 'weekly'
                  ? `Last 7 days: ${formatValue(habit, current)} (today: ${formatValue(habit, todayValue)})`
                  : `Today: ${formatValue(habit, current)}`;
              const limitStatus = isOverLimit
                ? `Over by ${formatValue(habit, Math.abs(remaining))}`
                : `${formatValue(habit, remaining)} left`;

              return (
                <Card key={habit.id} className={`transition-colors hover:shadow-md ${cardTone}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          {habit.title}
                          {isComplete && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {habit.frequency}
                          </Badge>
                          <Badge
                            variant={
                              isLimit ? (isOverLimit ? 'destructive' : 'outline') : 'secondary'
                            }
                          >
                            {isLimit ? 'Limit' : 'Target'}
                          </Badge>
                          <Badge variant="outline">
                            {habit.track_type === 'time' ? 'Time' : 'Count'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenDialog(habit)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete habit?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the habit and all its logged history. This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteHabit(habit.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{summaryText}</span>
                        <span
                          className={`font-medium ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}
                        >
                          {isLimit
                            ? limitStatus
                            : `Goal: ${formatValue(habit, habit.target_value)}${habit.frequency === 'weekly' ? '/7d' : ''}`}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${progressTone}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {isLimit ? 'Used' : 'Progress'}: {formatValue(habit, current)}
                        </span>
                        <span>
                          {isLimit ? 'Limit' : 'Goal'}: {formatValue(habit, habit.target_value)}
                          {habit.frequency === 'weekly' && <span>/7d</span>}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        className="gap-2"
                        variant={isLimit ? 'secondary' : 'default'}
                        onClick={() => handleOpenLog(habit)}
                      >
                        <Plus className="h-4 w-4" />
                        Log
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setHistoryHabit(habit);
                          setHistoryOpen(true);
                        }}
                        className="gap-2"
                      >
                        <History className="h-4 w-4" />
                        History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={logModal.open}
        onOpenChange={(open) => {
          if (!open) handleCloseLog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {logModal.habit ? `Log ${logModal.habit.title}` : 'Log ritual item'}
            </DialogTitle>
          </DialogHeader>
          {logModal.habit && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{todayLabel}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {logModal.habit.frequency} item
                  </p>
                </div>
                <Badge variant={logModal.habit.target_type === 'limit' ? 'outline' : 'secondary'}>
                  {logModal.habit.target_type === 'limit' ? 'Limit' : 'Target'}{' '}
                  {formatValue(logModal.habit, logModal.habit.target_value)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logValue">Log value</Label>
                <Input
                  id="logValue"
                  type="number"
                  min={0}
                  value={logModal.value}
                  onChange={(e) => setLogModal((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder={
                    logModal.habit.track_type === 'time' ? 'Minutes for today' : 'Total for today'
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {logModal.habit.track_type === 'time'
                    ? 'Enter the total minutes for today.'
                    : 'Enter the total count for today.'}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleCloseLog}>
                  Cancel
                </Button>
                <Button onClick={handleSaveLog} disabled={!isLogValueValid}>
                  Save log
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {historyHabit ? `${historyHabit.title} history` : 'Item history'}
            </DialogTitle>
          </DialogHeader>
          {historyHabit &&
            (() => {
              const stats = getHistoryStats(historyHabit);
              const recentLogs = logs
                .filter((log) => log.habit_id === historyHabit.id)
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 8);

              return (
                <div className="space-y-5 pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        30d rate
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">
                        {stats.completionRate}%
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Done days
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">
                        {stats.completedDays}/30
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Streak
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">{stats.streak}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last 30 days</span>
                      <span>
                        {historyHabit.target_type === 'limit' ? 'Within limit' : 'Met target'}
                      </span>
                    </div>
                    <div className="grid grid-cols-10 gap-1.5">
                      {stats.values.map(({ date, value }) => {
                        const met = isGoalMet(historyHabit, value);
                        const dayLog = getDayLog(historyHabit.id, date);
                        return (
                          <div
                            key={date}
                            title={`${format(new Date(`${date}T00:00:00`), 'MMM d')}: ${formatValue(historyHabit, value)}`}
                            className={cn(
                              'aspect-square rounded-md border',
                              met
                                ? 'border-primary/40 bg-primary/80'
                                : dayLog
                                  ? 'border-accent/40 bg-accent/40'
                                  : 'border-border bg-muted/50'
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent logs
                    </p>
                    {recentLogs.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No logged history yet.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {recentLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">
                              {format(new Date(`${log.date}T00:00:00`), 'EEE, MMM d')}
                            </span>
                            <span className="font-medium">
                              {formatValue(historyHabit, log.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Habits;
