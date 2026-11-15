import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'outline' | 'soft'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  dot?: boolean
  pulse?: boolean
  removable?: boolean
  onRemove?: () => void
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot, pulse = false, removable, onRemove, children, ...props }, ref) => {
    const variants = {
      default: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      outline: 'border border-current bg-transparent',
      soft: 'bg-current/10 text-current',
    }

    const sizes = {
      xs: 'px-1.5 py-0.5 text-[10px] gap-1',
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-0.5 text-sm gap-1.5',
      lg: 'px-3 py-1 text-base gap-2',
    }

    const dotColors = {
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
      info: 'bg-blue-500',
      gray: 'bg-gray-500',
      default: 'bg-primary-500',
    }

    const dotSizes = {
      xs: 'w-1 h-1',
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full transition-all duration-200 ease-out-cubic',
          variants[variant],
          sizes[size],
          pulse && 'animate-pulse-soft',
          removable && 'pr-1 cursor-pointer',
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full animate-pulse-ring',
              variant === 'outline' || variant === 'soft' ? dotColors[variant as keyof typeof dotColors] || 'bg-current' : dotColors[variant],
              dotSizes[size]
            )}
          />
        )}
        {children}
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className={cn(
              'ml-1 flex items-center justify-center rounded-full transition-colors',
              'hover:bg-black/10 dark:hover:bg-white/10',
              size === 'xs' && 'w-3 h-3',
              size === 'sm' && 'w-4 h-4',
              size === 'md' && 'w-5 h-5',
              size === 'lg' && 'w-6 h-6',
            )}
            aria-label="Remove"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// Status badge with animation
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'processing' | 'completed' | 'failed' | 'warning'
  showDot?: boolean
}

const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string; dot: boolean; pulse?: boolean }> = {
  online: { variant: 'success', label: 'En ligne', dot: true, pulse: true },
  offline: { variant: 'gray', label: 'Hors ligne', dot: true },
  busy: { variant: 'danger', label: 'Occupé', dot: true, pulse: true },
  away: { variant: 'warning', label: 'Absent', dot: true },
  pending: { variant: 'warning', label: 'En attente', dot: true, pulse: true },
  processing: { variant: 'info', label: 'En cours', dot: true, pulse: true },
  completed: { variant: 'success', label: 'Terminé', dot: true },
  failed: { variant: 'danger', label: 'Échoué', dot: true },
  warning: { variant: 'warning', label: 'Attention', dot: true, pulse: true },
}

export function StatusBadge({ status, showDot = true, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge
      variant={config.variant}
      dot={showDot && config.dot}
      pulse={config.pulse}
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  )
}

// Tag input badge
export interface TagBadgeProps extends BadgeProps {
  onRemove?: () => void
}

export function TagBadge({ onRemove, className, ...props }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      removable
      onRemove={onRemove}
      className={cn('border-gray-300 dark:border-gray-600', className)}
      {...props}
    />
  )
}