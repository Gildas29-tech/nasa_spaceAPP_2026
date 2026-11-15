import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  Activity,
  AlertTriangle,
  Droplet,
  Leaf,
  RefreshCw,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Cloud,
  Sun,
  FileText,
  Clock,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import HarvestVision from './HarvestVision'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'

// Types for real data from backend
interface WaterDataPoint {
  date: string
  surface?: number
  root?: number
  normal?: number
  et0?: number
  eta?: number
  precipitation?: number
}

interface AlertData {
  id: string
  level: 'critical' | 'warning' | 'info'
  type: string
  title: string
  farm: string
  time: string
  desc: string
  value: string
}

interface MonitoringData {
  ndvi?: number
  alertsCount?: number
  waterReserve?: number
  alerts?: AlertData[]
  precipitation?: WaterDataPoint[]
  soilMoisture?: WaterDataPoint[]
  et?: WaterDataPoint[]
  riskCategories?: Array<{
    type: string
    title: string
    count: number
    level: string
    metrics: string[]
    color: string
    icon: React.ComponentType<{ className?: string }>
  }>
}

export default function Monitoring() {
  const { farms, loading: farmsLoading, fetchFarms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('last-month')
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch farms on mount
  useEffect(() => {
    fetchFarms()
  }, [fetchFarms])

  // Set selected farm when farms load or selection changes
  useEffect(() => {
    if (farms.length > 0) {
      const farm = farms.find(f => f.id === selectedFarmId) || farms[0]
      setSelectedFarm(farm)
      selectFarm(farm.id)
    } else {
      setSelectedFarm(null)
      selectFarm(null)
    }
  }, [farms, selectedFarmId, selectFarm])

  // Fetch monitoring data when farm or date range changes
  useEffect(() => {
    if (!selectedFarm) return

    const fetchMonitoringData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Calculate date range
        const endDate = new Date()
        const startDate = new Date()
        switch (dateRange) {
          case 'last-week':
            startDate.setDate(startDate.getDate() - 7)
            break
          case 'last-month':
            startDate.setMonth(startDate.getMonth() - 1)
            break
          case 'last-quarter':
            startDate.setMonth(startDate.getMonth() - 3)
            break
          case 'last-year':
            startDate.setFullYear(startDate.getFullYear() - 1)
            break
        }

        // Fetch collection summary for this farm
        const collections = await api.get<Array<{ collection_id: string; farm_id: string; created_at: string }>>('/api/v1/data/collections/recent', {
          params: { limit: 10 }
        })

        const latestCollection = collections.find(c => c.farm_id === selectedFarm.id)

        if (latestCollection) {
          const summary = await api.get<MonitoringData>(`/api/v1/data/collect/${latestCollection.collection_id}/summary`)
          setMonitoringData(summary)
        } else {
          // No collection yet - set empty state
          setMonitoringData({
            ndvi: 0,
            alertsCount: 0,
            waterReserve: 0,
            alerts: [],
            precipitation: [],
            soilMoisture: [],
            et: [],
            riskCategories: []
          })
        }
      } catch (err: any) {
        console.error('Failed to fetch monitoring data:', err)
        setError('Failed to load monitoring data')
        setMonitoringData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMonitoringData()
  }, [selectedFarm, dateRange])

  const handleRefresh = async () => {
    if (!selectedFarm) return
    addToast({ type: 'info', title: 'Refreshing', message: 'Fetching latest data...' })
    // Trigger a new data collection
    try {
      const result = await api.post<{ collection_id: string }>('/api/v1/data/collect', {
        farm_id: selectedFarm.id,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      })
      addToast({ type: 'success', title: 'Collection started', message: `Collection ${result.collection_id.slice(0,8)}... started` })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to start collection', message: 'Please try again' })
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-400'
      case 'warning': return 'text-orange-600 bg-orange-100 border-orange-400'
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-400'
      default: return 'text-gray-600 bg-gray-100 border-gray-400'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600" />
      case 'info': return <Info className="w-5 h-5 text-blue-600" />
      default: return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const alerts = monitoringData?.alerts || []
  const precipitation = monitoringData?.precipitation || []
  const soilMoisture = monitoringData?.soilMoisture || []
  const et = monitoringData?.et || []
  const riskCategories = monitoringData?.riskCategories || []

  if (farmsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-12 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Surveillance</h1>
            <p className="text-gray-500 mt-1">Monitoring environnemental multi-sources (HarvestVision, FarmGuardian, WaterWise)</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No farms configured</h3>
            <p className="text-gray-500 mb-4">Create your first farm to start monitoring</p>
            <Link to="/field-map">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Farm on Map
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Surveillance</h1>
          <p className="text-gray-500 mt-1">Monitoring environnemental multi-sources (HarvestVision, FarmGuardian, WaterWise)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading || !selectedFarm}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading ? 'animate-spin' : '')} />
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}} disabled={!monitoringData}>
            <Download className="w-4 h-4 mr-2" />
            Exporter alertes
          </Button>
        </div>
      </div>

      {/* Farm Selector & Global Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 sm:w-64">
              <Select
                label="Exploitation"
                placeholder="Sélectionner une exploitation"
                value={selectedFarm?.id || ''}
                onChange={(e) => {
                  const farm = farms.find(f => f.id === e.target.value)
                  if (farm) {
                    setSelectedFarm(farm)
                    selectFarm(farm.id)
                  }
                }}
                options={farms.map(f => ({ value: f.id, label: `${f.name} (${f.crops_of_interest?.[0] || 'No crop'}, ${f.area || 'Unknown area'})` }))}
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Période"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={[
                  { value: 'last-week', label: 'Dernière semaine' },
                  { value: 'last-month', label: 'Dernier mois' },
                  { value: 'last-quarter', label: 'Dernier trimestre' },
                  { value: 'last-year', label: 'Dernière année' },
                ]}
              />
            </div>
            {selectedFarm && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedFarm.description || selectedFarm.location || 'Unknown location'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Leaf className="w-4 h-4" />
                  <span>{selectedFarm.crops_of_interest?.[0] || 'No crop'} • {selectedFarm.area || 'Unknown area'}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Végétation (NDVI)</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {monitoringData?.ndvi !== undefined && monitoringData.ndvi > 0
                    ? monitoringData.ndvi.toFixed(2)
                    : loading ? '...' : 'N/A'}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {monitoringData?.ndvi !== undefined && monitoringData.ndvi > 0
                    ? '+0.05 vs mois dernier'
                    : 'Aucune donnée disponible'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Alertes actives</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {monitoringData?.alertsCount !== undefined ? monitoringData.alertsCount : alerts.length}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  {alerts.filter(a => a.level === 'critical').length} critique, {alerts.filter(a => a.level === 'warning').length} attention
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Réserve hydrique</p>
                <p className="text-3xl font-bold text-cyan-600 mt-1">
                  {monitoringData?.waterReserve !== undefined && monitoringData.waterReserve > 0
                    ? `${Math.round(monitoringData.waterReserve)}%`
                    : loading ? '...' : 'N/A'}
                </p>
                <p className="text-sm text-orange-600 mt-1">
                  {monitoringData?.waterReserve !== undefined && monitoringData.waterReserve > 0
                    ? '-15% vs normale'
                    : 'Aucune donnée disponible'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-100">
                <Droplet className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="vegetation">HarvestVision (Végétation)</TabsTrigger>
          <TabsTrigger value="risks">FarmGuardian (Risques)</TabsTrigger>
          <TabsTrigger value="water">WaterWise (Eau)</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Alerts */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  Alertes actives - {selectedFarm?.name || 'Sélectionnez une ferme'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 animate-pulse bg-gray-100 rounded" />
                    ))}
                  </div>
                ) : alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={cn('p-4 rounded-lg border-l-4', getLevelColor(alert.level))}>
                        <div className="flex items-start gap-4">
                          {getLevelIcon(alert.level)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                              <Badge variant={alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'info'}>
                                {alert.level}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{alert.desc}</p>
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                              <span>{alert.farm}</span>
                              <span>{alert.time}</span>
                              <span className="font-mono">{alert.value}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">Détails</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Aucune alerte pour cette période</p>
                    <p className="text-sm mt-1">Lancez une collecte de données pour générer des alertes</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={`/monitoring/vegetation?farm=${selectedFarm?.id}`}>
                  <Button variant="secondary" className="w-full justify-start gap-3" disabled={!selectedFarm}>
                    <div className="p-2 rounded-lg bg-green-100"><Leaf className="w-5 h-5 text-green-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Analyser végétation</p>
                      <p className="text-xs text-gray-500">NDVI, EVI, anomalies</p>
                    </div>
                  </Button>
                </Link>
                <Link to={`/monitoring/risks?farm=${selectedFarm?.id}`}>
                  <Button variant="secondary" className="w-full justify-start gap-3" disabled={!selectedFarm}>
                    <div className="p-2 rounded-lg bg-orange-100"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Vérifier risques</p>
                      <p className="text-xs text-gray-500">Sécheresse, chaleur, maladies</p>
                    </div>
                  </Button>
                </Link>
                <Link to={`/monitoring/water?farm=${selectedFarm?.id}`}>
                  <Button variant="secondary" className="w-full justify-start gap-3" disabled={!selectedFarm}>
                    <div className="p-2 rounded-lg bg-cyan-100"><Droplet className="w-5 h-5 text-cyan-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Ressources en eau</p>
                      <p className="text-xs text-gray-500">Précipitations, irrigation, ET</p>
                    </div>
                  </Button>
                </Link>
                <Link to={`/reports?farm=${selectedFarm?.id}`}>
                  <Button variant="primary" className="w-full justify-start gap-3" disabled={!selectedFarm}>
                    <div className="p-2 rounded-lg bg-blue-100"><FileText className="w-5 h-5 text-blue-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Générer rapport</p>
                      <p className="text-xs text-gray-500">Diagnostic complet</p>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Précipitations vs Normale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={precipitation.length > 0 ? precipitation : [{ month: 'Jan', value: 0, normal: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="normal" fill="#E5E7EB" name="Normale" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="value" fill="#3b82f6" name="Observé" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {precipitation.length === 0 && (
                  <p className="text-center text-gray-500 mt-2 text-sm">Aucune donnée - Lancez une collecte</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Humidité du sol (SMAP)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={soilMoisture.length > 0 ? soilMoisture : [{ date: '2024-01-01', surface: 0, root: 0, normal: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} domain={[0, 0.5]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="surface" stroke="#f97316" strokeWidth={2} name="Surface" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="root" stroke="#22c55e" strokeWidth={2} name="Zone racinaire" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="normal" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" name="Normale" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {soilMoisture.length === 0 && (
                  <p className="text-center text-gray-500 mt-2 text-sm">Aucune donnée - Lancez une collecte</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HarvestVision Tab */}
        <TabsContent value="vegetation">
          <HarvestVision />
        </TabsContent>

        {/* FarmGuardian Tab - Risks */}
        <TabsContent value="risks">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  FarmGuardian - Surveillance des risques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Risk Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {riskCategories.length > 0 ? riskCategories.map((risk) => (
                      <Card key={risk.type} className={cn('border-l-4', risk.color.replace('bg-', 'border-').replace('100', '500'))}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn('p-3 rounded-xl', risk.color)}>
                              <risk.icon className="w-6 h-6" />
                            </div>
                            <Badge variant={risk.level === 'critical' ? 'danger' : risk.level === 'warning' ? 'warning' : 'info'}>
                              {risk.count} alerte{risk.count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-3">{risk.title}</h3>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {risk.metrics.map((m, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: risk.color.replace('bg-', '').replace('text-', '').replace('100', '500').replace('600', '500') }} />
                                {m}
                              </li>
                            ))}
                          </ul>
                          <Button variant="secondary" size="sm" className="mt-4 w-full">Voir détails</Button>
                        </CardContent>
                      </Card>
                    )) : [
                      { type: 'drought', title: 'Sécheresse', icon: Droplet, color: 'text-amber-600 bg-amber-100', count: 0, level: 'info', metrics: ['Aucune donnée disponible'] },
                      { type: 'heat', title: 'Stress thermique', icon: Sun, color: 'text-red-600 bg-red-100', count: 0, level: 'info', metrics: ['Aucune donnée disponible'] },
                      { type: 'vegetation', title: 'Anomalies vég.', icon: Leaf, color: 'text-green-600 bg-green-100', count: 0, level: 'info', metrics: ['Aucune donnée disponible'] },
                    ].map((risk) => (
                      <Card key={risk.type} className={cn('border-l-4', risk.color.replace('bg-', 'border-').replace('100', '500'))}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn('p-3 rounded-xl', risk.color)}>
                              <risk.icon className="w-6 h-6" />
                            </div>
                            <Badge variant={risk.level === 'critical' ? 'danger' : risk.level === 'warning' ? 'warning' : 'info'}>
                              {risk.count} alerte{risk.count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-3">{risk.title}</h3>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {risk.metrics.map((m, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: risk.color.replace('bg-', '').replace('text-', '').replace('100', '500').replace('600', '500') }} />
                                {m}
                              </li>
                            ))}
                          </ul>
                          <Button variant="secondary" size="sm" className="mt-4 w-full" disabled>Voir détails</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Detailed Alerts */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Détail des alertes - {selectedFarm?.name || 'Sélectionnez une ferme'}</h3>
                    <div className="space-y-3">
                      {alerts.length > 0 ? alerts.map((alert) => (
                        <Card key={alert.id} className={cn('border-l-4', getLevelColor(alert.level))}>
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {getLevelIcon(alert.level)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                                  <Badge variant={alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'info'}>
                                    {alert.level}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{alert.desc}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.farm}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{alert.time}</span>
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{alert.value}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">Analyser</Button>
                                <Button variant="ghost" size="sm">Ignorer</Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )) : (
                        <div className="text-center py-8 text-gray-500">
                          <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>Aucune alerte pour cette ferme</p>
                          <p className="text-sm mt-1">Lancez une collecte de données pour générer des alertes</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WaterWise Tab */}
        <TabsContent value="water">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-cyan-600" />
                  WaterWise - Analyse des ressources en eau
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Water Balance */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Précipitations (30j)', value: precipitation.length > 0 ? `${precipitation.reduce((a, b) => a + (b.precipitation || 0), 0).toFixed(1)} mm` : 'N/A', ref: 'Normale: ~45 mm', status: 'warning', icon: Cloud, color: 'text-blue-600' },
                    { label: 'Humidité surface', value: soilMoisture.length > 0 ? `${soilMoisture[soilMoisture.length - 1].surface?.toFixed(3) || 'N/A'} m³/m³` : 'N/A', ref: 'Normale: 0.34', status: 'warning', icon: Droplet, color: 'text-amber-600' },
                    { label: 'Humidité racinaire', value: soilMoisture.length > 0 ? `${soilMoisture[soilMoisture.length - 1].root?.toFixed(3) || 'N/A'} m³/m³` : 'N/A', ref: 'Normale: 0.33', status: 'warning', icon: Droplet, color: 'text-amber-600' },
                    { label: 'ET réelle (7j)', value: et.length > 0 ? `${et.slice(-7).reduce((a, b) => a + (b.eta || 0), 0).toFixed(1)} mm` : 'N/A', ref: `ET0: ${et.length > 0 ? et.slice(-7).reduce((a, b) => a + (b.et0 || 0), 0).toFixed(1) : 'N/A'} mm`, status: 'good', icon: Sun, color: 'text-orange-600' },
                  ].map((item, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn('p-2 rounded-lg', item.color.replace('text-', 'bg-').replace('600', '100'))}>
                            <item.icon className={cn('w-5 h-5', item.color)} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{item.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 ml-10">{item.ref}</p>
                        <Badge variant={item.status === 'good' ? 'success' : 'warning'} className="mt-2 ml-10">
                          {item.status === 'good' ? 'OK' : 'Surveillance'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Évapotranspiration (OpenET)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={et.length > 0 ? et : [{ date: '2024-01-01', et0: 0, eta: 0 }]}>
                            <defs>
                              <linearGradient id="et0Gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="etaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="et0" stroke="#f97316" fill="url(#et0Gradient)" strokeWidth={2} name="ET0 (Référence)" />
                            <Area type="monotone" dataKey="eta" stroke="#22c55e" fill="url(#etaGradient)" strokeWidth={2} name="ET réelle" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Kc = ET réelle / ET0 ≈ {et.length > 1 && et[et.length - 1].et0 ? (et[et.length - 1].eta! / et[et.length - 1].et0!).toFixed(2) : 'N/A'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Bilan hydrique estimé</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={precipitation.length > 0 ? precipitation.slice(-6) : [{ month: 'Jan', value: 0, normal: 0 }]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" name="Précipitations" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="normal" fill="#E5E7EB" name="Normale" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Déficit cumulé (3 mois)</span>
                          <span className="font-semibold text-orange-600">
                            {precipitation.length > 0
                              ? `${(precipitation.slice(-3).reduce((a, b) => a + (b.normal || 0), 0) - precipitation.slice(-3).reduce((a, b) => a + (b.precipitation || 0), 0)).toFixed(0)} mm`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Réserve utile disponible</span>
                          <span className="font-semibold text-cyan-600">{monitoringData?.waterReserve ? `~${Math.round(monitoringData.waterReserve * 2)} mm` : '~130 mm'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Autonomie sans pluie</span>
                          <span className="font-semibold text-amber-600">~18 jours</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex justify-between">
                          <span className="text-gray-600">Irrigation recommandée</span>
                          <Badge variant="warning">Oui, si moins de 50% r&eacute;serve</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Irrigation Schedule */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Planification irrigation suggérée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Réserve estimée</th>
                            <th className="pb-2 font-medium">Seuil déclenchement</th>
                            <th className="pb-2 font-medium">Volume suggéré</th>
                            <th className="pb-2 font-medium">Priorité</th>
                            <th className="pb-2 font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alerts.filter(a => a.type === 'water-stress').length > 0 ? alerts.filter(a => a.type === 'water-stress').map((alert, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3">{new Date().toISOString().split('T')[0]}</td>
                              <td className="py-3 font-medium">{alert.value}</td>
                              <td className="py-3">50%</td>
                              <td className="py-3 font-mono">25 mm</td>
                              <td className="py-3">
                                <Badge variant={alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'success'}>
                                  {alert.level}
                                </Badge>
                              </td>
                              <td className="py-3 text-gray-600">{alert.desc.split('.')[0]}</td>
                            </tr>
                          )) : [
                            { date: '2024-02-05', reserve: '48%', threshold: '50%', volume: '25 mm', priority: 'high', notes: 'Avant floraison maïs' },
                            { date: '2024-02-12', reserve: '42%', threshold: '50%', volume: '30 mm', priority: 'high', notes: 'Période critique' },
                            { date: '2024-02-19', reserve: '55%', threshold: '50%', volume: '0 mm', priority: 'low', notes: 'Pluies prévues' },
                            { date: '2024-02-26', reserve: '45%', threshold: '50%', volume: '20 mm', priority: 'medium', notes: 'Surveiller' },
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3">{row.date}</td>
                              <td className="py-3 font-medium">{row.reserve}</td>
                              <td className="py-3">{row.threshold}</td>
                              <td className="py-3 font-mono">{row.volume}</td>
                              <td className="py-3">
                                <Badge variant={row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'success'}>
                                  {row.priority}
                                </Badge>
                              </td>
                              <td className="py-3 text-gray-600">{row.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Basé sur modèle FAO-56 + données SMAP/OpenET. Validation terrain requise avant irrigation.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
