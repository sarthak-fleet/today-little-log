import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { format } from 'date-fns';
import {
  cadenceFromCategory,
  categoryFromPosition,
  defaultScoreboardItems,
  scoreCategoryBasePosition,
  type ScoreCadence,
  type ScoreCategory,
  type ScoreKind,
} from '@/lib/scoreboardDefaults';

export interface ScoreboardItem {
  id: string;
  label: string;
  kind: ScoreKind;
  cadence: ScoreCadence;
  category: ScoreCategory;
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
const defaultItemByLabel = new Map(defaultScoreboardItems.map((item) => [item.label.toLowerCase(), item]));

function normalizeItem(item: ScoreboardItem): ScoreboardItem {
  const defaultItem = defaultItemByLabel.get(item.label.trim().toLowerCase());
  const category = item.category ?? defaultItem?.category ?? categoryFromPosition(item.position ?? 0);
  const cadence = item.cadence ?? defaultItem?.cadence ?? cadenceFromCategory(category);
  return {
    ...item,
    kind: defaultItem?.kind ?? item.kind,
    cadence,
    category,
  };
}

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
        setItems((i ?? []).map(normalizeItem));
        setLogs(l ?? []);
      }).finally(() => setIsLoaded(true));
    } else {
      setItems(readGuest<ScoreboardItem>(ITEMS_KEY).map(normalizeItem));
      setLogs(readGuest<ScoreboardLog>(LOGS_KEY));
      setIsLoaded(true);
    }
  }, [user, loading]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const activeItems = items.filter((i) => !i.archived).sort((a, b) => a.position - b.position);
  const todayLogs = logs.filter((l) => l.date === today);
  const logFor = (itemId: string): ScoreboardLog | undefined =>
    todayLogs.find((l) => l.item_id === itemId);

  const addItem = useCallback(async (
    label: string,
    kind: ScoreKind,
    cadence: ScoreCadence = 'daily',
    category: ScoreCategory = cadence,
  ) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const position = nextPositionForCategory(items, category);
    if (user) {
      const created = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
        method: 'POST',
        body: JSON.stringify({ label: trimmed, kind, position }),
      });
      setItems((prev) => [...prev, normalizeItem({ ...created, cadence, category })]);
    } else {
      const created: ScoreboardItem = {
        id: crypto.randomUUID(),
        label: trimmed, kind, cadence, category, position, archived: false,
      };
      setItems((prev) => {
        const next = [...prev, created];
        writeGuest(ITEMS_KEY, next);
        return next;
      });
    }
  }, [user, items]);

  const seedDefaults = useCallback(async () => {
    if (items.length > 0) return;

    if (user) {
      const created = await Promise.all(defaultScoreboardItems.map((item) => (
        apiFetch<ScoreboardItem>('/api/scoreboard-items', {
          method: 'POST',
          body: JSON.stringify({
            label: item.label,
            kind: item.kind,
            position: item.position,
          }),
        })
      )));
      setItems(created.map((item) => normalizeItem(item)));
      return;
    }

    const created = defaultScoreboardItems.map((item) => ({
      id: crypto.randomUUID(),
      ...item,
      archived: false,
    }));
    setItems(created);
    writeGuest(ITEMS_KEY, created);
  }, [items.length, user]);

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
      setItems((prev) => prev.map((i) => (i.id === id ? normalizeItem({ ...updated, cadence: i.cadence, category: i.category }) : i)));
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
    seedDefaults,
    removeItem,
    renameItem,
    setLog,
  };
}

function nextPositionForCategory(items: ScoreboardItem[], category: ScoreCategory): number {
  const base = scoreCategoryBasePosition[category];
  const groupPositions = items
    .map(normalizeItem)
    .filter((item) => item.category === category)
    .map((item) => item.position);
  if (groupPositions.length === 0) return base;
  return Math.max(base, ...groupPositions) + 1;
}
