import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProjectDetailPage() {
  const { projectId } = useParams()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Project Details</h1>
      <Card>
        <CardHeader>
          <CardTitle>Project #{projectId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Project execution view coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}