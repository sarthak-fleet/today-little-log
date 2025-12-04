import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type EntryType = 'daily' | 'weekly' | 'monthly';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  entry_type: EntryType;
  created_at: string;
  updated_at: string;
}

export function useJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoaded(true);
      return;
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to fetch entries:', error);
    } else {
      setEntries((data as JournalEntry[]) || []);
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const getTodayKey = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getWeekKey = () => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    return sunday.toISOString().split('T')[0];
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

  const saveEntry = async (content: string, date?: string, entryType: EntryType = 'daily') => {
    if (!user) return;

    let targetDate = date;
    if (!targetDate) {
      if (entryType === 'weekly') {
        targetDate = getWeekKey();
      } else if (entryType === 'monthly') {
        targetDate = getMonthKey();
      } else {
        targetDate = getTodayKey();
      }
    }

    const existingEntry = entries.find(e => e.date === targetDate && e.entry_type === entryType);

    if (existingEntry) {
      const { error } = await supabase
        .from('journal_entries')
        .update({ content })
        .eq('id', existingEntry.id);

      if (error) {
        console.error('Failed to update entry:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          date: targetDate,
          content,
          entry_type: entryType,
        });

      if (error) {
        console.error('Failed to create entry:', error);
        return;
      }
    }

    await fetchEntries();
  };

  const updateEntry = async (id: string, content: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('journal_entries')
      .update({ content })
      .eq('id', id);

    if (error) {
      console.error('Failed to update entry:', error);
      return;
    }

    await fetchEntries();
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete entry:', error);
      return;
    }

    await fetchEntries();
  };

  const getRecentEntries = (count: number = 10): JournalEntry[] => {
    const todayKey = getTodayKey();
    return entries
      .filter(entry => !(entry.date === todayKey && entry.entry_type === 'daily'))
      .slice(0, count);
  };

  return {
    entries,
    isLoaded,
    getTodayEntry,
    getWeeklyEntry,
    getMonthlyEntry,
    getRecentEntries,
    saveEntry,
    updateEntry,
    deleteEntry,
    getTodayKey,
    isSunday,
    isLastDayOfMonth,
  };
}
