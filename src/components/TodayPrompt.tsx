import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Pencil } from 'lucide-react';
import { JournalEntry, EntryType } from '@/hooks/useJournalEntries';
import { EntryEditor } from './EntryEditor';

interface TodayPromptProps {
  todayEntry?: JournalEntry;
  weeklyEntry?: JournalEntry;
  monthlyEntry?: JournalEntry;
  isSunday: boolean;
  isLastDayOfMonth: boolean;
  onSave: (content: string, entryType: EntryType) => void;
}

export function TodayPrompt({ 
  todayEntry, 
  weeklyEntry, 
  monthlyEntry,
  isSunday, 
  isLastDayOfMonth, 
  onSave 
}: TodayPromptProps) {
  const [content, setContent] = useState(todayEntry?.content || '');
  const [isEditing, setIsEditing] = useState(!todayEntry?.content);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (todayEntry?.content) {
      setContent(todayEntry.content);
    }
  }, [todayEntry?.content]);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim(), 'daily');
      setIsEditing(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
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
        <div className="mb-8 text-center">
          <p className="text-sm font-sans uppercase tracking-widest text-journal-date mb-2">
            {formatDate()}
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-medium text-foreground leading-tight">
            What did you do today?
          </h1>
        </div>

        <div className="relative">
          <div className="journal-paper rounded-xl shadow-card p-6 md:p-8 transition-all duration-300 hover:shadow-glow">
            {isEditing ? (
              <>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write about your day..."
                  className="min-h-[200px] md:min-h-[250px] resize-none border-none bg-transparent text-lg font-sans text-journal-ink placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 journal-lines"
                  autoFocus
                />
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={!content.trim()}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Save Entry
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="min-h-[200px] md:min-h-[250px] journal-lines">
                  <p className="text-lg font-sans text-journal-ink whitespace-pre-wrap leading-8">
                    {content}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
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
