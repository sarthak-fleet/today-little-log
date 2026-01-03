import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Feather, LogOut, LogIn, Loader2, Cake, BookOpen, Clock, Target, Moon, Sun 
} from 'lucide-react';
import { differenceInDays, parseISO, isValid } from 'date-fns';
import { useEffect, useState } from 'react';

const AVERAGE_LIFESPAN_DAYS = 30000;

interface NavbarProps {
  isSaving?: boolean;
}

export function Navbar({ isSaving = false }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, updateDob } = useAuth();
  const [isDark, setIsDark] = useState(false);

  const isLoggedIn = !!user;

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

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

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="py-4 px-4 border-b border-border/50">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: Logo + Days Remaining */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Feather className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-semibold text-foreground text-lg hidden sm:inline">
              Journal
            </span>
          </button>

          {/* Days Remaining - always in navbar */}
          {isLoggedIn && (
            <Popover>
              <PopoverTrigger asChild>
                {dayOfLife ? (
                  <button className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity cursor-pointer">
                    <span className="text-muted-foreground">Day</span>
                    <span className="font-display font-bold text-foreground">
                      {dayOfLife.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">
                      (~{daysRemaining?.toLocaleString()} left)
                    </span>
                  </button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-1 h-8"
                  >
                    <Cake className="h-4 w-4" />
                    <span className="hidden sm:inline">Set birthday</span>
                  </Button>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
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
        </div>

        {/* Right: Navigation + User */}
        <div className="flex items-center gap-1">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />}
          
          {/* Nav links */}
          <Button
            variant={isActive('/') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8"
            title="Journal"
          >
            <Feather className="h-4 w-4" />
          </Button>
          <Button
            variant={isActive('/habits') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/habits')}
            className="h-8 w-8"
            title="Habits"
          >
            <Target className="h-4 w-4" />
          </Button>
          <Button
            variant={isActive('/schedule') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/schedule')}
            className="h-8 w-8"
            title="Schedule"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            variant={isActive('/rules') ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => navigate('/rules')}
            className="h-8 w-8"
            title="Rules for Life"
          >
            <BookOpen className="h-4 w-4" />
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-8 w-8 ml-1"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User section */}
          {isLoggedIn ? (
            <>
              <Avatar className="h-7 w-7 ml-2">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
                <AvatarFallback className="text-xs">
                  {profile?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/auth')}
              className="gap-1 ml-2 h-8"
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
