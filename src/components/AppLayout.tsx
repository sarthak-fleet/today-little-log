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
        <div
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
          className="hidden md:block"
        >
          <AppSidebar />
        </div>
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
