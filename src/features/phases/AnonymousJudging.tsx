import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { openRouterService } from '@/services/openrouter'
import LoadingSpinner from '@/components/ui/loading-spinner'
import {
  Gavel,
  Trophy,
  Medal,
  Award,
  AlertCircle,
  CheckCircle,
  BarChart,
  Eye,
  EyeOff,
  FileText,
  Star,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Project, CompetitorGeneration, JudgingResult, JudgingCriteria } from '@/types'
import { cn } from '@/utils/cn'

interface AnonymousJudgingProps {
  project: Project
  generations: CompetitorGeneration[]
  onComplete: (results: JudgingResult[]) => void
  onUpdate: (results: JudgingResult[]) => void
}

interface JudgingScore {
  relevance: number
  accuracy: number
  completeness: number
  clarity: number
  totalScore: number
  feedback: string
}

export default function AnonymousJudging({
  project,
  generations,
  onComplete,
  onUpdate
}: AnonymousJudgingProps) {
  const [results, setResults] = useState<JudgingResult[]>(
    project.phases?.judging?.results || []
  )
  const [isJudging, setIsJudging] = useState(false)
  const [currentJudgingIndex, setCurrentJudgingIndex] = useState(0)
  const [revealIdentities, setRevealIdentities] = useState(false)
  const [selectedResult, setSelectedResult] = useState<number | null>(null)

  const handleStartJudging = async () => {
    if (generations.length === 0) {
      toast({
        title: 'No Generations Available',
        description: 'Please complete Phase 2 (Competitive Generation) first',
        variant: 'destructive'
      })
      return
    }

    setIsJudging(true)
    setResults([])
    setRevealIdentities(false)
    const newResults: JudgingResult[] = []

    try {
      // Shuffle generations for anonymous judging
      const shuffledGenerations = [...generations].sort(() => Math.random() - 0.5)

      for (let i = 0; i < shuffledGenerations.length; i++) {
        setCurrentJudgingIndex(i + 1)
        const generation = shuffledGenerations[i]

        // Create judging prompt with weighted criteria
        const judgingPrompt = createJudgingPrompt(generation.response, project.judgingCriteria)

        try {
          // Get judgment from judge model
          const judgmentResponse = await openRouterService.createChatCompletion({
            model: project.judgeModelId,
            messages: [
              {
                role: 'system',
                content: `You are an impartial judge evaluating AI-generated responses.
                You must provide scores and feedback in valid JSON format.
                Be objective, fair, and consistent in your evaluations.`
              },
              {
                role: 'user',
                content: judgingPrompt
              }
            ],
            max_tokens: 800,
            temperature: 0.3,
            response_format: { type: 'json_object' } // Request JSON response
          })

          const judgmentText = judgmentResponse.choices[0]?.message?.content || '{}'

          // Parse the JSON response
          let scores: JudgingScore
          try {
            const parsed = JSON.parse(judgmentText)
            scores = {
              relevance: parsed.relevance || 0,
              accuracy: parsed.accuracy || 0,
              completeness: parsed.completeness || 0,
              clarity: parsed.clarity || 0,
              totalScore: 0,
              feedback: parsed.feedback || 'No feedback provided'
            }

            // Calculate weighted total score
            scores.totalScore = calculateWeightedScore(scores, project.judgingCriteria)
          } catch (parseError) {
            console.error('Failed to parse judgment:', parseError)
            // Fallback scoring if JSON parsing fails
            scores = {
              relevance: 70,
              accuracy: 70,
              completeness: 70,
              clarity: 70,
              totalScore: 70,
              feedback: 'Error parsing judgment response'
            }
          }

          const result: JudgingResult = {
            modelId: generation.modelId,
            modelName: generation.modelName,
            scores: {
              relevance: scores.relevance,
              accuracy: scores.accuracy,
              completeness: scores.completeness,
              clarity: scores.clarity
            },
            totalScore: scores.totalScore,
            feedback: scores.feedback,
            rank: 0, // Will be calculated after all judging is complete
            timestamp: new Date().toISOString()
          }

          newResults.push(result)
          onUpdate(newResults)

        } catch (error) {
          console.error(`Judging failed for model ${generation.modelId}:`, error)

          // Add a failed result
          const failedResult: JudgingResult = {
            modelId: generation.modelId,
            modelName: generation.modelName,
            scores: {
              relevance: 0,
              accuracy: 0,
              completeness: 0,
              clarity: 0
            },
            totalScore: 0,
            feedback: `Judging failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            rank: 0,
            timestamp: new Date().toISOString()
          }

          newResults.push(failedResult)
          onUpdate(newResults)
        }
      }

      // Calculate rankings
      const rankedResults = calculateRankings(newResults)
      setResults(rankedResults)
      onComplete(rankedResults)

      toast({
        title: 'Judging Complete',
        description: `Evaluated ${rankedResults.length} responses`,
      })

    } catch (error) {
      console.error('Judging failed:', error)
      toast({
        title: 'Judging Failed',
        description: error instanceof Error ? error.message : 'An error occurred during judging',
        variant: 'destructive'
      })
    } finally {
      setIsJudging(false)
      setCurrentJudgingIndex(0)
    }
  }

  const createJudgingPrompt = (response: string, criteria: JudgingCriteria): string => {
    return `Please evaluate the following AI-generated response based on the specified criteria and weights.

Response to evaluate:
"""
${response}
"""

Evaluation Criteria and Weights:
- Relevance (${criteria.relevance}%): How well does the response address the original request?
- Accuracy (${criteria.accuracy}%): Is the information factually correct and precise?
- Completeness (${criteria.completeness}%): Does the response thoroughly cover all aspects?
- Clarity (${criteria.clarity}%): Is the response well-structured and easy to understand?

Please provide your evaluation in the following JSON format:
{
  "relevance": [score 0-100],
  "accuracy": [score 0-100],
  "completeness": [score 0-100],
  "clarity": [score 0-100],
  "feedback": "[Detailed feedback explaining the scores and key strengths/weaknesses]"
}

Be objective and consistent in your scoring. Consider the weights when determining the overall quality.`
  }

  const calculateWeightedScore = (scores: JudgingScore, criteria: JudgingCriteria): number => {
    const weightedScore =
      (scores.relevance * criteria.relevance / 100) +
      (scores.accuracy * criteria.accuracy / 100) +
      (scores.completeness * criteria.completeness / 100) +
      (scores.clarity * criteria.clarity / 100)

    return Math.round(weightedScore)
  }

  const calculateRankings = (results: JudgingResult[]): JudgingResult[] => {
    // Sort by total score (descending)
    const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore)

    // Assign ranks
    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1
    }))
  }

  const getProgressValue = () => {
    if (generations.length === 0) return 0
    return (currentJudgingIndex / generations.length) * 100
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-orange-600" />
      default:
        return <span className="text-sm font-medium">#{rank}</span>
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    if (score >= 40) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Phase 3: Anonymous Judging
          </CardTitle>
          <CardDescription>
            Judge model evaluates all responses anonymously based on weighted criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Competition Summary */}
          {generations.length > 0 ? (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Ready to Judge</span>
                <Badge variant="secondary">{generations.length} responses</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Responses will be evaluated anonymously using the configured criteria weights
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    No Responses to Judge
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Complete Phase 2 (Competitive Generation) to generate responses for judging
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Judging Criteria Display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(project.judgingCriteria).map(([criterion, weight]) => (
              <div key={criterion} className="p-3 bg-background border rounded-lg">
                <p className="text-xs text-muted-foreground capitalize">{criterion}</p>
                <p className="text-lg font-semibold">{weight}%</p>
              </div>
            ))}
          </div>

          {/* Start Judging Button */}
          <Button
            onClick={handleStartJudging}
            disabled={isJudging || generations.length === 0}
            className="w-full"
            size="lg"
          >
            {isJudging ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Judging Response {currentJudgingIndex}/{generations.length}...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4 mr-2" />
                Start Anonymous Judging
              </>
            )}
          </Button>

          {/* Progress Indicator */}
          {isJudging && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Judging Progress</span>
                <span>{currentJudgingIndex}/{generations.length}</span>
              </div>
              <Progress value={getProgressValue()} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Identity Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Model Identities</p>
                  <p className="text-sm text-muted-foreground">
                    {revealIdentities ? 'Models are revealed' : 'Models are anonymous'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setRevealIdentities(!revealIdentities)}
                >
                  {revealIdentities ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Identities
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Reveal Identities
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rankings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Final Rankings</CardTitle>
              <CardDescription>
                Models ranked by weighted score based on judging criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results
                  .sort((a, b) => a.rank - b.rank)
                  .map((result, index) => (
                    <div
                      key={index}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer transition-colors',
                        selectedResult === index
                          ? 'bg-primary/5 border-primary'
                          : 'hover:bg-muted',
                        result.rank === 1 && 'border-yellow-500',
                        result.rank === 2 && 'border-gray-400',
                        result.rank === 3 && 'border-orange-600'
                      )}
                      onClick={() => setSelectedResult(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getRankBadge(result.rank)}
                          <div>
                            <p className="font-medium">
                              {revealIdentities ? result.modelName : `Model ${String.fromCharCode(64 + result.rank)}`}
                            </p>
                            <p className={cn('text-2xl font-bold mt-1', getScoreColor(result.totalScore))}>
                              {result.totalScore}/100
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(result.scores).map(([criterion, score]) => (
                            <div key={criterion} className="text-center">
                              <p className="text-xs text-muted-foreground capitalize">{criterion}</p>
                              <p className={cn('text-sm font-medium', getScoreColor(score))}>
                                {score}
                              </p>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedResult(selectedResult === index ? null : index)
                          }}
                        >
                          {selectedResult === index ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Expanded Feedback */}
                      {selectedResult === index && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-2">Judge Feedback:</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {result.feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Winner Announcement */}
              {results.length > 0 && (
                <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                        Competition Winner
                      </p>
                      <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                        {revealIdentities
                          ? results.find(r => r.rank === 1)?.modelName
                          : 'Model A'}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Score: {results.find(r => r.rank === 1)?.totalScore}/100
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Average Score</p>
                        <p className="text-2xl font-bold">
                          {Math.round(
                            results.reduce((acc, r) => acc + r.totalScore, 0) / results.length
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Highest Score</p>
                        <p className="text-2xl font-bold">
                          {Math.max(...results.map(r => r.totalScore))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Score Range</p>
                        <p className="text-2xl font-bold">
                          {Math.max(...results.map(r => r.totalScore)) -
                            Math.min(...results.map(r => r.totalScore))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Models Judged</p>
                        <p className="text-2xl font-bold">{results.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}