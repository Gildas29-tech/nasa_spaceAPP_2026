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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { api } from '../lib/api'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'

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
  const [activeTab, setActiveTab] = useState('results')
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      addToast({ type: 'warning', title: 'No farm selected', message: 'Please select a farm first' })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.post<SoilHealthResult>('/api/v1/analysis/soil-health', {
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
      setActiveTab('results')
      addToast({ type: 'success', title: 'Analysis complete', message: 'Soil health assessment finished' })
    } catch (err: any) {
      console.error('Soil health analysis failed:', err)
      setError('Failed to run soil health analysis')
      addToast({ type: 'error', title: 'Analysis failed', message: 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Soil Health Analysis</h1>
          <p className="text-gray-500 mt-1">Comprehensive soil health assessment using NASA Earth observations</p>
        </div>
        <Button onClick={handleAnalyze} loading={loading} disabled={!selectedFarm || loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Analysis
        </Button>
      </div>

      {/* Configuration Form */}
      <Card className="border-l-4 border-l-primary-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFarm && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-800">Analyzing farm: {selectedFarm.name}</p>
              <p className="text-xs text-green-700">Location will be auto-filled from farm geometry</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="West Longitude"
              type="number"
              step="0.001"
              value={formData.bbox[0]}
              onChange={(e) => setFormData({...formData, bbox: [parseFloat(e.target.value), formData.bbox[1], formData.bbox[2], formData.bbox[3]]})}
              placeholder="-122.5"
            />
            <Input
              label="South Latitude"
              type="number"
              step="0.001"
              value={formData.bbox[1]}
              onChange={(e) => setFormData({...formData, bbox: [formData.bbox[0], parseFloat(e.target.value), formData.bbox[2], formData.bbox[3]]})}
              placeholder="37.5"
            />
            <Input
              label="East Longitude"
              type="number"
              step="0.001"
              value={formData.bbox[2]}
              onChange={(e) => setFormData({...formData, bbox: [formData.bbox[0], formData.bbox[1], parseFloat(e.target.value), formData.bbox[3]]})}
              placeholder="-121.5"
            />
            <Input
              label="North Latitude"
              type="number"
              step="0.001"
              value={formData.bbox[3]}
              onChange={(e) => setFormData({...formData, bbox: [formData.bbox[0], formData.bbox[1], formData.bbox[2], parseFloat(e.target.value)]})}
              placeholder="38.5"
            />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            />
            <Select
              label="Soil Texture"
              value={formData.soilTexture}
              onChange={(e) => setFormData({...formData, soilTexture: e.target.value})}
              options={soilTextureOptions}
            />
            <Input
              label="Soil pH"
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
              label="Organic Matter (%)"
              type="number"
              step="0.1"
              value={formData.organicMatter}
              onChange={(e) => setFormData({...formData, organicMatter: e.target.value})}
              placeholder="Optional - leave blank to estimate"
            />
            <Select
              label="Climate Zone"
              value={formData.climateZone}
              onChange={(e) => setFormData({...formData, climateZone: e.target.value})}
              options={climateZoneOptions}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleAnalyze} loading={loading} className="flex-1" disabled={!selectedFarm || loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Analyze Soil Health
            </Button>
            <Button variant="secondary" onClick={() => {}}>Save Configuration</Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleAnalyze} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {results && (
        <>
          {/* Results Tabs */}
          <Tabs defaultValue="results" onChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="factors">Factor Details</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="data">Data Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Overall Score</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-8">
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
                        <span className="text-5xl font-bold text-gray-900">{results.overall_score}</span>
                        <Badge className={cn('mt-2', getGradeColor(results.grade))}>
                          Grade {results.grade}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-500">Confidence: {Math.round(results.confidence * 100)}%</p>
                      <p className="text-gray-500">Percentile: {results.percentiles.overall}th</p>
                      <p className="text-gray-500">Assessed: {results.assessment_date}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={handleAnalyze}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-run
                    </Button>
                  </CardFooter>
                </Card>

                {/* Factor Scores */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Factor Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {factorDetails.map((factor) => {
                        const score = results.factors[factor.key as keyof typeof results.factors]
                        return (
                          <div key={factor.key} className="p-4 rounded-xl bg-gray-50">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn('p-2 rounded-lg', factor.bg)}>
                                <factor.icon className={cn('w-5 h-5', factor.color)} />
                              </div>
                              <span className="font-medium text-gray-900 text-sm">{factor.label}</span>
                            </div>
                            <div className="flex items-end justify-between">
                              <span className="text-3xl font-bold text-gray-900">{score}</span>
                              <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'} size="sm">
                                {score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor'}
                              </Badge>
                            </div>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${score}%`, background: `linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{factor.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="factors">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {factorDetails.map((factor) => {
                  const score = results.factors[factor.key as keyof typeof results.factors]
                  const percentile = results.percentiles[factor.key.replace('_score', '') as keyof typeof results.percentiles] || 50
                  return (
                    <Card key={factor.key}>
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
                        <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'}>
                          {score}/100
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Regional Percentile</p>
                            <p className="text-2xl font-bold text-gray-900">{percentile}th</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Confidence Contribution</p>
                            <p className="text-2xl font-bold text-gray-900">{Math.round(score * results.confidence)}%</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${score}%`, background: `linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          {score >= 80 ? '✅ Optimal' : score >= 60 ? '⚠️ Needs Attention' : '🔴 Critical'}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="recommendations">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Actionable Recommendations</h2>
                {results.recommendations.map((rec, i) => (
                  <Card key={i} className="border-l-4 border-l-primary-500">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-primary-600" />
                        </div>
                        <p className="text-gray-700 mt-0.5">{rec}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="data">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Data Sources Used</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'SMAP', full: 'Soil Moisture Active Passive', status: results.data_sources.includes('SMAP') ? 'Used' : 'Available', vars: ['Surface Soil Moisture', 'Root Zone Soil Moisture'], desc: 'NASA JPL • 9km daily • Global' },
                    { name: 'MODIS', full: 'Moderate Resolution Imaging Spectroradiometer', status: results.data_sources.includes('MODIS') ? 'Used' : 'Available', vars: ['NDVI', 'EVI', 'LST'], desc: 'NASA Terra/Aqua • 250m-1km • 16-day/8-day' },
                    { name: 'Landsat 8/9', full: 'Landsat Collection 2 Level-2', status: results.data_sources.includes('Landsat') ? 'Used' : 'Available', vars: ['Surface Reflectance', 'NDVI', 'SAVI'], desc: 'USGS/NASA • 30m • 16-day' },
                    { name: 'GPM/IMERG', full: 'Global Precipitation Measurement', status: results.data_sources.includes('GPM') ? 'Used' : 'Available', vars: ['Precipitation Rate', 'Accumulation'], desc: 'NASA/JAXA • 0.1° • 30-min' },
                    { name: 'ECOSTRESS', full: 'ECOsystem Spaceborne Thermal Radiometer', status: results.data_sources.includes('ECOSTRESS') ? 'Used' : 'Available', vars: ['ET', 'Water Stress Index', 'ESI'], desc: 'NASA JPL • 70m • ~4-day revisit' },
                    { name: 'OpenET', full: 'Open Evapotranspiration', status: results.data_sources.includes('OpenET') ? 'Used' : 'Available', vars: ['Field-scale ET', 'ET Reference'], desc: 'NASA/USGS/DRI • 30m • Monthly' },
                  ].map((source, i) => (
                    <Card key={i} className={source.status === 'Used' ? 'border-l-4 border-l-green-500' : ''}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {source.name}
                              <Badge variant={source.status === 'Used' ? 'success' : 'gray'} size="sm">
                                {source.status}
                              </Badge>
                            </h3>
                            <p className="text-sm text-gray-500">{source.full}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{source.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {source.vars.map((v) => (
                            <Badge key={v} variant="gray" size="sm">{v}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}