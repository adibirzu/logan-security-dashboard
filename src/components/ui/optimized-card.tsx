import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Optimized Card component with React.memo
export const OptimizedCard = React.memo<React.ComponentProps<typeof Card>>(
  ({ children, className, ...props }) => {
    return (
      <Card className={className} {...props}>
        {children}
      </Card>
    )
  }
)

OptimizedCard.displayName = 'OptimizedCard'

// Optimized CardHeader with memo
export const OptimizedCardHeader = React.memo<React.ComponentProps<typeof CardHeader>>(
  ({ children, className, ...props }) => {
    return (
      <CardHeader className={className} {...props}>
        {children}
      </CardHeader>
    )
  }
)

OptimizedCardHeader.displayName = 'OptimizedCardHeader'

// Optimized CardContent with memo
export const OptimizedCardContent = React.memo<React.ComponentProps<typeof CardContent>>(
  ({ children, className, ...props }) => {
    return (
      <CardContent className={className} {...props}>
        {children}
      </CardContent>
    )
  }
)

OptimizedCardContent.displayName = 'OptimizedCardContent'

// Optimized CardTitle with memo
export const OptimizedCardTitle = React.memo<React.ComponentProps<typeof CardTitle>>(
  ({ children, className, ...props }) => {
    return (
      <CardTitle className={className} {...props}>
        {children}
      </CardTitle>
    )
  }
)

OptimizedCardTitle.displayName = 'OptimizedCardTitle'

// Optimized CardDescription with memo
export const OptimizedCardDescription = React.memo<React.ComponentProps<typeof CardDescription>>(
  ({ children, className, ...props }) => {
    return (
      <CardDescription className={className} {...props}>
        {children}
      </CardDescription>
    )
  }
)

OptimizedCardDescription.displayName = 'OptimizedCardDescription'

// Optimized loading skeleton component
export const LoadingSkeleton = React.memo(() => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  )
})

// Card skeleton for loading states
export const CardSkeleton = React.memo(() => {
  return (
    <OptimizedCard>
      <OptimizedCardHeader className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-3 bg-gray-200 rounded w-48 mt-2"></div>
      </OptimizedCardHeader>
      <OptimizedCardContent>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </OptimizedCardContent>
    </OptimizedCard>
  )
})

// Table skeleton for data tables
export const TableSkeleton = React.memo<{ rows?: number }>(({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  )
})

// Stats grid skeleton
export const StatsGridSkeleton = React.memo<{ count?: number }>(({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
})

LoadingSkeleton.displayName = 'LoadingSkeleton'
CardSkeleton.displayName = 'CardSkeleton'
TableSkeleton.displayName = 'TableSkeleton'  
StatsGridSkeleton.displayName = 'StatsGridSkeleton'

// Optimized stats card component for better performance
export const OptimizedStatsCard = React.memo<{
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  className?: string
}>(({ title, value, subtitle, icon, className = '' }) => {
  return (
    <OptimizedCard className={className}>
      <OptimizedCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <OptimizedCardTitle className="text-sm font-medium">{title}</OptimizedCardTitle>
        {icon}
      </OptimizedCardHeader>
      <OptimizedCardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </OptimizedCardContent>
    </OptimizedCard>
  )
})

OptimizedStatsCard.displayName = 'OptimizedStatsCard'