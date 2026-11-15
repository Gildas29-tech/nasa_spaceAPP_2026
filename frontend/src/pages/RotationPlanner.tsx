import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  GitBranch,
  Leaf,
  Droplet,
  DollarSign,
  Shield,
  Sun,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Settings,
  Download,
  RefreshCw,
  Zap,
  TrendingUp,
  Target,
  AlertTriangle,
  Trophy,
  BarChart3,
  Layers,
  BookOpen,
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
import { Skeleton, CardSkeleton, StatCardSkeleton, TableSkeleton } from '../components/ui/Skeleton'

const cropOptions = [
  { value: 'corn', label: 'Corn', family: 'Poaceae', season: 'warm', water: 'high', nfix: false, economicValue: 1.0 },
  { value: 'soybean', label: 'Soybean', family: 'Fabaceae', season: 'warm', water: 'medium', nfix: true, economicValue: 1.2 },
  { value: 'wheat', label: 'Wheat', family: 'Poaceae', season: 'cool', water: 'medium', nfix: false, economicValue: 0.8 },
  { value: 'sorghum', label: 'Sorghum', family: 'Poaceae', season: 'warm', water: 'low', nfix: false, economicValue: 0.7 },
  { value: 'alfalfa', label: 'Alfalfa', family: 'Fabaceae', season: 'perennial', water: 'high', nfix: true, economicValue: 0.9 },
  { value: 'canola', label: 'Canola', family: 'Brassicaceae', season: 'cool', water: 'medium', nfix: false, economicValue: 1.1 },
  { value: 'pea', label: 'Pea', family: 'Fabaceae', season: 'cool', water: 'medium', nfix: true, economicValue: 0.8 },
  { value: 'barley', label: 'Barley', family: 'Poaceae', season: 'cool', water: 'medium', nfix: false, economicValue: 0.7 },
  { value: 'sunflower', label: 'Sunflower', family: 'Asteraceae', season: 'warm', water: 'medium', nfix: false, economicValue: 0.9 },
  { value: 'rye', label: 'Cereal Rye (Cover)', family: 'Poaceae', season: 'cool', water: 'low', nfix: false, economicValue: 0.3 },
  { value: 'radish', label: 'Tillage Radish (Cover)', family: 'Brassicaceae', season: 'cool', water: 'low', nfix: false, economicValue: 0.2 },
  { value: 'clover', label: 'Clover (Cover)', family: 'Fabaceae', season: 'cool', water: 'medium', nfix: true, economicValue: 0.4 },
]

interface RotationResult {
  rank: number
  sequence: string[]
  years: number
  scores: {
    water_conservation: number
    soil_health: number
    profitability: number
    pest_management: number
    climate_resilience: number
    diversification: number
  }
  total_score: number
  details?: string
}

const priorityOptions = [
  { key: 'water_conservation', label: 'Water Conservation', icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'soil_health', label: 'Soil Health', icon: Leaf, color: 'text-green-600', bg: 'bg-green-100' },
  { key: 'profitability', label: 'Profitability', icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { key: 'pest_management', label: 'Pest Management', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-100' },
  { key: 'climate_resilience', label: 'Climate Resilience', icon: Sun, color: 'text-orange-600', bg: 'bg-orange-100' },
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

interface FormData {
  currentCrops: string[]
  excludedCrops: string[]
  requiredCrops: string[]
  priorities: {
    water_conservation: number
    soil_health: number
    profitability: number
    pest_management: number
    climate_resilience: number
  }
  climateZone: string
  soilType: string
  minYears: number
  maxYears: number
  maxResults: number
}

// Loading skeleton
function RotationPlannerSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="CropShift" title="Plan de rotation" subtitle="Plusieurs rotations classées selon le sol, l'eau et le revenu." />

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

function StatMetricCard({ icon: Icon, iconBg, label, value, delay = 0, trend }: any) {
  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <Card variant="elevated" className="hover-lift">
        <CardContent className="p-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-3 rounded-xl', iconBg + '100')}>
                <Icon className={cn('w-6 h-6', iconBg)} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 animate-count-up">{value}</p>
              </div>
            </div>
            {trend && (
              <div className={cn('flex items-center gap-1 text-sm font-medium', trend > 0 ? 'text-green-600' : 'text-red-600')}>
                <TrendingUp className="w-4 h-4" />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function PrioritySlider({ priority, value, onChange, delay = 0 }: { priority: typeof priorityOptions[0]; value: number; onChange: (value: number) => void; delay?: number }) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay}>
      <div className="p-4 rounded-xl bg-gray-50 animate-fade-in hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn('p-2 rounded-lg', priority.bg)}>
            <priority.icon className={cn('w-5 h-5', priority.color)} />
          </div>
          <span className="font-medium text-sm">{priority.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(value * 100)}
            onChange={(e) => onChange(parseInt(e.target.value) / 100)}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
          <span className="text-sm font-medium text-gray-900 w-12 text-right">
            {Math.round(value * 100)}%
          </span>
        </div>
      </div>
    </RevealOnScroll>
  )
}

function CropBadge({ crop, variant = 'default', removable, onRemove, delay = 0 }: { crop: string; variant?: 'default' | 'gray' | 'info'; removable?: boolean; onRemove?: () => void; delay?: number }) {
  const cropInfo = cropOptions.find(c => c.value === crop)
  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <div className="flex items-center gap-1 animate-fade-in">
        <Badge variant={variant} className="gap-1 animate-scale-in">
          {cropInfo?.nfix && <Leaf className="w-3 h-3 text-green-600" />}
          {cropInfo?.label || crop}
          {cropInfo?.water === 'low' && <Droplet className="w-3 h-3 text-blue-600 opacity-50" />}
        </Badge>
        {removable && onRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="ml-1 p-1 hover:bg-gray-200 rounded transition-colors animate-scale-in hover:scale-110"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </RevealOnScroll>
  )
}

function RotationCard({ rotation, index, onViewDetails, onExport, onSimulate }: { rotation: RotationResult; index: number; onViewDetails: () => void; onExport: () => void; onSimulate: () => void }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <RevealOnScroll transition="slide-up" delay={index * 80}>
      <Card variant="elevated" className={cn('overflow-hidden hover-lift', rotation.rank === 1 ? 'border-2 border-yellow-300' : '')} hover>
        <CardContent className="p-0 animate-fade-in">
          <div className="flex flex-col md:flex-row">
            {/* Rank & Score */}
            <div className={cn('p-6 md:w-48 border-r border-gray-100 md:border-r md:border-b-0 text-center relative', rotation.rank === 1 ? 'bg-gradient-to-b from-yellow-50 to-white' : 'bg-gray-50')}>
              {rotation.rank === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce-gentle">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
              )}
              <div className="text-4xl font-bold text-gray-900 animate-count-up">{rotation.total_score.toFixed(1)}</div>
              <Badge variant={rotation.rank <= 3 ? 'success' : 'gray'} className="mt-2 animate-scale-in">
                #{rotation.rank}
              </Badge>
              <p className="text-sm text-gray-500 mt-2">{rotation.years}-year rotation</p>
            </div>

            {/* Sequence */}
            <div className="flex-1 p-6">
              <div className="flex items-center gap-2 mb-4 flex-wrap animate-stagger-slide-up">
                {rotation.sequence.map((crop, i) => {
                  const info = cropOptions.find(c => c.value === crop)
                  return (
                    <span key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 animate-scale-in hover:bg-gray-200 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                      {info ? (
                        <>
                          {info.nfix && <Leaf className="w-3 h-3 text-green-600" />}
                          {info.label}
                          {info.water === 'low' && <Droplet className="w-3 h-3 text-blue-600 opacity-50" />}
                        </>
                      ) : crop}
                      {i < rotation.sequence.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400 ml-1" />}
                    </span>
                  )
                })}
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 animate-stagger-slide-up">
                {Object.entries(rotation.scores).map(([key, score], idx) => {
                  const priority = priorityOptions.find(p => p.key === key)
                  return (
                    <div key={key} className="p-3 rounded-xl bg-gray-50 text-center animate-scale-in hover:bg-gray-100 transition-colors" style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {priority?.icon && <priority.icon className="w-4 h-4 text-gray-400" />}
                        <span className="text-xs text-gray-500">{priority?.label || key}</span>
                      </div>
                      <div className={cn('text-2xl font-bold', getScoreColor(score))}>{score}</div>
                      <div className={cn('h-1.5 rounded-full mt-1', getScoreBg(score))}>
                        <div className="h-full rounded-full animate-slide-right" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 md:w-48 border-l border-gray-100 flex flex-col items-center justify-center gap-2">
              <Button variant="primary" size="sm" className="w-full hover-lift" onClick={onViewDetails}>
                View Details
              </Button>
              <Button variant="ghost" size="sm" className="w-full hover-lift" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-gray-600 hover-lift" onClick={onSimulate}>
                <Zap className="w-4 h-4 mr-2" />
                Simulate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function TemplateCard({ template, index, onUse }: { template: any; index: number; onUse: () => void }) {
  return (
    <RevealOnScroll transition="slide-up" delay={index * 60}>
      <Card variant="elevated" className="hover-lift" hover>
        <CardContent className="p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500">{template.desc}</p>
            </div>
            <Badge variant="info">{template.years} years</Badge>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 animate-stagger-slide-up">
            {template.sequence.map((crop: string, idx: number) => {
              const info = cropOptions.find(c => c.value === crop)
              return (
                <span key={idx} className="px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-700 animate-scale-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  {info?.label || crop}
                  {idx < template.sequence.length - 1 && <ArrowRight className="w-3 h-3 ml-1 inline-block" />}
                </span>
              )
            })}
          </div>
          <Button variant="ghost" size="sm" className="w-full hover-lift" onClick={onUse}>
            <Plus className="w-4 h-4 mr-2" />
            Use This Template
          </Button>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

export default function RotationPlanner({ farmId }: { farmId?: string }) {
  const { farms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [formData, setFormData] = useState<FormData>({
    currentCrops: ['corn', 'soybean'],
    excludedCrops: [],
    requiredCrops: [],
    priorities: {
      water_conservation: 0.25,
      soil_health: 0.25,
      profitability: 0.25,
      pest_management: 0.15,
      climate_resilience: 0.10,
    },
    climateZone: 'temperate',
    soilType: 'loam',
    minYears: 3,
    maxYears: 5,
    maxResults: 10,
  })
  const [rotations, setRotations] = useState<RotationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('results')
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
        // Auto-fill current crops from farm
        if (farm.crops_of_interest && farm.crops_of_interest.length > 0) {
          const mappedCrops = farm.crops_of_interest
            .map(c => cropOptions.find(opt => opt.label.toLowerCase() === c.toLowerCase())?.value)
            .filter(Boolean) as string[]
          if (mappedCrops.length > 0) {
            setFormData(prev => ({ ...prev, currentCrops: mappedCrops }))
          }
        }
      }
    } else if (farms.length > 0) {
      const farm = farms.find(f => f.id === selectedFarmId) || farms[0]
      setSelectedFarm(farm)
      selectFarm(farm.id)
      if (farm.crops_of_interest && farm.crops_of_interest.length > 0) {
        const mappedCrops = farm.crops_of_interest
          .map(c => cropOptions.find(opt => opt.label.toLowerCase() === c.toLowerCase())?.value)
          .filter(Boolean) as string[]
        if (mappedCrops.length > 0) {
          setFormData(prev => ({ ...prev, currentCrops: mappedCrops }))
        }
      }
    } else {
      setSelectedFarm(null)
      selectFarm(null)
    }
  }, [farms, selectedFarmId, selectFarm, farmId])

  const handleOptimize = async () => {
    if (!selectedFarm) {
      addToast({ type: 'warning', title: 'No farm selected', message: 'Please select a farm first' })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.post<{ rotations: RotationResult[] }>('/analysis/rotation', {
        current_crops: formData.currentCrops,
        excluded_crops: formData.excludedCrops,
        required_crops: formData.requiredCrops,
        priorities: formData.priorities,
        climate_zone: formData.climateZone,
        soil_type: formData.soilType,
        min_rotation_years: formData.minYears,
        max_rotation_years: formData.maxYears,
        max_results: formData.maxResults,
      })
      setRotations(data.rotations || [])
      setActiveTab('results')
      setShowResults(true)
      addToast({ type: 'success', title: 'Optimization complete', message: `Found ${data.rotations?.length || 0} optimal rotations` })
    } catch (err: any) {
      console.error('Rotation optimization failed:', err)
      setError('Failed to optimize rotations')
      addToast({ type: 'error', title: 'Optimization failed', message: 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  const handlePriorityChange = (key: string, value: number) => {
    const newPriorities = { ...formData.priorities, [key]: value }
    // Normalize
    const total = Object.values(newPriorities).reduce((a, b) => a + b, 0)
    Object.keys(newPriorities).forEach(k => {
      newPriorities[k as keyof typeof newPriorities] = newPriorities[k as keyof typeof newPriorities] / total
    })
    setFormData({ ...formData, priorities: newPriorities })
  }

  const removeCurrentCrop = (crop: string) => {
    setFormData(prev => ({ ...prev, currentCrops: prev.currentCrops.filter(c => c !== crop) }))
  }

  const removeExcludedCrop = (crop: string) => {
    setFormData(prev => ({ ...prev, excludedCrops: prev.excludedCrops.filter(c => c !== crop) }))
  }

  const removeRequiredCrop = (crop: string) => {
    setFormData(prev => ({ ...prev, requiredCrops: prev.requiredCrops.filter(c => c !== crop) }))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading && rotations.length === 0) {
    return <RotationPlannerSkeleton />
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <RevealOnScroll transition="slide-up" delay={50}>
        <PageHero
          kicker="CropShift"
          title="Plan de rotation"
          subtitle="Plusieurs rotations classées selon le sol, l'eau et le revenu."
          actions={
            <Button onClick={handleOptimize} loading={loading} disabled={!selectedFarm || loading} className="hover-lift">
              <RefreshCw className="w-4 h-4 mr-2" />
              Optimize Rotations
            </Button>
          }
        />
      </RevealOnScroll>

      {/* Configuration */}
      <RevealOnScroll transition="slide-up" delay={100}>
        <Card variant="elevated" className="border-l-4 border-l-primary-500 hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-600" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 animate-fade-in">
            {selectedFarm && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 animate-slide-up">
                <p className="text-sm font-medium text-green-800">Planning for: {selectedFarm.name}</p>
                <p className="text-xs text-green-700">Current crops auto-filled from farm data</p>
              </div>
            )}

            {/* Current Crops */}
            <div>
              <label className="label mb-2">Current Crops (to diversify from)</label>
              <div className="flex flex-wrap gap-2 animate-stagger-slide-up">
                {formData.currentCrops.map((crop, i) => (
                  <CropBadge key={i} crop={crop} variant="default" removable onRemove={() => removeCurrentCrop(crop)} delay={i * 40} />
                ))}
                <Select
                  placeholder="Add crop..."
                  value={'' as string}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const val = e.target.value as string
                    if (val && !formData.currentCrops.includes(val)) {
                      setFormData({...formData, currentCrops: [...formData.currentCrops, val]})
                      e.target.value = ''
                    }
                  }}
                  options={cropOptions.filter(c => !formData.currentCrops.includes(c.value)).map(c => ({ value: c.value, label: c.label }))}
                  className="w-auto hover-lift"
                />
              </div>
            </div>

            {/* Excluded/Required Crops */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label mb-2">Excluded Crops</label>
                <div className="flex flex-wrap gap-2 animate-stagger-slide-up">
                  {formData.excludedCrops.map((crop, i) => (
                    <CropBadge key={i} crop={crop} variant="gray" removable onRemove={() => removeExcludedCrop(crop)} delay={i * 40} />
                  ))}
                  <Select
                    placeholder="Add excluded..."
                    value={'' as string}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const val = e.target.value as string
                      if (val && !formData.excludedCrops.includes(val)) {
                        setFormData({...formData, excludedCrops: [...formData.excludedCrops, val]})
                        e.target.value = ''
                      }
                    }}
                    options={cropOptions.filter(c => !formData.excludedCrops.includes(c.value)).map(c => ({ value: c.value, label: c.label }))}
                    className="w-auto hover-lift"
                  />
                </div>
              </div>
              <div>
                <label className="label mb-2">Required Crops</label>
                <div className="flex flex-wrap gap-2 animate-stagger-slide-up">
                  {formData.requiredCrops.map((crop, i) => (
                    <CropBadge key={i} crop={crop} variant="info" removable onRemove={() => removeRequiredCrop(crop)} delay={i * 40} />
                  ))}
                  <Select
                    placeholder="Add required..."
                    value={'' as string}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const val = e.target.value as string
                      if (val && !formData.requiredCrops.includes(val)) {
                        setFormData({...formData, requiredCrops: [...formData.requiredCrops, val]})
                        e.target.value = ''
                      }
                    }}
                    options={cropOptions.filter(c => !formData.requiredCrops.includes(c.value)).map(c => ({ value: c.value, label: c.label }))}
                    className="w-auto hover-lift"
                  />
                </div>
              </div>
            </div>

            {/* Priorities */}
            <div>
              <label className="label flex items-center justify-between mb-2">
                Farmer Priorities (weights sum to 100%)
                <span className="text-sm text-gray-500">
                  Total: {Math.round(Object.values(formData.priorities).reduce((a,b) => a+b, 0) * 100)}%
                </span>
              </label>
              <StaggeredContainer staggerDelay={60} transition="stagger-slide-up" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {priorityOptions.map((p, i) => (
                  <PrioritySlider
                    key={p.key}
                    priority={p}
                    value={formData.priorities[p.key as keyof typeof formData.priorities]}
                    onChange={(v) => handlePriorityChange(p.key, v)}
                    delay={i * 40}
                  />
                ))}
              </StaggeredContainer>
            </div>

            {/* Other Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <RevealOnScroll transition="slide-up" delay={0}>
                <Select
                  label="Climate Zone"
                  value={formData.climateZone}
                  onChange={(e) => setFormData({...formData, climateZone: e.target.value})}
                  options={climateZones}
                  className="hover-lift"
                />
              </RevealOnScroll>
              <RevealOnScroll transition="slide-up" delay={60}>
                <Select
                  label="Soil Type"
                  value={formData.soilType}
                  onChange={(e) => setFormData({...formData, soilType: e.target.value})}
                  options={soilTypes}
                  className="hover-lift"
                />
              </RevealOnScroll>
              <RevealOnScroll transition="slide-up" delay={120}>
                <Input
                  label="Min Rotation Years"
                  type="number"
                  min="2"
                  max="7"
                  value={formData.minYears}
                  onChange={(e) => setFormData({...formData, minYears: parseInt(e.target.value)})}
                  className="hover-lift"
                />
              </RevealOnScroll>
              <RevealOnScroll transition="slide-up" delay={180}>
                <Input
                  label="Max Rotation Years"
                  type="number"
                  min="3"
                  max="10"
                  value={formData.maxYears}
                  onChange={(e) => setFormData({...formData, maxYears: parseInt(e.target.value)})}
                  className="hover-lift"
                />
              </RevealOnScroll>
            </div>

            <div className="flex gap-2 animate-fade-in">
              <Button onClick={handleOptimize} loading={loading} className="flex-1 hover-lift" disabled={!selectedFarm || loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Find Optimal Rotations
              </Button>
              <Button variant="secondary" className="hover-lift">Save as Template</Button>
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
              <Button variant="ghost" size="sm" onClick={handleOptimize} className="ml-auto hover-lift">
                <RefreshCw className="w-4 h-4 mr-1" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </RevealOnScroll>
      )}

      {/* Quick Stats when results exist */}
      {rotations.length > 0 && showResults && (
        <RevealOnScroll transition="slide-up" delay={200}>
          <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatMetricCard icon={Trophy} iconBg="bg-yellow-600" label="Best Score" value={rotations[0].total_score.toFixed(1)} delay={0} trend={10} />
            <StatMetricCard icon={GitBranch} iconBg="bg-blue-600" label="Rotations Found" value={rotations.length} delay={80} />
            <StatMetricCard icon={Layers} iconBg="bg-purple-600" label="Avg Years" value={(rotations.reduce((a,b) => a + b.years, 0) / rotations.length).toFixed(1)} delay={160} />
            <StatMetricCard icon={BarChart3} iconBg="bg-green-600" label="Avg Diversification" value={Math.round(rotations.reduce((a,b) => a + b.scores.diversification, 0) / rotations.length)} delay={240} trend={5} />
            <StatMetricCard icon={Target} iconBg="bg-red-600" label="Avg Resilience" value={Math.round(rotations.reduce((a,b) => a + b.scores.climate_resilience, 0) / rotations.length)} delay={320} />
          </StaggeredContainer>
        </RevealOnScroll>
      )}

      {/* Tabs */}
      <RevealOnScroll transition="slide-up" delay={showResults ? 250 : 1100}>
        <Tabs defaultValue="results" onChange={setActiveTab} className="w-full" animated transition="fade">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results" icon={<Layers className="w-4 h-4" />}>Results ({rotations.length})</TabsTrigger>
            <TabsTrigger value="comparison" icon={<BarChart3 className="w-4 h-4" />}>Compare</TabsTrigger>
            <TabsTrigger value="templates" icon={<BookOpen className="w-4 h-4" />}>Templates</TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="results" transition="fade">
            <div className="mt-4 animate-fade-in">
              {rotations.length > 0 ? (
                <StaggeredContainer staggerDelay={100} transition="stagger-slide-up" className="space-y-4">
                  {rotations.map((rotation, i) => (
                    <RotationCard
                      key={rotation.rank}
                      rotation={rotation}
                      index={i}
                      onViewDetails={() => alert(rotation.details || 'Details coming soon')}
                      onExport={() => {}}
                      onSimulate={() => {}}
                    />
                  ))}
                </StaggeredContainer>
              ) : (
                <Card variant="elevated" className="hover-lift">
                  <CardContent className="p-12 text-center animate-fade-in">
                    <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Rotations Generated Yet</h3>
                    <p className="text-gray-500">Configure your preferences and click "Optimize Rotations"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" transition="fade">
            <div className="mt-4 animate-fade-in">
              {rotations.length > 0 ? (
                <ChartCard title="Side-by-Side Comparison" subtitle="Top 5 rotations compared across all metrics" icon={<BarChart3 className="w-5 h-5" />} delay={0}>
                  <div className="overflow-x-auto animate-fade-in">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="pb-2 font-medium">Metric</th>
                          {rotations.slice(0, 5).map((r) => (
                            <th key={r.rank} className="pb-2 font-medium text-center">#{r.rank} ({r.total_score.toFixed(1)})</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(rotations[0].scores).map((key) => {
                          const priority = priorityOptions.find(p => p.key === key)
                          return (
                            <tr key={key} className="border-b border-gray-100 hover:bg-gray-50 animate-fade-in">
                              <td className="py-3 font-medium flex items-center gap-2">
                                {priority?.icon && <priority.icon className="w-4 h-4 text-gray-400" />}
                                {priority?.label || key}
                              </td>
                              {rotations.slice(0, 5).map((r) => (
                                <td key={r.rank} className="py-3 text-center font-semibold" style={{ color: getScoreColor(r.scores[key as keyof typeof r.scores]) }}>
                                  {r.scores[key as keyof typeof r.scores]}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                        <tr className="bg-gray-50 font-bold animate-slide-up">
                          <td className="py-3">Total Score</td>
                          {rotations.slice(0, 5).map((r) => (
                            <td key={r.rank} className="py-3 text-center text-lg text-primary-600">{r.total_score.toFixed(1)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              ) : (
                <Card variant="elevated" className="hover-lift">
                  <CardContent className="p-12 text-center animate-fade-in">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4 animate-float" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Run Optimization to See Comparison</h3>
                    <p className="text-gray-500">Generate rotations first to compare them side by side</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" transition="fade">
            <div className="mt-4 animate-fade-in">
              <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Classic Corn-Soybean', sequence: ['corn', 'soybean'], years: 2, desc: 'Standard 2-year Midwest rotation' },
                  { name: 'Corn-Soybean-Wheat', sequence: ['corn', 'soybean', 'wheat'], years: 3, desc: '3-year rotation with winter wheat' },
                  { name: 'Corn-Soybean-Wheat-Alfalfa', sequence: ['corn', 'soybean', 'wheat', 'alfalfa', 'alfalfa'], years: 5, desc: '5-year with perennial forage' },
                  { name: 'Diverse Vegetable Rotation', sequence: ['tomato', 'pea', 'broccoli', 'bean', 'lettuce', 'spinach'], years: 6, desc: '6-year intensive vegetable rotation' },
                  { name: 'Cover Crop Intensive', sequence: ['corn', 'rye', 'soybean', 'radish', 'wheat', 'clover'], years: 6, desc: '6-year with cover crops every other year' },
                  { name: 'Dryland Resilient', sequence: ['sorghum', 'millet', 'chickpea', 'sunflower'], years: 4, desc: '4-year low-water rotation' },
                ].map((template, i) => (
                  <TemplateCard key={i} template={template} index={i} onUse={() => {}} />
                ))}
              </StaggeredContainer>
            </div>
          </TabsContent>
        </Tabs>
      </RevealOnScroll>
    </AnimatedPage>
  )
}