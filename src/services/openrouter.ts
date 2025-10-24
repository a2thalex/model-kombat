import axios, { AxiosInstance } from 'axios'
import Bottleneck from 'bottleneck'
import { OpenRouterModel } from '@/types'

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

export interface ChatCompletionRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  max_tokens?: number
  stream?: boolean
  response_format?: { type: 'json_object' }
}

export interface ChatCompletionResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ModelCatalogResponse {
  data: OpenRouterModel[]
}

class OpenRouterService {
  private client: AxiosInstance | null = null
  private limiter: Bottleneck
  private modelCache: Map<string, OpenRouterModel> = new Map()
  private catalogLastFetched: Date | null = null
  private readonly CATALOG_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  constructor() {
    // Rate limiter: 10 requests per second by default
    this.limiter = new Bottleneck({
      minTime: 100, // minimum 100ms between requests
      maxConcurrent: 5, // max 5 concurrent requests
      reservoir: 50, // 50 requests available
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60 * 1000, // refills every minute
    })
  }

  /**
   * Initialize the service with an API key
   */
  initialize(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required')
    }

    this.client = axios.create({
      baseURL: OPENROUTER_API_BASE,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Model Kombat',
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout
    })
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('OpenRouter client not initialized. Please set API key first.')
    }

    try {
      const response = await this.limiter.schedule(() =>
        this.client!.get('/models')
      )
      return response.status === 200
    } catch (error) {
      console.error('OpenRouter connection test failed:', error)
      return false
    }
  }

  /**
   * Fetch the model catalog from OpenRouter
   */
  async fetchModelCatalog(forceRefresh = false): Promise<OpenRouterModel[]> {
    if (!this.client) {
      throw new Error('OpenRouter client not initialized. Please set API key first.')
    }

    // Check cache
    if (!forceRefresh && this.catalogLastFetched && this.modelCache.size > 0) {
      const cacheAge = Date.now() - this.catalogLastFetched.getTime()
      if (cacheAge < this.CATALOG_CACHE_DURATION) {
        return Array.from(this.modelCache.values())
      }
    }

    try {
      const response = await this.limiter.schedule(() =>
        this.client!.get<ModelCatalogResponse>('/models')
      )

      const models = response.data.data || []

      // Update cache
      this.modelCache.clear()
      models.forEach(model => {
        this.modelCache.set(model.id, model)
      })
      this.catalogLastFetched = new Date()

      return models
    } catch (error) {
      console.error('Failed to fetch model catalog:', error)
      throw new Error('Failed to fetch model catalog. Please check your API key.')
    }
  }

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): OpenRouterModel | undefined {
    return this.modelCache.get(modelId)
  }

  /**
   * Get models that support JSON output
   */
  getJsonCapableModels(): OpenRouterModel[] {
    return Array.from(this.modelCache.values()).filter(
      model => model.capabilities?.supports_response_schema === true
    )
  }

  /**
   * Get models that support streaming
   */
  getStreamCapableModels(): OpenRouterModel[] {
    return Array.from(this.modelCache.values()).filter(
      model => model.capabilities?.supports_stream === true
    )
  }

  /**
   * Make a chat completion request
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
    onStream?: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.client) {
      throw new Error('OpenRouter client not initialized. Please set API key first.')
    }

    try {
      if (request.stream && onStream) {
        return await this.createStreamingCompletion(request, onStream)
      }

      const response = await this.limiter.schedule(() =>
        this.client!.post<ChatCompletionResponse>('/chat/completions', request)
      )

      return response.data
    } catch (error: any) {
      console.error('Chat completion failed:', error)
      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenRouter API key.')
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else if (error.response?.status === 404) {
        throw new Error(`Model ${request.model} not found or not available.`)
      }
      throw new Error(error.response?.data?.error?.message || 'Chat completion failed.')
    }
  }

  /**
   * Handle streaming chat completion
   */
  private async createStreamingCompletion(
    request: ChatCompletionRequest,
    onStream: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    const response = await this.limiter.schedule(() =>
      this.client!.post('/chat/completions', request, {
        responseType: 'stream',
      })
    )

    return new Promise((resolve, reject) => {
      let fullContent = ''
      let lastMessage: ChatCompletionResponse | null = null

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              if (lastMessage) {
                resolve(lastMessage)
              } else {
                reject(new Error('Stream ended without message'))
              }
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullContent += content
                onStream(content)
              }

              // Keep track of the last complete message structure
              if (parsed.choices?.[0]?.message) {
                lastMessage = {
                  ...parsed,
                  choices: [{
                    ...parsed.choices[0],
                    message: {
                      role: 'assistant',
                      content: fullContent,
                    },
                  }],
                }
              }
            } catch (e) {
              console.error('Failed to parse streaming chunk:', e)
            }
          }
        }
      })

      response.data.on('error', (error: Error) => {
        reject(error)
      })
    })
  }

  /**
   * Estimate cost for a completion
   */
  estimateCost(modelId: string, promptTokens: number, completionTokens: number): number {
    const model = this.modelCache.get(modelId)
    if (!model?.pricing) {
      return 0
    }

    const promptCost = (promptTokens * model.pricing.prompt) / 1_000_000
    const completionCost = (completionTokens * model.pricing.completion) / 1_000_000
    return promptCost + completionCost
  }

  /**
   * Clear the API key and reset the client
   */
  reset() {
    this.client = null
    this.modelCache.clear()
    this.catalogLastFetched = null
  }
}

// Export singleton instance
export const openRouterService = new OpenRouterService()

// Helper function to check if a model supports a specific capability
export function modelSupportsCapability(
  model: OpenRouterModel,
  capability: keyof NonNullable<OpenRouterModel['capabilities']>
): boolean {
  return model.capabilities?.[capability] === true
}