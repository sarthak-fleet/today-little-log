import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PersistentLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Schedule from "./pages/Schedule";
import Rules from "./pages/Rules";
import Habits from "./pages/Habits";
import Tasks from "./pages/Tasks";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <ErrorBoundary>
            <Routes>
              {/* Routes with persistent sidebar layout */}
              <Route element={<LayoutWrapper />}>
                <Route path="/" element={<Index />} />
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
