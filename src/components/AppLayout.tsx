import { ReactNode, useState } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: ReactNode;
  isSaving?: boolean;
}

export function AppLayout({ children, isSaving }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen flex w-full">
        {/* Hover zone for sidebar - extends slightly beyond collapsed state */}
        <div
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
          className="hidden md:block fixed left-0 top-0 h-full z-40"
          style={{ width: sidebarOpen ? '16rem' : '3.5rem' }}
        >
          <AppSidebar />
        </div>
        {/* Spacer to push content */}
        <div className="hidden md:block w-12 flex-shrink-0" />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <Navbar isSaving={isSaving} />
          <main className="flex-1 overflow-auto pb-20 md:pb-6">
            {children}
          </main>
        </SidebarInset>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
