import { useState } from 'react';
import { CalendarView } from '@/components/CalendarView';
import { JournalSkeleton } from '@/components/PageSkeleton';
import { PastEntries } from '@/components/PastEntries';
import { TodayPrompt } from '@/components/TodayPrompt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReportSaving } from '@/components/SavingContext';
import { type EntryType, useJournalEntries } from '@/hooks/useJournalEntries';
import Habits from '@/pages/Habits';
import { AlertCircle, BookOpen, CalendarDays, List, RefreshCw, Search, X } from 'lucide-react';

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
    loadError,
    retryLoad,
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

        {loadError && (
          <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Couldn&apos;t load journal</p>
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={retryLoad} className="self-start gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
            {isLoaded ? (
              <TodayPrompt
                todayEntry={getTodayEntry()}
                weeklyEntry={getWeeklyEntry()}
                monthlyEntry={getMonthlyEntry()}
                isSunday={isSunday()}
                isLastDayOfMonth={isLastDayOfMonth()}
                onSave={handleSave}
                isSaving={isSaving}
              />
            ) : (
              <JournalSkeleton />
            )}
          </div>

          <Habits embedded />
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
                aria-label="Clear search"
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
              searchQuery={searchQuery}
            />
          ) : searchQuery && filteredAllEntries.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No matching entries</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
            </div>
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
