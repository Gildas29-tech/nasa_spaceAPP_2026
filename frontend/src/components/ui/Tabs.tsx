import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

interface TabsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
  variant?: 'default' | 'underline' | 'pills' | 'segments'
  animated?: boolean
  transition?: 'fade' | 'slide' | 'scale' | 'none'
}

const TabsContext = createContext<TabsContextType | null>(null)

interface TabsProps {
  children: ReactNode
  defaultValue: string
  value?: string
  onChange?: (value: string) => void
  className?: string
  variant?: 'default' | 'underline' | 'pills' | 'segments'
  animated?: boolean
  transition?: 'fade' | 'slide' | 'scale' | 'none'
}

export function Tabs({ children, defaultValue, value, onChange, className, variant = 'default', animated = true, transition = 'fade' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(value ?? defaultValue)

  useEffect(() => {
    if (value !== undefined) setActiveTab(value)
  }, [value])

  const handleTabChange = (newValue: string) => {
    if (newValue === activeTab) return
    setActiveTab(newValue)
    onChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{
      activeTab,
      setActiveTab: handleTabChange,
      variant,
      animated,
      transition
    }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
  'aria-label'?: string
}

export function TabsList({ children, className, 'aria-label': ariaLabel }: TabsListProps) {
  const context = useContext(TabsContext)
  const variant = context?.variant || 'default'

  const variantStyles = {
    default: 'flex h-11 w-full items-center justify-center rounded-full bg-black/5 p-1 gap-1 dark:bg-white/5',
    underline: 'flex h-11 w-full items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-1',
    pills: 'flex h-11 w-full items-center gap-2 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-full',
    segments: 'flex h-11 w-full items-center gap-0 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl p-1',
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(variantStyles[variant], className)}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
  icon?: ReactNode
  badge?: string | number
}

export function TabsTrigger({ value, children, disabled, className, icon, badge }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')

  const { activeTab, setActiveTab, variant = 'default' } = context
  const isActive = activeTab === value

  const variantTriggerStyles = {
    default: cn(
      'flex w-full items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out-cubic focus:outline-none focus:ring-2 focus:ring-primary-500',
      'disabled:pointer-events-none disabled:opacity-50',
      isActive
        ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white animate-scale-in'
        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10',
      className
    ),
    underline: cn(
      'relative flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium transition-all duration-200 ease-out-cubic focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
      className
    ),
    pills: cn(
      'flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out-cubic focus:outline-none focus:ring-2 focus:ring-primary-500',
      'disabled:pointer-events-none disabled:opacity-50',
      isActive
        ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white animate-scale-in'
        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10',
      className
    ),
    segments: cn(
      'flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out-cubic focus:outline-none focus:ring-2 focus:ring-primary-500',
      'disabled:pointer-events-none disabled:opacity-50',
      isActive
        ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white animate-scale-in'
        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10',
      className
    ),
  }

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      disabled={disabled}
      type="button"
      onClick={() => !disabled && setActiveTab(value)}
      className={variantTriggerStyles[variant]}
    >
      {icon && <span className={cn('flex-shrink-0 mr-2', isActive ? 'text-current' : 'text-gray-400')}>{icon}</span>}
      {children}
      {badge && (
        <span className={cn(
          'ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-medium',
          isActive ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        )}>
          {badge}
        </span>
      )}
      {variant === 'underline' && isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 animate-scale-in origin-center" style={{ transformOrigin: 'center' }} />
      )}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
  transition?: 'fade' | 'slide' | 'scale' | 'none'
}

export function TabsContent({ value, children, className, transition }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')

  const { activeTab, animated = true, transition: contextTransition = 'fade' } = context
  const effectiveTransition = transition || contextTransition
  const isActive = activeTab === value

  // Simple approach: always render content, use CSS to show/hide
  // This ensures content is mounted and can be measured by IntersectionObserver
  const [isMounted, setIsMounted] = useState(isActive)

  useEffect(() => {
    if (isActive) {
      setIsMounted(true)
    }
  }, [isActive])

  // Keep content mounted once it's been shown (for proper rendering of charts/lists)
  // But apply visibility styles for animation
  const [isVisible, setIsVisible] = useState(isActive)

  useEffect(() => {
    if (animated && !isActive && isMounted) {
      // Exit animation
      setIsVisible(false)
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => {
        // We don't actually unmount, just keep hidden
      }, 200)
      return () => clearTimeout(timer)
    } else if (isActive) {
      // Enter animation
      requestAnimationFrame(() => setIsVisible(true))
    }
  }, [isActive, animated, isMounted])

  const transitionStyles = {
    fade: isVisible ? 'animate-tab-fade-enter' : 'animate-tab-fade-exit',
    slide: isVisible ? 'animate-tab-slide-enter' : 'animate-tab-slide-exit',
    scale: isVisible ? 'animate-tab-scale-enter' : 'animate-tab-scale-exit',
    none: '',
  }

  const transitionClass = transitionStyles[effectiveTransition]

  return (
    <div
      role="tabpanel"
      id={`tabs-panel-${value}`}
      aria-labelledby={`tabs-trigger-${value}`}
      className={cn(
        'relative',
        transitionClass,
        animated ? 'duration-200 ease-out-cubic' : '',
        className
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: effectiveTransition === 'slide' && !isVisible ? 'translateX(-16px)' :
                   effectiveTransition === 'slide' && isVisible ? 'translateX(0)' :
                   effectiveTransition === 'scale' && !isVisible ? 'scale(0.95)' :
                   effectiveTransition === 'scale' && isVisible ? 'scale(1)' : 'none',
        // Ensure content takes space even when hidden (for charts)
        position: isVisible ? 'relative' : 'absolute',
        width: isVisible ? '100%' : '100%',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  )
}

// Animated tab indicator for underline variant
export function TabIndicator({
  className
}: { className?: string }) {
  const context = useContext(TabsContext)
  if (!context) return null

  const { activeTab, variant = 'default' } = context
  if (variant !== 'underline') return null

  // This would need to be implemented with a ref to the active tab
  // For now, return a placeholder that can be enhanced
  return (
    <div
      className={cn(
        'absolute bottom-0 h-0.5 bg-primary-500 rounded-full transition-all duration-300 ease-out-quart',
        className
      )}
      style={{
        // These would be calculated based on active tab position
        width: 'var(--tab-indicator-width, 0px)',
        left: 'var(--tab-indicator-left, 0px)',
      }}
    />
  )
}