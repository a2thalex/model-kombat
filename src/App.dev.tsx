// Development version with optional auth bypass
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from './services/firebase'
import { Toaster } from './components/ui/toaster'
import MainLayout from './components/layout/MainLayout'
import LoginPage from './features/auth/LoginPage'
import ProjectsPage from './features/projects/ProjectsPage'
import ProjectDetailPage from './features/projects/ProjectDetailPage'
import NewProjectPage from './features/projects/NewProjectPage'
import LLMConfigPage from './features/llm-config/LLMConfigPage'
import LoadingSpinner from './components/ui/loading-spinner'

// DEV MODE: Set to true to bypass authentication
const BYPASS_AUTH = true

function App() {
  const [user, loading] = useAuthState(auth)

  // Development bypass
  if (BYPASS_AUTH && import.meta.env.DEV) {
    return (
      <>
        <div className="bg-yellow-100 text-yellow-800 text-center py-2 text-sm">
          ⚠️ Development Mode: Authentication Bypassed
        </div>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/new" element={<NewProjectPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="llm-config" element={<LLMConfigPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="llm-config" element={<LLMConfigPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}

export default App