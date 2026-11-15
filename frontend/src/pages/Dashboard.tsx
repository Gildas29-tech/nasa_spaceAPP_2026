import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  Leaf,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Map,
  Settings,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingUp as TrendingUpIcon,
  Cloud,
  Sun,
  Droplet,
  BarChart3,
  Plus,
  Download,
  MapPin,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { PageHero } from '../components/PageHero'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { useFarmStore } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import { Skeleton, CardSkeleton, DashboardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import { RevealOnScroll, StaggeredContainer } from '../components/PageTransition'

const quickActions = [
  {
    name: 'Santé du sol',
    description: 'Humidité, matière organique et végétation à partir des données NASA',
    icon: Leaf,
    href: '/soil-health',
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    badge: 'Nouveau',
  },
  {
    name: 'Rotation',
    description: 'Choisir une rotation selon l\'eau, le sol et le revenu',
    icon: GitBranch,
    href: '/rotation-planner',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    badge: 'Utile',
  },
  {
    name: 'Rendement',
    description: 'Estimer le rendement et sa fourchette',
    icon: TrendingUp,
    href: '/yield-predictor',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    badge: 'Beta',
  },
  {
    name: 'Stress hydrique',
    description: 'Repérer la sécheresse et caler l\'irrigation',
    icon: AlertTriangle,
    href: '/water-stress',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    badge: 'Alerte',
  },
  {
    name: 'Carte',
    description: 'Voir les couches NASA sur le champ',
    icon: Map,
    href: '/field-map',
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    badge: 'Carte',
  },
  {
    name: 'Réglages',
    description: 'Sources, unités et préférences',
    icon: Settings,
    href: '/settings',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    badge: null,
  },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const { farms, loading: farmsLoading, fetchFarms } = useFarmStore()
  const { addToast } = useUIStore()
  const [weather, setWeather] = useState<{
    temperature?: string
    humidity?: string
    precipitation?: string
    soilMoisture?: string
    loading: boolean
    error?: string
  }>({ loading: true })
  const [recentCollections, setRecentCollections] = useState<Array<{
    id: string
    farmName: string
    status: string
    createdAt: string
  }>>([])
  const [stats, setStats] = useState({
    totalFarms: 0,
    avgSoilHealth: 0,
    activeAlerts: 0,
    totalPredictions: 0,
  })

  // Fetch farms on mount
  useEffect(() => {
    fetchFarms()
  }, [fetchFarms])

  // Fetch weather data for first farm
  useEffect(() => {
    if (farms.length > 0) {
      fetchWeatherForFarm(farms[0])
    }
  }, [farms])

  // Fetch recent collections
  useEffect(() => {
    fetchRecentCollections()
  }, [])

  // Update stats when farms change
  useEffect(() => {
    setStats({
      totalFarms: farms.length,
      avgSoilHealth: farms.length > 0
        ? Math.round(farms.reduce((sum, f) => sum + (f.dataStatus === 'completed' ? 85 : 50), 0) / farms.length)
        : 0,
      activeAlerts: 0,
      totalPredictions: 0,
    })
  }, [farms])

  interface WeatherData {
    temperature?: number
    humidity?: number
    precipitation?: number
    soilMoisture?: number
  }

  interface RecentCollection {
    id: string
    farmName: string
    status: string
    createdAt: string
  }

  const fetchWeatherForFarm = useCallback(async (farm: { centroid: { lat: number; lon: number } }) => {
    setWeather({ loading: true })
    try {
      const data = await api.get<WeatherData>('/data/weather', {
        params: { lat: farm.centroid.lat, lon: farm.centroid.lon }
      })
      if (data && data.temperature !== undefined) {
        setWeather({
          loading: false,
          temperature: `${data.temperature?.toFixed(1)}°C`,
          humidity: `${data.humidity?.toFixed(0)}%`,
          precipitation: `${data.precipitation?.toFixed(1)}mm`,
          soilMoisture: `${data.soilMoisture?.toFixed(3)} m³/m³`,
        })
      } else {
        setWeather({ loading: false, error: 'No weather data available' })
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error)
      setWeather({ loading: false, error: 'Failed to fetch weather' })
    }
  }, [])

  const fetchRecentCollections = useCallback(async () => {
    try {
      const data = await api.get<RecentCollection[]>('/data/collections/recent', { params: { limit: 5 } })
      if (Array.isArray(data)) setRecentCollections(data)
    } catch (error) {
      console.error('Failed to fetch recent collections:', error)
    }
  }, [])

  const handleAddField = () => {
    window.location.href = '/field-map'
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { variant: 'success' as const, icon: CheckCircle, pulse: false }
      case 'partial_failure': return { variant: 'warning' as const, icon: AlertTriangle, pulse: false }
      case 'collecting': return { variant: 'info' as const, icon: Loader2, pulse: true }
      default: return { variant: 'info' as const, icon: BarChart3, pulse: false }
    }
  }

  // Show skeleton while loading
  if (farmsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHero
          kicker="NASA Earth observation"
          title="Vue d'ensemble"
          subtitle="Lecture des champs, du climat et des cultures à partir des données NASA."
        />
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <PageHero
        kicker="NASA Earth observation"
        title="Vue d'ensemble"
        subtitle="Lecture des champs, du climat et des cultures à partir des données NASA."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => addToast({ type: 'info', title: 'Export Report', message: 'Report generation coming soon' })}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button size="sm" onClick={handleAddField}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un champ
            </Button>
          </>
        }
      />

      {/* Stats Grid with animated cards */}
      <RevealOnScroll transition="slide-up" delay={100}>
        <StaggeredContainer staggerDelay={80} startDelay={100} transition="stagger-slide-up">
          <StatCard
            label="Champs suivis"
            value={stats.totalFarms}
            icon={<Map className="w-6 h-6" />}
            trend={{ value: '+2 ce mois', positive: true }}
            className="hover-lift"
          />
          <StatCard
            label="Santé du sol"
            value={`${stats.avgSoilHealth}/100`}
            icon={<Leaf className="w-6 h-6" />}
            trend={{ value: '+5 vs mois dernier', positive: true }}
            className="hover-lift"
          />
          <StatCard
            label="Alertes actives"
            value={stats.activeAlerts}
            icon={<AlertTriangle className="w-6 h-6" />}
            trend={{ value: stats.activeAlerts === 0 ? 'Aucune' : 'En cours', positive: stats.activeAlerts === 0 }}
            className="hover-lift"
          />
          <StatCard
            label="Prévisions"
            value={stats.totalPredictions}
            icon={<TrendingUpIcon className="w-6 h-6" />}
            trend={{ value: 'Nouveau', positive: true }}
            className="hover-lift"
          />
        </StaggeredContainer>
      </RevealOnScroll>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" onChange={setActiveTab} className="w-full" animated transition="fade">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" icon={<BarChart3 className="w-4 h-4" />}>Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="fields" icon={<Map className="w-4 h-4" />}>Champs</TabsTrigger>
          <TabsTrigger value="alerts" icon={<AlertTriangle className="w-4 h-4" />}>Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" transition="fade">
          <RevealOnScroll transition="slide-up" delay={100}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 animate-fade-in">Accès rapide</h2>
                <StaggeredContainer staggerDelay={60} transition="stagger-slide-up">
                  {quickActions.map((action, index) => (
                    <Card
                      key={action.name}
                      variant="interactive"
                      hover
                      className="group overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={cn('p-3 rounded-xl animate-scale-in', action.color)}>
                            <action.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900">{action.name}</h3>
                              {action.badge && (
                                <Badge variant="soft" className="text-xs">{action.badge}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                          </div>
                        </div>
                        <Link
                          to={action.href}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-4 group-hover:underline animate-slide-up"
                          style={{ animationDelay: '200ms' }}
                        >
                          Ouvrir
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </CardContent>
                      {/* Hover accent */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-earth-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Card>
                  ))}
                </StaggeredContainer>
              </div>

              {/* Weather & Recent Activity */}
              <div className="space-y-6">
                <RevealOnScroll transition="slide-up" delay={200}>
                  <Card variant="elevated" className="hover-lift">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cloud className="w-5 h-5 text-blue-600" />
                        Conditions actuelles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {weather.loading ? (
                        <div className="grid grid-cols-2 gap-4">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="p-4 rounded-lg bg-gray-50 animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                              <div className="h-8 bg-gray-200 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : weather.error ? (
                        <div className="p-4 text-center text-gray-500 animate-fade-in">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>{weather.error}</p>
                          <Button variant="ghost" size="sm" className="mt-2" onClick={() => farms.length > 0 && fetchWeatherForFarm(farms[0])}>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Réessayer
                          </Button>
                        </div>
                      ) : (
                        <StaggeredContainer staggerDelay={50} transition="stagger-scale">
                          {weather.temperature && (
                            <MetricCard
                              title="Température"
                              value={weather.temperature.replace('°C', '')}
                              unit="°C"
                              icon={<Sun className="w-5 h-5" />}
                              color="amber"
                            />
                          )}
                          {weather.humidity && (
                            <MetricCard
                              title="Humidité"
                              value={weather.humidity.replace('%', '')}
                              unit="%"
                              icon={<Droplet className="w-5 h-5" />}
                              color="sky"
                            />
                          )}
                          {weather.precipitation && (
                            <MetricCard
                              title="Pluie (7 j)"
                              value={weather.precipitation.replace('mm', '')}
                              unit="mm"
                              icon={<Cloud className="w-5 h-5" />}
                              color="earth"
                            />
                          )}
                          {weather.soilMoisture && (
                            <MetricCard
                              title="Humidité du sol"
                              value={weather.soilMoisture.replace(' m³/m³', '')}
                              unit="m³/m³"
                              icon={<Droplet className="w-5 h-5" />}
                              color="sky"
                            />
                          )}
                        </StaggeredContainer>
                      )}
                    </CardContent>
                  </Card>
                </RevealOnScroll>

                <RevealOnScroll transition="slide-up" delay={300}>
                  <Card variant="elevated" className="hover-lift">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        Collectes récentes
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={fetchRecentCollections}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Actualiser
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {recentCollections.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 animate-fade-in">
                          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>Aucune collecte récente</p>
                          <p className="text-sm mt-1">Créez un champ, puis lancez une collecte.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {recentCollections.map((collection, index) => {
                            const statusConfig = getStatusConfig(collection.status)
                            const Icon = statusConfig.icon
                            return (
                              <div
                                key={collection.id}
                                className="p-4 hover:bg-gray-50 flex items-center gap-4 animate-stagger-slide-up"
                                style={{ animationDelay: `${index * 80}ms` }}
                              >
                                <div className={cn('p-2 rounded-full animate-scale-in',
                                  collection.status === 'completed' ? 'bg-green-100 text-green-600' :
                                  collection.status === 'partial_failure' ? 'bg-orange-100 text-orange-600' :
                                  'bg-blue-100 text-blue-600'
                                )}>
                                  <Icon className={cn('w-5 h-5', statusConfig.pulse && 'animate-spin-fast')} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">Data collection for {collection.farmName}</p>
                                  <p className="text-xs text-gray-500">Status: {collection.status} • {formatDate(collection.createdAt)}</p>
                                </div>
                                <StatusBadge status={collection.status as any} />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </RevealOnScroll>
              </div>
            </div>
          </RevealOnScroll>
        </TabsContent>

        <TabsContent value="fields" transition="fade">
          <RevealOnScroll transition="slide-up" delay={100}>
            <div className="space-y-4">
              <div className="flex items-center justify-between animate-fade-in">
                <h2 className="text-lg font-semibold text-gray-900">Your Fields</h2>
                <Button size="sm" onClick={handleAddField}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un champ
                </Button>
              </div>
              {farms.length === 0 ? (
                <Card variant="elevated" className="animate-fade-in">
                  <CardContent className="p-12 text-center">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-float" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                    <p className="text-gray-500 mb-4">Create your first field to start monitoring with NASA Earth observation data</p>
                    <Button onClick={handleAddField} className="animate-slide-up">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Field on Map
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {farms.map((farm, index) => (
                    <Card
                      key={farm.id}
                      variant="interactive"
                      hover
                      className="overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                            <p className="text-sm text-gray-500">
                              {farm.crop || 'No crop'} • {farm.area || 'Unknown area'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              ({farm.centroid?.lat.toFixed(2)}, {farm.centroid?.lon.toFixed(2)})
                            </p>
                          </div>
                          <StatusBadge status={farm.dataStatus as any} />
                        </div>
                        <div className="flex items-center justify-between animate-slide-up" style={{ animationDelay: '100ms' }}>
                          <div className="flex items-center gap-2">
                            <Leaf className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-gray-600">Soil Health</span>
                          </div>
                          <span className="text-xl font-bold text-gray-900 animate-count-up">
                            {farm.dataStatus === 'completed' ? '85' : '—'}
                          </span>
                        </div>
                        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden animate-slide-up" style={{ animationDelay: '150ms' }}>
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out-cubic"
                            style={{ width: farm.dataStatus === 'completed' ? '85%' : '0%' }}
                          />
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                          <Link to={`/monitoring?farm=${farm.id}`} className="flex-1">
                            <Button variant="ghost" size="sm" className="w-full">Monitor</Button>
                          </Link>
                          <Link to={`/crops?farm=${farm.id}`} className="flex-1">
                            <Button variant="ghost" size="sm" className="w-full">Plan</Button>
                          </Link>
                          <Link to={`/reports?farm=${farm.id}`} className="flex-1">
                            <Button variant="ghost" size="sm" className="w-full">Report</Button>
                          </Link>
                        </div>
                      </CardContent>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-earth-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                    </Card>
                  ))}
                </StaggeredContainer>
              )}
            </div>
          </RevealOnScroll>
        </TabsContent>

        <TabsContent value="alerts" transition="fade">
          <RevealOnScroll transition="slide-up" delay={100}>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 animate-fade-in">Alertes actives</h2>
              <Card variant="elevated" className="animate-fade-in">
                <CardContent className="p-6 text-center text-gray-500">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-float" />
                  <p className="font-medium text-gray-900 mb-1">No alerts at this time</p>
                  <p className="text-sm">Create farms and run data collection to enable alert monitoring</p>
                  <Button variant="secondary" className="mt-4 animate-slide-up" onClick={handleAddField}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Field
                  </Button>
                </CardContent>
              </Card>
            </div>
          </RevealOnScroll>
        </TabsContent>
      </Tabs>
    </div>
  )
}