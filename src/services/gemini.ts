import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { logger } from '@/utils/logger'

/**
 * Gemini API Service
 * Direct integration with Google's Gemini models through Firebase
 */
class GeminiService {
  private client: GoogleGenerativeAI | null = null
  private models: Map<string, GenerativeModel> = new Map()

  /**
   * Available Gemini models
   */
  readonly availableModels = [
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      description: 'Best for text generation and chat',
      maxTokens: 32768,
    },
    {
      id: 'gemini-pro-vision',
      name: 'Gemini Pro Vision',
      description: 'Multimodal model for text and images',
      maxTokens: 16384,
      supportsVision: true,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Latest version with extended context',
      maxTokens: 1048576, // 1M tokens!
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient version',
      maxTokens: 1048576,
    },
  ]

  /**
   * Initialize with API key
   */
  initialize(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required')
    }

    this.client = new GoogleGenerativeAI(apiKey)
    logger.info('Gemini service initialized')
  }

  /**
   * Get or create a model instance
   */
  private getModel(modelId: string): GenerativeModel {
    if (!this.client) {
      throw new Error('Gemini service not initialized. Please set API key first.')
    }

    if (!this.models.has(modelId)) {
      this.models.set(modelId, this.client.getGenerativeModel({ model: modelId }))
    }

    return this.models.get(modelId)!
  }

  /**
   * Generate content with text prompt
   */
  async generateContent(
    modelId: string,
    prompt: string,
    options?: {
      temperature?: number
      maxTokens?: number
      topP?: number
      topK?: number
    }
  ): Promise<string> {
    try {
      const model = this.getModel(modelId)

      logger.apiCall('POST', 'generateContent', {
        model: modelId,
        promptLength: prompt.length,
        temperature: options?.temperature,
      })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens,
          topP: options?.topP,
          topK: options?.topK,
        },
      })

      const response = result.response
      const text = response.text()

      logger.info('Gemini generation successful', {
        model: modelId,
        responseLength: text.length,
      })

      return text
    } catch (error) {
      logger.error('Gemini generation failed', error, { model: modelId })

      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Invalid Gemini API key. Please check your API key.')
        }
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API quota exceeded. Please try again later.')
        }
        if (error.message.includes('SAFETY')) {
          throw new Error('Content blocked by safety filters.')
        }
      }

      throw error
    }
  }

  /**
   * Generate content with image (for vision models)
   */
  async generateContentWithImage(
    modelId: string,
    prompt: string,
    imageData: string, // base64 or data URL
    mimeType: string = 'image/jpeg'
  ): Promise<string> {
    try {
      const model = this.getModel(modelId)

      // Check if model supports vision
      const modelInfo = this.availableModels.find(m => m.id === modelId)
      if (!modelInfo?.supportsVision) {
        throw new Error(`Model ${modelId} does not support image inputs`)
      }

      // Remove data URL prefix if present
      const base64Data = imageData.startsWith('data:')
        ? imageData.split(',')[1]
        : imageData

      logger.apiCall('POST', 'generateContent (vision)', {
        model: modelId,
        promptLength: prompt.length,
        hasImage: true,
      })

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
            ],
          },
        ],
      })

      const response = result.response
      const text = response.text()

      logger.info('Gemini vision generation successful', {
        model: modelId,
        responseLength: text.length,
      })

      return text
    } catch (error) {
      logger.error('Gemini vision generation failed', error, { model: modelId })
      throw error
    }
  }

  /**
   * Chat with streaming responses
   */
  async *chatStream(
    modelId: string,
    prompt: string,
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): AsyncGenerator<string> {
    try {
      const model = this.getModel(modelId)

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens,
        },
      })

      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        yield chunkText
      }
    } catch (error) {
      logger.error('Gemini streaming failed', error, { model: modelId })
      throw error
    }
  }

  /**
   * Reset the service
   */
  reset() {
    this.client = null
    this.models.clear()
    logger.info('Gemini service reset')
  }
}

// Export singleton instance
export const geminiService = new GeminiService()
