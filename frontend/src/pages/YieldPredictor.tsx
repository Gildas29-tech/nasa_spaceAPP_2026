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
      const data = await api.post<YieldResult>('/api/v1/analysis/yield', {
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
      setActiveTab('predictions')
      addToast({ type: 'success', title: 'Prediction complete', message: 'Yield predictions generated' })
    } catch (err: any) {
      console.error('Yield prediction failed:', err)
      setError('Failed to generate yield predictions')
      addToast({ type: 'error', title: 'Prediction failed', message: 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

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

  const predictions = results?.predictions || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Yield Predictor</h1>
          <p className="text-gray-500 mt-1">ML-powered yield predictions with confidence intervals and scenario analysis</p>
        </div>
        <Button onClick={handlePredict} loading={loading} disabled={!selectedFarm || loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Predictions
        </Button>
      </div>

      {/* Configuration */}
      <Card className="border-l-4 border-l-primary-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Prediction Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFarm && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-800">Predicting for: {selectedFarm.name}</p>
              <p className="text-xs text-green-700">Location will be auto-filled from farm geometry</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <Select
              label="Crop"
              value={formData.crop}
              onChange={(e) => setFormData({...formData, crop: e.target.value})}
              options={cropOptions}
            />
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
            <Select
              label="Model"
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
              options={soilTypes}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              label="Organic Matter (%)"
              type="number"
              step="0.1"
              value={formData.organicMatter}
              onChange={(e) => setFormData({...formData, organicMatter: parseFloat(e.target.value)})}
              placeholder="3.2"
            />
            <Select
              label="Climate Zone"
              value={formData.climateZone}
              onChange={(e) => setFormData({...formData, climateZone: e.target.value})}
              options={climateZones}
            />
            <div className="flex items-end">
              <label className="block w-full mb-1 text-sm font-medium text-gray-700">Scenarios</label>
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
            <Button onClick={handlePredict} loading={loading} className="flex-1" disabled={!selectedFarm || loading}>
              <Zap className="w-4 h-4 mr-2" />
              Predict Yields
            </Button>
            <Button variant="secondary">Save Scenario</Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handlePredict} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Tabs */}
      <Tabs defaultValue="predictions" onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Comparison</TabsTrigger>
          <TabsTrigger value="features">Feature Importance</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions">
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {predictions.length > 0 ? (
              predictions.map((pred, i) => (
                <Card key={i} className={cn('relative', i === 0 && 'ring-2 ring-primary-500')}>
                  {i === 0 && (
                    <div className="absolute -top-2 -right-2">
                      <Badge variant="success" size="sm">Best Estimate</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{pred.scenario}</h3>
                      <Badge variant="info" size="sm">{pred.model}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-1">Predicted Yield</p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className={cn('text-5xl font-bold', getYieldColor(pred.predicted_yield, regionalBenchmarks))}>
                          {pred.predicted_yield.toFixed(1)}
                        </span>
                        <span className="text-xl text-gray-500 mb-4">{pred.unit}</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-sm mt-2">
                        <span className={cn('font-medium', getUncertaintyColor(pred.uncertainty))}>
                          ±{pred.uncertainty.toFixed(1)}% uncertainty
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 mb-4">
                      <p className="text-sm text-gray-600 mb-2">95% Confidence Interval</p>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{pred.confidence_interval[0].toFixed(1)}</p>
                          <p className="text-xs text-gray-500">Lower</p>
                        </div>
                        <div className="h-8 w-px bg-gray-300" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary-600">{pred.predicted_yield.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">Expected</p>
                        </div>
                        <div className="h-8 w-px bg-gray-300" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{pred.confidence_interval[1].toFixed(1)}</p>
                          <p className="text-xs text-gray-500">Upper</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                        <div className="h-full bg-primary-500 rounded-full" style={{
                          left: `${((pred.predicted_yield - pred.confidence_interval[0]) / (pred.confidence_interval[1] - pred.confidence_interval[0])) * 100}%`,
                          width: `${((pred.confidence_interval[1] - pred.predicted_yield) / (pred.confidence_interval[1] - pred.confidence_interval[0])) * 100}%`
                        }} />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Crop: <span className="font-medium text-gray-900 capitalize">{pred.crop}</span></span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No predictions generated yet</p>
                <p className="text-sm mt-1">Configure your parameters and click "Predict Yields"</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scenarios">
          <div className="mt-4">
            {predictions.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">Metric</th>
                        {predictions.map((p) => (
                          <th key={p.scenario} className="pb-3 font-medium text-center">{p.scenario}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 font-medium">Predicted Yield</td>
                        {predictions.map((p) => (
                          <td key={p.scenario} className="py-3 text-center font-bold" style={{ color: getYieldColor(p.predicted_yield, regionalBenchmarks) }}>
                            {p.predicted_yield.toFixed(1)} {p.unit}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Uncertainty</td>
                        {predictions.map((p) => (
                          <td key={p.scenario} className="py-3 text-center" style={{ color: getUncertaintyColor(p.uncertainty) }}>
                            ±{p.uncertainty.toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Confidence Interval</td>
                        {predictions.map((p) => (
                          <td key={p.scenario} className="py-3 text-center text-sm">
                            [{p.confidence_interval[0].toFixed(1)}, {p.confidence_interval[1].toFixed(1)}]
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Model</td>
                        {predictions.map((p) => (
                          <td key={p.scenario} className="py-3 text-center text-sm text-gray-600">{p.model}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Scenario Insights */}
                {predictions.length >= 3 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-green-100">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Optimistic Upside</h3>
                            <p className="text-sm text-gray-500">
                              {((predictions[1].predicted_yield - predictions[0].predicted_yield) / predictions[0].predicted_yield * 100).toFixed(1)}%
                              yield increase with favorable conditions
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-red-100">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Pessimistic Risk</h3>
                            <p className="text-sm text-gray-500">
                              {((predictions[0].predicted_yield - predictions[2].predicted_yield) / predictions[0].predicted_yield * 100).toFixed(1)}%
                              yield loss under drought conditions
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-blue-100">
                            <Target className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Spread</h3>
                            <p className="text-sm text-gray-500">
                              {predictions[1].predicted_yield - predictions[2].predicted_yield} {predictions[0].unit}
                              range between scenarios
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">Generate predictions to see scenario comparison</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="features">
          <div className="mt-4">
            {predictions.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Importance (Best Model)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(predictions[0].features_importance).map(([feature, importance]) => (
                    <Card key={feature}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium capitalize text-gray-900">{feature.replace('_', ' ')}</span>
                          <Badge variant="info">{(importance * 100).toFixed(1)}%</Badge>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                            style={{ width: `${importance * 100}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {results?.model_performance && [
                      { label: 'R² Score', value: results.model_performance.r2.toFixed(2), desc: 'Coefficient of determination' },
                      { label: 'RMSE', value: `${results.model_performance.rmse.toFixed(1)} ${predictions[0]?.unit || 'bu/acre'}`, desc: 'Root mean squared error' },
                      { label: 'MAE', value: `${results.model_performance.mae.toFixed(1)} ${predictions[0]?.unit || 'bu/acre'}`, desc: 'Mean absolute error' },
                    ].map((m) => (
                      <Card key={m.label}>
                        <CardContent className="p-6 text-center">
                          <p className="text-3xl font-bold text-primary-600">{m.value}</p>
                          <p className="text-sm text-gray-500 mt-1">{m.label}</p>
                          <p className="text-xs text-gray-400 mt-2">{m.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">Generate predictions to see feature importance</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="benchmarks">
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Benchmarks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regionalBenchmarks.map((bench, i) => (
                <Card key={i} className={cn('text-center', i === 1 && 'ring-2 ring-primary-500')}>
                  <CardContent className="p-6">
                    {i === 1 && <Badge variant="info" className="mb-3">Your Region</Badge>}
                    <h3 className="font-semibold text-gray-900 mb-2">{bench.region}</h3>
                    <div className="text-3xl font-bold text-gray-900">{bench.yield}</div>
                    <div className="text-sm text-gray-500">{bench.unit}</div>
                    {predictions[0] && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className={cn('text-sm font-medium', getYieldColor(predictions[0].predicted_yield, regionalBenchmarks))}>
                          vs Your Prediction:
                          {((predictions[0].predicted_yield - bench.yield) / bench.yield * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Historical Yield Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {results?.historical_trends && results.historical_trends.length > 0 ? (
                  <div className="h-64 flex items-end justify-center gap-4 px-4">
                    {results.historical_trends.map((y, i) => (
                      <div key={i} className="flex-1 max-w-16 flex flex-col items-center">
                        <div
                          className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                          style={{ height: `${Math.max(0, (y.yield - 150) * 3)}px` }}
                        />
                        <span className="text-xs text-gray-500 mt-2">{y.year}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-end justify-center gap-4 px-4">
                    {[155, 162, 158, 168, 172, 165, 178, 175, 182, 178].map((y, i) => (
                      <div key={i} className="flex-1 max-w-16 flex flex-col items-center">
                        <div
                          className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600"
                          style={{ height: `${(y - 150) * 3}px` }}
                        />
                        <span className="text-xs text-gray-500 mt-2">{2014 + i}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-center text-sm text-gray-500 mt-4">
                  County average yields 2014-2023. Your predicted yield: {predictions[0]?.predicted_yield.toFixed(1)} {predictions[0]?.unit}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}