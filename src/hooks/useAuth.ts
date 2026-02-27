import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { apiFetch } from '@/lib/api';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  dob: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch profile when user logs in
        if (session?.user) {
          setTimeout(() => {
            fetchProfile();
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch<Profile | null>('/api/profiles');
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateDob = async (dob: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      await apiFetch('/api/profiles', {
        method: 'PATCH',
        body: JSON.stringify({ dob }),
      });

      if (profile) {
        setProfile({ ...profile, dob });
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    updateDob,
  };
}
