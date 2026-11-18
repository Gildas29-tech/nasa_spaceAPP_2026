import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useMemo, useState } from 'react'
import { cn } from '../lib/utils'
import {
  LayoutDashboard,
  Map,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Crop,
  Activity,
  Leaf,
  TrendingUp,
  AlertTriangle,
  Droplet,
  Search,
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

const searchablePages = [
  ...navigation,
  { name: 'Carte des parcelles', href: '/field-map', icon: Map },
  { name: 'Santé du sol', href: '/soil-health', icon: Leaf },
  { name: 'Plan de rotation', href: '/rotation-planner', icon: Crop },
  { name: 'Prévision de rendement', href: '/yield-predictor', icon: TrendingUp },
  { name: 'Stress hydrique', href: '/water-stress', icon: Droplet },
  { name: 'Réglages', href: '/settings', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('fr')
    if (!query) return []
    return searchablePages.filter((item) => item.name.toLocaleLowerCase('fr').includes(query))
  }, [searchQuery])

  useEffect(() => {
    if (!searchOpen) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !searchContainerRef.current?.contains(event.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [searchOpen])

  const goToSearchResult = (href: string) => {
    navigate(href)
    setSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-[#10231a] text-white shadow-xl shadow-black/10 transition-all duration-200',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Navigation principale"
      >
        {/* Brand */}
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
              <span className="font-display text-lg font-semibold tracking-tight text-white">Field Shift</span>
            )}
          </NavLink>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden rounded-lg p-2 text-white hover:bg-white/10"
            aria-label="Fermer le menu latéral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-white/10 text-white ring-1 ring-white/10'
                    : 'text-emerald-100/70 hover:text-white hover:bg-white/8',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={sidebarOpen ? undefined : item.name}
                onClick={() => setMobileMenuOpen(false)}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-emerald-300' : 'text-emerald-100/50')} aria-hidden="true" />
                {sidebarOpen && <span>{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn('border-t border-white/10 p-4', !sidebarOpen && 'hidden')}>
          <div className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/70">Field Shift</p>
            <p className="mt-1 text-xs text-emerald-100/60">Suivi agronomique par satellite</p>
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
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 lg:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg text-gray-600 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={sidebarOpen ? 'Réduire le menu latéral' : 'Développer le menu latéral'}
              >
                {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex-1 max-w-md mx-4 hidden sm:block">
              <div ref={searchContainerRef} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Rechercher une page…"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setSearchOpen(true)
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) goToSearchResult(searchResults[0].href)
                    if (event.key === 'Escape') setSearchOpen(false)
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white/80 py-2 pl-9 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  aria-label="Rechercher une page"
                  aria-expanded={searchOpen && searchQuery.trim().length > 0}
                  aria-controls="global-search-results"
                />
                {searchOpen && searchQuery.trim().length > 0 && (
                  <div id="global-search-results" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">Aucune page correspondante.</p>
                    ) : searchResults.map((result) => (
                      <button
                        key={result.href}
                        type="button"
                        onClick={() => goToSearchResult(result.href)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <result.icon className="h-4 w-4 text-primary-600" aria-hidden="true" />
                        {result.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="rounded-lg p-2 text-gray-600 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={darkMode ? 'Activer le thème clair' : 'Activer le thème sombre'}
                title={darkMode ? 'Thème clair' : 'Thème sombre'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="hidden h-8 items-center border-l border-gray-200 pl-4 sm:flex">
                <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {(user?.name || 'U').trim().charAt(0).toLocaleUpperCase('fr')}
                </div>
                <span className="max-w-40 truncate text-sm font-medium text-gray-700">
                  {user?.name || 'Utilisateur'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}