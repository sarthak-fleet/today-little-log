import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  estimate_minutes?: number;
  status: 'todo' | 'done';
  created_at: string;
}

const GUEST_TASKS_KEY = 'guest-tasks-data';

const readGuestTasks = (): TaskItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_TASKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TaskItem[];
  } catch {
    return [];
  }
};

const writeGuestTasks = (tasks: TaskItem[]) => {
  localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(tasks));
};

export function useTasks() {
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = !!user;

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load tasks
  useEffect(() => {
    if (authLoading) return;

    const loadTasks = async () => {
      if (isLoggedIn) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setTasks(
            data.map((t) => ({
              id: t.id,
              title: t.title,
              notes: t.notes ?? undefined,
              estimate_minutes: t.estimate_minutes ?? undefined,
              status: t.status as 'todo' | 'done',
              created_at: t.created_at,
            }))
          );
        }
      } else {
        setTasks(readGuestTasks());
      }
      setIsLoaded(true);
    };

    loadTasks();
  }, [authLoading, isLoggedIn]);

  const addTask = useCallback(
    async (payload: { title: string; notes?: string; estimate_minutes?: number }) => {
      const newTask: TaskItem = {
        id: crypto.randomUUID(),
        title: payload.title,
        notes: payload.notes,
        estimate_minutes: payload.estimate_minutes,
        status: 'todo',
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setTasks((prev) => [newTask, ...prev]);

      if (isLoggedIn && user) {
        setIsSaving(true);
        const { error } = await supabase.from('tasks').insert({
          id: newTask.id,
          user_id: user.id,
          title: newTask.title,
          notes: newTask.notes ?? null,
          estimate_minutes: newTask.estimate_minutes ?? null,
          status: newTask.status,
        });
        setIsSaving(false);

        if (error) {
          // Rollback
          setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
      } else {
        const updated = [newTask, ...tasks];
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn, user, tasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<TaskItem, 'id' | 'created_at'>>) => {
      const prev = tasks.find((t) => t.id === id);
      if (!prev) return;

      // Optimistic update
      setTasks((current) =>
        current.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );

      if (isLoggedIn) {
        setIsSaving(true);
        const { error } = await supabase
          .from('tasks')
          .update({
            title: updates.title,
            notes: updates.notes ?? null,
            estimate_minutes: updates.estimate_minutes ?? null,
            status: updates.status,
          })
          .eq('id', id);
        setIsSaving(false);

        if (error) {
          // Rollback
          setTasks((current) =>
            current.map((t) => (t.id === id ? prev : t))
          );
        }
      } else {
        const updated = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn, tasks]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const newStatus: 'todo' | 'done' = task.status === 'done' ? 'todo' : 'done';

      // Optimistic update
      setTasks((current) =>
        current.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );

      if (isLoggedIn) {
        setIsSaving(true);
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', id);
        setIsSaving(false);

        if (error) {
          // Rollback
          setTasks((current) =>
            current.map((t) => (t.id === id ? { ...t, status: task.status } : t))
          );
        }
      } else {
        const updated = tasks.map((t) =>
          t.id === id ? { ...t, status: newStatus } : t
        );
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn, tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const prev = tasks.find((t) => t.id === id);
      if (!prev) return;

      // Optimistic update
      setTasks((current) => current.filter((t) => t.id !== id));

      if (isLoggedIn) {
        setIsSaving(true);
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        setIsSaving(false);

        if (error) {
          // Rollback
          setTasks((current) => [prev, ...current]);
        }
      } else {
        const updated = tasks.filter((t) => t.id !== id);
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn, tasks]
  );

  return {
    tasks,
    isLoaded,
    isSaving,
    isLoggedIn,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  };
}
