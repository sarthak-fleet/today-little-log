import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Pencil, Heart, DollarSign, Users, Briefcase, BookOpen, Sparkles, FolderKanban, ChevronDown } from 'lucide-react';
import { type JournalEntry, type EntryType } from '@/hooks/useJournalEntries';
import { EntryEditor } from './EntryEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'general', label: 'General', icon: BookOpen, placeholder: 'Anything on your mind...' },
  { key: 'health', label: 'Health', icon: Heart, placeholder: 'Exercise, meals, sleep, mental health...' },
  { key: 'finance', label: 'Finance', icon: DollarSign, placeholder: 'Spending, saving, investments...' },
  { key: 'relationships', label: 'Relationships', icon: Users, placeholder: 'Family, friends, social interactions...' },
  { key: 'career', label: 'Career', icon: Briefcase, placeholder: 'Work accomplishments, meetings, goals...' },
  { key: 'knowledge', label: 'Knowledge', icon: BookOpen, placeholder: 'Learning, reading, courses...' },
  { key: 'novelty', label: 'Novelty', icon: Sparkles, placeholder: 'New experiences, adventures, discoveries...' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, placeholder: 'Personal projects, hobbies, side work...' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];
type CategoryContent = Record<CategoryKey, string>;

const MIN_FILLED_CATEGORIES = 2;

interface TodayPromptProps {
  todayEntry?: JournalEntry;
  weeklyEntry?: JournalEntry;
  monthlyEntry?: JournalEntry;
  isSunday: boolean;
  isLastDayOfMonth: boolean;
  onSave: (content: string, entryType: EntryType) => void;
}

const parseContent = (content?: string): CategoryContent => {
  const empty: CategoryContent = {
    general: '',
    health: '',
    finance: '',
    relationships: '',
    career: '',
    knowledge: '',
    novelty: '',
    projects: '',
  };
  
  if (!content) return empty;
  
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...empty, ...parsed };
    }
  } catch {
    // Legacy plain text content - default to general
    return { ...empty, general: content };
  }
  
  return empty;
};

const getFilledCount = (content: CategoryContent): number => {
  return Object.values(content).filter(v => v.trim().length > 0).length;
};

const getFilledCategories = (content: CategoryContent) => {
  return CATEGORIES.filter(cat => content[cat.key].trim().length > 0);
};

export function TodayPrompt({ 
  todayEntry, 
  weeklyEntry, 
  monthlyEntry,
  isSunday, 
  isLastDayOfMonth, 
  onSave 
}: TodayPromptProps) {
  const [content, setContent] = useState<CategoryContent>(() => parseContent(todayEntry?.content));
  const [isEditing, setIsEditing] = useState(() => !todayEntry?.content);
  const [isSaved, setIsSaved] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    if (todayEntry?.content) {
      setContent(parseContent(todayEntry.content));
    }
  }, [todayEntry?.content]);

  const filledCount = getFilledCount(content);
  const canSave = filledCount >= MIN_FILLED_CATEGORIES;
  const filledCategories = getFilledCategories(content);

  const handleSave = () => {
    if (canSave) {
      onSave(JSON.stringify(content), 'daily');
      setIsEditing(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const updateCategory = (key: CategoryKey, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long' });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Daily Entry */}
      <div>
        <div className="mb-6 text-center">
          <p className="text-sm font-sans uppercase tracking-widest text-journal-date mb-2">
            {formatDate()}
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-medium text-foreground leading-tight">
            What did you do today?
          </h1>
          {isEditing && (
            <p className="text-sm text-muted-foreground mt-2">
              Fill at least {MIN_FILLED_CATEGORIES} categories ({filledCount}/{CATEGORIES.length} filled)
            </p>
          )}
        </div>

        <div className="relative">
          <div className="journal-paper rounded-xl shadow-card p-4 md:p-6 transition-all duration-300 hover:shadow-glow">
            {isEditing ? (
              <>
                {/* Grid layout for editing */}
                <div className="grid gap-4 md:grid-cols-2">
                  {CATEGORIES.map(({ key, label, icon: Icon, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </label>
                      <Textarea
                        value={content[key]}
                        onChange={(e) => updateCategory(key, e.target.value)}
                        placeholder={placeholder}
                        className="min-h-[80px] resize-none border-border/50 bg-transparent text-sm font-sans text-journal-ink placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`text-sm ${canSave ? 'text-primary' : 'text-muted-foreground'}`}>
                    {canSave ? '✓ Ready to save' : `Fill ${MIN_FILLED_CATEGORIES - filledCount} more`}
                  </span>
                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Save Entry
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Accordion-style compact view for saved entries */}
                <div className="space-y-2">
                  {filledCategories.length > 0 ? (
                    filledCategories.map(({ key, label, icon: Icon }) => (
                      <Collapsible
                        key={key}
                        open={openCategory === key}
                        onOpenChange={(open) => setOpenCategory(open ? key : null)}
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground max-w-[200px] truncate hidden sm:block">
                              {content[key].slice(0, 50)}{content[key].length > 50 ? '...' : ''}
                            </span>
                            <ChevronDown className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              openCategory === key && "rotate-180"
                            )} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <p className="text-sm text-journal-ink whitespace-pre-wrap pl-7 pt-2 border-l-2 border-muted ml-2">
                            {content[key]}
                          </p>
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No entries yet
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                  <span className={`text-sm font-sans transition-opacity duration-300 ${isSaved ? 'opacity-100 text-primary' : 'opacity-0'}`}>
                    ✓ Saved
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Entry - Show on Sundays */}
      {isSunday && (
        <EntryEditor
          entry={weeklyEntry}
          entryType="weekly"
          title="Weekly Reflection"
          placeholder="Reflect on your week..."
          onSave={onSave}
        />
      )}

      {/* Monthly Entry - Show on last day of month */}
      {isLastDayOfMonth && (
        <EntryEditor
          entry={monthlyEntry}
          entryType="monthly"
          title={`${getMonthName()} Monthly Summary`}
          placeholder="Summarize your month..."
          onSave={onSave}
        />
      )}
    </div>
  );
}
