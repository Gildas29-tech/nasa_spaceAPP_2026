import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  Leaf,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Sun,
  Cloud,
  Droplet,
  BarChart3,
  AlertTriangle,
  Info,
  MapPin,
  ExternalLink,
  TrendingUp,
  Target,
  Zap,
  Search,
  Layers as LayersIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHero } from '../components/PageHero'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'
import { AnimatedPage } from '../components/PageTransition'
import { Skeleton, CardSkeleton, StatCardSkeleton, ChartSkeleton } from '../components/ui/Skeleton'

interface NDVIDataPoint {
  date: string
  ndvi: number
  evi?: number
}

interface Field {
  id: string
  name: string
  crop: string
  area: string
  location: string
  lastNDVI: number
  lastDate: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
}

const mockFields: Field[] = [
  { id: '1', name: 'North Field 1', crop: 'Corn', area: '45 ha', location: 'Iowa, USA', lastNDVI: 0.82, lastDate: '2024-01-15', status: 'excellent' },
  { id: '2', name: 'South Field 3', crop: 'Soybean', area: '32 ha', location: 'Iowa, USA', lastNDVI: 0.65, lastDate: '2024-01-15', status: 'warning' },
  { id: '3', name: 'East Field 2', crop: 'Wheat', area: '28 ha', location: 'Nebraska, USA', lastNDVI: 0.78, lastDate: '2024-01-14', status: 'good' },
  { id: '4', name: 'West Field 1', crop: 'Corn', area: '52 ha', location: 'Kansas, USA', lastNDVI: 0.72, lastDate: '2024-01-14', status: 'good' },
  { id: '5', name: 'Central Field 4', crop: 'Alfalfa', area: '18 ha', location: 'Iowa, USA', lastNDVI: 0.88, lastDate: '2024-01-15', status: 'excellent' },
]

const mockNDVIHistory: NDVIDataPoint[] = [
  { date: '2023-04-01', ndvi: 0.15 },
  { date: '2023-05-01', ndvi: 0.45 },
  { date: '2023-06-01', ndvi: 0.72 },
  { date: '2023-07-01', ndvi: 0.85 },
  { date: '2023-08-01', ndvi: 0.82 },
  { date: '2023-09-01', ndvi: 0.75 },
  { date: '2023-10-01', ndvi: 0.45 },
  { date: '2023-11-01', ndvi: 0.25 },
  { date: '2023-12-01', ndvi: 0.18 },
  { date: '2024-01-01', ndvi: 0.15 },
]

interface EVIDataPoint {
  date: string
  evi: number
}

const mockEVIHistory: EVIDataPoint[] = [
  { date: '2023-04-01', evi: 0.12 },
  { date: '2023-05-01', evi: 0.38 },
  { date: '2023-06-01', evi: 0.65 },
  { date: '2023-07-01', evi: 0.78 },
  { date: '2023-08-01', evi: 0.75 },
  { date: '2023-09-01', evi: 0.68 },
  { date: '2023-10-01', evi: 0.42 },
  { date: '2023-11-01', evi: 0.22 },
  { date: '2023-12-01', evi: 0.15 },
  { date: '2024-01-01', evi: 0.13 },
]

const getStatusColor = (status: Field['status']) => {
  switch (status) {
    case 'excellent': return 'text-green-600 bg-green-100'
    case 'good': return 'text-blue-600 bg-blue-100'
    case 'warning': return 'text-orange-600 bg-orange-100'
    case 'critical': return 'text-red-600 bg-red-100'
  }
}

const getStatusLabel = (status: Field['status']) => {
  switch (status) {
    case 'excellent': return 'Excellent'
    case 'good': return 'Bon'
    case 'warning': return 'Attention'
    case 'critical': return 'Critique'
  }
}

const ndviColorScale = [
  { min: -1, max: 0, color: '#8B4513', label: 'Sol nu / Eau' },
  { min: 0, max: 0.2, color: '#E8C56D', label: 'Végétation très faible' },
  { min: 0.2, max: 0.4, color: '#A8D08D', label: 'Végétation faible' },
  { min: 0.4, max: 0.6, color: '#5BAA6A', label: 'Végétation modérée' },
  { min: 0.6, max: 0.8, color: '#2E7D32', label: 'Végétation forte' },
  { min: 0.8, max: 1, color: '#1B5E20', label: 'Végétation très forte' },
]

// Animated gauge component
function NDVIGauge({ value, color, size = 180 }: { value: number; color: string; size?: number }) {
  const radius = (size - 30) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (value * circumference)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="animate-gauge-fill"
          style={{ filter: 'dropShadow(0 2px 4px rgba(0,0,0,0.1))', transition: 'stroke-dashoffset 1.5s ease-out-cubic' }}
        />
        {/* Center value */}
        <text
          x={size / 2}
          y={size / 2 + 10}
          textAnchor="middle"
          fontSize={size * 0.2}
          fontWeight="bold"
          fill="#1F2937"
          fontFamily="system-ui"
          className="animate-count-up"
        >
          {value.toFixed(2)}
        </text>
      </svg>
      {/* Scale markers */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((val, i) => (
        <div
          key={i}
          className="absolute text-xs text-gray-400"
          style={{
            left: `${size / 2 + (radius + 10) * Math.cos(Math.PI - Math.PI * val) - 10}px`,
            top: `${size / 2 - (radius + 10) * Math.sin(Math.PI - Math.PI * val) - 8}px`,
            animationDelay: `${i * 50}ms`,
          }}
        >
          {val.toFixed(1)}
        </div>
      ))}
    </div>
  )
}

// Animated chart with Recharts
const AnimatedAreaChart = ({ data, indexType, ...props }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <defs>
        <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="eviGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(0, 7)} />
      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
      <Tooltip
        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        labelFormatter={(v) => v}
        formatter={(value: number, name: string) => [value.toFixed(3), name === 'ndvi' ? 'NDVI' : 'EVI']}
        animationDuration={300}
      />
      {(indexType === 'ndvi' || indexType === 'both') && (
        <Area
          type="monotone"
          dataKey="ndvi"
          stroke="#22c55e"
          fill="url(#ndviGradient)"
          strokeWidth={2}
          name="NDVI"
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
          animationBegin={0}
        />
      )}
      {(indexType === 'evi' || indexType === 'both') && (
        <Area
          type="monotone"
          dataKey="evi"
          stroke="#3b82f6"
          fill="url(#eviGradient)"
          strokeWidth={2}
          name="EVI"
          isAnimationActive={true}
          animationDuration={1200}
          animationEasing="ease-out"
          animationBegin={200}
        />
      )}
    </AreaChart>
  </ResponsiveContainer>
)

const AnimatedBarChart = ({ data, ...props }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 1]} />
      <Tooltip
        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        formatter={(value: number) => [value.toFixed(2), 'NDVI']}
        animationDuration={300}
      />
      <Line
        type="monotone"
        dataKey="ndvi"
        stroke="#22c55e"
        strokeWidth={3}
        dot={{ fill: '#22c55e', strokeWidth: 2, r: 6 }}
        activeDot={{ r: 8, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
        isAnimationActive={true}
        animationDuration={1000}
        animationEasing="ease-out"
      />
    </BarChart>
  </ResponsiveContainer>
)

const AnimatedLineChart = ({ data, ...props }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(0, 7)} />
      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
      <Tooltip
        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        animationDuration={300}
      />
      <Line
        type="monotone"
        dataKey="ndvi"
        stroke="#f97316"
        strokeWidth={2}
        name="NDVI Anomaly"
        dot={{ r: 4, stroke: '#f97316', fill: '#fff' }}
        strokeDasharray="5 5"
        isAnimationActive={true}
        animationDuration={1000}
        animationEasing="ease-out"
      />
    </LineChart>
  </ResponsiveContainer>
)

// Loading skeleton
function HarvestVisionSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="HarvestVision" title="Végétation" subtitle="NDVI et EVI lus sur le champ." />
        <CardSkeleton className="animate-fade-in" style={{ animationDelay: '100ms' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton className="animate-fade-in" style={{ animationDelay: '300ms' }} />
      </div>
    </AnimatedPage>
  )
}

function ChartCard({ title, subtitle, icon, children, className, delay = 0, ...props }: any) {
  return (
    <Card variant="elevated" className={cn('hover-lift animate-fade-in', className)} {...props} style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon && <span className="p-1.5 rounded-lg bg-primary-100 text-primary-600">{icon}</span>}
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
  )
}

function StatusCard({ icon: Icon, iconBg, label, value, delay = 0 }: any) {
  return (
    <div className="p-4 rounded-lg animate-fade-in" style={{ backgroundColor: iconBg + '50', borderColor: iconBg + '100', borderWidth: '1px', animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 animate-count-up">{value}</p>
        </div>
        <div className={cn('p-2 rounded-lg', iconBg + '100')}>
          <Icon className={cn('w-8 h-8', iconBg.replace('bg-', 'text-').replace('100', '500'))} />
        </div>
      </div>
    </div>
  )
}

function AnomalyCard({ anomaly, delay = 0 }: { anomaly: any; delay?: number }) {
  return (
    <Card variant="outlined" className={cn('hover-lift border-l-4 animate-fade-in', anomaly.borderColor)} style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="flex items-start gap-4">
          <div className={cn('p-2 rounded-lg', anomaly.iconBg)}>
            <anomaly.icon className={cn('w-6 h-6', anomaly.iconColor)} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{anomaly.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {anomaly.badges.map((badge: any, i: number) => (
                <Badge key={i} variant={badge.variant} className="animate-scale-in" style={{ animationDelay: `${i * 100}ms` }}>
                  {badge.label}
                </Badge>
              ))}
              {anomaly.action && (
                <Button variant="ghost" size="sm" className="hover-lift">{anomaly.action}</Button>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-500 flex-shrink-0">{anomaly.time}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function HarvestVision() {
  const [selectedField, setSelectedField] = useState<Field>(mockFields[0])
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('last-year')
  const [indexType, setIndexType] = useState<'ndvi' | 'evi' | 'both'>('ndvi')
  const [showLegend, setShowLegend] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const getNDVIColor = (value: number) => {
    for (const scale of ndviColorScale) {
      if (value >= scale.min && value <= scale.max) return scale.color
    }
    return '#8B4513'
  }

  const currentNDVI = selectedField.lastNDVI
  const ndviColor = getNDVIColor(currentNDVI)

  // Simulate loading on field change
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [selectedField])

  if (isLoading) {
    return <HarvestVisionSkeleton />
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <PageHero
        kicker="HarvestVision"
        title="Végétation"
        subtitle="Données de démonstration NDVI/EVI ; ces valeurs simulées ne représentent pas une mesure réelle de parcelle."
      />

      {/* Field Selector & Controls */}
      <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 sm:w-64 animate-slide-up">
              <Select
                label="Exploitation"
                placeholder="Sélectionner une exploitation"
                value={selectedField.id}
                onChange={(e) => {
                  const field = mockFields.find(f => f.id === e.target.value)
                  if (field) setSelectedField(field)
                }}
                options={mockFields.map(f => ({ value: f.id, label: `${f.name} (${f.crop}, ${f.area})` }))}
              />
            </div>
            <div className="flex-1 sm:w-48 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <Select
                label="Période"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={[
                  { value: 'last-month', label: 'Dernier mois' },
                  { value: 'last-quarter', label: 'Dernier trimestre' },
                  { value: 'last-year', label: 'Dernière année' },
                  { value: 'custom', label: 'Personnalisé' },
                ]}
              />
            </div>
            <div className="flex-1 sm:w-48 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <Select
                label="Indice"
                value={indexType}
                onChange={(e) => setIndexType(e.target.value as 'ndvi' | 'evi' | 'both')}
                options={[
                  { value: 'ndvi', label: 'NDVI' },
                  { value: 'evi', label: 'EVI' },
                  { value: 'both', label: 'NDVI + EVI' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Légende NDVI
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs with animated transitions */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full" animated transition="slide">
        <TabsList className="grid w-full grid-cols-4 animate-fade-in">
          <TabsTrigger value="overview" icon={<BarChart3 className="w-4 h-4" />}>Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="timeseries" icon={<LayersIcon className="w-4 h-4" />}>Séries temporelles</TabsTrigger>
          <TabsTrigger value="anomalies" icon={<AlertTriangle className="w-4 h-4" />}>Anomalies</TabsTrigger>
          <TabsTrigger value="comparison" icon={<Target className="w-4 h-4" />}>Comparaison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" transition="slide">
          <div className="mt-6 space-y-6 animate-stagger-slide-up">
            {/* Current NDVI Card */}
            <ChartCard
              title="Indice de Végétation Actuel"
              subtitle={selectedField.name}
              icon={<Leaf className="w-5 h-5" />}
              className="lg:col-span-2"
              delay={0}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* NDVI Gauge */}
                <div className="md:col-span-2">
                  <div className="relative h-64 flex items-center justify-center animate-fade-in">
                    <NDVIGauge value={currentNDVI} color={ndviColor} size={280} />
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-sm animate-slide-up">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ndviColor }} />
                      <span>Actuel: {currentNDVI.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-gray-300" />
                      <span>Seuil alerte: 0.40</span>
                    </div>
                  </div>
                </div>

                {/* Status Info */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gray-50 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Statut végétatif</span>
                      <Badge
                        variant={selectedField.status === 'excellent' ? 'success' : selectedField.status === 'good' ? 'info' : selectedField.status === 'warning' ? 'warning' : 'danger'}
                        dot
                        pulse={selectedField.status === 'warning' || selectedField.status === 'critical'}
                      >
                        {getStatusLabel(selectedField.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 animate-fade-in" style={{ animationDelay: '100ms' }}>
                      {selectedField.status === 'excellent' && 'Végétation dense et saine. Conditions optimales pour la croissance.'}
                      {selectedField.status === 'good' && 'Bonne couverture végétale. Surveillance recommandée.'}
                      {selectedField.status === 'warning' && 'Couvert végétal réduit. Stress possible (hydrique, nutritif, maladie).'}
                      {selectedField.status === 'critical' && 'Végétation très dégradée. Intervention urgente recommandée.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gray-50 animate-slide-up" style={{ animationDelay: '150ms' }}>
                      <p className="text-sm text-gray-500">Culture</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedField.crop}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 animate-slide-up" style={{ animationDelay: '200ms' }}>
                      <p className="text-sm text-gray-500">Surface</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedField.area}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 animate-slide-up" style={{ animationDelay: '250ms' }}>
                      <p className="text-sm text-gray-500">Localisation</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedField.location}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-50 animate-slide-up" style={{ animationDelay: '300ms' }}>
                      <p className="text-sm text-gray-500">Dernière observation</p>
                      <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                        <Calendar className="w-4 h-4 inline" />
                        {selectedField.lastDate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* NDVI Legend */}
              {showLegend && (
                <div className="mt-6 p-4 rounded-lg bg-gray-50 animate-fade-in" style={{ animationDelay: '400ms' }}>
                  <h4 className="font-medium text-gray-900 mb-3">Échelle NDVI</h4>
                  <div className="flex flex-wrap gap-4">
                    {ndviColorScale.map((scale, i) => (
                      <div key={scale.min} className="flex items-center gap-2 animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-8 h-4 rounded" style={{ backgroundColor: scale.color }} />
                        <span className="text-sm text-gray-600">{scale.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>

            {/* Quick Stats */}
            <ChartCard
              title="Statistiques rapides"
              icon={<BarChart3 className="w-5 h-5" />}
              delay={100}
            >
              <div className="space-y-4">
                <StatusCard
                  icon={Leaf}
                  iconBg="bg-green-500"
                  label="Exploitations excellentes"
                  value={mockFields.filter(f => f.status === 'excellent').length}
                  delay={0}
                />
                <StatusCard
                  icon={Leaf}
                  iconBg="bg-blue-500"
                  label="Exploitations bonnes"
                  value={mockFields.filter(f => f.status === 'good').length}
                  delay={80}
                />
                <StatusCard
                  icon={AlertTriangle}
                  iconBg="bg-orange-500"
                  label="Exploitations en attention"
                  value={mockFields.filter(f => f.status === 'warning').length}
                  delay={160}
                />
                <StatusCard
                  icon={AlertTriangle}
                  iconBg="bg-red-500"
                  label="Exploitations critiques"
                  value={mockFields.filter(f => f.status === 'critical').length}
                  delay={240}
                />
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* Time Series Tab */}
        <TabsContent value="timeseries" transition="slide">
          <div className="mt-6 space-y-6 animate-stagger-slide-up">
            <ChartCard
              title="Évolution temporelle des indices de végétation"
              icon={<LayersIcon className="w-5 h-5" />}
              delay={0}
            >
              <div className="h-96">
                <AnimatedAreaChart
                  data={indexType === 'both' ? mockNDVIHistory.map((d, i) => ({ ...d, evi: mockEVIHistory[i].evi! })) : mockNDVIHistory}
                  indexType={indexType}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 animate-fade-in">
                {indexType !== 'evi' && (
                  <div className="flex items-center gap-2 animate-slide-up">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>NDVI - Indice de végétation par différence normalisée</span>
                  </div>
                )}
                {indexType !== 'ndvi' && (
                  <div className="flex items-center gap-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>EVI - Indice de végétation amélioré (moins sensible à l'atmosphère)</span>
                  </div>
                )}
              </div>
            </ChartCard>

            {/* Monthly Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-stagger-slide-up">
              {[
                { label: 'NDVI Max', value: '0.85', month: 'Juillet', icon: Sun, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
                { label: 'NDVI Min', value: '0.15', month: 'Janvier', icon: Cloud, color: 'text-gray-600', bgColor: 'bg-gray-100' },
                { label: 'Amplitude', value: '0.70', month: 'Annuelle', icon: BarChart3, color: 'text-blue-600', bgColor: 'bg-blue-100' },
                { label: 'Pente croissance', value: '+0.07/mois', month: 'Avril-Juin', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100' },
              ].map((stat, i) => (
                <Card key={i} variant="elevated" className="hover-lift text-center animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <CardContent className="p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
                    <div className={cn('p-2 rounded-xl mx-auto mb-3 w-14 h-14', stat.bgColor)}>
                      <stat.icon className={cn('w-8 h-8', stat.color)} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 animate-count-up">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-xs text-gray-400">{stat.month}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" transition="slide">
          <div className="mt-6 space-y-6 animate-stagger-slide-up">
            <ChartCard
              title="Détection d'anomalies végétatives"
              icon={<AlertTriangle className="w-5 h-5" />}
              delay={0}
            >
              <div className="space-y-4">
                <AnomalyCard
                  anomaly={{
                    title: 'Baisse anormale du NDVI détectée',
                    description: 'Le NDVI a chuté de 0.82 à 0.65 en 2 semaines sur South Field 3 (Soybean). Cette baisse de 21% dépasse le seuil de variation normale (±10%).',
                    icon: AlertTriangle,
                    iconColor: 'text-orange-600',
                    iconBg: 'bg-orange-100',
                    borderColor: 'border-orange-400',
                    badges: [
                      { variant: 'warning', label: 'Attention' },
                      { variant: 'info', label: 'Hydrique probable' },
                    ],
                    action: 'Analyser',
                    time: '3 jours ago'
                  }}
                  delay={0}
                />
                <AnomalyCard
                  anomaly={{
                    title: 'Démarrage précoce de saison',
                    description: 'Le NDVI a atteint 0.45 au 1er mai sur North Field 1, soit 2 semaines avant la moyenne historique (0.35). Indicateur de conditions printanières favorables.',
                    icon: Info,
                    iconColor: 'text-blue-600',
                    iconBg: 'bg-blue-100',
                    borderColor: 'border-blue-400',
                    badges: [
                      { variant: 'info', label: 'Favorable' },
                      { variant: 'success', label: 'Croissance avancée' },
                    ],
                    action: null,
                    time: '1 semaine ago'
                  }}
                  delay={100}
                />
                <AnomalyCard
                  anomaly={{
                    title: 'Hétérogénéité intra-parcellaire',
                    description: 'Variabilité du NDVI de 0.15 observée dans East Field 2 (coefficient de variation 18%). Zones potentiellement touchées par compaction ou drainage insuffisant.',
                    icon: MapPin,
                    iconColor: 'text-gray-600',
                    iconBg: 'bg-gray-100',
                    borderColor: 'border-gray-400',
                    badges: [
                      { variant: 'default', label: 'Investigation' },
                    ],
                    action: 'Voir carte',
                    time: '5 jours ago'
                  }}
                  delay={200}
                />
              </div>
            </ChartCard>

            {/* Anomaly Detection Info */}
            <ChartCard
              title="Méthodologie de détection"
              icon={<Info className="w-5 h-5" />}
              delay={100}
            >
              <div className="space-y-3 text-sm text-gray-600 animate-fade-in">
                <p>Les anomalies sont détectées par comparaison aux :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Moyennes historiques sur 5-10 ans (climatologie)</li>
                  <li>Seuils de variation intra-saisonnière normaux (±10-15%)</li>
                  <li>Modèles de phénologie spécifiques aux cultures</li>
                  <li>Indices complémentaires (EVI, SAVI) pour confirmation</li>
                </ul>
                <p className="text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Une variation du NDVI ne doit pas être automatiquement interprétée comme une maladie ou une carence.
                  Elle constitue un signal nécessitant une interprétation agronomique complémentaire (sol, météo, pratiques).
                </p>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" transition="slide">
          <div className="mt-6 space-y-6 animate-stagger-slide-up">
            <ChartCard
              title="Comparaison inter-parcellaire"
              icon={<Target className="w-5 h-5" />}
              delay={0}
            >
              <div className="h-96 mb-6">
                <AnimatedBarChart
                  data={mockFields.map(f => ({ name: f.name, ndvi: f.lastNDVI }))}
                />
              </div>
              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Exploitation</th>
                      <th className="pb-2 font-medium">Culture</th>
                      <th className="pb-2 font-medium">Surface</th>
                      <th className="pb-2 font-medium">NDVI Actuel</th>
                      <th className="pb-2 font-medium">Évolution (30j)</th>
                      <th className="pb-2 font-medium">vs Moyenne</th>
                      <th className="pb-2 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockFields.map((field, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <td className="py-3 font-medium">{field.name}</td>
                        <td className="py-3">{field.crop}</td>
                        <td className="py-3">{field.area}</td>
                        <td className="py-3 font-semibold text-gray-900">{field.lastNDVI.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={cn('font-medium', field.lastNDVI > 0.75 ? 'text-green-600' : field.lastNDVI > 0.5 ? 'text-orange-600' : 'text-red-600')}>
                            {field.lastNDVI > 0.75 ? '+' : field.lastNDVI > 0.5 ? '±' : '-'}${(Math.random() * 0.1).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={cn('font-medium', field.lastNDVI > 0.7 ? 'text-green-600' : field.lastNDVI > 0.5 ? 'text-orange-600' : 'text-red-600')}>
                            {field.lastNDVI > 0.7 ? '+' : field.lastNDVI > 0.5 ? '±' : '-'}${(Math.random() * 0.15).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant={
                            field.status === 'excellent' ? 'success' :
                            field.status === 'good' ? 'info' :
                            field.status === 'warning' ? 'warning' : 'danger'
                          } dot>
                            {getStatusLabel(field.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  )
}