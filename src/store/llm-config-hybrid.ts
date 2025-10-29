import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/services/firebase'
import { openRouterService } from '@/services/openrouter'
import { LLMConfig, OpenRouterModel } from '@/types'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/utils/logger'

interface LLMConfigState {
  // State
  config: LLMConfig | null
  models: OpenRouterModel[]
  loading: boolean
  isFetchingCatalog: boolean
  isTestingConnection: boolean
  lastError: string | null
  storageMode: 'firestore' | 'local'

  // Actions
  loadConfig: () => Promise<void>
  saveApiKey: (apiKey: string) => Promise<void>
  testConnection: (apiKey?: string) => Promise<boolean>
  fetchModelCatalog: (forceRefresh?: boolean) => Promise<void>
  toggleModel: (modelId: string, enabled: boolean) => Promise<void>
  setDefaultRefiner: (modelId: string) => Promise<void>
  setDefaultJudge: (modelId: string) => Promise<void>
  setDefaultRounds: (rounds: number) => Promise<void>
  clearConfig: () => void
}

// Helper function to encrypt API key (basic obfuscation)
function obfuscateKey(key: string): string {
  return btoa(key).split('').reverse().join('')
}

function deobfuscateKey(obfuscated: string): string {
  try {
    return atob(obfuscated.split('').reverse().join(''))
  } catch {
    return ''
  }
}

// Helper function to get user ID
function getUserId(): string | null {
  const user = auth.currentUser
  // In development, use a test user ID
  return user?.uid || (import.meta.env.DEV ? 'dev-test-user' : null)
}

// Check if Firestore is available (with timeout for faster failure)
async function isFirestoreAvailable(): Promise<boolean> {
  const userId = getUserId()
  if (!userId || !auth.currentUser) return false

  // Create a timeout promise
  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), 2000) // 2 second timeout
  })

  // Create the Firestore check promise
  const firestoreCheck = async (): Promise<boolean> => {
    try {
      const docRef = doc(db, 'llm-configs', userId)
      await getDoc(docRef)
      return true
    } catch (error: any) {
      // Check if it's a 400 error (Firestore not initialized)
      if (error?.code === 'failed-precondition' || error?.message?.includes('400')) {
        logger.info('Firestore not available, using localStorage')
        return false
      }
      // For other errors, still try Firestore
      return true
    }
  }

  // Race between timeout and Firestore check
  return Promise.race([firestoreCheck(), timeoutPromise])
}

export const useLLMConfigStore = create<LLMConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: null,
      models: [],
      loading: false,
      isFetchingCatalog: false,
      isTestingConnection: false,
      lastError: null,
      storageMode: 'local',

      // Load configuration - optimized for faster initial load
      loadConfig: async () => {
        const userId = getUserId()
        if (!userId) {
          set({ loading: false })
          return
        }

        // Get existing state from localStorage immediately
        const existingState = get()
        const hasLocalConfig = existingState.config?.openRouterApiKey

        // If we have local config, use it immediately to avoid blocking
        if (hasLocalConfig) {
          const apiKey = deobfuscateKey(existingState.config!.openRouterApiKey!)
          openRouterService.initialize(apiKey)
          set({ loading: false, config: existingState.config })

          // Debug: Log that we found and loaded the API key
          logger.debug('Loaded saved API key from localStorage', {
            hasKey: !!existingState.config?.openRouterApiKey,
            keyLength: existingState.config?.openRouterApiKey?.length || 0
          })

          // Check if models need refresh in background
          const lastFetched = existingState.config?.catalogLastFetched
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
          if (!lastFetched || lastFetched < oneHourAgo) {
            // Don't await - let it run in background
            get().fetchModelCatalog().catch((error) => logger.error('Background catalog fetch failed', error))
          }
        } else {
          // Only show loading if we don't have local config
          set({ loading: true, lastError: null })
        }

        // Skip Firestore check if not authenticated
        if (!auth.currentUser) {
          set({ storageMode: 'local', loading: false })
          return
        }

        // Check Firestore in background (don't block UI)
        isFirestoreAvailable().then(async (firestoreAvailable) => {
          if (!firestoreAvailable || !auth.currentUser) {
            set({ storageMode: 'local' })
            return
          }

          try {
            const docRef = doc(db, 'llm-configs', userId)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
              const data = docSnap.data() as LLMConfig

              // Only update if Firestore has newer data
              const localLastModified = existingState.config?.catalogLastFetched
              const firestoreLastModified = data.catalogLastFetched

              if (!localLastModified || (firestoreLastModified && firestoreLastModified > localLastModified)) {
                // Initialize OpenRouter service if API key exists
                if (data.openRouterApiKey) {
                  const apiKey = deobfuscateKey(data.openRouterApiKey)
                  openRouterService.initialize(apiKey)
                }
                set({ config: data, storageMode: 'firestore' })
              } else {
                set({ storageMode: 'firestore' })
              }
            } else if (!hasLocalConfig) {
              // Only create default if we don't have local config
              const defaultConfig: LLMConfig = {
                userId,
                enabledModelIds: [],
                defaultRefinementRounds: 3,
              }
              await setDoc(docRef, defaultConfig)
              set({ config: defaultConfig, storageMode: 'firestore' })
            }
          } catch (error) {
            logger.error('Firestore sync failed', error)
            set({ storageMode: 'local' })
          }
        }).finally(() => {
          set({ loading: false })
        })
      },

      // Save API key
      saveApiKey: async (apiKey: string) => {
        const userId = getUserId()
        if (!userId) return

        set({ loading: true, lastError: null })

        try {
          const obfuscatedKey = obfuscateKey(apiKey)
          const config = get().config || {
            userId,
            enabledModelIds: [],
            defaultRefinementRounds: 3,
          }

          const updatedConfig: LLMConfig = {
            ...config,
            openRouterApiKey: obfuscatedKey,
          }

          // Try to save to Firestore if in firestore mode
          if (get().storageMode === 'firestore' && auth.currentUser) {
            try {
              const docRef = doc(db, 'llm-configs', userId)
              await setDoc(docRef, updatedConfig)
            } catch (error) {
              logger.error('Failed to save to Firestore', error)
              // Don't fail, localStorage will handle it
            }
          }

          // Initialize OpenRouter service
          openRouterService.initialize(apiKey)

          // Update local state (also persisted to localStorage)
          set({ config: updatedConfig })

          // Debug: Check if it's actually saved
          logger.debug('API Key saved', {
            storageMode: get().storageMode,
            configSaved: !!updatedConfig.openRouterApiKey,
            keyLength: obfuscatedKey.length
          })

          toast({
            title: 'API Key Saved',
            description: `Configuration saved to ${get().storageMode === 'firestore' ? 'cloud' : 'local'} storage`,
          })
        } catch (error) {
          logger.error('Failed to save API key', error)
          set({ lastError: 'Failed to save API key' })
          toast({
            title: 'Error',
            description: 'Failed to save API key',
            variant: 'destructive',
          })
        } finally {
          set({ loading: false })
        }
      },

      // Test connection
      testConnection: async (apiKey?: string) => {
        set({ isTestingConnection: true, lastError: null })

        try {
          const config = get().config
          const keyToTest = apiKey || (config?.openRouterApiKey ? deobfuscateKey(config.openRouterApiKey) : '')

          if (!keyToTest) {
            throw new Error('No API key provided')
          }

          // Initialize service with the key to test
          if (apiKey) {
            openRouterService.initialize(apiKey)
          }

          // Test by fetching models
          const models = await openRouterService.fetchModelCatalog()

          if (models && models.length > 0) {
            toast({
              title: 'Connection Successful',
              description: `Found ${models.length} available models`,
            })
            return true
          } else {
            throw new Error('No models returned')
          }
        } catch (error: any) {
          logger.error('Connection test failed', error)
          const errorMessage = error?.message || 'Connection failed'
          set({ lastError: errorMessage })

          toast({
            title: 'Connection Failed',
            description: errorMessage,
            variant: 'destructive',
          })
          return false
        } finally {
          set({ isTestingConnection: false })
        }
      },

      // Fetch model catalog
      fetchModelCatalog: async (forceRefresh = false) => {
        // Skip if already fetching
        if (get().isFetchingCatalog) {
          logger.debug('Already fetching catalog, skipping')
          return
        }

        // Check if we have recent models and skip if not forcing refresh
        if (!forceRefresh) {
          const lastFetched = get().config?.catalogLastFetched
          if (lastFetched) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
            if (lastFetched > fiveMinutesAgo && get().models.length > 0) {
              logger.debug('Models are fresh, skipping fetch')
              return
            }
          }
        }

        set({ isFetchingCatalog: true, lastError: null })

        try {
          const models = await openRouterService.fetchModelCatalog(forceRefresh)
          set({ models })

          // Update catalog fetch time without auto-enabling any models
          const config = get().config
          if (config) {
            const updatedConfig: LLMConfig = {
              ...config,
              // Keep existing enabled models (or empty array if none)
              enabledModelIds: config.enabledModelIds || [],
              catalogLastFetched: new Date().toISOString(),
            }

            // Try to save to Firestore if in firestore mode
            if (get().storageMode === 'firestore' && auth.currentUser) {
              try {
                const docRef = doc(db, 'llm-configs', config.userId)
                await setDoc(docRef, updatedConfig)
              } catch {
                // Ignore Firestore errors, localStorage will handle it
              }
            }

            set({ config: updatedConfig })

            toast({
              title: '✅ Models Loaded',
              description: `Loaded ${models.length} models from OpenRouter catalog`,
            })
          } else {
            toast({
              title: 'Models Loaded',
              description: `Loaded ${models.length} models from OpenRouter`,
            })
          }
        } catch (error: any) {
          logger.error('Failed to fetch model catalog', error)
          const errorMessage = error?.message || 'Failed to fetch models'
          set({ lastError: errorMessage })

          toast({
            title: 'Error Loading Models',
            description: errorMessage,
            variant: 'destructive',
          })
        } finally {
          set({ isFetchingCatalog: false })
        }
      },

      // Toggle model enabled status
      toggleModel: async (modelId: string, enabled: boolean) => {
        const config = get().config
        if (!config) return

        const enabledModelIds = enabled
          ? [...(config.enabledModelIds || []), modelId]
          : (config.enabledModelIds || []).filter(id => id !== modelId)

        const updatedConfig: LLMConfig = {
          ...config,
          enabledModelIds,
        }

        // Try to save to Firestore if in firestore mode
        if (get().storageMode === 'firestore' && auth.currentUser) {
          try {
            const docRef = doc(db, 'llm-configs', config.userId)
            await setDoc(docRef, updatedConfig)
          } catch {
            // Ignore Firestore errors
          }
        }

        set({ config: updatedConfig })
      },

      // Set default refiner model
      setDefaultRefiner: async (modelId: string) => {
        const config = get().config
        if (!config) return

        const updatedConfig: LLMConfig = {
          ...config,
          defaultRefinerId: modelId,
        }

        // Try to save to Firestore if in firestore mode
        if (get().storageMode === 'firestore' && auth.currentUser) {
          try {
            const docRef = doc(db, 'llm-configs', config.userId)
            await setDoc(docRef, updatedConfig)
          } catch {
            // Ignore Firestore errors
          }
        }

        set({ config: updatedConfig })
      },

      // Set default judge model
      setDefaultJudge: async (modelId: string) => {
        const config = get().config
        if (!config) return

        const updatedConfig: LLMConfig = {
          ...config,
          defaultJudgeId: modelId,
        }

        // Try to save to Firestore if in firestore mode
        if (get().storageMode === 'firestore' && auth.currentUser) {
          try {
            const docRef = doc(db, 'llm-configs', config.userId)
            await setDoc(docRef, updatedConfig)
          } catch {
            // Ignore Firestore errors
          }
        }

        set({ config: updatedConfig })
      },

      // Set default refinement rounds
      setDefaultRounds: async (rounds: number) => {
        const config = get().config
        if (!config) return

        const updatedConfig: LLMConfig = {
          ...config,
          defaultRefinementRounds: rounds,
        }

        // Try to save to Firestore if in firestore mode
        if (get().storageMode === 'firestore' && auth.currentUser) {
          try {
            const docRef = doc(db, 'llm-configs', config.userId)
            await setDoc(docRef, updatedConfig)
          } catch {
            // Ignore Firestore errors
          }
        }

        set({ config: updatedConfig })
      },

      // Clear configuration
      clearConfig: () => {
        set({
          config: null,
          models: [],
          loading: false,
          isFetchingCatalog: false,
          isTestingConnection: false,
          lastError: null,
        })
      },
    }),
    {
      name: 'model-kombat-llm-config',
      partialize: (state) => ({
        config: state.config,
        models: state.models,
      }),
    }
  )
)