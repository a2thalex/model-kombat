import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/services/firebase'
import { openRouterService } from '@/services/openrouter'
import { LLMConfig, OpenRouterModel } from '@/types'
import { toast } from '@/hooks/use-toast'
import { FLAGSHIP_MODEL_IDS } from '@/utils/flagship-models'

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

// Check if Firestore is available
async function isFirestoreAvailable(): Promise<boolean> {
  const userId = getUserId()
  if (!userId || !auth.currentUser) return false

  try {
    const docRef = doc(db, 'llm-configs', userId)
    await getDoc(docRef)
    return true
  } catch (error: any) {
    // Check if it's a 400 error (Firestore not initialized)
    if (error?.code === 'failed-precondition' || error?.message?.includes('400')) {
      console.log('Firestore not available, using localStorage')
      return false
    }
    // For other errors, still try Firestore
    return true
  }
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

      // Load configuration - tries Firestore first, falls back to localStorage
      loadConfig: async () => {
        const userId = getUserId()
        if (!userId) return

        set({ loading: true, lastError: null })

        // Check if Firestore is available
        const firestoreAvailable = await isFirestoreAvailable()

        if (firestoreAvailable && auth.currentUser) {
          // Try Firestore first
          try {
            const docRef = doc(db, 'llm-configs', userId)
            const docSnap = await getDoc(docRef)

            if (docSnap.exists()) {
              const data = docSnap.data() as LLMConfig

              // Initialize OpenRouter service if API key exists
              if (data.openRouterApiKey) {
                const apiKey = deobfuscateKey(data.openRouterApiKey)
                openRouterService.initialize(apiKey)

                // Try to fetch catalog
                try {
                  await get().fetchModelCatalog()
                } catch (error) {
                  console.error('Failed to fetch catalog on load:', error)
                }
              }

              set({ config: data, storageMode: 'firestore' })
            } else {
              // Create default config in Firestore
              const defaultConfig: LLMConfig = {
                userId,
                enabledModelIds: [],
                defaultRefinementRounds: 3,
              }
              await setDoc(docRef, defaultConfig)
              set({ config: defaultConfig, storageMode: 'firestore' })
            }

            set({ loading: false })
            return
          } catch (error) {
            console.error('Firestore failed, falling back to localStorage:', error)
          }
        }

        // Fallback to localStorage
        set({ storageMode: 'local' })

        // Load from localStorage (handled by Zustand persist)
        const storedState = get()
        if (storedState.config?.openRouterApiKey) {
          const apiKey = deobfuscateKey(storedState.config.openRouterApiKey)
          openRouterService.initialize(apiKey)
        }

        set({ loading: false })
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
              console.error('Failed to save to Firestore:', error)
              // Don't fail, localStorage will handle it
            }
          }

          // Initialize OpenRouter service
          openRouterService.initialize(apiKey)

          // Update local state (also persisted to localStorage)
          set({ config: updatedConfig })

          toast({
            title: 'API Key Saved',
            description: `Configuration saved to ${get().storageMode === 'firestore' ? 'cloud' : 'local'} storage`,
          })
        } catch (error) {
          console.error('Failed to save API key:', error)
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
          const keyToTest = apiKey || (get().config?.openRouterApiKey ? deobfuscateKey(get().config.openRouterApiKey!) : '')

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
          console.error('Connection test failed:', error)
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
        set({ isFetchingCatalog: true, lastError: null })

        try {
          const models = await openRouterService.fetchModelCatalog(forceRefresh)
          set({ models })

          // Auto-enable flagship models
          const config = get().config
          if (config) {
            // Find all flagship models from the fetched catalog
            const flagshipModels = models.filter(model =>
              FLAGSHIP_MODEL_IDS.some(flagshipId => {
                const modelIdLower = model.id.toLowerCase()
                const flagshipIdLower = flagshipId.toLowerCase()
                // Check if the model ID matches or contains the flagship ID
                return modelIdLower === flagshipIdLower ||
                       modelIdLower.includes(flagshipIdLower.split('/')[1] || flagshipIdLower) ||
                       flagshipIdLower.includes(modelIdLower.split('/')[1] || modelIdLower)
              })
            )

            // Combine existing enabled models with flagship models
            const existingEnabled = config.enabledModelIds || []
            const flagshipIds = flagshipModels.map(m => m.id)
            const allEnabledIds = [...new Set([...existingEnabled, ...flagshipIds])]

            const updatedConfig: LLMConfig = {
              ...config,
              enabledModelIds: allEnabledIds,
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

            if (flagshipModels.length > 0) {
              toast({
                title: '🚀 Models Loaded & Flagship Models Enabled',
                description: `Loaded ${models.length} models, auto-enabled ${flagshipModels.length} flagship models`,
              })
            } else {
              toast({
                title: 'Models Loaded',
                description: `Loaded ${models.length} models from OpenRouter`,
              })
            }
          } else {
            toast({
              title: 'Models Loaded',
              description: `Loaded ${models.length} models from OpenRouter`,
            })
          }
        } catch (error: any) {
          console.error('Failed to fetch model catalog:', error)
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
          defaultRefinerModel: modelId,
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
          defaultJudgeModel: modelId,
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