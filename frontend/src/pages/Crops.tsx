import { useState, useEffect } from 'react'
import { cn, downloadCsv } from '../lib/utils'
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
  BarChart3,
  Zap,
  BookOpen,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHero } from '../components/PageHero'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import RotationPlanner from './RotationPlanner'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { AnimatedPage } from '../components/PageTransition'
import { Skeleton, CardSkeleton, TableSkeleton } from '../components/ui/Skeleton'

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

const cropIcons: Record<string, any> = {
  corn: Leaf,
  wheat: Leaf,
  soybean: Leaf,
  rice: Leaf,
  cotton: Leaf,
  sorghum: Leaf,
  barley: Leaf,
  alfalfa: Leaf,
  canola: Leaf,
  sunflower: Leaf,
  pea: Leaf,
  rye: Leaf,
  radish: Leaf,
  clover: Leaf,
  default: Leaf,
}

// Loading skeleton
function CropsSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="CropShift" title="Cultures et rotations" subtitle="Comparer les cultures et choisir la rotation qui tient." />
        <CardSkeleton className="animate-fade-in" style={{ animationDelay: '100ms' }} />
        <CardSkeleton className="animate-fade-in" style={{ animationDelay: '200ms' }} />
      </div>
    </AnimatedPage>
  )
}

function ChartCard({ title, subtitle, icon, children, className, delay = 0, ...props }: any) {
  return (
    <Card variant="elevated" className={cn('hover-lift', className)} {...props} style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon && <span className="p-1.5 rounded-lg bg-primary-100 text-primary-600">{icon}</span>}
          <div>
            <span>{title}</span>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        {children}
      </CardContent>
    </Card>
  )
}

function StatMetricCard({ icon: Icon, iconBg, label, value, delay = 0, trend }: any) {
  return (
    <Card variant="elevated" className="hover-lift" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-xl', iconBg + '100')}>
              <Icon className={cn('w-6 h-6', iconBg)} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900 animate-count-up">{value}</p>
            </div>
          </div>
          {trend && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trend > 0 ? 'text-green-600' : 'text-red-600')}>
              <TrendingUp className="w-4 h-4" />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CropRow({ crop, index, onDetails, onAdd }: { crop: CropSuitability; index: number; onDetails: () => void; onAdd: () => void }) {
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

  const CropIcon = cropIcons[crop.crop] || cropIcons.default

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
      <td className="py-3 font-medium text-gray-900 flex items-center gap-2">
        <CropIcon className="w-4 h-4 text-green-600" />
        {crop.crop}
      </td>
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
              className="h-full bg-green-500 rounded-full animate-slide-right"
              style={{ width: `${crop.suitability_score}%` }}
            />
          </div>
          <span className="font-bold text-gray-900">{crop.suitability_score}%</span>
        </div>
      </td>
      <td className="py-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" title="Détails" onClick={onDetails} className="hover-lift">
            <Info className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Ajouter à rotation" onClick={onAdd} className="hover-lift">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

function TemplateCard({ template, index, onDetails, onUse }: { template: RotationTemplate; index: number; onDetails: () => void; onUse: () => void }) {
  return (
    <Card variant="elevated" className="hover-lift hover:shadow-lg transition-all duration-300" hover style={{ animationDelay: `${index * 60}ms` }}>
      <CardContent className="p-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <Badge variant="default">{template.years} ans</Badge>
              <div className="ml-auto p-2 rounded-full bg-green-100 text-green-700 font-bold animate-scale-in">
                Score: {template.score}/100
              </div>
            </div>
            {template.description && (
              <p className="text-sm text-gray-600 mb-3 animate-slide-up">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              {template.crops.map((crop, ci) => (
                <Badge key={ci} variant="default" className="bg-purple-50 text-purple-700 border-purple-200" style={{ animationDelay: `${ci * 50}ms` }}>
                  {crop} {ci < template.crops.length - 1 ? '→' : ''}
                </Badge>
              ))}
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              {template.benefits.map((benefit, bi) => (
                <li key={bi} className="flex items-center gap-2" style={{ animationDelay: `${bi * 50}ms` }}>
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
            {template.constraints && template.constraints.length > 0 && (
              <ul className="space-y-1 text-sm text-amber-700 mt-3">
                {template.constraints.map((constraint, ci) => (
                  <li key={ci} className="flex items-center gap-2" style={{ animationDelay: `${ci * 50}ms` }}>
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    {constraint}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="lg:w-48 lg:flex-none flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 hover-lift" onClick={onDetails}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Détails
            </Button>
            <Button variant="primary" size="sm" className="flex-1 hover-lift" onClick={onUse}>
              <GitBranch className="w-4 h-4 mr-1" />
              Utiliser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FarmSelector({ farms, selectedFarm, onSelect }: { farms: Farm[]; selectedFarm: Farm | null; onSelect: (farm: Farm) => void }) {
  return (
    <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '50ms' }}>
      <CardContent className="p-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 sm:w-64 animate-slide-up">
            <Select
              label="Exploitation"
              placeholder="Sélectionner une exploitation"
              value={selectedFarm?.id || ''}
              onChange={(e) => {
                const farm = farms.find(f => f.id === e.target.value)
                if (farm) onSelect(farm)
              }}
              options={farms.map(f => ({
                value: f.id,
                label: `${f.name} (${f.crops_of_interest?.[0] || 'No crop'}, ${f.area || 'Unknown area'}, ${f.location || 'Unknown'})`
              }))}
              className="hover-lift"
            />
          </div>
          {selectedFarm && (
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-1">
                <Leaf className="w-4 h-4 text-green-600" />
                <span>Culture actuelle: <strong>{selectedFarm.crops_of_interest?.[0] || 'Non définie'}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Surface: <strong>{selectedFarm.area || 'Inconnue'}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4 text-purple-600" />
                <span>Localisation: <strong>{selectedFarm.location || 'Inconnue'}</strong></span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CropComparisonTab({ cropComparison, loading, selectedFarm, onRefresh }: any) {
  return (
    <TabsContent value="comparison" transition="slide">
      <div className="mt-4 animate-fade-in">
        {loading ? (
          <TableSkeleton rows={5} columns={9} />
        ) : cropComparison.length > 0 ? (
          <>
            <p className="text-gray-600 mb-6 animate-fade-in">
              Analyse d'adéquation climato-pédologique pour <strong>{selectedFarm?.name || 'cette ferme'}</strong>
              ({selectedFarm?.location || 'Localisation inconnue'}).
              Score basé sur: climat (NASA POWER), sol (SoilGrids), besoins culturales, risques.
            </p>

            <ChartCard
              title="Comparaison des Cultures Candidates"
              subtitle={`${cropComparison.length} cultures analysées pour votre exploitation`}
              icon={<BarChart3 className="w-5 h-5" />}
              delay={0}
            >
              <div className="overflow-x-auto animate-fade-in">
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
                    {cropComparison.map((crop: any, i: number) => (
                      <CropRow
                        key={i}
                        crop={crop}
                        index={i}
                        onDetails={() => alert(`Détails pour ${crop.crop}: ${crop.details ? JSON.stringify(crop.details, null, 2) : 'Pas de détails disponibles'}`)}
                        onAdd={() => { /* addToast({ type: 'info', title: 'À venir', message: 'Ajout à la rotation bientôt disponible' }) */ }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {/* Detailed view for selected crop */}
            <Card variant="outlined" className="border-blue-200 bg-blue-50 hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardContent className="p-4 animate-fade-in">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Comment interpréter l'adéquation
                </h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
                  <li className="animate-scale-in"><strong>85-100%</strong>: Excellente adéquation - Culture recommandée prioritairement</li>
                  <li className="animate-scale-in"><strong>70-84%</strong>: Bonne adéquation - Viable avec gestion adaptée</li>
                  <li className="animate-scale-in"><strong>55-69%</strong>: Adéquation moyenne - Risques identifiés, surveillance accrue</li>
                  <li className="animate-scale-in"><strong>Below 55%</strong>: Faible adéquation - Déconseillée sans modifications majeures</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3 animate-fade-in">
                  L'adéquation combine: correspondance climatique (température, précipitations, période sans gel),
                  contraintes pédologiques (pH, texture, drainage, MO), besoins culturales, et risques historiques.
                  Ne remplace pas un avis agronomique local.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <ChartCard
            title="Aucune Donnée Disponible"
            subtitle="Cliquez sur Actualiser pour lancer l'analyse"
            icon={<Info className="w-5 h-5" />}
            delay={0}
          >
            <div className="text-center py-8 text-gray-500 animate-fade-in">
              <Info className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
              <p>Aucune donnée de comparaison disponible</p>
              <p className="text-sm mt-1">Lancez une analyse d'adéquation culturelle via le bouton Actualiser</p>
            </div>
          </ChartCard>
        )}
      </div>
    </TabsContent>
  )
}

function RotationTemplatesTab({ rotationTemplates, loading, selectedFarm, onCreateCustom }: any) {
  return (
    <TabsContent value="templates" transition="slide">
      <div className="mt-4 animate-fade-in">
        {loading ? (
          <div className="space-y-3 animate-fade-in">
            {[1, 2, 3].map(i => (
              <CardSkeleton key={i} className="animate-pulse" />
            ))}
          </div>
        ) : rotationTemplates.length > 0 ? (
          <>
            <p className="text-gray-600 mb-6 animate-fade-in">
              Rotations testées et validées pour des contextes similaires à <strong>{selectedFarm?.name || 'cette ferme'}</strong>.
              Scores basés sur: résilience, rentabilité, santé sol, gestion adventices/maladies.
            </p>

            <div className="space-y-4">
              {rotationTemplates.map((template: any, i: number) => (
                <TemplateCard
                  key={i}
                  template={template}
                  index={i}
                  onDetails={() => alert(`Détails: ${template.description || 'Aucune description'}`)}
                  onUse={() => { /* addToast({ type: 'info', title: 'À venir', message: 'Application de rotation bientôt disponible' }) */ }}
                />
              ))}
            </div>

            {/* Custom Rotation Builder Link */}
            <Card variant="outlined" className="border-gray-200 bg-gray-50 hover-lift text-center animate-fade-in" style={{ animationDelay: `${rotationTemplates.length * 80 + 50}ms` }}>
              <CardContent className="p-6 animate-fade-in">
                <p className="text-gray-600 mb-3">Besoin d'une rotation personnalisée ?</p>
                <Button variant="primary" onClick={onCreateCustom} className="hover-lift">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Créer ma rotation sur mesure
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <ChartCard
            title="Aucun Modèle Disponible"
            subtitle="Les modèles seront générés selon votre sol et climat"
            icon={<BookOpen className="w-5 h-5" />}
            delay={0}
          >
            <div className="text-center py-8 text-gray-500 animate-fade-in">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
              <p>Aucun modèle de rotation disponible</p>
              <p className="text-sm mt-1">Les modèles seront générés selon votre sol et climat</p>
            </div>
          </ChartCard>
        )}
      </div>
    </TabsContent>
  )
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
  const [showResults, setShowResults] = useState(false)

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
          api.get<{ crops: CropSuitability[] }>(`/crops/suitability`, {
            params: { farm_id: selectedFarm.id }
          }),
          api.get<{ templates: RotationTemplate[] }>(`/crops/rotation-templates`, {
            params: { farm_id: selectedFarm.id }
          })
        ])
        setCropComparison(suitability.crops || [])
        setRotationTemplates(templates.templates || [])
        setShowResults(true)
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

  const exportCropComparison = () => {
    if (!selectedFarm || cropComparison.length === 0) return
    downloadCsv(
      `cultures-${selectedFarm.id}.csv`,
      ['Parcelle', 'Culture', 'Nom scientifique', 'Adéquation (%)', 'Cycle', 'Besoin en eau', 'Tolérance à la chaleur', 'Risque climatique', 'Potentiel économique'],
      cropComparison.map((crop) => [
        selectedFarm.name,
        crop.crop,
        crop.scientific_name,
        crop.suitability_score,
        crop.cycle,
        crop.water_need,
        crop.heat_tolerance,
        crop.climate_risk,
        crop.profit_potential,
      ]),
    )
  }

  const handleRefresh = async () => {
    if (!selectedFarm) return
    addToast({ type: 'info', title: 'Refreshing', message: 'Fetching latest crop data...' })
    // Re-fetch data
    try {
      const [suitability, templates] = await Promise.all([
        api.get<{ crops: CropSuitability[] }>(`/crops/suitability`, {
          params: { farm_id: selectedFarm.id }
        }),
        api.get<{ templates: RotationTemplate[] }>(`/crops/rotation-templates`, {
          params: { farm_id: selectedFarm.id }
        })
      ])
      setCropComparison(suitability.crops || [])
      setRotationTemplates(templates.templates || [])
      setShowResults(true)
      addToast({ type: 'success', title: 'Updated', message: 'Crop data refreshed' })
    } catch {
      addToast({ type: 'error', title: 'Failed to refresh', message: 'Please try again' })
    }
  }

  if (farmsLoading) {
    return <CropsSkeleton />
  }

  if (farms.length === 0) {
    return (
      <AnimatedPage className="space-y-6">
        <PageHero
          kicker="CropShift"
          title="Cultures et rotations"
          subtitle="Comparer les cultures et choisir la rotation qui tient."
        />
        <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardContent className="p-12 text-center animate-fade-in">
            <Leaf className="w-12 h-12 text-emerald-700/40 mx-auto mb-4 animate-float" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune exploitation</h3>
            <p className="text-gray-500 mb-4">Posez un champ sur la carte pour planifier les cultures.</p>
            <Button onClick={() => window.location.href = '/field-map'} className="hover-lift">
              <Plus className="w-4 h-4 mr-2" />
              Créer sur la carte
            </Button>
          </CardContent>
        </Card>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <PageHero
        kicker="CropShift"
        title="Cultures et rotations"
        subtitle="Comparer les cultures et choisir la rotation qui tient."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading || !selectedFarm} className="hover-lift">
              <RefreshCw className={cn('w-4 h-4 mr-2', loading ? 'animate-spin' : '')} />
              Actualiser
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCropComparison} disabled={!selectedFarm || cropComparison.length === 0} className="hover-lift">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </>
        }
      />

      {/* Farm Selector */}
      <FarmSelector farms={farms} selectedFarm={selectedFarm} onSelect={setSelectedFarm} />

      {error && (
        <Card variant="outlined" className="border-red-200 bg-red-50 animate-shake animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-auto hover-lift">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats when data loaded */}
      {showResults && cropComparison.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <StatMetricCard icon={Leaf} iconBg="bg-green-600" label="Cultures Analysées" value={cropComparison.length} delay={0} />
          <StatMetricCard icon={Target} iconBg="bg-blue-600" label="Meilleure Adéquation" value={`${Math.max(...cropComparison.map(c => c.suitability_score))}%`} delay={80}  />
          <StatMetricCard icon={TrendingUp} iconBg="bg-yellow-600" label="Adéquation Moyenne" value={`${Math.round(cropComparison.reduce((a,b) => a + b.suitability_score, 0) / cropComparison.length)}%`} delay={160} />
          <StatMetricCard icon={GitBranch} iconBg="bg-purple-600" label="Modèles Rotation" value={rotationTemplates.length} delay={240} />
          <StatMetricCard icon={Zap} iconBg="bg-orange-600" label="Score Max Rotation" value={rotationTemplates.length > 0 ? `${Math.max(...rotationTemplates.map(t => t.score))}/100` : 'N/A'} delay={320} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full" animated transition="slide">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="planner" icon={<GitBranch className="w-4 h-4" />}>Planificateur rotation</TabsTrigger>
          <TabsTrigger value="comparison" icon={<BarChart3 className="w-4 h-4" />}>Comparaison cultures</TabsTrigger>
          <TabsTrigger value="templates" icon={<BookOpen className="w-4 h-4" />}>Modèles rotations</TabsTrigger>
        </TabsList>

        {/* Rotation Planner Tab */}
        <TabsContent value="planner" transition="slide">
          {selectedFarm ? (
            <RotationPlanner farmId={selectedFarm.id} />
          ) : (
            <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '50ms' }}>
              <CardContent className="p-12 text-center animate-fade-in">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Sélectionnez une exploitation</h3>
                <p className="text-gray-500">Pour accéder au planificateur de rotation</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Crop Comparison Tab */}
        <CropComparisonTab
          cropComparison={cropComparison}
          loading={loading}
          selectedFarm={selectedFarm}
          onRefresh={handleRefresh}
        />

        {/* Rotation Templates Tab */}
        <RotationTemplatesTab
          rotationTemplates={rotationTemplates}
          loading={loading}
          selectedFarm={selectedFarm}
          onCreateCustom={() => setActiveTab('planner')}
        />
      </Tabs>
    </AnimatedPage>
  )
}