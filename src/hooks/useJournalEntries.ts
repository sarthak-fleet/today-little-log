import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
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
      setEntries(data || []);
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const getTodayKey = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getTodayEntry = (): JournalEntry | undefined => {
    return entries.find(entry => entry.date === getTodayKey());
  };

  const saveEntry = async (content: string, date?: string) => {
    if (!user) return;

    const targetDate = date || getTodayKey();
    const existingEntry = entries.find(e => e.date === targetDate);

    if (existingEntry) {
      // Update existing entry
      const { error } = await supabase
        .from('journal_entries')
        .update({ content })
        .eq('id', existingEntry.id);

      if (error) {
        console.error('Failed to update entry:', error);
        return;
      }
    } else {
      // Create new entry
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          date: targetDate,
          content,
        });

      if (error) {
        console.error('Failed to create entry:', error);
        return;
      }
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
    return entries
      .filter(entry => entry.date !== getTodayKey())
      .slice(0, count);
  };

  return {
    entries,
    isLoaded,
    getTodayEntry,
    getRecentEntries,
    saveEntry,
    deleteEntry,
    getTodayKey,
  };
}
