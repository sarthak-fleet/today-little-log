import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PersistentLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Journal from "./pages/Journal";
import Auth from "./pages/Auth";
import Life from "./pages/Life";
import Review from "./pages/Review";
import Patterns from "./pages/Patterns";
import NotFound from "./pages/NotFound";
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
          <ErrorBoundary>
            <Routes>
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Index />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/patterns" element={<Patterns />} />
                <Route path="/life" element={<Life />} />
                <Route path="/rituals" element={<Navigate to="/" replace />} />
                <Route path="/focus" element={<Navigate to="/" replace />} />
                <Route path="/memories" element={<Navigate to="/journal" replace />} />
                <Route path="/review" element={<Review />} />
                <Route path="/habits" element={<Navigate to="/" replace />} />
                <Route path="/tasks" element={<Navigate to="/" replace />} />
                <Route path="/eisenhower" element={<Navigate to="/" replace />} />
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
