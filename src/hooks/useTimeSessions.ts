import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TimeSession {
  id: string;
  reference_type: 'task' | 'habit';
  reference_id: string;
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
  notes?: string;
  project_id?: string;
  created_at: string;
}

const GUEST_SESSIONS_KEY = 'guest-time-sessions';

const readGuestSessions = (): TimeSession[] => {
  try {
    const raw = localStorage.getItem(GUEST_SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TimeSession[];
  } catch {
    return [];
  }
};

const writeGuestSessions = (sessions: TimeSession[]) => {
  localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
};

export function useTimeSessions() {
  const { user, loading: authLoading } = useAuth();
  const isLoggedIn = !!user;

  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load sessions
  useEffect(() => {
    if (authLoading) return;

    const loadSessions = async () => {
      if (isLoggedIn) {
        const { data, error } = await supabase
          .from('time_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          setSessions(
            data.map((s) => ({
              id: s.id,
              reference_type: s.reference_type as 'task' | 'habit',
              reference_id: s.reference_id,
              duration_seconds: s.duration_seconds,
              started_at: s.started_at,
              ended_at: s.ended_at ?? undefined,
              notes: s.notes ?? undefined,
              created_at: s.created_at,
            }))
          );
        }
      } else {
        setSessions(readGuestSessions());
      }
      setIsLoaded(true);
    };

    loadSessions();
  }, [authLoading, isLoggedIn]);

  const logSession = useCallback(
    async (payload: {
      reference_type: 'task' | 'habit';
      reference_id: string;
      duration_seconds: number;
      started_at: string;
      ended_at?: string;
      notes?: string;
      project_id?: string;
    }) => {
      const newSession: TimeSession = {
        id: crypto.randomUUID(),
        reference_type: payload.reference_type,
        reference_id: payload.reference_id,
        duration_seconds: payload.duration_seconds,
        started_at: payload.started_at,
        ended_at: payload.ended_at,
        notes: payload.notes,
        project_id: payload.project_id,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setSessions((prev) => [newSession, ...prev]);

      if (isLoggedIn && user) {
        setIsSaving(true);
        const { error } = await supabase.from('time_sessions').insert({
          id: newSession.id,
          user_id: user.id,
          reference_type: newSession.reference_type,
          reference_id: newSession.reference_id,
          duration_seconds: newSession.duration_seconds,
          started_at: newSession.started_at,
          ended_at: newSession.ended_at ?? null,
          notes: newSession.notes ?? null,
          project_id: newSession.project_id ?? null,
        });
        setIsSaving(false);

        if (error) {
          setSessions((prev) => prev.filter((s) => s.id !== newSession.id));
        }
      } else {
        const updated = [newSession, ...sessions];
        writeGuestSessions(updated);
      }
    },
    [isLoggedIn, user, sessions]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const prev = sessions.find((s) => s.id === id);
      if (!prev) return;

      setSessions((current) => current.filter((s) => s.id !== id));

      if (isLoggedIn) {
        setIsSaving(true);
        const { error } = await supabase.from('time_sessions').delete().eq('id', id);
        setIsSaving(false);

        if (error) {
          setSessions((current) => [prev, ...current]);
        }
      } else {
        const updated = sessions.filter((s) => s.id !== id);
        writeGuestSessions(updated);
      }
    },
    [isLoggedIn, sessions]
  );

  const getTodaySessions = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter((s) => s.started_at.startsWith(today));
  }, [sessions]);

  const getTotalTimeToday = useCallback(() => {
    return getTodaySessions().reduce((acc, s) => acc + s.duration_seconds, 0);
  }, [getTodaySessions]);

  return {
    sessions,
    isLoaded,
    isSaving,
    isLoggedIn,
    logSession,
    deleteSession,
    getTodaySessions,
    getTotalTimeToday,
  };
}
