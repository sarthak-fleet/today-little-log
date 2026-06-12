import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Skull, Target, Timer, Trophy } from 'lucide-react';

const navItems = [
  { title: 'Score', url: '/', icon: Trophy },
  { title: 'Journal', url: '/journal', icon: BookOpen },
  { title: 'Habits', url: '/habits', icon: Target },
  { title: 'Timer', url: '/focus', icon: Timer },
  { title: 'Life', url: '/life', icon: Skull },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-16 gap-1 px-2">
        {navItems.map((item) => (
          <button
            key={item.title}
            onClick={() => navigate(item.url)}
            aria-label={item.title}
            className={`flex flex-1 flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-0.5 transition-colors ${
              isActive(item.url)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
