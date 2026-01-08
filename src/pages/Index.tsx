import { useState } from 'react';
import { TodayPrompt } from '@/components/TodayPrompt';
import { PastEntries } from '@/components/PastEntries';
import { CalendarView } from '@/components/CalendarView';
import { AppLayout } from '@/components/AppLayout';
import { GuestNotice } from '@/components/GuestNotice';
import { EmotionLogger } from '@/components/EmotionLogger';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useAuth } from '@/hooks/useAuth';
import { List, CalendarDays, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EntryType } from '@/hooks/useJournalEntries';

const Index = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const { loading } = useAuth();

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
    isLoggedIn,
    hasMore,
    loadMore,
    isSunday,
    isLastDayOfMonth,
  } = useJournalEntries();

  const todayEntry = getTodayEntry();
  const weeklyEntry = getWeeklyEntry();
  const monthlyEntry = getMonthlyEntry();
  const pastEntries = getRecentEntries(20);

  // Filter entries based on search query
  const filteredPastEntries = searchQuery
    ? pastEntries.filter(entry => 
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pastEntries;

  const filteredAllEntries = searchQuery
    ? entries.filter(entry => 
        entry.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const handleSave = (content: string, entryType: EntryType) => {
    saveEntry(content, undefined, entryType);
  };

  // Loading skeleton for journal content
  const JournalSkeleton = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout isSaving={isSaving}>
      {/* Guest mode notice */}
      {!loading && !isLoggedIn && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <GuestNotice message="Log in to save your journal across devices" />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Emotion Logger */}
        <section className="mb-8">
          <EmotionLogger />
        </section>

        {/* Today's Entry */}
        <section className="mb-12">
          {loading || !isLoaded ? (
            <JournalSkeleton />
          ) : (
            <TodayPrompt
              todayEntry={todayEntry}
              weeklyEntry={weeklyEntry}
              monthlyEntry={monthlyEntry}
              isSunday={isSunday()}
              isLastDayOfMonth={isLastDayOfMonth()}
              onSave={handleSave}
            />
          )}
        </section>

        {/* Divider with View Toggle */}
        <div className="relative my-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50"></div>
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background px-4 flex items-center gap-4">
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {searchQuery && (
          <p className="text-sm text-muted-foreground mb-4">
            Found {viewMode === 'list' ? filteredPastEntries.length : filteredAllEntries.length} entries matching "{searchQuery}"
          </p>
        )}

        {/* Past Entries */}
        <section>
          {loading || !isLoaded ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
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
            <CalendarView
              entries={filteredAllEntries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground font-sans">
          Your thoughts, securely stored
        </p>
      </footer>
    </AppLayout>
  );
};

export default Index;
