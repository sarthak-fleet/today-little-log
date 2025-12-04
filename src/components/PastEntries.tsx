import { useState } from 'react';
import { JournalEntry, EntryType } from '@/hooks/useJournalEntries';
import { BookOpen, Pencil, Trash2, Check, X, Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface PastEntriesProps {
  entries: JournalEntry[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function PastEntries({ entries, onUpdate, onDelete }: PastEntriesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const formatDate = (dateStr: string, entryType: EntryType) => {
    const date = new Date(dateStr + 'T00:00:00');
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

    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
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
      <div className="text-center py-12 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-sans">
          Your past entries will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-medium text-foreground mb-6">
        Previous Entries
      </h2>
      
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="animate-slide-up group"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="journal-paper rounded-lg shadow-soft p-5 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="font-display font-medium text-foreground">
                      {formatDate(entry.date, entry.entry_type)}
                    </p>
                    <p className="text-xs text-journal-date font-sans">
                      {getDaysAgo(entry.date)}
                    </p>
                  </div>
                  {getEntryBadge(entry.entry_type)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => startEditing(entry)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                    <Button size="sm" onClick={() => saveEdit(entry.id)}>
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-sans text-journal-ink line-clamp-3 leading-relaxed">
                  {entry.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
