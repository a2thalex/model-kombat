import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import MainLayout from './components/layout/MainLayout'
import LandingPage from './features/landing/LandingPage'
import AuthPage from './features/auth/AuthPage'
import PricingPage from './features/pricing/PricingPage'
import AIStudio from './features/ai-studio/AIStudio'
import LLMConfigPage from './features/llm-config/LLMConfigPage'
import GeminiTest from './features/gemini-test/GeminiTest'
import LoadingSpinner from './components/ui/loading-spinner'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuthStore } from './store/auth'
import './styles/globals.css'

// Protected Route Component
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <MainLayout />
}

// Inner component that uses routing hooks
function AppRoutes() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/ffa" />} />
      <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/ffa" />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Protected Routes with Layout */}
      <Route element={<ProtectedRoute />}>
        <Route path="/ffa" element={<AIStudio />} />
        <Route path="/llm-config" element={<LLMConfigPage />} />
        <Route path="/gemini-test" element={<GeminiTest />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initAuth()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [initAuth])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
          <Toaster />
        </ErrorBoundary>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App