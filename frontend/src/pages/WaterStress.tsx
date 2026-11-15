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
  water_stress: 'Water Stress',
  drought_risk: 'Drought Risk',
  irrigation_needed: 'Irrigation Needed',
  heat_stress: 'Heat Stress',
}

const typeIcons = {
  water_stress: Droplet,
  drought_risk: Sun,
  irrigation_needed: Waves,
  heat_stress: Thermometer,
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
      addToast({ type: 'warning', title: 'No farm selected', message: 'Please select a farm first' })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.post<WaterStressResult>('/api/v1/analysis/water-stress', {
        farm_id: selectedFarm.id,
        bbox: formData.bbox,
        start_date: formData.startDate,
        end_date: formData.endDate,
        crop_type: formData.cropType,
        soil_texture: formData.soilTexture,
        irrigation_method: formData.irrigationMethod,
      })
      setResults(data)
      setActiveTab('alerts')
      addToast({ type: 'success', title: 'Analysis complete', message: 'Water stress analysis generated' })
    } catch (err: any) {
      console.error('Water stress analysis failed:', err)
      setError('Failed to generate water stress analysis')
      addToast({ type: 'error', title: 'Analysis failed', message: 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  const filteredAlerts = results?.alerts?.filter(a =>
    severityFilter.length === 0 || severityFilter.includes(a.severity)
  ) || []

  const getSeverityColor = (severity: string) => severityColors[severity as keyof typeof severityColors]
  const getSeverityIcon = (severity: string) => severityIcons[severity as keyof typeof severityIcons]

  const waterBalance = results?.water_balance

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Water Stress Monitor</h1>
          <p className="text-gray-500 mt-1">Real-time ET, LST, and soil moisture analysis with irrigation scheduling</p>
        </div>
        <Button onClick={handleAnalyze} loading={loading} disabled={!selectedFarm || loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Analysis
        </Button>
      </div>

      {/* Configuration */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFarm && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Analyzing: {selectedFarm.name}</p>
              <p className="text-xs text-blue-700">Location will be auto-filled from farm geometry</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
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
              label="Crop Type"
              value={formData.cropType}
              onChange={(e) => setFormData({...formData, cropType: e.target.value})}
              options={[
                { value: 'corn', label: 'Corn' },
                { value: 'soybean', label: 'Soybean' },
                { value: 'wheat', label: 'Wheat' },
                { value: 'sorghum', label: 'Sorghum' },
                { value: 'alfalfa', label: 'Alfalfa' },
                { value: 'cotton', label: 'Cotton' },
                { value: 'rice', label: 'Rice' },
                { value: 'vegetables', label: 'Vegetables' },
              ]}
            />
            <Select
              label="Soil Texture"
              value={formData.soilTexture}
              onChange={(e) => setFormData({...formData, soilTexture: e.target.value})}
              options={[
                { value: 'sand', label: 'Sand' },
                { value: 'loam', label: 'Loam' },
                { value: 'clay', label: 'Clay' },
                { value: 'silt', label: 'Silt' },
                { value: 'sandy_loam', label: 'Sandy Loam' },
                { value: 'clay_loam', label: 'Clay Loam' },
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
              label="Irrigation Method"
              value={formData.irrigationMethod}
              onChange={(e) => setFormData({...formData, irrigationMethod: e.target.value})}
              options={[
                { value: 'drip', label: 'Drip Irrigation' },
                { value: 'sprinkler', label: 'Sprinkler' },
                { value: 'pivot', label: 'Center Pivot' },
                { value: 'flood', label: 'Flood' },
              ]}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} loading={loading} className="flex-1" disabled={!selectedFarm || loading}>
              <Zap className="w-4 h-4 mr-2" />
              Analyze Water Stress
            </Button>
            <Button variant="secondary">Save Config</Button>
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

      {/* Quick Stats */}
      {results && waterBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current ET</p>
                  <p className="text-2xl font-bold text-gray-900">{waterBalance.current_et.toFixed(1)} mm/day</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-100">
                  <Sun className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Potential ET</p>
                  <p className="text-2xl font-bold text-gray-900">{waterBalance.potential_et.toFixed(1)} mm/day</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-100">
                  <Waves className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Soil Moisture</p>
                  <p className="text-2xl font-bold text-gray-900">{waterBalance.soil_moisture.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available Water</p>
                  <p className="text-2xl font-bold text-gray-900">{waterBalance.available_water.toFixed(1)} mm</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days to Stress</p>
                  <p className="text-2xl font-bold text-gray-900">{waterBalance.days_to_stress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-100">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="alerts" onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="irrigation">Irrigation Schedule</TabsTrigger>
          <TabsTrigger value="et_data">ET Analysis</TabsTrigger>
          <TabsTrigger value="water_balance">Water Balance</TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Water Stress Alerts</h3>
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
              <div className="space-y-3">
                {filteredAlerts.map((alert, i) => (
                  <Card key={i} className={cn('border-l-4', getSeverityColor(alert.severity).replace('bg-', 'border-l-').replace('text-', ''))}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-xl', getSeverityColor(alert.severity).replace('text-', 'bg-').replace('border-', ''))}>
                          {(() => {
                            const Icon = getSeverityIcon(alert.severity);
                            return <Icon className="w-5 h-5" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">
                                {typeLabels[alert.type as keyof typeof typeLabels]}
                              </h4>
                              <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'info'} size="sm">
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <span className="text-sm text-gray-500">{new Date(alert.detected_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-600 mt-1">{alert.message}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <span className="flex items-center gap-1 text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {alert.field_name}
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Droplet className="w-3 h-3" />
                              ET: {alert.et_value.toFixed(1)} mm (threshold: {alert.et_threshold.toFixed(1)})
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Thermometer className="w-3 h-3" />
                              LST: {alert.lst_value.toFixed(1)}°C
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Waves className="w-3 h-3" />
                              Soil: {alert.soil_moisture.toFixed(1)}%
                            </span>
                            <span className="flex items-center gap-1 text-gray-500">
                              <Cloud className="w-3 h-3" />
                              Precip: {alert.precipitation_forecast.toFixed(1)} mm
                            </span>
                          </div>
                          {alert.recommendations.length > 0 && (
                            <div className="mt-3 p-3 rounded-lg bg-gray-50">
                              <p className="text-sm font-medium text-gray-900 mb-2">Recommendations:</p>
                              <ul className="space-y-1 text-sm text-gray-600">
                                {alert.recommendations.map((rec, j) => (
                                  <li key={j} className="flex items-center gap-2">
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
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active Alerts</h3>
                  <p className="text-gray-500">No water stress alerts detected for the selected filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Irrigation Schedule Tab */}
        <TabsContent value="irrigation">
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">Irrigation Schedule</h3>
            {results?.irrigation_schedule && results.irrigation_schedule.length > 0 ? (
              <div className="space-y-3">
                {results.irrigation_schedule.map((event, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-blue-100">
                            <Waves className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{new Date(event.date).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500">Scheduled Irrigation</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Amount</p>
                          <p className="font-semibold text-gray-900">{event.amount_mm} mm</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Method</p>
                          <p className="font-medium text-gray-900 capitalize">{event.method}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Source</p>
                          <p className="font-medium text-gray-900 capitalize">{event.source}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Efficiency</p>
                          <p className="font-semibold text-gray-900">{Math.round(event.efficiency * 100)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Cost</p>
                          <p className="font-semibold text-gray-900">${event.cost.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Irrigation Schedule</h3>
                  <p className="text-gray-500">Run water stress analysis to generate irrigation recommendations</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ET Analysis Tab */}
        <TabsContent value="et_data">
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">Evapotranspiration Analysis</h3>
            {results?.et_data && results.et_data.length > 0 ? (
              <div className="space-y-4">
                <div className="h-80 flex items-end justify-center gap-2 px-4">
                  {results.et_data.slice(-30).map((d, i) => (
                    <div key={i} className="flex-1 max-w-10 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${Math.max(2, d.et_actual * 8)}px` }}
                      />
                      <div className="w-full bg-gray-200 rounded-t mt-1" style={{ height: `${Math.max(2, d.et_potential * 8)}px` }} />
                      <span className="text-xs text-gray-500 mt-2">{new Date(d.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                    <span>Actual ET</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                    <span>Potential ET</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium text-right">Actual ET (mm)</th>
                        <th className="pb-3 font-medium text-right">Potential ET (mm)</th>
                        <th className="pb-3 font-medium text-right">Stress Index</th>
                        <th className="pb-3 font-medium text-right">Deficit (mm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.et_data.slice(-14).map((d, i) => (
                        <tr key={i}>
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
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sun className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No ET Data</h3>
                  <p className="text-gray-500">Run analysis to see evapotranspiration trends</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Water Balance Tab */}
        <TabsContent value="water_balance">
          <div className="mt-4">
            {waterBalance ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Soil Water Balance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="text-sm text-gray-500 mb-2">Field Capacity</h4>
                      <p className="text-3xl font-bold text-blue-600">{waterBalance.field_capacity} mm</p>
                      <p className="text-xs text-gray-400 mt-1">Maximum water soil can hold</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="text-sm text-gray-500 mb-2">Wilting Point</h4>
                      <p className="text-3xl font-bold text-red-600">{waterBalance.wilting_point} mm</p>
                      <p className="text-xs text-gray-400 mt-1">Plants can no longer extract water</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="text-sm text-gray-500 mb-2">Plant Available Water</h4>
                      <p className="text-3xl font-bold text-green-600">{waterBalance.available_water.toFixed(1)} mm</p>
                      <p className="text-xs text-gray-400 mt-1">Water available for crop uptake</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Current Soil Moisture</span>
                            <span className="font-medium">{waterBalance.soil_moisture.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, waterBalance.soil_moisture)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Water Used (ET / PET)</span>
                            <span className="font-medium">{(waterBalance.current_et / waterBalance.potential_et * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, waterBalance.current_et / waterBalance.potential_et * 100)}%` }} />
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50">
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Days until water stress:</strong> {waterBalance.days_to_stress} days
                          </p>
                          <p className="text-xs text-gray-500">
                            Based on current ET rate of {waterBalance.current_et} mm/day and {waterBalance.available_water.toFixed(1)} mm available water
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Soil Moisture Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-end justify-center gap-2 px-4">
                        {results.et_data?.slice(-14).map((d, i) => (
                          <div key={i} className="flex-1 max-w-10 flex flex-col items-center">
                            <div
                              className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                              style={{ height: `${Math.max(2, (100 - d.stress_index * 100))}px` }}
                            />
                            <span className="text-xs text-gray-500 mt-2">{new Date(d.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-center text-sm text-gray-500 mt-3">Estimated soil moisture % (inverted stress index)</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Model Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.model_performance && [
                        { label: 'ET Accuracy', value: (results.model_performance.et_accuracy * 100).toFixed(1) + '%', desc: 'Evapotranspiration prediction accuracy' },
                        { label: 'Stress Detection F1', value: (results.model_performance.stress_detection_f1 * 100).toFixed(1) + '%', desc: 'Water stress classification F1 score' },
                      ].map((m) => (
                        <div key={m.label} className="p-4 rounded-lg bg-gray-50">
                          <p className="text-2xl font-bold text-primary-600">{m.value}</p>
                          <p className="text-sm text-gray-500 mt-1">{m.label}</p>
                          <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Droplet className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Water Balance Data</h3>
                  <p className="text-gray-500">Run analysis to see soil water balance metrics</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}