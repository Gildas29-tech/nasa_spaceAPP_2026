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
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={cn('flex items-center justify-between h-16 px-4 border-b border-gray-100', sidebarOpen ? '' : 'justify-center')}>
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
              <span className="font-display font-bold text-xl text-gray-900">Field Shift</span>
            )}
          </NavLink>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={sidebarOpen ? undefined : item.name}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary-600' : 'text-gray-400')} aria-hidden="true" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn('p-4 border-t border-gray-100', !sidebarOpen && 'hidden')}>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">NASA Space Apps 2026</p>
              <p className="text-xs text-gray-500">Field Shift Challenge</p>
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
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100"
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
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
                  aria-label="Search"
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Toggle dark mode"
              >
                <Sun className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <Zap className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}