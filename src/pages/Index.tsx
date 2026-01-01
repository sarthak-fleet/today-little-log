import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TodayPrompt } from '@/components/TodayPrompt';
import { PastEntries } from '@/components/PastEntries';
import { CalendarView } from '@/components/CalendarView';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useAuth } from '@/hooks/useAuth';
import { Feather, LogOut, List, CalendarDays, Search, X, Cake, BookOpen, Clock, Target, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { EntryType } from '@/hooks/useJournalEntries';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const AVERAGE_LIFESPAN_DAYS = 30000;

const Index = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile, loading, signOut, updateDob } = useAuth();
  const navigate = useNavigate();

  // Calculate day of life
  const getDayOfLife = () => {
    if (!profile?.dob) return null;
    const birthDate = parseISO(profile.dob);
    if (!isValid(birthDate)) return null;
    return differenceInDays(new Date(), birthDate) + 1;
  };

  const dayOfLife = getDayOfLife();
  const daysRemaining = dayOfLife ? Math.max(0, AVERAGE_LIFESPAN_DAYS - dayOfLife) : null;

  const handleDobChange = async (newDob: string) => {
    await updateDob(newDob);
  };
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
    isSunday,
    isLastDayOfMonth,
  } = useJournalEntries();

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Feather className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-6 px-4 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Feather className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-foreground text-lg">
                Daily Journal
              </h1>
              <p className="text-xs text-muted-foreground font-sans">
                A moment for reflection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {isLoggedIn && (
              <Popover>
                <PopoverTrigger asChild>
                  {dayOfLife ? (
                    <button className="flex flex-col items-end text-right hover:opacity-80 transition-opacity cursor-pointer">
                      <span className="font-display font-bold text-2xl text-foreground leading-tight">
                        Day {dayOfLife.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ~{daysRemaining?.toLocaleString()} remaining
                      </span>
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground gap-2"
                    >
                      <Cake className="h-4 w-4" />
                      <span>Set birthday</span>
                    </Button>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={profile?.dob || ''}
                      onChange={(e) => handleDobChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full bg-background border-input"
                    />
                    {dayOfLife && (
                      <div className="space-y-1 pt-1">
                        <p className="text-xs text-muted-foreground">
                          Today is day <span className="font-semibold text-foreground">{dayOfLife.toLocaleString()}</span> of your life
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ~<span className="font-semibold text-foreground">{daysRemaining?.toLocaleString()}</span> days remaining
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/habits')}
              className="text-muted-foreground hover:text-foreground"
              title="Habits"
            >
              <Target className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/schedule')}
              className="text-muted-foreground hover:text-foreground"
              title="Schedule"
            >
              <Clock className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/rules')}
              className="text-muted-foreground hover:text-foreground"
              title="Rules for Life"
            >
              <BookOpen className="h-5 w-5" />
            </Button>
            {isLoggedIn ? (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
                  <AvatarFallback className="text-xs">
                    {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth')}
                className="gap-1"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Guest mode notice */}
      {!isLoggedIn && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <LogIn className="h-4 w-4" />
            <span>Log in to save your journal across devices</span>
            <Button variant="link" size="sm" className="ml-auto p-0 h-auto" onClick={() => navigate('/auth')}>
              Sign in
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Today's Entry */}
        <section className="mb-12">
          <TodayPrompt
            todayEntry={todayEntry}
            weeklyEntry={weeklyEntry}
            monthlyEntry={monthlyEntry}
            isSunday={isSunday()}
            isLastDayOfMonth={isLastDayOfMonth()}
            onSave={handleSave}
          />
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
          {viewMode === 'list' ? (
            <PastEntries
              entries={filteredPastEntries} 
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          ) : (
            <CalendarView
              entries={filteredAllEntries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground font-sans">
          Your thoughts, securely stored
        </p>
      </footer>
    </div>
  );
};

export default Index;
