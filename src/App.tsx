import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
import { PersistentLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import { useAuth } from "./hooks/useAuth";
import { useTabTitleCountdown } from "./hooks/useTabTitleCountdown";

const Journal = lazy(() => import("./pages/Journal"));
const Habits = lazy(() => import("./pages/Habits"));
const Focus = lazy(() => import("./pages/Focus"));
const Auth = lazy(() => import("./pages/Auth"));
const Life = lazy(() => import("./pages/Life"));
const Review = lazy(() => import("./pages/Review"));
const Patterns = lazy(() => import("./pages/Patterns"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));

function DeferredAnalytics() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const schedule = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(schedule, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(schedule, 1);
    return () => clearTimeout(id);
  }, []);
  return ready ? <AnalyticsTracker /> : null;
}

const queryClient = new QueryClient();

function TabTitleCountdown() {
  useTabTitleCountdown();
  return null;
}

function LayoutWrapper() {
  return (
    <PersistentLayout>
      <Outlet />
    </PersistentLayout>
  );
}

/** Guest `/` skips app chrome so the static #lcp-shell stays the LCP element. */
function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <Index />;
  return (
    <PersistentLayout>
      <Index />
    </PersistentLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TabTitleCountdown />
          <DeferredAnalytics />
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route element={<LayoutWrapper />}>
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/habits" element={<Habits />} />
                  <Route path="/rituals" element={<Navigate to="/habits" replace />} />
                  <Route path="/focus" element={<Focus />} />
                  <Route path="/patterns" element={<Patterns />} />
                  <Route path="/life" element={<Life />} />
                  <Route path="/memories" element={<Navigate to="/journal" replace />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/tasks" element={<Navigate to="/" replace />} />
                  <Route path="/eisenhower" element={<Navigate to="/" replace />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/privacy" element={<Privacy />} />
                </Route>
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
