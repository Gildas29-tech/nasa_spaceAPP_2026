import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  GitBranch,
  Leaf,
  TrendingUp,
  Target,
  RefreshCw,
  Download,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import RotationPlanner from './RotationPlanner'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'

// Types for real crop data from backend
interface CropSuitability {
  crop: string
  scientific_name: string
  cycle: string
  water_need: string
  heat_tolerance: string
  nitrogen_need: string
  profit_potential: string
  climate_risk: string
  suitability_score: number
  details?: {
    temperature_range: string
    precipitation_range: string
    soil_ph_range: string
    soil_texture: string[]
    growing_days: number
    frost_tolerance: string
  }
}

interface RotationTemplate {
  name: string
  years: number
  crops: string[]
  benefits: string[]
  score: number
  description?: string
  constraints?: string[]
}

export default function Crops() {
  const { farms, loading: farmsLoading, fetchFarms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeTab, setActiveTab] = useState('planner')
  const [cropComparison, setCropComparison] = useState<CropSuitability[]>([])
  const [rotationTemplates, setRotationTemplates] = useState<RotationTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch farms on mount
  useEffect(() => {
    fetchFarms()
  }, [fetchFarms])

  // Set selected farm when farms load or selection changes
  useEffect(() => {
    if (farms.length > 0) {
      const farm = farms.find(f => f.id === selectedFarmId) || farms[0]
      setSelectedFarm(farm)
      selectFarm(farm.id)
    } else {
      setSelectedFarm(null)
      selectFarm(null)
    }
  }, [farms, selectedFarmId, selectFarm])

  // Fetch crop suitability data when farm changes
  useEffect(() => {
    if (!selectedFarm) return

    const fetchCropData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get crop suitability analysis from backend
        const [suitability, templates] = await Promise.all([
          api.get<CropSuitability[]>(`/api/v1/crops/suitability`, {
            params: { farm_id: selectedFarm.id }
          }),
          api.get<RotationTemplate[]>(`/api/v1/crops/rotation-templates`, {
            params: { farm_id: selectedFarm.id }
          })
        ])
        setCropComparison(suitability)
        setRotationTemplates(templates)
      } catch (err: any) {
        console.error('Failed to fetch crop data:', err)
        setError('Failed to load crop data')
        // Fallback to empty arrays - user can still use the planner
        setCropComparison([])
        setRotationTemplates([])
      } finally {
        setLoading(false)
      }
    }

    fetchCropData()
  }, [selectedFarm])

  const handleRefresh = async () => {
    if (!selectedFarm) return
    addToast({ type: 'info', title: 'Refreshing', message: 'Fetching latest crop data...' })
    // Re-fetch data
    try {
      const [suitability, templates] = await Promise.all([
        api.get<CropSuitability[]>(`/api/v1/crops/suitability`, {
          params: { farm_id: selectedFarm.id }
        }),
        api.get<RotationTemplate[]>(`/api/v1/crops/rotation-templates`, {
          params: { farm_id: selectedFarm.id }
        })
      ])
      setCropComparison(suitability)
      setRotationTemplates(templates)
      addToast({ type: 'success', title: 'Updated', message: 'Crop data refreshed' })
    } catch {
      addToast({ type: 'error', title: 'Failed to refresh', message: 'Please try again' })
    }
  }

  const getHeatToleranceColor = (tolerance: string) => {
    switch (tolerance) {
      case 'Excellente': return 'success'
      case 'Bonne': return 'info'
      case 'Moyenne': return 'warning'
      default: return 'default'
    }
  }

  const getProfitColor = (profit: string) => {
    switch (profit) {
      case 'Élevé': return 'success'
      case 'Moyen': return 'info'
      default: return 'default'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Faible': return 'success'
      case 'Moyen': return 'warning'
      default: return 'danger'
    }
  }

  if (farmsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-12 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Cultures et rotations</h1>
            <p className="text-gray-500 mt-1">Comparaison cultures et planification rotations (CropShift)</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No farms configured</h3>
            <p className="text-gray-500 mb-4">Create your first farm to start planning crops and rotations</p>
            <Button onClick={() => window.location.href = '/field-map'}>
              <Plus className="w-4 h-4 mr-2" />
              Create Farm on Map
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Cultures et rotations</h1>
          <p className="text-gray-500 mt-1">Comparaison cultures et planification rotations (CropShift)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading || !selectedFarm}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading ? 'animate-spin' : '')} />
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}} disabled={!selectedFarm || cropComparison.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Farm Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-64">
              <Select
                label="Exploitation"
                placeholder="Sélectionner une exploitation"
                value={selectedFarm?.id || ''}
                onChange={(e) => {
                  const farm = farms.find(f => f.id === e.target.value)
                  if (farm) {
                    setSelectedFarm(farm)
                    selectFarm(farm.id)
                  }
                }}
                options={farms.map(f => ({
                  value: f.id,
                  label: `${f.name} (${f.crops_of_interest?.[0] || 'No crop'}, ${f.area || 'Unknown area'}, ${f.location || 'Unknown'})`
                }))}
              />
            </div>
            {selectedFarm && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Leaf className="w-4 h-4" />
                  <span>Culture actuelle: <strong>{selectedFarm.crops_of_interest?.[0] || 'Non définie'}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>Surface: <strong>{selectedFarm.area || 'Inconnue'}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <GitBranch className="w-4 h-4" />
                  <span>Localisation: <strong>{selectedFarm.location || 'Inconnue'}</strong></span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="planner">Planificateur rotation</TabsTrigger>
          <TabsTrigger value="comparison">Comparaison cultures</TabsTrigger>
          <TabsTrigger value="templates">Modèles rotations</TabsTrigger>
        </TabsList>

        {/* Rotation Planner Tab */}
        <TabsContent value="planner">
          {selectedFarm ? (
            <RotationPlanner farmId={selectedFarm.id} />
          ) : (
            <div className="mt-6 text-center py-8 text-gray-500">
              <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Sélectionnez une exploitation pour accéder au planificateur de rotation</p>
            </div>
          )}
        </TabsContent>

        {/* Crop Comparison Tab */}
        <TabsContent value="comparison">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Comparaison cultures candidates {selectedFarm ? `- ${selectedFarm.name}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-12 animate-pulse bg-gray-100 rounded" />
                    ))}
                  </div>
                ) : cropComparison.length > 0 ? (
                  <>
                    <p className="text-gray-600 mb-6">
                      Analyse d'adéquation climato-pédologique pour <strong>{selectedFarm?.name || 'cette ferme'}</strong>
                      ({selectedFarm?.location || 'Localisation inconnue'}).
                      Score basé sur: climat (NASA POWER), sol (SoilGrids), besoins culturales, risques.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="pb-2 font-medium">Culture</th>
                            <th className="pb-2 font-medium">Cycle</th>
                            <th className="pb-2 font-medium">Besoin eau</th>
                            <th className="pb-2 font-medium">Tolérance chaleur</th>
                            <th className="pb-2 font-medium">Besoin N</th>
                            <th className="pb-2 font-medium">Profit potentiel</th>
                            <th className="pb-2 font-medium">Risque climatique</th>
                            <th className="pb-2 font-medium">Adéquation</th>
                            <th className="pb-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cropComparison.map((crop, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 font-medium text-gray-900">{crop.crop}</td>
                              <td className="py-3 text-gray-600">{crop.cycle}</td>
                              <td className="py-3 text-gray-600">{crop.water_need}</td>
                              <td className="py-3">
                                <Badge variant={getHeatToleranceColor(crop.heat_tolerance)}>
                                  {crop.heat_tolerance}
                                </Badge>
                              </td>
                              <td className="py-3 text-gray-600">{crop.nitrogen_need}</td>
                              <td className="py-3">
                                <Badge variant={getProfitColor(crop.profit_potential)}>
                                  {crop.profit_potential}
                                </Badge>
                              </td>
                              <td className="py-3">
                                <Badge variant={getRiskColor(crop.climate_risk)}>
                                  {crop.climate_risk}
                                </Badge>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-24 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 rounded-full transition-all"
                                      style={{ width: `${crop.suitability_score}%` }}
                                    />
                                  </div>
                                  <span className="font-bold text-gray-900">{crop.suitability_score}%</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" title="Détails" onClick={() => alert(`Détails pour ${crop.crop}: ${crop.details ? JSON.stringify(crop.details, null, 2) : 'Pas de détails disponibles'}`)}>
                                    <Info className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" title="Ajouter à rotation" onClick={() => { addToast({ type: 'info', title: 'À venir', message: 'Ajout à la rotation bientôt disponible' }) }}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Detailed view for selected crop */}
                    <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Comment interpréter l'adéquation
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
                        <li><strong>85-100%</strong>: Excellente adéquation - Culture recommandée prioritairement</li>
                        <li><strong>70-84%</strong>: Bonne adéquation - Viable avec gestion adaptée</li>
                        <li><strong>55-69%</strong>: Adéquation moyenne - Risques identifiés, surveillance accrue</li>
                        <li><strong>Below 55%</strong>: Faible adéquation - Déconseillée sans modifications majeures</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-3">
                        L'adéquation combine: correspondance climatique (température, précipitations, période sans gel),
                        contraintes pédologiques (pH, texture, drainage, MO), besoins culturales, et risques historiques.
                        Ne remplace pas un avis agronomique local.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Aucune donnée de comparaison disponible</p>
                    <p className="text-sm mt-1">Lancez une analyse d'adéquation culturelle via le bouton Actualiser</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rotation Templates Tab */}
        <TabsContent value="templates">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-purple-600" />
                  Modèles de rotations recommandés {selectedFarm ? `pour ${selectedFarm.name}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-32 animate-pulse bg-gray-100 rounded" />
                    ))}
                  </div>
                ) : rotationTemplates.length > 0 ? (
                  <>
                    <p className="text-gray-600 mb-6">
                      Rotations testées et validées pour des contextes similaires à <strong>{selectedFarm?.name || 'cette ferme'}</strong>.
                      Scores basés sur: résilience, rentabilité, santé sol, gestion adventices/maladies.
                    </p>

                    <div className="space-y-4">
                      {rotationTemplates.map((template, i) => (
                        <Card key={i} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                                  <Badge variant="default">{template.years} ans</Badge>
                                  <div className={cn('ml-auto p-2 rounded-full bg-green-100 text-green-700 font-bold')}>
                                    Score: {template.score}/100
                                  </div>
                                </div>
                                {template.description && (
                                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {template.crops.map((crop, ci) => (
                                    <Badge key={ci} variant="default" className="bg-purple-50 text-purple-700 border-purple-200">
                                      {crop} {ci < template.crops.length - 1 ? '→' : ''}
                                    </Badge>
                                  ))}
                                </div>
                                <ul className="space-y-1 text-sm text-gray-600">
                                  {template.benefits.map((benefit, bi) => (
                                    <li key={bi} className="flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                                {template.constraints && template.constraints.length > 0 && (
                                  <ul className="space-y-1 text-sm text-amber-700 mt-3">
                                    {template.constraints.map((constraint, ci) => (
                                      <li key={ci} className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        {constraint}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div className="lg:w-48 lg:flex-none flex gap-2">
                                <Button variant="secondary" size="sm" className="flex-1" onClick={() => alert(`Détails: ${template.description || 'Aucune description'}`)}>
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Détails
                                </Button>
                                <Button variant="primary" size="sm" className="flex-1" onClick={() => { addToast({ type: 'info', title: 'À venir', message: 'Application de rotation bientôt disponible' }) }}>
                                  <GitBranch className="w-4 h-4 mr-1" />
                                  Utiliser
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Custom Rotation Builder Link */}
                    <div className="mt-6 p-4 rounded-lg bg-gray-50 text-center">
                      <p className="text-gray-600 mb-3">Besoin d'une rotation personnalisée ?</p>
                      <Button variant="primary" onClick={() => setActiveTab('planner')}>
                        <GitBranch className="w-4 h-4 mr-2" />
                        Créer ma rotation sur mesure
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Aucun modèle de rotation disponible</p>
                    <p className="text-sm mt-1">Les modèles seront générés selon votre sol et climat</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}