import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import { logger } from '../utils/logger'

/**
 * User judgment on a model's response
 */
export interface ResponseJudgment {
  id: string
  userId: string
  modelId: string
  modelName: string
  questionHash: string // Hash of the question for grouping
  questionCategory?: string // Optional categorization
  rating: number // 1-5 stars
  isWinner?: boolean // True if this was selected as best response
  responseTime?: number // Time taken to respond in ms
  timestamp: Date
  feedback?: string // Optional text feedback
}

/**
 * Model performance statistics for a user
 */
export interface ModelStats {
  modelId: string
  modelName: string
  totalRatings: number
  averageRating: number
  winCount: number // Number of times selected as best
  totalResponses: number
  averageResponseTime?: number
  lastUsed: Date
  categories?: Record<string, {
    count: number
    averageRating: number
  }>
}

/**
 * User preference profile
 */
export interface UserPreferences {
  userId: string
  favoriteModels: string[] // Model IDs sorted by preference
  modelStats: Record<string, ModelStats>
  totalJudgments: number
  lastUpdated: Date
}

/**
 * Hash a question string for grouping related judgments
 */
function hashQuestion(question: string): string {
  // Simple hash - you could use a more sophisticated algorithm
  let hash = 0
  const normalized = question.trim().toLowerCase()
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Categorize a question based on keywords (simple heuristic)
 */
function categorizeQuestion(question: string): string {
  const lower = question.toLowerCase()

  if (lower.match(/code|programming|debug|function|algorithm|python|javascript|typescript/)) {
    return 'coding'
  }
  if (lower.match(/write|essay|story|article|blog|creative/)) {
    return 'writing'
  }
  if (lower.match(/explain|what is|how does|why|science|theory/)) {
    return 'explanation'
  }
  if (lower.match(/analyze|compare|evaluate|review/)) {
    return 'analysis'
  }
  if (lower.match(/summarize|summary|tldr|brief/)) {
    return 'summarization'
  }
  if (lower.match(/translate|language/)) {
    return 'translation'
  }
  if (lower.match(/math|calculate|solve|equation/)) {
    return 'math'
  }

  return 'general'
}

/**
 * Record a user's judgment of a model's response
 */
export async function recordJudgment(
  userId: string,
  modelId: string,
  modelName: string,
  question: string,
  rating: number,
  isWinner?: boolean,
  responseTime?: number,
  feedback?: string
): Promise<void> {
  try {
    const questionHash = hashQuestion(question)
    const category = categorizeQuestion(question)

    const judgment: ResponseJudgment = {
      id: `${userId}_${modelId}_${Date.now()}`,
      userId,
      modelId,
      modelName,
      questionHash,
      questionCategory: category,
      rating: Math.max(1, Math.min(5, rating)), // Clamp to 1-5
      isWinner: isWinner || false,
      responseTime,
      timestamp: new Date(),
      feedback,
    }

    // Save judgment
    const judgmentRef = doc(db, 'judgments', judgment.id)
    await setDoc(judgmentRef, {
      ...judgment,
      timestamp: Timestamp.fromDate(judgment.timestamp),
    })

    // Update user preferences in a batch
    await updateUserPreferences(userId)

    logger.info('Judgment recorded', {
      userId,
      modelId,
      rating,
      category,
    })
  } catch (error) {
    logger.error('Failed to record judgment', error, { userId, modelId })
    throw error
  }
}

/**
 * Record judgments for multiple models (e.g., after FFA comparison)
 */
export async function recordBatchJudgments(
  userId: string,
  question: string,
  judgments: Array<{
    modelId: string
    modelName: string
    rating: number
    isWinner: boolean
    responseTime?: number
  }>
): Promise<void> {
  try {
    const questionHash = hashQuestion(question)
    const category = categorizeQuestion(question)
    const batch = writeBatch(db)

    judgments.forEach((j) => {
      const judgment: ResponseJudgment = {
        id: `${userId}_${j.modelId}_${Date.now()}`,
        userId,
        modelId: j.modelId,
        modelName: j.modelName,
        questionHash,
        questionCategory: category,
        rating: Math.max(1, Math.min(5, j.rating)),
        isWinner: j.isWinner,
        responseTime: j.responseTime,
        timestamp: new Date(),
      }

      const judgmentRef = doc(db, 'judgments', judgment.id)
      batch.set(judgmentRef, {
        ...judgment,
        timestamp: Timestamp.fromDate(judgment.timestamp),
      })
    })

    await batch.commit()
    await updateUserPreferences(userId)

    logger.info('Batch judgments recorded', {
      userId,
      count: judgments.length,
      category,
    })
  } catch (error) {
    logger.error('Failed to record batch judgments', error, { userId })
    throw error
  }
}

/**
 * Update user preference profile based on all judgments
 */
async function updateUserPreferences(userId: string): Promise<void> {
  try {
    // Fetch all judgments for this user
    const judgmentsRef = collection(db, 'judgments')
    const q = query(judgmentsRef, where('userId', '==', userId))
    const snapshot = await getDocs(q)

    const modelStatsMap = new Map<string, ModelStats>()

    snapshot.forEach((doc) => {
      const judgment = doc.data() as ResponseJudgment & {
        timestamp: Timestamp
      }

      if (!modelStatsMap.has(judgment.modelId)) {
        modelStatsMap.set(judgment.modelId, {
          modelId: judgment.modelId,
          modelName: judgment.modelName,
          totalRatings: 0,
          averageRating: 0,
          winCount: 0,
          totalResponses: 0,
          lastUsed: judgment.timestamp.toDate(),
          categories: {},
        })
      }

      const stats = modelStatsMap.get(judgment.modelId)!

      // Update stats
      stats.totalRatings += judgment.rating
      stats.totalResponses += 1
      stats.winCount += judgment.isWinner ? 1 : 0
      stats.averageRating = stats.totalRatings / stats.totalResponses

      // Update response time
      if (judgment.responseTime) {
        const currentAvg = stats.averageResponseTime || 0
        const count = stats.totalResponses
        stats.averageResponseTime =
          (currentAvg * (count - 1) + judgment.responseTime) / count
      }

      // Update category stats
      if (judgment.questionCategory) {
        if (!stats.categories) stats.categories = {}
        if (!stats.categories[judgment.questionCategory]) {
          stats.categories[judgment.questionCategory] = {
            count: 0,
            averageRating: 0,
          }
        }
        const catStats = stats.categories[judgment.questionCategory]
        catStats.count += 1
        catStats.averageRating =
          (catStats.averageRating * (catStats.count - 1) + judgment.rating) /
          catStats.count
      }

      // Update last used
      const judgmentDate = judgment.timestamp.toDate()
      if (judgmentDate > stats.lastUsed) {
        stats.lastUsed = judgmentDate
      }
    })

    // Sort models by a composite score (avg rating * 0.7 + win rate * 0.3)
    const modelStats = Array.from(modelStatsMap.values())
    const favoriteModels = modelStats
      .map((stats) => ({
        modelId: stats.modelId,
        score:
          stats.averageRating * 0.7 +
          (stats.winCount / stats.totalResponses) * 5 * 0.3,
      }))
      .sort((a, b) => b.score - a.score)
      .map((m) => m.modelId)

    // Convert to object for Firestore
    const modelStatsObj: Record<string, ModelStats> = {}
    modelStatsMap.forEach((stats, modelId) => {
      modelStatsObj[modelId] = stats
    })

    const preferences: UserPreferences = {
      userId,
      favoriteModels,
      modelStats: modelStatsObj,
      totalJudgments: snapshot.size,
      lastUpdated: new Date(),
    }

    // Save preferences
    const prefsRef = doc(db, 'userPreferences', userId)
    await setDoc(prefsRef, {
      ...preferences,
      lastUpdated: Timestamp.fromDate(preferences.lastUpdated),
    })

    logger.info('User preferences updated', {
      userId,
      totalJudgments: preferences.totalJudgments,
      favoriteModels: favoriteModels.slice(0, 3),
    })
  } catch (error) {
    logger.error('Failed to update user preferences', error, { userId })
    throw error
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  try {
    const prefsRef = doc(db, 'userPreferences', userId)
    const snapshot = await getDoc(prefsRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()
    return {
      ...data,
      lastUpdated: data.lastUpdated.toDate(),
    } as UserPreferences
  } catch (error) {
    logger.error('Failed to get user preferences', error, { userId })
    return null
  }
}

/**
 * Get recommended models for a question based on user preferences
 */
export async function getRecommendedModels(
  userId: string,
  question: string,
  availableModelIds: string[]
): Promise<string[]> {
  try {
    const preferences = await getUserPreferences(userId)

    if (!preferences || preferences.totalJudgments < 5) {
      // Not enough data, return all available models
      return availableModelIds
    }

    const category = categorizeQuestion(question)

    // Score models based on overall performance and category performance
    const scoredModels = availableModelIds
      .map((modelId) => {
        const stats = preferences.modelStats[modelId]
        if (!stats) {
          return { modelId, score: 0 }
        }

        let score = stats.averageRating * 0.6
        score += (stats.winCount / stats.totalResponses) * 5 * 0.4

        // Boost score if model performs well in this category
        if (stats.categories?.[category]) {
          const catRating = stats.categories[category].averageRating
          score = score * 0.7 + catRating * 0.3
        }

        return { modelId, score }
      })
      .sort((a, b) => b.score - a.score)

    logger.info('Recommended models generated', {
      userId,
      category,
      topModels: scoredModels.slice(0, 3).map((m) => m.modelId),
    })

    return scoredModels.map((m) => m.modelId)
  } catch (error) {
    logger.error('Failed to get recommended models', error, { userId })
    return availableModelIds
  }
}

/**
 * Get user's top performing models
 */
export async function getTopModels(
  userId: string,
  limit: number = 5
): Promise<ModelStats[]> {
  try {
    const preferences = await getUserPreferences(userId)

    if (!preferences) {
      return []
    }

    return Object.values(preferences.modelStats)
      .sort((a, b) => {
        const scoreA = a.averageRating * 0.7 + (a.winCount / a.totalResponses) * 5 * 0.3
        const scoreB = b.averageRating * 0.7 + (b.winCount / b.totalResponses) * 5 * 0.3
        return scoreB - scoreA
      })
      .slice(0, limit)
  } catch (error) {
    logger.error('Failed to get top models', error, { userId })
    return []
  }
}

/**
 * Get judgment history for a specific question
 */
export async function getQuestionJudgments(
  userId: string,
  question: string
): Promise<ResponseJudgment[]> {
  try {
    const questionHash = hashQuestion(question)
    const judgmentsRef = collection(db, 'judgments')
    const q = query(
      judgmentsRef,
      where('userId', '==', userId),
      where('questionHash', '==', questionHash),
      orderBy('timestamp', 'desc'),
      limit(20)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data() as ResponseJudgment & { timestamp: Timestamp }
      return {
        ...data,
        timestamp: data.timestamp.toDate(),
      }
    })
  } catch (error) {
    logger.error('Failed to get question judgments', error, { userId })
    return []
  }
}
