import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  Activity,
  AlertTriangle,
  Droplet,
  Leaf,
  RefreshCw,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  Cloud,
  Sun,
  FileText,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import HarvestVision from './HarvestVision'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'

interface Farm {
  id: string
  name: string
  crop: string
  area: string
  location: string
}

const mockFarms: Farm[] = [
  { id: '1', name: 'North Field 1', crop: 'Corn', area: '45 ha', location: 'Iowa, USA' },
  { id: '2', name: 'South Field 3', crop: 'Soybean', area: '32 ha', location: 'Iowa, USA' },
  { id: '3', name: 'East Field 2', crop: 'Wheat', area: '28 ha', location: 'Nebraska, USA' },
  { id: '4', name: 'West Field 1', crop: 'Corn', area: '52 ha', location: 'Kansas, USA' },
  { id: '5', name: 'Central Field 4', crop: 'Alfalfa', area: '18 ha', location: 'Iowa, USA' },
]

const mockAlerts = [
  { id: 1, level: 'critical', type: 'water-stress', title: 'Stress hydrique sévère', farm: 'South Field 3', time: '2h ago', desc: 'Humidité zone racinaire 15e percentile. Irrigation requise sous 24h.', value: '0.18 m³/m³' },
  { id: 2, level: 'warning', type: 'heat', title: 'Stress thermique modéré', farm: 'North Field 1', time: '5h ago', desc: '5 jours consécutifs >35°C. Surveillance pollinisation.', value: '37.2°C max' },
  { id: 3, level: 'warning', type: 'vegetation', title: 'Baisse NDVI anormale', farm: 'East Field 2', time: '1j ago', desc: 'NDVI -18% en 2 semaines. Investigation recommandée.', value: '0.65 → 0.53' },
  { id: 4, level: 'info', type: 'rotation', title: 'Fenêtre semis ouverture', farm: 'West Field 1', time: '2j ago', desc: 'Conditions optimales blé d\'hiver dans 7-10 jours.', value: 'Sol 12°C' },
  { id: 5, level: 'info', type: 'precipitation', title: 'Précipitations prévues', farm: 'Toutes', time: '3j ago', desc: '25-40mm attendus sur 72h. Reporter traitements.', value: '80% probabilité' },
]

const mockWaterData = {
  precipitation: [
    { month: 'Jan', value: 45, normal: 55 },
    { month: 'Fév', value: 38, normal: 50 },
    { month: 'Mar', value: 62, normal: 65 },
    { month: 'Avr', value: 78, normal: 85 },
    { month: 'Mai', value: 95, normal: 95 },
    { month: 'Juin', value: 88, normal: 105 },
    { month: 'Juil', value: 42, normal: 95 },
    { month: 'Août', value: 35, normal: 85 },
    { month: 'Sep', value: 55, normal: 75 },
    { month: 'Oct', value: 68, normal: 70 },
    { month: 'Nov', value: 52, normal: 60 },
    { month: 'Déc', value: 48, normal: 55 },
  ],
  soilMoisture: [
    { date: '2024-01-01', surface: 0.28, root: 0.32, normal: 0.35 },
    { date: '2024-01-08', surface: 0.26, root: 0.31, normal: 0.34 },
    { date: '2024-01-15', surface: 0.24, root: 0.30, normal: 0.34 },
    { date: '2024-01-22', surface: 0.22, root: 0.29, normal: 0.33 },
    { date: '2024-01-29', surface: 0.20, root: 0.28, normal: 0.33 },
  ],
  et: [
    { date: '2024-01-01', et0: 2.1, eta: 1.6 },
    { date: '2024-01-08', et0: 2.3, eta: 1.7 },
    { date: '2024-01-15', et0: 2.5, eta: 1.8 },
    { date: '2024-01-22', et0: 2.8, eta: 1.9 },
    { date: '2024-01-29', et0: 3.1, eta: 2.1 },
  ]
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 bg-red-100 border-red-400'
    case 'warning': return 'text-orange-600 bg-orange-100 border-orange-400'
    case 'info': return 'text-blue-600 bg-blue-100 border-blue-400'
    default: return 'text-gray-600 bg-gray-100 border-gray-400'
  }
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />
    case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600" />
    case 'info': return <Info className="w-5 h-5 text-blue-600" />
    default: return <Info className="w-5 h-5 text-gray-600" />
  }
}

export default function Monitoring() {
  const [selectedFarm, setSelectedFarm] = useState<Farm>(mockFarms[0])
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('last-month')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Surveillance</h1>
          <p className="text-gray-500 mt-1">Monitoring environnemental multi-sources (HarvestVision, FarmGuardian, WaterWise)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Exporter alertes
          </Button>
        </div>
      </div>

      {/* Farm Selector & Global Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 sm:w-64">
              <Select
                label="Exploitation"
                placeholder="Sélectionner une exploitation"
                value={selectedFarm.id}
                onChange={(e) => {
                  const farm = mockFarms.find(f => f.id === e.target.value)
                  if (farm) setSelectedFarm(farm)
                }}
                options={mockFarms.map(f => ({ value: f.id, label: `${f.name} (${f.crop}, ${f.area})` }))}
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Période"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={[
                  { value: 'last-week', label: 'Dernière semaine' },
                  { value: 'last-month', label: 'Dernier mois' },
                  { value: 'last-quarter', label: 'Dernier trimestre' },
                  { value: 'last-year', label: 'Dernière année' },
                ]}
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{selectedFarm.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Leaf className="w-4 h-4" />
                <span>{selectedFarm.crop} • {selectedFarm.area}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Végétation (NDVI)</p>
                <p className="text-3xl font-bold text-green-600 mt-1">0.82</p>
                <p className="text-sm text-green-600 mt-1">+0.05 vs mois dernier</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Alertes actives</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">3</p>
                <p className="text-sm text-orange-600 mt-1">1 critique, 2 attention</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Réserve hydrique</p>
                <p className="text-3xl font-bold text-cyan-600 mt-1">65%</p>
                <p className="text-sm text-orange-600 mt-1">-15% vs normale</p>
              </div>
              <div className="p-3 rounded-xl bg-cyan-100">
                <Droplet className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="vegetation">HarvestVision (Végétation)</TabsTrigger>
          <TabsTrigger value="risks">FarmGuardian (Risques)</TabsTrigger>
          <TabsTrigger value="water">WaterWise (Eau)</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Alerts */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  Alertes actives - {selectedFarm.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAlerts.filter(a => a.farm === selectedFarm.name || a.farm === 'Toutes').map((alert) => (
                    <div key={alert.id} className={cn('p-4 rounded-lg border-l-4', getLevelColor(alert.level))}>
                      <div className="flex items-start gap-4">
                        {getLevelIcon(alert.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            <Badge variant={alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'info'}>
                              {alert.level}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{alert.desc}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>{alert.farm}</span>
                            <span>{alert.time}</span>
                            <span className="font-mono">{alert.value}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Détails</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={`/monitoring/vegetation?farm=${selectedFarm.id}`}>
                  <Button variant="secondary" className="w-full justify-start gap-3">
                    <div className="p-2 rounded-lg bg-green-100"><Leaf className="w-5 h-5 text-green-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Analyser végétation</p>
                      <p className="text-xs text-gray-500">NDVI, EVI, anomalies</p>
                    </div>
                  </Button>
                </Link>
                <Link to={`/monitoring/risks?farm=${selectedFarm.id}`}>
                  <Button variant="secondary" className="w-full justify-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-100"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Vérifier risques</p>
                      <p className="text-xs text-gray-500">Sécheresse, chaleur, maladies</p>
                    </div>
                  </Button>
                </Link>
                <Link to={`/monitoring/water?farm=${selectedFarm.id}`}>
                  <Button variant="secondary" className="w-full justify-start gap-3">
                    <div className="p-2 rounded-lg bg-cyan-100"><Droplet className="w-5 h-5 text-cyan-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Ressources en eau</p>
                      <p className="text-xs text-gray-500">Précipitations, irrigation, ET</p>
                    </div>
                  </Button>
                </Link>
                <Link to={`/reports?farm=${selectedFarm.id}`}>
                  <Button variant="primary" className="w-full justify-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100"><FileText className="w-5 h-5 text-blue-600" /></div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Générer rapport</p>
                      <p className="text-xs text-gray-500">Diagnostic complet</p>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Précipitations vs Normale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockWaterData.precipitation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="normal" fill="#E5E7EB" name="Normale" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="value" fill="#3b82f6" name="Observé" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Humidité du sol (SMAP)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockWaterData.soilMoisture}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} domain={[0.15, 0.4]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="surface" stroke="#f97316" strokeWidth={2} name="Surface" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="root" stroke="#22c55e" strokeWidth={2} name="Zone racinaire" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="normal" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" name="Normale" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HarvestVision Tab */}
        <TabsContent value="vegetation">
          <HarvestVision />
        </TabsContent>

        {/* FarmGuardian Tab - Risks */}
        <TabsContent value="risks">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  FarmGuardian - Surveillance des risques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Risk Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { type: 'drought', title: 'Sécheresse', icon: Droplet, color: 'text-amber-600 bg-amber-100', count: 2, level: 'warning', metrics: ['Précip. -25% (30j)', 'Humidité sol 45e pct', 'ET0 > Précip.'] },
                      { type: 'heat', title: 'Stress thermique', icon: Sun, color: 'text-red-600 bg-red-100', count: 1, level: 'warning', metrics: ['5j > 35°C', 'Tmax 37.2°C', 'Indice chaleur élevé'] },
                      { type: 'vegetation', title: 'Anomalies vég.', icon: Leaf, color: 'text-green-600 bg-green-100', count: 1, level: 'info', metrics: ['NDVI -18% (2 sem)', 'Hétérogénéité 18%', 'Sénescence précoce'] },
                    ].map((risk) => (
                      <Card key={risk.type} className={cn('border-l-4', risk.color.replace('bg-', 'border-').replace('100', '500'))}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn('p-3 rounded-xl', risk.color)}>
                              <risk.icon className="w-6 h-6" />
                            </div>
                            <Badge variant={risk.level === 'critical' ? 'danger' : risk.level === 'warning' ? 'warning' : 'info'}>
                              {risk.count} alerte{risk.count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-3">{risk.title}</h3>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {risk.metrics.map((m, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: risk.color.replace('bg-', '').replace('text-', '').replace('100', '500').replace('600', '500') }} />
                                {m}
                              </li>
                            ))}
                          </ul>
                          <Button variant="secondary" size="sm" className="mt-4 w-full">Voir détails</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Detailed Alerts */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Détail des alertes - {selectedFarm.name}</h3>
                    <div className="space-y-3">
                      {mockAlerts.filter(a => a.farm === selectedFarm.name || a.farm === 'Toutes').map((alert) => (
                        <Card key={alert.id} className={cn('border-l-4', getLevelColor(alert.level))}>
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {getLevelIcon(alert.level)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                                  <Badge variant={alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'info'}>
                                    {alert.level}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{alert.desc}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.farm}</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{alert.time}</span>
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{alert.value}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">Analyser</Button>
                                <Button variant="ghost" size="sm">Ignorer</Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WaterWise Tab */}
        <TabsContent value="water">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-cyan-600" />
                  WaterWise - Analyse des ressources en eau
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Water Balance */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Précipitations (30j)', value: '12 mm', ref: 'Normale: 45 mm', status: 'warning', icon: Cloud, color: 'text-blue-600' },
                    { label: 'Humidité surface', value: '0.24 m³/m³', ref: 'Normale: 0.34', status: 'warning', icon: Droplet, color: 'text-amber-600' },
                    { label: 'Humidité racinaire', value: '0.29 m³/m³', ref: 'Normale: 0.33', status: 'warning', icon: Droplet, color: 'text-amber-600' },
                    { label: 'ET réelle (7j)', value: '18 mm', ref: 'ET0: 22 mm', status: 'good', icon: Sun, color: 'text-orange-600' },
                  ].map((item, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn('p-2 rounded-lg', item.color.replace('text-', 'bg-').replace('600', '100'))}>
                            <item.icon className={cn('w-5 h-5', item.color)} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{item.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 ml-10">{item.ref}</p>
                        <Badge variant={item.status === 'good' ? 'success' : 'warning'} className="mt-2 ml-10">
                          {item.status === 'good' ? 'OK' : 'Surveillance'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Évapotranspiration (OpenET)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={mockWaterData.et}>
                            <defs>
                              <linearGradient id="et0Gradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="etaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="et0" stroke="#f97316" fill="url(#et0Gradient)" strokeWidth={2} name="ET0 (Référence)" />
                            <Area type="monotone" dataKey="eta" stroke="#22c55e" fill="url(#etaGradient)" strokeWidth={2} name="ET réelle" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">Kc = ET réelle / ET0 ≈ 0.72</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Bilan hydrique estimé</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mockWaterData.precipitation.slice(-6)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" name="Précipitations" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="normal" fill="#E5E7EB" name="Normale" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Déficit cumulé (3 mois)</span>
                          <span className="font-semibold text-orange-600">-98 mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Réserve utile disponible</span>
                          <span className="font-semibold text-cyan-600">~130 mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Autonomie sans pluie</span>
                          <span className="font-semibold text-amber-600">~18 jours</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex justify-between">
                          <span className="text-gray-600">Irrigation recommandée</span>
                          <Badge variant="warning">Oui, si &#60; 50% réserve</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Irrigation Schedule */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Planification irrigation suggérée
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Réserve estimée</th>
                            <th className="pb-2 font-medium">Seuil déclenchement</th>
                            <th className="pb-2 font-medium">Volume suggéré</th>
                            <th className="pb-2 font-medium">Priorité</th>
                            <th className="pb-2 font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { date: '2024-02-05', reserve: '48%', threshold: '50%', volume: '25 mm', priority: 'high', notes: 'Avant floraison maïs' },
                            { date: '2024-02-12', reserve: '42%', threshold: '50%', volume: '30 mm', priority: 'high', notes: 'Période critique' },
                            { date: '2024-02-19', reserve: '55%', threshold: '50%', volume: '0 mm', priority: 'low', notes: 'Pluies prévues' },
                            { date: '2024-02-26', reserve: '45%', threshold: '50%', volume: '20 mm', priority: 'medium', notes: 'Surveiller' },
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3">{row.date}</td>
                              <td className="py-3 font-medium">{row.reserve}</td>
                              <td className="py-3">{row.threshold}</td>
                              <td className="py-3 font-mono">{row.volume}</td>
                              <td className="py-3">
                                <Badge variant={row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'success'}>
                                  {row.priority}
                                </Badge>
                              </td>
                              <td className="py-3 text-gray-600">{row.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Basé sur modèle FAO-56 + données SMAP/OpenET. Validation terrain requise avant irrigation.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

