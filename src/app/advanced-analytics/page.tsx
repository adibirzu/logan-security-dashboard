'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'

export default function AdvancedAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect after 3 seconds
    const timeout = setTimeout(() => {
      router.push('/query-builder')
    }, 3000)

    return () => clearTimeout(timeout)
  }, [router])

  const handleRedirect = () => {
    router.push('/query-builder')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Page Moved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Advanced Analytics has been merged with Query Builder for a unified experience.
            </AlertDescription>
          </Alert>
          
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              You&apos;ll be automatically redirected to the new unified Query Builder page in a few seconds.
            </p>
            
            <Button onClick={handleRedirect} className="w-full">
              Go to Query Builder
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <p className="text-xs text-muted-foreground">
              The new Query Builder includes all advanced analytics features plus:
              <br />
              Logan Queries • Visualizations • Dashboard • History • Export
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}