import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '../lib/utils'
import {
  LayoutDashboard,
  Leaf,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  Map,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Zap,
  Shield,
  FileText,
  History,
  Crop,
  Activity,
  Droplet,
  BarChart3,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'

const navigation = [
  { name: 'Vue d\'ensemble', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mes exploitations', href: '/farms', icon: Map },
  { name: 'Surveillance', href: '/monitoring', icon: Activity },
  { name: 'Cultures et rotations', href: '/crops', icon: Crop },
  { name: 'Rapports', href: '/reports', icon: FileText },
]

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 text-white transition-all duration-300 flex flex-col shadow-2xl shadow-black/20',
          'bg-[#07140f] border-r border-white/10',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={cn('flex items-center justify-between h-16 px-4 border-b border-white/10', sidebarOpen ? '' : 'justify-center')}>
          <NavLink to="/dashboard" className="flex items-center gap-2" aria-label="Field Shift Home">
            <svg className="w-8 h-8 text-primary-600" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" fill="url(#grad)"/>
              <path d="M30 65 Q50 35 70 65" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              <path d="M40 55 Q50 45 60 55" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <circle cx="50" cy="75" r="3" fill="white" opacity="0.8"/>
              <circle cx="40" cy="78" r="2" fill="white" opacity="0.6"/>
              <circle cx="60" cy="78" r="2" fill="white" opacity="0.6"/>
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e"/>
                  <stop offset="100%" stopColor="#16a34a"/>
                </linearGradient>
              </defs>
            </svg>
            {sidebarOpen && (
              <span className="font-display font-bold text-xl tracking-tight text-white">Field Shift</span>
            )}
          </NavLink>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-white/12 text-white shadow-inner ring-1 ring-white/15'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/8',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={sidebarOpen ? undefined : item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-emerald-300' : 'text-emerald-100/50')} aria-hidden="true" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn('p-4 border-t border-white/10', !sidebarOpen && 'hidden')}>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/6 ring-1 ring-white/10">
            <div className="w-8 h-8 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">NASA Space Apps 2026</p>
              <p className="text-xs text-emerald-100/60">Field Shift Challenge</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col min-w-0 lg:ml-64', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1913]/75">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex-1 max-w-md mx-4 hidden sm:block">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search fields, crops, data..."
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-white/70 bg-white/70 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  aria-label="Search"
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-black/5 text-gray-600 dark:hover:bg-white/10"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-full hover:bg-black/5 text-gray-600 dark:hover:bg-white/10">
                <Zap className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user?.name || 'Farmer'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="field-veil flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}