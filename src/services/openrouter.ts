import axios, { AxiosInstance } from 'axios'
import Bottleneck from 'bottleneck'
import { OpenRouterModel } from '@/types'
import { logger } from '@/utils/logger'

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1'

// Multimodal content types for vision and audio models
export type MessageContent =
  | string
  | Array<{
      type: 'text' | 'image_url'
      text?: string
      image_url?: {
        url: string // Can be URL or base64 data URL
      }
    }>

export interface ChatCompletionRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: MessageContent
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
      timeout: 120000, // 120 second timeout for slower models
      // Fix for HTTP/2 protocol errors
      httpAgent: undefined,
      httpsAgent: undefined,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
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
      logger.error('OpenRouter connection test failed', error)
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
      logger.error('Failed to fetch model catalog', error)
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
      model =>
        // Check if model supports response_format or structured_outputs parameter
        model.supported_parameters?.includes('response_format') ||
        model.supported_parameters?.includes('structured_outputs') ||
        model.capabilities?.supports_response_schema === true // Backward compatibility
    )
  }

  /**
   * Get models that support streaming
   */
  getStreamCapableModels(): OpenRouterModel[] {
    // Most models on OpenRouter support streaming by default
    // Stream is not explicitly listed in supported_parameters
    return Array.from(this.modelCache.values())
  }

  /**
   * Get models that support vision (image inputs)
   */
  getVisionCapableModels(): OpenRouterModel[] {
    return Array.from(this.modelCache.values()).filter(
      model => model.architecture?.input_modalities?.includes('image')
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

    // Debug logging for troubleshooting
    logger.apiCall('POST', '/chat/completions', {
      model: request.model,
      messageCount: request.messages.length,
      temperature: request.temperature,
      hasApiKey: !!this.client
    })

    try {
      if (request.stream && onStream) {
        return await this.createStreamingCompletion(request, onStream)
      }

      const response = await this.limiter.schedule(() =>
        this.client!.post<ChatCompletionResponse>('/chat/completions', request)
      )

      return response.data
    } catch (error: any) {
      logger.error('Chat completion failed', error, {
        model: request.model,
        errorResponse: error.response?.data,
        errorCode: error.code,
        errorMessage: error.message
      })

      // Handle HTTP/2 protocol errors (Chrome/network issue)
      if (error.message?.includes('ERR_HTTP2_PROTOCOL_ERROR') || error.code === 'ERR_HTTP2_PROTOCOL_ERROR') {
        throw new Error('Network protocol error. Please refresh the page and try again.')
      }

      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }

      if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || 'Invalid request'
        logger.error('400 Error details', error, { errorMsg })
        throw new Error(`Bad Request: ${errorMsg}. Check your API key and model selection.`)
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenRouter API key.')
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else if (error.response?.status === 404) {
        throw new Error(`Model ${request.model} not found or not available.`)
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout after 2 minutes. The model might be overloaded. Try a different model or try again later.')
      }
      throw new Error(error.response?.data?.error?.message || error.message || 'Chat completion failed.')
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
              logger.error('Failed to parse streaming chunk', e)
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
  capability: string
): boolean {
  // Map old capability names to new checks
  switch (capability) {
    case 'supports_response_schema':
    case 'json_mode':
      return model.supported_parameters?.includes('response_format') ||
             model.supported_parameters?.includes('structured_outputs') ||
             false
    case 'supports_vision':
    case 'vision':
      return model.architecture?.input_modalities?.includes('image') || false
    case 'supports_stream':
      // Most models support streaming on OpenRouter
      return true
    case 'supports_functions':
    case 'function_calling':
      return model.supported_parameters?.includes('tools') ||
             model.supported_parameters?.includes('tool_choice') ||
             false
    default:
      // Check if it's directly in supported_parameters
      return model.supported_parameters?.includes(capability) || false
  }
}

/**
 * Helper to create a multimodal message with text and images
 */
export function createMultimodalMessage(
  role: 'user' | 'assistant' | 'system',
  text: string,
  imageUrls?: string[]
): { role: 'user' | 'assistant' | 'system'; content: MessageContent } {
  if (!imageUrls || imageUrls.length === 0) {
    return { role, content: text }
  }

  const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text }
  ]

  imageUrls.forEach(url => {
    content.push({
      type: 'image_url',
      image_url: { url }
    })
  })

  return { role, content }
}

/**
 * Helper to format base64 image for API
 */
export function formatBase64Image(base64: string, mimeType: string = 'image/jpeg'): string {
  // If already has data URL prefix, return as is
  if (base64.startsWith('data:')) {
    return base64
  }
  // Add data URL prefix
  return `data:${mimeType};base64,${base64}`
}

/**
 * Helper to create a message with uploaded files
 */
export function createMessageWithFiles(
  text: string,
  files: Array<{ url?: string; base64?: string; type: string }>
): MessageContent {
  const imageFiles = files.filter(f => f.type.startsWith('image/'))

  if (imageFiles.length === 0) {
    return text
  }

  const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text }
  ]

  imageFiles.forEach(file => {
    const imageUrl = file.base64
      ? formatBase64Image(file.base64, file.type)
      : file.url

    if (imageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      })
    }
  })

  return content
}