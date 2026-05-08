import { useState } from 'react';
import { CalendarView } from '@/components/CalendarView';
import { JournalSkeleton } from '@/components/PageSkeleton';
import { PastEntries } from '@/components/PastEntries';
import { TodayPrompt } from '@/components/TodayPrompt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReportSaving } from '@/components/SavingContext';
import { type EntryType, useJournalEntries } from '@/hooks/useJournalEntries';
import { BookOpen, CalendarDays, List, Search, X } from 'lucide-react';

const Journal = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    entries,
    getTodayEntry,
    getWeeklyEntry,
    getMonthlyEntry,
    getRecentEntries,
    saveEntry,
    updateEntry,
    deleteEntry,
    isLoaded,
    isSaving,
    isSunday,
    isLastDayOfMonth,
    hasMore,
    loadMore,
  } = useJournalEntries();

  useReportSaving(isSaving);

  const handleSave = (content: string, entryType: EntryType) => {
    saveEntry(content, undefined, entryType);
  };

  const pastEntries = getRecentEntries(20);
  const filteredPastEntries = searchQuery
    ? pastEntries.filter((entry) => entry.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : pastEntries;
  const filteredAllEntries = searchQuery
    ? entries.filter((entry) => entry.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-4 pb-20 pt-6 md:pt-8">
        <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <BookOpen className="h-4 w-4 text-primary" />
          Journal
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
          {isLoaded ? (
            <TodayPrompt
              todayEntry={getTodayEntry()}
              weeklyEntry={getWeeklyEntry()}
              monthlyEntry={getMonthlyEntry()}
              isSunday={isSunday()}
              isLastDayOfMonth={isLastDayOfMonth()}
              onSave={handleSave}
            />
          ) : (
            <JournalSkeleton />
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 self-start rounded-xl bg-muted/50 p-1.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 rounded-lg px-4 shadow-none"
              onClick={() => setViewMode('list')}
            >
              <List className="mr-2 h-4 w-4" /> List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 rounded-lg px-4 shadow-none"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Calendar
            </Button>
          </div>

          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search journal..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 rounded-xl border-none bg-muted/30 pl-10 pr-10 focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 min-h-[400px]">
          {!isLoaded ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-32 w-full animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <PastEntries
              entries={filteredPastEntries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              hasMore={hasMore && !searchQuery}
              onLoadMore={loadMore}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft md:p-6">
              <CalendarView
                entries={filteredAllEntries}
                onUpdate={updateEntry}
                onDelete={deleteEntry}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Journal;
