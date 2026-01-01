import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits, Habit } from '@/hooks/useHabits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Minus, Trash2, LogIn, Loader2, Target, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const Habits = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { habits, isLoaded, isSaving, isLoggedIn, addHabit, deleteHabit, logHabit, getLog } = useHabits();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newHabit, setNewHabit] = useState<Omit<Habit, 'id'>>({
    title: '',
    target_type: 'target',
    track_type: 'count',
    frequency: 'daily',
    target_value: 1,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const handleAddHabit = async () => {
    if (!newHabit.title.trim()) return;
    await addHabit(newHabit);
    setNewHabit({
      title: '',
      target_type: 'target',
      track_type: 'count',
      frequency: 'daily',
      target_value: 1,
    });
    setIsDialogOpen(false);
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
      {/* Header */}
      <header className="py-4 px-4 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h1 className="font-display font-semibold text-foreground text-lg">
                Habits
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Habit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Habit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Drink water, Exercise..."
                      value={newHabit.title}
                      onChange={(e) => setNewHabit(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={newHabit.target_type}
                        onValueChange={(v) => setNewHabit(prev => ({ ...prev, target_type: v as 'target' | 'limit' }))}
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
                        value={newHabit.track_type}
                        onValueChange={(v) => setNewHabit(prev => ({ ...prev, track_type: v as 'count' | 'time' }))}
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
                        value={newHabit.frequency}
                        onValueChange={(v) => setNewHabit(prev => ({ ...prev, frequency: v as 'daily' | 'weekly' }))}
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
                      <Label>{newHabit.target_type === 'target' ? 'Target' : 'Limit'}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newHabit.target_value}
                        onChange={(e) => setNewHabit(prev => ({ ...prev, target_value: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>

                  <Button onClick={handleAddHabit} className="w-full" disabled={!newHabit.title.trim()}>
                    Create Habit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Guest mode notice */}
      {!isLoggedIn && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <LogIn className="h-4 w-4" />
            <span>Log in to save your habits across devices</span>
            <Button variant="link" size="sm" className="ml-auto p-0 h-auto" onClick={() => navigate('/auth')}>
              Sign in
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {habits.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">No habits yet</h2>
            <p className="text-muted-foreground mb-4">Create your first habit to start tracking</p>
            <Button onClick={() => setIsDialogOpen(true)}>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize">
                          {habit.frequency} {habit.target_type}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteHabit(habit.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
