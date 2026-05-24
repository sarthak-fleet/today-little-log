import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { type JournalEntry, type EntryType } from '@/hooks/useJournalEntries';
import { format, isSameDay } from 'date-fns';
import { X, Pencil, Trash2, Check, CalendarDays, Calendar as CalendarIcon, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CATEGORY_META, getFilledCategories } from '@/lib/journalContent';

interface CalendarViewProps {
  entries: JournalEntry[];
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export function CalendarView({ entries, onUpdate, onDelete }: CalendarViewProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const entryDates = entries.map(e => e.date);

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.filter(e => e.date === dateStr);
  };

  const selectedEntries = selectedDate ? getEntriesForDate(selectedDate) : [];
  const isTodaySelected = selectedDate ? isSameDay(selectedDate, today) : false;

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-display font-medium text-foreground">
          Calendar View
        </h2>
        {selectedDate && !isTodaySelected && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setSelectedDate(today)}
          >
            Jump to today
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="journal-paper rounded-xl shadow-card p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(prev => prev && date && format(prev, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') ? undefined : date);
              cancelEditing();
            }}
            className="pointer-events-auto"
            modifiers={{
              hasEntry: (date) => entryDates.includes(format(date, 'yyyy-MM-dd')),
              today: (date) => format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
            }}
            modifiersStyles={{
              hasEntry: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))',
              },
              today: {
                border: '2px solid hsl(var(--primary))',
                borderRadius: '0.375rem',
              },
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {selectedDate ? (
            <div className="space-y-4">
              <h3 className="font-display font-medium text-foreground">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                {isTodaySelected && (
                  <span className="ml-2 text-xs font-sans uppercase tracking-widest text-primary">Today</span>
                )}
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
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Edit entry"
                            onClick={() => startEditing(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:text-destructive"
                                aria-label="Delete entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(entry.id)}>Delete</AlertDialogAction>
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
                            <Button size="sm" onClick={() => saveEdit(entry.id)} disabled={!editContent.trim()}>
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
                                  <span className="font-medium text-xs uppercase tracking-wide">{label}</span>
                                </div>
                                <p className="text-journal-ink leading-relaxed whitespace-pre-wrap">{value}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                  {isTodaySelected ? (
                    <>
                      <p className="font-medium text-foreground">No entry for today yet.</p>
                      <p className="mt-1">Use the daily prompt above to log your first categories.</p>
                    </>
                  ) : (
                    <p>No entries for this date.</p>
                  )}
                </div>
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
