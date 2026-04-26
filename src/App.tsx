import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PersistentLayout } from "./components/AppLayout";
import { saasmaker } from "./lib/saasmaker";
import { SaaSMakerFeedback } from "./components/saasmaker-feedback";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Habits from "./pages/Habits";
import Tasks from "./pages/Tasks";
import Life from "./pages/Life";
import Eisenhower from "./pages/Eisenhower";
import Memories from "./pages/Memories";
import Rituals from "./pages/Rituals";
import Focus from "./pages/Focus";
import Review from "./pages/Review";
import NotFound from "./pages/NotFound";
import { useTabTitleCountdown } from "./hooks/useTabTitleCountdown";

const queryClient = new QueryClient();

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    saasmaker.analytics.track({ name: 'page_view', url: location.pathname }).catch(() => {});
  }, [location.pathname]);
  return null;
}

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageViewTracker />
          <TabTitleCountdown />
          <SaaSMakerFeedback />
          <ErrorBoundary>
            <Routes>
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Index />} />
                <Route path="/rituals" element={<Rituals />} />
                <Route path="/focus" element={<Focus />} />
                <Route path="/memories" element={<Memories />} />
                <Route path="/review" element={<Review />} />
                <Route path="/life" element={<Life />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/eisenhower" element={<Eisenhower />} />
              </Route>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
