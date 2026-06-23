import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LogOut, LogIn, Loader2, Cake, Moon, Sun } from 'lucide-react';
import {
  differenceInDays,
  parseISO,
  isValid,
  format,
  getDaysInMonth,
  endOfYear,
  differenceInCalendarDays,
} from 'date-fns';
import { useLifeMath, AVERAGE_LIFESPAN_DAYS } from '@/hooks/useLifeMath';

type TimeView = 'month' | 'year' | 'life';

interface NavbarProps {
  isSaving?: boolean;
}

export function Navbar({ isSaving = false }: NavbarProps) {
  const navigate = useNavigate();
  const { user, profile, signOut, updateDob } = useAuth({ includeProfile: true });
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? 'light') === 'dark';
  const [timeView, setTimeView] = useState<TimeView>('month');
  const life = useLifeMath(1000); // 1s ticker for live today countdown

  const isLoggedIn = !!user;
  const today = life.now;

  const getDayOfLife = () => {
    if (!profile?.dob) return null;
    const birthDate = parseISO(profile.dob);
    if (!isValid(birthDate)) return null;
    return differenceInDays(new Date(), birthDate) + 1;
  };

  const dayOfLife = getDayOfLife();
  const daysRemaining = dayOfLife ? Math.max(0, AVERAGE_LIFESPAN_DAYS - dayOfLife) : null;

  const getTimeStats = () => {
    const totalDaysInMonth = getDaysInMonth(today);
    const dayOfMonth = today.getDate();
    const daysLeftMonth = totalDaysInMonth - dayOfMonth;
    const monthPercent = Math.round((dayOfMonth / totalDaysInMonth) * 100);

    const endOfYearDate = endOfYear(today);
    const daysLeftYear = differenceInCalendarDays(endOfYearDate, today);
    const dayOfYear = differenceInCalendarDays(today, new Date(today.getFullYear(), 0, 0));
    const totalDaysInYear = differenceInCalendarDays(
      endOfYearDate,
      new Date(today.getFullYear(), 0, 0)
    );
    const yearPercent = Math.round((dayOfYear / totalDaysInYear) * 100);

    return { daysLeftMonth, monthPercent, daysLeftYear, yearPercent, totalDaysInMonth, dayOfMonth };
  };

  const stats = getTimeStats();

  const cycleView = () => {
    if (timeView === 'month') setTimeView('year');
    else if (timeView === 'year') setTimeView(dayOfLife ? 'life' : 'month');
    else setTimeView('month');
  };

  const getTimeDisplay = () => {
    if (timeView === 'month') {
      return {
        label: `${format(today, 'MMM')} '${format(today, 'yy')}`,
        value: `${stats.daysLeftMonth}d left`,
        percent: stats.monthPercent,
      };
    }
    if (timeView === 'year') {
      return {
        label: `${today.getFullYear()}`,
        value: `${stats.daysLeftYear}d left`,
        percent: stats.yearPercent,
      };
    }
    // life
    return {
      label: 'Life',
      value: daysRemaining ? `${daysRemaining.toLocaleString()}d left` : '—',
      percent: dayOfLife ? Math.round((dayOfLife / AVERAGE_LIFESPAN_DAYS) * 100) : 0,
    };
  };

  const display = getTimeDisplay();

  const handleDobChange = async (newDob: string) => {
    await updateDob(newDob);
  };

  const toggleDarkMode = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Live today ticker HH:MM:SS until midnight (readable waking-window urgency)
  const secsLeftToday = Math.max(
    0,
    Math.floor((new Date(today).setHours(23, 59, 59, 999) - today.getTime()) / 1000)
  );
  const hhmmss = `${String(Math.floor(secsLeftToday / 3600)).padStart(2, '0')}:${String(Math.floor((secsLeftToday % 3600) / 60)).padStart(2, '0')}:${String(secsLeftToday % 60).padStart(2, '0')}`;
  const crunch = life.isEndOfDayCrunch;

  return (
    <header className="py-3 px-4 md:py-4 md:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Date + Time counter */}
        <div className="flex min-w-0 items-center gap-3 md:gap-5">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{format(today, 'EEEE')}</span>
            <span className="text-xs text-muted-foreground">{format(today, 'MMM d, yyyy')}</span>
          </div>

          {/* Time remaining counter - bolder */}
          <button
            onClick={cycleView}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Click to cycle: month → year → life"
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.18em]">
                {display.label}
              </span>
              <span className="font-display font-extrabold text-foreground text-lg md:text-xl">
                {display.value}
              </span>
            </div>
            <div className="hidden sm:flex flex-col items-start gap-1">
              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${display.percent}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {display.percent}% spent
              </span>
            </div>
          </button>

          {/* Live today tick */}
          <div
            className={`hidden md:flex flex-col items-start leading-tight pl-5 border-l border-border/60 ${crunch ? 'animate-pulse' : ''}`}
            title="Time left today"
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${crunch ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              Today
            </span>
            <span
              className={`font-mono font-bold text-sm md:text-base tabular-nums ${crunch ? 'text-destructive' : 'text-foreground'}`}
            >
              {hhmmss}
            </span>
          </div>
        </div>

        {/* Right: DOB setter + Dark mode toggle + User section */}
        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />}

          {isLoggedIn && !dayOfLife && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1 h-11 md:h-8"
                  aria-label="Set birthday"
                >
                  <Cake className="h-4 w-4" />
                  <span className="hidden sm:inline">Set birthday</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Date of Birth</label>
                  <Input
                    type="date"
                    value={profile?.dob || ''}
                    onChange={(e) => handleDobChange(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-background border-input"
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
            title={isDark ? 'Light mode' : 'Dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isLoggedIn ? (
            <>
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
                <AvatarFallback className="text-xs">
                  {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/auth')}
              className="gap-1 h-11 px-3 md:h-8"
              aria-label="Sign in"
            >
              <LogIn className="h-3 w-3" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
