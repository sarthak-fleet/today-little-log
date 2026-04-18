import { useState } from 'react';
import { TodayPrompt } from '@/components/TodayPrompt';
import { PastEntries } from '@/components/PastEntries';
import { CalendarView } from '@/components/CalendarView';
import { useReportSaving } from '@/components/SavingContext';
import { GuestNotice } from '@/components/GuestNotice';
import { EmotionLogger } from '@/components/EmotionLogger';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useAuth } from '@/hooks/useAuth';
import { useLifeMath } from '@/hooks/useLifeMath';
import { List, CalendarDays, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EntryType } from '@/hooks/useJournalEntries';
import { JournalSkeleton } from '@/components/PageSkeleton';

const Index = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const { loading } = useAuth();
  const life = useLifeMath(60_000);

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

  useReportSaving(isSaving);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Hero Section */}
      <section className="pt-12 pb-8 md:pt-20 md:pb-12 px-4 max-w-4xl mx-auto">
        <div className="space-y-5 text-left animate-fade-in">
          {life.dayOfLife !== null && life.daysLeft !== null ? (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                <span className="h-[1px] w-6 bg-primary" />
                Day {life.dayOfLife.toLocaleString()} of ~{(30000).toLocaleString()}
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight leading-[1.05]">
                <span className="text-foreground">About </span>
                <span className="text-primary">{life.daysLeft.toLocaleString()}</span>
                <span className="text-foreground"> days</span>
                <br />
                <span className="text-accent italic font-medium">to become who you want.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl font-sans leading-relaxed">
                {life.hoursLeftToday}h {life.remainingMinutesToday}m left today. Log what matters. Skip what doesn't.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.05]">
                How many days <br />
                <span className="text-primary italic font-medium">do you have left?</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl font-sans leading-relaxed">
                Set your date of birth once and this app starts counting what matters. Top-right → cake icon.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Guest mode notice */}
      {!loading && !isLoggedIn && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-muted/50 rounded-2xl p-4 transition-all hover:bg-muted/80">
            <GuestNotice message="Log in to save your journal across devices and unlock full features." />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 space-y-16 pb-20">
        {/* Emotion Logger - Styled as a floating card */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="bg-card rounded-3xl p-6 shadow-soft border-none">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">How are you feeling?</h2>
            <EmotionLogger />
          </div>
        </section>

        {/* Today's Entry - The core focus */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-card rounded-3xl p-8 shadow-card border-none relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-base">✍️</span>
              Daily Reflection
            </h2>
            
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
          </div>
        </section>

        {/* Past Entries & View Toggle */}
        <section className="space-y-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-2xl font-display font-bold">Past Memories</h2>
            
            <div className="flex items-center gap-3">
              {/* View Toggle - Styled without hard borders */}
              <div className="bg-muted/50 p-1.5 rounded-xl flex gap-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-9 px-4 rounded-lg shadow-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-9 px-4 rounded-lg shadow-none"
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </div>

              {/* Search Toggle/Bar */}
              <div className="relative flex-1 md:w-64">
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
          </div>

          {searchQuery && (
            <p className="text-sm text-muted-foreground animate-fade-in">
              Showing {viewMode === 'list' ? filteredPastEntries.length : filteredAllEntries.length} results for "{searchQuery}"
            </p>
          )}

          <div className="min-h-[400px]">
            {loading || !isLoaded ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 w-full bg-muted/40 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <div className="animate-fade-in">
                <PastEntries
                  entries={filteredPastEntries}
                  onUpdate={updateEntry}
                  onDelete={deleteEntry}
                  hasMore={hasMore && !searchQuery}
                  onLoadMore={loadMore}
                />
              </div>
            ) : (
              <div className="animate-fade-in bg-card p-6 rounded-3xl shadow-soft">
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

      {/* Footer */}
      <footer className="py-20 text-center bg-muted/20">
        <p className="text-sm text-muted-foreground font-sans tracking-wide italic">
          {life.daysLeft !== null
            ? `Today is one of about ${life.daysLeft.toLocaleString()}. Don't give it away cheap.`
            : `The trouble is, you think you have time. — Jack Kornfield`}
        </p>
      </footer>
    </div>
  );
};

export default Index;
