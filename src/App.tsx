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
import Schedule from "./pages/Schedule";
import Rules from "./pages/Rules";
import Habits from "./pages/Habits";
import Tasks from "./pages/Tasks";
import Install from "./pages/Install";
import Life from "./pages/Life";
import Weight from "./pages/Weight";
import Dev from "./pages/Dev";
import Eisenhower from "./pages/Eisenhower";
import Food from "./pages/Food";
import Goals from "./pages/Goals";
import WhatToDo from "./pages/WhatToDo";
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
              {/* Routes with persistent sidebar layout */}
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Index />} />
                <Route path="/life" element={<Life />} />
                <Route path="/weight" element={<Weight />} />
                <Route path="/dev" element={<Dev />} />
                <Route path="/eisenhower" element={<Eisenhower />} />
                <Route path="/food" element={<Food />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/now" element={<WhatToDo />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/tasks" element={<Tasks />} />
              </Route>
              {/* Routes without layout */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
