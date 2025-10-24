import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name?: string
  photoURL?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      loading: false,

      signInWithEmail: async (email: string, password: string) => {
        set({ loading: true })
        try {
          // Simulate authentication - replace with actual Firebase auth
          const mockUser: User = {
            id: 'user-' + Date.now(),
            email,
            name: email.split('@')[0]
          }
          set({ user: mockUser, isAuthenticated: true })
        } finally {
          set({ loading: false })
        }
      },

      signUpWithEmail: async (email: string, password: string) => {
        set({ loading: true })
        try {
          // Simulate sign up - replace with actual Firebase auth
          const mockUser: User = {
            id: 'user-' + Date.now(),
            email,
            name: email.split('@')[0]
          }
          set({ user: mockUser, isAuthenticated: true })
        } finally {
          set({ loading: false })
        }
      },

      signInWithGoogle: async () => {
        set({ loading: true })
        try {
          // Simulate Google sign in - replace with actual Firebase auth
          const mockUser: User = {
            id: 'google-' + Date.now(),
            email: 'user@gmail.com',
            name: 'Google User',
            photoURL: 'https://via.placeholder.com/150'
          }
          set({ user: mockUser, isAuthenticated: true })
        } finally {
          set({ loading: false })
        }
      },

      signInWithGithub: async () => {
        set({ loading: true })
        try {
          // Simulate GitHub sign in - replace with actual Firebase auth
          const mockUser: User = {
            id: 'github-' + Date.now(),
            email: 'user@github.com',
            name: 'GitHub User',
            photoURL: 'https://via.placeholder.com/150'
          }
          set({ user: mockUser, isAuthenticated: true })
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user })
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)