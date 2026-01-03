import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { GuestNotice } from '@/components/GuestNotice';
import { useHabits, Habit } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Minus, Trash2, Loader2, Target, CheckCircle2, Pencil } from 'lucide-react';
import { format } from 'date-fns';

const Habits = () => {
  const { habits, isLoaded, isSaving, isLoggedIn, addHabit, updateHabit, deleteHabit, logHabit, getLog } = useHabits();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState<Omit<Habit, 'id'>>({
    title: '',
    target_type: 'target',
    track_type: 'count',
    frequency: 'daily',
    target_value: 1,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

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

  const handleIncrement = (habit: Habit) => {
    const current = getLog(habit.id, today);
    logHabit(habit.id, current + 1, today);
  };

  const handleDecrement = (habit: Habit) => {
    const current = getLog(habit.id, today);
    if (current > 0) {
      logHabit(habit.id, current - 1, today);
    }
  };

  const getProgress = (habit: Habit) => {
    const current = getLog(habit.id, today);
    const percentage = Math.min((current / habit.target_value) * 100, 100);
    return { current, percentage };
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isSaving={isSaving} />

      {/* Guest mode notice */}
      {!isLoggedIn && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <GuestNotice message="Log in to save your habits across devices" />
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
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
              const { current, percentage } = getProgress(habit);
              const isComplete = habit.target_type === 'target' 
                ? current >= habit.target_value
                : current <= habit.target_value;
              const isOverLimit = habit.target_type === 'limit' && current > habit.target_value;
              
              return (
                <Card key={habit.id} className={`transition-colors ${isComplete && !isOverLimit ? 'border-primary/50 bg-primary/5' : ''} ${isOverLimit ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        {habit.title}
                        {isComplete && !isOverLimit && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground capitalize mr-2">
                          {habit.frequency} {habit.target_type}
                        </span>
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
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {/* Progress bar */}
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-sm text-muted-foreground">
                            {habit.track_type === 'time' ? formatTime(current) : current}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {habit.target_type === 'target' ? 'Goal: ' : 'Limit: '}
                            {habit.track_type === 'time' ? formatTime(habit.target_value) : habit.target_value}
                          </span>
                        </div>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDecrement(habit)}
                          disabled={current === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        {habit.track_type === 'time' ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => logHabit(habit.id, current + 5, today)}
                            >
                              +5m
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => logHabit(habit.id, current + 15, today)}
                            >
                              +15m
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleIncrement(habit)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Habits;
