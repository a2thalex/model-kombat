import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trophy, Clock, CheckCircle, AlertCircle, Pause } from 'lucide-react'
import { cn } from '@/utils/cn'

// Temporary mock data
type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'failed' | 'paused'

const mockProjects: Array<{
  id: string
  name: string
  originalQuestion: string
  status: ProjectStatus
  createdAt: Date
}> = [
  {
    id: '1',
    name: 'Customer Support Response',
    originalQuestion: 'How should I handle a customer complaint about a defective product?',
    status: 'completed',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Technical Documentation',
    originalQuestion: 'Explain the difference between REST and GraphQL APIs...',
    status: 'in_progress',
    createdAt: new Date('2024-01-16'),
  },
]

const statusIcons = {
  draft: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  failed: AlertCircle,
  paused: Pause,
}

const statusColors = {
  draft: 'text-muted-foreground',
  in_progress: 'text-blue-600',
  completed: 'text-green-600',
  failed: 'text-red-600',
  paused: 'text-yellow-600',
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects] = useState(mockProjects)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI model competition projects
          </p>
        </div>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to start comparing AI models
            </p>
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const StatusIcon = statusIcons[project.status]
            const statusColor = statusColors[project.status]

            return (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{project.name}</span>
                    <StatusIcon className={cn('h-5 w-5', statusColor)} />
                  </CardTitle>
                  <CardDescription>
                    {formatDate(project.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {truncateText(project.originalQuestion)}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      project.status === 'completed' && 'bg-green-100 text-green-700',
                      project.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                      project.status === 'draft' && 'bg-gray-100 text-gray-700',
                      project.status === 'failed' && 'bg-red-100 text-red-700',
                      project.status === 'paused' && 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/projects/${project.id}`)
                    }}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}