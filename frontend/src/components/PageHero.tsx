import { ReactNode, useEffect, useState } from 'react'

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
  showDecoration = true
}: PageHeroProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Staggered entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5
    })
  }

  const baseStyles = 'relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8'
  const variantStyles = {
    default: 'border border-white/50 bg-[#10281c] text-white shadow-xl shadow-emerald-950/20',
    minimal: 'bg-transparent border-none shadow-none',
    elevated: 'surface-elevated border border-white/10 shadow-2xl',
    gradient: 'bg-gradient-to-br from-primary-900/90 via-primary-800/80 to-earth-900/90 border border-primary-400/20 text-white shadow-xl',
  }

  const decorationStyle = showDecoration ? `
    <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl animate-float" style={{ transform: \`translate(\${mousePosition.x * 20}px, \${mousePosition.y * 20}px)\` }} />
    <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-64 rounded-full bg-amber-200/10 blur-2xl animate-pulse-slow" style={{ transform: \`translate(\${mousePosition.x * -15}px, \${mousePosition.y * -15}px)\` }} />
    <div className="pointer-events-none absolute top-1/2 right-1/4 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl animate-float" style={{ transform: \`translate(\${mousePosition.x * 10}px, \${mousePosition.y * 10}px)\`, animationDelay: '1s' }} />
  ` : ''

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onMouseMove={handleMouseMove}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 500ms ease-out-quart, transform 500ms ease-out-quart'
      }}
    >
      {showDecoration && (
        <>
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl animate-float"
            style={{ transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)` }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-64 rounded-full bg-amber-200/10 blur-2xl animate-pulse-slow"
            style={{ transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * -15}px)` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 right-1/4 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl animate-float"
            style={{ transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`, animationDelay: '1s' }}
          />
          {/* Grid pattern overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-5 field-veil" />
        </>
      )}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="max-w-3xl" style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 500ms ease-out-quart 100ms, transform 500ms ease-out-quart 100ms',
          animationFillMode: 'forwards'
        }}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80 animate-fade-in">
            {kicker}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white animate-slide-up" style={{ animationDelay: '150ms' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/75 animate-slide-up" style={{ animationDelay: '200ms' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div
            className="flex flex-wrap gap-2"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 500ms ease-out-quart 250ms, transform 500ms ease-out-quart 250ms',
              animationFillMode: 'forwards'
            }}
          >
            {actions}
          </div>
        )}
      </div>
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary-400/50 to-transparent"
        style={{
          transform: isVisible ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left center',
          transition: 'transform 600ms ease-out-quart 300ms'
        }}
      />
    </div>
  )
}