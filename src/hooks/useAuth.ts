import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';
import { setCachedDob } from './useLifeMath';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  dob: string | null;
}

interface UseAuthOptions {
  includeProfile?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { includeProfile = false } = options;
  const { data: sessionData, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (sessionData?.user) {
      if (includeProfile) {
        fetchProfile();
      } else {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, [sessionData?.user?.id, includeProfile]);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch<Profile | null>('/api/profiles');
      setProfile(data);
      setCachedDob(data?.dob ?? null);
      window.dispatchEvent(new Event('tll:dob-changed'));
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const signOut = async () => {
    setCachedDob(null);
    window.dispatchEvent(new Event('tll:dob-changed'));
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
      setCachedDob(dob);
      window.dispatchEvent(new Event('tll:dob-changed'));
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
