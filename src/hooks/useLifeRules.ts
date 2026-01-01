import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('life_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching rules:', error);
        toast.error('Failed to load rules');
      } else {
        setRules(data || []);
        
        // Check for local storage migration
        const savedRules = localStorage.getItem(STORAGE_KEY);
        if (savedRules && (!data || data.length === 0)) {
          const localRules = JSON.parse(savedRules) as LifeRule[];
          for (const rule of localRules) {
            await supabase.from('life_rules').insert({
              user_id: user.id,
              content: rule.content,
              position: rule.position,
            });
          }
          // Reload after migration
          const { data: reloadedRules } = await supabase
            .from('life_rules')
            .select('*')
            .eq('user_id', user.id)
            .order('position', { ascending: true });
          if (reloadedRules) {
            setRules(reloadedRules);
          }
        }
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
      const { data, error } = await supabase
        .from('life_rules')
        .insert({
          user_id: user.id,
          content,
          position: newPosition,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding rule:', error);
        toast.error('Failed to add rule');
      } else if (data) {
        setRules([...rules, data]);
        toast.success('Rule added');
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
      const { error } = await supabase
        .from('life_rules')
        .update({ content })
        .eq('id', id);

      if (error) {
        console.error('Error updating rule:', error);
        toast.error('Failed to update rule');
      } else {
        setRules(rules.map(r => r.id === id ? { ...r, content } : r));
        toast.success('Rule updated');
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
      const { error } = await supabase
        .from('life_rules')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting rule:', error);
        toast.error('Failed to delete rule');
      } else {
        setRules(rules.filter(r => r.id !== id));
        toast.success('Rule deleted');
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
      const updates = newRules.map((rule, index) => 
        supabase
          .from('life_rules')
          .update({ position: index })
          .eq('id', rule.id)
      );
      await Promise.all(updates);
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
