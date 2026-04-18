import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { isWithinInterval, parseISO, subDays } from 'date-fns';

export interface Habit {
  id: string;
  title: string;
  target_type: 'target' | 'limit';
  track_type: 'count' | 'time';
  frequency: 'daily' | 'weekly';
  target_value: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  value: number;
}

const HABITS_STORAGE_KEY = 'habits-data';
const HABIT_LOGS_STORAGE_KEY = 'habit-logs-data';

interface HabitRow {
  id: string;
  title: string;
  target_type: string;
  track_type: string;
  frequency: string;
  target_value: number;
}

interface HabitLogRow {
  id: string;
  habit_id: string;
  date: string;
  value: number;
}

const dedupeLogs = (inputLogs: HabitLog[]): HabitLog[] => {
  const map = new Map<string, HabitLog>();
  inputLogs.forEach((log) => {
    map.set(`${log.habit_id}-${log.date}`, log);
  });
  return Array.from(map.values());
};

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // Load habits from DB or localStorage
  const loadHabits = useCallback(async () => {
    if (user) {
      try {
        const habitsData = await apiFetch<HabitRow[]>('/api/habits');
        const mappedHabits: Habit[] = (habitsData || []).map(h => ({
          id: h.id,
          title: h.title,
          target_type: h.target_type as 'target' | 'limit',
          track_type: h.track_type as 'count' | 'time',
          frequency: h.frequency as 'daily' | 'weekly',
          target_value: h.target_value,
        }));
        setHabits(mappedHabits);

        // Check for local storage migration
        const savedHabits = localStorage.getItem(HABITS_STORAGE_KEY);
        if (savedHabits && mappedHabits.length === 0) {
          const localHabits = JSON.parse(savedHabits) as Habit[];
          for (const habit of localHabits) {
            await apiFetch('/api/habits', {
              method: 'POST',
              body: JSON.stringify({
                title: habit.title,
                target_type: habit.target_type,
                track_type: habit.track_type,
                frequency: habit.frequency,
                target_value: habit.target_value,
              }),
            });
          }
          // Reload after migration
          const reloadedHabits = await apiFetch<HabitRow[]>('/api/habits');
          if (reloadedHabits) {
            setHabits(reloadedHabits.map(h => ({
              id: h.id,
              title: h.title,
              target_type: h.target_type as 'target' | 'limit',
              track_type: h.track_type as 'count' | 'time',
              frequency: h.frequency as 'daily' | 'weekly',
              target_value: h.target_value,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load habits:', error);
      }

      // Load logs
      try {
        const logsData = await apiFetch<HabitLogRow[]>('/api/habit-logs');
        const mappedLogs = (logsData || []).map(l => ({
          id: l.id,
          habit_id: l.habit_id,
          date: l.date,
          value: l.value,
        }));
        setLogs(dedupeLogs(mappedLogs));
      } catch (error) {
        console.error('Failed to load habit logs:', error);
      }
    } else {
      // Guest mode - use localStorage
      const savedHabits = localStorage.getItem(HABITS_STORAGE_KEY);
      const savedLogs = localStorage.getItem(HABIT_LOGS_STORAGE_KEY);
      setHabits(savedHabits ? JSON.parse(savedHabits) : []);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs) as HabitLog[];
        const dedupedLogs = dedupeLogs(parsedLogs);
        setLogs(dedupedLogs);
        if (dedupedLogs.length !== parsedLogs.length) {
          localStorage.setItem(HABIT_LOGS_STORAGE_KEY, JSON.stringify(dedupedLogs));
        }
      } else {
        setLogs([]);
      }
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Add habit
  const addHabit = useCallback(async (habit: Omit<Habit, 'id'>) => {
    setIsSaving(true);

    if (user) {
      try {
        const data = await apiFetch<HabitRow>('/api/habits', {
          method: 'POST',
          body: JSON.stringify({
            title: habit.title,
            target_type: habit.target_type,
            track_type: habit.track_type,
            frequency: habit.frequency,
            target_value: habit.target_value,
          }),
        });

        if (data) {
          setHabits(prev => [...prev, {
            id: data.id,
            title: data.title,
            target_type: data.target_type as 'target' | 'limit',
            track_type: data.track_type as 'count' | 'time',
            frequency: data.frequency as 'daily' | 'weekly',
            target_value: data.target_value,
          }]);
        }
      } catch (error) {
        console.error('Failed to add habit:', error);
      }
    } else {
      const newHabit: Habit = { ...habit, id: crypto.randomUUID() };
      const newHabits = [...habits, newHabit];
      setHabits(newHabits);
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(newHabits));
    }

    setIsSaving(false);
  }, [user, habits]);

  // Update habit
  const updateHabit = useCallback(async (id: string, updates: Partial<Omit<Habit, 'id'>>) => {
    setIsSaving(true);

    if (user) {
      try {
        await apiFetch('/api/habits', {
          method: 'PATCH',
          body: JSON.stringify({ id, ...updates }),
        });
        setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
      } catch (error) {
        console.error('Failed to update habit:', error);
      }
    } else {
      const newHabits = habits.map(h => h.id === id ? { ...h, ...updates } : h);
      setHabits(newHabits);
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(newHabits));
    }

    setIsSaving(false);
  }, [user, habits]);

  // Delete habit
  const deleteHabit = useCallback(async (id: string) => {
    setIsSaving(true);

    if (user) {
      try {
        await apiFetch('/api/habits', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });
        setHabits(prev => prev.filter(h => h.id !== id));
        setLogs(prev => prev.filter(l => l.habit_id !== id));
      } catch (error) {
        console.error('Failed to delete habit:', error);
      }
    } else {
      const newHabits = habits.filter(h => h.id !== id);
      const newLogs = logs.filter(l => l.habit_id !== id);
      setHabits(newHabits);
      setLogs(newLogs);
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(newHabits));
      localStorage.setItem(HABIT_LOGS_STORAGE_KEY, JSON.stringify(newLogs));
    }

    setIsSaving(false);
  }, [user, habits, logs]);

  // Log habit (upsert for the day)
  const logHabit = useCallback(async (habitId: string, value: number, date: string) => {
    setIsSaving(true);

    if (user) {
      try {
        const data = await apiFetch<HabitLogRow>('/api/habit-logs', {
          method: 'POST',
          body: JSON.stringify({ habit_id: habitId, date, value }),
        });

        if (data) {
          setLogs(prev => {
            const existing = prev.findIndex(l => l.habit_id === habitId && l.date === date);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = { id: data.id, habit_id: data.habit_id, date: data.date, value: data.value };
              return updated;
            }
            return [...prev, { id: data.id, habit_id: data.habit_id, date: data.date, value: data.value }];
          });
        }
      } catch (error) {
        console.error('Failed to log habit:', error);
      }
    } else {
      const existingIndex = logs.findIndex(l => l.habit_id === habitId && l.date === date);
      let newLogs: HabitLog[];

      if (existingIndex >= 0) {
        newLogs = [...logs];
        newLogs[existingIndex] = { ...newLogs[existingIndex], value };
      } else {
        newLogs = [...logs, { id: crypto.randomUUID(), habit_id: habitId, date, value }];
      }

      setLogs(newLogs);
      localStorage.setItem(HABIT_LOGS_STORAGE_KEY, JSON.stringify(newLogs));
    }

    setIsSaving(false);
  }, [user, logs]);

  // Get log value for a specific habit - handles daily/weekly frequency
  const getLog = useCallback((habitId: string, date: string): number => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    if (habit.frequency === 'daily') {
      // For daily habits, just get today's log
      const log = logs.find(l => l.habit_id === habitId && l.date === date);
      return log?.value || 0;
    } else {
      // For weekly habits, use a rolling 7-day window (today + last 6 days).
      const targetDate = parseISO(date);
      const startDate = subDays(targetDate, 6);

      const weekLogs = logs.filter(l => {
        if (l.habit_id !== habitId) return false;
        const logDate = parseISO(l.date);
        return isWithinInterval(logDate, { start: startDate, end: targetDate });
      });

      return weekLogs.reduce((sum, l) => sum + l.value, 0);
    }
  }, [logs, habits]);

  // Get today's log only (for incrementing/decrementing)
  const getTodayLog = useCallback((habitId: string, date: string): number => {
    const log = logs.find(l => l.habit_id === habitId && l.date === date);
    return log?.value || 0;
  }, [logs]);

  return {
    habits,
    logs,
    isLoaded,
    isSaving,
    isLoggedIn: !!user,
    addHabit,
    updateHabit,
    deleteHabit,
    logHabit,
    getLog,
    getTodayLog,
  };
}
