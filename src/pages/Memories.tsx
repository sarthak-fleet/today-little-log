import { useState } from 'react';
import { PastEntries } from '@/components/PastEntries';
import { CalendarView } from '@/components/CalendarView';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List, CalendarDays, Search, X, BookOpen } from 'lucide-react';

const Memories = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const { entries, getRecentEntries, updateEntry, deleteEntry, isLoaded, hasMore, loadMore } =
    useJournalEntries();

  const pastEntries = getRecentEntries(20);

  const filteredPastEntries = searchQuery
    ? pastEntries.filter((e) => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : pastEntries;

  const filteredAllEntries = searchQuery
    ? entries.filter((e) => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="pt-10 pb-6 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 text-primary/80 mb-3">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.25em]">Memories</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground">
          Past entries
        </h1>
      </section>

      <section className="px-4 max-w-4xl mx-auto pb-20 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="bg-muted/50 p-1.5 rounded-xl flex gap-1 self-start">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 px-4 rounded-lg shadow-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-2" /> List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 px-4 rounded-lg shadow-none"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarDays className="h-4 w-4 mr-2" /> Calendar
            </Button>
          </div>

          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            Showing {viewMode === 'list' ? filteredPastEntries.length : filteredAllEntries.length}{' '}
            results for "{searchQuery}"
          </p>
        )}

        <div className="min-h-[400px]">
          {!isLoaded ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 w-full bg-muted/40 animate-pulse rounded-2xl" />
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
            <div className="bg-card p-6 rounded-3xl shadow-soft">
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

export default Memories;
