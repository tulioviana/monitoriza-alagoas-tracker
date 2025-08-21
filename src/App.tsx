
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/hooks/useAuth"
import { RoleProvider } from "@/contexts/RoleContext"
import { PlanProvider } from "@/contexts/PlanContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { initializeExtensionProtection } from "@/utils/extensionDetection"
import { useEffect } from "react"
import Index from "./pages/Index"

const queryClient = new QueryClient()

function App() {
  useEffect(() => {
    // Initialize extension protection on app startup
    initializeExtensionProtection();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light" // Changed default theme to light
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ErrorBoundary>
              <AuthProvider>
                <RoleProvider>
                  <PlanProvider>
                    <Toaster />
                  <BrowserRouter>
                    <ErrorBoundary>
                      <Routes>
                        <Route path="/" element={<Index />} />
                      </Routes>
                    </ErrorBoundary>
                  </BrowserRouter>
                  </PlanProvider>
                </RoleProvider>
              </AuthProvider>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
