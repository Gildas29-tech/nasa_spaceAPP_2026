import { useState } from 'react'
import { cn } from '../lib/utils'
import {
  Droplet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Zap,
  Settings,
  Download,
  RefreshCw,
  MapPin,
  Thermometer,
  Cloud,
  Wind,
  BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

const mockAlerts = [
  {
    id: 1,
    level: 'critical',
    title: 'Severe Water Stress - South Field 3',
    field: 'South Field 3',
    crop: 'Corn',
    time: '2 hours ago',
    indicators: {
      smap_sm: 15,
      smap_rm: 18,
      ndvi_anomaly: -0.25,
      lst_anomaly: 4.2,
      precip_deficit: -45,
      et_fraction: 0.35,
    },
    recommendation: 'Irrigate immediately. Root zone moisture at 15th percentile. Expected yield loss >15% without action within 24h.',
    lead_time: '0-24 hours',
    confidence: 0.92,
  },
  {
    id: 2,
    level: 'warning',
    title: 'Moderate Water Stress - North Field 1',
    field: 'North Field 1',
    crop: 'Corn',
    time: '5 hours ago',
    indicators: {
      smap_sm: 32,
      smap_rm: 38,
      ndvi_anomaly: -0.12,
      lst_anomaly: 2.8,
      precip_deficit: -28,
      et_fraction: 0.55,
    },
    recommendation: 'Schedule irrigation within 48h. Monitor soil moisture daily. Consider deficit irrigation if water limited.',
    lead_time: '2-5 days',
    confidence: 0.85,
  },
  {
    id: 3,
    level: 'warning',
    title: 'Heat Stress - East Field 2',
    field: 'East Field 2',
    crop: 'Wheat',
    time: '8 hours ago',
    indicators: {
      smap_sm: 45,
      smap_rm: 52,
      ndvi_anomaly: -0.08,
      lst_anomaly: 5.1,
      precip_deficit: -15,
      et_fraction: 0.62,
    },
    recommendation: 'High temperatures (>35°C) for 5 consecutive days. Monitor for pollination impact on wheat. Consider evaporative cooling if available.',
    lead_time: '3-7 days',
    confidence: 0.78,
  },
  {
    id: 4,
    level: 'info',
    title: 'Optimal Conditions - Central Field 4',
    field: 'Central Field 4',
    crop: 'Alfalfa',
    time: '1 day ago',
    indicators: {
      smap_sm: 72,
      smap_rm: 78,
      ndvi_anomaly: 0.15,
      lst_anomaly: -1.2,
      precip_deficit: 12,
      et_fraction: 0.85,
    },
    recommendation: 'No action needed. Soil moisture and vegetation indices are optimal for current growth stage.',
    lead_time: 'N/A',
    confidence: 0.95,
  },
]

const mockIrrigationSchedule = [
  { field: 'South Field 3', crop: 'Corn', priority: 'Urgent', recommended_date: 'Today', amount: '1.5 in', method: 'Pivot', reason: 'Critical root zone depletion' },
  { field: 'North Field 1', crop: 'Corn', priority: 'High', recommended_date: 'Tomorrow', amount: '1.0 in', method: 'Pivot', reason: 'Approaching stress threshold' },
  { field: 'East Field 2', crop: 'Wheat', priority: 'Medium', recommended_date: 'In 3 days', amount: '0.8 in', method: 'Drip', reason: 'Heat stress mitigation' },
  { field: 'West Field 1', crop: 'Soybean', priority: 'Low', recommended_date: 'In 5 days', amount: '0.5 in', method: 'Pivot', reason: 'Maintenance irrigation' },
]

const indicatorDetails = [
  { key: 'smap_sm', label: 'SMAP Surface SM', icon: Droplet, desc: 'Surface soil moisture (0-5cm)', unit: 'percentile', good: '>60', warn: '30-60', critical: '<30' },
  { key: 'smap_rm', label: 'SMAP Root Zone SM', icon: Droplet, desc: 'Root zone soil moisture (0-100cm)', unit: 'percentile', good: '>50', warn: '25-50', critical: '<25' },
  { key: 'ndvi_anomaly', label: 'NDVI Anomaly', icon: BarChart3, desc: 'Vegetation health deviation from normal', unit: 'index', good: '>-0.1', warn: '-0.1 to -0.2', critical: '<-0.2' },
  { key: 'lst_anomaly', label: 'LST Anomaly', icon: Thermometer, desc: 'Land surface temperature deviation', unit: '°C', good: '<1', warn: '1-3', critical: '>3' },
  { key: 'precip_deficit', label: 'Precip Deficit', icon: Cloud, desc: 'Precipitation deficit vs 30-yr normal', unit: '%', good: '>-10', warn: '-10 to -30', critical: '<-30' },
  { key: 'et_fraction', label: 'ET Fraction', icon: Wind, desc: 'Actual ET / Potential ET', unit: 'ratio', good: '>0.7', warn: '0.4-0.7', critical: '<0.4' },
]

export default function WaterStress() {
  const [formData, setFormData] = useState({
    bbox: [-122.5, 37.5, -121.5, 38.5],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    alertThreshold: 'warning',
    includeForecast: true,
  })
  const [alerts, setAlerts] = useState<typeof mockAlerts>(mockAlerts)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('alerts')
  const [selectedAlert, setSelectedAlert] = useState<typeof mockAlerts[0] | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setActiveTab('alerts')
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200'
      case 'warning': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'info': return <CheckCircle className="w-5 h-5" />
      default: return <CheckCircle className="w-5 h-5" />
    }
  }

  const getIndicatorStatus = (key: string, value: number) => {
    const detail = indicatorDetails.find(d => d.key === key)
    if (!detail) return 'unknown'
    if (key === 'ndvi_anomaly' || key === 'precip_deficit') {
      if (value > -0.1) return 'good'
      if (value > -0.2) return 'warn'
      return 'critical'
    }
    if (key === 'lst_anomaly') {
      if (value < 1) return 'good'
      if (value < 3) return 'warn'
      return 'critical'
    }
    if (key === 'et_fraction') {
      if (value > 0.7) return 'good'
      if (value > 0.4) return 'warn'
      return 'critical'
    }
    if (key === 'smap_sm' || key === 'smap_rm') {
      if (value > 50) return 'good'
      if (value > 25) return 'warn'
      return 'critical'
    }
    return 'unknown'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'warn': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Water Stress Monitor</h1>
          <p className="text-gray-500 mt-1">Early drought detection, irrigation scheduling, and water stress alerts</p>
        </div>
        <Button onClick={handleAnalyze} loading={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Run Analysis
        </Button>
      </div>

      {/* Configuration */}
      <Card className="border-l-4 border-l-primary-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
              label="Alert Threshold"
              value={formData.alertThreshold}
              onChange={(e) => setFormData({...formData, alertThreshold: e.target.value})}
              options={[
                { value: 'info', label: 'Info (All)' },
                { value: 'warning', label: 'Warning & Critical' },
                { value: 'critical', label: 'Critical Only' },
              ]}
            />
            <div className="flex items-end">
              <label className="block w-full mb-1 text-sm font-medium text-gray-700">Include Forecast</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeForecast}
                  onChange={(e) => setFormData({...formData, includeForecast: e.target.checked})}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">7-day forecast</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAnalyze} loading={loading} className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              Analyze Water Stress
            </Button>
            <Button variant="secondary">Save Config</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Critical Alerts', value: alerts.filter(a => a.level === 'critical').length, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
          { label: 'Warnings', value: alerts.filter(a => a.level === 'warning').length, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100' },
          { label: 'Fields OK', value: alerts.filter(a => a.level === 'info').length, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
          { label: 'Total Fields', value: alerts.length, icon: BarChart3, color: 'text-blue-600 bg-blue-100' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alerts" onChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="irrigation">Irrigation Schedule</TabsTrigger>
          <TabsTrigger value="indicators">Indicators Detail</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <div className="mt-4 space-y-4">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                className={cn('border-l-4 transition-all',
                  alert.level === 'critical' && 'border-l-red-500',
                  alert.level === 'warning' && 'border-l-orange-500',
                  alert.level === 'info' && 'border-l-green-500',
                  selectedAlert?.id === alert.id && 'ring-2 ring-primary-500'
                )}
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-full flex-shrink-0', getLevelColor(alert.level))}>
                      {getLevelIcon(alert.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>{alert.field} • {alert.crop}</span>
                            <Badge
                              variant={
                                alert.level === 'critical' ? 'danger' :
                                alert.level === 'warning' ? 'warning' : 'success'
                              }
                              size="sm"
                            >
                              {alert.level.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{alert.time}</p>
                          <p className="text-xs text-gray-400">Confidence: {Math.round(alert.confidence * 100)}%</p>
                        </div>
                      </div>

                      {/* Quick Indicators */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(alert.indicators).map(([key, value]) => {
                          const detail = indicatorDetails.find(d => d.key === key)
                          const status = getIndicatorStatus(key, value as number)
                          return (
                            <Badge key={key} variant={status === 'good' ? 'success' : status === 'warn' ? 'warning' : 'danger'} size="sm">
                              {detail?.label}: {typeof value === 'number' ? value.toFixed(1) : value}
                            </Badge>
                          )
                        })}
                      </div>

                      {selectedAlert?.id === alert.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <p className="font-medium text-gray-900 mb-2">Recommendation:</p>
                          <p className="text-gray-700">{alert.recommendation}</p>
                          <div className="flex gap-4 mt-3 text-sm text-gray-500">
                            <span><Clock className="w-4 h-4 inline mr-1" /> Lead time: {alert.lead_time}</span>
                            <span><Calendar className="w-4 h-4 inline mr-1" /> Detected: {alert.time}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'success'}>
                        {alert.level.toUpperCase()}
                      </Badge>
                      {selectedAlert?.id !== alert.id && (
                        <Button variant="ghost" size="sm">View Details</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="irrigation">
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Irrigation Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-medium">Field</th>
                    <th className="pb-3 font-medium">Crop</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockIrrigationSchedule.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 font-medium">{item.field}</td>
                      <td className="py-3">{item.crop}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            item.priority === 'Urgent' ? 'danger' :
                            item.priority === 'High' ? 'warning' :
                            item.priority === 'Medium' ? 'info' : 'success'
                          }
                          size="sm"
                        >
                          {item.priority}
                        </Badge>
                      </td>
                      <td className="py-3">{item.recommended_date}</td>
                      <td className="py-3 font-medium">{item.amount}</td>
                      <td className="py-3">{item.method}</td>
                      <td className="py-3 text-gray-600">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Water Needed', value: '3.8 in', icon: Droplet, color: 'text-blue-600' },
                { label: 'Estimated Cost', value: '$2,840', icon: BarChart3, color: 'text-green-600' },
                { label: 'Urgent Fields', value: '1', icon: AlertTriangle, color: 'text-red-600' },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="p-6 text-center">
                    <div className={cn('p-3 rounded-xl mb-3', stat.color.replace('text-', 'bg-').replace('600', '100'))}>
                      <stat.icon className={cn('w-6 h-6', stat.color)} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="indicators">
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Water Stress Indicators (Selected Field)</h3>

            <div className="mb-6 flex gap-2">
              {alerts.map((alert) => (
                <Button
                  key={alert.id}
                  variant={selectedAlert?.id === alert.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedAlert(alert)}
                >
                  {alert.field} ({alert.level})
                </Button>
              ))}
            </div>

            {selectedAlert && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {indicatorDetails.map((indicator) => {
                  const value = selectedAlert.indicators[indicator.key as keyof typeof selectedAlert.indicators]
                  const status = getIndicatorStatus(indicator.key, value as number)
                  return (
                    <Card key={indicator.key} className={cn('border-l-4',
                      status === 'good' && 'border-l-green-500',
                      status === 'warn' && 'border-l-yellow-500',
                      status === 'critical' && 'border-l-red-500'
                    )}>
                      <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg', getStatusColor(status))}>
                            <indicator.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 text-sm">{indicator.label}</h3>
                            <p className="text-xs text-gray-500">{indicator.desc}</p>
                          </div>
                        </div>
                        <Badge variant={status === 'good' ? 'success' : status === 'warn' ? 'warning' : 'danger'} size="sm">
                          {status.toUpperCase()}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-3xl font-bold text-gray-900 mb-2">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                          <span className="text-lg font-normal text-gray-500 ml-1">{indicator.unit}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0,
                                indicator.key === 'et_fraction' ? (value as number) * 100 :
                                indicator.key === 'ndvi_anomaly' ? ((value as number) + 0.5) * 100 :
                                indicator.key === 'lst_anomaly' ? Math.max(0, 100 - (value as number) * 20) :
                                indicator.key === 'precip_deficit' ? Math.max(0, 100 + (value as number) * 2) :
                                (value as number)
                              ))}%`,
                              background: status === 'good' ? '#22c55e' : status === 'warn' ? '#eab308' : '#ef4444'
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Good: {indicator.good} | Warn: {indicator.warn} | Critical: {indicator.critical}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Composite Score */}
            {selectedAlert && (
              <Card className="mt-6 border-l-4 border-l-primary-500">
                <CardHeader>
                  <CardTitle>Composite Water Stress Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="text-center md:col-span-1">
                      <div className="relative inline-block">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="58" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle
                            cx="64" cy="64" r="58"
                            fill="none"
                            stroke="url(#stressGradient)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${(1 - (selectedAlert.indicators.et_fraction as number)) * 364.4} 364.4`}
                          />
                          <defs>
                            <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#22c55e" />
                              <stop offset="50%" stopColor="#eab308" />
                              <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-gray-900">
                            {Math.round((1 - (selectedAlert.indicators.et_fraction as number)) * 100)}
                          </span>
                          <span className="text-sm text-gray-500">WSI</span>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <p className="text-gray-700">
                        The Water Stress Index (WSI) combines all indicators into a single 0-100 score.
                        Current score indicates <strong className="text-gray-900">
                          {selectedAlert.indicators.et_fraction < 0.4 ? 'severe stress' :
                           selectedAlert.indicators.et_fraction < 0.7 ? 'moderate stress' : 'minimal stress'}
                        </strong>.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gray-50">
                          <p className="text-sm text-gray-500">Contributing Factors</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(selectedAlert.indicators).map(([key, value]) => {
                              const status = getIndicatorStatus(key, value as number)
                              if (status !== 'good') {
                                const detail = indicatorDetails.find(d => d.key === key)
                                return (
                                  <Badge key={key} variant={status === 'warn' ? 'warning' : 'danger'} size="sm">
                                    {detail?.label}
                                  </Badge>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-gray-50">
                          <p className="text-sm text-gray-500">Recommended Action</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{selectedAlert.recommendation.split('.')[0]}.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  7-Day Weather & Stress Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">High / Low</th>
                        <th className="pb-3 font-medium">Precip</th>
                        <th className="pb-3 font-medium">ET₀</th>
                        <th className="pb-3 font-medium">SMAP SM Trend</th>
                        <th className="pb-3 font-medium">Stress Risk</th>
                        <th className="pb-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        { date: 'Today', high: 34, low: 18, precip: 0, et0: 6.2, sm_trend: -2, risk: 'Critical', action: 'Irrigate now' },
                        { date: 'Tomorrow', high: 36, low: 20, precip: 0, et0: 6.8, sm_trend: -3, risk: 'Critical', action: 'Irrigate AM' },
                        { date: 'Day 3', high: 35, low: 19, precip: 5, et0: 5.9, sm_trend: -1, risk: 'High', action: 'Monitor' },
                        { date: 'Day 4', high: 32, low: 17, precip: 15, et0: 4.5, sm_trend: 3, risk: 'Moderate', action: 'Delay irrigation' },
                        { date: 'Day 5', high: 29, low: 15, precip: 25, et0: 3.8, sm_trend: 8, risk: 'Low', action: 'None' },
                        { date: 'Day 6', high: 28, low: 14, precip: 10, et0: 4.1, sm_trend: 5, risk: 'Low', action: 'None' },
                        { date: 'Day 7', high: 30, low: 16, precip: 0, et0: 5.2, sm_trend: -1, risk: 'Moderate', action: 'Monitor' },
                      ].map((day, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 font-medium">{day.date}</td>
                          <td className="py-3">{day.high}° / {day.low}°</td>
                          <td className="py-3">{day.precip} mm</td>
                          <td className="py-3">{day.et0} mm</td>
                          <td className="py-3">
                            <span className={cn('font-medium', day.sm_trend > 0 ? 'text-green-600' : day.sm_trend < -2 ? 'text-red-600' : 'text-orange-600')}>
                              {day.sm_trend > 0 ? '+' : ''}{day.sm_trend}%
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                day.risk === 'Critical' ? 'danger' :
                                day.risk === 'High' ? 'warning' :
                                day.risk === 'Moderate' ? 'info' : 'success'
                              }
                              size="sm"
                            >
                              {day.risk}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-gray-600">{day.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}