import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Copy,
  Check,
  Zap,
  Brain,
  Loader2,
  Settings,
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
  Eye,
  EyeOff,
  AlertCircle,
  History,
  PlayCircle,
  X,
  ChevronUp,
  Sliders
} from 'lucide-react'
import { useLLMConfigStore } from '@/store/llm-config-hybrid'
import { openRouterService } from '@/services/openrouter'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/utils/cn'
import { useNavigate, Link } from 'react-router-dom'

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
  const [overallProgress, setOverallProgress] = useState(0)
  const [showFullContent, setShowFullContent] = useState<Record<string, boolean>>({})
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [failedModels, setFailedModels] = useState<Set<string>>(new Set())

  // Settings state - simplified
  const [autoRounds, setAutoRounds] = useState(3)
  const [temperature, setTemperature] = useState(0.7)
  const [showDetailedCritiques, setShowDetailedCritiques] = useState(false)
  const [autoEnhancePrompt, setAutoEnhancePrompt] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Get only enabled models from config
  const availableModels = useMemo(() => {
    if (!config?.enabledModelIds || config.enabledModelIds.length === 0) {
      return []
    }
    return models.filter(model => config.enabledModelIds.includes(model.id))
  }, [models, config])

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

      // Use a good general model for prompt enhancement
      const enhanceModel = availableModels.find(m =>
        m.id.includes('claude') || m.id.includes('gpt-4')
      )?.id || availableModels[0]?.id || 'openrouter/auto'

      const response = await openRouterService.createChatCompletion({
        model: enhanceModel,
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

  const cancelOperation = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      toast({
        title: 'Operation Cancelled',
        description: 'The current operation has been stopped',
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

    // Create new abort controller for this operation
    const controller = new AbortController()
    setAbortController(controller)

    setIsRunning(true)
    setRounds([])
    setOverallProgress(0)
    setFailedModels(new Set())

    try {
      // Get models for this run, excluding failed ones
      let modelsToUse = availableModels.filter(m => !failedModels.has(m.id))

      if (modelsToUse.length === 0) {
        // Reset failed models if all have failed
        setFailedModels(new Set())
        modelsToUse = [...availableModels]
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

      // Check if cancelled
      if (controller.signal.aborted) {
        throw new Error('Operation cancelled')
      }

      const response = await openRouterService.createChatCompletion({
        model: firstModel.id,
        messages: [{ role: 'user', content: promptToUse }],
        temperature,
      })

      const initialAnswer = response.choices[0].message.content
      const duration = Date.now() - startTime

      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: initialAnswer, isRefining: false, quality: 60, duration }
          : r
      ))

      setOverallProgress(Math.floor((1 / (autoRounds + 1)) * 100))

      // Start refinement rounds
      await refineWithModels(initialAnswer, promptToUse, 1, modelsToUse, controller)
    } catch (error: any) {
      console.error('Generation failed:', error)

      if (error.message === 'Operation cancelled') {
        setIsRunning(false)
        setAbortController(null)
        return
      }

      const errorMessage = error.message || 'Failed to generate initial answer'
      const modelName = rounds[rounds.length - 1]?.modelName || 'Unknown model'

      toast({
        title: 'Generation Failed',
        description: `${modelName}: ${errorMessage}`,
        variant: 'destructive',
      })
    } finally {
      setIsRunning(false)
      setOverallProgress(100)
      setAbortController(null)
    }
  }

  const refineWithModels = async (
    previousAnswer: string,
    originalQuestion: string,
    roundNumber: number,
    modelsToUse: typeof availableModels,
    controller: AbortController
  ) => {
    if (roundNumber > autoRounds) return

    // Check if cancelled
    if (controller.signal.aborted) {
      throw new Error('Operation cancelled')
    }

    // Select next model, skipping failed ones
    let modelIndex = roundNumber % modelsToUse.length
    let model = modelsToUse[modelIndex]

    // Find next non-failed model
    let attempts = 0
    while (failedModels.has(model.id) && attempts < modelsToUse.length) {
      modelIndex = (modelIndex + 1) % modelsToUse.length
      model = modelsToUse[modelIndex]
      attempts++
    }

    if (attempts >= modelsToUse.length) {
      console.log('All models have failed, resetting failed models list')
      setFailedModels(new Set())
    }

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

      // Check again before API call
      if (controller.signal.aborted) {
        throw new Error('Operation cancelled')
      }

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
        temperature,
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

      setOverallProgress(Math.floor(((roundNumber + 1) / (autoRounds + 1)) * 100))

      // Continue refinement
      await refineWithModels(improvedAnswer, originalQuestion, roundNumber + 1, modelsToUse, controller)
    } catch (error: any) {
      console.error(`Refinement failed for ${model.name}:`, error)

      // Mark this model as failed if it's a timeout
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        setFailedModels(prev => new Set([...prev, model.id]))

        toast({
          title: 'Model Timeout',
          description: `${model.name} took too long to respond. Skipping to next model...`,
          variant: 'destructive',
        })

        // Update the round to show it failed
        setRounds(prev => prev.map(r =>
          r.id === roundId
            ? { ...r, content: 'Failed: Timeout', isRefining: false, quality: 0 }
            : r
        ))

        // Try with next round/model if not at the end
        if (roundNumber <= autoRounds) {
          await refineWithModels(previousAnswer, originalQuestion, roundNumber + 1, modelsToUse, controller)
        }
      } else if (error.message === 'Operation cancelled') {
        throw error // Re-throw cancellation
      } else {
        toast({
          title: 'Refinement Issue',
          description: `${model.name}: ${error.message || 'Unknown error'}`,
          variant: 'destructive',
        })
      }
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

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
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
                    FFA (Free-For-All)
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Multi-model AI competition and refinement
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Card className="border-2">
                  <CardContent className="flex items-center gap-2 p-3">
                    <Bot className="h-5 w-5 text-blue-500" />
                    <div className="text-right">
                      <div className="text-2xl font-bold">{availableModels.length}</div>
                      <div className="text-xs text-muted-foreground">Active Models</div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate('/llm-config')}
                  className="h-12 w-12"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Question Card with inline settings */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Your Question
              </span>
              {question.trim() && !promptEnhanced && (
                <Button
                  size="sm"
                  variant={autoEnhancePrompt ? "default" : "outline"}
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

            {/* Quick settings inline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="rounds" className="text-sm">Refinement Rounds</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAutoRounds(Math.max(1, autoRounds - 1))}
                    disabled={isRunning}
                    className="h-8 w-8 p-0"
                  >
                    -
                  </Button>
                  <div className="w-12 text-center font-bold">{autoRounds}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAutoRounds(Math.min(10, autoRounds + 1))}
                    disabled={isRunning}
                    className="h-8 w-8 p-0"
                  >
                    +
                  </Button>
                </div>
              </div>


              <div className="flex items-center justify-between">
                <Label htmlFor="auto-enhance" className="text-sm">Auto Enhance</Label>
                <Switch
                  id="auto-enhance"
                  checked={autoEnhancePrompt}
                  onCheckedChange={setAutoEnhancePrompt}
                  disabled={isRunning}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="critiques" className="text-sm">Show Critiques</Label>
                <Switch
                  id="critiques"
                  checked={showDetailedCritiques}
                  onCheckedChange={setShowDetailedCritiques}
                />
              </div>
            </div>

            {/* Advanced settings collapsible */}
            <div className="border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full justify-between p-4"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  Advanced Settings
                </span>
                {showAdvancedSettings ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showAdvancedSettings && (
                <div className="p-4 pt-0 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Temperature: {temperature}</Label>
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
                      value={[temperature]}
                      onValueChange={(v) => setTemperature(v[0])}
                      min={0}
                      max={1}
                      step={0.1}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {availableModels.length === 0 ? (
                  <>No models enabled. <Link to="/llm-config" className="underline">Configure models</Link></>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Gauge className="h-3 w-3" />
                    {autoRounds * Math.min(availableModels.length, 5)} AI Passes
                  </Badge>
                )}
              </div>

              {isRunning ? (
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={cancelOperation}
                    className="gap-2"
                  >
                    <X className="h-5 w-5" />
                    Cancel
                  </Button>
                  <Button
                    size="lg"
                    disabled
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  >
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Refining... {Math.round(overallProgress)}%
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={generateAndRefine}
                  disabled={(!question.trim() && !enhancedPrompt.trim()) || availableModels.length === 0}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  <PlayCircle className="h-5 w-5" />
                  Generate & Refine
                </Button>
              )}
            </div>

            {isRunning && (
              <Progress value={overallProgress} className="h-2" />
            )}
          </CardContent>
        </Card>

        {/* Quick Examples */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Quick Examples
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
                    if (autoEnhancePrompt) {
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

        {/* Results Section - Always visible when there are results */}
        {rounds.length > 0 && (
          <div className="space-y-6">
            {/* Best Answer */}
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
                          round.quality === getBestAnswer()?.quality && "ring-2 ring-purple-500",
                          round.content === 'Failed: Timeout' && "border-red-500 bg-red-50 dark:bg-red-950/20"
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
                          {showDetailedCritiques && round.critique && (
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
                          ) : round.content === 'Failed: Timeout' ? (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Model timed out after 2 minutes. The model may be overloaded.
                              </span>
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
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}