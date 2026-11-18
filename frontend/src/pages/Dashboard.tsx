import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Cloud,
  Sun,
  Droplet,
  BarChart3,
  Plus,
  MapPin,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { PageHero } from '../components/PageHero'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { useFarmStore } from '../stores/farmStore'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import { Skeleton, CardSkeleton, DashboardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import { AnimatedPage } from '../components/PageTransition'

const quickActions = [
  {
    name: 'Santé du sol',
    description: 'Humidité, matière organique et végétation à partir des observations satellite.',
    icon: Leaf,
    href: '/soil-health',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    name: 'Plan de rotation',
    description: 'Comparer les successions culturales selon le sol, l’eau et le revenu.',
    icon: GitBranch,
    href: '/rotation-planner',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    name: 'Prévision de rendement',
    description: 'Estimer une plage de rendement à partir du climat et du sol.',
    icon: TrendingUp,
    href: '/yield-predictor',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    name: 'Stress hydrique',
    description: 'Évaluer le risque de manque d’eau pour les cultures.',
    icon: AlertTriangle,
    href: '/water-stress',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    name: 'Carte des champs',
    description: 'Localiser les parcelles et consulter les couches disponibles.',
    icon: Map,
    href: '/field-map',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  {
    name: 'Paramètres',
    description: 'Configurer les unités, les sources et les préférences.',
    icon: Settings,
    href: '/settings',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { farms, loading: farmsLoading, fetchFarms } = useFarmStore()
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

  // Fetch farms on mount
  useEffect(() => {
    fetchFarms()
  }, [fetchFarms])

  // Fetch recent collections
  useEffect(() => {
    fetchRecentCollections()
  }, [])

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
        setWeather({ loading: false, error: 'Aucune donnée météo disponible' })
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error)
      setWeather({ loading: false, error: 'Échec du chargement météo' })
    }
  }, [])

  useEffect(() => {
    if (farms.length > 0) {
      fetchWeatherForFarm(farms[0])
    } else {
      setWeather({ loading: false, error: 'Ajoutez une parcelle pour consulter les conditions météo.' })
    }
  }, [farms, fetchWeatherForFarm])

  const fetchRecentCollections = useCallback(async () => {
    try {
      const data = await api.get<RecentCollection[]>('/data/collections/recent', { params: { limit: 5 } })
      if (Array.isArray(data)) setRecentCollections(data)
    } catch (error) {
      console.error('Failed to fetch recent collections:', error)
    }
  }, [])

  const handleAddField = () => navigate('/field-map')

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { icon: CheckCircle, pulse: false, label: 'Terminée' }
      case 'partial_failure': return { icon: AlertTriangle, pulse: false, label: 'Partielle' }
      case 'collecting': return { icon: Loader2, pulse: true, label: 'En cours' }
      case 'failed': return { icon: AlertCircle, pulse: false, label: 'Échec' }
      default: return { icon: BarChart3, pulse: false, label: 'En attente' }
    }
  }

  // Show skeleton while loading
  if (farmsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHero
          kicker="SYNTHÈSE AGRONOMIQUE"
          title="Vue d’ensemble"
          subtitle="État des parcelles, dernières observations et analyses disponibles."
        />
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <AnimatedPage transition="rise" delay={50} className="space-y-6">
      {/* Header */}
      <PageHero
        kicker="SYNTHÈSE AGRONOMIQUE"
        title="Vue d’ensemble"
        subtitle="État des parcelles, dernières observations et analyses disponibles."
        actions={
          <>
            <Link to="/reports" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Ouvrir les rapports
            </Link>
            <Button size="sm" onClick={handleAddField}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une parcelle
            </Button>
          </>
        }
      />

      {/* Stats Grid with animated cards */}
      <div className="grid max-w-sm grid-cols-1 gap-4" style={{ animationDelay: '100ms' }}>
        <StatCard
          label="Parcelles enregistrées"
          value={farms.length}
          icon={<Map className="w-6 h-6" />}
          className="hover-lift animate-fade-in"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full" variant="segments" animated transition="fade">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="overview" icon={<BarChart3 className="w-4 h-4" />}>Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="fields" icon={<Map className="w-4 h-4" />}>Champs</TabsTrigger>
          <TabsTrigger value="alerts" icon={<AlertTriangle className="w-4 h-4" />}>Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" transition="slide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Analyses et outils</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions.map((action, index) => (
                  <Card
                    key={action.name}
                    variant="interactive"
                    hover
                    className="group overflow-hidden animate-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn('rounded-lg p-2.5', action.color)}>
                          <action.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900">{action.name}</h3>
                          <p className="mt-1 text-sm leading-5 text-gray-500">{action.description}</p>
                          <Link
                            to={action.href}
                            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                          >
                            Ouvrir l’outil
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Weather & Recent Activity */}
            <div className="space-y-6">
              <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
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
                      {farms.length > 0 && (
                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => fetchWeatherForFarm(farms[0])}>
                          <RefreshCw className="mr-1 h-4 w-4" />
                          Réessayer
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {weather.temperature && (
                        <MetricCard
                          title="Température"
                          value={weather.temperature.replace('°C', '')}
                          unit="°C"
                          icon={<Sun className="w-5 h-5" />}
                          color="amber"
                          className="animate-fade-in"
                          style={{ animationDelay: '50ms' }}
                        />
                      )}
                      {weather.humidity && (
                        <MetricCard
                          title="Humidité"
                          value={weather.humidity.replace('%', '')}
                          unit="%"
                          icon={<Droplet className="w-5 h-5" />}
                          color="sky"
                          className="animate-fade-in"
                          style={{ animationDelay: '100ms' }}
                        />
                      )}
                      {weather.precipitation && (
                        <MetricCard
                          title="Pluie (7 j)"
                          value={weather.precipitation.replace('mm', '')}
                          unit="mm"
                          icon={<Cloud className="w-5 h-5" />}
                          color="earth"
                          className="animate-fade-in"
                          style={{ animationDelay: '150ms' }}
                        />
                      )}
                      {weather.soilMoisture && (
                        <MetricCard
                          title="Humidité du sol"
                          value={weather.soilMoisture.replace(' m³/m³', '')}
                          unit="m³/m³"
                          icon={<Droplet className="w-5 h-5" />}
                          color="sky"
                          className="animate-fade-in"
                          style={{ animationDelay: '200ms' }}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '200ms' }}>
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
                            className="p-4 hover:bg-gray-50 flex items-center gap-4 animate-fade-in"
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
                              <p className="text-sm font-medium text-gray-900">Collecte de données — {collection.farmName}</p>
                              <p className="text-xs text-gray-500">État : {statusConfig.label} • {formatDate(collection.createdAt)}</p>
                            </div>
                            <StatusBadge status={collection.status as any} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields" transition="slide">
          <div className="space-y-4">
            <div className="flex items-center justify-between animate-fade-in">
              <h2 className="text-lg font-semibold text-gray-900">Parcelles suivies</h2>
              <Button size="sm" onClick={handleAddField}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une parcelle
              </Button>
            </div>
            {farms.length === 0 ? (
              <Card variant="elevated" className="animate-fade-in">
                <CardContent className="p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-float" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Aucune parcelle enregistrée</h3>
                  <p className="mb-4 text-gray-500">Ajoutez une parcelle pour consulter ses observations et analyses.</p>
                  <Button onClick={handleAddField}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une parcelle sur la carte
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {farms.map((farm, index) => (
                  <Card
                    key={farm.id}
                    variant="interactive"
                    hover
                    className="overflow-hidden animate-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                          <p className="text-sm text-gray-500">
                            {farm.crop || 'Culture non précisée'}{farm.area ? ` · ${farm.area}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            ({farm.centroid?.lat.toFixed(2)}, {farm.centroid?.lon.toFixed(2)})
                          </p>
                        </div>
                        <StatusBadge status={farm.dataStatus as any} />
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                        <Link to={`/monitoring?farm=${farm.id}`} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full">Suivi</Button>
                        </Link>
                        <Link to={`/crops?farm=${farm.id}`} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full">Rotation</Button>
                        </Link>
                        <Link to={`/reports?farm=${farm.id}`} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full">Rapport</Button>
                        </Link>
                      </div>
                    </CardContent>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-earth-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" transition="slide">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Alertes</h2>
            <Card variant="elevated" className="animate-fade-in">
              <CardContent className="p-6 text-center text-gray-500">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-float" />
                <p className="mb-1 font-medium text-gray-900">Aucune alerte calculée</p>
                <p className="text-sm">Les alertes sont disponibles après la collecte des données d’une parcelle.</p>
                <Button variant="secondary" className="mt-4" onClick={handleAddField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une parcelle
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  )
}