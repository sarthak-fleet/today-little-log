import { useLocation, useNavigate } from 'react-router-dom';
import { Feather, Target, Clock, BookOpen, CheckSquare } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Journal', url: '/', icon: Feather },
  { title: 'Habits', url: '/habits', icon: Target },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
  { title: 'Schedule', url: '/schedule', icon: Clock },
  { title: 'Rules', url: '/rules', icon: BookOpen },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-sidebar/95 backdrop-blur-sm transition-all duration-300 ease-out"
    >
      <SidebarHeader className="px-3 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground flex-shrink-0">
            <Feather className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-display text-sm font-semibold whitespace-nowrap">Significant Hobbies</span>
            <span className="text-xs text-sidebar-foreground/60 whitespace-nowrap">Life dashboard</span>
          </div>
        </button>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="transition-all duration-200"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
