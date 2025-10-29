import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { openRouterService } from '@/services/openrouter'
import { useLLMConfigStore } from '@/store/llm-config-hybrid'
import LoadingSpinner from '@/components/ui/loading-spinner'
import {
  Zap,
  Trophy,
  Timer,
  DollarSign,
  FileText,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  BarChart3,
  Clock
} from 'lucide-react'
import { Project, CompetitorGeneration } from '@/types'
import { cn } from '@/utils/cn'

interface CompetitiveGenerationProps {
  project: Project
  refinedPrompt: string | null
  onComplete: (generations: CompetitorGeneration[]) => void
  onUpdate: (generations: CompetitorGeneration[]) => void
}

interface GenerationStats {
  modelId: string
  modelName: string
  responseLength: number
  generationTime: number
  estimatedCost: number
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
}

export default function CompetitiveGeneration({
  project,
  refinedPrompt,
  onComplete,
  onUpdate
}: CompetitiveGenerationProps) {
  const { models } = useLLMConfigStore()
  const [generations, setGenerations] = useState<CompetitorGeneration[]>(
    project.phases?.competition?.generations || []
  )
  const [stats, setStats] = useState<GenerationStats[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [, ] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [currentGeneratingModel, setCurrentGeneratingModel] = useState<string | null>(null)

  // Initialize stats for competitor models
  useEffect(() => {
    const initialStats: GenerationStats[] = project.competitorModelIds.map(modelId => {
      const model = models.find(m => m.id === modelId)
      return {
        modelId,
        modelName: model?.name || modelId,
        responseLength: 0,
        generationTime: 0,
        estimatedCost: 0,
        status: 'pending'
      }
    })
    setStats(initialStats)
  }, [project.competitorModelIds, models])

  const handleStartCompetition = async () => {
    if (!refinedPrompt) {
      toast({
        title: 'No Refined Prompt',
        description: 'Please complete Phase 1 (Adversarial Refinement) first',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    setGenerations([])

    const newGenerations: CompetitorGeneration[] = []
    const updatedStats = [...stats]

    try {
      // Generate responses from each competitor model
      for (let i = 0; i < project.competitorModelIds.length; i++) {
        const modelId = project.competitorModelIds[i]
        const model = models.find(m => m.id === modelId)

        if (!model) {
          console.error(`Model ${modelId} not found`)
          updatedStats[i].status = 'failed'
          updatedStats[i].error = 'Model not found'
          setStats([...updatedStats])
          continue
        }

        setCurrentGeneratingModel(modelId)
        updatedStats[i].status = 'generating'
        setStats([...updatedStats])

        const startTime = Date.now()

        try {
          // Generate response with the competitor model
          const response = await openRouterService.createChatCompletion({
            model: modelId,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful AI assistant. Provide comprehensive, accurate, and well-structured responses.'
              },
              {
                role: 'user',
                content: refinedPrompt
              }
            ],
            max_tokens: 1500,
            temperature: 0.7
          })

          const generationTime = Date.now() - startTime
          const responseText = response.choices[0]?.message?.content || 'No response generated'

          // Calculate estimated cost
          const inputTokens = refinedPrompt.length / 4 // Rough estimate
          const outputTokens = responseText.length / 4
          const inputCost = (inputTokens * (model.pricing?.input || 0)) / 1_000_000
          const outputCost = (outputTokens * (model.pricing?.output || 0)) / 1_000_000
          const totalCost = inputCost + outputCost

          const generation: CompetitorGeneration = {
            modelId,
            modelName: model.name,
            response: responseText,
            generationTime,
            tokenCount: outputTokens,
            estimatedCost: totalCost,
            timestamp: new Date().toISOString()
          }

          newGenerations.push(generation)
          onUpdate(newGenerations)

          // Update stats
          updatedStats[i] = {
            ...updatedStats[i],
            responseLength: responseText.length,
            generationTime,
            estimatedCost: totalCost,
            status: 'completed'
          }
          setStats([...updatedStats])

        } catch (error) {
          console.error(`Generation failed for ${modelId}:`, error)
          updatedStats[i].status = 'failed'
          updatedStats[i].error = error instanceof Error ? error.message : 'Generation failed'
          setStats([...updatedStats])
        }
      }

      setGenerations(newGenerations)
      onComplete(newGenerations)
      setCurrentGeneratingModel(null)

      if (newGenerations.length > 0) {
        toast({
          title: 'Competition Complete',
          description: `Generated ${newGenerations.length} responses from competitor models`,
        })
      } else {
        toast({
          title: 'Competition Failed',
          description: 'No responses were generated',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Competition failed:', error)
      toast({
        title: 'Competition Failed',
        description: error instanceof Error ? error.message : 'An error occurred during competition',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
      setCurrentGeneratingModel(null)
    }
  }

  const handleCopyResponse = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)

    toast({
      title: 'Copied',
      description: 'Response copied to clipboard',
    })
  }

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`
  }

  const getProgressValue = () => {
    const completed = stats.filter(s => s.status === 'completed').length
    return (completed / stats.length) * 100
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Phase 2: Competitive Generation
          </CardTitle>
          <CardDescription>
            Multiple AI models compete to generate the best response to the refined prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Refined Prompt Display */}
          {refinedPrompt ? (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Refined Prompt from Phase 1:</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{refinedPrompt}</p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    No Refined Prompt Available
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Complete Phase 1 (Adversarial Refinement) to generate a refined prompt
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Competition Button */}
          <Button
            onClick={handleStartCompetition}
            disabled={isGenerating || !refinedPrompt}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating Responses...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Start Competition ({project.competitorModelIds.length} Models)
              </>
            )}
          </Button>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Competition Progress</span>
                <span>
                  {stats.filter(s => s.status === 'completed').length}/{stats.length} models
                </span>
              </div>
              <Progress value={getProgressValue()} />

              {currentGeneratingModel && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <span>Generating with {stats.find(s => s.modelId === currentGeneratingModel)?.modelName}...</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Status Grid */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Competition Status</CardTitle>
            <CardDescription>Real-time status of each competitor model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <Card key={stat.modelId} className={cn(
                  'relative',
                  stat.status === 'generating' && 'border-primary',
                  stat.status === 'failed' && 'border-destructive'
                )}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">
                            {stat.modelName}
                          </p>
                        </div>
                        <Badge
                          variant={
                            stat.status === 'completed' ? 'default' :
                            stat.status === 'generating' ? 'secondary' :
                            stat.status === 'failed' ? 'destructive' :
                            'outline'
                          }
                        >
                          {stat.status}
                        </Badge>
                      </div>

                      {stat.status === 'completed' && (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Response Length:</span>
                            <span>{stat.responseLength} chars</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Generation Time:</span>
                            <span>{formatTime(stat.generationTime)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Est. Cost:</span>
                            <span>{formatCost(stat.estimatedCost)}</span>
                          </div>
                        </div>
                      )}

                      {stat.status === 'generating' && (
                        <div className="flex items-center justify-center py-4">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}

                      {stat.status === 'failed' && stat.error && (
                        <div className="text-sm text-destructive">
                          Error: {stat.error}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Responses */}
      {generations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Responses</CardTitle>
            <CardDescription>
              Review and compare responses from all competitor models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="0" className="w-full">
              <TabsList className="grid w-full" style={{
                gridTemplateColumns: `repeat(${Math.min(generations.length, 4)}, 1fr)`
              }}>
                {generations.map((gen, index) => (
                  <TabsTrigger key={index} value={index.toString()}>
                    {gen.modelName.split('/').pop()}
                  </TabsTrigger>
                ))}
              </TabsList>

              {generations.map((gen, index) => (
                <TabsContent key={index} value={index.toString()} className="space-y-4">
                  {/* Response Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Generation Time</p>
                        <p className="text-sm font-medium">{formatTime(gen.generationTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Token Count</p>
                        <p className="text-sm font-medium">{Math.round(gen.tokenCount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Cost</p>
                        <p className="text-sm font-medium">{formatCost(gen.estimatedCost)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Length</p>
                        <p className="text-sm font-medium">{gen.response.length} chars</p>
                      </div>
                    </div>
                  </div>

                  {/* Response Content */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopyResponse(gen.response, index)}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>

                    <ScrollArea className="h-[400px] border rounded-lg p-4">
                      <div className="whitespace-pre-wrap pr-16">
                        {gen.response}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Summary Statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Competitors</p>
                      <p className="text-2xl font-bold">{generations.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Time</p>
                      <p className="text-2xl font-bold">
                        {formatTime(
                          generations.reduce((acc, gen) => acc + gen.generationTime, 0) / generations.length
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Tokens</p>
                      <p className="text-2xl font-bold">
                        {Math.round(
                          generations.reduce((acc, gen) => acc + gen.tokenCount, 0) / generations.length
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-bold">
                        {formatCost(
                          generations.reduce((acc, gen) => acc + gen.estimatedCost, 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}