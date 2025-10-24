import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { toast } from '@/hooks/use-toast'
import { projectsService } from '@/services/projects'
import { useLLMConfigStore } from '@/store/llm-config-hybrid'
import LoadingSpinner from '@/components/ui/loading-spinner'
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Users,
  Gavel,
  CheckCircle,
  Brain,
  Zap,
  Info
} from 'lucide-react'
import { Project, JudgingCriteria } from '@/types'
import { cn } from '@/utils/cn'

interface WizardStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
}

const steps: WizardStep[] = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Set up project name and goals',
    icon: <FileText className="h-5 w-5" />
  },
  {
    id: 2,
    title: 'Select Models',
    description: 'Choose refiner and competitor models',
    icon: <Users className="h-5 w-5" />
  },
  {
    id: 3,
    title: 'Judging Criteria',
    description: 'Configure evaluation weights',
    icon: <Gavel className="h-5 w-5" />
  },
  {
    id: 4,
    title: 'Review & Create',
    description: 'Confirm your settings',
    icon: <CheckCircle className="h-5 w-5" />
  }
]

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { config, models } = useLLMConfigStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  // Form data
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    maxRefinementRounds: 3,
    refinerModelId: config?.defaultRefinerId || '',
    competitorModelIds: [] as string[],
    judgeModelId: config?.defaultJudgeId || '',
    judgingCriteria: {
      relevance: 25,
      accuracy: 25,
      completeness: 25,
      clarity: 25
    } as JudgingCriteria
  })

  // Get enabled models for selection
  const enabledModels = models.filter(model =>
    config?.enabledModelIds?.includes(model.id)
  )

  // Get JSON-capable models for judge selection
  const jsonCapableModels = enabledModels.filter(model =>
    // Check if model supports response_format or structured_outputs parameter
    model.supported_parameters?.includes('response_format') ||
    model.supported_parameters?.includes('structured_outputs') ||
    model.capabilities?.supports_response_schema === true // Backward compatibility
  )

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!projectData.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a project name',
          variant: 'destructive'
        })
        return
      }
    } else if (currentStep === 2) {
      if (!projectData.refinerModelId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a refiner model',
          variant: 'destructive'
        })
        return
      }
      if (projectData.competitorModelIds.length < 2) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least 2 competitor models',
          variant: 'destructive'
        })
        return
      }
      if (!projectData.judgeModelId) {
        toast({
          title: 'Validation Error',
          description: 'Please select a judge model',
          variant: 'destructive'
        })
        return
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleCompetitorToggle = (modelId: string) => {
    setProjectData(prev => ({
      ...prev,
      competitorModelIds: prev.competitorModelIds.includes(modelId)
        ? prev.competitorModelIds.filter(id => id !== modelId)
        : [...prev.competitorModelIds, modelId]
    }))
  }

  const handleCriteriaChange = (criterion: keyof JudgingCriteria, value: number) => {
    setProjectData(prev => ({
      ...prev,
      judgingCriteria: {
        ...prev.judgingCriteria,
        [criterion]: value
      }
    }))
  }

  const handleCreate = async () => {
    setIsCreating(true)

    try {
      const project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        name: projectData.name,
        description: projectData.description || '',
        status: 'draft',
        maxRefinementRounds: projectData.maxRefinementRounds,
        refinerModelId: projectData.refinerModelId,
        competitorModelIds: projectData.competitorModelIds,
        judgeModelId: projectData.judgeModelId,
        judgingCriteria: projectData.judgingCriteria,
        phases: {
          refinement: { status: 'pending', rounds: [] },
          competition: { status: 'pending', generations: [] },
          judging: { status: 'pending', results: [] }
        }
      }

      const projectId = await projectsService.createProject(project)

      toast({
        title: 'Project Created',
        description: 'Your AI competition project has been created successfully'
      })

      navigate(`/projects/${projectId}`)
    } catch (error) {
      console.error('Failed to create project:', error)
      toast({
        title: 'Creation Failed',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const getTotalWeight = () => {
    return Object.values(projectData.judgingCriteria).reduce((sum, val) => sum + val, 0)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground mt-1">
          Set up an AI model competition in 4 simple steps
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2',
                  currentStep === step.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : currentStep > step.id
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-background text-muted-foreground border-muted'
                )}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-24 h-0.5 mx-2',
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map(step => (
            <div key={step.id} className="text-center max-w-[120px]">
              <p className="text-xs font-medium mt-2">{step.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={projectData.name}
                  onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Customer Support Bot Competition"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={projectData.description}
                  onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the goal and context of this AI competition..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rounds">Maximum Refinement Rounds</Label>
                <div className="flex items-center gap-4 mt-1">
                  <Slider
                    id="rounds"
                    min={1}
                    max={10}
                    step={1}
                    value={[projectData.maxRefinementRounds]}
                    onValueChange={([value]) => setProjectData(prev => ({ ...prev, maxRefinementRounds: value }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">
                    {projectData.maxRefinementRounds}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Number of iterative improvement rounds in Phase 1
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Select Models */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Refiner Model */}
              <div>
                <Label htmlFor="refiner">
                  <Brain className="inline h-4 w-4 mr-1" />
                  Refiner Model (Phase 1) *
                </Label>
                <Select
                  value={projectData.refinerModelId}
                  onValueChange={(value) => setProjectData(prev => ({ ...prev, refinerModelId: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a model for adversarial refinement" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : 'N/A'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Competitor Models */}
              <div>
                <Label>
                  <Zap className="inline h-4 w-4 mr-1" />
                  Competitor Models (Phase 2) * - Select at least 2
                </Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {enabledModels.map(model => (
                    <label
                      key={model.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={projectData.competitorModelIds.includes(model.id)}
                        onChange={() => handleCompetitorToggle(model.id)}
                        className="rounded"
                      />
                      <span className="flex-1">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ${((model.pricing?.input || 0) / 1_000_000).toFixed(4)}/1K
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {projectData.competitorModelIds.length} models
                </p>
              </div>

              {/* Judge Model */}
              <div>
                <Label htmlFor="judge">
                  <Gavel className="inline h-4 w-4 mr-1" />
                  Judge Model (Phase 3) *
                </Label>
                <Select
                  value={projectData.judgeModelId}
                  onValueChange={(value) => setProjectData(prev => ({ ...prev, judgeModelId: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a model for judging (JSON support required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {jsonCapableModels.length > 0 ? (
                      jsonCapableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <span className="text-xs text-green-600">JSON ✓</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No JSON-capable models available. Enable models with JSON support in LLM Config.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Judging Criteria */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mb-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Configure Judging Weights
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                      Adjust the importance of each criterion. Total should equal 100%.
                    </p>
                  </div>
                </div>
              </div>

              {Object.entries(projectData.judgingCriteria).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="capitalize">{key}</Label>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[value]}
                    onValueChange={([val]) => handleCriteriaChange(key as keyof JudgingCriteria, val)}
                    className="mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {key === 'relevance' && 'How well the response addresses the prompt'}
                    {key === 'accuracy' && 'Factual correctness and precision'}
                    {key === 'completeness' && 'Thoroughness and coverage of the topic'}
                    {key === 'clarity' && 'Clear communication and structure'}
                  </p>
                </div>
              ))}

              <div className={cn(
                'p-3 rounded-lg text-center',
                getTotalWeight() === 100
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                  : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
              )}>
                Total Weight: {getTotalWeight()}%
                {getTotalWeight() !== 100 && ' (Should equal 100%)'}
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Project Name</span>
                  <span className="font-medium">{projectData.name}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Max Refinement Rounds</span>
                  <span className="font-medium">{projectData.maxRefinementRounds}</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Refiner Model</span>
                  <span className="font-medium">
                    {models.find(m => m.id === projectData.refinerModelId)?.name || 'Not selected'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Competitor Models</span>
                  <span className="font-medium">{projectData.competitorModelIds.length} models</span>
                </div>

                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Judge Model</span>
                  <span className="font-medium">
                    {models.find(m => m.id === projectData.judgeModelId)?.name || 'Not selected'}
                  </span>
                </div>

                <div className="py-2">
                  <span className="text-muted-foreground">Judging Criteria</span>
                  <div className="mt-2 space-y-1">
                    {Object.entries(projectData.judgingCriteria).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{key}</span>
                        <span>{value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your project is ready to be created! Click "Create Project" to start your AI competition.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => currentStep === 1 ? navigate('/projects') : handlePrevious()}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={isCreating || getTotalWeight() !== 100}
          >
            {isCreating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}