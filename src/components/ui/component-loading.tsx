import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ComponentLoadingProps {
  height?: string
  message?: string
}

export function ComponentLoading({ height = "h-32", message = "Loading..." }: ComponentLoadingProps) {
  return (
    <Card className={height}>
      <CardContent className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">{message}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonLoader({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className}`} />
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <SkeletonLoader key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}