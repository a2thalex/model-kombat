import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function NewProjectPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Create New Project</h1>

      <Card>
        <CardHeader>
          <CardTitle>Project Configuration Wizard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The 4-step project creation wizard will be implemented here...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}