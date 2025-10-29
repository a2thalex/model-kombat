import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react'
import { geminiService } from '@/services/gemini'
import { toast } from '@/hooks/use-toast'

export default function GeminiTest() {
  const [apiKey, setApiKey] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const handleInitialize = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Gemini API key',
        variant: 'destructive',
      })
      return
    }

    try {
      geminiService.initialize(apiKey)
      setIsInitialized(true)
      toast({
        title: 'Initialized!',
        description: 'Gemini API is ready to use',
      })
    } catch (error) {
      toast({
        title: 'Initialization Failed',
        description: error instanceof Error ? error.message : 'Failed to initialize',
        variant: 'destructive',
      })
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a prompt',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    setResponse('')

    try {
      const result = await geminiService.generateContent(selectedModel, prompt, {
        temperature: 0.7,
      })

      setResponse(result)
      toast({
        title: 'Success!',
        description: 'Generated response from Gemini',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      })
      setResponse(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Sparkles className="h-10 w-10 text-purple-600" />
          Gemini AI Test
        </h1>
        <p className="text-muted-foreground mt-2">
          Test Google's Gemini AI models directly through Firebase
        </p>
      </div>

      {/* API Key Setup */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Initialize Gemini API</CardTitle>
          <CardDescription>
            Get your API key from{' '}
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline"
            >
              Google AI Studio
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="apiKey">Gemini API Key</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isInitialized}
              />
              <Button
                onClick={handleInitialize}
                disabled={isInitialized || !apiKey.trim()}
                className="gap-2"
              >
                {isInitialized ? (
                  <>
                    <Check className="h-4 w-4" />
                    Ready
                  </>
                ) : (
                  'Initialize'
                )}
              </Button>
            </div>
          </div>

          {isInitialized && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Gemini API initialized successfully
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Selection & Generation */}
      {isInitialized && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 2: Select Model</CardTitle>
              <CardDescription>Choose a Gemini model to use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {geminiService.availableModels.map((model) => (
                  <Card
                    key={model.id}
                    className={`cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/20'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        {model.supportsVision && (
                          <Badge variant="secondary" className="text-xs">
                            Vision
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max tokens: {model.maxTokens.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Step 3: Generate Content</CardTitle>
              <CardDescription>Enter a prompt and generate a response</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here... (e.g., 'Write a short poem about AI')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] mt-2"
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate with {geminiService.availableModels.find(m => m.id === selectedModel)?.name}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Response */}
          {response && (
            <Card>
              <CardHeader>
                <CardTitle>Response</CardTitle>
                <CardDescription>
                  Generated by {geminiService.availableModels.find(m => m.id === selectedModel)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{response}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Instructions */}
      {!isInitialized && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Getting Started
                </h3>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                  <li>Create a new API key (free tier available)</li>
                  <li>Copy the key and paste it above</li>
                  <li>Click "Initialize" to start using Gemini</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
