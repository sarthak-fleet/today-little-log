import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  dob: string | null;
}

export function useAuth() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (sessionData?.user) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [sessionData?.user?.id]);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch<Profile | null>('/api/profiles');
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  const updateDob = async (dob: string) => {
    if (!sessionData?.user) return { error: new Error('Not authenticated') };

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
    user: sessionData?.user ?? null,
    session: sessionData?.session ?? null,
    profile,
    loading: isPending,
    signOut,
    updateDob,
  };
}
