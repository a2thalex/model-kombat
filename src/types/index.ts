// Project types
export interface Project {
  id: string
  userId: string
  name: string
  originalQuestion: string
  status: 'draft' | 'in_progress' | 'completed' | 'failed' | 'paused'
  createdAt: Date
  updatedAt: Date

  // Phase 1: Adversarial Refinement Configuration
  refinementConfig: {
    modelId: string
    rounds: number
    customPrompt?: string
  }

  // Phase 2: Competition Configuration
  competitionConfig: {
    competitorIds: string[]
    customPrompt?: string
  }

  // Phase 3: Judging Configuration
  judgingConfig: {
    judgeModelId: string
    criteria: GradingCriterion[]
    customSystemPrompt?: string
  }

  // Results
  results?: ProjectResults
}

export interface GradingCriterion {
  name: string
  weight: number // 0-100, all weights must sum to 100
  id: string
}

export interface ProjectResults {
  phase1: RefinementResult
  phase2: CompetitionResult
  phase3: JudgingResult
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
  critique: string
  refinedAnswer: string
  timestamp: Date
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

export interface JudgingResult {
  scores: JudgeScore[]
  winnerId: string
  judgeReasoning: string
  timestamp: Date
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
  context_length: number
  pricing: {
    prompt: number // per token
    completion: number // per token
  }
  architecture?: {
    tokenizer?: string
    modality?: 'text' | 'multimodal'
  }
  top_provider?: {
    context_length?: number
    max_completion_tokens?: number
  }
  per_request_limits?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
  capabilities?: {
    supports_functions?: boolean
    supports_parallel_functions?: boolean
    supports_vision?: boolean
    supports_response_schema?: boolean
    supports_stream?: boolean
  }
}

// LLM Configuration types
export interface LLMConfig {
  userId: string
  openRouterApiKey?: string // Encrypted
  enabledModelIds: string[]
  defaultRefinerId?: string
  defaultJudgeId?: string
  defaultRefinementRounds: number
  lastCatalogSync?: Date
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