// Flagship models from major AI companies
// These are the best/most capable models from each provider
export const FLAGSHIP_MODEL_IDS = [
  // OpenAI
  'openai/gpt-4o',             // GPT-4 Omni (latest multimodal)
  'openai/gpt-4-turbo',        // GPT-4 Turbo
  'openai/o1-preview',         // O1 reasoning model
  'openai/o1-mini',            // O1 mini reasoning

  // Anthropic
  'anthropic/claude-3.5-sonnet', // Claude 3.5 Sonnet (latest)
  'anthropic/claude-3-opus',     // Claude 3 Opus (most capable)
  'anthropic/claude-3-sonnet',   // Claude 3 Sonnet

  // Google
  'google/gemini-pro-1.5',       // Gemini 1.5 Pro
  'google/gemini-flash-1.5',     // Gemini 1.5 Flash
  'google/gemini-2.0-flash-exp:free', // Gemini 2.0 Flash experimental

  // Meta
  'meta-llama/llama-3.1-405b-instruct', // Llama 3.1 405B
  'meta-llama/llama-3.1-70b-instruct',  // Llama 3.1 70B
  'meta-llama/llama-3.2-90b-vision-instruct', // Llama 3.2 Vision

  // Mistral
  'mistralai/mistral-large',    // Mistral Large
  'mistralai/mistral-medium',   // Mistral Medium

  // xAI
  'x-ai/grok-2',                // Grok 2
  'x-ai/grok-2-vision',         // Grok 2 Vision

  // Qwen (Alibaba)
  'qwen/qwen-2.5-72b-instruct', // Qwen 2.5 72B
  'qwen/qwq-32b-preview',       // QwQ reasoning model

  // Cohere
  'cohere/command-r-plus',     // Command R+

  // OpenRouter Auto (let them choose best)
  'openrouter/auto',            // Automatic selection
]

// Get a diverse set of models for refinement
// Returns different models for each round to get varied perspectives
export function getModelForRound(
  availableModels: string[],
  roundNumber: number
): string {
  if (availableModels.length === 0) {
    return 'openrouter/auto'
  }

  // Rotate through available models
  const modelIndex = roundNumber % availableModels.length
  return availableModels[modelIndex]
}

// Check if a model is a flagship model
export function isFlagshipModel(modelId: string): boolean {
  return FLAGSHIP_MODEL_IDS.some(flagship =>
    modelId.toLowerCase().includes(flagship.toLowerCase()) ||
    flagship.toLowerCase().includes(modelId.toLowerCase())
  )
}

// Get flagship models from a list of available models
export function getFlagshipModels(models: Array<{ id: string; name?: string }>): Array<{ id: string; name?: string }> {
  return models.filter(model => isFlagshipModel(model.id))
}

// Group models by provider
export function groupModelsByProvider(models: Array<{ id: string; name?: string }>): Record<string, Array<{ id: string; name?: string }>> {
  const grouped: Record<string, Array<{ id: string; name?: string }>> = {}

  models.forEach(model => {
    const provider = model.id.split('/')[0] || 'other'
    if (!grouped[provider]) {
      grouped[provider] = []
    }
    grouped[provider].push(model)
  })

  return grouped
}