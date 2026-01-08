import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Project {
  id: string;
  title: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'projects-data';

function readGuestProjects(): Project[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function writeGuestProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user, loading } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (loading) return;
    
    if (user) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch projects:', error);
      } else {
        setProjects((data as Project[]) || []);
      }
    } else {
      setProjects(readGuestProjects());
    }
    setIsLoaded(true);
  }, [user, loading]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (title: string, description?: string, color?: string) => {
    setIsSaving(true);
    const projectColor = color || '#6366f1';
    
    if (user) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title,
          description,
          color: projectColor,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create project:', error);
        setIsSaving(false);
        return null;
      }
      
      setProjects(prev => [data as Project, ...prev]);
      setIsSaving(false);
      return data as Project;
    } else {
      const newProject: Project = {
        id: crypto.randomUUID(),
        title,
        description,
        color: projectColor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newProjects = [newProject, ...projects];
      setProjects(newProjects);
      writeGuestProjects(newProjects);
      setIsSaving(false);
      return newProject;
    }
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, 'title' | 'description' | 'color'>>) => {
    setIsSaving(true);
    
    if (user) {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Failed to update project:', error);
        setIsSaving(false);
        return;
      }
      await fetchProjects();
    } else {
      const newProjects = projects.map(p =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      );
      setProjects(newProjects);
      writeGuestProjects(newProjects);
    }
    setIsSaving(false);
  };

  const deleteProject = async (id: string) => {
    setIsSaving(true);
    
    if (user) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete project:', error);
        setIsSaving(false);
        return;
      }
      setProjects(prev => prev.filter(p => p.id !== id));
    } else {
      const newProjects = projects.filter(p => p.id !== id);
      setProjects(newProjects);
      writeGuestProjects(newProjects);
    }
    setIsSaving(false);
  };

  return {
    projects,
    isLoaded,
    isSaving,
    addProject,
    updateProject,
    deleteProject,
  };
}
