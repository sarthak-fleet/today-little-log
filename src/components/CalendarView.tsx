import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { JournalEntry, EntryType } from '@/hooks/useJournalEntries';
import { format } from 'date-fns';
import { X, Pencil, Trash2, Check, CalendarDays, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  entries: JournalEntry[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function CalendarView({ entries, onUpdate, onDelete }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const entryDates = entries.map(e => e.date);

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.filter(e => e.date === dateStr);
  };

  const selectedEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

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

  const getEntryBadge = (entryType: EntryType) => {
    if (entryType === 'daily') return null;
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        {entryType === 'weekly' ? <CalendarDays className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
        {entryType}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-medium text-foreground">
        Calendar View
      </h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className="journal-paper rounded-xl shadow-card p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="pointer-events-auto"
            modifiers={{
              hasEntry: (date) => entryDates.includes(format(date, 'yyyy-MM-dd')),
            }}
            modifiersStyles={{
              hasEntry: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))',
              },
            }}
          />
        </div>

        {/* Selected Date Entries */}
        <div className="flex-1 min-w-0">
          {selectedDate ? (
            <div className="space-y-4">
              <h3 className="font-display font-medium text-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>

              {selectedEntries.length > 0 ? (
                <div className="space-y-3">
                  {selectedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="journal-paper rounded-lg shadow-soft p-4 group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getEntryBadge(entry.entry_type)}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditing(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-destructive"
                            onClick={() => onDelete(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
                        <p className="text-sm font-sans text-journal-ink whitespace-pre-wrap leading-relaxed">
                          {entry.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No entries for this date
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a date to view entries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
