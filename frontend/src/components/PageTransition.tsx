import { ReactNode, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children?: ReactNode
  transition?: 'fade' | 'slide' | 'scale' | 'slide-up' | 'none'
  duration?: number
  className?: string
}

export function PageTransition({
  children,
  transition = 'slide-up',
  duration = 300,
  className
}: PageTransitionProps) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(true)
  const [key, setKey] = useState(location.pathname)

  useEffect(() => {
    if (transition === 'none') return

    setIsVisible(false)
    // Wait for exit animation
    setTimeout(() => {
      setKey(location.pathname)
      setIsVisible(true)
    }, duration / 2)
  }, [location.pathname, transition, duration])

  const transitionStyles = {
    fade: 'animate-page-crossfade-enter animate-page-crossfade-exit',
    slide: 'animate-page-enter animate-page-exit',
    scale: 'animate-zoom-in animate-zoom-out',
    'slide-up': 'animate-page-enter animate-page-exit',
    none: '',
  }

  const style = {
    transitionDuration: `${duration}ms`,
    opacity: isVisible ? 1 : 0,
    transform:
      !isVisible && (transition === 'slide' || transition === 'slide-up') ? 'translateY(16px)' :
      !isVisible && transition === 'scale' ? 'scale(0.96)' :
      !isVisible && transition === 'fade' ? 'none' : 'none',
  }

  return (
    <div className={cn('relative', className)} style={{ position: 'relative' }}>
      {children || (
        <div
          key={key}
          className={cn(transitionStyles[transition])}
          style={style}
        >
          <Outlet />
        </div>
      )}
    </div>
  )
}

// Wrapper for individual page content with entrance animation
export function AnimatedPage({
  children,
  delay = 0,
  transition = 'rise',
  className
}: {
  children: ReactNode
  delay?: number
  transition?: 'rise' | 'fade-in' | 'slide-up' | 'zoom-in' | 'scale-in'
  className?: string
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const transitions = {
    rise: 'animate-rise',
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'zoom-in': 'animate-zoom-in',
    'scale-in': 'animate-scale-in',
  }

  return (
    <div
      className={cn(transitions[transition], className)}
      style={{
        opacity: isVisible ? 1 : 0,
        animationFillMode: 'forwards',
      }}
    >
      {children}
    </div>
  )
}

// Staggered children wrapper
export function StaggeredContainer({
  children,
  staggerDelay = 100,
  startDelay = 0,
  transition = 'stagger-slide-up',
  className,
  ...props
}: {
  children: ReactNode
  staggerDelay?: number
  startDelay?: number
  transition?: 'stagger-fade' | 'stagger-slide-up' | 'stagger-slide-down' | 'stagger-scale'
  className?: string
}) {
  const childrenArray = (Array.isArray(children) ? children : [children]).filter(Boolean)

  return (
    <div className={className} {...props}>
      {childrenArray.map((child, index) => (
        <div
          key={child.key ?? index}
          className={cn(
            'animate-fill-forwards',
            transition,
            `stagger-${index + 1}`
          )}
          style={{
            opacity: 0,
            animationDelay: `${startDelay + index * staggerDelay}ms`,
            animationFillMode: 'forwards',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Reveal on scroll component
export function RevealOnScroll({
  children,
  threshold = 0.1,
  rootMargin = '0px',
  transition = 'slide-up',
  delay = 0,
  once = true,
  className,
  ...props
}: {
  children: ReactNode
  threshold?: number
  rootMargin?: string
  transition?: 'fade-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom-in' | 'rise' | 'scale-in' | 'shake'
  delay?: number
  once?: boolean
  className?: string
}) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          if (once) observer.unobserve(entry.target)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin, delay, once])

  const transitions = {
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down',
    'slide-left': 'animate-slide-left',
    'slide-right': 'animate-slide-right',
    'zoom-in': 'animate-zoom-in',
    'rise': 'animate-rise',
    'scale-in': 'animate-scale-in',
    'shake': 'animate-shake',
  }

  return (
    <div
      ref={elementRef}
      className={cn(transitions[transition], className)}
      style={{
        opacity: isVisible ? 1 : 0,
        animationFillMode: 'forwards',
        willChange: 'opacity, transform',
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// Import for cn
import { cn } from '../lib/utils'
import { useRef } from 'react'