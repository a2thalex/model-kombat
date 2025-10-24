import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Key,
  RefreshCw,
  TestTube,
  Check,
  X,
  Brain,
  Gavel,
  Zap,
  FileJson,
  DollarSign,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { useLLMConfigStore } from '@/store/llm-config'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { cn } from '@/utils/cn'
import { OpenRouterModel } from '@/types'

export default function LLMConfigPage() {
  const {
    config,
    models,
    loading,
    isFetchingCatalog,
    isTestingConnection,
    loadConfig,
    saveApiKey,
    testConnection,
    fetchModelCatalog,
    toggleModel,
    setDefaultRefiner,
    setDefaultJudge,
    setDefaultRounds,
  } = useLLMConfigStore()

  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasUnsavedKey, setHasUnsavedKey] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return

    try {
      await saveApiKey(apiKey)
      setHasUnsavedKey(false)
    } catch (error) {
      // Error is handled in the store
    }
  }

  const handleTestConnection = async () => {
    if (hasUnsavedKey && apiKey) {
      await testConnection(apiKey)
    } else {
      await testConnection()
    }
  }

  const handleRefreshCatalog = async () => {
    await fetchModelCatalog(true)
  }

  // Filter models based on search query
  const filteredModels = models.filter(model => {
    const query = searchQuery.toLowerCase()
    return (
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query) ||
      model.description?.toLowerCase().includes(query)
    )
  })

  // Get enabled models
  const enabledModels = models.filter(model =>
    config?.enabledModelIds?.includes(model.id)
  )

  // Get JSON-capable models for judge selection
  const jsonCapableModels = enabledModels.filter(model =>
    model.capabilities?.supports_response_schema === true
  )

  const formatPrice = (price: number) => {
    return `$${(price / 1_000_000).toFixed(4)}`
  }

  const formatContextLength = (length: number) => {
    if (length >= 1_000_000) {
      return `${(length / 1_000_000).toFixed(1)}M`
    }
    return `${(length / 1_000).toFixed(0)}K`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
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
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      setHasUnsavedKey(true)
                    }}
                    className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={config?.openRouterApiKey ? '••••••••••••••••' : 'sk-or-...'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {hasUnsavedKey && (
                  <Button onClick={handleSaveApiKey}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Key
                  </Button>
                )}
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || (!config?.openRouterApiKey && !apiKey)}
                  variant={hasUnsavedKey ? 'outline' : 'default'}
                >
                  {isTestingConnection ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
              {config?.lastCatalogSync && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last synced: {new Date(config.lastCatalogSync).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model Catalog */}
        <Card>
          <CardHeader>
            <CardTitle>Model Catalog</CardTitle>
            <CardDescription>
              {models.length > 0
                ? `${models.length} models available, ${enabledModels.length} enabled`
                : 'Available models will be displayed here after connecting to OpenRouter'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              {models.length > 0 ? (
                <>
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 max-w-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshCatalog}
                    disabled={isFetchingCatalog}
                  >
                    {isFetchingCatalog ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Catalog
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {config?.openRouterApiKey
                      ? 'Click refresh to load models'
                      : 'Connect to OpenRouter to view available models'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshCatalog}
                    disabled={!config?.openRouterApiKey || isFetchingCatalog}
                  >
                    {isFetchingCatalog ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Load Catalog
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Model table or empty state */}
            {models.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Model</th>
                        <th className="text-center p-3 text-sm font-medium">Context</th>
                        <th className="text-center p-3 text-sm font-medium">Capabilities</th>
                        <th className="text-center p-3 text-sm font-medium">Pricing</th>
                        <th className="text-center p-3 text-sm font-medium">Enable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModels.map((model) => {
                        const isEnabled = config?.enabledModelIds?.includes(model.id)
                        return (
                          <tr key={model.id} className="border-t hover:bg-muted/50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium text-sm">{model.name}</div>
                                <div className="text-xs text-muted-foreground">{model.id}</div>
                              </div>
                            </td>
                            <td className="text-center p-3 text-sm">
                              {formatContextLength(model.context_length)}
                            </td>
                            <td className="text-center p-3">
                              <div className="flex justify-center gap-1">
                                {model.capabilities?.supports_stream && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700" title="Supports streaming">
                                    <Zap className="h-3 w-3" />
                                  </span>
                                )}
                                {model.capabilities?.supports_response_schema && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700" title="JSON output">
                                    <FileJson className="h-3 w-3" />
                                  </span>
                                )}
                                {model.capabilities?.supports_vision && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700" title="Vision support">
                                    <Eye className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center p-3 text-xs">
                              <div className="flex flex-col items-center">
                                <span>In: {formatPrice(model.pricing.prompt)}</span>
                                <span>Out: {formatPrice(model.pricing.completion)}</span>
                              </div>
                            </td>
                            <td className="text-center p-3">
                              <button
                                onClick={() => toggleModel(model.id, !isEnabled)}
                                className={cn(
                                  'w-12 h-6 rounded-full relative transition-colors',
                                  isEnabled ? 'bg-primary' : 'bg-muted'
                                )}
                              >
                                <div
                                  className={cn(
                                    'absolute top-1 h-4 w-4 bg-white rounded-full transition-transform',
                                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                                  )}
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {config?.openRouterApiKey
                    ? 'Click "Load Catalog" to view available models'
                    : 'No models available. Please configure your API key first.'}
                </p>
              </div>
            )}
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
                  <Brain className="inline h-4 w-4 mr-1" />
                  Default Refiner Model
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={enabledModels.length === 0}
                  value={config?.defaultRefinerId || 'openrouter/auto'}
                  onChange={(e) => setDefaultRefiner(e.target.value)}
                >
                  <option value="openrouter/auto">openrouter/auto (Automatic selection)</option>
                  {enabledModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Gavel className="inline h-4 w-4 mr-1" />
                  Default Judge Model
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={jsonCapableModels.length === 0}
                  value={config?.defaultJudgeId || ''}
                  onChange={(e) => setDefaultJudge(e.target.value)}
                >
                  <option value="">Select a JSON-capable model</option>
                  {jsonCapableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                {enabledModels.length > 0 && jsonCapableModels.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No JSON-capable models enabled. Enable models with JSON support for judging.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Refinement Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config?.defaultRefinementRounds || 3}
                  onChange={(e) => setDefaultRounds(parseInt(e.target.value))}
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