import React, { useState, useEffect } from 'react'
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
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { useFarmStore } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'

const quickActions = [
  {
    name: 'Soil Health Analysis',
    description: 'Analyze soil moisture, organic matter, and vegetation health using NASA data',
    icon: Leaf,
    href: '/soil-health',
    color: 'text-green-600 bg-green-100',
    badge: 'New',
  },
  {
    name: 'Rotation Planner',
    description: 'Optimize crop rotations for water conservation, soil health, and profitability',
    icon: GitBranch,
    href: '/rotation-planner',
    color: 'text-blue-600 bg-blue-100',
    badge: 'Popular',
  },
  {
    name: 'Yield Predictor',
    description: 'Predict crop yields with confidence intervals using ML models',
    icon: TrendingUp,
    href: '/yield-predictor',
    color: 'text-purple-600 bg-purple-100',
    badge: 'Beta',
  },
  {
    name: 'Water Stress Monitor',
    description: 'Early drought detection and irrigation scheduling alerts',
    icon: AlertTriangle,
    href: '/water-stress',
    color: 'text-orange-600 bg-orange-100',
    badge: 'Alert',
  },
  {
    name: 'Field Map',
    description: 'Visualize NASA Earth observation data on interactive maps',
    icon: Map,
    href: '/field-map',
    color: 'text-indigo-600 bg-indigo-100',
    badge: 'Map',
  },
  {
    name: 'Settings',
    description: 'Configure data sources, units, and preferences',
    icon: Settings,
    href: '/settings',
    color: 'text-gray-600 bg-gray-100',
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
      activeAlerts: 0, // Would come from alerts API
      totalPredictions: 0, // Would come from predictions API
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

const fetchWeatherForFarm = async (farm: { centroid: { lat: number; lon: number } }) => {
    setWeather({ loading: true })
    try {
      // Use NASA POWER API via backend
      const data = await api.get<WeatherData>('/api/v1/data/weather', {
        params: {
          lat: farm.centroid.lat,
          lon: farm.centroid.lon,
        }
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
      setWeather({ loading: false, error: 'Failed to fetch weather' })
    }
  }

  const fetchRecentCollections = async () => {
    try {
      const data = await api.get<RecentCollection[]>('/api/v1/data/collections/recent', { params: { limit: 5 } })
      if (Array.isArray(data)) {
        setRecentCollections(data)
      }
    } catch (error) {
      console.error('Failed to fetch recent collections:', error)
    }
  }

  const handleAddField = () => {
    // Navigate to field map to create a new farm
    window.location.href = '/field-map'
  }

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'info': return <BarChart3 className="w-5 h-5" />
      default: return <BarChart3 className="w-5 h-5" />
    }
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-600'
      case 'warning': return 'bg-orange-100 text-orange-600'
      case 'info': return 'bg-blue-100 text-blue-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your fields and NASA Earth observation insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { addToast({ type: 'info', title: 'Export Report', message: 'Report generation coming soon' }) }}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" onClick={handleAddField}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fields Monitored</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalFarms}</p>
                <p className="text-sm text-gray-500 mt-2">{stats.totalFarms > 0 ? 'Active' : 'No fields yet'}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Map className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Soil Health</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgSoilHealth}</p>
                <p className="text-sm text-gray-500 mt-2">{farms.some(f => f.dataStatus === 'completed') ? 'From NASA data' : 'Collect data first'}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeAlerts}</p>
                <p className="text-sm text-gray-500 mt-2">Check Monitoring tab</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Predictions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPredictions}</p>
                <p className="text-sm text-gray-500 mt-2">Run Yield Predictor</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <TrendingUpIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fields">My Fields</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <Card key={action.name} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-xl', action.color)}>
                          <action.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{action.name}</h3>
                            {action.badge && (
                              <Badge variant="default" className="text-xs">{action.badge}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                        </div>
                      </div>
                      <Link
                        to={action.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-4 group-hover:underline"
                      >
                        Get Started
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Weather & Recent Activity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    Current Conditions
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
                    <div className="p-4 text-center text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>{weather.error}</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => farms.length > 0 && fetchWeatherForFarm(farms[0])}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {weather.temperature && (
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Sun className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-gray-500">Temperature</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{weather.temperature}</p>
                        </div>
                      )}
                      {weather.humidity && (
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Droplet className="w-5 h-5 text-blue-600" />
                            <span className="text-sm text-gray-500">Humidity</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{weather.humidity}</p>
                        </div>
                      )}
                      {weather.precipitation && (
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Cloud className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-gray-500">Precipitation (7d)</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{weather.precipitation}</p>
                        </div>
                      )}
                      {weather.soilMoisture && (
                        <div className="p-4 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <Droplet className="w-5 h-5 text-cyan-600" />
                            <span className="text-sm text-gray-500">Soil Moisture</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{weather.soilMoisture}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Recent Collections
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchRecentCollections} disabled={recentCollections.length > 0 && false}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {recentCollections.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent data collections</p>
                      <p className="text-sm mt-1">Create a farm and collect data to see activity here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {recentCollections.map((collection) => (
                        <div
                          key={collection.id}
                          className="p-4 hover:bg-gray-50 flex items-center gap-4"
                        >
                          <div className={cn('p-2 rounded-full',
                            collection.status === 'completed' ? 'bg-green-100 text-green-600' :
                            collection.status === 'partial_failure' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                          )}>
                            {collection.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                            {collection.status === 'partial_failure' && <AlertTriangle className="w-5 h-5" />}
                            {(collection.status !== 'completed' && collection.status !== 'partial_failure') && <Loader2 className="w-5 h-5 animate-spin" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">Data collection for {collection.farmName}</p>
                            <p className="text-xs text-gray-500">Status: {collection.status} • {formatDate(collection.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Fields</h2>
              <Button size="sm" onClick={handleAddField}>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
            {farmsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-5 bg-gray-200 rounded w-20"></div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : farms.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                  <p className="text-gray-500 mb-4">Create your first field to start monitoring with NASA Earth observation data</p>
                  <Button onClick={handleAddField}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Field on Map
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {farms.map((farm) => (
                  <Card key={farm.id} className="hover:shadow-md transition-shadow">
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
                        <Badge
                          variant={
                            farm.dataStatus === 'completed' ? 'success' :
                            farm.dataStatus === 'collecting' ? 'info' :
                            farm.dataStatus === 'failed' ? 'danger' : 'default'
                          }
                        >
                          {farm.dataStatus || 'No data'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-600">Soil Health</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900">
                          {farm.dataStatus === 'completed' ? '85' : '—'}
                        </span>
                      </div>
                      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: farm.dataStatus === 'completed' ? '85%' : '0%' }}
                        />
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
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
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-gray-900 mb-1">No alerts at this time</p>
                <p className="text-sm">Create farms and run data collection to enable alert monitoring</p>
                <Button variant="secondary" className="mt-4" onClick={handleAddField}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Field
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
