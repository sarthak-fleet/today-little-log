import { ReactNode } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: ReactNode;
  isSaving?: boolean;
}

export function AppLayout({ children, isSaving }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <Navbar isSaving={isSaving} />
        <div className="flex flex-1 w-full">
          <AppSidebar />
          <SidebarInset className="pb-16 md:pb-0">
            {children}
          </SidebarInset>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
