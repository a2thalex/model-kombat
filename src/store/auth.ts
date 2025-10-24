import { create } from 'zustand'
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

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,

  initAuth: () => {
    set({ loading: true })
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('Auth state changed - Firebase user:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        })
      }
      const user = mapFirebaseUser(firebaseUser)
      console.log('Setting user in store:', user)
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
          console.log('Firebase user data:', {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL,
            emailVerified: userCredential.user.emailVerified
          })
          const user = mapFirebaseUser(userCredential.user)
          console.log('Mapped user data:', user)
          set({ user, isAuthenticated: true })
        } catch (error: any) {
          console.error('Google sign in error:', error)

          // Better error messages for common issues
          if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in popup was closed. Please try again.')
          } else if (error.code === 'auth/popup-blocked') {
            throw new Error('Popup was blocked by your browser. Please allow popups for this site.')
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
}))