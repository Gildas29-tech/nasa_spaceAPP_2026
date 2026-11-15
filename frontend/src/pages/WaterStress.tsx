import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  Droplet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Thermometer,
  Sun,
  Cloud,
  Wind,
  MapPin,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Home,
  Settings,
  Shield,
  Bell,
  Waves,
  Gauge,
  BarChart3,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHero } from '../components/PageHero'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { api } from '../lib/api'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { AnimatedPage, RevealOnScroll, StaggeredContainer } from '../components/PageTransition'
import { Skeleton, CardSkeleton, StatCardSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui/Skeleton'

interface WaterStressAlert {
  id: string
  farm_id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'water_stress' | 'drought_risk' | 'irrigation_needed' | 'heat_stress'
  message: string
  detected_at: string
  et_value: number
  et_threshold: number
  lst_value: number
  soil_moisture: number
  precipitation_forecast: number
  recommendations: string[]
  location: { lat: number; lon: number }
  field_name: string
}

interface IrrigationEvent {
  date: string
  amount_mm: number
  method: 'drip' | 'sprinkler' | 'flood' | 'pivot'
  source: 'groundwater' | 'surface' | 'municipal' | 'recycled'
  cost: number
  efficiency: number
}

interface WaterStressResult {
  alerts: WaterStressAlert[]
  irrigation_schedule: IrrigationEvent[]
  water_balance: {
    current_et: number
    potential_et: number
    soil_moisture: number
    field_capacity: number
    wilting_point: number
    available_water: number
    days_to_stress: number
  }
  et_data: Array<{ date: string; et_actual: number; et_potential: number; stress_index: number }>
  lst_data: Array<{ date: string; lst_min: number; lst_max: number; lst_mean: number }>
  precipitation: Array<{ date: string; amount: number }>
  model_performance: {
    et_accuracy: number
    stress_detection_f1: number
  }
}

const severityColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
}

const severityIcons = {
  low: CheckCircle,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: XCircle,
}

const typeLabels = {
  water_stress: 'Stress Hydrique',
  drought_risk: 'Risque de Sécheresse',
  irrigation_needed: 'Irrigation Requise',
  heat_stress: 'Stress Thermique',
}

const typeIcons = {
  water_stress: Droplet,
  drought_risk: Sun,
  irrigation_needed: Waves,
  heat_stress: Thermometer,
}

// Loading skeleton
function WaterStressSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="WaterWise" title="Stress hydrique" subtitle="L'eau du champ, l'alerte, et le moment d'irriguer." />

        <RevealOnScroll transition="slide-up" delay={100}>
          <CardSkeleton className="animate-stagger-slide-up" />
        </RevealOnScroll>

        <RevealOnScroll transition="slide-up" delay={200}>
          <StaggeredContainer staggerDelay={80} transition="stagger-slide-up">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </StaggeredContainer>
        </RevealOnScroll>
      </div>
    </AnimatedPage>
  )
}

function ChartCard({ title, subtitle, icon, children, className, delay = 0, ...props }: any) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay} key={title}>
      <Card variant="elevated" className={cn('hover-lift', className)} {...props}>
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
    </RevealOnScroll>
  )
}

function StatMetricCard({ icon: Icon, iconBg, label, value, delay = 0 }: any) {
  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <Card variant="elevated" className="hover-lift">
        <CardContent className="p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-xl', iconBg + '100')}>
              <Icon className={cn('w-6 h-6', iconBg)} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900 animate-count-up">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function AlertCard({ alert, index }: { alert: WaterStressAlert; index: number }) {
  const getSeverityColor = (severity: string) => severityColors[severity as keyof typeof severityColors]
  const getSeverityIcon = (severity: string) => severityIcons[severity as keyof typeof severityIcons]
  const severityColor = getSeverityColor(alert.severity)
  const Icon = getSeverityIcon(alert.severity)

  return (
    <RevealOnScroll transition="slide-up" delay={index * 60}>
      <Card
        variant="elevated"
        className={cn('border-l-4 hover-lift', severityColor.replace('bg-', 'border-l-').replace('text-', ''))}
        hover
      >
        <CardContent className="p-4 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-xl', severityColor.replace('text-', 'bg-').replace('border-', ''))}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{typeLabels[alert.type as keyof typeof typeLabels]}</h4>
                  <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'} size="sm" dot>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-sm text-gray-500">{new Date(alert.detected_at).toLocaleString()}</span>
              </div>
              <p className="text-gray-600 mt-1">{alert.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="flex items-center gap-1 text-gray-500"><MapPin className="w-3 h-3" />{alert.field_name}</span>
                <span className="flex items-center gap-1 text-gray-500"><Droplet className="w-3 h-3" />ET: {alert.et_value.toFixed(1)} mm (seuil: {alert.et_threshold.toFixed(1)})</span>
                <span className="flex items-center gap-1 text-gray-500"><Thermometer className="w-3 h-3" />LST: {alert.lst_value.toFixed(1)}°C</span>
                <span className="flex items-center gap-1 text-gray-500"><Waves className="w-3 h-3" />Sol: {alert.soil_moisture.toFixed(1)}%</span>
                <span className="flex items-center gap-1 text-gray-500"><Cloud className="w-3 h-3" />Précip: {alert.precipitation_forecast.toFixed(1)} mm</span>
              </div>
              {alert.recommendations.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 animate-slide-up">
                  <p className="text-sm font-medium text-gray-900 mb-2">Recommandations:</p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {alert.recommendations.map((rec, j) => (
                      <li key={j} className="flex items-center gap-2 animate-scale-in" style={{ animationDelay: `${j * 80}ms` }}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function IrrigationEventCard({ event, index }: { event: IrrigationEvent; index: number }) {
  return (
    <RevealOnScroll transition="slide-up" delay={index * 60}>
      <Card variant="elevated" className="hover-lift">
        <CardContent className="p-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="p-3 rounded-xl bg-blue-100">
                <Waves className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{new Date(event.date).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">Irrigation Programmée</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Quantité</p>
              <p className="font-semibold text-gray-900">{event.amount_mm} mm</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Méthode</p>
              <p className="font-medium text-gray-900 capitalize">{event.method}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Source</p>
              <p className="font-medium text-gray-900 capitalize">{event.source}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Efficacité</p>
              <p className="font-semibold text-gray-900">{Math.round(event.efficiency * 100)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Coût</p>
              <p className="font-semibold text-gray-900">${event.cost.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function ModelPerformanceCard({ label, value, desc, icon, delay = 0 }: { label: string; value: string; desc: string; icon: any; delay?: number }) {
  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <Card variant="elevated" className="hover-lift">
        <CardContent className="p-4 animate-fade-in">
          <div className="p-2 rounded-xl bg-primary-100 text-primary-600 w-12 h-12 flex items-center justify-center mb-3 animate-scale-in">
            {icon}
          </div>
          <p className="text-2xl font-bold text-primary-600 animate-count-up">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
          <p className="text-xs text-gray-400 mt-1">{desc}</p>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

export default function WaterStress({ farmId }: { farmId?: string }) {
  const { farms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [formData, setFormData] = useState({
    bbox: [-122.5, 37.5, -121.5, 38.5],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    cropType: 'corn',
    soilTexture: 'loam',
    irrigationMethod: 'drip',
  })
  const [results, setResults] = useState<WaterStressResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('alerts')
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)

  // Set selected farm when farms change or farmId prop is provided
  useEffect(() => {
    if (farmId) {
      const farm = farms.find(f => f.id === farmId)
      if (farm) {
        setSelectedFarm(farm)
        selectFarm(farm.id)
      }
    } else if (farms.length > 0) {
      const farm = farms.find(f => f.id === selectedFarmId) || farms[0]
      setSelectedFarm(farm)
      selectFarm(farm.id)
    } else {
      setSelectedFarm(null)
      selectFarm(null)
    }
  }, [farms, selectedFarmId, selectFarm, farmId])

  const handleAnalyze = async () => {
    if (!selectedFarm) {
      addToast({ type: 'warning', title: 'Aucune ferme sélectionnée', message: 'Veuillez sélectionner une ferme' })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.post<WaterStressResult>('/analysis/water-stress', {
        farm_id: selectedFarm.id,
        bbox: formData.bbox,
        start_date: formData.startDate,
        end_date: formData.endDate,
        crop_type: formData.cropType,
        soil_texture: formData.soilTexture,
        irrigation_method: formData.irrigationMethod,
      })
      setResults(data)
      setShowResults(true)
      setActiveTab('alerts')
      addToast({ type: 'success', title: 'Analyse terminée', message: 'Analyse de stress hydrique générée' })
    } catch (err: any) {
      console.error('Water stress analysis failed:', err)
      setError('Échec de la génération de l\'analyse de stress hydrique')
      addToast({ type: 'error', title: 'Analyse échouée', message: 'Veuillez réessayer' })
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => severityColors[severity as keyof typeof severityColors]
  const getSeverityIcon = (severity: string) => severityIcons[severity as keyof typeof severityIcons]

  const filteredAlerts = results?.alerts?.filter(a =>
    severityFilter.length === 0 || severityFilter.includes(a.severity)
  ) || []

  const waterBalance = results?.water_balance

  if (loading && !results) {
    return <WaterStressSkeleton />
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <RevealOnScroll transition="slide-up" delay={50}>
        <PageHero
          kicker="WaterWise"
          title="Stress hydrique"
          subtitle="L'eau du champ, l'alerte, et le moment d'irriguer."
          actions={
            <Button
              onClick={handleAnalyze}
              loading={loading}
              disabled={!selectedFarm || loading}
              className="hover-lift"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Lancer l'analyse
            </Button>
          }
        />
      </RevealOnScroll>

      {/* Configuration */}
      <RevealOnScroll transition="slide-up" delay={100}>
        <Card variant="elevated" className="border-l-4 border-l-blue-500 hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Configuration de l'Analyse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFarm && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in">
                <p className="text-sm font-medium text-blue-800">Analyse pour : {selectedFarm.name}</p>
                <p className="text-xs text-blue-700">La localisation sera auto-remplie depuis la géométrie de la ferme</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <Input
                label="Longitude Ouest"
                type="number"
                step="0.001"
                value={formData.bbox[0]}
                onChange={(e) => setFormData({...formData, bbox: [parseFloat(e.target.value), formData.bbox[1], formData.bbox[2], formData.bbox[3]]})}
                placeholder="-122.5"
              />
              <Input
                label="Latitude Sud"
                type="number"
                step="0.001"
                value={formData.bbox[1]}
                onChange={(e) => setFormData({...formData, bbox: [formData.bbox[0], parseFloat(e.target.value), formData.bbox[2], formData.bbox[3]]})}
                placeholder="37.5"
              />
              <Input
                label="Longitude Est"
                type="number"
                step="0.001"
                value={formData.bbox[2]}
                onChange={(e) => setFormData({...formData, bbox: [formData.bbox[0], formData.bbox[1], parseFloat(e.target.value), formData.bbox[3]]})}
                placeholder="-121.5"
              />
              <Input
                label="Latitude Nord"
                type="number"
                step="0.001"
                value={formData.bbox[3]}
                onChange={(e) => setFormData({...formData, bbox: [formData.bbox[0], formData.bbox[1], formData.bbox[2], parseFloat(e.target.value)]})}
                placeholder="38.5"
              />
              <Select
                label="Type de Culture"
                value={formData.cropType}
                onChange={(e) => setFormData({...formData, cropType: e.target.value})}
                options={[
                  { value: 'corn', label: 'Maïs' },
                  { value: 'soybean', label: 'Soja' },
                  { value: 'wheat', label: 'Blé' },
                  { value: 'sorghum', label: 'Sorgho' },
                  { value: 'alfalfa', label: 'Luzerne' },
                  { value: 'cotton', label: 'Coton' },
                  { value: 'rice', label: 'Riz' },
                  { value: 'vegetables', label: 'Légumes' },
                ]}
              />
              <Select
                label="Texture du Sol"
                value={formData.soilTexture}
                onChange={(e) => setFormData({...formData, soilTexture: e.target.value})}
                options={[
                  { value: 'sand', label: 'Sable' },
                  { value: 'loam', label: 'Limon' },
                  { value: 'clay', label: 'Argile' },
                  { value: 'silt', label: 'Silt' },
                  { value: 'sandy_loam', label: 'Limon Sableux' },
                  { value: 'clay_loam', label: 'Limon Argileux' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Input
                label="Date de début"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
              <Input
                label="Date de fin"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
              <Select
                label="Méthode d'Irrigation"
                value={formData.irrigationMethod}
                onChange={(e) => setFormData({...formData, irrigationMethod: e.target.value})}
                options={[
                  { value: 'drip', label: 'Goutte à goutte' },
                  { value: 'sprinkler', label: 'Aspersion' },
                  { value: 'pivot', label: 'Pivot Central' },
                  { value: 'flood', label: 'Gravitaire' },
                ]}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAnalyze} loading={loading} className="flex-1 hover-lift" disabled={!selectedFarm || loading}>
                <Zap className="w-4 h-4 mr-2" />
                Analyser le Stress Hydrique
              </Button>
              <Button variant="secondary" className="hover-lift">Sauvegarder la Config</Button>
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
              <Button variant="ghost" size="sm" onClick={handleAnalyze} className="ml-auto hover-lift">
                <RefreshCw className="w-4 h-4 mr-1" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </RevealOnScroll>
      )}

      {/* Quick Stats */}
      {results && waterBalance && (
        <RevealOnScroll transition="slide-up" delay={showResults ? 200 : 1000}>
          <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatMetricCard icon={Droplet} iconBg="bg-blue-600" label="ET Actuelle" value={`${waterBalance.current_et.toFixed(1)} mm/jour`} delay={0} />
            <StatMetricCard icon={Sun} iconBg="bg-green-600" label="ET Potentielle" value={`${waterBalance.potential_et.toFixed(1)} mm/jour`} delay={80} />
            <StatMetricCard icon={Waves} iconBg="bg-amber-600" label="Humidité Sol" value={`${waterBalance.soil_moisture.toFixed(1)}%`} delay={160} />
            <StatMetricCard icon={Droplet} iconBg="bg-blue-600" label="Eau Disponible" value={`${waterBalance.available_water.toFixed(1)} mm`} delay={240} />
            <StatMetricCard icon={AlertTriangle} iconBg="bg-red-600" label="Jours avant Stress" value={waterBalance.days_to_stress} delay={320} />
            <StatMetricCard icon={ShieldCheck} iconBg="bg-purple-600" label="Alertes Actives" value={filteredAlerts.length} delay={400} />
          </StaggeredContainer>
        </RevealOnScroll>
      )}

      {/* Tabs */}
      <RevealOnScroll transition="slide-up" delay={showResults ? 250 : 1100}>
        <Tabs defaultValue="alerts" onChange={setActiveTab} className="w-full" animated transition="fade">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alerts" icon={<AlertTriangle className="w-4 h-4" />}>Alertes</TabsTrigger>
            <TabsTrigger value="irrigation" icon={<CalendarDays className="w-4 h-4" />}>Irrigation</TabsTrigger>
            <TabsTrigger value="et_data" icon={<BarChart3 className="w-4 h-4" />}>Analyse ET</TabsTrigger>
            <TabsTrigger value="water_balance" icon={<Gauge className="w-4 h-4" />}>Bilan Hydrique</TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4 animate-fade-in">
                  <h3 className="text-lg font-semibold">Alertes de Stress Hydrique</h3>
                  <div className="flex gap-2">
                    {['critical', 'high', 'medium', 'low'].map((s) => (
                      <label key={s} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={severityFilter.includes(s)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSeverityFilter([...severityFilter, s])
                            } else {
                              setSeverityFilter(severityFilter.filter(x => x !== s))
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={`text-xs font-medium capitalize ${getSeverityColor(s).split(' ')[0]}`}>
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {filteredAlerts.length > 0 ? (
                  <StaggeredContainer staggerDelay={60} transition="stagger-slide-up" className="space-y-3">
                    {filteredAlerts.map((alert, i) => (
                      <AlertCard key={i} alert={alert} index={i} />
                    ))}
                  </StaggeredContainer>
                ) : (
                  <Card variant="elevated" className="hover-lift">
                    <CardContent className="p-12 text-center animate-fade-in">
                      <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4 animate-float" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune Alerte Active</h3>
                      <p className="text-gray-500">Aucune alerte de stress hydrique détectée pour les filtres sélectionnés</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </RevealOnScroll>
          </TabsContent>

          {/* Irrigation Schedule Tab */}
          <TabsContent value="irrigation" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              <div className="mt-4 animate-fade-in">
                <h3 className="text-lg font-semibold mb-4">Programme d'Irrigation</h3>
                {results?.irrigation_schedule && results.irrigation_schedule.length > 0 ? (
                  <StaggeredContainer staggerDelay={60} transition="stagger-slide-up" className="space-y-3">
                    {results.irrigation_schedule.map((event, i) => (
                      <IrrigationEventCard key={i} event={event} index={i} />
                    ))}
                  </StaggeredContainer>
                ) : (
                  <Card variant="elevated" className="hover-lift">
                    <CardContent className="p-12 text-center animate-fade-in">
                      <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-4 animate-float" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucun Programme d'Irrigation</h3>
                      <p className="text-gray-500">Lancez l'analyse de stress hydrique pour générer des recommandations d'irrigation</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </RevealOnScroll>
          </TabsContent>

          {/* ET Analysis Tab */}
          <TabsContent value="et_data" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              <div className="mt-4 animate-fade-in">
                <h3 className="text-lg font-semibold mb-4">Analyse d'Évapotranspiration</h3>
                {results?.et_data && results.et_data.length > 0 ? (
                  <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="space-y-6">
                    <ChartCard
                      title="ET Actuelle vs Potentielle (30 derniers jours)"
                      icon={<BarChart3 className="w-5 h-5" />}
                      delay={0}
                    >
                      <div className="h-80 flex items-end justify-center gap-2 px-4 animate-fade-in">
                        {results.et_data.slice(-30).map((d, i) => (
                          <div key={i} className="flex-1 max-w-10 flex flex-col items-center">
                            <div
                              className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600 hover-lift"
                              style={{ height: `${Math.max(2, d.et_actual * 8)}px` }}
                            />
                            <div className="w-full bg-gray-200 rounded-t mt-1 transition-all duration-500" style={{ height: `${Math.max(2, d.et_potential * 8)}px` }} />
                            <span className="text-xs text-gray-500 mt-2">{new Date(d.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 animate-fade-in">
                        <div className="flex items-center gap-1"><div className="w-4 h-4 bg-blue-500 rounded" /><span>ET Actuelle</span></div>
                        <div className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-300 rounded" /><span>ET Potentielle</span></div>
                      </div>
                    </ChartCard>

                    <ChartCard
                      title="Détail Quotidien (14 derniers jours)"
                      icon={<CalendarDays className="w-5 h-5" />}
                      delay={100}
                    >
                      <div className="overflow-x-auto animate-fade-in">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-200">
                              <th className="pb-3 font-medium">Date</th>
                              <th className="pb-3 font-medium text-right">ET Actuelle (mm)</th>
                              <th className="pb-3 font-medium text-right">ET Potentielle (mm)</th>
                              <th className="pb-3 font-medium text-right">Indice de Stress</th>
                              <th className="pb-3 font-medium text-right">Déficit (mm)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {results.et_data.slice(-14).map((d, i) => (
                              <tr key={i} className="hover:bg-gray-50 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                                <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
                                <td className="py-2 text-right font-medium text-blue-600">{d.et_actual.toFixed(2)}</td>
                                <td className="py-2 text-right text-gray-900">{d.et_potential.toFixed(2)}</td>
                                <td className="py-2 text-right">
                                  <Badge variant={d.stress_index > 0.7 ? 'danger' : d.stress_index > 0.4 ? 'warning' : 'success'} size="sm">
                                    {(d.stress_index * 100).toFixed(0)}%
                                  </Badge>
                                </td>
                                <td className="py-2 text-right font-medium text-red-600">
                                  {(d.et_potential - d.et_actual).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ChartCard>
                  </StaggeredContainer>
                ) : (
                  <Card variant="elevated" className="hover-lift">
                    <CardContent className="p-12 text-center animate-fade-in">
                      <Sun className="w-12 h-12 mx-auto text-gray-300 mb-4 animate-float" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune Donnée ET</h3>
                      <p className="text-gray-500">Lancez l'analyse pour voir les tendances d'évapotranspiration</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </RevealOnScroll>
          </TabsContent>

          {/* Water Balance Tab */}
          <TabsContent value="water_balance" transition="fade">
            <RevealOnScroll transition="slide-up" delay={100}>
              {waterBalance ? (
                <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="mt-4 space-y-6">
                  <div className="animate-fade-in">
                    <h3 className="text-lg font-semibold mb-4">Bilan Hydrique du Sol</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <RevealOnScroll transition="scale-in" delay={0}>
                      <Card variant="elevated" className="hover-lift text-center">
                        <CardContent className="p-6 animate-fade-in">
                          <h4 className="text-sm text-gray-500 mb-2">Capacité au Champ</h4>
                          <p className="text-3xl font-bold text-blue-600 animate-count-up">{waterBalance.field_capacity} mm</p>
                          <p className="text-xs text-gray-400 mt-1">Eau max que le sol peut retenir</p>
                        </CardContent>
                      </Card>
                    </RevealOnScroll>
                    <RevealOnScroll transition="scale-in" delay={80}>
                      <Card variant="elevated" className="hover-lift text-center">
                        <CardContent className="p-6 animate-fade-in">
                          <h4 className="text-sm text-gray-500 mb-2">Point de Flétrissement</h4>
                          <p className="text-3xl font-bold text-red-600 animate-count-up">{waterBalance.wilting_point} mm</p>
                          <p className="text-xs text-gray-400 mt-1">Plantes ne peuvent plus extraire l'eau</p>
                        </CardContent>
                      </Card>
                    </RevealOnScroll>
                    <RevealOnScroll transition="scale-in" delay={160}>
                      <Card variant="elevated" className="hover-lift text-center">
                        <CardContent className="p-6 animate-fade-in">
                          <h4 className="text-sm text-gray-500 mb-2">Eau Disponible pour Plantes</h4>
                          <p className="text-3xl font-bold text-green-600 animate-count-up">{waterBalance.available_water.toFixed(1)} mm</p>
                          <p className="text-xs text-gray-400 mt-1">Eau disponible pour l'absorption</p>
                        </CardContent>
                      </Card>
                    </RevealOnScroll>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartCard
                      title="Statut Actuel"
                      icon={<Gauge className="w-5 h-5" />}
                      delay={0}
                    >
                      <div className="space-y-4 animate-fade-in">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Humidité Actuelle du Sol</span>
                            <span className="font-medium">{waterBalance.soil_moisture.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out-cubic" style={{ width: `${Math.min(100, waterBalance.soil_moisture)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Eau Utilisée (ET / ETP)</span>
                            <span className="font-medium">{(waterBalance.current_et / waterBalance.potential_et * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out-cubic" style={{ width: `${Math.min(100, waterBalance.current_et / waterBalance.potential_et * 100)}%` }} />
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50 animate-slide-up">
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Jours jusqu'au stress hydrique:</strong> {waterBalance.days_to_stress} jours
                          </p>
                          <p className="text-xs text-gray-500">
                            Basé sur le taux ET actuel de {waterBalance.current_et} mm/jour et {waterBalance.available_water.toFixed(1)} mm d'eau disponible
                          </p>
                        </div>
                      </div>
                    </ChartCard>

                    <ChartCard
                      title="Tendance Humidité du Sol (Estimée)"
                      icon={<TrendingUp className="w-5 h-5" />}
                      delay={80}
                    >
                      <div className="h-48 flex items-end justify-center gap-2 px-4 animate-fade-in">
                        {results.et_data?.slice(-14).map((d, i) => (
                          <div key={i} className="flex-1 max-w-10 flex flex-col items-center">
                            <div
                              className="w-full bg-green-500 rounded-t transition-all duration-500 hover:bg-green-600 hover-lift"
                              style={{ height: `${Math.max(2, (100 - d.stress_index * 100))}px` }}
                            />
                            <span className="text-xs text-gray-500 mt-2">{new Date(d.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-center text-sm text-gray-500 mt-3 animate-fade-in">Humidité du sol estimée % (indice de stress inversé)</p>
                    </ChartCard>
                  </div>

                  <ChartCard
                    title="Performance du Modèle"
                    icon={<Shield className="w-5 h-5" />}
                    delay={160}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      {results.model_performance && (
                        <>
                          <ModelPerformanceCard
                            label="Précision ET"
                            value={`${(results.model_performance.et_accuracy * 100).toFixed(1)}%`}
                            desc="Précision de prédiction de l'évapotranspiration"
                            icon={<Droplet className="w-6 h-6" />}
                            delay={0}
                          />
                          <ModelPerformanceCard
                            label="Détection Stress F1"
                            value={`${(results.model_performance.stress_detection_f1 * 100).toFixed(1)}%`}
                            desc="Score F1 de classification du stress hydrique"
                            icon={<AlertTriangle className="w-6 h-6" />}
                            delay={80}
                          />
                        </>
                      )}
                    </div>
                  </ChartCard>
                </StaggeredContainer>
              ) : (
                <Card variant="elevated" className="hover-lift">
                  <CardContent className="p-12 text-center animate-fade-in">
                    <Droplet className="w-12 h-12 mx-auto text-gray-300 mb-4 animate-float" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune Donnée de Bilan Hydrique</h3>
                    <p className="text-gray-500">Lancez l'analyse pour voir les métriques de bilan hydrique du sol</p>
                  </CardContent>
                </Card>
              )}
            </RevealOnScroll>
          </TabsContent>
        </Tabs>
      </RevealOnScroll>
    </AnimatedPage>
  )
}