import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { openRouterService } from '@/services/openrouter'
import LoadingSpinner from '@/components/ui/loading-spinner'
import {
  Play,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Brain,
  ChevronRight,
  FileText,
  Sparkles,
  Timer
} from 'lucide-react'
import { Project, RefinementRound } from '@/types'
import { cn } from '@/utils/cn'

interface AdversarialRefinementProps {
  project: Project
  onComplete: (rounds: RefinementRound[]) => void
  onUpdate: (rounds: RefinementRound[]) => void
}

export default function AdversarialRefinement({
  project,
  onComplete,
  onUpdate
}: AdversarialRefinementProps) {
  const [prompt, setPrompt] = useState('')
  const [rounds, setRounds] = useState<RefinementRound[]>(
    project.phases?.refinement?.rounds || []
  )
  const [currentRound, setCurrentRound] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

  const handleStartRefinement = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a prompt to refine',
        variant: 'destructive'
      })
      return
    }

    setIsRunning(true)
    setIsRefining(true)
    setCurrentRound(0)
    setRounds([])

    try {
      // Create initial round with the original prompt
      const initialRound: RefinementRound = {
        roundNumber: 0,
        response: prompt,
        critique: 'Initial prompt - no critique',
        improvements: [],
        timestamp: new Date().toISOString()
      }

      let currentRounds = [initialRound]
      setRounds(currentRounds)

      // Perform refinement rounds
      for (let round = 1; round <= project.maxRefinementRounds; round++) {
        setCurrentRound(round)

        // Generate critique of the previous response
        const critiquePrompt = `You are a critical reviewer. Analyze this response and provide specific, actionable feedback for improvement:

Response to critique:
"""
${currentRounds[round - 1].response}
"""

Provide a detailed critique focusing on:
1. Accuracy and factual correctness
2. Completeness and coverage
3. Clarity and structure
4. Relevance to the original request

Be specific and constructive. Format your critique as clear, numbered points.`

        const critiqueResponse = await openRouterService.createChatCompletion({
          model: project.refinerModelId,
          messages: [
            { role: 'system', content: 'You are a critical reviewer providing constructive feedback.' },
            { role: 'user', content: critiquePrompt }
          ],
          max_tokens: 500,
          temperature: 0.7
        })

        const critique = critiqueResponse.choices[0]?.message?.content || 'No critique generated'

        // Generate refined response based on critique
        const refinementPrompt = `You are refining a response based on critical feedback. Here's the context:

Original request:
"""
${prompt}
"""

Previous response:
"""
${currentRounds[round - 1].response}
"""

Critique and feedback:
"""
${critique}
"""

Please provide an improved version of the response that addresses all the feedback points while maintaining accuracy and completeness. Make specific improvements based on the critique.`

        const refinedResponse = await openRouterService.createChatCompletion({
          model: project.refinerModelId,
          messages: [
            { role: 'system', content: 'You are an expert assistant refining responses based on feedback.' },
            { role: 'user', content: refinementPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })

        const refinedText = refinedResponse.choices[0]?.message?.content || 'No refined response generated'

        // Extract improvements made
        const improvements = extractImprovements(
          currentRounds[round - 1].response,
          refinedText,
          critique
        )

        const newRound: RefinementRound = {
          roundNumber: round,
          response: refinedText,
          critique: critique,
          improvements: improvements,
          timestamp: new Date().toISOString()
        }

        currentRounds = [...currentRounds, newRound]
        setRounds(currentRounds)
        onUpdate(currentRounds)

        // Check if we should stop early (if response hasn't changed much)
        if (round > 1 && isResponseSimilar(currentRounds[round - 1].response, refinedText)) {
          toast({
            title: 'Refinement Complete',
            description: `Stopped at round ${round} - response has stabilized`,
          })
          break
        }
      }

      onComplete(currentRounds)

      toast({
        title: 'Refinement Complete',
        description: `Completed ${currentRounds.length - 1} refinement rounds`,
      })
    } catch (error) {
      console.error('Refinement failed:', error)
      toast({
        title: 'Refinement Failed',
        description: error instanceof Error ? error.message : 'An error occurred during refinement',
        variant: 'destructive'
      })
    } finally {
      setIsRunning(false)
      setIsRefining(false)
    }
  }

  const extractImprovements = (
    previousResponse: string,
    newResponse: string,
    critique: string
  ): string[] => {
    const improvements: string[] = []

    // Simple heuristic to identify improvements
    if (newResponse.length > previousResponse.length * 1.1) {
      improvements.push('Added more detail and explanation')
    }

    if (newResponse.includes('```') && !previousResponse.includes('```')) {
      improvements.push('Added code examples or formatted content')
    }

    if (newResponse.split('\n').length > previousResponse.split('\n').length) {
      improvements.push('Improved structure and formatting')
    }

    // Extract specific improvements from critique
    const critiqueLines = critique.split('\n')
    critiqueLines.forEach(line => {
      if (line.match(/should|could|needs to|missing/i)) {
        improvements.push(`Addressed: ${line.trim().substring(0, 100)}...`)
      }
    })

    return improvements.slice(0, 5) // Limit to 5 improvements
  }

  const isResponseSimilar = (response1: string, response2: string): boolean => {
    // Simple similarity check - can be improved with better algorithms
    const words1 = response1.toLowerCase().split(/\s+/)
    const words2 = response2.toLowerCase().split(/\s+/)

    const commonWords = words1.filter(word => words2.includes(word))
    const similarity = commonWords.length / Math.max(words1.length, words2.length)

    return similarity > 0.95 // 95% similar
  }

  const handleReset = () => {
    setPrompt('')
    setRounds([])
    setCurrentRound(0)
    setSelectedRound(null)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Phase 1: Adversarial Refinement
          </CardTitle>
          <CardDescription>
            Enter a prompt and watch as the AI iteratively improves its response through {project.maxRefinementRounds} rounds of critique and refinement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">Initial Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here... (e.g., 'Explain quantum computing to a 10-year-old')"
              rows={4}
              disabled={isRunning}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleStartRefinement}
              disabled={isRunning || !prompt.trim()}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Refining Round {currentRound}/{project.maxRefinementRounds}...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Refinement Process
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isRunning}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Progress Indicator */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{currentRound}/{project.maxRefinementRounds} rounds</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentRound / project.maxRefinementRounds) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {rounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refinement Results</CardTitle>
            <CardDescription>
              Click on any round to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Round Selector */}
              <div className="lg:col-span-1 space-y-2">
                <Label>Refinement Rounds</Label>
                <ScrollArea className="h-[400px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {rounds.map((round, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedRound(index)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          selectedRound === index
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {index === 0 ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              {index === 0 ? 'Initial' : `Round ${index}`}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatTimestamp(round.timestamp)}
                        </div>
                        {round.improvements.length > 0 && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {round.improvements.length} improvements
                            </Badge>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Round Details */}
              <div className="lg:col-span-2">
                {selectedRound !== null && (
                  <Tabs defaultValue="response" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="response">Response</TabsTrigger>
                      <TabsTrigger value="critique">Critique</TabsTrigger>
                      <TabsTrigger value="improvements">Improvements</TabsTrigger>
                    </TabsList>

                    <TabsContent value="response" className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <Label>
                          {selectedRound === 0 ? 'Initial Prompt' : `Refined Response - Round ${selectedRound}`}
                        </Label>
                      </div>
                      <ScrollArea className="h-[350px] border rounded-lg p-4">
                        <div className="whitespace-pre-wrap">
                          {rounds[selectedRound].response}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="critique" className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <Label>Critical Feedback</Label>
                      </div>
                      <ScrollArea className="h-[350px] border rounded-lg p-4">
                        <div className="whitespace-pre-wrap">
                          {rounds[selectedRound].critique}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="improvements" className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <Label>Improvements Made</Label>
                      </div>
                      <ScrollArea className="h-[350px] border rounded-lg p-4">
                        {rounds[selectedRound].improvements.length > 0 ? (
                          <ul className="space-y-2">
                            {rounds[selectedRound].improvements.map((improvement, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {selectedRound === 0
                              ? 'This is the initial prompt - no improvements yet'
                              : 'No specific improvements identified'}
                          </p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}

                {selectedRound === null && (
                  <div className="h-[400px] flex items-center justify-center border rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a round to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Statistics */}
            {rounds.length > 1 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rounds</p>
                        <p className="text-2xl font-bold">{rounds.length - 1}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Improvements</p>
                        <p className="text-2xl font-bold">
                          {rounds.reduce((acc, round) => acc + round.improvements.length, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Refiner Model</p>
                        <p className="text-sm font-medium truncate">
                          {project.refinerModelId.split('/').pop()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}