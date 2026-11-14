import { useState } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

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

const mockRotations = [
  {
    rank: 1,
    sequence: ['corn', 'soybean', 'wheat', 'alfalfa', 'alfalfa'],
    years: 5,
    scores: { water_conservation: 72, soil_health: 88, profitability: 82, pest_management: 75, climate_resilience: 78, diversification: 65 },
    total_score: 80.5,
  },
  {
    rank: 2,
    sequence: ['corn', 'soybean', 'wheat', 'canola', 'pea'],
    years: 5,
    scores: { water_conservation: 68, soil_health: 82, profitability: 85, pest_management: 80, climate_resilience: 72, diversification: 85 },
    total_score: 79.8,
  },
  {
    rank: 3,
    sequence: ['sorghum', 'soybean', 'wheat', 'sunflower', 'rye'],
    years: 5,
    scores: { water_conservation: 88, soil_health: 78, profitability: 72, pest_management: 85, climate_resilience: 82, diversification: 88 },
    total_score: 78.9,
  },
  {
    rank: 4,
    sequence: ['corn', 'soybean', 'wheat'],
    years: 3,
    scores: { water_conservation: 65, soil_health: 75, profitability: 80, pest_management: 70, climate_resilience: 68, diversification: 45 },
    total_score: 71.2,
  },
  {
    rank: 5,
    sequence: ['corn', 'soybean', 'wheat', 'alfalfa'],
    years: 4,
    scores: { water_conservation: 70, soil_health: 85, profitability: 80, pest_management: 78, climate_resilience: 75, diversification: 60 },
    total_score: 77.5,
  },
]

const priorityOptions = [
  { key: 'water_conservation', label: 'Water Conservation', icon: Droplet, color: 'text-blue-600' },
  { key: 'soil_health', label: 'Soil Health', icon: Leaf, color: 'text-green-600' },
  { key: 'profitability', label: 'Profitability', icon: DollarSign, color: 'text-yellow-600' },
  { key: 'pest_management', label: 'Pest Management', icon: Shield, color: 'text-purple-600' },
  { key: 'climate_resilience', label: 'Climate Resilience', icon: Sun, color: 'text-orange-600' },
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

export default function RotationPlanner() {
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
  const [rotations, setRotations] = useState<typeof mockRotations>(mockRotations)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('results')

  const handleOptimize = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    // In real app, would call API
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Rotation Planner</h1>
          <p className="text-gray-500 mt-1">Optimize crop rotations for resilience, profitability, and soil health</p>
        </div>
        <Button onClick={handleOptimize} loading={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Optimize Rotations
        </Button>
      </div>

      {/* Configuration */}
      <Card className="border-l-4 border-l-primary-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Crops */}
          <div className="mb-6">
            <label className="label">Current Crops (to diversify from)</label>
            <div className="flex flex-wrap gap-2">
              {formData.currentCrops.map((crop, i) => {
                const cropInfo = cropOptions.find(c => c.value === crop)
                return (
                  <div key={i} className="flex items-center gap-1">
                    <Badge variant="default" className="gap-1">
                      {cropInfo?.label || crop}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCurrentCrop(crop) }}
                      className="ml-1 p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
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
                className="w-auto"
              />
            </div>
          </div>

          {/* Excluded/Required Crops */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="label">Excluded Crops</label>
              <div className="flex flex-wrap gap-2">
                {formData.excludedCrops.map((crop, i) => {
                  const cropInfo = cropOptions.find(c => c.value === crop)
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <Badge variant="gray" className="gap-1">
                        {cropInfo?.label || crop}
                      </Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeExcludedCrop(crop) }}
                        className="ml-1 p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
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
                  className="w-auto"
                />
              </div>
            </div>
            <div>
              <label className="label">Required Crops</label>
              <div className="flex flex-wrap gap-2">
                {formData.requiredCrops.map((crop, i) => {
                  const cropInfo = cropOptions.find(c => c.value === crop)
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <Badge variant="info" className="gap-1">
                        {cropInfo?.label || crop}
                      </Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeRequiredCrop(crop) }}
                        className="ml-1 p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
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
                  className="w-auto"
                />
              </div>
            </div>
          </div>

          {/* Priorities */}
          <div className="mb-6">
            <label className="label flex items-center justify-between">
              Farmer Priorities (weights sum to 100%)
              <span className="text-sm text-gray-500">
                Total: {Math.round(Object.values(formData.priorities).reduce((a,b) => a+b, 0) * 100)}%
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
              {priorityOptions.map((p) => (
                <div key={p.key} className="p-4 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <p.icon className={cn('w-5 h-5', p.color)} />
                    <span className="font-medium text-sm">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(formData.priorities[p.key as keyof typeof formData.priorities] * 100)}
                      onChange={(e) => handlePriorityChange(p.key, parseInt(e.target.value) / 100)}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {Math.round(formData.priorities[p.key as keyof typeof formData.priorities] * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Other Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Select
              label="Climate Zone"
              value={formData.climateZone}
              onChange={(e) => setFormData({...formData, climateZone: e.target.value})}
              options={climateZones}
            />
            <Select
              label="Soil Type"
              value={formData.soilType}
              onChange={(e) => setFormData({...formData, soilType: e.target.value})}
              options={soilTypes}
            />
            <Input
              label="Min Rotation Years"
              type="number"
              min="2"
              max="7"
              value={formData.minYears}
              onChange={(e) => setFormData({...formData, minYears: parseInt(e.target.value)})}
            />
            <Input
              label="Max Rotation Years"
              type="number"
              min="3"
              max="10"
              value={formData.maxYears}
              onChange={(e) => setFormData({...formData, maxYears: parseInt(e.target.value)})}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleOptimize} loading={loading} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Find Optimal Rotations
            </Button>
            <Button variant="secondary">Save as Template</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs defaultValue="results" onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="results">Results ({rotations.length})</TabsTrigger>
          <TabsTrigger value="comparison">Compare</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <div className="space-y-4 mt-4">
            {rotations.map((rotation) => (
              <Card key={rotation.rank} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Rank & Score */}
                    <div className={cn('p-6 md:w-48 border-r border-gray-100 md:border-r md:border-b-0 text-center', rotation.rank === 1 ? 'bg-gradient-to-b from-yellow-50 to-white' : 'bg-gray-50')}>
                      <div className="text-4xl font-bold text-gray-900">{rotation.total_score.toFixed(1)}</div>
                      <Badge variant={rotation.rank <= 3 ? 'success' : 'gray'} className="mt-2">
                        #{rotation.rank}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-2">{rotation.years}-year rotation</p>
                    </div>

                    {/* Sequence */}
                    <div className="flex-1 p-6">
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {rotation.sequence.map((crop, i) => {
                          const info = cropOptions.find(c => c.value === crop)
                          return (
                            <span key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-gray-700">
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
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {Object.entries(rotation.scores).map(([key, score]) => {
                          const priority = priorityOptions.find(p => p.key === key)
                          return (
                            <div key={key} className="p-3 rounded-xl bg-gray-50 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                {priority?.icon && <priority.icon className="w-4 h-4 text-gray-400" />}
                                <span className="text-xs text-gray-500">{priority?.label || key}</span>
                              </div>
                              <div className={cn('text-2xl font-bold', getScoreColor(score))}>{score}</div>
                              <div className={cn('h-1.5 rounded-full mt-1', getScoreBg(score))}>
                                <div className="h-full rounded-full" style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 md:w-48 border-l border-gray-100 flex flex-col items-center justify-center gap-2">
                      <Button variant="primary" size="sm" className="w-full">
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-gray-600">
                        <Zap className="w-4 h-4 mr-2" />
                        Simulate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Side-by-Side Comparison</h3>
            <div className="overflow-x-auto">
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
                      <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
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
                  <tr className="bg-gray-50 font-bold">
                    <td className="py-3">Total Score</td>
                    {rotations.slice(0, 5).map((r) => (
                      <td key={r.rank} className="py-3 text-center text-lg text-primary-600">{r.total_score.toFixed(1)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Classic Corn-Soybean', sequence: ['corn', 'soybean'], years: 2, desc: 'Standard 2-year Midwest rotation' },
              { name: 'Corn-Soybean-Wheat', sequence: ['corn', 'soybean', 'wheat'], years: 3, desc: '3-year rotation with winter wheat' },
              { name: 'Corn-Soybean-Wheat-Alfalfa', sequence: ['corn', 'soybean', 'wheat', 'alfalfa', 'alfalfa'], years: 5, desc: '5-year with perennial forage' },
              { name: 'Diverse Vegetable Rotation', sequence: ['tomato', 'pea', 'broccoli', 'bean', 'lettuce', 'spinach'], years: 6, desc: '6-year intensive vegetable rotation' },
              { name: 'Cover Crop Intensive', sequence: ['corn', 'rye', 'soybean', 'radish', 'wheat', 'clover'], years: 6, desc: '6-year with cover crops every other year' },
              { name: 'Dryland Resilient', sequence: ['sorghum', 'millet', 'chickpea', 'sunflower'], years: 4, desc: '4-year low-water rotation' },
            ].map((template, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.desc}</p>
                    </div>
                    <Badge variant="info">{template.years} years</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.sequence.map((crop, idx) => {
                      const info = cropOptions.find(c => c.value === crop)
                      return (
                        <span key={idx} className="px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-700">
                          {info?.label || crop}
                          {idx < template.sequence.length - 1 && <ArrowRight className="w-3 h-3 ml-1 inline-block" />}
                        </span>
                      )
                    })}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}