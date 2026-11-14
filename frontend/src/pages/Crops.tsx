import { useState } from 'react'
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

interface Farm {
  id: string
  name: string
  crop: string
  area: string
  location: string
  soilType: string
}

const mockFarms: Farm[] = [
  { id: '1', name: 'North Field 1', crop: 'Corn', area: '45 ha', location: 'Iowa, USA', soilType: 'Loam' },
  { id: '2', name: 'South Field 3', crop: 'Soybean', area: '32 ha', location: 'Iowa, USA', soilType: 'Silt Loam' },
  { id: '3', name: 'East Field 2', crop: 'Wheat', area: '28 ha', location: 'Nebraska, USA', soilType: 'Clay Loam' },
  { id: '4', name: 'West Field 1', crop: 'Corn', area: '52 ha', location: 'Kansas, USA', soilType: 'Sandy Loam' },
  { id: '5', name: 'Central Field 4', crop: 'Alfalfa', area: '18 ha', location: 'Iowa, USA', soilType: 'Loam' },
]

const cropComparison = [
  { crop: 'Maïs', cycle: 'Printemps-Été', waterNeed: 'Élevé (500-800mm)', heatTol: 'Moyenne', nNeed: 'Élevé', profit: 'Élevé', risk: 'Moyen', suitability: 85 },
  { crop: 'Soja', cycle: 'Printemps-Été', waterNeed: 'Moyen (450-700mm)', heatTol: 'Bonne', nNeed: 'Faible (fixation)', profit: 'Élevé', risk: 'Faible', suitability: 90 },
  { crop: 'Blé d\'hiver', cycle: 'Automne-Été', waterNeed: 'Moyen (400-600mm)', heatTol: 'Faible', nNeed: 'Moyen', profit: 'Moyen', risk: 'Faible', suitability: 75 },
  { crop: 'Sorgho', cycle: 'Printemps-Été', waterNeed: 'Faible (350-550mm)', heatTol: 'Excellente', nNeed: 'Moyen', profit: 'Moyen', risk: 'Faible', suitability: 80 },
  { crop: 'Tournesol', cycle: 'Printemps-Été', waterNeed: 'Moyen (400-600mm)', heatTol: 'Bonne', nNeed: 'Moyen', profit: 'Moyen', risk: 'Moyen', suitability: 70 },
  { crop: 'Luzerne', cycle: 'Perenne (3-5 ans)', waterNeed: 'Élevé (600-1000mm)', heatTol: 'Moyenne', nNeed: 'Faible (fixation)', profit: 'Moyen', risk: 'Faible', suitability: 78 },
]

const rotationTemplates = [
  { name: 'Maïs - Soja (Classique)', years: 2, crops: ['Maïs', 'Soja'], benefits: ['Rupture maladies', 'Économie N 40-60 kg/ha', 'Structure sol'], score: 92 },
  { name: 'Maïs - Soja - Blé (3 ans)', years: 3, crops: ['Maïs', 'Soja', 'Blé'], benefits: ['Diversité max', 'Couverture hiver', 'Gestion adventices'], score: 95 },
  { name: 'Maïs - Blé - Luzerne (4 ans)', years: 4, crops: ['Maïs', 'Blé', 'Luzerne', 'Luzerne'], benefits: ['MO +0.5%/an', 'Structure profonde', 'Fourrage'], score: 88 },
  { name: 'Sorgho - Blé - Tournesol', years: 3, crops: ['Sorgho', 'Blé', 'Tournesol'], benefits: ['Résilience sécheresse', 'Diversité racinaire', 'Marchés variés'], score: 82 },
]

export default function Crops() {
  const [selectedFarm, setSelectedFarm] = useState<Farm>(mockFarms[0])
  const [activeTab, setActiveTab] = useState('planner')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Cultures et rotations</h1>
          <p className="text-gray-500 mt-1">Comparaison cultures et planification rotations (CropShift)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>
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
                value={selectedFarm.id}
                onChange={(e) => {
                  const farm = mockFarms.find(f => f.id === e.target.value)
                  if (farm) setSelectedFarm(farm)
                }}
                options={mockFarms.map(f => ({ value: f.id, label: `${f.name} (${f.crop}, ${f.area}, ${f.soilType})` }))}
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Leaf className="w-4 h-4" />
                <span>Culture actuelle: <strong>{selectedFarm.crop}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>Sol: <strong>{selectedFarm.soilType}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <span>Surface: <strong>{selectedFarm.area}</strong></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="planner">Planificateur rotation</TabsTrigger>
          <TabsTrigger value="comparison">Comparaison cultures</TabsTrigger>
          <TabsTrigger value="templates">Modèles rotations</TabsTrigger>
        </TabsList>

        {/* Rotation Planner Tab */}
        <TabsContent value="planner">
          <RotationPlanner />
        </TabsContent>

        {/* Crop Comparison Tab */}
        <TabsContent value="comparison">
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Comparaison cultures candidates - {selectedFarm.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Analyse d'adéquation climato-pédologique pour <strong>{selectedFarm.name}</strong>
                  ({selectedFarm.soilType}, {selectedFarm.area}, {selectedFarm.location}).
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
                          <td className="py-3 text-gray-600">{crop.waterNeed}</td>
                          <td className="py-3">
                            <Badge variant={
                              crop.heatTol === 'Excellente' ? 'success' :
                              crop.heatTol === 'Bonne' ? 'info' :
                              crop.heatTol === 'Moyenne' ? 'warning' : 'default'
                            }>{crop.heatTol}</Badge>
                          </td>
                          <td className="py-3 text-gray-600">{crop.nNeed}</td>
                          <td className="py-3">
                            <Badge variant={crop.profit === 'Élevé' ? 'success' : crop.profit === 'Moyen' ? 'info' : 'default'}>
                              {crop.profit}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant={crop.risk === 'Faible' ? 'success' : crop.risk === 'Moyen' ? 'warning' : 'danger'}>
                              {crop.risk}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-24 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all"
                                  style={{ width: `${crop.suitability}%` }}
                                />
                              </div>
                              <span className="font-bold text-gray-900">{crop.suitability}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" title="Détails">
                                <Info className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Ajouter à rotation">
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
                    <li><strong>&#60;55%</strong>: Faible adéquation - Déconseillée sans modifications majeures</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-3">
                    L'adéquation combine: correspondance climatique (température, précipitations, période sans gel),
                    contraintes pédologiques (pH, texture, drainage, MO), besoins culturales, et risques historiques.
                    Ne remplace pas un avis agronomique local.
                  </p>
                </div>
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
                  Modèles de rotations recommandés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6">
                  Rotations testées et validées pour des contextes similaires à <strong>{selectedFarm.name}</strong>.
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
                          </div>
                          <div className="lg:w-48 lg:flex-none flex gap-2">
                            <Button variant="secondary" size="sm" className="flex-1">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Détails
                            </Button>
                            <Button variant="primary" size="sm" className="flex-1">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}