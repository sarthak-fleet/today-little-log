import {
  BookOpen,
  Briefcase,
  DollarSign,
  FolderKanban,
  Heart,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  general: { label: 'General', icon: BookOpen },
  health: { label: 'Health', icon: Heart },
  finance: { label: 'Finance', icon: DollarSign },
  relationships: { label: 'Relationships', icon: Users },
  career: { label: 'Career', icon: Briefcase },
  knowledge: { label: 'Knowledge', icon: BookOpen },
  novelty: { label: 'Novelty', icon: Sparkles },
  projects: { label: 'Projects', icon: FolderKanban },
};

export const MOOD_META: Record<string, { emoji: string; label: string }> = {
  great: { emoji: '🌟', label: 'Great' },
  good: { emoji: '😊', label: 'Good' },
  okay: { emoji: '😐', label: 'Okay' },
  low: { emoji: '😔', label: 'Low' },
  drained: { emoji: '😴', label: 'Drained' },
};

export function getMoodFromContent(content: string): string | null {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.mood === 'string') {
      return parsed.mood;
    }
  } catch {
    // plain-text or legacy entry
  }
  return null;
}

export function parseEntryContent(content: string): Record<string, string> {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Legacy plain-text entries
  }
  return { general: content };
}

export function getFilledCategories(
  content: string
): Array<{ key: string; label: string; value: string }> {
  const cats = parseEntryContent(content);
  return Object.entries(cats)
    .filter(
      ([key, value]) => key !== 'mood' && typeof value === 'string' && value.trim().length > 0
    )
    .map(([key, value]) => ({
      key,
      label: CATEGORY_META[key]?.label ?? key,
      value: value.trim(),
    }));
}

export function formatEntryPreview(content: string, maxLength = 180): string {
  const filled = getFilledCategories(content);
  if (filled.length === 0) return '';
  const joined = filled.map((cat) => cat.value).join(' · ');
  if (joined.length <= maxLength) return joined;
  return `${joined.slice(0, maxLength).trim()}…`;
}
