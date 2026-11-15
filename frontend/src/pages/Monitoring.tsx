import { useState, useEffect, useCallback } from 'react'
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
  Target,
  BarChart2,
  LineChart as LineChartIcon,
  Zap,
  Wind,
  Thermometer,
  Droplets,
  Sprout,
  X,
  Waves,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { PageHero } from '../components/PageHero'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import HarvestVision from './HarvestVision'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'
import { AnimatedPage, RevealOnScroll, StaggeredContainer } from '../components/PageTransition'
import { Skeleton, CardSkeleton, StatCardSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui/Skeleton'

// Types for real data from backend
interface WaterDataPoint {
  date: string
  surface?: number
  root?: number
  normal?: number
  et0?: number
  eta?: number
  precipitation?: number
  month?: string
  value?: number
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
  ndviDelta?: number | null
  ndviDate?: string | null
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

async function loadNdvi(lat: number, lon: number): Promise<Pick<MonitoringData, 'ndvi' | 'ndviDelta' | 'ndviDate'>> {
  try {
    const data = await api.get<{ ndvi: number | null; delta: number | null; date: string | null }>('/data/ndvi', {
      params: { lat, lon },
    })
    if (data.ndvi == null) return {}
    return { ndvi: data.ndvi, ndviDelta: data.delta, ndviDate: data.date }
  } catch {
    return {}
  }
}

// Animated chart components with Recharts animation
const AnimatedBarChart = ({ data, dataKey, color, ...props }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11 }} hide />
      <YAxis type="category" dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} width={60} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
        animationDuration={300}
      />
      <Bar
        dataKey={dataKey}
        fill={color}
        name="Observé"
        radius={[0, 4, 4, 0]}
        isAnimationActive={true}
        animationDuration={800}
        animationEasing="ease-out"
      />
    </BarChart>
  </ResponsiveContainer>
)

const AnimatedLineChart = ({ data, lines, ...props }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} domain={props.domain || 'auto'} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
        animationDuration={300}
      />
      {lines.map((line: any, i: number) => (
        <Line
          key={line.dataKey}
          type="monotone"
          dataKey={line.dataKey}
          stroke={line.stroke}
          strokeWidth={line.strokeWidth || 2}
          name={line.name}
          dot={line.dot || { r: 3, strokeWidth: 2 }}
          strokeDasharray={line.strokeDasharray}
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={i * 150}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
)

const AnimatedAreaChart = ({ data, areas, ...props }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <defs>
        {areas.map((area: any) => (
          <linearGradient key={area.dataKey} id={area.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={area.stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={area.stroke} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
        animationDuration={300}
      />
      {areas.map((area: any, i: number) => (
        <Area
          key={area.dataKey}
          type="monotone"
          dataKey={area.dataKey}
          stroke={area.stroke}
          fill={`url(#${area.gradientId})`}
          strokeWidth={area.strokeWidth || 2}
          name={area.name}
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={i * 150}
        />
      ))}
    </AreaChart>
  </ResponsiveContainer>
)

// Loading skeleton for the whole page
function MonitoringSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="HarvestVision · FarmGuardian · WaterWise" title="Surveillance" subtitle="Le climat, la végétation et l'eau du champ, lus ensemble." />

        <RevealOnScroll transition="slide-up" delay={100}>
          <CardSkeleton className="animate-stagger-slide-up" />
        </RevealOnScroll>

        <RevealOnScroll transition="slide-up" delay={200}>
          <StaggeredContainer staggerDelay={100} transition="stagger-slide-up">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </StaggeredContainer>
        </RevealOnScroll>

        <RevealOnScroll transition="slide-up" delay={300}>
          <StaggeredContainer staggerDelay={150} transition="stagger-slide-up">
            <ChartSkeleton />
            <ChartSkeleton />
          </StaggeredContainer>
        </RevealOnScroll>
      </div>
    </AnimatedPage>
  )
}

// Empty state skeleton
function EmptyFarmSkeleton() {
  return (
    <AnimatedPage>
      <PageHero kicker="HarvestVision · FarmGuardian · WaterWise" title="Surveillance" subtitle="Le climat, la végétation et l'eau du champ, lus ensemble." />
      <RevealOnScroll transition="slide-up" delay={200}>
        <Card variant="elevated" className="hover-lift animate-fade-in">
          <CardContent className="p-12 text-center animate-fade-in">
            <Target className="w-12 h-12 text-emerald-700/40 mx-auto mb-4 animate-float" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune exploitation</h3>
            <p className="text-gray-500 mb-4">Posez un champ sur la carte pour lancer la surveillance.</p>
            <Link to="/field-map">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Créer sur la carte
              </Button>
            </Link>
          </CardContent>
        </Card>
      </RevealOnScroll>
    </AnimatedPage>
  )
}

// Chart cards with motion
function ChartCard({ title, subtitle, children, className, delay = 0, ...props }: any) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay} key={title}>
      <Card variant="elevated" className={cn('hover-lift', className)} {...props}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <span>{title}</span>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          {children}
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

// Risk category card
function RiskCategoryCard({ risk, delay = 0 }: { risk: any; delay?: number }) {
  const levelConfig = {
    critical: { variant: 'danger' as const, color: 'border-red-500', bg: 'bg-red-50' },
    warning: { variant: 'warning' as const, color: 'border-orange-500', bg: 'bg-orange-50' },
    info: { variant: 'info' as const, color: 'border-blue-500', bg: 'bg-blue-50' },
  }
  const config = levelConfig[risk.level as keyof typeof levelConfig] || levelConfig.info

  return (
    <RevealOnScroll transition="slide-up" delay={delay}>
      <Card
        variant="elevated"
        className={cn('border-l-4 hover-lift', config.color, config.bg)}
        hover
      >
        <CardContent className="p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div className={cn('p-3 rounded-xl', risk.color)}>
              <risk.icon className="w-6 h-6" />
            </div>
            <Badge variant={config.variant} dot pulse={risk.level !== 'info'}>
              {risk.count} alerte{risk.count > 1 ? 's' : ''}
            </Badge>
          </div>
          <h3 className="font-semibold text-gray-900 mb-3">{risk.title}</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            {risk.metrics.map((m: string, i: number) => (
              <li key={i} className="flex items-center gap-2 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: risk.color.replace('bg-', '').replace('text-', '').replace('100', '500').replace('600', '500') }} />
                {m}
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" className="mt-4 w-full hover-lift">Voir détails</Button>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

// Alert card with motion
function AlertCard({ alert, index, detailed = false }: { alert: AlertData; index?: number; detailed?: boolean }) {
  const levelConfig = {
    critical: { variant: 'danger' as const, color: 'border-red-500', bg: 'bg-red-50', icon: <AlertTriangle className="w-5 h-5 text-red-600" /> },
    warning: { variant: 'warning' as const, color: 'border-orange-500', bg: 'bg-orange-50', icon: <AlertTriangle className="w-5 h-5 text-orange-600" /> },
    info: { variant: 'info' as const, color: 'border-blue-500', bg: 'bg-blue-50', icon: <Info className="w-5 h-5 text-blue-600" /> },
  }
  const config = levelConfig[alert.level]

  return (
    <RevealOnScroll transition="slide-up" delay={index ? index * 50 : 0}>
      <Card
        variant={detailed ? 'elevated' : 'outlined'}
        className={cn('border-l-4 hover-lift', config.color, detailed ? config.bg : '')}
        hover
      >
        <CardContent className="p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            {config.icon}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                <Badge variant={config.variant} dot={true} pulse={alert.level !== 'info'}>
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
            {detailed && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="hover-lift"><ExternalLink className="w-4 h-4" />Analyser</Button>
                <Button variant="ghost" size="sm" className="hover-lift"><X className="w-4 h-4" />Ignorer</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

// Water metric card
function WaterMetricCard({ item, index }: { item: any; index: number }) {
  return (
    <RevealOnScroll transition="slide-up" delay={index * 80}>
      <Card variant="elevated" className="hover-lift">
        <CardContent className="p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('p-2 rounded-lg', item.color.replace('text-', 'bg-').replace('600', '100'))}>
              <item.icon className={cn('w-5 h-5', item.color)} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900 animate-count-up">{item.value}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 ml-10">{item.ref}</p>
          <Badge variant={item.status === 'good' ? 'success' : 'warning'} className="mt-2 ml-10 animate-slide-up">
            {item.status === 'good' ? 'OK' : 'Surveillance'}
          </Badge>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

// Quick action button
function QuickActionButton({ icon: Icon, iconBg, title, description, to, disabled }: any) {
  return (
    <Link to={to}>
      <Button
        variant="secondary"
        className="w-full justify-start gap-3 hover-lift"
        disabled={disabled}
      >
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </Button>
    </Link>
  )
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
  const [refreshing, setRefreshing] = useState(false)

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

    let isMounted = true

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

        // Fetch recent collections for this farm
        const collections = await api.getRecentCollections(10)

        const latestCollection = collections.find(c => c.farm_id === selectedFarm.id)

        if (!latestCollection) {
          // No collection yet - set empty state
          if (isMounted) {
            const vegetation = await loadNdvi(selectedFarm.centroid.lat, selectedFarm.centroid.lon)
            setMonitoringData({
              ndvi: 0,
              alertsCount: 0,
              waterReserve: 0,
              alerts: [],
              precipitation: [],
              soilMoisture: [],
              et: [],
              riskCategories: [],
              ...vegetation,
            })
            setLoading(false)
          }
          return
        }

        // Check collection status and poll until complete
        let status = await api.getCollectionStatus(latestCollection.id)
        let attempts = 0
        const maxAttempts = 30 // 30 seconds max

        while (status.overall_status === 'started' || status.overall_status === 'processing') {
          if (!isMounted) return
          if (attempts >= maxAttempts) {
            if (isMounted) {
              setError('Data collection is taking longer than expected. Please check back later.')
              setLoading(false)
            }
            return
          }
          // Wait 1 second before polling again
          await new Promise(resolve => setTimeout(resolve, 1000))
          status = await api.getCollectionStatus(latestCollection.id)
          attempts++
        }

        if (!isMounted) return

        // Collection complete - fetch summary
        const summary = await api.getCollectionSummary(latestCollection.id)
        const monitoring = (summary as { monitoring?: MonitoringData }).monitoring || {}
        const vegetation = await loadNdvi(selectedFarm.centroid.lat, selectedFarm.centroid.lon)
        setMonitoringData({ ...monitoring, ...vegetation })
      } catch (err: any) {
        if (!isMounted) return
        console.error('Failed to fetch monitoring data:', err)
        setError('Failed to load monitoring data')
        setMonitoringData(null)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchMonitoringData()

    return () => {
      isMounted = false
    }
  }, [selectedFarm, dateRange])

  const handleRefresh = useCallback(async () => {
    if (!selectedFarm) return
    setRefreshing(true)
    addToast({ type: 'info', title: 'Refreshing', message: 'Starting new data collection...' })
    try {
      const result = await api.post<{ collection_id: string }>('/data/collect', {
        farm_id: selectedFarm.id,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      })

      addToast({ type: 'success', title: 'Collection started', message: `Collection ${result.collection_id.slice(0,8)}... started. Waiting for completion...` })

      // Poll for completion
      let status = await api.getCollectionStatus(result.collection_id)
      let attempts = 0
      const maxAttempts = 60 // 60 seconds max

      while (status.overall_status === 'started' || status.overall_status === 'processing') {
        if (attempts >= maxAttempts) {
          addToast({ type: 'warning', title: 'Collection in progress', message: 'Data collection is taking longer than expected. Check back later.' })
          return
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
        status = await api.getCollectionStatus(result.collection_id)
        attempts++
      }

      // Collection complete - refresh monitoring data
      addToast({ type: 'success', title: 'Collection complete', message: 'Refreshing monitoring data...' })
      const collections = await api.getRecentCollections(10)
      const latestCollection = collections.find(c => c.farm_id === selectedFarm.id)
      if (latestCollection) {
        const summary = await api.getCollectionSummary(latestCollection.id)
        const monitoring = (summary as { monitoring?: MonitoringData }).monitoring || {}
        const vegetation = await loadNdvi(selectedFarm.centroid.lat, selectedFarm.centroid.lon)
        setMonitoringData({ ...monitoring, ...vegetation })
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: 'Data collection or refresh failed. Please try again.' })
    } finally {
      setRefreshing(false)
    }
  }, [selectedFarm, addToast])

  // Loading skeleton
  if (farmsLoading) {
    return <MonitoringSkeleton />
  }

  // Empty state
  if (farms.length === 0) {
    return <EmptyFarmSkeleton />
  }

  const alerts = monitoringData?.alerts || []
  const precipitation = monitoringData?.precipitation || []
  const soilMoisture = monitoringData?.soilMoisture || []
  const et = monitoringData?.et || []
  const riskCategories = monitoringData?.riskCategories || []

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <RevealOnScroll transition="slide-up" delay={50}>
        <PageHero
          kicker="HarvestVision · FarmGuardian · WaterWise"
          title="Surveillance"
          subtitle="Le climat, la végétation et l'eau du champ, lus ensemble."
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={loading || refreshing || !selectedFarm}
                className="hover-lift"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', (loading || refreshing) ? 'animate-spin' : '')} />
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => {}} disabled={!monitoringData} className="hover-lift">
                <Download className="w-4 h-4 mr-2" />
                Exporter alertes
              </Button>
            </>
          }
        />
      </RevealOnScroll>

      {/* Farm Selector & Global Status */}
      <RevealOnScroll transition="slide-up" delay={100}>
        <Card variant="elevated" className="hover-lift">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 sm:w-64 animate-slide-up">
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
              <div className="flex-1 sm:w-48 animate-slide-up" style={{ animationDelay: '50ms' }}>
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
                <div className="flex items-center gap-4 text-sm text-gray-600 animate-fade-in" style={{ animationDelay: '100ms' }}>
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
      </RevealOnScroll>

      {error && (
        <RevealOnScroll transition="shake" delay={150}>
          <Card variant="outlined" className="border-red-200 bg-red-50 animate-shake">
            <CardContent className="p-4 flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto hover-lift">
                <RefreshCw className="w-4 h-4 mr-1" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </RevealOnScroll>
      )}

      {/* Quick Status Cards - using StatCard with animated counters */}
      <RevealOnScroll transition="slide-up" delay={200}>
        <StaggeredContainer staggerDelay={80} startDelay={100} transition="stagger-slide-up">
          <StatCard
            label="Végétation (NDVI)"
            value={monitoringData?.ndvi !== undefined && monitoringData.ndvi > 0 ? monitoringData.ndvi.toFixed(2) : loading ? '...' : '—'}
            trend={monitoringData?.ndvi !== undefined && monitoringData.ndvi > 0 && monitoringData.ndviDelta != null
              ? { value: `${monitoringData.ndviDelta > 0 ? '+' : ''}${monitoringData.ndviDelta.toFixed(2)} vs période MODIS précédente`, positive: monitoringData.ndviDelta >= 0 }
              : { value: 'Indice MODIS non disponible', positive: false }}
            icon={<Leaf className="w-6 h-6 text-green-600" />}
            className="hover-lift"
          />
          <StatCard
            label="Alertes actives"
            value={monitoringData?.alertsCount !== undefined ? monitoringData.alertsCount : alerts.length}
            trend={{ value: `${alerts.filter(a => a.level === 'critical').length} critique, ${alerts.filter(a => a.level === 'warning').length} attention`, positive: alerts.filter(a => a.level === 'critical').length === 0 }}
            icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
            className="hover-lift"
          />
          <StatCard
            label="Réserve hydrique"
            value={monitoringData?.waterReserve !== undefined ? `${Math.round(monitoringData.waterReserve * 100)}%` : loading ? '...' : '—'}
            trend={{ value: monitoringData?.waterReserve !== undefined ? 'Part des 150 mm de pluie récente' : 'Collecte requise', positive: true }}
            icon={<Droplet className="w-6 h-6 text-cyan-600" />}
            className="hover-lift"
          />
        </StaggeredContainer>
      </RevealOnScroll>

      {/* Tabs with animated transitions */}
      <RevealOnScroll transition="slide-up" delay={250}>
        <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full" animated transition="fade">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" icon={<BarChart2 className="w-4 h-4" />}>Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="vegetation" icon={<Sprout className="w-4 h-4" />}>HarvestVision</TabsTrigger>
            <TabsTrigger value="risks" icon={<AlertTriangle className="w-4 h-4" />}>FarmGuardian</TabsTrigger>
            <TabsTrigger value="water" icon={<Droplets className="w-4 h-4" />}>WaterWise</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" transition="fade">
            <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="mt-6 space-y-6">
              {/* Active Alerts & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard
                  title="Alertes actives"
                  subtitle={selectedFarm?.name || 'Sélectionnez une ferme'}
                  className="lg:col-span-2"
                  delay={0}
                >
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 animate-pulse bg-gray-100 rounded" />
                      ))}
                    </div>
                  ) : alerts.length > 0 ? (
                    <div className="space-y-3">
                      {alerts.map((alert, index) => (
                        <AlertCard key={alert.id} alert={alert} index={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 animate-fade-in">
                      <Info className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-float" />
                      <p>Aucune alerte pour cette période</p>
                      <p className="text-sm mt-1">Lancez une collecte de données pour générer des alertes</p>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Actions rapides" delay={100}>
                  <div className="space-y-3">
                    <QuickActionButton
                      icon={Leaf}
                      iconBg="bg-green-100"
                      title="Analyser végétation"
                      description="NDVI, EVI, anomalies"
                      to={`/monitoring/vegetation?farm=${selectedFarm?.id}`}
                      disabled={!selectedFarm}
                    />
                    <QuickActionButton
                      icon={AlertTriangle}
                      iconBg="bg-orange-100"
                      title="Vérifier risques"
                      description="Sécheresse, chaleur, maladies"
                      to={`/monitoring/risks?farm=${selectedFarm?.id}`}
                      disabled={!selectedFarm}
                    />
                    <QuickActionButton
                      icon={Droplet}
                      iconBg="bg-cyan-100"
                      title="Ressources en eau"
                      description="Précipitations, irrigation, ET"
                      to={`/monitoring/water?farm=${selectedFarm?.id}`}
                      disabled={!selectedFarm}
                    />
                    <Link to={`/reports?farm=${selectedFarm?.id}`}>
                      <Button variant="primary" className="w-full justify-start gap-3 hover-lift" disabled={!selectedFarm}>
                        <div className="p-2 rounded-lg bg-blue-100"><FileText className="w-5 h-5 text-blue-600" /></div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">Générer rapport</p>
                          <p className="text-xs text-gray-500">Diagnostic complet</p>
                        </div>
                      </Button>
                    </Link>
                  </div>
                </ChartCard>
              </div>

              {/* Secondary Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard
                  title="Précipitations vs Normale"
                  delay={0}
                >
                  <div className="h-64">
                    {precipitation.length > 0 ? (
                      <AnimatedBarChart
                        data={precipitation.map((p, i) => ({ month: p.month || p.date?.slice(5) || `M${i+1}`, value: p.precipitation || p.value || 0, normal: p.normal || 0 }))}
                        dataKey="value"
                        color="#3b82f6"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-center text-gray-500 text-sm">Aucune donnée - Lancez une collecte</p>
                      </div>
                    )}
                  </div>
                </ChartCard>

                <ChartCard
                  title="Humidité du sol"
                  subtitle="Estimée par bilan hydrique NASA POWER (pluie et évapotranspiration)"
                  delay={100}
                >
                  <div className="h-64">
                    {soilMoisture.length > 0 ? (
                      <AnimatedLineChart
                        data={soilMoisture}
                        lines={[
                          { dataKey: 'surface', stroke: '#f97316', strokeWidth: 2, name: 'Surface', dot: { r: 4, stroke: '#f97316', fill: '#fff' } },
                          { dataKey: 'root', stroke: '#22c55e', strokeWidth: 2, name: 'Zone racinaire', dot: { r: 4, stroke: '#22c55e', fill: '#fff' } },
                          { dataKey: 'normal', stroke: '#9CA3AF', strokeWidth: 2, strokeDasharray: '5 5', name: 'Normale', dot: false },
                        ]}
                        domain={[0, 0.5]}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-center text-gray-500 text-sm">Aucune donnée - Lancez une collecte</p>
                      </div>
                    )}
                  </div>
                </ChartCard>
              </div>
            </StaggeredContainer>
          </TabsContent>

          {/* HarvestVision Tab */}
          <TabsContent value="vegetation" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              <HarvestVision />
            </RevealOnScroll>
          </TabsContent>

          {/* FarmGuardian Tab - Risks */}
          <TabsContent value="risks" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="mt-6 space-y-6">
                <ChartCard
                  title="FarmGuardian - Surveillance des risques"
                  icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                  className="mb-6"
                  delay={0}
                >
                  {/* Risk Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {riskCategories.length > 0 ?
                      riskCategories.map((risk, i) => (
                        <RiskCategoryCard key={risk.type} risk={risk} delay={i * 80} />
                      )) :
                      [
                        { type: 'drought', title: 'Sécheresse', icon: Droplet, color: 'text-amber-600 bg-amber-100', count: 0, level: 'info', metrics: ['Aucune donnée disponible'] },
                        { type: 'heat', title: 'Stress thermique', icon: Sun, color: 'text-red-600 bg-red-100', count: 0, level: 'info', metrics: ['Aucune donnée disponible'] },
                        { type: 'vegetation', title: 'Anomalies vég.', icon: Leaf, color: 'text-green-600 bg-green-100', count: 0, level: 'info', metrics: ['Aucune donnée disponible'] },
                      ].map((risk, i) => (
                        <RiskCategoryCard key={risk.type} risk={risk} delay={i * 80} />
                      ))
                    }
                  </div>
                </ChartCard>

                {/* Detailed Alerts */}
                <ChartCard title={`Détail des alertes - ${selectedFarm?.name || 'Sélectionnez une ferme'}`} delay={100}>
                  <div className="space-y-3">
                    {alerts.length > 0 ?
                      alerts.map((alert, index) => (
                        <AlertCard key={alert.id} alert={alert} index={index} detailed={true} />
                      )) :
                      (
                        <div className="text-center py-8 text-gray-500 animate-fade-in">
                          <Info className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-float" />
                          <p>Aucune alerte pour cette ferme</p>
                          <p className="text-sm mt-1">Lancez une collecte de données pour générer des alertes</p>
                        </div>
                      )
                    }
                  </div>
                </ChartCard>
              </StaggeredContainer>
            </RevealOnScroll>
          </TabsContent>

          {/* WaterWise Tab */}
          <TabsContent value="water" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="mt-6 space-y-6">
                <ChartCard
                  title="WaterWise - Analyse des ressources en eau"
                  icon={<Droplet className="w-5 h-5 text-cyan-600" />}
                  className="mb-6"
                  delay={0}
                >
                  {/* Water Balance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Précipitations (30j)', value: precipitation.length > 0 ? `${precipitation.reduce((a, b) => a + (b.precipitation || 0), 0).toFixed(1)} mm` : 'N/A', ref: 'Normale: ~45 mm', status: 'warning', icon: Cloud, color: 'text-blue-600' },
                      { label: 'Humidité surface', value: soilMoisture.length > 0 ? `${soilMoisture[soilMoisture.length - 1].surface?.toFixed(3) || 'N/A'} m³/m³` : 'N/A', ref: soilMoisture.length > 0 ? `Normale: ${soilMoisture[soilMoisture.length - 1].normal?.toFixed(3) ?? '—'}` : 'Normale: —', status: 'warning', icon: Droplet, color: 'text-amber-600' },
                      { label: 'Humidité racinaire', value: soilMoisture.length > 0 ? `${soilMoisture[soilMoisture.length - 1].root?.toFixed(3) || 'N/A'} m³/m³` : 'N/A', ref: 'Zone 0–1 m, même bilan', status: 'warning', icon: Droplet, color: 'text-amber-600' },
                      { label: 'ET réelle (7j)', value: et.length > 0 ? `${et.slice(-7).reduce((a, b) => a + (b.eta || 0), 0).toFixed(1)} mm` : 'N/A', ref: `ET0: ${et.length > 0 ? et.slice(-7).reduce((a, b) => a + (b.et0 || 0), 0).toFixed(1) : 'N/A'} mm`, status: 'good', icon: Sun, color: 'text-orange-600' },
                    ].map((item, i) => (
                      <WaterMetricCard key={i} item={item} index={i} />
                    ))}
                  </div>
                </ChartCard>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard
                    title="Évapotranspiration (OpenET)"
                    delay={0}
                  >
                    <div className="h-72">
                      {et.length > 0 ? (
                        <AnimatedAreaChart
                          data={et}
                          areas={[
                            { dataKey: 'et0', stroke: '#f97316', gradientId: 'et0Gradient', strokeWidth: 2, name: 'ET0 (Référence)' },
                            { dataKey: 'eta', stroke: '#22c55e', gradientId: 'etaGradient', strokeWidth: 2, name: 'ET réelle' },
                          ]}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-center text-gray-500 text-sm">Aucune donnée - Lancez une collecte</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center animate-fade-in">
                      Kc = ET réelle / ET0 ≈ {et.length > 1 && et[et.length - 1].et0 ? (et[et.length - 1].eta! / et[et.length - 1].et0!).toFixed(2) : 'N/A'}
                    </p>
                  </ChartCard>

                  <ChartCard
                    title="Bilan hydrique estimé"
                    delay={100}
                  >
                    <div className="h-72">
                      {precipitation.length > 0 ? (
                        <AnimatedBarChart
                          data={precipitation.slice(-6).map((p, i) => ({ month: p.month || p.date?.slice(5) || `M${i+1}`, value: p.precipitation || 0, normal: p.normal || 0 }))}
                          dataKey="value"
                          color="#3b82f6"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-center text-gray-500 text-sm">Aucune donnée - Lancez une collecte</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-2 text-sm animate-fade-in">
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
                        <Badge variant="warning" className="animate-pulse-soft">Oui, si moins de 50% réserve</Badge>
                      </div>
                    </div>
                  </ChartCard>
                </div>

                {/* Irrigation Schedule */}
                <ChartCard
                  title="Planification irrigation suggérée"
                  icon={<Calendar className="w-5 h-5 text-blue-600" />}
                  delay={200}
                >
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
                        {alerts.filter(a => a.type === 'water-stress').length > 0 ?
                          alerts.filter(a => a.type === 'water-stress').map((alert, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
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
                          )) :
                          [
                            { date: '2024-02-05', reserve: '48%', threshold: '50%', volume: '25 mm', priority: 'high', notes: 'Avant floraison maïs' },
                            { date: '2024-02-12', reserve: '42%', threshold: '50%', volume: '30 mm', priority: 'high', notes: 'Période critique' },
                            { date: '2024-02-19', reserve: '55%', threshold: '50%', volume: '0 mm', priority: 'low', notes: 'Pluies prévues' },
                            { date: '2024-02-26', reserve: '45%', threshold: '50%', volume: '20 mm', priority: 'medium', notes: 'Surveiller' },
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
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
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center animate-fade-in">
                    Basé sur modèle FAO-56 + données SMAP/OpenET. Validation terrain requise avant irrigation.
                  </p>
                </ChartCard>
              </StaggeredContainer>
            </RevealOnScroll>
          </TabsContent>
        </Tabs>
      </RevealOnScroll>
    </AnimatedPage>
  )
}