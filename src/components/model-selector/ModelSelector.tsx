import { useState, useMemo } from 'react'
import { Check, ChevronDown, Crown, Sparkles, Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { isFlagshipModel, groupModelsByProvider } from '@/utils/flagship-models'

interface ModelSelectorProps {
  models: Array<{ id: string; name: string }>
  selectedModelId?: string
  onSelectModel: (modelId: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Provider display names and colors
const PROVIDER_INFO: Record<string, { name: string; color: string; bgColor: string }> = {
  openai: { name: 'OpenAI', color: 'text-green-600', bgColor: 'bg-green-50' },
  anthropic: { name: 'Anthropic', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  google: { name: 'Google', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'meta-llama': { name: 'Meta', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  mistralai: { name: 'Mistral', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'x-ai': { name: 'xAI', color: 'text-gray-700', bgColor: 'bg-gray-50' },
  qwen: { name: 'Qwen', color: 'text-red-600', bgColor: 'bg-red-50' },
  deepseek: { name: 'DeepSeek', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  cohere: { name: 'Cohere', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  openrouter: { name: 'OpenRouter', color: 'text-slate-600', bgColor: 'bg-slate-50' },
}

export default function ModelSelector({
  models,
  selectedModelId,
  onSelectModel,
  placeholder = 'Select a model...',
  className,
  disabled = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedModel = useMemo(
    () => models.find(m => m.id === selectedModelId),
    [models, selectedModelId]
  )

  const groupedModels = useMemo(() => {
    const filtered = searchQuery
      ? models.filter(model =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          model.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : models

    return groupModelsByProvider(filtered)
  }, [models, searchQuery])

  const getModelDisplayName = (model: { id: string; name: string }) => {
    // Remove provider prefix for cleaner display
    const parts = model.name.split('/')
    return parts.length > 1 ? parts.slice(1).join('/') : model.name
  }

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId)
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            !selectedModel && 'text-muted-foreground',
            className
          )}
        >
          {selectedModel ? (
            <div className="flex items-center gap-2 truncate">
              {isFlagshipModel(selectedModel.id) && (
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
              <span className="truncate">{selectedModel.name}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {Object.keys(groupedModels).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No models found
            </div>
          ) : (
            Object.entries(groupedModels)
              .sort(([a], [b]) => {
                // Sort providers with flagship models first
                const aHasFlagship = groupedModels[a].some(m => isFlagshipModel(m.id))
                const bHasFlagship = groupedModels[b].some(m => isFlagshipModel(m.id))
                if (aHasFlagship && !bHasFlagship) return -1
                if (!aHasFlagship && bHasFlagship) return 1
                return a.localeCompare(b)
              })
              .map(([provider, providerModels]) => {
                const providerInfo = PROVIDER_INFO[provider] || {
                  name: provider.charAt(0).toUpperCase() + provider.slice(1),
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-50',
                }

                return (
                  <div key={provider} className="border-b last:border-0">
                    <div className={cn('px-3 py-2', providerInfo.bgColor)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-semibold', providerInfo.color)}>
                          {providerInfo.name}
                        </span>
                        {providerModels.some(m => isFlagshipModel(m.id)) && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            <Crown className="h-3 w-3 mr-1 text-yellow-500" />
                            Flagship
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {providerModels.length} model{providerModels.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      {providerModels
                        .sort((a, b) => {
                          // Sort flagship models first within each provider
                          const aIsFlagship = isFlagshipModel(a.id)
                          const bIsFlagship = isFlagshipModel(b.id)
                          if (aIsFlagship && !bIsFlagship) return -1
                          if (!aIsFlagship && bIsFlagship) return 1
                          return a.name.localeCompare(b.name)
                        })
                        .map((model) => {
                          const isSelected = model.id === selectedModelId
                          const isFlagship = isFlagshipModel(model.id)

                          return (
                            <button
                              key={model.id}
                              onClick={() => handleSelect(model.id)}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                                isSelected && 'bg-accent',
                                'transition-colors'
                              )}
                            >
                              <div className="flex items-center gap-2 flex-1 text-left">
                                {isFlagship && (
                                  <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                )}
                                <span className="truncate">{getModelDisplayName(model)}</span>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )
              })
          )}
        </div>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Crown className="h-3 w-3 text-yellow-500" />
                Flagship model
              </span>
              <span>{models.length} total models</span>
            </div>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Powered by OpenRouter
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}