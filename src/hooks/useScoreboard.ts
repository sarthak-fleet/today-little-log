import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export type ScoreKind = 'check' | 'output';

export interface ScoreboardItem {
  id: string;
  label: string;
  kind: ScoreKind;
  position: number;
  archived: boolean;
}

export interface ScoreboardLog {
  id: string;
  item_id: string;
  date: string;
  value_bool: boolean;
  value_text: string | null;
}

const ITEMS_KEY = 'tll:guest-scoreboard-items';
const LOGS_KEY = 'tll:guest-scoreboard-logs';

function readGuest<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function writeGuest<T>(key: string, rows: T[]) {
  try { localStorage.setItem(key, JSON.stringify(rows)); } catch { /* ignore */ }
}

export function useScoreboard() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ScoreboardItem[]>([]);
  const [logs, setLogs] = useState<ScoreboardLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      Promise.all([
        apiFetch<ScoreboardItem[]>('/api/scoreboard-items').catch(() => []),
        apiFetch<ScoreboardLog[]>('/api/scoreboard-logs').catch(() => []),
      ]).then(([i, l]) => {
        setItems(i ?? []);
        setLogs(l ?? []);
      }).finally(() => setIsLoaded(true));
    } else {
      setItems(readGuest<ScoreboardItem>(ITEMS_KEY));
      setLogs(readGuest<ScoreboardLog>(LOGS_KEY));
      setIsLoaded(true);
    }
  }, [user, loading]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const activeItems = items.filter((i) => !i.archived).sort((a, b) => a.position - b.position);
  const todayLogs = logs.filter((l) => l.date === today);
  const logFor = (itemId: string): ScoreboardLog | undefined =>
    todayLogs.find((l) => l.item_id === itemId);

  const addItem = useCallback(async (label: string, kind: ScoreKind) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const position = items.length;
    if (user) {
      const created = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
        method: 'POST',
        body: JSON.stringify({ label: trimmed, kind, position }),
      });
      setItems((prev) => [...prev, created]);
    } else {
      const created: ScoreboardItem = {
        id: crypto.randomUUID(),
        label: trimmed, kind, position, archived: false,
      };
      setItems((prev) => {
        const next = [...prev, created];
        writeGuest(ITEMS_KEY, next);
        return next;
      });
    }
  }, [user, items.length]);

  const removeItem = useCallback(async (id: string) => {
    if (user) {
      await fetch(`/api/scoreboard-items?id=${encodeURIComponent(id)}`, {
        method: 'DELETE', credentials: 'include',
      });
    }
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (!user) writeGuest(ITEMS_KEY, next);
      return next;
    });
    setLogs((prev) => {
      const next = prev.filter((l) => l.item_id !== id);
      if (!user) writeGuest(LOGS_KEY, next);
      return next;
    });
  }, [user]);

  const renameItem = useCallback(async (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (user) {
      const updated = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
        method: 'POST',
        body: JSON.stringify({ id, label: trimmed }),
      });
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } else {
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, label: trimmed } : i));
        writeGuest(ITEMS_KEY, next);
        return next;
      });
    }
  }, [user]);

  const setLog = useCallback(async (itemId: string, patch: { value_bool?: boolean; value_text?: string | null }, date: string = today) => {
    if (user) {
      const saved = await apiFetch<ScoreboardLog>('/api/scoreboard-logs', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId, date, ...patch }),
      });
      setLogs((prev) => {
        const others = prev.filter((l) => !(l.item_id === itemId && l.date === date));
        return [saved, ...others];
      });
    } else {
      setLogs((prev) => {
        const others = prev.filter((l) => !(l.item_id === itemId && l.date === date));
        const existing = prev.find((l) => l.item_id === itemId && l.date === date);
        const merged: ScoreboardLog = {
          id: existing?.id ?? crypto.randomUUID(),
          item_id: itemId,
          date,
          value_bool: patch.value_bool ?? existing?.value_bool ?? false,
          value_text: patch.value_text ?? existing?.value_text ?? null,
        };
        const next = [merged, ...others];
        writeGuest(LOGS_KEY, next);
        return next;
      });
    }
  }, [user, today]);

  return {
    isLoaded,
    items: activeItems,
    logs,
    todayLogs,
    today,
    logFor,
    addItem,
    removeItem,
    renameItem,
    setLog,
  };
}
