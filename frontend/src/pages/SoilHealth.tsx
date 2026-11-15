import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  Leaf,
  Droplet,
  Sun,
  Wind,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Download,
  RefreshCw,
  MapPin,
  Calendar,
  AlertTriangle,
  Gauge,
  BarChart3,
  Layers,
  Database,
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

const soilTextureOptions = [
  { value: 'sand', label: 'Sand' },
  { value: 'loam', label: 'Loam' },
  { value: 'clay', label: 'Clay' },
  { value: 'silt', label: 'Silt' },
  { value: 'sandy_loam', label: 'Sandy Loam' },
  { value: 'clay_loam', label: 'Clay Loam' },
]

const climateZoneOptions = [
  { value: 'temperate', label: 'Temperate' },
  { value: 'arid', label: 'Arid' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'humid_subtropical', label: 'Humid Subtropical' },
  { value: 'tropical', label: 'Tropical' },
  { value: 'cold', label: 'Cold' },
]

interface SoilHealthResult {
  overall_score: number
  grade: string
  factors: {
    moisture_score: number
    organic_matter_score: number
    vegetation_score: number
    temperature_score: number
    erosion_risk_score: number
    compaction_score: number
    ph_score: number
    nutrient_score: number
  }
  percentiles: {
    overall: number
    moisture: number
    organic_matter: number
    vegetation: number
    temperature: number
    erosion_risk: number
  }
  recommendations: string[]
  confidence: number
  location: [number, number]
  assessment_date: string
  data_sources: string[]
}

const factorDetails = [
  { key: 'moisture_score', label: 'Soil Moisture', icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-100', desc: 'SMAP surface & root zone moisture adequacy' },
  { key: 'organic_matter_score', label: 'Organic Matter', icon: Leaf, color: 'text-green-600', bg: 'bg-green-100', desc: 'NDVI trends & vegetation productivity proxy' },
  { key: 'vegetation_score', label: 'Vegetation Health', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', desc: 'MODIS NDVI/EVI & Landsat indices' },
  { key: 'temperature_score', label: 'Temperature Regime', icon: Sun, color: 'text-orange-600', bg: 'bg-orange-100', desc: 'MODIS LST & thermal stress days' },
  { key: 'erosion_risk_score', label: 'Erosion Risk', icon: Wind, color: 'text-amber-600', bg: 'bg-amber-100', desc: 'Vegetation cover, rainfall intensity, slope' },
  { key: 'compaction_score', label: 'Compaction Risk', icon: Target, color: 'text-red-600', bg: 'bg-red-100', desc: 'Soil texture & moisture dynamics' },
  { key: 'ph_score', label: 'pH Suitability', icon: Info, color: 'text-purple-600', bg: 'bg-purple-100', desc: 'Measured pH or vegetation proxy' },
  { key: 'nutrient_score', label: 'Nutrient Cycling', icon: CheckCircle, color: 'text-cyan-600', bg: 'bg-cyan-100', desc: 'Organic matter & vegetation productivity' },
]

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'text-green-600 bg-green-100'
  if (grade.startsWith('B')) return 'text-blue-600 bg-blue-100'
  if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-100'
  if (grade.startsWith('D')) return 'text-orange-600 bg-orange-100'
  return 'text-red-600 bg-red-100'
}

// Loading skeleton
function SoilHealthSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="NASA Earth observations" title="Santé du sol" subtitle="Un score du sol à partir de l'humidité, de la végétation et du climat." />

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

function FactorCard({ factor, score, percentile, confidence, delay = 0 }: { factor: any; score: number; percentile: number; confidence: number; delay?: number }) {
  const badgeVariant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'
  const statusLabel = score >= 80 ? 'Optimal' : score >= 60 ? 'Needs attention' : 'Critical'

  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <Card variant="elevated" className="hover-lift">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-xl', factor.bg)}>
              <factor.icon className={cn('w-6 h-6', factor.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{factor.label}</h3>
              <p className="text-sm text-gray-500">{factor.desc}</p>
            </div>
          </div>
          <Badge variant={badgeVariant} className="animate-scale-in">
            {score}/100
          </Badge>
        </CardHeader>
        <CardContent className="animate-fade-in">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Percentile Régional</p>
              <p className="text-2xl font-bold text-gray-900 animate-count-up">{percentile}th</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contribution Confiance</p>
              <p className="text-2xl font-bold text-gray-900 animate-count-up">{Math.round(score * confidence)}%</p>
            </div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out-cubic"
              style={{ width: `${score}%`, background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center animate-fade-in" style={{ animationDelay: '200ms' }}>
            {statusLabel}
          </p>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function DataSourceCard({ source, index, usedSources }: { source: any; index: number; usedSources: string[] }) {
  const isUsed = usedSources.some(s => s.toLowerCase().includes(source.name.toLowerCase()))

  return (
    <RevealOnScroll transition="slide-up" delay={index * 80}>
      <Card
        variant="elevated"
        className={cn('hover-lift', isUsed && 'border-l-4 border-l-green-500')}
        hover
      >
        <CardContent className="p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {source.name}
                <Badge variant={isUsed ? 'success' : 'gray'} size="sm" className="animate-scale-in">
                  {isUsed ? 'Utilisé' : 'Disponible'}
                </Badge>
              </h3>
              <p className="text-sm text-gray-500">{source.full}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">{source.desc}</p>
          <div className="flex flex-wrap gap-1">
            {source.vars.map((v: string) => (
              <Badge key={v} variant="gray" size="sm" className="animate-scale-in" style={{ animationDelay: `${Math.random() * 100}ms` }}>
                {v}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function RecommendationCard({ rec, index }: { rec: string; index: number }) {
  return (
    <RevealOnScroll transition="slide-up" delay={index * 80}>
      <Card variant="outlined" className="border-l-4 border-l-primary-500 hover-lift">
        <CardContent className="pt-6 pb-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center animate-scale-in">
              <CheckCircle className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-gray-700 mt-0.5">{rec}</p>
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

export default function SoilHealth() {
  const { farms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [formData, setFormData] = useState({
    bbox: [-122.5, 37.5, -121.5, 38.5],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    soilTexture: 'loam',
    soilPh: 6.5,
    organicMatter: '',
    climateZone: 'temperate',
  })
  const [results, setResults] = useState<SoilHealthResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Set selected farm when farms change
  useEffect(() => {
    if (farms.length > 0) {
      const farm = farms.find(f => f.id === selectedFarmId) || farms[0]
      setSelectedFarm(farm)
      selectFarm(farm.id)
      // Update form with farm location if available
      if (farm.geometry && farm.geometry.type === 'Polygon' && farm.geometry.coordinates[0].length > 0) {
        const coords = farm.geometry.coordinates[0]
        const lons = coords.map(c => c[0])
        const lats = coords.map(c => c[1])
        const minLon = Math.min(...lons)
        const maxLon = Math.max(...lons)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        setFormData(prev => ({
          ...prev,
          bbox: [minLon - 0.01, minLat - 0.01, maxLon + 0.01, maxLat + 0.01]
        }))
      }
    } else {
      setSelectedFarm(null)
      selectFarm(null)
    }
  }, [farms, selectedFarmId, selectFarm])

  const handleAnalyze = async () => {
    if (!selectedFarm) {
      addToast({ type: 'warning', title: 'Aucune ferme sélectionnée', message: 'Veuillez sélectionner une ferme' })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.post<SoilHealthResult>('/analysis/soil-health', {
        farm_id: selectedFarm.id,
        bbox: formData.bbox,
        start_date: formData.startDate,
        end_date: formData.endDate,
        soil_texture: formData.soilTexture,
        soil_ph: formData.soilPh,
        organic_matter: formData.organicMatter ? parseFloat(formData.organicMatter) : undefined,
        climate_zone: formData.climateZone,
      })
      setResults(data)
      setShowResults(true)
      setActiveTab('overview')
      addToast({ type: 'success', title: 'Analyse terminée', message: 'Évaluation de la santé du sol terminée' })
    } catch (err: any) {
      console.error('Soil health analysis failed:', err)
      setError('Échec de l\'analyse de la santé du sol')
      addToast({ type: 'error', title: 'Analyse échouée', message: 'Veuillez réessayer' })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !results) {
    return <SoilHealthSkeleton />
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <RevealOnScroll transition="slide-up" delay={50}>
        <PageHero
          kicker="NASA Earth observations"
          title="Santé du sol"
          subtitle="Un score du sol à partir de l'humidité, de la végétation et du climat."
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

      {/* Configuration Form */}
      <RevealOnScroll transition="slide-up" delay={100}>
        <Card variant="elevated" className="border-l-4 border-l-primary-500 hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              Configuration de l'Analyse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFarm && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 animate-fade-in">
                <p className="text-sm font-medium text-green-800">Analyse pour : {selectedFarm.name}</p>
                <p className="text-xs text-green-700">La localisation sera auto-remplie depuis la géométrie de la ferme</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                options={soilTextureOptions}
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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Matière Organique (%)"
                type="number"
                step="0.1"
                value={formData.organicMatter}
                onChange={(e) => setFormData({...formData, organicMatter: e.target.value})}
                placeholder="Optionnel - laisser vide pour estimation"
              />
              <Select
                label="Zone Climatique"
                value={formData.climateZone}
                onChange={(e) => setFormData({...formData, climateZone: e.target.value})}
                options={climateZoneOptions}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAnalyze} loading={loading} className="flex-1 hover-lift" disabled={!selectedFarm || loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Analyser la Santé du Sol
              </Button>
              <Button variant="secondary" onClick={() => {}} className="hover-lift">Sauvegarder la Configuration</Button>
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

      {results && (
        <>
          {/* Results Tabs */}
          <RevealOnScroll transition="slide-up" delay={showResults ? 200 : 1000}>
            <Tabs defaultValue="overview" onChange={setActiveTab} className="w-full" animated transition="fade">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" icon={<Gauge className="w-4 h-4" />}>Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="factors" icon={<BarChart3 className="w-4 h-4" />}>Détails Facteurs</TabsTrigger>
                <TabsTrigger value="recommendations" icon={<Layers className="w-4 h-4" />}>Recommandations</TabsTrigger>
                <TabsTrigger value="data" icon={<Database className="w-4 h-4" />}>Sources de Données</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" transition="fade">
                <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Score Card */}
                  <ChartCard
                    title="Score Global"
                    icon={<Gauge className="w-5 h-5" />}
                    delay={0}
                  >
                    <CardContent className="text-center py-8 animate-fade-in">
                      <div className="relative inline-block mb-6">
                        <svg className="w-40 h-40 transform -rotate-90">
                          <circle
                            cx="100"
                            cy="100"
                            r="90"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                          />
                          <circle
                            cx="100"
                            cy="100"
                            r="90"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={`${results.overall_score / 100 * 565.48} 565.48`}
                            style={{ strokeDashoffset: 0 }}
                            className="animate-gauge-fill"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="30%" stopColor="#f59e0b" />
                              <stop offset="60%" stopColor="#eab308" />
                              <stop offset="100%" stopColor="#22c55e" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl font-bold text-gray-900 animate-count-up">{results.overall_score}</span>
                          <Badge className={cn('mt-2', getGradeColor(results.grade))}>
                            Grade {results.grade}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm animate-slide-up">
                        <p className="text-gray-500">Confiance: {Math.round(results.confidence * 100)}%</p>
                        <p className="text-gray-500">Percentile: {results.percentiles.overall}th</p>
                        <p className="text-gray-500">Évalué: {results.assessment_date}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1 hover-lift">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 hover-lift" onClick={handleAnalyze}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Relancer
                      </Button>
                    </CardFooter>
                  </ChartCard>

                  {/* Factor Scores */}
                  <ChartCard
                    title="Scores par Facteur"
                    icon={<BarChart3 className="w-5 h-5" />}
                    className="lg:col-span-2"
                    delay={100}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {factorDetails.map((factor, i) => {
                        const score = results.factors[factor.key as keyof typeof results.factors]
                        return (
                          <RevealOnScroll key={factor.key} transition="scale-in" delay={i * 50}>
                            <div className="p-4 rounded-xl bg-gray-50 animate-fade-in hover-lift">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={cn('p-2 rounded-lg', factor.bg)}>
                                  <factor.icon className={cn('w-5 h-5', factor.color)} />
                                </div>
                                <span className="font-medium text-gray-900 text-sm">{factor.label}</span>
                              </div>
                              <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-gray-900 animate-count-up">{score}</span>
                                <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'} size="sm" className="animate-scale-in">
                                  {score >= 80 ? 'Bon' : score >= 60 ? 'Moyen' : 'Faible'}
                                </Badge>
                              </div>
                              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-1000 ease-out-cubic"
                                  style={{ width: `${score}%`, background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)' }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{factor.desc}</p>
                            </div>
                          </RevealOnScroll>
                        )
                      })}
                    </div>
                  </ChartCard>
                </StaggeredContainer>
              </TabsContent>

              {/* Factors Tab */}
              <TabsContent value="factors" transition="fade">
                <RevealOnScroll transition="slide-up" delay={100}>
                  <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {factorDetails.map((factor, i) => {
                      const score = results.factors[factor.key as keyof typeof results.factors]
                      const percentile = results.percentiles[factor.key.replace('_score', '') as keyof typeof results.percentiles] || 50
                      return (
                        <FactorCard
                          key={factor.key}
                          factor={factor}
                          score={score}
                          percentile={percentile}
                          confidence={results.confidence}
                          delay={i * 50}
                        />
                      )
                    })}
                  </StaggeredContainer>
                </RevealOnScroll>
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" transition="fade">
                <RevealOnScroll transition="slide-up" delay={100}>
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900">Recommandations Actionnables</h2>
                    {results.recommendations.map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} index={i} />
                    ))}
                  </div>
                </RevealOnScroll>
              </TabsContent>

              {/* Data Sources Tab */}
              <TabsContent value="data" transition="fade">
                <RevealOnScroll transition="slide-up" delay={100}>
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900">Sources de Données Utilisées</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: 'SMAP', full: 'Soil Moisture Active Passive', vars: ['Surface Soil Moisture', 'Root Zone Soil Moisture'], desc: 'NASA JPL • 9km daily • Global' },
                        { name: 'MODIS', full: 'Moderate Resolution Imaging Spectroradiometer', vars: ['NDVI', 'EVI', 'LST'], desc: 'NASA Terra/Aqua • 250m-1km • 16-day/8-day' },
                        { name: 'Landsat 8/9', full: 'Landsat Collection 2 Level-2', vars: ['Surface Reflectance', 'NDVI', 'SAVI'], desc: 'USGS/NASA • 30m • 16-day' },
                        { name: 'GPM/IMERG', full: 'Global Precipitation Measurement', vars: ['Precipitation Rate', 'Accumulation'], desc: 'NASA/JAXA • 0.1° • 30-min' },
                        { name: 'ECOSTRESS', full: 'ECOsystem Spaceborne Thermal Radiometer', vars: ['ET', 'Water Stress Index', 'ESI'], desc: 'NASA JPL • 70m • ~4-day revisit' },
                        { name: 'OpenET', full: 'Open Evapotranspiration', vars: ['Field-scale ET', 'ET Reference'], desc: 'NASA/USGS/DRI • 30m • Monthly' },
                      ].map((source, i) => (
                        <DataSourceCard key={i} source={source} index={i} usedSources={results.data_sources} />
                      ))}
                    </div>
                  </div>
                </RevealOnScroll>
              </TabsContent>
            </Tabs>
          </RevealOnScroll>
        </>
      )}
    </AnimatedPage>
  )
}