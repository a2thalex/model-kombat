import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Settings
} from 'lucide-react'
import { useLLMConfigStore } from '@/store/llm-config-hybrid'
import { openRouterService, createMessageWithFiles } from '@/services/openrouter'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/utils/cn'
import { useNavigate } from 'react-router-dom'
import { getFlagshipModels } from '@/utils/flagship-models'
import { FileUpload } from '@/components/FileUpload'
import { uploadFiles, type UploadedFile, deleteFile } from '@/services/file-upload'
import { useAuthStore } from '@/store/auth'
import { ResponseRating } from '@/components/ResponseRating'
import { recordBatchJudgments } from '@/services/preference-tracking'

interface RefinementRound {
  id: string
  modelId: string
  modelName: string
  content: string
  critique?: string
  timestamp: Date
  isRefining: boolean
  userRating?: number
  isWinner?: boolean
}

export default function LazyMode() {
  const navigate = useNavigate()
  const { config, models, loadConfig } = useLLMConfigStore()
  const { user } = useAuthStore()
  const [question, setQuestion] = useState('')
  const [rounds, setRounds] = useState<RefinementRound[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('auto-flagship')
  const [autoRounds, setAutoRounds] = useState(3)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [useFlagshipModels] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Get flagship models from available models
  const flagshipModels = getFlagshipModels(models)

  // Use flagship models if enabled and available, otherwise use user's enabled models
  const modelsToUse = useFlagshipModels && flagshipModels.length > 0
    ? flagshipModels
    : models.filter(model => config?.enabledModelIds?.includes(model.id))

  // If no models are configured, use auto
  const availableModels = modelsToUse.length > 0 ? modelsToUse : [{ id: 'openrouter/auto', name: 'Auto (OpenRouter)' }]

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

  const handleFilesSelected = async (files: File[]) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to upload files',
        variant: 'destructive',
      })
      return
    }

    setIsUploadingFiles(true)
    try {
      const uploaded = await uploadFiles(files, {
        userId: user.id,
        convertToBase64: true,
      })

      setUploadedFiles(prev => [...prev, ...uploaded])

      toast({
        title: 'Files Uploaded',
        description: `${uploaded.length} file(s) uploaded successfully`,
      })
    } catch (error) {
      console.error('File upload failed:', error)
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: 'destructive',
      })
    } finally {
      setIsUploadingFiles(false)
    }
  }

  const handleRemoveFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId)
    if (!file) return

    try {
      await deleteFile(file.storageRef)
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId))

      toast({
        title: 'File Removed',
        description: 'File has been deleted',
      })
    } catch (error) {
      console.error('File deletion failed:', error)
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete file',
        variant: 'destructive',
      })
    }
  }

  const handleRateResponse = async (roundId: string, rating: number) => {
    if (!user) return

    setRounds(prev =>
      prev.map(r => (r.id === roundId ? { ...r, userRating: rating } : r))
    )

    const round = rounds.find(r => r.id === roundId)
    if (round) {
      try {
        await recordBatchJudgments(user.id, question, [
          {
            modelId: round.modelId,
            modelName: round.modelName,
            rating,
            isWinner: round.isWinner || false,
          },
        ])

        toast({
          title: 'Rating Saved',
          description: `Rated ${round.modelName} ${rating} stars`,
        })
      } catch (error) {
        console.error('Failed to save rating:', error)
        toast({
          title: 'Failed to save rating',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSelectWinner = async (roundId: string) => {
    if (!user) return

    setRounds(prev =>
      prev.map(r => ({
        ...r,
        isWinner: r.id === roundId,
      }))
    )

    try {
      const judgments = rounds.map(r => ({
        modelId: r.modelId,
        modelName: r.modelName,
        rating: r.userRating || 3,
        isWinner: r.id === roundId,
      }))

      await recordBatchJudgments(user.id, question, judgments)

      const winner = rounds.find(r => r.id === roundId)
      toast({
        title: 'Winner Selected',
        description: `${winner?.modelName} marked as best response`,
      })
    } catch (error) {
      console.error('Failed to save winner:', error)
      toast({
        title: 'Failed to save selection',
        variant: 'destructive',
      })
    }
  }

  const generateInitialAnswer = async () => {
    if (!question.trim()) {
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

    setIsRunning(true)
    const roundId = Date.now().toString()

    try {
      // Create initial round
      const initialRound: RefinementRound = {
        id: roundId,
        modelId: selectedModel,
        modelName: selectedModel === 'openrouter/auto'
          ? 'Auto (OpenRouter)'
          : models.find(m => m.id === selectedModel)?.name || selectedModel,
        content: '',
        timestamp: new Date(),
        isRefining: true
      }

      setRounds([initialRound])

      // Create message content with uploaded files
      const messageContent = createMessageWithFiles(question, uploadedFiles)

      // Generate initial answer
      const response = await openRouterService.createChatCompletion({
        model: selectedModel,
        messages: [
          { role: 'user', content: messageContent }
        ],
        temperature: 0.7,
      })

      // Validate response structure
      if (!response.choices || response.choices.length === 0 || !response.choices[0].message?.content) {
        const errorInfo = (response as any).error?.message || (response as any).error || 'Missing choices or content'
        throw new Error(`Invalid API response: ${errorInfo}`)
      }

      const initialContent = response.choices[0].message.content

      // Update with answer
      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: initialContent, isRefining: false }
          : r
      ))

      // Start auto-refinement if enabled
      if (autoRounds > 0) {
        await startAutoRefinement(initialContent, 1)
      }
    } catch (error: any) {
      console.error('Failed to generate answer:', error)
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate initial answer',
        variant: 'destructive',
      })
      setRounds([])
    } finally {
      setIsRunning(false)
    }
  }

  const startAutoRefinement = async (previousAnswer: string, roundNumber: number) => {
    if (roundNumber > autoRounds) {
      setIsRunning(false)
      return
    }

    const roundId = Date.now().toString()

    // Select a different model or use the same one
    const modelsToUse = availableModels.length > 0 ? availableModels : [{ id: 'openrouter/auto', name: 'Auto' }]
    const modelIndex = roundNumber % modelsToUse.length
    const model = modelsToUse[modelIndex]

    try {
      // Add new round
      const newRound: RefinementRound = {
        id: roundId,
        modelId: model.id,
        modelName: model.name || model.id,
        content: '',
        timestamp: new Date(),
        isRefining: true
      }

      setRounds(prev => [...prev, newRound])

      // Generate critique and improvement
      const critiquePrompt = `You are reviewing an answer to the following question:

Question: "${question}"

Current Answer:
${previousAnswer}

Please provide:
1. A brief critique identifying what could be improved
2. An improved version of the answer that addresses those improvements

Format your response as:
CRITIQUE: [Your critique here]

IMPROVED ANSWER: [Your improved answer here]`

      const response = await openRouterService.createChatCompletion({
        model: model.id,
        messages: [
          { role: 'user', content: critiquePrompt }
        ],
        temperature: 0.7,
      })

      // Validate response structure
      if (!response.choices || response.choices.length === 0 || !response.choices[0].message?.content) {
        const errorInfo = (response as any).error?.message || (response as any).error || 'Missing choices or content'
        throw new Error(`Invalid API response: ${errorInfo}`)
      }

      const responseText = response.choices[0].message.content

      // Parse critique and improved answer
      const critiqueMatch = responseText.match(/CRITIQUE:(.*?)(?=IMPROVED ANSWER:|$)/s)
      const improvedMatch = responseText.match(/IMPROVED ANSWER:(.*)/s)

      const critique = critiqueMatch ? critiqueMatch[1].trim() : ''
      const improvedAnswer = improvedMatch ? improvedMatch[1].trim() : responseText

      // Update round
      setRounds(prev => prev.map(r =>
        r.id === roundId
          ? { ...r, content: improvedAnswer, critique, isRefining: false }
          : r
      ))

      // Continue refinement
      await startAutoRefinement(improvedAnswer, roundNumber + 1)
    } catch (error: any) {
      console.error('Refinement failed:', error)
      toast({
        title: 'Refinement Failed',
        description: error.message || `Failed at round ${roundNumber}`,
        variant: 'destructive',
      })
      setIsRunning(false)
    }
  }

  const refineLastAnswer = async () => {
    if (rounds.length === 0) return

    const lastRound = rounds[rounds.length - 1]
    setIsRunning(true)
    await startAutoRefinement(lastRound.content, rounds.length)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Lazy Mode
            </h1>
            <p className="text-muted-foreground mt-1">
              Paste your question and watch AI models iteratively improve the answer
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/llm-config')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Configure Models
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Question</CardTitle>
              <CardDescription>
                Enter the question you want a refined answer for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What's your question? (e.g., 'How does quantum computing work?')"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[150px]"
                disabled={isRunning}
              />

              {/* File Upload for Vision/Audio Models */}
              <FileUpload
                onFilesSelected={handleFilesSelected}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
                disabled={isRunning || isUploadingFiles}
              />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Model:</label>
                  <select
                    className="flex-1 px-3 py-1 border rounded-md text-sm"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isRunning}
                  >
                    <option value="openrouter/auto">Auto (Let OpenRouter choose)</option>
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Auto-refine rounds:</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={autoRounds}
                    onChange={(e) => setAutoRounds(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-1 border rounded-md text-sm"
                    disabled={isRunning}
                  />
                  <span className="text-xs text-muted-foreground">
                    (0 = manual only)
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={generateInitialAnswer}
                  disabled={isRunning || !question.trim()}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Generate & Refine
                    </>
                  )}
                </Button>

                {rounds.length > 0 && !isRunning && (
                  <Button
                    onClick={refineLastAnswer}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refine Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How Lazy Mode Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Enter your question and click "Generate & Refine"</span>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>AI generates an initial answer</span>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Each round, an AI critiques and improves the previous answer</span>
              </div>
              <div className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Watch the answer evolve and improve with each iteration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div>
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <CardTitle>Refinement History</CardTitle>
              <CardDescription>
                {rounds.length === 0
                  ? 'Your refined answers will appear here'
                  : `${rounds.length} refinement${rounds.length === 1 ? '' : 's'} completed`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {rounds.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Brain className="h-12 w-12 mx-auto opacity-20" />
                    <p>No refinements yet</p>
                    <p className="text-sm">Enter a question to get started</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-4">
                    {rounds.map((round, index) => (
                      <div
                        key={round.id}
                        className={cn(
                          "border rounded-lg p-4 space-y-3",
                          round.isRefining && "opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Round {index + 1}
                            </Badge>
                            <span className="text-sm font-medium">
                              {round.modelName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {round.isRefining ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
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

                        {round.critique && (
                          <div className="bg-muted/50 rounded p-3 text-sm">
                            <span className="font-medium text-muted-foreground">Critique: </span>
                            {round.critique}
                          </div>
                        )}

                        <div className="text-sm">
                          {round.isRefining ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Sparkles className="h-4 w-4 animate-pulse" />
                              Refining answer...
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              {round.content}
                            </div>
                          )}
                        </div>

                        {/* Rating Component */}
                        {user && !round.isRefining && (
                          <div className="pt-3 border-t">
                            <ResponseRating
                              modelId={round.modelId}
                              modelName={round.modelName}
                              currentRating={round.userRating}
                              isWinner={round.isWinner}
                              onRate={(rating) => handleRateResponse(round.id, rating)}
                              onSelectWinner={() => handleSelectWinner(round.id)}
                              disabled={isRunning}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}