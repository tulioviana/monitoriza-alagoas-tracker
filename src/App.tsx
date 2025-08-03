
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/hooks/useAuth"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Index from "./pages/Index"

const queryClient = new QueryClient()

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ErrorBoundary>
              <AuthProvider>
                <Toaster />
                <BrowserRouter>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Index />} />
                    </Routes>
                  </ErrorBoundary>
                </BrowserRouter>
              </AuthProvider>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
