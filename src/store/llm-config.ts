import { create } from 'zustand'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/services/firebase'
import { openRouterService } from '@/services/openrouter'
import { LLMConfig, OpenRouterModel } from '@/types'
import { toast } from '@/hooks/use-toast'

interface LLMConfigState {
  // State
  config: LLMConfig | null
  models: OpenRouterModel[]
  loading: boolean
  isFetchingCatalog: boolean
  isTestingConnection: boolean
  lastError: string | null

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

// Helper function to encrypt API key (basic obfuscation, not true encryption)
// In production, you'd want to use a proper encryption service
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

export const useLLMConfigStore = create<LLMConfigState>((set, get) => ({
  // Initial state
  config: null,
  models: [],
  loading: false,
  isFetchingCatalog: false,
  isTestingConnection: false,
  lastError: null,

  // Load user's LLM configuration from Firestore
  loadConfig: async () => {
    const user = auth.currentUser
    if (!user) return

    set({ loading: true, lastError: null })

    try {
      const docRef = doc(db, 'llm-configs', user.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as LLMConfig

        // Initialize OpenRouter service if API key exists
        if (data.openRouterApiKey) {
          const apiKey = deobfuscateKey(data.openRouterApiKey)
          openRouterService.initialize(apiKey)

          // Try to fetch catalog if we have an API key
          try {
            await get().fetchModelCatalog()
          } catch (error) {
            console.error('Failed to fetch catalog on load:', error)
          }
        }

        set({ config: data })
      } else {
        // Create default config
        const defaultConfig: LLMConfig = {
          userId: user.uid,
          enabledModelIds: [],
          defaultRefinementRounds: 3,
        }
        await setDoc(docRef, defaultConfig)
        set({ config: defaultConfig })
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error)
      set({ lastError: 'Failed to load configuration' })
    } finally {
      set({ loading: false })
    }
  },

  // Save API key and test connection
  saveApiKey: async (apiKey: string) => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    set({ loading: true, lastError: null })

    try {
      // Initialize service with new key
      openRouterService.initialize(apiKey)

      // Test the connection
      const isValid = await get().testConnection(apiKey)
      if (!isValid) {
        throw new Error('Invalid API key or connection failed')
      }

      // Obfuscate and save
      const obfuscatedKey = obfuscateKey(apiKey)
      const docRef = doc(db, 'llm-configs', user.uid)

      await setDoc(docRef, {
        ...get().config,
        openRouterApiKey: obfuscatedKey,
        lastCatalogSync: new Date(),
      }, { merge: true })

      set(state => ({
        config: {
          ...state.config!,
          openRouterApiKey: obfuscatedKey,
          lastCatalogSync: new Date(),
        },
      }))

      // Fetch catalog after successful key save
      await get().fetchModelCatalog(true)

      toast({
        title: 'API Key Saved',
        description: 'Your OpenRouter API key has been saved successfully.',
      })
    } catch (error: any) {
      console.error('Failed to save API key:', error)
      set({ lastError: error.message })
      toast({
        title: 'Failed to Save API Key',
        description: error.message,
        variant: 'destructive',
      })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  // Test OpenRouter connection
  testConnection: async (apiKey?: string) => {
    set({ isTestingConnection: true, lastError: null })

    try {
      // Use provided key or existing one
      if (apiKey) {
        openRouterService.initialize(apiKey)
      } else if (!get().config?.openRouterApiKey) {
        throw new Error('No API key configured')
      }

      const isConnected = await openRouterService.testConnection()

      if (isConnected) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to OpenRouter API.',
        })
      } else {
        throw new Error('Connection test failed')
      }

      return isConnected
    } catch (error: any) {
      console.error('Connection test failed:', error)
      set({ lastError: error.message })
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      })
      return false
    } finally {
      set({ isTestingConnection: false })
    }
  },

  // Fetch model catalog from OpenRouter
  fetchModelCatalog: async (forceRefresh = false) => {
    set({ isFetchingCatalog: true, lastError: null })

    try {
      const models = await openRouterService.fetchModelCatalog(forceRefresh)
      set({ models })

      // Update last sync time
      const user = auth.currentUser
      if (user) {
        const docRef = doc(db, 'llm-configs', user.uid)
        await setDoc(docRef, {
          lastCatalogSync: new Date(),
        }, { merge: true })
      }

      toast({
        title: 'Catalog Updated',
        description: `Loaded ${models.length} models from OpenRouter.`,
      })
    } catch (error: any) {
      console.error('Failed to fetch model catalog:', error)
      set({ lastError: error.message })
      toast({
        title: 'Failed to Fetch Catalog',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      set({ isFetchingCatalog: false })
    }
  },

  // Toggle model enabled/disabled
  toggleModel: async (modelId: string, enabled: boolean) => {
    const user = auth.currentUser
    if (!user) return

    try {
      const currentConfig = get().config
      if (!currentConfig) return

      let enabledModelIds = [...(currentConfig.enabledModelIds || [])]

      if (enabled && !enabledModelIds.includes(modelId)) {
        enabledModelIds.push(modelId)
      } else if (!enabled) {
        enabledModelIds = enabledModelIds.filter(id => id !== modelId)
      }

      const docRef = doc(db, 'llm-configs', user.uid)
      await setDoc(docRef, { enabledModelIds }, { merge: true })

      set(state => ({
        config: {
          ...state.config!,
          enabledModelIds,
        },
      }))
    } catch (error) {
      console.error('Failed to toggle model:', error)
      toast({
        title: 'Failed to Update Model',
        description: 'Could not update model configuration.',
        variant: 'destructive',
      })
    }
  },

  // Set default refiner model
  setDefaultRefiner: async (modelId: string) => {
    const user = auth.currentUser
    if (!user) return

    try {
      const docRef = doc(db, 'llm-configs', user.uid)
      await setDoc(docRef, { defaultRefinerId: modelId }, { merge: true })

      set(state => ({
        config: {
          ...state.config!,
          defaultRefinerId: modelId,
        },
      }))
    } catch (error) {
      console.error('Failed to set default refiner:', error)
      toast({
        title: 'Failed to Update',
        description: 'Could not set default refiner model.',
        variant: 'destructive',
      })
    }
  },

  // Set default judge model
  setDefaultJudge: async (modelId: string) => {
    const user = auth.currentUser
    if (!user) return

    try {
      const docRef = doc(db, 'llm-configs', user.uid)
      await setDoc(docRef, { defaultJudgeId: modelId }, { merge: true })

      set(state => ({
        config: {
          ...state.config!,
          defaultJudgeId: modelId,
        },
      }))
    } catch (error) {
      console.error('Failed to set default judge:', error)
      toast({
        title: 'Failed to Update',
        description: 'Could not set default judge model.',
        variant: 'destructive',
      })
    }
  },

  // Set default refinement rounds
  setDefaultRounds: async (rounds: number) => {
    const user = auth.currentUser
    if (!user) return

    if (rounds < 1 || rounds > 10) {
      toast({
        title: 'Invalid Value',
        description: 'Refinement rounds must be between 1 and 10.',
        variant: 'destructive',
      })
      return
    }

    try {
      const docRef = doc(db, 'llm-configs', user.uid)
      await setDoc(docRef, { defaultRefinementRounds: rounds }, { merge: true })

      set(state => ({
        config: {
          ...state.config!,
          defaultRefinementRounds: rounds,
        },
      }))
    } catch (error) {
      console.error('Failed to set default rounds:', error)
      toast({
        title: 'Failed to Update',
        description: 'Could not set default refinement rounds.',
        variant: 'destructive',
      })
    }
  },

  // Clear configuration (for logout)
  clearConfig: () => {
    openRouterService.reset()
    set({
      config: null,
      models: [],
      loading: false,
      isFetchingCatalog: false,
      isTestingConnection: false,
      lastError: null,
    })
  },
}))