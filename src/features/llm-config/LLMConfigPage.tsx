import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, RefreshCw, TestTube } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function LLMConfigPage() {
  const [apiKey, setApiKey] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const { toast } = useToast()

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenRouter API key first.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingConnection(true)
    // TODO: Implement actual API test
    setTimeout(() => {
      setIsTestingConnection(false)
      toast({
        title: 'Connection Test',
        description: 'Connection test will be implemented with OpenRouter integration.',
      })
    }, 1500)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">LLM Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Configure your OpenRouter API access and model preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>API Access</CardTitle>
            <CardDescription>
              Connect to OpenRouter to access various AI models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
                OpenRouter API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="sk-or-..."
                  />
                </div>
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Model Catalog */}
        <Card>
          <CardHeader>
            <CardTitle>Model Catalog</CardTitle>
            <CardDescription>
              Available models will be displayed here after connecting to OpenRouter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Connect to OpenRouter to view available models
              </p>
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Catalog
              </Button>
            </div>

            {/* Placeholder for model table */}
            <div className="border rounded-lg p-8 text-center">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No models available. Please configure your API key first.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
            <CardDescription>
              Configure default models and settings for new projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Refiner Model
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled
                >
                  <option>Connect to OpenRouter first</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Judge Model
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled
                >
                  <option>Connect to OpenRouter first</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Refinement Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="3"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}