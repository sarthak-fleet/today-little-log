import { ReactNode, useState } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { ChatBot } from './ChatBot';
import { Navbar } from './Navbar';
import { SavingProvider, useSaving } from './SavingContext';
import { FooterStamp } from './FooterStamp';
import { ShockCard } from './ShockCard';
import { QuickLogFab } from './QuickLogFab';
import { UrgeButton } from './UrgeButton';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSaving } = useSaving();

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
      <ChatBot />
      <FooterStamp />
      <ShockCard />
      <QuickLogFab />
      <UrgeButton />
    </SidebarProvider>
  );
}

/** Wraps AppLayout so it persists across route changes. Use in router. */
export function PersistentLayout({ children }: { children: ReactNode }) {
  return (
    <SavingProvider>
      <AppLayout>{children}</AppLayout>
    </SavingProvider>
  );
}
