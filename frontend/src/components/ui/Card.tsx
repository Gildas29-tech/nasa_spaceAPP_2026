import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass' | 'subtle' | 'interactive'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  press?: boolean
  onPress?: () => void
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'default',
    padding = 'md',
    children,
    hover = false,
    press = false,
    onPress,
    ...props
  }, ref) => {
    const variants = {
      default: 'surface-card rounded-2xl',
      outlined: 'surface-card rounded-2xl border border-white/20 shadow-none',
      elevated: 'surface-elevated rounded-2xl',
      glass: 'surface-glass rounded-2xl',
      subtle: 'surface-subtle rounded-2xl',
      interactive: 'surface-card rounded-2xl card-interactive press-scale',
    }

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const handleMouseDown = () => {
      if (press && onPress) onPress()
    }

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          paddings[padding],
          'transition-all duration-300 ease-out-cubic',
          hover && 'hover-lift',
          press && 'press-scale',
          className
        )}
        onMouseDown={handleMouseDown}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4 animate-fade-in', className)} {...props}>
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold text-gray-900 animate-slide-up', className)} {...props}>
      {children}
    </h3>
  )
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-gray-500 mt-1 animate-fade-in', className)} {...props}>
      {children}
    </p>
  )
)

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('animate-fade-in', className)} {...props}>
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 animate-fade-in', className)} {...props}>
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

// Specialized card variants for motion design
export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: string; positive: boolean }
  loading?: boolean
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  loading = false,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card variant="interactive" padding="md" className={cn('relative overflow-hidden', className)} {...props}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 animate-fade-in">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            {loading ? (
              <div className="h-8 w-24 skeleton animate-shimmer" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 animate-count-up" style={{ animationDelay: '100ms' }}>
                {value}
              </p>
            )}
            {trend && (
              <span className={cn(
                'text-sm font-medium flex items-center gap-1 animate-slide-up',
                trend.positive ? 'text-green-600' : 'text-red-600'
              )} style={{ animationDelay: '200ms' }}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl bg-primary-100 text-primary-600 animate-scale-in', 'dark:bg-primary-900/30 dark:text-primary-400')}
               style={{ animationDelay: '150ms' }}>
            {icon}
          </div>
        )}
      </div>
      {/* Accent bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-earth-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
    </Card>
  )
}

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  icon?: React.ReactNode
  color?: 'primary' | 'sky' | 'earth' | 'amber' | 'rose' | 'violet'
  loading?: boolean
  sparkline?: number[]
}

const colorStyles = {
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  earth: 'bg-earth-100 text-earth-600 dark:bg-earth-900/30 dark:text-earth-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
}

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  color = 'primary',
  loading = false,
  sparkline,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card variant="interactive" padding="md" className={cn('relative overflow-hidden', className)} {...props}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 animate-fade-in">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            {loading ? (
              <div className="h-10 w-32 skeleton animate-shimmer" />
            ) : (
              <>
                <span className="text-3xl font-bold text-gray-900 animate-count-up" style={{ animationDelay: '100ms' }}>
                  {value}
                </span>
                {unit && <span className="text-lg text-gray-500 animate-fade-in" style={{ animationDelay: '150ms' }}>{unit}</span>}
              </>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 animate-slide-up" style={{ animationDelay: '200ms' }}>{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl animate-scale-in', colorStyles[color])} style={{ animationDelay: '150ms' }}>
            {icon}
          </div>
        )}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="mt-4 h-12 animate-chart-draw" style={{ animationDelay: '300ms' }}>
          <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color === 'primary' ? '#22c55e' : color === 'sky' ? '#0ea5e9' : color === 'earth' ? '#b88d67' : color === 'amber' ? '#f59e0b' : color === 'rose' ? '#f43f5e' : '#a855f7'} stopOpacity="0.4" />
                <stop offset="100%" stopColor={color === 'primary' ? '#22c55e' : color === 'sky' ? '#0ea5e9' : color === 'earth' ? '#b88d67' : color === 'amber' ? '#f59e0b' : color === 'rose' ? '#f43f5e' : '#a855f7'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={sparkline.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (sparkline.length - 1)) * 200} ${50 - (v / Math.max(...sparkline)) * 40}`).join(' ')}
              stroke={color === 'primary' ? '#22c55e' : color === 'sky' ? '#0ea5e9' : color === 'earth' ? '#b88d67' : color === 'amber' ? '#f59e0b' : color === 'rose' ? '#f43f5e' : '#a855f7'}
              strokeWidth="2"
              fill="url(#sparkline-gradient)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {/* Accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" style={{ color: colorStyles[color].split(' ')[0].replace('bg-', '').replace('-100', '-500') }} />
    </Card>
  )
}