import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LifeRule {
  id: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'life-rules-data';

export const useLifeRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<LifeRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);

    if (user) {
      try {
        const data = await apiFetch<LifeRule[]>('/api/life-rules');
        setRules(data || []);

        // Check for local storage migration
        const savedRules = localStorage.getItem(STORAGE_KEY);
        if (savedRules && (!data || data.length === 0)) {
          const localRules = JSON.parse(savedRules) as LifeRule[];
          for (const rule of localRules) {
            await apiFetch('/api/life-rules', {
              method: 'POST',
              body: JSON.stringify({
                content: rule.content,
                position: rule.position,
              }),
            });
          }
          // Reload after migration
          const reloadedRules = await apiFetch<LifeRule[]>('/api/life-rules');
          if (reloadedRules) {
            setRules(reloadedRules);
          }
        }
      } catch (error) {
        console.error('Error fetching rules:', error);
        toast.error('Failed to load rules');
      }
    } else {
      // Guest mode - use localStorage
      const savedRules = localStorage.getItem(STORAGE_KEY);
      setRules(savedRules ? JSON.parse(savedRules) : []);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = async (content: string) => {
    setIsSaving(true);
    const newPosition = rules.length;

    if (user) {
      try {
        const data = await apiFetch<LifeRule>('/api/life-rules', {
          method: 'POST',
          body: JSON.stringify({ content, position: newPosition }),
        });

        if (data) {
          setRules([...rules, data]);
          toast.success('Rule added');
        }
      } catch (error) {
        console.error('Error adding rule:', error);
        toast.error('Failed to add rule');
      }
    } else {
      const newRule: LifeRule = {
        id: crypto.randomUUID(),
        content,
        position: newPosition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newRules = [...rules, newRule];
      setRules(newRules);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
    }

    setIsSaving(false);
  };

  const updateRule = async (id: string, content: string) => {
    setIsSaving(true);

    if (user) {
      try {
        await apiFetch('/api/life-rules', {
          method: 'PATCH',
          body: JSON.stringify({ id, content }),
        });
        setRules(rules.map(r => r.id === id ? { ...r, content } : r));
        toast.success('Rule updated');
      } catch (error) {
        console.error('Error updating rule:', error);
        toast.error('Failed to update rule');
      }
    } else {
      const newRules = rules.map(r => r.id === id ? { ...r, content, updated_at: new Date().toISOString() } : r);
      setRules(newRules);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
    }

    setIsSaving(false);
  };

  const deleteRule = async (id: string) => {
    setIsSaving(true);

    if (user) {
      try {
        await apiFetch('/api/life-rules', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });
        setRules(rules.filter(r => r.id !== id));
        toast.success('Rule deleted');
      } catch (error) {
        console.error('Error deleting rule:', error);
        toast.error('Failed to delete rule');
      }
    } else {
      const newRules = rules.filter(r => r.id !== id);
      setRules(newRules);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRules));
    }

    setIsSaving(false);
  };

  const reorderRules = async (newRules: LifeRule[]) => {
    setRules(newRules);

    if (user) {
      await apiFetch('/api/life-rules', {
        method: 'PATCH',
        body: JSON.stringify({
          items: newRules.map((rule, index) => ({ id: rule.id, position: index })),
        }),
      });
    } else {
      const reorderedRules = newRules.map((rule, index) => ({ ...rule, position: index }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reorderedRules));
    }
  };

  return {
    rules,
    isLoading,
    isSaving,
    isLoggedIn: !!user,
    addRule,
    updateRule,
    deleteRule,
    reorderRules,
  };
};
