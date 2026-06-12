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
import Journal from "./pages/Journal";
import Habits from "./pages/Habits";
import Rituals from "./pages/Rituals";
import Focus from "./pages/Focus";
import Auth from "./pages/Auth";
import Life from "./pages/Life";
import Review from "./pages/Review";
import Patterns from "./pages/Patterns";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import { useTabTitleCountdown } from "./hooks/useTabTitleCountdown";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TabTitleCountdown />
          <AnalyticsTracker />
          <ErrorBoundary>
            <Routes>
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Index />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/rituals" element={<Rituals />} />
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
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
