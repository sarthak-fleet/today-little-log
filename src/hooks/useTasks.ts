import { useCallback, useEffect, useState } from 'react';

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  estimate_minutes?: number;
  status: 'todo' | 'done';
  created_at: string;
}

const TASKS_STORAGE_KEY = 'tasks-data';

const readTasks = (): TaskItem[] => {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TaskItem[];
  } catch {
    return [];
  }
};

const writeTasks = (tasks: TaskItem[]) => {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
};

export function useTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = readTasks();
    setTasks(stored);
    setIsLoaded(true);
  }, []);

  const addTask = useCallback(
    (payload: { title: string; notes?: string; estimate_minutes?: number }) => {
      const newTask: TaskItem = {
        id: crypto.randomUUID(),
        title: payload.title,
        notes: payload.notes,
        estimate_minutes: payload.estimate_minutes,
        status: 'todo',
        created_at: new Date().toISOString(),
      };
      const next = [newTask, ...tasks];
      setTasks(next);
      writeTasks(next);
    },
    [tasks],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<TaskItem, 'id' | 'created_at'>>) => {
      const next = tasks.map((task) => (task.id === id ? { ...task, ...updates } : task));
      setTasks(next);
      writeTasks(next);
    },
    [tasks],
  );

  const toggleTask = useCallback(
    (id: string) => {
      const next = tasks.map((task) =>
        task.id === id 
          ? { ...task, status: (task.status === 'done' ? 'todo' : 'done') as 'todo' | 'done' } 
          : task,
      );
      setTasks(next);
      writeTasks(next);
    },
    [tasks],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const next = tasks.filter((task) => task.id !== id);
      setTasks(next);
      writeTasks(next);
    },
    [tasks],
  );

  return {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  };
}
