import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'button' | 'input'
  width?: string | number
  height?: string | number
  lines?: number
  animated?: boolean
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, lines = 1, animated = true, ...props }, ref) => {
    const baseStyles = 'relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded animate-shimmer'

    const variantStyles = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
      card: 'rounded-2xl',
      avatar: 'rounded-full',
      button: 'rounded-full h-10',
      input: 'rounded-lg h-10',
    }

    const variantWidths = {
      text: width || '100%',
      circular: width || '40px',
      rectangular: width || '100%',
      card: width || '100%',
      avatar: width || '40px',
      button: width || '120px',
      input: width || '100%',
    }

    const variantHeights = {
      text: height || '1rem',
      circular: height || '40px',
      rectangular: height || '120px',
      card: height || '200px',
      avatar: height || '40px',
      button: height || '40px',
      input: height || '40px',
    }

    if (lines > 1 && variant === 'text') {
      return (
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              variant="text"
              width={i === lines - 1 ? '60%' : '100%'}
              animated={animated}
              className={cn('animate-stagger-slide-up', { 'stagger-1': i === 0, 'stagger-2': i === 1, 'stagger-3': i === 2 })}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        style={{
          width: variantWidths[variant],
          height: variantHeights[variant],
          animation: animated ? 'shimmer 1.5s ease-in-out infinite' : 'none',
        }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// Pre-built skeleton layouts
export function CardSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface-card rounded-2xl p-6 space-y-4 animate-fade-in', className)} {...props}>
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height="120px" className="rounded-xl" />
      <div className="flex gap-2">
        <Skeleton variant="button" width="100px" />
        <Skeleton variant="button" width="100px" className="opacity-50" />
      </div>
    </div>
  )
}

export function StatCardSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface-card rounded-2xl p-6 animate-fade-in', className)} {...props}>
      <div className="flex items-start justify-between">
        <div>
          <Skeleton variant="text" width="80px" />
          <Skeleton variant="text" width="120px" className="mt-2 h-8" />
        </div>
        <Skeleton variant="circular" className="w-12 h-12" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4, className, ...props }: { rows?: number; columns?: number; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface-card rounded-2xl overflow-hidden', className)} {...props}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width="60%" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                variant="text"
                width="80%"
                className={cn('animate-stagger-slide-up', {
                  'stagger-1': colIndex === 0,
                  'stagger-2': colIndex === 1,
                  'stagger-3': colIndex === 2,
                  'stagger-4': colIndex === 3,
                })}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ items = 5, className, ...props }: { items?: number; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 surface-card rounded-xl animate-stagger-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
          <Skeleton variant="avatar" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="30%" />
          </div>
          <Skeleton variant="circular" className="w-8 h-8" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface-card rounded-2xl p-6 animate-fade-in', className)} {...props}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton variant="text" width="120px" />
          <Skeleton variant="text" width="80px" className="mt-1" />
        </div>
        <Skeleton variant="button" width="100px" />
      </div>
      <div className="h-64" style={{ background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%' }}>
        <svg viewBox="0 0 400 200" className="w-full h-full opacity-30">
          <defs>
            <linearGradient id="chart-skeleton-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,180 L0,20 C50,10 100,50 150,30 C200,10 250,80 300,60 C350,40 400,100 400,100 L400,200 Z"
            fill="url(#chart-skeleton-gradient)"
          />
        </svg>
      </div>
      <div className="mt-4 flex gap-4">
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="60px" />
      </div>
    </div>
  )
}

export function MapSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface-card rounded-2xl overflow-hidden animate-fade-in', className)} {...props}>
      <div className="aspect-video relative bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
        <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)', backgroundSize: '200% 100%' }} />
        <div className="absolute top-4 left-4 right-4">
          <Skeleton variant="text" width="30%" />
        </div>
        <div className="absolute bottom-4 left-4">
          <Skeleton variant="button" width="120px" />
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 5, className, ...props }: { fields?: number; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5 animate-stagger-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
          <Skeleton variant="text" width="25%" />
          <Skeleton variant="input" />
        </div>
      ))}
      <div className="pt-4 animate-stagger-slide-up" style={{ animationDelay: `${fields * 100}ms` }}>
        <Skeleton variant="button" width="100%" />
      </div>
    </div>
  )
}

export function DashboardSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} className="animate-stagger-slide-up" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton className="animate-fade-in" style={{ animationDelay: '200ms' }} />
        <ChartSkeleton className="animate-fade-in" style={{ animationDelay: '300ms' }} />
      </div>

      {/* List/Table */}
      <CardSkeleton className="animate-fade-in" style={{ animationDelay: '400ms' }} />
    </div>
  )
}