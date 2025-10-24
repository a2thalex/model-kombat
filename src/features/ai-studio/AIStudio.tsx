import { useState, useEffect, useMemo } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  BarChart3,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  History,
  PlayCircle,
  X
} from 'lucide-react'
import { useLLMConfigStore } from '@/store/llm-config-hybrid'
import { openRouterService } from '@/services/openrouter'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/utils/cn'
import { useNavigate } from 'react-router-dom'
import { FLAGSHIP_MODEL_IDS, getFlagshipModels, getModelForRound, isFlagshipModel, groupModelsByProvider } from '@/utils/flagship-models'
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
  duration?: number // Time taken in ms
}

interface AIStudioSettings {
  autoRounds: number
  useOnlyFlagship: boolean
  randomizeOrder: boolean
  temperature: number
  showDetailedCritiques: boolean
  autoEnhancePrompt: boolean
}

export default function AIStudio() {
  const navigate = useNavigate()
  const { config, models, loadConfig } = useLLMConfigStore()
  const [question, setQuestion] = useState('')
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [promptEnhanced, setPromptEnhanced] = useState(false)
  const [rounds, setRounds] = useState<RefinementRound[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('compose')
  const [overallProgress, setOverallProgress] = useState(0)
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [showFullContent, setShowFullContent] = useState<Record<string, boolean>>({})

  // Settings state
  const [settings, setSettings] = useState<AIStudioSettings>({
    autoRounds: 3,
    useOnlyFlagship: true,
    randomizeOrder: false,
    temperature: 0.7,
    showDetailedCritiques: true,
    autoEnhancePrompt: false,
  })

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Get flagship and available models
  const flagshipModels = useMemo(() =>
    models.filter(model => isFlagshipModel(model.id)),
    [models]
  )

  const availableModels = useMemo(() => {
    if (selectedModels.length > 0) {
      return models.filter(m => selectedModels.includes(m.id))
    }
    if (settings.useOnlyFlagship) {
      return flagshipModels.length > 0 ? flagshipModels : models
    }
    return models
  }, [models, flagshipModels, selectedModels, settings.useOnlyFlagship])

  const groupedModels = useMemo(() =>
    groupModelsByProvider(availableModels),
    [availableModels]
  )

  const enhancePrompt = async () => {
    if (!question.trim()) return

    setIsEnhancing(true)
    const startTime = Date.now()

    try {
      const enhancementPrompt = `You are a prompt engineering expert. Enhance this question to be clearer, more specific, and likely to generate better responses from AI models.

Original Question: "${question}"

Provide ONLY the enhanced version of the question, without explanations or prefixes. Make it:
- More specific and clear
- Include relevant context if needed
- Well-structured
- Optimized for getting comprehensive answers`

      const response = await openRouterService.createChatCompletion({
        model: flagshipModels[0]?.id || 'openrouter/auto',
        messages: [{ role: 'user', content: enhancementPrompt }],
        temperature: 0.7,
      })

      const enhanced = response.choices[0].message.content.trim()
      setEnhancedPrompt(enhanced)
      setPromptEnhanced(true)

      toast({
        title: 'Prompt Enhanced!',
        description: `Optimized in ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
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
        title: 'Copied!',
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
        title: 'API Key Required',
        description: 'Please configure your OpenRouter API key first',
        variant: 'destructive',
      })
      navigate('/llm-config')
      return
    }

    if (availableModels.length === 0) {
      toast({
        title: 'No models available',
        description: 'Please enable some models first',
        variant: 'destructive',
      })
      return
    }

    setIsRunning(true)
    setRounds([])
    setSelectedTab('results')
    setOverallProgress(0)

    try {
      // Get models for this run
      let modelsToUse = [...availableModels]
      if (settings.randomizeOrder) {
        modelsToUse = modelsToUse.sort(() => Math.random() - 0.5)
      }

      // Generate initial answer with first model
      const firstModel = modelsToUse[0]
      const roundId = Date.now().toString()
      const startTime = Date.now()

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
        temperature: settings.temperature,
      })

      const initialAnswer = response.choices[0].message.content
      const duration = Date.now() - startTime

      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: initialAnswer, isRefining: false, quality: 60, duration }
          : r
      ))

      setOverallProgress(Math.floor((1 / (settings.autoRounds + 1)) * 100))

      // Start refinement rounds
      await refineWithModels(initialAnswer, promptToUse, 1, modelsToUse)
    } catch (error: any) {
      console.error('Generation failed:', error)
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate initial answer',
        variant: 'destructive',
      })
    } finally {
      setIsRunning(false)
      setOverallProgress(100)
    }
  }

  const refineWithModels = async (
    previousAnswer: string,
    originalQuestion: string,
    roundNumber: number,
    modelsToUse: typeof availableModels
  ) => {
    if (roundNumber > settings.autoRounds) return

    // Select next model
    const modelIndex = roundNumber % modelsToUse.length
    const model = modelsToUse[modelIndex]
    const roundId = Date.now().toString()
    const startTime = Date.now()

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
        temperature: settings.temperature,
      })

      const responseText = response.choices[0].message.content
      const duration = Date.now() - startTime

      const improvementsMatch = responseText.match(/IMPROVEMENTS NEEDED:(.*?)(?=ENHANCED ANSWER:|$)/s)
      const enhancedMatch = responseText.match(/ENHANCED ANSWER:(.*)/s)

      const critique = improvementsMatch ? improvementsMatch[1].trim() : ''
      const improvedAnswer = enhancedMatch ? enhancedMatch[1].trim() : responseText

      // Calculate quality score (increases with each round)
      const qualityScore = Math.min(60 + (roundNumber * 8), 100)

      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: improvedAnswer, critique, isRefining: false, quality: qualityScore, duration }
          : r
      ))

      setOverallProgress(Math.floor(((roundNumber + 1) / (settings.autoRounds + 1)) * 100))

      // Continue refinement
      await refineWithModels(improvedAnswer, originalQuestion, roundNumber + 1, modelsToUse)
    } catch (error: any) {
      console.error('Refinement failed:', error)
      toast({
        title: 'Refinement Issue',
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
      'meta-llama': Layers,
      mistralai: Flame,
      'x-ai': Rocket,
      qwen: Star,
      deepseek: Cpu,
      cohere: Activity,
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
      'meta-llama': 'bg-purple-100 text-purple-700 border-purple-200',
      mistralai: 'bg-red-100 text-red-700 border-red-200',
      'x-ai': 'bg-gray-100 text-gray-700 border-gray-200',
      qwen: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      deepseek: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      cohere: 'bg-pink-100 text-pink-700 border-pink-200',
      openrouter: 'bg-teal-100 text-teal-700 border-teal-200'
    }
    return colors[provider] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const addModelToSelection = (modelId: string) => {
    if (!selectedModels.includes(modelId)) {
      setSelectedModels(prev => [...prev, modelId])
    }
  }

  const removeModelFromSelection = (modelId: string) => {
    setSelectedModels(prev => prev.filter(id => id !== modelId))
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Modern Gradient Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-orange-600/20 animate-pulse"></div>
          <div className="relative bg-background/95 backdrop-blur rounded-[calc(1.5rem-4px)] p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl text-white">
                  <Zap className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    AI Studio
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Automatic iterative refinement powered by AI
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Card className="border-2">
                  <CardContent className="flex items-center gap-2 p-3">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div className="text-right">
                      <div className="text-2xl font-bold">{availableModels.length}</div>
                      <div className="text-xs text-muted-foreground">Active Models</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardContent className="flex items-center gap-2 p-3">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <div className="text-right">
                      <div className="text-2xl font-bold">{rounds.length}</div>
                      <div className="text-xs text-muted-foreground">Refinements</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Main Interface Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-muted/50">
            <TabsTrigger
              value="compose"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Compose
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Results
              {rounds.length > 0 && (
                <Badge className="ml-2" variant="secondary">{rounds.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="models"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
            >
              <Bot className="h-4 w-4 mr-2" />
              Models
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-purple-600" />
                    Your Question
                  </span>
                  {question.trim() && !promptEnhanced && (
                    <Button
                      size="sm"
                      variant={settings.autoEnhancePrompt ? "default" : "outline"}
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
                  placeholder="Ask anything... Be as specific as possible for best results."
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value)
                    setPromptEnhanced(false)
                    setEnhancedPrompt('')
                  }}
                  className="min-h-[150px] text-lg resize-none"
                  disabled={isRunning}
                />

                {promptEnhanced && enhancedPrompt && (
                  <div className="relative p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">Enhanced Version</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 px-2"
                        onClick={() => {
                          setPromptEnhanced(false)
                          setEnhancedPrompt('')
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-purple-800 dark:text-purple-200">{enhancedPrompt}</p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium min-w-[100px]">Refinements:</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSettings(s => ({ ...s, autoRounds: Math.max(1, s.autoRounds - 1) }))}
                          disabled={isRunning}
                          className="h-8 w-8 p-0"
                        >
                          -
                        </Button>
                        <div className="w-12 text-center font-bold text-lg">{settings.autoRounds}</div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSettings(s => ({ ...s, autoRounds: Math.min(10, s.autoRounds + 1) }))}
                          disabled={isRunning}
                          className="h-8 w-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Gauge className="h-3 w-3" />
                        {settings.autoRounds * Math.min(availableModels.length, 5)} AI Passes
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium min-w-[100px]">Temperature:</Label>
                      <Slider
                        value={[settings.temperature]}
                        onValueChange={(v) => setSettings(s => ({ ...s, temperature: v[0] }))}
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-32"
                        disabled={isRunning}
                      />
                      <span className="text-sm font-mono w-10">{settings.temperature}</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Higher values make output more creative but less focused</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={generateAndRefine}
                    disabled={isRunning || (!question.trim() && !enhancedPrompt.trim())}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Refining... {Math.round(overallProgress)}%
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-5 w-5" />
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Explain quantum entanglement simply',
                    'How to build a successful startup',
                    'Best practices for machine learning',
                    'Future of renewable energy',
                    'Tips for effective communication',
                    'Understanding cryptocurrency basics'
                  ].map((example) => (
                    <Button
                      key={example}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuestion(example)
                        if (settings.autoEnhancePrompt) {
                          enhancePrompt()
                        }
                      }}
                      className="justify-start text-xs hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      {example}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {rounds.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Trophy className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Enter a question and click "Generate & Refine" to see iterative improvements here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Best Answer Highlight */}
                {getBestAnswer() && (
                  <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Award className="h-6 w-6 text-purple-600" />
                          Best Answer
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                            {getBestAnswer()?.quality}% Quality
                          </Badge>
                          {getBestAnswer()?.duration && (
                            <Badge variant="outline" className="gap-1">
                              <Timer className="h-3 w-3" />
                              {formatDuration(getBestAnswer()?.duration)}
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[400px] pr-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{getBestAnswer()?.content}</p>
                      </ScrollArea>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn("gap-1", getProviderColor(getBestAnswer()?.provider || ''))}>
                          {getProviderIcon(getBestAnswer()?.provider || '')}
                          {getBestAnswer()?.modelName}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(getBestAnswer()?.content || '', 'best')}
                          className="gap-2"
                        >
                          {copiedId === 'best' ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Refinement History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Refinement History
                    </CardTitle>
                    <CardDescription>
                      Track the evolution of your answer through multiple AI models
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {rounds.map((round, index) => (
                          <Card
                            key={round.id}
                            className={cn(
                              "transition-all hover:shadow-lg",
                              round.isRefining && "opacity-60 animate-pulse",
                              round.quality === getBestAnswer()?.quality && "ring-2 ring-purple-500"
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
                                  {isFlagshipModel(round.modelId) && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Crown className="h-4 w-4 text-yellow-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Flagship Model
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {round.quality && (
                                    <Badge variant="outline" className="gap-1">
                                      <Star className="h-3 w-3 text-yellow-500" />
                                      {round.quality}%
                                    </Badge>
                                  )}
                                  {round.duration && (
                                    <Badge variant="outline" className="gap-1">
                                      <Timer className="h-3 w-3" />
                                      {formatDuration(round.duration)}
                                    </Badge>
                                  )}
                                  {!round.isRefining && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setShowFullContent(prev => ({
                                        ...prev,
                                        [round.id]: !prev[round.id]
                                      }))}
                                    >
                                      {showFullContent[round.id] ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
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
                              {settings.showDetailedCritiques && round.critique && (
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
                                <p className={cn(
                                  "text-sm leading-relaxed whitespace-pre-wrap",
                                  !showFullContent[round.id] && "line-clamp-4"
                                )}>
                                  {round.content}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Available Models */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Available Models
                  </CardTitle>
                  <CardDescription>
                    Select specific models for refinement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ModelSelector
                      models={models}
                      selectedModelId=""
                      onSelectModel={(modelId) => addModelToSelection(modelId)}
                      placeholder="Add a model..."
                      className="flex-1"
                      disabled={isRunning}
                    />
                  </div>

                  {selectedModels.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Selected Models ({selectedModels.length})</Label>
                        <div className="space-y-2">
                          {selectedModels.map(modelId => {
                            const model = models.find(m => m.id === modelId)
                            if (!model) return null
                            const provider = modelId.split('/')[0]

                            return (
                              <div
                                key={modelId}
                                className="flex items-center justify-between p-2 rounded-lg border"
                              >
                                <div className="flex items-center gap-2">
                                  {getProviderIcon(provider)}
                                  <span className="text-sm">{model.name}</span>
                                  {isFlagshipModel(modelId) && (
                                    <Crown className="h-3 w-3 text-yellow-500" />
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeModelFromSelection(modelId)}
                                  disabled={isRunning}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedModels([])}
                          disabled={isRunning}
                          className="w-full"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </>
                  )}

                  {selectedModels.length === 0 && settings.useOnlyFlagship && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4" />
                        <span>Using all flagship models automatically</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flagship Models */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Flagship Models
                    </span>
                    <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      {flagshipModels.length} Active
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    The best models from each provider
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {Object.entries(groupModelsByProvider(flagshipModels)).map(([provider, models]) => (
                        <div key={provider}>
                          <div className="flex items-center gap-2 mb-2">
                            {getProviderIcon(provider)}
                            <span className="font-semibold capitalize">{provider}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {models.length} model{models.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="space-y-1">
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
                  </ScrollArea>

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
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  AI Studio Settings
                </CardTitle>
                <CardDescription>
                  Configure how refinement works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="use-flagship">Use Only Flagship Models</Label>
                      <p className="text-xs text-muted-foreground">
                        Limit refinement to the best models from each provider
                      </p>
                    </div>
                    <Switch
                      id="use-flagship"
                      checked={settings.useOnlyFlagship}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, useOnlyFlagship: v }))}
                      disabled={isRunning}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="randomize">Randomize Model Order</Label>
                      <p className="text-xs text-muted-foreground">
                        Use models in random order for varied perspectives
                      </p>
                    </div>
                    <Switch
                      id="randomize"
                      checked={settings.randomizeOrder}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, randomizeOrder: v }))}
                      disabled={isRunning}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-enhance">Auto-Enhance Prompts</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically optimize questions before processing
                      </p>
                    </div>
                    <Switch
                      id="auto-enhance"
                      checked={settings.autoEnhancePrompt}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, autoEnhancePrompt: v }))}
                      disabled={isRunning}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-critiques">Show Detailed Critiques</Label>
                      <p className="text-xs text-muted-foreground">
                        Display improvement points for each refinement round
                      </p>
                    </div>
                    <Switch
                      id="show-critiques"
                      checked={settings.showDetailedCritiques}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, showDetailedCritiques: v }))}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Temperature: {settings.temperature}</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Controls randomness. 0 = focused, 1 = creative</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Slider
                      value={[settings.temperature]}
                      onValueChange={(v) => setSettings(s => ({ ...s, temperature: v[0] }))}
                      min={0}
                      max={1}
                      step={0.1}
                      disabled={isRunning}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Focused</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Refinement Rounds: {settings.autoRounds}</Label>
                      <Badge variant="secondary">
                        {settings.autoRounds * Math.min(availableModels.length, 5)} AI Passes
                      </Badge>
                    </div>
                    <Slider
                      value={[settings.autoRounds]}
                      onValueChange={(v) => setSettings(s => ({ ...s, autoRounds: v[0] }))}
                      min={1}
                      max={10}
                      step={1}
                      disabled={isRunning}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Quick (1)</span>
                      <span>Balanced (5)</span>
                      <span>Thorough (10)</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Performance Tips
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Lower temperature for factual questions</li>
                    <li>• Higher temperature for creative tasks</li>
                    <li>• More rounds improve quality but take longer</li>
                    <li>• Flagship models provide best results</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}