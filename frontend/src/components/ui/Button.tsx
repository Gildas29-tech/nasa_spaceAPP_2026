import { ButtonHTMLAttributes, forwardRef, useRef, useState, useImperativeHandle } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'soft' | 'gradient'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  loading?: boolean
  fullWidth?: boolean
  ripple?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    children,
    fullWidth = false,
    ripple = true,
    onClick,
    ...props
  }, ref) => {
    const [rippleCoords, setRippleCoords] = useState<{ x: number; y: number } | null>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Properly forward the ref to the button element
    useImperativeHandle(ref, () => buttonRef.current!, [])

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setRippleCoords({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }

    const handleMouseUp = () => {
      setRippleCoords(null)
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && onClick) {
        onClick(e)
      }
    }

    const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-full overflow-hidden transition-all duration-200 ease-out-cubic focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed press-scale will-change-transform'

    const variants = {
      primary: 'bg-gradient-to-b from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-900/25 hover:from-primary-400 hover:to-primary-600 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-900/30 focus:ring-primary-500 active:translate-y-0 active:shadow-lg',
      secondary: 'surface-card text-gray-700 border border-white/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/10 focus:ring-primary-500 active:translate-y-0',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 focus:ring-gray-500 active:bg-gray-200 dark:active:bg-white/20',
      danger: 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg shadow-red-900/20 hover:from-red-400 hover:to-red-600 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-900/30 focus:ring-red-500 active:translate-y-0 active:shadow-lg',
      outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:-translate-y-0.5 focus:ring-primary-500 active:translate-y-0 active:bg-primary-100 dark:active:bg-primary-900/30',
      soft: 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/40 hover:-translate-y-0.5 focus:ring-primary-500 active:translate-y-0',
      gradient: 'bg-gradient-to-r from-primary-500 via-earth-500 to-primary-500 bg-[length:200%_100%] text-white shadow-lg shadow-primary-900/25 hover:bg-[right] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-900/30 focus:ring-primary-500 active:translate-y-0 active:shadow-lg transition-all duration-300',
    }

    const sizes = {
      xs: 'px-2.5 py-1 text-xs gap-1',
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2',
      xl: 'px-8 py-4 text-xl gap-3',
      icon: 'p-2 text-base',
    }

    const widthStyles = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={buttonRef}
        className={cn(baseStyles, variants[variant], sizes[size], widthStyles, className)}
        disabled={disabled || loading}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        {...props}
      >
        {ripple && rippleCoords && (
          <span
            className="absolute rounded-full bg-white/30 dark:bg-white/10 pointer-events-none animate-ripple"
            style={{
              left: rippleCoords.x,
              top: rippleCoords.y,
              width: '0',
              height: '0',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
        {loading && (
          <span className="flex items-center justify-center" aria-hidden="true">
            <svg className="animate-spin-fast h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" aria-hidden="true">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        {!loading && <span className="relative z-10">{children}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Specialized button components
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', 'aria-label': ariaLabel, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn('p-0', size === 'sm' && 'w-8 h-8', size === 'md' && 'w-10 h-10', size === 'lg' && 'w-12 h-12', className)}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

export interface FloatingActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  extended?: boolean
}

export function FloatingActionButton({
  children,
  position = 'bottom-right',
  extended = false,
  className,
  ...props
}: FloatingActionButtonProps) {
  const positions = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6',
  }

  return (
    <Button
      variant="primary"
      size={extended ? 'lg' : 'icon'}
      className={cn(
        'shadow-2xl hover:shadow-3xl animate-scale-in z-50',
        positions[position],
        extended && 'px-6 gap-3',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

// Loading button with progress
export interface ProgressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  progress?: number // 0-100
  showProgressText?: boolean
}

export function ProgressButton({
  progress = 0,
  showProgressText = false,
  children,
  className,
  ...props
}: ProgressButtonProps) {
  return (
    <Button variant="primary" className={cn('relative overflow-hidden', className)} {...props}>
      <div className="absolute inset-0 bg-white/20 transition-all duration-300 ease-out-cubic" style={{ width: `${progress}%` }} />
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {showProgressText && <span className="text-xs font-mono tabular-nums">{progress}%</span>}
      </span>
    </Button>
  )
}