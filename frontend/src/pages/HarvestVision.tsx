import { useState } from 'react'
import { cn } from '../lib/utils'
import {
  Leaf,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Layers,
  RefreshCw,
  Sun,
  Cloud,
  Droplet,
  BarChart3,
  AlertTriangle,
  Info,
  MapPin,
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface NDVIDataPoint {
  date: string
  ndvi: number
  evi?: number
}

interface Field {
  id: string
  name: string
  crop: string
  area: string
  location: string
  lastNDVI: number
  lastDate: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
}

const mockFields: Field[] = [
  { id: '1', name: 'North Field 1', crop: 'Corn', area: '45 ha', location: 'Iowa, USA', lastNDVI: 0.82, lastDate: '2024-01-15', status: 'excellent' },
  { id: '2', name: 'South Field 3', crop: 'Soybean', area: '32 ha', location: 'Iowa, USA', lastNDVI: 0.65, lastDate: '2024-01-15', status: 'warning' },
  { id: '3', name: 'East Field 2', crop: 'Wheat', area: '28 ha', location: 'Nebraska, USA', lastNDVI: 0.78, lastDate: '2024-01-14', status: 'good' },
  { id: '4', name: 'West Field 1', crop: 'Corn', area: '52 ha', location: 'Kansas, USA', lastNDVI: 0.72, lastDate: '2024-01-14', status: 'good' },
  { id: '5', name: 'Central Field 4', crop: 'Alfalfa', area: '18 ha', location: 'Iowa, USA', lastNDVI: 0.88, lastDate: '2024-01-15', status: 'excellent' },
]

const mockNDVIHistory: NDVIDataPoint[] = [
  { date: '2023-04-01', ndvi: 0.15 },
  { date: '2023-05-01', ndvi: 0.45 },
  { date: '2023-06-01', ndvi: 0.72 },
  { date: '2023-07-01', ndvi: 0.85 },
  { date: '2023-08-01', ndvi: 0.82 },
  { date: '2023-09-01', ndvi: 0.75 },
  { date: '2023-10-01', ndvi: 0.45 },
  { date: '2023-11-01', ndvi: 0.25 },
  { date: '2023-12-01', ndvi: 0.18 },
  { date: '2024-01-01', ndvi: 0.15 },
]

interface EVIDataPoint {
  date: string
  evi: number
}

const mockEVIHistory: EVIDataPoint[] = [
  { date: '2023-04-01', evi: 0.12 },
  { date: '2023-05-01', evi: 0.38 },
  { date: '2023-06-01', evi: 0.65 },
  { date: '2023-07-01', evi: 0.78 },
  { date: '2023-08-01', evi: 0.75 },
  { date: '2023-09-01', evi: 0.68 },
  { date: '2023-10-01', evi: 0.42 },
  { date: '2023-11-01', evi: 0.22 },
  { date: '2023-12-01', evi: 0.15 },
  { date: '2024-01-01', evi: 0.13 },
]

const getStatusColor = (status: Field['status']) => {
  switch (status) {
    case 'excellent': return 'text-green-600 bg-green-100'
    case 'good': return 'text-blue-600 bg-blue-100'
    case 'warning': return 'text-orange-600 bg-orange-100'
    case 'critical': return 'text-red-600 bg-red-100'
  }
}

const getStatusLabel = (status: Field['status']) => {
  switch (status) {
    case 'excellent': return 'Excellent'
    case 'good': return 'Bon'
    case 'warning': return 'Attention'
    case 'critical': return 'Critique'
  }
}

const ndviColorScale = [
  { min: -1, max: 0, color: '#8B4513', label: 'Sol nu / Eau' },
  { min: 0, max: 0.2, color: '#E8C56D', label: 'Végétation très faible' },
  { min: 0.2, max: 0.4, color: '#A8D08D', label: 'Végétation faible' },
  { min: 0.4, max: 0.6, color: '#5BAA6A', label: 'Végétation modérée' },
  { min: 0.6, max: 0.8, color: '#2E7D32', label: 'Végétation forte' },
  { min: 0.8, max: 1, color: '#1B5E20', label: 'Végétation très forte' },
]

export default function HarvestVision() {
  const [selectedField, setSelectedField] = useState<Field>(mockFields[0])
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('last-year')
  const [indexType, setIndexType] = useState<'ndvi' | 'evi' | 'both'>('ndvi')
  const [showLegend, setShowLegend] = useState(true)

  const getNDVIColor = (value: number) => {
    for (const scale of ndviColorScale) {
      if (value >= scale.min && value <= scale.max) return scale.color
    }
    return '#8B4513'
  }

  const currentNDVI = selectedField.lastNDVI
  const ndviColor = getNDVIColor(currentNDVI)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">HarvestVision</h1>
          <p className="text-gray-500 mt-1">Surveillance de la végétation par indices satellitaires (NDVI, EVI)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Field Selector & Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 sm:w-64">
              <Select
                label="Exploitation"
                placeholder="Sélectionner une exploitation"
                value={selectedField.id}
                onChange={(e) => {
                  const field = mockFields.find(f => f.id === e.target.value)
                  if (field) setSelectedField(field)
                }}
                options={mockFields.map(f => ({ value: f.id, label: `${f.name} (${f.crop}, ${f.area})` }))}
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Période"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={[
                  { value: 'last-month', label: 'Dernier mois' },
                  { value: 'last-quarter', label: 'Dernier trimestre' },
                  { value: 'last-year', label: 'Dernière année' },
                  { value: 'custom', label: 'Personnalisé' },
                ]}
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Indice"
                value={indexType}
                onChange={(e) => setIndexType(e.target.value as 'ndvi' | 'evi' | 'both')}
                options={[
                  { value: 'ndvi', label: 'NDVI' },
                  { value: 'evi', label: 'EVI' },
                  { value: 'both', label: 'NDVI + EVI' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Légende NDVI
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="timeseries">Séries temporelles</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="comparison">Comparaison</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Current NDVI Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-600" />
                  Indice de Végétation Actuel - {selectedField.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* NDVI Gauge */}
                  <div className="md:col-span-2">
                    <div className="relative h-64">
                      <svg viewBox="0 0 300 180" className="w-full h-full">
                        {/* Background arc */}
                        <path
                          d="M 280 150 A 130 130 0 0 1 20 150"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="30"
                        />
                        {/* NDVI arc */}
                        <path
                          d="M 280 150 A 130 130 0 0 1 20 150"
                          fill="none"
                          stroke={ndviColor}
                          strokeWidth="30"
                          strokeLinecap="round"
                          strokeDasharray={`${currentNDVI * 100} 100`}
                          style={{ filter: 'dropShadow(0 2px 4px rgba(0,0,0,0.1))' }}
                        />
                        {/* Center value */}
                        <text x="150" y="110" textAnchor="middle" fontSize="48" fontWeight="bold" fill="#1F2937" fontFamily="system-ui">
                          {currentNDVI.toFixed(2)}
                        </text>
                        <text x="150" y="135" textAnchor="middle" fontSize="14" fill="#6B7280" fontFamily="system-ui">
                          NDVI
                        </text>
                        {/* Scale markers */}
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((val, i) => (
                          <g key={i}>
                            <text
                              x={150 + 130 * Math.cos(Math.PI - Math.PI * val)}
                              y={150 - 130 * Math.sin(Math.PI - Math.PI * val)}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#9CA3AF"
                              fontFamily="system-ui"
                              dy={i % 2 === 0 ? '8' : '-2'}
                            >
                              {val.toFixed(1)}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ndviColor }} />
                        <span>Actuel: {currentNDVI.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <span>Seuil alerte: 0.40</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Statut végétatif</span>
                        <Badge variant={selectedField.status === 'excellent' ? 'success' : selectedField.status === 'good' ? 'info' : selectedField.status === 'warning' ? 'warning' : 'danger'}>
                          {getStatusLabel(selectedField.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedField.status === 'excellent' && 'Végétation dense et saine. Conditions optimales pour la croissance.'}
                        {selectedField.status === 'good' && 'Bonne couverture végétale. Surveillance recommandée.'}
                        {selectedField.status === 'warning' && 'Couvert végétal réduit. Stress possible (hydrique, nutritif, maladie).'}
                        {selectedField.status === 'critical' && 'Végétation très dégradée. Intervention urgente recommandée.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">Culture</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedField.crop}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">Surface</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedField.area}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">Localisation</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedField.location}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-500">Dernière observation</p>
                        <p className="text-lg font-semibold text-gray-900">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {selectedField.lastDate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NDVI Legend */}
                {showLegend && (
                  <div className="mt-6 p-4 rounded-lg bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-3">Échelle NDVI</h4>
                    <div className="flex flex-wrap gap-4">
                      {ndviColorScale.map((scale) => (
                        <div key={scale.min} className="flex items-center gap-2">
                          <div
                            className="w-8 h-4 rounded"
                            style={{ backgroundColor: scale.color }}
                          />
                          <span className="text-sm text-gray-600">{scale.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Statistiques rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Exploitations excellentes</p>
                      <p className="text-2xl font-bold text-green-700">{mockFields.filter(f => f.status === 'excellent').length}</p>
                    </div>
                    <Leaf className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Exploitations bonnes</p>
                      <p className="text-2xl font-bold text-blue-700">{mockFields.filter(f => f.status === 'good').length}</p>
                    </div>
                    <Leaf className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Exploitations en attention</p>
                      <p className="text-2xl font-bold text-orange-700">{mockFields.filter(f => f.status === 'warning').length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Exploitations critiques</p>
                      <p className="text-2xl font-bold text-red-700">{mockFields.filter(f => f.status === 'critical').length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Series Tab */}
        <TabsContent value="timeseries">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Évolution temporelle des indices de végétation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={indexType === 'both' ? mockNDVIHistory.map((d, i) => ({ ...d, evi: mockEVIHistory[i].evi! })) : mockNDVIHistory}>
                      <defs>
                        <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="eviGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(0, 7)} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        labelFormatter={(v) => v}
                        formatter={(value: number, name: string) => [value.toFixed(3), name === 'ndvi' ? 'NDVI' : 'EVI']}
                      />
                      {(indexType === 'ndvi' || indexType === 'both') && (
                        <Area
                          type="monotone"
                          dataKey="ndvi"
                          stroke="#22c55e"
                          fill="url(#ndviGradient)"
                          strokeWidth={2}
                          name="NDVI"
                        />
                      )}
                      {(indexType === 'evi' || indexType === 'both') && (
                        <Area
                          type="monotone"
                          dataKey="evi"
                          stroke="#3b82f6"
                          fill="url(#eviGradient)"
                          strokeWidth={2}
                          name="EVI"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  {indexType !== 'evi' && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>NDVI - Indice de végétation par différence normalisée</span>
                    </div>
                  )}
                  {indexType !== 'ndvi' && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>EVI - Indice de végétation amélioré (moins sensible à l'atmosphère)</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              {[
                { label: 'NDVI Max', value: '0.85', month: 'Juillet', icon: Sun, color: 'text-yellow-600' },
                { label: 'NDVI Min', value: '0.15', month: 'Janvier', icon: Cloud, color: 'text-gray-600' },
                { label: 'Amplitude', value: '0.70', month: 'Annuelle', icon: BarChart3, color: 'text-blue-600' },
                { label: 'Pente croissance', value: '+0.07/mois', month: 'Avril-Juin', icon: TrendingUp, color: 'text-green-600' },
              ].map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-6 text-center">
                    <stat.icon className={cn('w-8 h-8 mx-auto mb-2', stat.color)} />
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-xs text-gray-400">{stat.month}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Détection d'anomalies végétatives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Baisse anormale du NDVI détectée</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Le NDVI a chuté de 0.82 à 0.65 en 2 semaines sur South Field 3 (Soybean).
                          Cette baisse de 21% dépasse le seuil de variation normale (±10%).
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Badge variant="warning">Attention</Badge>
                          <Badge variant="info">Hydrique probable</Badge>
                          <Button variant="ghost" size="sm">Analyser</Button>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">3 jours ago</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-4">
                      <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Démarrage précoce de saison</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Le NDVI a atteint 0.45 au 1er mai sur North Field 1, soit 2 semaines avant la moyenne historique (0.35).
                          Indicateur de conditions printanières favorables.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Badge variant="info">Favorable</Badge>
                          <Badge variant="success">Croissance avancée</Badge>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">1 semaine ago</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-gray-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Hétérogénéité intra-parcellaire</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Variabilité du NDVI de 0.15 observée dans East Field 2 (coefficient de variation 18%).
                          Zones potentiellement touchées par compaction ou drainage insuffisant.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Badge variant="default">Investigation</Badge>
                          <Button variant="ghost" size="sm">Voir carte</Button>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">5 jours ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anomaly Detection Info */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Méthodologie de détection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>Les anomalies sont détectées par comparaison aux :</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Moyennes historiques sur 5-10 ans (climatologie)</li>
                  <li>Seuils de variation intra-saisonnière normaux (±10-15%)</li>
                  <li>Modèles de phénologie spécifiques aux cultures</li>
                  <li>Indices complémentaires (EVI, SAVI) pour confirmation</li>
                </ul>
                <p className="text-orange-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Une variation du NDVI ne doit pas être automatiquement interprétée comme une maladie ou une carence.
                  Elle constitue un signal nécessitant une interprétation agronomique complémentaire (sol, météo, pratiques).
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Comparaison inter-parcellaire et inter-annuelle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockFields.map(f => ({ name: f.name, ndvi: f.lastNDVI }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 1]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        formatter={(value: number) => [value.toFixed(2), 'NDVI']}
                      />
                      <Line
                        type="monotone"
                        dataKey="ndvi"
                        stroke="#22c55e"
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 font-medium">Exploitation</th>
                        <th className="pb-2 font-medium">Culture</th>
                        <th className="pb-2 font-medium">Surface</th>
                        <th className="pb-2 font-medium">NDVI Actuel</th>
                        <th className="pb-2 font-medium">Évolution (30j)</th>
                        <th className="pb-2 font-medium">vs Moyenne</th>
                        <th className="pb-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockFields.map((field, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-medium">{field.name}</td>
                          <td className="py-3">{field.crop}</td>
                          <td className="py-3">{field.area}</td>
                          <td className="py-3 font-semibold text-gray-900">{field.lastNDVI.toFixed(2)}</td>
                          <td className="py-3">
                            <span className={cn('font-medium', field.lastNDVI > 0.75 ? 'text-green-600' : field.lastNDVI > 0.5 ? 'text-orange-600' : 'text-red-600')}>
                              {field.lastNDVI > 0.75 ? '+' : field.lastNDVI > 0.5 ? '±' : '-'}${(Math.random() * 0.1).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={cn('font-medium', field.lastNDVI > 0.7 ? 'text-green-600' : field.lastNDVI > 0.5 ? 'text-orange-600' : 'text-red-600')}>
                              {field.lastNDVI > 0.7 ? '+' : field.lastNDVI > 0.5 ? '±' : '-'}${(Math.random() * 0.15).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge variant={
                              field.status === 'excellent' ? 'success' :
                              field.status === 'good' ? 'info' :
                              field.status === 'warning' ? 'warning' : 'danger'
                            }>
                              {getStatusLabel(field.status)}
                            </Badge>
                          </td>
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