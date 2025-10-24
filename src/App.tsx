import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import MainLayout from './components/layout/MainLayout'
import LandingPage from './features/landing/LandingPage'
import AuthPage from './features/auth/AuthPage'
import AIStudio from './features/ai-studio/AIStudio'
import LLMConfigPage from './features/llm-config/LLMConfigPage'
import LoadingSpinner from './components/ui/loading-spinner'
import { useAuthStore } from './store/auth'
import './styles/globals.css'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

function App() {
  const { isAuthenticated, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/ai-studio" />} />
        <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/ai-studio" />} />

        {/* Protected Routes with Layout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/ai-studio" element={<AIStudio />} />
          <Route path="/llm-config" element={<LLMConfigPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App