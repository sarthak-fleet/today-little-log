import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { getMonthlyScoreboardConfig, type MonthlyScoreboardEntryConfig, type MonthlyScoreboardItemConfig } from '@/config/monthlyScoreboards';

export interface ScoreboardItem {
  id: string;
  label: string;
  kind: 'score' | 'check' | 'output';
  cadence: 'daily' | 'weekly' | 'monthly';
  category: 'daily' | 'weekly' | 'monthly' | 'not_to_do';
  score_month: string;
  source_key: string | null;
  min_score: number;
  max_score: number;
  ideal_score: number;
  criteria: string | null;
  position: number;
  archived: boolean;
}

export interface ScoreboardLog {
  id: string;
  item_id: string;
  date: string;
  value_bool: boolean;
  value_score: number | null;
  value_text: string | null;
}

export interface ScoreboardDayNote {
  id: string;
  score_month: string;
  date: string;
  low_score_reason: string | null;
}

export interface ScoreboardItemInput {
  label: string;
  maxScore: number;
  criteria?: string;
}

const ITEMS_KEY = 'tll:guest-scoreboard-items';
const LOGS_KEY = 'tll:guest-scoreboard-logs';
const LOCKS_KEY = 'tll:guest-scoreboard-locks';
const DAY_NOTES_KEY = 'tll:guest-scoreboard-day-notes';

function readGuest<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuest<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function readGuestLocks(): string[] {
  try {
    const raw = localStorage.getItem(LOCKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuestLocks(months: string[]) {
  try {
    localStorage.setItem(LOCKS_KEY, JSON.stringify(months));
  } catch {
    /* ignore */
  }
}

function normalizeItem(item: Partial<ScoreboardItem> & { id: string; label: string }): ScoreboardItem {
  return {
    id: item.id,
    label: item.label,
    kind: item.kind ?? 'score',
    cadence: item.cadence ?? 'daily',
    category: item.category ?? 'daily',
    score_month: item.score_month ?? '',
    source_key: item.source_key ?? null,
    min_score: Number(item.min_score ?? 0),
    max_score: Number(item.max_score ?? 1),
    ideal_score: Math.max(0, Number(item.ideal_score ?? item.max_score ?? 1)),
    criteria: item.criteria ?? null,
    position: Number(item.position ?? 0),
    archived: Boolean(item.archived),
  };
}

function normalizeLog(log: Partial<ScoreboardLog> & { id: string; item_id: string; date: string }): ScoreboardLog {
  return {
    id: log.id,
    item_id: log.item_id,
    date: log.date,
    value_bool: Boolean(log.value_bool),
    value_score: log.value_score === null || log.value_score === undefined ? null : Number(log.value_score),
    value_text: log.value_text ?? null,
  };
}

function normalizeDayNote(note: Partial<ScoreboardDayNote> & { id: string; date: string }): ScoreboardDayNote {
  return {
    id: note.id,
    score_month: note.score_month ?? note.date.slice(0, 7),
    date: note.date,
    low_score_reason: note.low_score_reason ?? null,
  };
}

function monthBounds(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  return {
    start: format(startOfMonth(firstDay), 'yyyy-MM-dd'),
    end: format(endOfMonth(firstDay), 'yyyy-MM-dd'),
  };
}

export function useScoreboard(month: string = format(new Date(), 'yyyy-MM')) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ScoreboardItem[]>([]);
  const [logs, setLogs] = useState<ScoreboardLog[]>([]);
  const [dayNotes, setDayNotes] = useState<ScoreboardDayNote[]>([]);
  const [lockedMonths, setLockedMonths] = useState<string[]>([]);
  const [storageMode, setStorageMode] = useState<'api' | 'guest'>('guest');
  const [isLoaded, setIsLoaded] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const { start: monthStart, end: monthEnd } = useMemo(() => monthBounds(month), [month]);
  const monthConfig = useMemo(() => getMonthlyScoreboardConfig(month), [month]);
  const trackingStartDate = monthConfig?.trackingStartDate ?? monthStart;
  const configuredKeys = useMemo(() => new Set(monthConfig?.items.map((item) => item.key) ?? []), [monthConfig]);
  const usingGuestStorage = !user || storageMode === 'guest';

  const loadGuestState = useCallback(() => {
    const nextItems = syncConfiguredItemsForGuest(
      readGuest<ScoreboardItem>(ITEMS_KEY).map(normalizeItem),
      monthConfig?.items ?? [],
      month,
    );
    const syncedGuest = syncConfiguredEntriesForGuest(
      nextItems,
      readGuest<ScoreboardLog>(LOGS_KEY).map(normalizeLog),
      readGuest<ScoreboardDayNote>(DAY_NOTES_KEY).map(normalizeDayNote),
      monthConfig?.seededEntries ?? [],
      month,
    );
    setItems(nextItems);
    setLogs(syncedGuest.logs);
    setDayNotes(syncedGuest.dayNotes);
    setLockedMonths(readGuestLocks());
    setStorageMode('guest');
  }, [month, monthConfig]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      Promise.all([
        apiFetch<ScoreboardItem[]>(`/api/scoreboard-items?month=${encodeURIComponent(month)}`).catch(() => []),
        apiFetch<ScoreboardLog[]>(`/api/scoreboard-logs?since=${monthStart}`).catch(() => []),
        apiFetch<ScoreboardDayNote[]>(`/api/scoreboard-day-notes?month=${encodeURIComponent(month)}`).catch(() => []),
        apiFetch<{ locked: boolean }>(`/api/scoreboard-locks?month=${encodeURIComponent(month)}`).catch(() => ({ locked: false })),
      ]).then(async ([nextItems, nextLogs, nextDayNotes, lock]) => {
        const syncedItems = await syncConfiguredItemsForUser(
          (nextItems ?? []).map(normalizeItem),
          monthConfig?.items ?? [],
          month,
          Boolean(lock.locked),
        );
        setItems(syncedItems);
        setLogs((nextLogs ?? []).map(normalizeLog).filter((log) => log.date >= monthStart && log.date <= monthEnd));
        setDayNotes((nextDayNotes ?? []).map(normalizeDayNote).filter((note) => note.date >= monthStart && note.date <= monthEnd));
        setStorageMode('api');
        setLockedMonths((prev) => {
          const rest = prev.filter((row) => row !== month);
          return lock.locked ? [...rest, month] : rest;
        });
      }).catch(() => {
        loadGuestState();
      }).finally(() => setIsLoaded(true));
      return;
    }

    loadGuestState();
    setIsLoaded(true);
  }, [user, loading, month, monthStart, monthEnd, monthConfig, loadGuestState]);

  const activeItems = items
    .filter((item) => !item.archived && item.score_month === month)
    .filter((item) => !monthConfig || (item.source_key !== null && configuredKeys.has(item.source_key)))
    .sort((a, b) => a.position - b.position);

  const monthLogs = logs.filter((log) => log.date >= monthStart && log.date <= monthEnd);
  const monthDayNotes = dayNotes.filter((note) => note.date >= monthStart && note.date <= monthEnd);
  const todayLogs = monthLogs.filter((log) => log.date === today);
  const isLocked = lockedMonths.includes(month);

  const logFor = useCallback((itemId: string, date: string = today): ScoreboardLog | undefined => (
    monthLogs.find((log) => log.item_id === itemId && log.date === date)
  ), [monthLogs, today]);

  const dayNoteFor = useCallback((date: string = today): ScoreboardDayNote | undefined => (
    monthDayNotes.find((note) => note.date === date)
  ), [monthDayNotes, today]);

  const addItem = useCallback(async ({ label, maxScore, criteria = '' }: ScoreboardItemInput) => {
    if (isLocked) return;
    const trimmed = label.trim();
    const boundedMax = Math.max(1, Math.round(Number(maxScore) || 1));
    if (!trimmed) return;
    const position = activeItems.length ? Math.max(...activeItems.map((item) => item.position)) + 1 : 0;

    if (!usingGuestStorage) {
      const created = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
        method: 'POST',
        body: JSON.stringify({
          label: trimmed,
          kind: 'score',
          score_month: month,
          max_score: boundedMax,
          criteria: criteria.trim() || null,
          position,
        }),
      });
      setItems((prev) => [...prev, normalizeItem(created)]);
      return;
    }

    const created: ScoreboardItem = {
      id: crypto.randomUUID(),
      label: trimmed,
      kind: 'score',
      cadence: 'daily',
      category: 'daily',
      score_month: month,
      source_key: null,
      min_score: 0,
      max_score: boundedMax,
      ideal_score: boundedMax,
      criteria: criteria.trim() || null,
      position,
      archived: false,
    };
    setItems((prev) => {
      const next = [...prev, created];
      writeGuest(ITEMS_KEY, next);
      return next;
    });
  }, [activeItems, isLocked, month, usingGuestStorage]);

  const updateItem = useCallback(async (
    id: string,
    patch: Partial<Pick<ScoreboardItem, 'label' | 'max_score' | 'criteria' | 'archived'>>,
  ) => {
    if (isLocked) return;
    const updates = {
      ...patch,
      label: patch.label?.trim(),
      max_score: patch.max_score === undefined ? undefined : Math.max(1, Math.round(Number(patch.max_score) || 1)),
      criteria: patch.criteria === undefined ? undefined : patch.criteria?.trim() || null,
    };

    if (!usingGuestStorage) {
      const updated = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
        method: 'POST',
        body: JSON.stringify({ id, ...updates }),
      });
      setItems((prev) => prev.map((item) => (item.id === id ? normalizeItem(updated) : item)));
      return;
    }

    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? normalizeItem({ ...item, ...updates }) : item));
      writeGuest(ITEMS_KEY, next);
      return next;
    });
  }, [isLocked, usingGuestStorage]);

  const removeItem = useCallback(async (id: string) => {
    if (isLocked) return;
    if (!usingGuestStorage) {
      await fetch(`/api/scoreboard-items?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (usingGuestStorage) writeGuest(ITEMS_KEY, next);
      return next;
    });
    setLogs((prev) => {
      const next = prev.filter((log) => log.item_id !== id);
      if (usingGuestStorage) writeGuest(LOGS_KEY, next);
      return next;
    });
  }, [isLocked, usingGuestStorage]);

  const setLog = useCallback(async (
    itemId: string,
    patch: { value_score?: number | null; value_text?: string | null },
    date: string = today,
  ) => {
    if (isLocked) return;
    const item = activeItems.find((row) => row.id === itemId);
    const rawScore = patch.value_score;
    const score = rawScore === undefined || rawScore === null
      ? rawScore
      : Math.max(item?.min_score ?? 0, Math.min(item?.max_score ?? Number.MAX_SAFE_INTEGER, Math.round(Number(rawScore) || 0)));
    const body = {
      item_id: itemId,
      date,
      value_score: score,
      value_text: patch.value_text,
    };

    if (!usingGuestStorage) {
      const saved = await apiFetch<ScoreboardLog>('/api/scoreboard-logs', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setLogs((prev) => {
        const others = prev.filter((log) => !(log.item_id === itemId && log.date === date));
        return [normalizeLog(saved), ...others];
      });
      return;
    }

    setLogs((prev) => {
      const others = prev.filter((log) => !(log.item_id === itemId && log.date === date));
      const existing = prev.find((log) => log.item_id === itemId && log.date === date);
      const merged: ScoreboardLog = {
        id: existing?.id ?? crypto.randomUUID(),
        item_id: itemId,
        date,
        value_bool: (score ?? existing?.value_score ?? 0) > 0,
        value_score: score ?? existing?.value_score ?? null,
        value_text: patch.value_text ?? existing?.value_text ?? null,
      };
      const next = [merged, ...others];
      writeGuest(LOGS_KEY, next);
      return next;
    });
  }, [activeItems, isLocked, today, usingGuestStorage]);

  const setLowScoreReason = useCallback(async (reason: string, date: string = today) => {
    if (isLocked) return;
    const body = {
      score_month: month,
      date,
      low_score_reason: reason,
    };

    if (!usingGuestStorage) {
      const saved = await apiFetch<ScoreboardDayNote>('/api/scoreboard-day-notes', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setDayNotes((prev) => {
        const others = prev.filter((note) => note.date !== date);
        return [normalizeDayNote(saved), ...others];
      });
      return;
    }

    setDayNotes((prev) => {
      const others = prev.filter((note) => note.date !== date);
      const existing = prev.find((note) => note.date === date);
      const merged: ScoreboardDayNote = {
        id: existing?.id ?? crypto.randomUUID(),
        score_month: month,
        date,
        low_score_reason: reason.trim() ? reason : null,
      };
      const next = [merged, ...others];
      writeGuest(DAY_NOTES_KEY, next);
      return next;
    });
  }, [isLocked, month, today, usingGuestStorage]);

  const lockMonth = useCallback(async () => {
    if (isLocked) return;
    if (!usingGuestStorage) {
      await apiFetch('/api/scoreboard-locks', {
        method: 'POST',
        body: JSON.stringify({ score_month: month }),
      });
      setLockedMonths((prev) => (prev.includes(month) ? prev : [...prev, month]));
      return;
    }

    setLockedMonths((prev) => {
      const next = prev.includes(month) ? prev : [...prev, month];
      writeGuestLocks(next);
      return next;
    });
  }, [isLocked, month, usingGuestStorage]);

  return {
    isLoaded,
    items: activeItems,
    logs: monthLogs,
    dayNotes: monthDayNotes,
    todayLogs,
    today,
    month,
    monthStart,
    monthEnd,
    trackingStartDate,
    isLocked,
    isConfigured: Boolean(monthConfig),
    logFor,
    dayNoteFor,
    addItem,
    updateItem,
    removeItem,
    setLog,
    setLowScoreReason,
    lockMonth,
  };
}

async function syncConfiguredItemsForUser(
  existingItems: ScoreboardItem[],
  configuredItems: MonthlyScoreboardItemConfig[],
  month: string,
  locked: boolean,
): Promise<ScoreboardItem[]> {
  if (locked || configuredItems.length === 0) return existingItems;

  const nextItems = [...existingItems];
  for (const [index, configItem] of configuredItems.entries()) {
    const matchIndex = nextItems.findIndex((item) => item.score_month === month && item.source_key === configItem.key);
    const existing = matchIndex >= 0 ? nextItems[matchIndex] : null;
    const payload = configuredItemPayload(configItem, month, index);

    if (!existing) {
      const created = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      nextItems.push(normalizeItem(created));
      continue;
    }

    const differs = existing.label !== payload.label
      || existing.min_score !== payload.min_score
      || existing.max_score !== payload.max_score
      || existing.ideal_score !== payload.ideal_score
      || (existing.criteria ?? '') !== payload.criteria
      || existing.position !== payload.position
      || existing.archived;
    if (!differs) continue;

    const updated = await apiFetch<ScoreboardItem>('/api/scoreboard-items', {
      method: 'POST',
      body: JSON.stringify({ id: existing.id, ...payload }),
    });
    nextItems[matchIndex] = normalizeItem(updated);
  }

  return nextItems;
}

function syncConfiguredItemsForGuest(
  existingItems: ScoreboardItem[],
  configuredItems: MonthlyScoreboardItemConfig[],
  month: string,
): ScoreboardItem[] {
  if (configuredItems.length === 0) return existingItems;

  const nextItems = [...existingItems];
  let changed = false;
  for (const [index, configItem] of configuredItems.entries()) {
    const id = `configured-${month}-${configItem.key}`;
    const matchIndex = nextItems.findIndex((item) => item.id === id || (item.score_month === month && item.source_key === configItem.key));
    const payload = configuredItemPayload(configItem, month, index);
    const item: ScoreboardItem = {
      id,
      label: payload.label,
      kind: 'score',
      cadence: 'daily',
      category: 'daily',
      score_month: month,
      source_key: payload.source_key,
      min_score: payload.min_score,
      max_score: payload.max_score,
      ideal_score: payload.ideal_score,
      criteria: payload.criteria,
      position: payload.position,
      archived: false,
    };

    if (matchIndex >= 0) {
      const existing = nextItems[matchIndex];
      if (
        existing.label !== item.label
        || existing.min_score !== item.min_score
        || existing.max_score !== item.max_score
        || existing.ideal_score !== item.ideal_score
        || existing.criteria !== item.criteria
        || existing.position !== item.position
        || existing.archived
      ) {
        nextItems[matchIndex] = { ...existing, ...item };
        changed = true;
      }
      continue;
    }

    nextItems.push(item);
    changed = true;
  }

  if (changed) writeGuest(ITEMS_KEY, nextItems);
  return nextItems;
}

function configuredItemPayload(configItem: MonthlyScoreboardItemConfig, month: string, index: number) {
  return {
    label: configItem.label,
    kind: 'score',
    score_month: month,
    source_key: configItem.key,
    min_score: Math.round(configItem.minScore ?? 0),
    max_score: Math.round(configItem.maxScore),
    ideal_score: Math.max(0, Math.round(configItem.idealScore)),
    criteria: configItem.criteria,
    position: index,
    archived: false,
  };
}

function syncConfiguredEntriesForGuest(
  items: ScoreboardItem[],
  existingLogs: ScoreboardLog[],
  existingDayNotes: ScoreboardDayNote[],
  configuredEntries: MonthlyScoreboardEntryConfig[],
  month: string,
) {
  if (configuredEntries.length === 0) {
    return { logs: existingLogs, dayNotes: existingDayNotes };
  }

  const itemBySourceKey = new Map(
    items
      .filter((item) => item.score_month === month && item.source_key)
      .map((item) => [item.source_key as string, item]),
  );

  let logsChanged = false;
  const nextLogs = [...existingLogs];

  for (const entry of configuredEntries) {
    for (const configuredLog of entry.logs) {
      const item = itemBySourceKey.get(configuredLog.sourceKey);
      if (!item) continue;

      const nextLog: ScoreboardLog = {
        id: `configured-log-${month}-${entry.date}-${configuredLog.sourceKey}`,
        item_id: item.id,
        date: entry.date,
        value_bool: configuredLog.valueScore > 0,
        value_score: configuredLog.valueScore,
        value_text: configuredLog.valueText ?? null,
      };

      const existingIndex = nextLogs.findIndex((log) => log.item_id === item.id && log.date === entry.date);
      if (existingIndex >= 0) {
        const existing = nextLogs[existingIndex];
        if (
          existing.value_bool !== nextLog.value_bool
          || existing.value_score !== nextLog.value_score
          || existing.value_text !== nextLog.value_text
        ) {
          nextLogs[existingIndex] = nextLog;
          logsChanged = true;
        }
        continue;
      }

      nextLogs.push(nextLog);
      logsChanged = true;
    }
  }

  let dayNotesChanged = false;
  const nextDayNotes = [...existingDayNotes];

  for (const entry of configuredEntries) {
    if (entry.lowScoreReason === undefined) continue;

    const nextDayNote: ScoreboardDayNote = {
      id: `configured-note-${month}-${entry.date}`,
      score_month: month,
      date: entry.date,
      low_score_reason: entry.lowScoreReason || null,
    };

    const existingIndex = nextDayNotes.findIndex((note) => note.date === entry.date);
    if (existingIndex >= 0) {
      const existing = nextDayNotes[existingIndex];
      if (
        existing.score_month !== nextDayNote.score_month
        || existing.low_score_reason !== nextDayNote.low_score_reason
      ) {
        nextDayNotes[existingIndex] = nextDayNote;
        dayNotesChanged = true;
      }
      continue;
    }

    nextDayNotes.push(nextDayNote);
    dayNotesChanged = true;
  }

  if (logsChanged) writeGuest(LOGS_KEY, nextLogs);
  if (dayNotesChanged) writeGuest(DAY_NOTES_KEY, nextDayNotes);

  return {
    logs: nextLogs,
    dayNotes: nextDayNotes,
  };
}
