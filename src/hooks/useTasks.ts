import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  estimate_minutes?: number;
  status: 'todo' | 'done';
  sort_order: number;
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
      if (isLoggedIn && user) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data) {
          const mapped: TaskItem[] = data.map((t) => ({
            id: t.id,
            title: t.title,
            notes: t.notes ?? undefined,
            estimate_minutes: t.estimate_minutes ?? undefined,
            status: t.status as 'todo' | 'done',
            sort_order: (t as any).sort_order ?? 0,
            created_at: t.created_at,
          }));
          setTasks(mapped);

          // Migrate guest tasks to Supabase if DB is empty
          const guestTasks = readGuestTasks();
          if (guestTasks.length > 0 && mapped.length === 0) {
            for (const task of guestTasks) {
              await supabase.from('tasks').insert({
                id: task.id,
                user_id: user.id,
                title: task.title,
                notes: task.notes ?? null,
                estimate_minutes: task.estimate_minutes ?? null,
                status: task.status,
                sort_order: task.sort_order,
              } as any);
            }
            // Reload after migration
            const { data: reloaded } = await supabase
              .from('tasks')
              .select('*')
              .order('sort_order', { ascending: true });
            if (reloaded) {
              setTasks(reloaded.map((t) => ({
                id: t.id,
                title: t.title,
                notes: t.notes ?? undefined,
                estimate_minutes: t.estimate_minutes ?? undefined,
                status: t.status as 'todo' | 'done',
                sort_order: (t as any).sort_order ?? 0,
                created_at: t.created_at,
              })));
            }
            localStorage.removeItem(GUEST_TASKS_KEY);
          }
        }
      } else {
        setTasks(readGuestTasks());
      }
      setIsLoaded(true);
    };

    loadTasks();
  }, [authLoading, isLoggedIn, user]);

  const addTask = useCallback(
    async (payload: { title: string; notes?: string; estimate_minutes?: number }) => {
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) : 0;
      const newTask: TaskItem = {
        id: crypto.randomUUID(),
        title: payload.title,
        notes: payload.notes,
        estimate_minutes: payload.estimate_minutes,
        status: 'todo',
        sort_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      };

      setTasks((prev) => [...prev, newTask]);

      if (isLoggedIn && user) {
        setIsSaving(true);
        const { error } = await supabase.from('tasks').insert({
          id: newTask.id,
          user_id: user.id,
          title: newTask.title,
          notes: newTask.notes ?? null,
          estimate_minutes: newTask.estimate_minutes ?? null,
          status: newTask.status,
          sort_order: newTask.sort_order,
        } as any);
        setIsSaving(false);

        if (error) {
          setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
      } else {
        const updated = [...tasks, newTask];
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn, user, tasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<TaskItem, 'id' | 'created_at'>>) => {
      const prev = tasks.find((t) => t.id === id);
      if (!prev) return;

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

      setTasks((current) => current.filter((t) => t.id !== id));

      if (isLoggedIn) {
        setIsSaving(true);
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        setIsSaving(false);

        if (error) {
          setTasks((current) => [prev, ...current]);
        }
      } else {
        const updated = tasks.filter((t) => t.id !== id);
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn, tasks]
  );

  const reorderTasks = useCallback(
    async (reordered: TaskItem[]) => {
      const updated = reordered.map((t, i) => ({ ...t, sort_order: i }));
      setTasks(updated);

      if (isLoggedIn) {
        setIsSaving(true);
        // Batch update sort_order for all reordered tasks
        const promises = updated.map((t) =>
          supabase
            .from('tasks')
            .update({ sort_order: t.sort_order } as any)
            .eq('id', t.id)
        );
        await Promise.all(promises);
        setIsSaving(false);
      } else {
        writeGuestTasks(updated);
      }
    },
    [isLoggedIn]
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
    reorderTasks,
  };
}
