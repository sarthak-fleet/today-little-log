import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';

export type EntryType = 'daily' | 'weekly' | 'monthly' | 'next_week';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  entry_type: EntryType;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'journal-entries-data';

export function useJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const fetchEntries = useCallback(async (loadMore = false) => {
    if (user) {
      const currentOffset = loadMore ? entries.length : 0;

      try {
        const result = await apiFetch<{ data: JournalEntry[], hasMore: boolean }>(
          '/api/journal-entries?offset=' + currentOffset + '&limit=' + PAGE_SIZE
        );

        const newEntries = result.data || [];
        if (loadMore) {
          setEntries(prev => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
        }
        setHasMore(Boolean(result.hasMore));

        // Check for local storage migration (only on initial load)
        if (!loadMore) {
          const savedEntries = localStorage.getItem(STORAGE_KEY);
          if (savedEntries && newEntries.length === 0) {
            const localEntries = JSON.parse(savedEntries) as JournalEntry[];
            for (const entry of localEntries) {
              await apiFetch('/api/journal-entries', {
                method: 'POST',
                body: JSON.stringify({
                  date: entry.date,
                  content: entry.content,
                  entry_type: entry.entry_type,
                }),
              });
            }
            // Reload after migration
            const reloaded = await apiFetch<{ data: JournalEntry[], hasMore: boolean }>(
              '/api/journal-entries?offset=0&limit=' + PAGE_SIZE
            );
            if (reloaded.data) {
              setEntries(reloaded.data);
              setHasMore(Boolean(reloaded.hasMore));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch entries:', error);
      }
    } else {
      // Guest mode - use localStorage
      const savedEntries = localStorage.getItem(STORAGE_KEY);
      setEntries(savedEntries ? JSON.parse(savedEntries) : []);
      setHasMore(false);
    }
    setIsLoaded(true);
  }, [user, entries.length]);

  useEffect(() => {
    fetchEntries(false);
  }, [user]);

  const getTodayKey = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getWeekKey = () => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    return sunday.toISOString().split('T')[0];
  };

  const getNextWeekKey = () => {
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() - today.getDay() + 7);
    return nextSunday.toISOString().split('T')[0];
  };

  const getMonthKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const isSunday = () => new Date().getDay() === 0;

  const isLastDayOfMonth = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.getDate() === 1;
  };

  const getTodayEntry = (): JournalEntry | undefined => {
    return entries.find(entry => entry.date === getTodayKey() && entry.entry_type === 'daily');
  };

  const getWeeklyEntry = (): JournalEntry | undefined => {
    return entries.find(entry => entry.date === getWeekKey() && entry.entry_type === 'weekly');
  };

  const getMonthlyEntry = (): JournalEntry | undefined => {
    return entries.find(entry => entry.date === getMonthKey() && entry.entry_type === 'monthly');
  };

  const getNextWeekPlanEntry = (): JournalEntry | undefined => {
    return entries.find(entry => entry.date === getNextWeekKey() && entry.entry_type === 'next_week');
  };

  const saveEntry = async (content: string, date?: string, entryType: EntryType = 'daily') => {
    setIsSaving(true);

    let targetDate = date;
    if (!targetDate) {
      if (entryType === 'weekly') {
        targetDate = getWeekKey();
      } else if (entryType === 'monthly') {
        targetDate = getMonthKey();
      } else if (entryType === 'next_week') {
        targetDate = getNextWeekKey();
      } else {
        targetDate = getTodayKey();
      }
    }

    const existingEntry = entries.find(e => e.date === targetDate && e.entry_type === entryType);

    if (user) {
      try {
        if (existingEntry) {
          await apiFetch('/api/journal-entries', {
            method: 'PATCH',
            body: JSON.stringify({ id: existingEntry.id, content }),
          });
        } else {
          await apiFetch('/api/journal-entries', {
            method: 'POST',
            body: JSON.stringify({
              date: targetDate,
              content,
              entry_type: entryType,
            }),
          });
        }
        await fetchEntries(false);
      } catch (error) {
        console.error('Failed to save entry:', error);
        setIsSaving(false);
        return;
      }
    } else {
      // Guest mode
      let newEntries: JournalEntry[];
      if (existingEntry) {
        newEntries = entries.map(e =>
          e.id === existingEntry.id
            ? { ...e, content, updated_at: new Date().toISOString() }
            : e
        );
      } else {
        const newEntry: JournalEntry = {
          id: crypto.randomUUID(),
          date: targetDate,
          content,
          entry_type: entryType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newEntries = [newEntry, ...entries];
      }
      setEntries(newEntries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    }

    setIsSaving(false);
  };

  const updateEntry = async (id: string, content: string) => {
    setIsSaving(true);

    if (user) {
      try {
        await apiFetch('/api/journal-entries', {
          method: 'PATCH',
          body: JSON.stringify({ id, content }),
        });
        await fetchEntries(false);
      } catch (error) {
        console.error('Failed to update entry:', error);
        setIsSaving(false);
        return;
      }
    } else {
      const newEntries = entries.map(e =>
        e.id === id ? { ...e, content, updated_at: new Date().toISOString() } : e
      );
      setEntries(newEntries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    }

    setIsSaving(false);
  };

  const deleteEntry = async (id: string) => {
    setIsSaving(true);

    if (user) {
      try {
        await apiFetch('/api/journal-entries', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });
        await fetchEntries(false);
      } catch (error) {
        console.error('Failed to delete entry:', error);
        setIsSaving(false);
        return;
      }
    } else {
      const newEntries = entries.filter(e => e.id !== id);
      setEntries(newEntries);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    }

    setIsSaving(false);
  };

  const getRecentEntries = (count: number = 10): JournalEntry[] => {
    const todayKey = getTodayKey();
    return entries
      .filter(entry => !(entry.date === todayKey && entry.entry_type === 'daily'))
      .slice(0, count);
  };

  const loadMore = () => {
    if (hasMore && isLoaded) {
      fetchEntries(true);
    }
  };

  return {
    entries,
    isLoaded,
    isSaving,
    isLoggedIn: !!user,
    hasMore,
    loadMore,
    getTodayEntry,
    getWeeklyEntry,
    getMonthlyEntry,
    getNextWeekPlanEntry,
    getRecentEntries,
    saveEntry,
    updateEntry,
    deleteEntry,
    getTodayKey,
    getNextWeekKey,
    isSunday,
    isLastDayOfMonth,
  };
}
