import { useState } from 'react';
import { format } from 'date-fns';
import type { JournalEntry, EntryType } from '@/hooks/useJournalEntries';
import { BookOpen, Pencil, Trash2, Check, X, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CATEGORY_META,
  MOOD_META,
  getFilledCategories,
  getMoodFromContent,
} from '@/lib/journalContent';

interface PastEntriesProps {
  entries: JournalEntry[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  searchQuery?: string;
}

export function PastEntries({
  entries,
  onUpdate,
  onDelete,
  hasMore,
  onLoadMore,
  searchQuery = '',
}: PastEntriesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const formatDate = (dateStr: string, entryType: EntryType) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (entryType === 'weekly') {
      const endOfWeek = new Date(date);
      endOfWeek.setDate(date.getDate() + 6);
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    if (entryType === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Compare against the local calendar date — toISOString() is UTC and
    // mislabels entries near midnight in non-UTC timezones.
    if (dateStr === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysAgo = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getEntryIcon = (entryType: EntryType) => {
    switch (entryType) {
      case 'weekly':
        return <CalendarDays className="h-3 w-3" />;
      case 'monthly':
        return <Calendar className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getEntryBadge = (entryType: EntryType) => {
    if (entryType === 'daily') return null;
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        {getEntryIcon(entryType)}
        {entryType}
      </Badge>
    );
  };

  const startEditing = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = (id: string) => {
    if (editContent.trim()) {
      onUpdate(id, editContent.trim());
      setEditingId(null);
      setEditContent('');
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        {searchQuery ? (
          <>
            <p className="text-sm font-medium text-muted-foreground">No matching entries</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground">No past entries yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              After today&apos;s entry is saved, older days show up here
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-medium text-foreground mb-6">Previous Entries</h2>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="animate-slide-up group"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="journal-paper rounded-lg shadow-soft p-5 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-wrap">
                  <div>
                    <p className="font-display font-medium text-foreground">
                      {formatDate(entry.date, entry.entry_type)}
                    </p>
                    <p className="text-xs text-journal-date font-sans">{getDaysAgo(entry.date)}</p>
                  </div>
                  {getEntryBadge(entry.entry_type)}
                  {entry.entry_type === 'daily' &&
                    (() => {
                      const mood = getMoodFromContent(entry.content);
                      if (!mood || !MOOD_META[mood]) return null;
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
                          {MOOD_META[mood].emoji} {MOOD_META[mood].label}
                        </span>
                      );
                    })()}
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Edit entry"
                    onClick={() => startEditing(entry)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(entry.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {editingId === entry.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px] resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(entry.id)}
                      disabled={!editContent.trim()}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {getFilledCategories(entry.content).map(({ key, label, value }) => {
                    const meta = CATEGORY_META[key];
                    const Icon = meta?.icon || BookOpen;
                    return (
                      <div key={key} className="flex gap-2 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground min-w-[110px] flex-shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="font-medium text-xs uppercase tracking-wide">
                            {label}
                          </span>
                        </div>
                        <p className="text-journal-ink leading-relaxed whitespace-pre-wrap">
                          {value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && onLoadMore && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={onLoadMore}>
            Load more entries
          </Button>
        </div>
      )}
    </div>
  );
}
