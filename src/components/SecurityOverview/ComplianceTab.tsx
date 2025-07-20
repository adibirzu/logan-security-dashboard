'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ComplianceFramework {
  name: string
  score: number
  status: string
  lastAudit: string
}

interface ComplianceTabProps {
  frameworks: ComplianceFramework[]
}

const getComplianceColor = (score: number) => {
  if (score >= 95) return 'text-green-600'
  if (score >= 90) return 'text-yellow-600'
  return 'text-red-600'
}

export default function ComplianceTab({ frameworks }: ComplianceTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compliance Frameworks */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Frameworks</CardTitle>
          <CardDescription>Current compliance status across all frameworks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(frameworks || []).map((framework) => (
              <div key={framework.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{framework.name}</p>
                  <p className="text-sm text-gray-500">Last audit: {framework.lastAudit}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`font-semibold ${getComplianceColor(framework.score)}`}>
                      {framework.score}%
                    </p>
                    <Progress value={framework.score} className="w-20 h-2" />
                  </div>
                  <Badge className={framework.status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {framework.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Summary</CardTitle>
          <CardDescription>Overall compliance metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">96.4%</div>
              <p className="text-gray-500">Overall Compliance Score</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">6</div>
                <p className="text-sm text-gray-500">Frameworks</p>
              </div>
              <div>
                <div className="text-2xl font-bold">247</div>
                <p className="text-sm text-gray-500">Controls</p>
              </div>
              <div>
                <div className="text-2xl font-bold">9</div>
                <p className="text-sm text-gray-500">Exceptions</p>
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <p className="text-sm text-gray-500">Violations</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}