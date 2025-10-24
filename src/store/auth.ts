import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '@/services/firebase'

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
  initAuth: () => (() => void) | undefined
}

const mapFirebaseUser = (firebaseUser: FirebaseUser | null): User | null => {
  if (!firebaseUser) return null
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    photoURL: firebaseUser.photoURL || undefined
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      loading: false,

      initAuth: () => {
        set({ loading: true })
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          const user = mapFirebaseUser(firebaseUser)
          set({
            user,
            isAuthenticated: !!user,
            loading: false
          })
        })
        return unsubscribe
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          const user = mapFirebaseUser(userCredential.user)
          set({ user, isAuthenticated: true })
        } catch (error) {
          console.error('Sign in error:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signUpWithEmail: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const user = mapFirebaseUser(userCredential.user)
          set({ user, isAuthenticated: true })
        } catch (error) {
          console.error('Sign up error:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signInWithGoogle: async () => {
        set({ loading: true })
        try {
          const userCredential = await signInWithPopup(auth, googleProvider)
          const user = mapFirebaseUser(userCredential.user)
          set({ user, isAuthenticated: true })
        } catch (error) {
          console.error('Google sign in error:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signInWithGithub: async () => {
        set({ loading: true })
        try {
          const userCredential = await signInWithPopup(auth, githubProvider)
          const user = mapFirebaseUser(userCredential.user)
          set({ user, isAuthenticated: true })
        } catch (error) {
          console.error('GitHub sign in error:', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        try {
          await firebaseSignOut(auth)
          set({ user: null, isAuthenticated: false })
        } catch (error) {
          console.error('Sign out error:', error)
          throw error
        }
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