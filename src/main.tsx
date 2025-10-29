import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/globals.css'
import { validateEnv, printValidationResults } from './utils/env-validation'

// Validate environment variables at startup
const envValidation = validateEnv()
printValidationResults(envValidation)

// In production, fail fast if critical errors exist
if (!envValidation.valid && import.meta.env.PROD) {
  console.error('❌ Critical environment configuration errors detected. App cannot start.')
  console.error('Errors:', envValidation.errors)
  throw new Error('Environment validation failed. Check console for details.')
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)