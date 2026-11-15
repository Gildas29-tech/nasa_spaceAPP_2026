/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        earth: {
          50: '#fbf8f5',
          100: '#f5efe8',
          200: '#eadfd0',
          300: '#dcc9b4',
          400: '#caac8c',
          500: '#b88d67',
          600: '#a67351',
          700: '#885b42',
          800: '#704b3a',
          900: '#5b3f33',
        },
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      // Motion Design Tokens
      transitionDuration: {
        '0': '0ms',
        'instant': '50ms',
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
        'slower': '500ms',
        'slowest': '700ms',
        'page': '450ms',
        'stagger': '100ms',
      },
      transitionTimingFunction: {
        'ease-in-quad': 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
        'ease-out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'ease-in-out-quad': 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
        'ease-in-cubic': 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        'ease-out-cubic': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
        'ease-in-out-cubic': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        'ease-in-quart': 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
        'ease-out-quart': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        'ease-in-out-quart': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'ease-in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'ease-in-out-expo': 'cubic-bezier(1, 0, 0, 1)',
        'ease-in-back': 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
        'ease-out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-in-out-back': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-elastic': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        // Material Design easing
        'standard': 'cubic-bezier(0.2, 0, 0, 1)',
        'decelerate': 'cubic-bezier(0, 0, 0.2, 1)',
        'accelerate': 'cubic-bezier(0.4, 0, 1, 1)',
        'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      animation: {
        // Core animations
        'fade-in': 'fadeIn 250ms ease-out-cubic',
        'fade-out': 'fadeOut 250ms ease-in-cubic',
        'slide-up': 'slideUp 350ms ease-out-quart',
        'slide-down': 'slideDown 350ms ease-out-quart',
        'slide-left': 'slideLeft 350ms ease-out-quart',
        'slide-right': 'slideRight 350ms ease-out-quart',
        'rise': 'rise 450ms ease-out-quart',
        'sink': 'sink 350ms ease-in-quart',
        'scale-in': 'scaleIn 200ms ease-out-back',
        'scale-out': 'scaleOut 150ms ease-in-back',
        'zoom-in': 'zoomIn 300ms ease-out-cubic',
        'zoom-out': 'zoomOut 250ms ease-in-cubic',

        // Staggered animations
        'stagger-fade': 'staggerFade 400ms ease-out-cubic',
        'stagger-slide-up': 'staggerSlideUp 500ms ease-out-quart',
        'stagger-slide-down': 'staggerSlideDown 500ms ease-out-quart',
        'stagger-scale': 'staggerScale 300ms ease-out-back',

        // Micro-interactions
        'press': 'press 100ms ease-out-cubic',
        'release': 'release 150ms ease-out-back',
        'hover-lift': 'hoverLift 200ms ease-out-cubic',
        'hover-press': 'hoverPress 100ms ease-in-cubic',
        'focus-ring': 'focusRing 200ms ease-out-cubic',
        'shake': 'shake 400ms ease-in-out-cubic',
        'wobble': 'wobble 500ms ease-in-out-cubic',
        'pulse-soft': 'pulseSoft 2s ease-in-out-cubic infinite',
        'pulse-ring': 'pulseRing 2s ease-out-cubic infinite',

        // Loading states
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        'spin-fast': 'spin 0.6s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',

        // Page transitions
        'page-enter': 'pageEnter 450ms ease-out-quart',
        'page-exit': 'pageExit 300ms ease-in-quart',
        'page-crossfade-enter': 'pageCrossfadeEnter 300ms ease-out-cubic',
        'page-crossfade-exit': 'pageCrossfadeExit 250ms ease-in-cubic',

        // Tab/content transitions
        'tab-slide-enter': 'tabSlideEnter 300ms ease-out-cubic',
        'tab-slide-exit': 'tabSlideExit 250ms ease-in-cubic',
        'tab-fade-enter': 'tabFadeEnter 200ms ease-out-cubic',
        'tab-fade-exit': 'tabFadeExit 150ms ease-in-cubic',
        'tab-scale-enter': 'tabScaleEnter 250ms ease-out-back',
        'tab-scale-exit': 'tabScaleExit 200ms ease-in-back',

        // List/item animations
        'list-item-enter': 'listItemEnter 350ms ease-out-quart',
        'list-item-exit': 'listItemExit 250ms ease-in-quart',
        'list-item-reorder': 'listItemReorder 300ms ease-out-cubic',
        'accordion-open': 'accordionOpen 300ms ease-out-cubic',
        'accordion-close': 'accordionClose 250ms ease-in-cubic',

        // Chart/data animations
        'chart-draw': 'chartDraw 800ms ease-out-cubic',
        'chart-bar-grow': 'chartBarGrow 600ms ease-out-cubic',
        'chart-line-draw': 'chartLineDraw 1000ms ease-out-cubic',
        'chart-pie-draw': 'chartPieDraw 800ms ease-out-cubic',
        'number-count': 'numberCount 1000ms ease-out-cubic',
        'counter': 'counter 1500ms ease-out-cubic',

        // Map animations
        'map-fly': 'mapFly 1000ms ease-out-cubic',
        'map-zoom': 'mapZoom 500ms ease-out-cubic',
        'marker-drop': 'markerDrop 400ms ease-out-back',
        'marker-bounce': 'markerBounce 600ms ease-out-back',
        'cluster-expand': 'clusterExpand 300ms ease-out-cubic',

        // Modal/drawer
        'modal-enter': 'modalEnter 300ms ease-out-cubic',
        'modal-exit': 'modalExit 250ms ease-in-cubic',
        'drawer-enter': 'drawerEnter 350ms ease-out-quart',
        'drawer-exit': 'drawerExit 300ms ease-in-quart',
        'backdrop-fade-in': 'backdropFadeIn 200ms ease-out-cubic',
        'backdrop-fade-out': 'backdropFadeOut 150ms ease-in-cubic',

        // Tooltip/popover
        'tooltip-enter': 'tooltipEnter 150ms ease-out-cubic',
        'tooltip-exit': 'tooltipExit 100ms ease-in-cubic',
        'popover-enter': 'popoverEnter 200ms ease-out-cubic',
        'popover-exit': 'popoverExit 150ms ease-in-cubic',

        // Notification/toast
        'toast-enter': 'toastEnter 300ms ease-out-cubic',
        'toast-exit': 'toastExit 250ms ease-in-cubic',
        'toast-slide': 'toastSlide 400ms ease-out-cubic',

        // Special effects
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'border-flow': 'borderFlow 3s linear infinite',
        'gradient-shift': 'gradientShift 4s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'orbit': 'orbit 8s linear infinite',
        'ripple': 'ripple 600ms ease-out-cubic',

        // Legacy
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        // Core
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sink: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(8px)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        zoomOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },

        // Staggered
        staggerFade: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        staggerSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        staggerSlideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        staggerScale: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Micro-interactions
        press: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        release: {
          '0%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        hoverLift: {
          '0%': { transform: 'translateY(0)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
          '100%': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15), 0 4px 6px -4px rgba(0,0,0,0.1)' },
        },
        hoverPress: {
          '0%': { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0)' },
        },
        focusRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
          '100%': { boxShadow: '0 0 0 3px rgba(34, 197, 94, 0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        wobble: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(6deg)' },
          '45%': { transform: 'rotate(-4deg)' },
          '60%': { transform: 'rotate(2deg)' },
          '75%': { transform: 'rotate(-1deg)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },

        // Loading
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },

        // Page transitions
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageExit: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-8px)' },
        },
        pageCrossfadeEnter: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pageCrossfadeExit: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },

        // Tab transitions
        tabSlideEnter: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        tabSlideExit: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-16px)' },
        },
        tabFadeEnter: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        tabFadeExit: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        tabScaleEnter: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        tabScaleExit: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },

        // List items
        listItemEnter: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        listItemExit: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-12px)' },
        },
        listItemReorder: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(0)' },
        },
        accordionOpen: {
          '0%': { height: '0', opacity: '0' },
          '100%': { height: 'var(--accordion-height)', opacity: '1' },
        },
        accordionClose: {
          '0%': { height: 'var(--accordion-height)', opacity: '1' },
          '100%': { height: '0', opacity: '0' },
        },

        // Chart animations
        chartDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        chartBarGrow: {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
        },
        chartLineDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        chartPieDraw: {
          '0%': { transform: 'rotate(-90deg) scale(0)' },
          '100%': { transform: 'rotate(270deg) scale(1)' },
        },
        numberCount: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        counter: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // Map animations
        mapFly: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        mapZoom: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1)' },
        },
        markerDrop: {
          '0%': { transform: 'translateY(-200px) scale(0.5)', opacity: '0' },
          '60%': { transform: 'translateY(8px) scale(1.1)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        markerBounce: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-16px)' },
          '60%': { transform: 'translateY(-8px)' },
        },
        clusterExpand: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },

        // Modal/drawer
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalExit: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
        },
        drawerEnter: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        drawerExit: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        backdropFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        backdropFadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },

        // Tooltip/popover
        tooltipEnter: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        tooltipExit: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(4px)' },
        },
        popoverEnter: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        popoverExit: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(4px)' },
        },

        // Toast
        toastEnter: {
          '0%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        toastExit: {
          '0%': { opacity: '1', transform: 'translateX(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
        },
        toastSlide: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-8px)' },
        },

        // Special
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.6)' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(40px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(40px) rotate(-360deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}