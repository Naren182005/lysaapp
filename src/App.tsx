
import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import History from "./pages/History";
import MCQTest from "./pages/MCQTest";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import { UserProvider } from "@/contexts/UserContext";
import { OnlineModeProvider } from "@/contexts/OnlineModeContext";
import { initializeAccessibility } from "@/utils/accessibility";
// Remove App.css import to avoid style conflicts
// import './App.css';

const queryClient = new QueryClient();

const App = () => {
  // Initialize accessibility features
  useEffect(() => {
    initializeAccessibility();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ 
          v7_startTransition: true,
          v7_relativeSplatPath: true 
        }}>
          <UserProvider>
            <OnlineModeProvider>
              <TooltipProvider>
              <Routes>
                <Route path="/" element={
                  <ErrorBoundary>
                    <Index />
                  </ErrorBoundary>
                } />
                <Route path="/login" element={
                  <ErrorBoundary>
                    <Login />
                  </ErrorBoundary>
                } />
                <Route path="/history" element={
                  <ErrorBoundary>
                    <History />
                  </ErrorBoundary>
                } />
                <Route path="/mcq-test" element={
                  <ErrorBoundary>
                    <MCQTest />
                  </ErrorBoundary>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </TooltipProvider>
            </OnlineModeProvider>
          </UserProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;



