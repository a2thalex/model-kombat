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

function App() {
  const [user, loading] = useAuthState(auth)

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