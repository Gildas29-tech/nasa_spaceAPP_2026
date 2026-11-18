import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Zap,
  Download,
  RefreshCw,
  Calendar,
  MapPin,
  Leaf,
  Droplet,
  Sun,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge,
  Brain,
  LineChart as LineChartIcon,
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
import { AnimatedPage } from '../components/PageTransition'
import { Skeleton, CardSkeleton, StatCardSkeleton, ChartSkeleton, TableSkeleton } from '../components/ui/Skeleton'

const cropOptions = [
  { value: 'corn', label: 'Corn', unit: 'bu/acre', typical: 180 },
  { value: 'soybean', label: 'Soybean', unit: 'bu/acre', typical: 55 },
  { value: 'wheat', label: 'Wheat', unit: 'bu/acre', typical: 50 },
  { value: 'sorghum', label: 'Sorghum', unit: 'bu/acre', typical: 70 },
  { value: 'alfalfa', label: 'Alfalfa', unit: 'tons/acre', typical: 4.5 },
  { value: 'canola', label: 'Canola', unit: 'lbs/acre', typical: 1800 },
  { value: 'barley', label: 'Barley', unit: 'bu/acre', typical: 65 },
  { value: 'sunflower', label: 'Sunflower', unit: 'lbs/acre', typical: 1400 },
]

const climateZones = [
  { value: 'temperate', label: 'Temperate' },
  { value: 'arid', label: 'Arid' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'humid_subtropical', label: 'Humid Subtropical' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'cold', label: 'Cold' },
]

const soilTypes = [
  { value: 'sand', label: 'Sand' },
  { value: 'loam', label: 'Loam' },
  { value: 'clay', label: 'Clay' },
  { value: 'silt', label: 'Silt' },
  { value: 'sandy_loam', label: 'Sandy Loam' },
  { value: 'clay_loam', label: 'Clay Loam' },
]

interface YieldPrediction {
  scenario: string
  crop: string
  predicted_yield: number
  unit: string
  confidence_interval: [number, number]
  uncertainty: number
  model: string
  features_importance: Record<string, number>
}

interface YieldResult {
  predictions: YieldPrediction[]
  benchmarks: Array<{ region: string; yield: number; unit: string }>
  model_performance: {
    r2: number
    rmse: number
    mae: number
  }
  historical_trends: Array<{ year: number; yield: number }>
}

const regionalBenchmarks = [
  { region: 'County Average', yield: 165, unit: 'bu/acre' },
  { region: 'State Average', yield: 172, unit: 'bu/acre' },
  { region: 'National Average', yield: 177, unit: 'bu/acre' },
  { region: 'Top 10% Farms', yield: 210, unit: 'bu/acre' },
]

// Loading skeleton
function YieldPredictorSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="Scénarios" title="Prévision de rendement" subtitle="Une fourchette de rendement selon le climat, le sol et la culture." />
        <CardSkeleton className="animate-fade-in" style={{ animationDelay: '100ms' }} />
        <TableSkeleton rows={4} columns={4} className="animate-fade-in" style={{ animationDelay: '200ms' }} />
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

function PredictionCard({ pred, index, benchmarks, bestEstimate = false }: { pred: YieldPrediction; index: number; benchmarks: typeof regionalBenchmarks; bestEstimate?: boolean }) {
  const getYieldColor = (predicted: number) => {
    const avg = benchmarks[1].yield
    if (predicted >= avg * 1.1) return 'text-green-600'
    if (predicted >= avg * 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUncertaintyColor = (unc: number) => {
    if (unc <= 5) return 'text-green-600'
    if (unc <= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  const yieldColor = getYieldColor(pred.predicted_yield)
  const uncertaintyColor = getUncertaintyColor(pred.uncertainty)
  const ciWidth = ((pred.predicted_yield - pred.confidence_interval[0]) / (pred.confidence_interval[1] - pred.confidence_interval[0])) * 100
  const ciExpectedWidth = ((pred.confidence_interval[1] - pred.predicted_yield) / (pred.confidence_interval[1] - pred.confidence_interval[0])) * 100

  return (
    <Card
      variant="elevated"
      className={cn('relative hover-lift', bestEstimate && 'ring-2 ring-primary-500')}
      hover
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {bestEstimate && (
        <div className="absolute -top-2 -right-2 animate-scale-in">
          <Badge variant="success" size="sm" dot>Meilleure estimation</Badge>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 capitalize">{pred.scenario}</h3>
          <Badge variant="info" size="sm">{pred.model.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4 animate-fade-in">
          <p className="text-sm text-gray-500 mb-1">Rendement Prédit</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className={cn('text-5xl font-bold animate-count-up', yieldColor)}>
              {pred.predicted_yield.toFixed(1)}
            </span>
            <span className="text-xl text-gray-500 mb-4">{pred.unit}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm mt-2">
            <span className={cn('font-medium', uncertaintyColor)}>
              ±{pred.uncertainty.toFixed(1)}% incertitude
            </span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-50 mb-4 animate-slide-up">
          <p className="text-sm text-gray-600 mb-2">Intervalle de confiance 95%</p>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{pred.confidence_interval[0].toFixed(1)}</p>
              <p className="text-xs text-gray-500">Basse</p>
            </div>
            <div className="h-8 w-px bg-gray-300" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{pred.predicted_yield.toFixed(1)}</p>
              <p className="text-xs text-gray-500">Attendu</p>
            </div>
            <div className="h-8 w-px bg-gray-300" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{pred.confidence_interval[1].toFixed(1)}</p>
              <p className="text-xs text-gray-500">Haute</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out-cubic"
              style={{
                left: `${ciWidth}%`,
                width: `${ciExpectedWidth}%`
              }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex justify-between text-gray-600">
            <span>Culture: <span className="font-medium text-gray-900 capitalize">{pred.crop}</span></span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 hover-lift">
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </CardFooter>
    </Card>
  )
}

function FeatureImportanceBar({ feature, importance }: { feature: string; importance: number }) {
  return (
    <Card variant="elevated" className="hover-lift" style={{ animationDelay: '50ms' }}>
      <CardContent className="p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium capitalize text-gray-900">{feature.replace('_', ' ')}</span>
          <Badge variant="info" className="animate-scale-in">{(importance * 100).toFixed(1)}%</Badge>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out-cubic"
            style={{ width: `${importance * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function BenchmarkCard({ bench, index, prediction }: { bench: any; index: number; prediction: YieldPrediction | undefined }) {
  const diffNum = prediction ? (prediction.predicted_yield - bench.yield) / bench.yield * 100 : 0
  const diff = diffNum.toFixed(1)
  const diffColor = diffNum < 0 ? 'text-red-600' : 'text-green-600'

  return (
    <Card
      variant="elevated"
      className={cn('text-center hover-lift', index === 1 && 'ring-2 ring-primary-500')}
      hover
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <CardContent className="p-6 animate-fade-in">
        {index === 1 && <Badge variant="info" className="mb-3 animate-scale-in">Votre Région</Badge>}
        <h3 className="font-semibold text-gray-900 mb-2">{bench.region}</h3>
        <div className="text-3xl font-bold text-gray-900 animate-count-up">{bench.yield}</div>
        <div className="text-sm text-gray-500">{bench.unit}</div>
        {prediction && (
          <div className="mt-3 pt-3 border-t border-gray-100 animate-slide-up">
            <p className={cn('text-sm font-medium', diffColor)}>
              vs Votre Prédiction: {diffNum >= 0 ? '+' : ''}{diff}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ModelPerformanceCard({ label, value, desc, icon, delay = 0 }: { label: string; value: string; desc: string; icon: any; delay?: number }) {
  return (
    <Card variant="elevated" className="hover-lift text-center" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-6 animate-fade-in">
        <div className="p-2 rounded-xl bg-primary-100 text-primary-600 mx-auto mb-3 w-12 h-12 flex items-center justify-center animate-scale-in">
          {icon}
        </div>
        <p className="text-3xl font-bold text-primary-600 animate-count-up">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
        <p className="text-xs text-gray-400 mt-2">{desc}</p>
      </CardContent>
    </Card>
  )
}

export default function YieldPredictor({ farmId }: { farmId?: string }) {
  const { farms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [formData, setFormData] = useState({
    crop: 'corn',
    bbox: [-122.5, 37.5, -121.5, 38.5],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    soilTexture: 'loam',
    soilPh: 6.5,
    organicMatter: 3.2,
    climateZone: 'temperate',
    scenarios: ['current', 'optimistic', 'pessimistic'],
    model: 'rf',
  })
  const [results, setResults] = useState<YieldResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('predictions')
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  const handlePredict = async () => {
    if (!selectedFarm) {
      addToast({ type: 'warning', title: 'No farm selected', message: 'Please select a farm first' })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.post<YieldResult>('/analysis/yield', {
        farm_id: selectedFarm.id,
        crop: formData.crop,
        bbox: formData.bbox,
        start_date: formData.startDate,
        end_date: formData.endDate,
        soil_texture: formData.soilTexture,
        soil_ph: formData.soilPh,
        organic_matter: formData.organicMatter,
        climate_zone: formData.climateZone,
        scenarios: formData.scenarios,
        model: formData.model,
      })
      setResults(data)
      setShowResults(true)
      setActiveTab('predictions')
      addToast({ type: 'success', title: 'Prédiction terminée', message: 'Prévisions de rendement générées' })
    } catch (err: any) {
      console.error('Yield prediction failed:', err)
      setError('Échec de la génération des prévisions de rendement')
      addToast({ type: 'error', title: 'Prédiction échouée', message: 'Veuillez réessayer' })
    } finally {
      setLoading(false)
    }
  }

  const predictions = results?.predictions || []

  const getYieldColor = (pred: number, benchmarks: typeof regionalBenchmarks) => {
    const avg = benchmarks[1].yield
    if (pred >= avg * 1.1) return 'text-green-600'
    if (pred >= avg * 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUncertaintyColor = (unc: number) => {
    if (unc <= 5) return 'text-green-600'
    if (unc <= 10) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && !results) {
    return <YieldPredictorSkeleton />
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <PageHero
        kicker="Scénarios"
        title="Prévision de rendement"
        subtitle="Une fourchette de rendement selon le climat, le sol et la culture."
        actions={
          <Button
            onClick={handlePredict}
            loading={loading}
            disabled={!selectedFarm || loading}
            className="hover-lift"
          >
            <Zap className="w-4 h-4 mr-2" />
            Générer les prédictions
          </Button>
        }
      />

      {/* Configuration */}
      <Card variant="elevated" className="border-l-4 border-l-primary-500 hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Configuration de la Prédiction
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFarm && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 animate-fade-in">
              <p className="text-sm font-medium text-green-800">Prédiction pour : {selectedFarm.name}</p>
              <p className="text-xs text-green-700">La localisation sera auto-remplie depuis la géométrie de la ferme</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <Select
              label="Culture"
              value={formData.crop}
              onChange={(e) => setFormData({...formData, crop: e.target.value})}
              options={cropOptions}
            />
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
              label="Modèle"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              options={[
                { value: 'rf', label: 'Random Forest' },
                { value: 'gb', label: 'Gradient Boosting' },
                { value: 'ensemble', label: 'Ensemble' },
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
              label="Texture du Sol"
              value={formData.soilTexture}
              onChange={(e) => setFormData({...formData, soilTexture: e.target.value})}
              options={soilTypes}
            />
            <Input
              label="pH du Sol"
              type="number"
              step="0.1"
              min="3"
              max="9"
              value={formData.soilPh}
              onChange={(e) => setFormData({...formData, soilPh: parseFloat(e.target.value)})}
              placeholder="6.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              label="Matière Organique (%)"
              type="number"
              step="0.1"
              value={formData.organicMatter}
              onChange={(e) => setFormData({...formData, organicMatter: parseFloat(e.target.value)})}
              placeholder="3.2"
            />
            <Select
              label="Zone Climatique"
              value={formData.climateZone}
              onChange={(e) => setFormData({...formData, climateZone: e.target.value})}
              options={climateZones}
            />
            <div className="flex items-end">
              <label className="block w-full mb-1 text-sm font-medium text-gray-700">Scénarios</label>
              <div className="flex gap-2">
                {['current', 'optimistic', 'pessimistic'].map((s) => (
                  <label key={s} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scenarios.includes(s)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, scenarios: [...formData.scenarios, s]})
                        } else {
                          setFormData({...formData, scenarios: formData.scenarios.filter(x => x !== s)})
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePredict} loading={loading} className="flex-1 hover-lift" disabled={!selectedFarm || loading}>
              <Zap className="w-4 h-4 mr-2" />
              Prédire les Rendements
            </Button>
            <Button variant="secondary" className="hover-lift">Sauvegarder le Scénario</Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card variant="outlined" className="border-red-200 bg-red-50 animate-shake animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handlePredict} className="ml-auto hover-lift">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      <Tabs defaultValue="predictions" onChange={setActiveTab} className="w-full" animated transition="slide">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions" icon={<Gauge className="w-4 h-4" />}>Prédictions</TabsTrigger>
          <TabsTrigger value="scenarios" icon={<Target className="w-4 h-4" />}>Comparaison</TabsTrigger>
          <TabsTrigger value="features" icon={<Brain className="w-4 h-4" />}>Importance Features</TabsTrigger>
          <TabsTrigger value="benchmarks" icon={<LineChartIcon className="w-4 h-4" />}>Benchmarks</TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" transition="slide">
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {predictions.length > 0 ? (
              predictions.map((pred, i) => (
                <PredictionCard
                  key={i}
                  pred={pred}
                  index={i}
                  benchmarks={regionalBenchmarks}
                  bestEstimate={i === 0}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500 animate-fade-in">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
                <p>Aucune prédiction générée</p>
                <p className="text-sm mt-1">Configurez vos paramètres et cliquez sur "Prédire les Rendements"</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" transition="slide">
          {predictions.length > 0 ? (
            <div className="mt-4 space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-3 font-medium">Métrique</th>
                      {predictions.map((p) => (
                        <th key={p.scenario} className="pb-3 font-medium text-center capitalize">{p.scenario}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="animate-fade-in">
                      <td className="py-3 font-medium">Rendement Prédit</td>
                      {predictions.map((p) => (
                        <td key={p.scenario} className="py-3 text-center font-bold" style={{ color: getYieldColor(p.predicted_yield, regionalBenchmarks) }}>
                          {p.predicted_yield.toFixed(1)} {p.unit}
                        </td>
                      ))}
                    </tr>
                    <tr className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                      <td className="py-3 font-medium">Incertitude</td>
                      {predictions.map((p) => (
                        <td key={p.scenario} className="py-3 text-center" style={{ color: getUncertaintyColor(p.uncertainty) }}>
                          ±{p.uncertainty.toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                    <tr className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                      <td className="py-3 font-medium">Intervalle Confiance</td>
                      {predictions.map((p) => (
                        <td key={p.scenario} className="py-3 text-center text-sm">
                          [{p.confidence_interval[0].toFixed(1)}, {p.confidence_interval[1].toFixed(1)}]
                        </td>
                      ))}
                    </tr>
                    <tr className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                      <td className="py-3 font-medium">Modèle</td>
                      {predictions.map((p) => (
                        <td key={p.scenario} className="py-3 text-center text-sm text-gray-600">{p.model.toUpperCase()}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Scenario Insights */}
              {predictions.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ChartCard
                    title="Potentiel Optimiste"
                    icon={<TrendingUp className="w-5 h-5" />}
                    className="border-l-4 border-l-green-500"
                    delay={0}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-green-100 animate-scale-in">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Gain potentiel</h3>
                        <p className="text-sm text-gray-500">
                          {((predictions[1].predicted_yield - predictions[0].predicted_yield) / predictions[0].predicted_yield * 100).toFixed(1)}%
                          d'augmentation avec conditions favorables
                        </p>
                      </div>
                    </div>
                  </ChartCard>
                  <ChartCard
                    title="Risque Pessimiste"
                    icon={<TrendingDown className="w-5 h-5" />}
                    className="border-l-4 border-l-red-500"
                    delay={80}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-red-100 animate-scale-in">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Perte potentielle</h3>
                        <p className="text-sm text-gray-500">
                          {((predictions[0].predicted_yield - predictions[2].predicted_yield) / predictions[0].predicted_yield * 100).toFixed(1)}%
                          de perte en conditions de sécheresse
                        </p>
                      </div>
                    </div>
                  </ChartCard>
                  <ChartCard
                    title="Étendue des Scénarios"
                    icon={<Target className="w-5 h-5" />}
                    className="border-l-4 border-l-blue-500"
                    delay={160}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-100 animate-scale-in">
                        <Target className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Écart</h3>
                        <p className="text-sm text-gray-500">
                          {predictions[1].predicted_yield - predictions[2].predicted_yield} {predictions[0].unit}
                          d'écart entre scénarios
                        </p>
                      </div>
                    </div>
                  </ChartCard>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8 animate-fade-in">Générez des prédictions pour voir la comparaison des scénarios</p>
          )}
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" transition="slide">
          {predictions.length > 0 ? (
            <div className="mt-4 space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 animate-fade-in">Importance des Features (Meilleur Modèle)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(predictions[0].features_importance).map(([feature, importance], i) => (
                  <FeatureImportanceBar key={feature} feature={feature} importance={importance} />
                ))}
              </div>

              <div className="mt-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance du Modèle</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results?.model_performance && [
                    { label: 'Score R²', value: results.model_performance.r2.toFixed(2), desc: 'Coefficient de détermination', icon: <CheckCircle className="w-6 h-6" /> },
                    { label: 'RMSE', value: `${results.model_performance.rmse.toFixed(1)} ${predictions[0]?.unit || 'bu/acre'}`, desc: 'Root mean squared error', icon: <TrendingDown className="w-6 h-6" /> },
                    { label: 'MAE', value: `${results.model_performance.mae.toFixed(1)} ${predictions[0]?.unit || 'bu/acre'}`, desc: 'Mean absolute error', icon: <AlertTriangle className="w-6 h-6" /> },
                  ].map((m, i) => (
                    <ModelPerformanceCard key={m.label} {...m} delay={i * 80} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8 animate-fade-in">Générez des prédictions pour voir l'importance des features</p>
          )}
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" transition="slide">
          <div className="mt-4 space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 animate-fade-in">Benchmarks Régionaux</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regionalBenchmarks.map((bench, i) => (
                <BenchmarkCard key={i} bench={bench} index={i} prediction={predictions[0]} />
              ))}
            </div>

            <ChartCard
              title="Tendances Historiques des Rendements"
              icon={<LineChartIcon className="w-5 h-5" />}
              delay={0}
            >
              <div className="h-64 flex items-end justify-center gap-4 px-4 animate-fade-in">
                {results?.historical_trends && results.historical_trends.length > 0 ? (
                  results.historical_trends.map((y, i) => (
                    <div key={i} className="flex-1 max-w-16 flex flex-col items-center">
                      <div
                        className="w-full bg-primary-500 rounded-t transition-all duration-500 hover:bg-primary-600 hover-lift"
                        style={{ height: `${Math.max(0, (y.yield - 150) * 3)}px` }}
                      />
                      <span className="text-xs text-gray-500 mt-2">{y.year}</span>
                    </div>
                  ))
                ) : (
                  [155, 162, 158, 168, 172, 165, 178, 175, 182, 178].map((y, i) => (
                    <div key={i} className="flex-1 max-w-16 flex flex-col items-center">
                      <div
                        className="w-full bg-primary-500 rounded-t transition-all duration-500 hover:bg-primary-600 hover-lift"
                        style={{ height: `${(y - 150) * 3}px` }}
                      />
                      <span className="text-xs text-gray-500 mt-2">{2014 + i}</span>
                    </div>
                  ))
                )}
              </div>
              <p className="text-center text-sm text-gray-500 mt-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                Rendements moyens du comté 2014-2023. Votre rendement prédit : {predictions[0]?.predicted_yield.toFixed(1)} {predictions[0]?.unit}
              </p>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  )
}