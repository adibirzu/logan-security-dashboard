'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Component {
  name: string
  status: string
  uptime: number
  lastCheck: string
}

interface InfrastructureCategory {
  category: string
  components: Component[]
}

interface InfrastructureTabProps {
  healthData: InfrastructureCategory[]
  getStatusColor: (status: string) => string
}

export default function InfrastructureTab({ healthData, getStatusColor }: InfrastructureTabProps) {
  return (
    <>
      {(healthData || []).map((category) => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
            <CardDescription>Health and performance monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(category.components || []).map((component) => (
                <div key={component.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{component.name}</p>
                    <p className="text-sm text-gray-500">Last check: {component.lastCheck}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{component.uptime}% uptime</p>
                    </div>
                    <Badge className={getStatusColor(component.status)}>
                      {component.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}