import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Map,
  Leaf,
  Droplet,
  Sun,
  Settings,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  FileText,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

interface Farm {
  id: string
  name: string
  country: string
  region: string
  coordinates: { lat: number; lng: number }
  area: string
  crop: string
  soilType: string
  createdAt: string
  lastAnalysis: string | null
  status: 'active' | 'monitoring' | 'fallow' | 'harvested'
}

const mockFarms: Farm[] = [
  { id: '1', name: 'North Field 1', country: 'USA', region: 'Iowa', coordinates: { lat: 42.0, lng: -93.5 }, area: '45 ha', crop: 'Corn', soilType: 'Loam', createdAt: '2023-03-15', lastAnalysis: '2024-01-15', status: 'active' },
  { id: '2', name: 'South Field 3', country: 'USA', region: 'Iowa', coordinates: { lat: 41.5, lng: -93.2 }, area: '32 ha', crop: 'Soybean', soilType: 'Silt Loam', createdAt: '2023-04-20', lastAnalysis: '2024-01-14', status: 'monitoring' },
  { id: '3', name: 'East Field 2', country: 'USA', region: 'Nebraska', coordinates: { lat: 41.0, lng: -96.0 }, area: '28 ha', crop: 'Wheat', soilType: 'Clay Loam', createdAt: '2023-05-10', lastAnalysis: '2024-01-13', status: 'active' },
  { id: '4', name: 'West Field 1', country: 'USA', region: 'Kansas', coordinates: { lat: 38.5, lng: -98.0 }, area: '52 ha', crop: 'Corn', soilType: 'Sandy Loam', createdAt: '2023-06-01', lastAnalysis: '2024-01-11', status: 'active' },
  { id: '5', name: 'Central Field 4', country: 'USA', region: 'Iowa', coordinates: { lat: 41.8, lng: -93.8 }, area: '18 ha', crop: 'Alfalfa', soilType: 'Loam', createdAt: '2023-07-15', lastAnalysis: '2024-01-10', status: 'fallow' },
  { id: '6', name: 'Nord Champ 1', country: 'France', region: 'Beauce', coordinates: { lat: 48.2, lng: 1.8 }, area: '35 ha', crop: 'Blé tendre', soilType: 'Limon', createdAt: '2023-09-01', lastAnalysis: '2023-12-20', status: 'active' },
  { id: '7', name: 'Campo Sur', country: 'Argentina', region: 'Córdoba', coordinates: { lat: -31.5, lng: -64.0 }, area: '120 ha', crop: 'Soja', soilType: 'Mollisol', createdAt: '2023-10-15', lastAnalysis: '2024-01-05', status: 'active' },
]

const getStatusBadge = (status: Farm['status']) => {
  switch (status) {
    case 'active': return <Badge variant="success">Actif</Badge>
    case 'monitoring': return <Badge variant="warning">Surveillance</Badge>
    case 'fallow': return <Badge variant="default">Jachère</Badge>
    case 'harvested': return <Badge variant="info">Récolté</Badge>
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Farms() {
  const [activeTab, setActiveTab] = useState('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [showMap, setShowMap] = useState(false)

  const countries = [...new Set(mockFarms.map(f => f.country))]

  const filteredFarms = mockFarms
    .filter(f => {
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !f.region.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !f.crop.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (statusFilter !== 'all' && f.status !== statusFilter) return false
      if (countryFilter !== 'all' && f.country !== countryFilter) return false
      return true
    })

  const stats = [
    { label: 'Total exploitations', value: mockFarms.length, icon: Map, color: 'text-blue-600' },
    { label: 'Exploitations actives', value: mockFarms.filter(f => f.status === 'active').length, icon: Leaf, color: 'text-green-600' },
    { label: 'En surveillance', value: mockFarms.filter(f => f.status === 'monitoring').length, icon: Eye, color: 'text-orange-600' },
    { label: 'Surface totale', value: mockFarms.reduce((sum, f) => sum + parseInt(f.area), 0) + ' ha', icon: MapPin, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Mes exploitations</h1>
          <p className="text-gray-500 mt-1">Gestion et visualisation de vos parcelles agricoles (AgriTwin)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowMap(!showMap)}>
            <Map className="w-4 h-4 mr-2" />
            {showMap ? 'Liste' : 'Carte'}
          </Button>
          <Button size="sm" onClick={() => {}}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle exploitation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.color.replace('text-', 'bg-').replace('600', '100'))}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map View */}
      {showMap && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              Carte des exploitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-lg bg-gray-100 flex items-center justify-center relative overflow-hidden">
              {/* Placeholder for Leaflet map */}
              <div className="text-center text-gray-500">
                <Map className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Carte interactive (Leaflet)</p>
                <p className="text-sm mt-1">Intégration Leaflet avec marqueurs pour chaque exploitation</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-gray-400">
                  {mockFarms.map(f => (
                    <Badge key={f.id} variant="default" className="bg-primary-100 text-primary-700">
                      {f.name} ({f.country})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher nom, région, culture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Statut"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Tous' },
                  { value: 'active', label: 'Actif' },
                  { value: 'monitoring', label: 'Surveillance' },
                  { value: 'fallow', label: 'Jachère' },
                  { value: 'harvested', label: 'Récolté' },
                ]}
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Pays"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Tous les pays' },
                  ...countries.map(c => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farms List */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Liste ({filteredFarms.length})</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="mt-6">
            {filteredFarms.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune exploitation trouvée</h3>
                  <p className="text-gray-500">Essayez de modifier vos filtres ou votre recherche.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredFarms.map((farm) => (
                  <Card key={farm.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Main Info */}
                        <div className="flex items-center gap-4 min-w-[280px] flex-1">
                          <div className="p-3 rounded-xl bg-green-100">
                            <Leaf className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                              {getStatusBadge(farm.status)}
                            </div>
                            <p className="text-sm text-gray-500">
                              {farm.crop} • {farm.area} • {farm.soilType}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {farm.region}, {farm.country} ({farm.coordinates.lat.toFixed(2)}, {farm.coordinates.lng.toFixed(2)})
                            </p>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 min-w-[200px] hidden lg:flex">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Créée: {formatDate(farm.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Dernière analyse: {farm.lastAnalysis ? formatDate(farm.lastAnalysis) : 'Jamais'}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link to={`/monitoring?farm=${farm.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Surveiller
                            </Button>
                          </Link>
                          <Link to={`/crops?farm=${farm.id}`}>
                            <Button variant="ghost" size="sm">
                              <GitBranch className="w-4 h-4 mr-1" />
                              Rotation
                            </Button>
                          </Link>
                          <Link to={`/reports?farm=${farm.id}`}>
                            <Button variant="ghost" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              Rapport
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFarms.map((farm) => (
              <Card key={farm.id} className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                      <p className="text-sm text-gray-500">{farm.region}, {farm.country}</p>
                    </div>
                    {getStatusBadge(farm.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Culture</p>
                      <p className="font-medium text-gray-900">{farm.crop}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Surface</p>
                      <p className="font-medium text-gray-900">{farm.area}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Sol</p>
                      <p className="font-medium text-gray-900">{farm.soilType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Coordonnées</p>
                      <p className="font-medium text-gray-900">{farm.coordinates.lat.toFixed(3)}, {farm.coordinates.lng.toFixed(3)}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-sm">
                    <p className="text-gray-500">Créée le {formatDate(farm.createdAt)}</p>
                    <p className="text-gray-500">Dernière analyse: {farm.lastAnalysis ? formatDate(farm.lastAnalysis) : 'Aucune'}</p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Link to={`/monitoring?farm=${farm.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-1" />
                        Surveiller
                      </Button>
                    </Link>
                    <Link to={`/crops?farm=${farm.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        <GitBranch className="w-4 h-4 mr-1" />
                        Rotation
                      </Button>
                    </Link>
                    <Link to={`/reports?farm=${farm.id}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        <FileText className="w-4 h-4 mr-1" />
                        Rapport
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Need to import missing icons
import { Calendar, Clock, GitBranch } from 'lucide-react'