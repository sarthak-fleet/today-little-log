import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TodayPrompt } from '@/components/TodayPrompt';
import { PastEntries } from '@/components/PastEntries';
import { CalendarView } from '@/components/CalendarView';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useAuth } from '@/hooks/useAuth';
import { Feather, LogOut, List, CalendarDays, Search, X, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { EntryType } from '@/hooks/useJournalEntries';
import { differenceInDays, parse, isValid } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const DOB_STORAGE_KEY = 'journal-dob';

const Index = () => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dob, setDob] = useState<string>(() => {
    return localStorage.getItem(DOB_STORAGE_KEY) || '';
  });

  // Calculate day of life
  const getDayOfLife = () => {
    if (!dob) return null;
    const birthDate = parse(dob, 'yyyy-MM-dd', new Date());
    if (!isValid(birthDate)) return null;
    return differenceInDays(new Date(), birthDate) + 1; // +1 to count birth day as day 1
  };

  const dayOfLife = getDayOfLife();

  // Save DOB to localStorage
  useEffect(() => {
    if (dob) {
      localStorage.setItem(DOB_STORAGE_KEY, dob);
    } else {
      localStorage.removeItem(DOB_STORAGE_KEY);
    }
  }, [dob]);
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
    isSunday,
    isLastDayOfMonth,
  } = useJournalEntries();
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Feather className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-2"
                >
                  <Cake className="h-4 w-4" />
                  {dayOfLife && (
                    <span className="font-display font-semibold text-foreground">
                      Day {dayOfLife.toLocaleString()}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                  {dayOfLife && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Today is day {dayOfLife.toLocaleString()} of your life
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
              <AvatarFallback className="text-xs">
                {profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
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
          </div>
        </div>
      </header>

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
