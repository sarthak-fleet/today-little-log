import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Json } from '@/integrations/supabase/types';

export interface TimeBlock {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  color: string;
}

const STORAGE_KEY = 'schedule-blocks';

export function useSchedule() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // Save to database
  const saveToDb = useCallback(async (blocksToSave: TimeBlock[]) => {
    if (!user) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('schedules')
      .upsert(
        { user_id: user.id, blocks: blocksToSave as unknown as Json },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Failed to save schedule:', error);
    }
    setIsSaving(false);
  }, [user]);

  // Load schedule from DB or localStorage
  const loadSchedule = useCallback(async () => {
    if (user) {
      // Load from database
      const { data, error } = await supabase
        .from('schedules')
        .select('blocks')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load schedule:', error);
      } else if (data) {
        setBlocks((data.blocks as unknown as TimeBlock[]) || []);
      } else {
        // No schedule in DB, check localStorage for migration
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const localBlocks = JSON.parse(saved) as TimeBlock[];
          setBlocks(localBlocks);
          // Migrate to DB
          await saveToDb(localBlocks);
        }
      }
    } else {
      // Not logged in, use localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      setBlocks(saved ? JSON.parse(saved) : []);
    }
    setIsLoaded(true);
  }, [user, saveToDb]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Update blocks and persist
  const updateBlocks = useCallback(async (newBlocks: TimeBlock[]) => {
    setBlocks(newBlocks);
    
    if (user) {
      await saveToDb(newBlocks);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBlocks));
    }
  }, [user, saveToDb]);

  const clearAll = useCallback(async () => {
    await updateBlocks([]);
  }, [updateBlocks]);

  return {
    blocks,
    isLoaded,
    isSaving,
    isLoggedIn: !!user,
    updateBlocks,
    clearAll,
  };
}
