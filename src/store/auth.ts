import { create } from 'zustand'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '@/services/firebase'
import { logger } from '@/utils/logger'

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

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,

  initAuth: () => {
    set({ loading: true })

    // Check for redirect result first (when returning from OAuth redirect)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          logger.auth('Redirect sign-in successful', { email: result.user.email })
          const user = mapFirebaseUser(result.user)
          set({ user, isAuthenticated: true })
        }
      })
      .catch((error) => {
        logger.error('Redirect sign-in error', error)
      })

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        logger.auth('Auth state changed', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        })
      }
      const user = mapFirebaseUser(firebaseUser)
      logger.debug('Setting user in store', { user })
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
          logger.auth('Sign in with email successful', { email })
        } catch (error) {
          logger.error('Sign in error', error, { email })
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
          logger.auth('Sign up with email successful', { email })
        } catch (error) {
          logger.error('Sign up error', error, { email })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signInWithGoogle: async () => {
        set({ loading: true })
        try {
          // Use redirect in production for better COOP compatibility
          if (import.meta.env.PROD) {
            logger.info('Using redirect for Google sign-in (production)')
            await signInWithRedirect(auth, googleProvider)
            // The page will redirect, so loading state will be reset on return
            return
          }

          // Use popup in development
          const userCredential = await signInWithPopup(auth, googleProvider)
          logger.auth('Google sign-in successful', {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            emailVerified: userCredential.user.emailVerified
          })
          const user = mapFirebaseUser(userCredential.user)
          set({ user, isAuthenticated: true })
        } catch (error: any) {
          logger.error('Google sign in error', error)

          // If popup fails, fallback to redirect
          if (error.code === 'auth/popup-closed-by-user' ||
              error.code === 'auth/popup-blocked' ||
              error.message?.includes('Cross-Origin-Opener-Policy')) {
            logger.info('Popup failed, using redirect method')
            await signInWithRedirect(auth, googleProvider)
            return
          } else if (error.code === 'auth/cancelled-popup-request') {
            throw new Error('Another sign-in popup is already open.')
          } else if (error.code === 'auth/unauthorized-domain') {
            throw new Error('This domain is not authorized for OAuth. Please contact support.')
          }

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
          logger.auth('GitHub sign-in successful', { email: userCredential.user.email })
        } catch (error) {
          logger.error('GitHub sign in error', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        try {
          await firebaseSignOut(auth)
          set({ user: null, isAuthenticated: false })
          logger.auth('Sign out successful')
        } catch (error) {
          logger.error('Sign out error', error)
          throw error
        }
      },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user })
  }
}))