import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Brain,
  ChevronRight,
  Loader2,
  Settings,
  Wand2,
  Crown,
  Rocket,
  Star,
  TrendingUp,
  MessageSquare,
  Activity,
  Award,
  Layers,
  Bot,
  Flame,
  Shield,
  Target,
  Trophy,
  Gauge,
  BookOpen,
  ChevronDown,
  Info,
  ArrowRight,
  Timer,
  Cpu,
  BarChart3
} from 'lucide-react'
import { useLLMConfigStore } from '@/store/llm-config-hybrid'
import { openRouterService } from '@/services/openrouter'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/utils/cn'
import { useNavigate } from 'react-router-dom'
import { FLAGSHIP_MODEL_IDS, getFlagshipModels, getModelForRound } from '@/utils/flagship-models'
import ModelSelector from '@/components/model-selector/ModelSelector'

interface RefinementRound {
  id: string
  modelId: string
  modelName: string
  content: string
  critique?: string
  timestamp: Date
  isRefining: boolean
  quality?: number // Quality score 0-100
  provider?: string
}

export default function LazyModeV2() {
  const navigate = useNavigate()
  const { config, models, loadConfig } = useLLMConfigStore()
  const [question, setQuestion] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [promptEnhanced, setPromptEnhanced] = useState(false)
  const [rounds, setRounds] = useState<RefinementRound[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [autoRounds, setAutoRounds] = useState(5)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('compose')
  const [overallProgress, setOverallProgress] = useState(0)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Auto-detect and use flagship models
  const flagshipModels = models.filter(model =>
    FLAGSHIP_MODEL_IDS.some(flagshipId =>
      model.id.toLowerCase().includes(flagshipId.toLowerCase()) ||
      flagshipId.toLowerCase().includes(model.id.toLowerCase())
    )
  )

  // Group flagship models by provider
  const groupedFlagships = flagshipModels.reduce((acc, model) => {
    const provider = model.id.split('/')[0] || 'other'
    if (!acc[provider]) acc[provider] = []
    acc[provider].push(model)
    return acc
  }, {} as Record<string, typeof flagshipModels>)

  const availableModels = flagshipModels.length > 0 ? flagshipModels : [{ id: 'openrouter/auto', name: 'Auto' }]

  const enhancePrompt = async () => {
    if (!question.trim()) return

    setIsEnhancing(true)
    try {
      const enhancementPrompt = `You are a prompt engineering expert. Enhance this question to be clearer, more specific, and likely to generate better responses from AI models.

Original Question: "${question}"

Provide ONLY the enhanced version of the question, without explanations or prefixes. Make it:
- More specific and clear
- Include relevant context if needed
- Well-structured
- Optimized for getting comprehensive answers`

      const response = await openRouterService.createChatCompletion({
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: enhancementPrompt }],
        temperature: 0.7,
      })

      const enhanced = response.choices[0].message.content.trim()
      setEnhancedPrompt(enhanced)
      setPromptEnhanced(true)

      toast({
        title: '✨ Prompt Enhanced!',
        description: 'Your question has been optimized for better results',
      })
    } catch (error) {
      console.error('Enhancement failed:', error)
      toast({
        title: 'Enhancement failed',
        description: 'Using original question',
        variant: 'destructive',
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast({
        title: '📋 Copied!',
        description: 'Answer copied to clipboard',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast({
        title: 'Failed to copy',
        variant: 'destructive',
      })
    }
  }

  const generateAndRefine = async () => {
    const promptToUse = promptEnhanced ? enhancedPrompt : question

    if (!promptToUse.trim()) {
      toast({
        title: 'Please enter a question',
        variant: 'destructive',
      })
      return
    }

    if (!config?.openRouterApiKey) {
      toast({
        title: '🔑 API Key Required',
        description: 'Please configure your OpenRouter API key first',
        variant: 'destructive',
      })
      navigate('/llm-config')
      return
    }

    setIsRunning(true)
    setRounds([])
    setSelectedTab('results')
    setOverallProgress(0)

    try {
      // Generate initial answer with first flagship model
      const firstModel = availableModels[0]
      const roundId = Date.now().toString()

      const initialRound: RefinementRound = {
        id: roundId,
        modelId: firstModel.id,
        modelName: firstModel.name || firstModel.id,
        provider: firstModel.id.split('/')[0],
        content: '',
        timestamp: new Date(),
        isRefining: true,
        quality: 0
      }

      setRounds([initialRound])

      const response = await openRouterService.createChatCompletion({
        model: firstModel.id,
        messages: [{ role: 'user', content: promptToUse }],
        temperature: 0.7,
      })

      const initialAnswer = response.choices[0].message.content

      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: initialAnswer, isRefining: false, quality: 60 }
          : r
      ))

      setOverallProgress(Math.floor((1 / (autoRounds + 1)) * 100))

      // Start refinement rounds
      await refineWithFlagships(initialAnswer, promptToUse, 1)
    } catch (error: any) {
      console.error('Generation failed:', error)
      toast({
        title: '❌ Generation Failed',
        description: error.message || 'Failed to generate initial answer',
        variant: 'destructive',
      })
    } finally {
      setIsRunning(false)
      setOverallProgress(100)
    }
  }

  const refineWithFlagships = async (previousAnswer: string, originalQuestion: string, roundNumber: number) => {
    if (roundNumber > autoRounds) return

    // Select next flagship model (rotate through providers)
    const modelIndex = roundNumber % availableModels.length
    const model = availableModels[modelIndex]
    const roundId = Date.now().toString()

    try {
      const newRound: RefinementRound = {
        id: roundId,
        modelId: model.id,
        modelName: model.name || model.id,
        provider: model.id.split('/')[0],
        content: '',
        timestamp: new Date(),
        isRefining: true,
        quality: 0
      }

      setRounds(prev => [...prev, newRound])

      const critiquePrompt = `You are an expert reviewer helping to iteratively improve an answer.

Original Question: "${originalQuestion}"

Current Answer:
${previousAnswer}

Your task:
1. Identify 2-3 specific areas where this answer could be improved
2. Provide an enhanced version that addresses those improvements

Format your response as:
IMPROVEMENTS NEEDED:
• [First improvement point]
• [Second improvement point]
• [Third improvement point if applicable]

ENHANCED ANSWER:
[Your comprehensive improved answer here]`

      const response = await openRouterService.createChatCompletion({
        model: model.id,
        messages: [{ role: 'user', content: critiquePrompt }],
        temperature: 0.7,
      })

      const responseText = response.choices[0].message.content

      const improvementsMatch = responseText.match(/IMPROVEMENTS NEEDED:(.*?)(?=ENHANCED ANSWER:|$)/s)
      const enhancedMatch = responseText.match(/ENHANCED ANSWER:(.*)/s)

      const critique = improvementsMatch ? improvementsMatch[1].trim() : ''
      const improvedAnswer = enhancedMatch ? enhancedMatch[1].trim() : responseText

      // Calculate quality score (increases with each round)
      const qualityScore = Math.min(60 + (roundNumber * 8), 100)

      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: improvedAnswer, critique, isRefining: false, quality: qualityScore }
          : r
      ))

      setOverallProgress(Math.floor(((roundNumber + 1) / (autoRounds + 1)) * 100))

      // Continue refinement
      await refineWithFlagships(improvedAnswer, originalQuestion, roundNumber + 1)
    } catch (error: any) {
      console.error('Refinement failed:', error)
      toast({
        title: '⚠️ Refinement Issue',
        description: `Round ${roundNumber} failed, continuing...`,
      })
    }
  }

  const getBestAnswer = () => {
    if (rounds.length === 0) return null
    return rounds.reduce((best, current) =>
      (current.quality || 0) > (best.quality || 0) ? current : best
    )
  }

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, any> = {
      openai: Brain,
      anthropic: Shield,
      google: Target,
      meta: Layers,
      mistralai: Flame,
      'x-ai': Rocket,
      qwen: Star,
      openrouter: Bot
    }
    const Icon = icons[provider] || Bot
    return <Icon className="h-4 w-4" />
  }

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'bg-green-100 text-green-700 border-green-200',
      anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
      google: 'bg-blue-100 text-blue-700 border-blue-200',
      meta: 'bg-purple-100 text-purple-700 border-purple-200',
      mistralai: 'bg-red-100 text-red-700 border-red-200',
      'x-ai': 'bg-gray-100 text-gray-700 border-gray-200',
      qwen: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      openrouter: 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return colors[provider] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2">
                Lazy Mode
                <Badge className="bg-white/20 text-white border-white/30">AI Turbo</Badge>
              </h1>
              <p className="text-white/80 mt-1">
                Automatic iterative refinement with the world's best AI models
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-300" />
                <span className="font-semibold">{flagshipModels.length} Flagship Models</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-300" />
                <span className="font-semibold">{Object.keys(groupedFlagships).length} Providers</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-300" />
                <span className="font-semibold">{autoRounds}x Refinement</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="compose" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Trophy className="h-4 w-4 mr-2" />
            Results ({rounds.length})
          </TabsTrigger>
          <TabsTrigger value="models" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bot className="h-4 w-4 mr-2" />
            Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Your Question
                </span>
                {question.trim() && !promptEnhanced && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={enhancePrompt}
                    disabled={isEnhancing}
                    className="gap-2"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Enhance Prompt
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ask anything... (e.g., 'Explain how quantum computing could revolutionize cryptography')"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value)
                  setPromptEnhanced(false)
                  setEnhancedPrompt('')
                }}
                className="min-h-[120px] text-lg"
                disabled={isRunning}
              />

              {promptEnhanced && enhancedPrompt && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">Enhanced Version</span>
                  </div>
                  <p className="text-sm text-purple-800">{enhancedPrompt}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Refinement Rounds:</label>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAutoRounds(Math.max(1, autoRounds - 1))}
                        disabled={isRunning}
                        className="h-7 w-7 p-0"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center font-semibold">{autoRounds}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAutoRounds(Math.min(10, autoRounds + 1))}
                        disabled={isRunning}
                        className="h-7 w-7 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <Badge variant="outline" className="gap-1">
                    <Gauge className="h-3 w-3" />
                    {autoRounds * availableModels.length} AI Passes
                  </Badge>
                </div>

                <Button
                  size="lg"
                  onClick={generateAndRefine}
                  disabled={isRunning || (!question.trim() && !enhancedPrompt.trim())}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Refining... {Math.round(overallProgress)}%
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5" />
                      Generate & Refine
                    </>
                  )}
                </Button>
              </div>

              {isRunning && (
                <Progress value={overallProgress} className="h-2" />
              )}
            </CardContent>
          </Card>

          {/* Quick Start Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Quick Start Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Explain quantum entanglement',
                  'How to build a successful startup',
                  'Best practices for machine learning',
                  'Future of renewable energy'
                ].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuestion(example)}
                    className="justify-start text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {rounds.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Enter a question and click "Generate & Refine" to see iterative improvements here
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Best Answer Highlight */}
              {getBestAnswer() && (
                <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Best Answer
                      </span>
                      <Badge className="bg-primary text-primary-foreground">
                        {getBestAnswer()?.quality}% Quality
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{getBestAnswer()?.content}</p>
                    <div className="flex items-center justify-between mt-4">
                      <Badge variant="outline" className={cn("gap-1", getProviderColor(getBestAnswer()?.provider || ''))}>
                        {getProviderIcon(getBestAnswer()?.provider || '')}
                        {getBestAnswer()?.modelName}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(getBestAnswer()?.content || '', 'best')}
                      >
                        {copiedId === 'best' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Refinement History */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {rounds.map((round, index) => (
                    <Card
                      key={round.id}
                      className={cn(
                        "transition-all hover:shadow-md",
                        round.isRefining && "opacity-60 animate-pulse"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="gap-1">
                              Round {index + 1}
                            </Badge>
                            <Badge className={cn("gap-1", getProviderColor(round.provider || ''))}>
                              {getProviderIcon(round.provider || '')}
                              {round.modelName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {round.quality && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs font-semibold">{round.quality}%</span>
                              </div>
                            )}
                            {!round.isRefining && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopy(round.content, round.id)}
                              >
                                {copiedId === round.id ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {round.critique && (
                          <div className="mb-3 p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-3 w-3" />
                              <span className="text-xs font-semibold">Improvements Made</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{round.critique}</p>
                          </div>
                        )}

                        {round.isRefining ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Refining answer...</span>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed line-clamp-4">{round.content}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Auto-Enabled Flagship Models
                </span>
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  {flagshipModels.length} Active
                </Badge>
              </CardTitle>
              <CardDescription>
                The best models from each provider are automatically used for refinement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Object.entries(groupedFlagships).map(([provider, models]) => (
                  <div key={provider}>
                    <div className="flex items-center gap-2 mb-2">
                      {getProviderIcon(provider)}
                      <span className="font-semibold capitalize">{provider}</span>
                      <Badge variant="outline" className="text-xs">
                        {models.length} model{models.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {models.map(model => (
                        <div
                          key={model.id}
                          className={cn(
                            "p-2 rounded-lg border text-xs",
                            getProviderColor(provider)
                          )}
                        >
                          <div className="font-medium">{model.name || model.id}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {flagshipModels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No flagship models detected</p>
                  <p className="text-xs mt-1">Load the model catalog to enable auto-detection</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/llm-config')}
                    className="mt-3"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Models
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}