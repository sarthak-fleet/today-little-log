import { lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BottomNav } from './BottomNav';
import { Navbar } from './Navbar';
import { OfflineBanner } from './OfflineBanner';
import { SavingProvider, useSaving } from './SavingContext';

const AppSidebar = lazy(() =>
  import('./AppSidebar').then((m) => ({ default: m.AppSidebar })),
);
const ChatWidget = lazy(() =>
  import('./ChatWidget').then((m) => ({ default: m.ChatWidget })),
);

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChrome, setShowChrome] = useState(false);
  const { isSaving } = useSaving();

  useEffect(() => {
    const mark = () => setShowChrome(true);
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(mark, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(mark, 1);
    return () => clearTimeout(id);
  }, []);

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
          {showChrome ? (
            <Suspense fallback={null}>
              <AppSidebar />
            </Suspense>
          ) : null}
        </div>
        {/* Spacer to push content */}
        <div className="hidden md:block w-12 flex-shrink-0" />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <Navbar isSaving={isSaving} />
          <OfflineBanner />
          <main className="flex-1 overflow-auto pb-20 md:pb-6">
            {children}
          </main>
        </SidebarInset>
      </div>
      {showChrome ? <BottomNav /> : null}
      {showChrome ? (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      ) : null}
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
