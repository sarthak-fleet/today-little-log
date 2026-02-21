import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { GuestNotice } from '@/components/GuestNotice';
import { HabitHistory } from '@/components/HabitHistory';
import { useHabits, Habit } from '@/hooks/useHabits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Target, CheckCircle2, Pencil } from 'lucide-react';
import { format } from 'date-fns';

const Habits = () => {
  const { habits, logs, isLoaded, isSaving, isLoggedIn, addHabit, updateHabit, deleteHabit, logHabit, getLog, getTodayLog } = useHabits();

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
    const percentage = habit.target_value > 0 ? Math.min((current / habit.target_value) * 100, 100) : 0;
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

  const parsedLogValue = Number.parseInt(logModal.value, 10);
  const isLogValueValid =
    logModal.value.trim().length > 0 && !Number.isNaN(parsedLogValue) && parsedLogValue >= 0;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout isSaving={isSaving}>
      {/* Guest mode notice */}
      {!isLoggedIn && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <GuestNotice message="Log in to save your habits across devices" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-foreground">Your Habits</h2>
          <Dialog open={isDialogOpen} onOpenChange={(open) => open ? handleOpenDialog() : handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Habit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Drink water, Exercise..."
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.target_type}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, target_type: v as 'target' | 'limit' }))}
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
                      onValueChange={(v) => setFormData(prev => ({ ...prev, track_type: v as 'count' | 'time' }))}
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
                      onValueChange={(v) => setFormData(prev => ({ ...prev, frequency: v as 'daily' | 'weekly' }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={!formData.title.trim()}>
                  {editingHabit ? 'Save Changes' : 'Create Habit'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">No habits yet</h2>
            <p className="text-muted-foreground mb-4">Create your first habit to start tracking</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Habit
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
              const summaryText = habit.frequency === 'weekly'
                ? `Last 7 days: ${formatValue(habit, current)} (today: ${formatValue(habit, todayValue)})`
                : `Today: ${formatValue(habit, current)}`;
              const limitStatus = isOverLimit
                ? `Over by ${formatValue(habit, Math.abs(remaining))}`
                : `${formatValue(habit, remaining)} left`;

              return (
                <Card
                  key={habit.id}
                  className={`transition-colors hover:shadow-md ${cardTone}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          {habit.title}
                          {isComplete && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {habit.frequency}
                          </Badge>
                          <Badge variant={isLimit ? (isOverLimit ? 'destructive' : 'outline') : 'secondary'}>
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
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenDialog(habit)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteHabit(habit.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{summaryText}</span>
                        <span className={`font-medium ${isOverLimit ? 'text-destructive' : 'text-foreground'}`}>
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
                      >
                        View logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <HabitHistory
        habit={historyHabit}
        logs={logs}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onUpdateLog={logHabit}
      />

      <Dialog open={logModal.open} onOpenChange={(open) => { if (!open) handleCloseLog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {logModal.habit ? `Log ${logModal.habit.title}` : 'Log habit'}
            </DialogTitle>
          </DialogHeader>
          {logModal.habit && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{todayLabel}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {logModal.habit.frequency} habit
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
                  placeholder={logModal.habit.track_type === 'time' ? 'Minutes for today' : 'Total for today'}
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
    </AppLayout>
  );
};

export default Habits;
