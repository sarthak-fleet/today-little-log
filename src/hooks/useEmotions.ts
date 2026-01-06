import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Emotion {
  id: string;
  user_id: string;
  emotion: string;
  comment: string | null;
  logged_at: string;
  created_at: string;
}

const GUEST_STORAGE_KEY = 'guest_emotions';

export function useEmotions() {
  const { user } = useAuth();
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load emotions from localStorage for guests
  const loadGuestEmotions = useCallback(() => {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as Emotion[];
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  // Save emotions to localStorage for guests
  const saveGuestEmotions = useCallback((newEmotions: Emotion[]) => {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(newEmotions));
  }, []);

  // Fetch emotions from Supabase or localStorage
  useEffect(() => {
    const fetchEmotions = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('emotions')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch emotions:', error);
        } else {
          setEmotions(data || []);
        }
      } else {
        setEmotions(loadGuestEmotions());
      }
      setIsLoaded(true);
    };

    fetchEmotions();
  }, [user, loadGuestEmotions]);

  // Log a new emotion
  const logEmotion = async (emotion: string, comment?: string) => {
    const now = new Date().toISOString();
    
    if (user) {
      const { data, error } = await supabase
        .from('emotions')
        .insert({
          user_id: user.id,
          emotion,
          comment: comment || null,
          logged_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log emotion:', error);
        return null;
      }

      setEmotions(prev => [data, ...prev]);
      return data;
    } else {
      const newEmotion: Emotion = {
        id: crypto.randomUUID(),
        user_id: 'guest',
        emotion,
        comment: comment || null,
        logged_at: now,
        created_at: now,
      };

      const updated = [newEmotion, ...emotions];
      setEmotions(updated);
      saveGuestEmotions(updated);
      return newEmotion;
    }
  };

  // Delete an emotion
  const deleteEmotion = async (id: string) => {
    if (user) {
      const { error } = await supabase
        .from('emotions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete emotion:', error);
        return false;
      }
    }

    const updated = emotions.filter(e => e.id !== id);
    setEmotions(updated);
    if (!user) {
      saveGuestEmotions(updated);
    }
    return true;
  };

  // Get today's emotions
  const getTodayEmotions = useCallback(() => {
    const today = new Date().toDateString();
    return emotions.filter(e => new Date(e.logged_at).toDateString() === today);
  }, [emotions]);

  // Get last logged emotion
  const getLastEmotion = useCallback(() => {
    return emotions.length > 0 ? emotions[0] : null;
  }, [emotions]);

  return {
    emotions,
    isLoaded,
    logEmotion,
    deleteEmotion,
    getTodayEmotions,
    getLastEmotion,
  };
}

export const EMOTION_OPTIONS = [
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '😌', label: 'Calm', value: 'calm' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😔', label: 'Sad', value: 'sad' },
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '😴', label: 'Tired', value: 'tired' },
  { emoji: '🤩', label: 'Excited', value: 'excited' },
];
