import { ReactNode } from 'react'

interface PageHeroProps {
  kicker: string
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  variant?: 'default' | 'minimal' | 'elevated' | 'gradient'
  showDecoration?: boolean
}

export function PageHero({
  kicker,
  title,
  subtitle,
  actions,
  className = '',
  variant = 'default',
  showDecoration = false
}: PageHeroProps) {
  const baseStyles = 'relative rounded-2xl px-5 py-5 sm:px-7 sm:py-6'
  const variantStyles = {
    default: 'border border-gray-200 bg-white text-gray-900 shadow-sm',
    minimal: 'bg-transparent border-none shadow-none',
    elevated: 'border border-gray-200 bg-white text-gray-900 shadow-sm',
    gradient: 'border border-gray-200 bg-white text-gray-900 shadow-sm',
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {showDecoration && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary-600" />
      )}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
            {kicker}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}