import { useLocation, useNavigate } from 'react-router-dom';
import { Feather, Target, Clock, BookOpen, Moon, Sun, CheckSquare, Timer } from 'lucide-react';
import { useTheme } from 'next-themes';

const navItems = [
  { title: 'Journal', url: '/', icon: Feather },
  { title: 'Habits', url: '/habits', icon: Target },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Time', url: '/time-tracking', icon: Timer },
  { title: 'Schedule', url: '/schedule', icon: Clock },
  { title: 'Rules', url: '/rules', icon: BookOpen },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? 'light') === 'dark';
  const toggleDarkMode = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center h-14 gap-1 overflow-x-auto px-2">
        {navItems.map((item) => (
          <button
            key={item.title}
            onClick={() => navigate(item.url)}
            className={`flex flex-col items-center justify-center min-w-[72px] h-full gap-0.5 transition-colors ${
              isActive(item.url) 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </button>
        ))}
        <button
          onClick={toggleDarkMode}
          className="flex flex-col items-center justify-center min-w-[72px] h-full gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="text-[10px] font-medium">{isDark ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </nav>
  );
}
