import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { cn } from '../lib/utils'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'warning' | 'danger' | 'info'
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  toast: (options: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    const newToast = { ...options, id }
    setToasts(prev => [...prev, newToast])

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, options.duration || 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const iconComponents = {
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    danger: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[300px] max-w-md animate-slide-in',
            variantStyles[toast.variant || 'info']
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {iconComponents[toast.variant || 'info']}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{toast.title}</p>
            {toast.description && <p className="text-sm opacity-90 mt-0.5">{toast.description}</p>}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}