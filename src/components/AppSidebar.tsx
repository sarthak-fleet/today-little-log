import { useLocation, useNavigate } from 'react-router-dom';
import { Feather, Target, Clock, BookOpen, CheckSquare, Skull, Scale, Code2, LayoutGrid, Apple, Trophy, Sparkles } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { format } from 'date-fns';

const navItems = [
  { title: 'Journal', url: '/', icon: Feather, shortcut: 'J' },
  { title: 'Now', url: '/now', icon: Sparkles, shortcut: 'N' },
  { title: 'Life', url: '/life', icon: Skull, shortcut: 'L' },
  { title: 'Goals', url: '/goals', icon: Trophy, shortcut: 'G' },
  { title: 'Weight', url: '/weight', icon: Scale, shortcut: 'W' },
  { title: 'Food', url: '/food', icon: Apple, shortcut: 'F' },
  { title: 'Dev', url: '/dev', icon: Code2, shortcut: 'D' },
  { title: 'Habits', url: '/habits', icon: Target, shortcut: 'H' },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare, shortcut: 'T' },
  { title: 'Priority', url: '/eisenhower', icon: LayoutGrid, shortcut: 'P' },
  { title: 'Schedule', url: '/schedule', icon: Clock, shortcut: 'S' },
  { title: 'Rules', url: '/rules', icon: BookOpen, shortcut: 'R' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isExpanded = state === 'expanded';
  const today = new Date();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 transition-all duration-300 ease-out"
    >
      {/* Logo area */}
      <SidebarHeader className="px-3 py-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors group/logo"
        >
          <div className="sidebar-logo-icon relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/90 to-accent/80 text-primary-foreground flex-shrink-0 shadow-sm">
            <Feather className="h-4 w-4 relative z-10" />
            <div className="absolute inset-0 rounded-xl bg-white/10" />
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <div
            className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden overflow-hidden transition-all duration-300"
            style={{
              opacity: isExpanded ? 1 : 0,
              transform: isExpanded ? 'translateX(0)' : 'translateX(-8px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            <span className="font-display text-[13px] font-semibold whitespace-nowrap tracking-tight">Today Little Log</span>
            <span className="text-[11px] text-sidebar-foreground/50 whitespace-nowrap font-medium">{format(today, 'EEEE, MMM d')}</span>
          </div>
        </button>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="pt-6 px-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item, index) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem
                    key={item.title}
                    style={{
                      opacity: isExpanded ? 1 : undefined,
                      transform: isExpanded ? 'translateX(0)' : undefined,
                      transition: `opacity 0.25s ease ${index * 0.04}s, transform 0.25s ease ${index * 0.04}s`,
                    }}
                  >
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      isActive={active}
                      tooltip={item.title}
                      size="default"
                      className={`
                        sidebar-nav-item relative rounded-lg overflow-hidden
                        transition-all duration-200 ease-out
                        ${active
                          ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          h-4 w-4 flex-shrink-0 transition-all duration-200
                          ${active ? 'text-primary' : ''}
                        `}
                      />
                      <span className="group-data-[collapsible=icon]:hidden text-[13px]">{item.title}</span>
                      {active && (
                        <div className="sidebar-active-indicator absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
                      )}
                      <span className="ml-auto text-[10px] font-mono text-sidebar-foreground/25 group-data-[collapsible=icon]:hidden transition-opacity duration-200">
                        {item.shortcut}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-3 py-3 group-data-[collapsible=icon]:hidden">
        <SidebarSeparator className="opacity-40 mb-2" />
        <div
          className="flex items-center gap-2 px-1"
          style={{
            opacity: isExpanded ? 1 : 0,
            transition: 'opacity 0.4s ease 0.1s',
          }}
        >
          <div className="sidebar-status-dot h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
          <span className="text-[10px] text-sidebar-foreground/35 font-medium uppercase tracking-widest">Online</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
