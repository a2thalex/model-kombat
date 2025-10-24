// Project types
export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  originalQuestion?: string
  status: 'draft' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'refining' | 'competing' | 'judging' | 'complete'
  createdAt: Date
  updatedAt: Date

  // Phase configurations
  maxRefinementRounds: number
  refinerModelId: string
  competitorModelIds: string[]
  judgeModelId: string
  judgingCriteria: JudgingCriteria

  // Phase 1: Adversarial Refinement Configuration
  refinementConfig?: {
    modelId: string
    rounds: number
    customPrompt?: string
  }

  // Phase 2: Competition Configuration
  competitionConfig?: {
    competitorIds: string[]
    customPrompt?: string
  }

  // Phase 3: Judging Configuration
  judgingConfig?: {
    judgeModelId: string
    criteria: GradingCriterion[]
    customSystemPrompt?: string
  }

  // Phases data
  phases?: {
    refinement: {
      status: 'pending' | 'in_progress' | 'completed'
      rounds: RefinementRound[]
    }
    competition: {
      status: 'pending' | 'in_progress' | 'completed'
      generations: CompetitorGeneration[]
    }
    judging: {
      status: 'pending' | 'in_progress' | 'completed'
      results: JudgingResult[]
    }
  }

  // Results
  results?: ProjectResults
}

export interface JudgingCriteria {
  relevance: number
  accuracy: number
  completeness: number
  clarity: number
}

export interface GradingCriterion {
  name: string
  weight: number // 0-100, all weights must sum to 100
  id: string
}

export interface ProjectResults {
  phase1: RefinementResult
  phase2: CompetitionResult
  phase3: JudgingResultLegacy
  completedAt: Date
  totalDuration: number // in milliseconds
  totalTokensUsed?: number
  totalCost?: number
}

export interface RefinementResult {
  rounds: RefinementRound[]
  finalAnswer: string
}

export interface RefinementRound {
  roundNumber: number
  response: string
  critique: string
  refinedAnswer?: string
  improvements: string[]
  timestamp: string | Date
  tokensUsed?: number
}

export interface CompetitionResult {
  competitors: CompetitorAnswer[]
}

export interface CompetitorAnswer {
  id: string
  modelId: string
  answer: string
  timestamp: Date
  tokensUsed?: number
  generationTime: number // in milliseconds
}

export interface CompetitorGeneration {
  modelId: string
  modelName: string
  response: string
  generationTime: number
  tokenCount: number
  estimatedCost: number
  timestamp: string
}

export interface JudgingResultLegacy {
  scores: JudgeScore[]
  winnerId: string
  judgeReasoning: string
  timestamp: Date
}

export interface JudgingResult {
  modelId: string
  modelName: string
  scores: {
    relevance: number
    accuracy: number
    completeness: number
    clarity: number
  }
  totalScore: number
  feedback: string
  rank: number
  timestamp: string
}

export interface JudgeScore {
  answerId: string
  criteriaScores: { [criterionId: string]: CriterionScore }
  weightedTotal: number
  rank: number
}

export interface CriterionScore {
  score: number // 0-10
  reasoning: string
}

// OpenRouter types
export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length?: number
  pricing?: {
    prompt: number // per token
    completion: number // per token
    input?: number
    output?: number
    image?: number
    request?: number
  }
  architecture?: {
    tokenizer?: string
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
    instruct_type?: string | null
  }
  top_provider?: {
    context_length?: number
    max_completion_tokens?: number
    is_moderated?: boolean
  }
  per_request_limits?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
  // New field from OpenRouter API
  supported_parameters?: string[]
  default_parameters?: Record<string, any>
  created?: number
  canonical_slug?: string
  hugging_face_id?: string | null
  // Old capabilities field for backward compatibility (no longer in API)
  capabilities?: {
    supports_functions?: boolean
    supports_parallel_functions?: boolean
    supports_vision?: boolean
    supports_response_schema?: boolean
    supports_stream?: boolean
    vision?: boolean
    function_calling?: boolean
    json_mode?: boolean
  }
}

// LLM Configuration types
export interface LLMConfig {
  userId: string
  openRouterApiKey?: string // Encrypted
  enabledModelIds: string[]
  defaultRefinerId?: string
  defaultJudgeId?: string
  defaultRefinerModel?: string
  defaultJudgeModel?: string
  defaultRefinementRounds: number
  lastCatalogSync?: Date
  catalogLastFetched?: string
}

// User types
export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: Date
  lastLogin: Date
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise'
    validUntil?: Date
  }
  usage?: {
    projectsCreated: number
    totalTokensUsed: number
    totalCost: number
  }
}