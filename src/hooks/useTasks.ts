import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  estimate_minutes?: number;
  status: 'todo' | 'done';
  sort_order: number;
  created_at: string;
  quadrant?: 'q1' | 'q2' | 'q3' | 'q4' | null;
  mana_cost?: number | null;
}

const GUEST_TASKS_KEY = 'guest-tasks-data';

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  estimate_minutes: number | null;
  status: string;
  sort_order: number | null;
  created_at: string;
  quadrant?: string | null;
  mana_cost?: number | null;
}

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
        try {
          const data = await apiFetch<TaskRow[]>('/api/tasks');

          const mapped: TaskItem[] = data.map((t) => ({
            id: t.id,
            title: t.title,
            notes: t.notes ?? undefined,
            estimate_minutes: t.estimate_minutes ?? undefined,
            status: t.status as 'todo' | 'done',
            sort_order: t.sort_order ?? 0,
            created_at: t.created_at,
            quadrant: (t.quadrant ?? null) as TaskItem['quadrant'],
            mana_cost: t.mana_cost ?? null,
          }));
          setTasks(mapped);

          // Migrate guest tasks to DB on first signed-in load.
          const guestTasks = readGuestTasks();
          if (guestTasks.length > 0) {
            for (const task of guestTasks) {
              await apiFetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify({
                  id: task.id,
                  title: task.title,
                  notes: task.notes ?? null,
                  estimate_minutes: task.estimate_minutes ?? null,
                  status: task.status,
                  sort_order: task.sort_order,
                }),
              });
            }
            // Reload after migration
            const reloaded = await apiFetch<TaskRow[]>('/api/tasks');
            setTasks(
              reloaded.map((t) => ({
                id: t.id,
                title: t.title,
                notes: t.notes ?? undefined,
                estimate_minutes: t.estimate_minutes ?? undefined,
                status: t.status as 'todo' | 'done',
                sort_order: t.sort_order ?? 0,
                created_at: t.created_at,
                quadrant: (t.quadrant ?? null) as TaskItem['quadrant'],
                mana_cost: t.mana_cost ?? null,
              }))
            );
            localStorage.removeItem(GUEST_TASKS_KEY);
          }
        } catch {
          // Failed to load from API, leave tasks empty
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
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sort_order)) : 0;
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
        try {
          await apiFetch('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({
              id: newTask.id,
              title: newTask.title,
              notes: newTask.notes ?? null,
              estimate_minutes: newTask.estimate_minutes ?? null,
              status: newTask.status,
              sort_order: newTask.sort_order,
            }),
          });
        } catch {
          setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
        setIsSaving(false);
      } else {
        setTasks((prev) => {
          const next = [...prev, newTask];
          writeGuestTasks(next);
          return next;
        });
      }
    },
    [isLoggedIn, user, tasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<TaskItem, 'id' | 'created_at'>>) => {
      const prev = tasks.find((t) => t.id === id);
      if (!prev) return;

      setTasks((current) => current.map((t) => (t.id === id ? { ...t, ...updates } : t)));

      if (isLoggedIn) {
        setIsSaving(true);
        try {
          await apiFetch('/api/tasks', {
            method: 'PATCH',
            body: JSON.stringify({
              id,
              title: updates.title,
              notes: updates.notes ?? null,
              estimate_minutes: updates.estimate_minutes ?? null,
              status: updates.status,
            }),
          });
        } catch {
          setTasks((current) => current.map((t) => (t.id === id ? prev : t)));
        }
        setIsSaving(false);
      } else {
        setTasks((prev) => {
          const next = prev.map((task) => (task.id === id ? { ...task, ...updates } : task));
          writeGuestTasks(next);
          return next;
        });
      }
    },
    [isLoggedIn, tasks]
  );

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const newStatus: 'todo' | 'done' = task.status === 'done' ? 'todo' : 'done';

      setTasks((current) => current.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));

      if (isLoggedIn) {
        setIsSaving(true);
        try {
          await apiFetch('/api/tasks', {
            method: 'PATCH',
            body: JSON.stringify({ id, status: newStatus }),
          });
        } catch {
          setTasks((current) =>
            current.map((t) => (t.id === id ? { ...t, status: task.status } : t))
          );
        }
        setIsSaving(false);
      } else {
        setTasks((prev) => {
          const next = prev.map((task) => (task.id === id ? { ...task, status: newStatus } : task));
          writeGuestTasks(next);
          return next;
        });
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
        try {
          await apiFetch('/api/tasks', {
            method: 'DELETE',
            body: JSON.stringify({ id }),
          });
        } catch {
          setTasks((current) => [prev, ...current]);
        }
        setIsSaving(false);
      } else {
        setTasks((prev) => {
          const next = prev.filter((task) => task.id !== id);
          writeGuestTasks(next);
          return next;
        });
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
        await Promise.all(
          updated.map((t) =>
            apiFetch('/api/tasks', {
              method: 'PATCH',
              body: JSON.stringify({ id: t.id, sort_order: t.sort_order }),
            })
          )
        );
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
