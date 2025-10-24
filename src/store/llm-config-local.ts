import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

// Simple obfuscation for localStorage
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

export const useLLMConfigStore = create<LLMConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: {
        userId: 'local-user',
        enabledModelIds: [],
        defaultRefinementRounds: 3,
      } as LLMConfig,
      models: [],
      loading: false,
      isFetchingCatalog: false,
      isTestingConnection: false,
      lastError: null,

      // Load config from localStorage
      loadConfig: async () => {
        // Config is automatically loaded by zustand persist
        const config = get().config

        // Initialize OpenRouter if we have an API key
        if (config?.openRouterApiKey) {
          const apiKey = deobfuscateKey(config.openRouterApiKey)
          openRouterService.initialize(apiKey)

          // Try to fetch catalog
          try {
            await get().fetchModelCatalog()
          } catch (error) {
            console.error('Failed to fetch catalog on load:', error)
          }
        }
      },

      // Save API key
      saveApiKey: async (apiKey: string) => {
        set({ loading: true, lastError: null })

        try {
          // Initialize service with new key
          openRouterService.initialize(apiKey)

          // Test the connection
          const isValid = await get().testConnection(apiKey)
          if (!isValid) {
            throw new Error('Invalid API key or connection failed')
          }

          // Save to state
          const obfuscatedKey = obfuscateKey(apiKey)
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
          } else if (get().config?.openRouterApiKey) {
            const savedKey = deobfuscateKey(get().config!.openRouterApiKey)
            if (savedKey) {
              openRouterService.initialize(savedKey)
            } else {
              throw new Error('Failed to decode API key')
            }
          } else {
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
          set({
            models,
            config: {
              ...get().config!,
              lastCatalogSync: new Date(),
            }
          })

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
        const currentConfig = get().config
        if (!currentConfig) return

        let enabledModelIds = [...(currentConfig.enabledModelIds || [])]

        if (enabled && !enabledModelIds.includes(modelId)) {
          enabledModelIds.push(modelId)
        } else if (!enabled) {
          enabledModelIds = enabledModelIds.filter(id => id !== modelId)
        }

        set(state => ({
          config: {
            ...state.config!,
            enabledModelIds,
          },
        }))
      },

      // Set default refiner model
      setDefaultRefiner: async (modelId: string) => {
        set(state => ({
          config: {
            ...state.config!,
            defaultRefinerId: modelId,
          },
        }))
      },

      // Set default judge model
      setDefaultJudge: async (modelId: string) => {
        set(state => ({
          config: {
            ...state.config!,
            defaultJudgeId: modelId,
          },
        }))
      },

      // Set default refinement rounds
      setDefaultRounds: async (rounds: number) => {
        if (rounds < 1 || rounds > 10) {
          toast({
            title: 'Invalid Value',
            description: 'Refinement rounds must be between 1 and 10.',
            variant: 'destructive',
          })
          return
        }

        set(state => ({
          config: {
            ...state.config!,
            defaultRefinementRounds: rounds,
          },
        }))
      },

      // Clear configuration
      clearConfig: () => {
        openRouterService.reset()
        set({
          config: {
            userId: 'local-user',
            enabledModelIds: [],
            defaultRefinementRounds: 3,
          } as LLMConfig,
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
      partialize: (state) => ({ config: state.config }),
    }
  )
)