import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  preferences: {
    units: 'metric' | 'imperial'
    language: string
    notifications: boolean
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updatePreferences: (prefs: Partial<User['preferences']>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Mock login - replace with actual API call
        const mockUser: User = {
          id: '1',
          email,
          name: email.split('@')[0],
          preferences: {
            units: 'metric',
            language: 'en',
            notifications: true,
          },
        }
        const mockToken = 'mock-jwt-token-' + Date.now()
        localStorage.setItem('auth_token', mockToken)
        set({ user: mockUser, token: mockToken, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
      updatePreferences: (prefs) => {
        set((state) => ({
          user: state.user
            ? { ...state.user, preferences: { ...state.user.preferences, ...prefs } }
            : null,
        }))
      },
    }),
    {
      name: 'fieldshift-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Initialize auth token from localStorage
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token')
  if (token) {
    useAuthStore.setState({ token, isAuthenticated: true })
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return children
}