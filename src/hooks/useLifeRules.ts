import { useState, useEffect } from 'react';
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

export const useLifeRules = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<LifeRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRules();
    }
  }, [user]);

  const fetchRules = async () => {
    if (!user) return;
    
    setIsLoading(true);
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
    }
    setIsLoading(false);
  };

  const addRule = async (content: string) => {
    if (!user) return;

    const newPosition = rules.length;
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
  };

  const updateRule = async (id: string, content: string) => {
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
  };

  const deleteRule = async (id: string) => {
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
  };

  const reorderRules = async (newRules: LifeRule[]) => {
    setRules(newRules);
    
    // Update positions in database
    const updates = newRules.map((rule, index) => 
      supabase
        .from('life_rules')
        .update({ position: index })
        .eq('id', rule.id)
    );

    await Promise.all(updates);
  };

  return {
    rules,
    isLoading,
    addRule,
    updateRule,
    deleteRule,
    reorderRules,
  };
};
