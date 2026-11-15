import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface UIState {
  darkMode: boolean
  sidebarOpen: boolean
  toasts: Toast[]

  // Actions
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      sidebarOpen: true,
      toasts: [],

      toggleDarkMode: () => {
        const newMode = !get().darkMode
        set({ darkMode: newMode })
        if (newMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      setDarkMode: (enabled) => {
        set({ darkMode: enabled })
        if (enabled) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      addToast: (toast) => {
        const id = generateId()
        const newToast = { ...toast, id }
        set(state => ({ toasts: [...state.toasts, newToast] }))

        // Auto-remove after duration
        const duration = toast.duration ?? 5000
        setTimeout(() => {
          get().removeToast(id)
        }, duration)

        return id
      },

      removeToast: (id) => set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      })),

      clearToasts: () => set({ toasts: [] }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)