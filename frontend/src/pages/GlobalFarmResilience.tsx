import { useState } from 'react'
import { cn } from '../lib/utils'
import {
  FileText,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Leaf,
  Droplet,
  Sun,
  Cloud,
  TrendingUp,
  Target,
  Shield,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Select } from '../components/ui/Select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface FarmData {
  id: string
  name: string
  location: string
  area: string
  crop: string
  soilType: string
}

const mockFarm: FarmData = {
  id: '1',
  name: 'North Field 1',
  location: 'Iowa, USA',
  area: '45 ha',
  crop: 'Corn',
  soilType: 'Loam',
}

const diagnosticSections = [
  {
    id: 'climate',
    title: 'Conditions climatiques',
    icon: Cloud,
    color: 'text-blue-600 bg-blue-100',
    status: 'good',
    score: 78,
    items: [
      { label: 'Température moyenne (annuelle)', value: '11.2°C', unit: 'Optimal pour maïs: 10-14°C', status: 'good' },
      { label: 'Précipitations annuelles', value: '920 mm', unit: 'Besoin maïs: 500-800 mm', status: 'good' },
      { label: 'Jours > 35°C (été)', value: '12 jours', unit: 'Seuil stress: >15 jours', status: 'good' },
      { label: 'Période sans gel', value: '165 jours', unit: 'Besoin maïs: >140 jours', status: 'good' },
      { label: 'Rayonnement solaire', value: '5.2 kWh/m²/j', unit: 'Bon pour photosynthèse', status: 'good' },
    ],
    risks: [
      { type: 'warning', title: 'Tendance au réchauffement', desc: '+1.2°C sur 30 ans. Augmentation probable des jours de stress thermique.' },
      { type: 'info', title: 'Variabilité précipitations', desc: 'CV 18% sur 10 ans. Risque de sécheresse estivale accru.' },
    ]
  },
  {
    id: 'vegetation',
    title: 'État de la végétation',
    icon: Leaf,
    color: 'text-green-600 bg-green-100',
    status: 'good',
    score: 82,
    items: [
      { label: 'NDVI max (saison)', value: '0.85', unit: 'Excellent développement', status: 'good' },
      { label: 'NDVI moyen (saison)', value: '0.72', unit: 'Au-dessus moyenne régionale', status: 'good' },
      { label: 'Date pic végétation', value: '15 juillet', unit: 'Normal pour la région', status: 'good' },
      { label: 'Amplitude saisonnière', value: '0.70', unit: 'Bonne dynamique', status: 'good' },
      { label: 'EVI moyen', value: '0.68', unit: 'Confirmation bonne santé', status: 'good' },
    ],
    risks: [
      { type: 'info', title: 'Hétérogénéité intra-parcellaire', desc: 'CV 12% observé. Zones de compaction potentielles.' },
    ]
  },
  {
    id: 'water',
    title: 'Ressources en eau',
    icon: Droplet,
    color: 'text-cyan-600 bg-cyan-100',
    status: 'warning',
    score: 65,
    items: [
      { label: 'Humidité sol surface (SMAP)', value: '0.28 m³/m³', unit: '45e percentile', status: 'warning' },
      { label: 'Humidité zone racinaire', value: '0.32 m³/m³', unit: '60e percentile', status: 'good' },
      { label: 'Déficit pluviométrique (30j)', value: '-25 mm', unit: 'Légèrement sec', status: 'warning' },
      { label: 'ET0 cumulée (saison)', value: '680 mm', unit: 'Évapotranspiration référence', status: 'info' },
      { label: 'ET réelle (OpenET)', value: '520 mm', unit: '76% de ET0', status: 'good' },
    ],
    risks: [
      { type: 'warning', title: 'Stress hydrique modéré', desc: 'Humidité surface sous la normale. Surveillance irrigation recommandée.' },
      { type: 'info', title: 'Réserve utile estimée', value: '140 mm', desc: 'Basé sur type sol et profondeur racinaire.' },
    ]
  },
  {
    id: 'soil',
    title: 'Contraintes du sol',
    icon: Target,
    color: 'text-amber-600 bg-amber-100',
    status: 'info',
    score: 70,
    items: [
      { label: 'Type de sol', value: 'Loam', unit: 'Favorable cultures', status: 'good' },
      { label: 'pH (estimé)', value: '6.5', unit: 'Optimal maïs: 6.0-6.8', status: 'good' },
      { label: 'Matière organique', value: '3.2%', unit: 'Correct', status: 'good' },
      { label: 'Capacité champ', value: '0.35 m³/m³', unit: 'Bonne rétention', status: 'good' },
      { label: 'Point de flétrissement', value: '0.15 m³/m³', unit: 'Réserve utile: 200 mm', status: 'info' },
    ],
    risks: [
      { type: 'info', title: 'Données sol estimées', desc: 'Basées sur carte régionale. Prélèvement local recommandé pour précision.' },
    ]
  },
]

const adaptationStrategies = [
  {
    id: 'rotation',
    title: 'Rotation culturale diversifiée',
    category: 'Cultures',
    priority: 'high',
    description: 'Introduire soja ou blé d\'hiver en rotation avec le maïs pour briser les cycles de ravageurs, améliorer la structure du sol et réduire les besoins en azote.',
    benefits: ['-15% engrais N', '+5% rendement maïs suivant', 'Réduction maladies', 'Meilleure résilience sècheresse'],
    confidence: 85,
    sources: ['USDA NRCS', 'Iowa State Extension', 'Literature review'],
  },
  {
    id: 'cover',
    title: 'Cultures de couverture',
    category: 'Pratiques',
    priority: 'high',
    description: 'Semer seigle ou radis fourrager après récolte maïs pour protéger le sol, capter l\'azote résiduel et augmenter la matière organique.',
    benefits: ['+0.2-0.5% MO/an', '-30% lessivage N', 'Structure sol', 'Suppression adventices'],
    confidence: 80,
    sources: ['SARE', 'Midwest Cover Crops Council'],
  },
  {
    id: 'irrigation',
    title: 'Gestion irrigation optimisée',
    category: 'Eau',
    priority: 'medium',
    description: 'Utiliser sondes capacitives + modèles ET pour déclencher irrigation au seuil critique (50% réserve utile). Éviter sur-irrigation.',
    benefits: ['-20% eau', 'Maintien rendement', 'Réduction lessivage', 'Économies énergétiques'],
    confidence: 75,
    sources: ['FAO Irrigation Guidelines', 'Local Extension'],
  },
  {
    id: 'tillage',
    title: 'Réduction travail du sol',
    category: 'Pratiques',
    priority: 'medium',
    description: 'Passer au strip-till ou no-till pour préserver structure, réduire érosion et séquestrer carbone.',
    benefits: ['-50% érosion', '+0.1-0.3 tC/ha/an', '-30% carburant', 'Meilleure portance'],
    confidence: 70,
    sources: ['Conservation Technology Information Center'],
  },
  {
    id: 'variety',
    title: 'Variétés tolérantes stress',
    category: 'Génétique',
    priority: 'medium',
    description: 'Sélectionner hybrides maïs avec tolérance sécheresse (DroughtGard, AquaMax) et chaleur pour sécuriser rendements.',
    benefits: ['+5-10% rendement stress', 'Stabilité', 'Moins sensible pics chaleur'],
    confidence: 78,
    sources: ['Seed company trials', 'University variety tests'],
  },
]

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

const getScoreBg = (score: number) => {
  if (score >= 80) return 'bg-green-100'
  if (score >= 60) return 'bg-yellow-100'
  if (score >= 40) return 'bg-orange-100'
  return 'bg-red-100'
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'good': return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-600" />
    case 'info': return <Info className="w-4 h-4 text-blue-600" />
    default: return <Info className="w-4 h-4 text-gray-600" />
  }
}

export default function GlobalFarmResilience() {
  const [activeTab, setActiveTab] = useState('diagnostic')
  const [expandedSections, setExpandedSections] = useState<string[]>(['climate', 'vegetation', 'water', 'soil'])

  const overallScore = Math.round(
    diagnosticSections.reduce((sum, s) => sum + s.score, 0) / diagnosticSections.length
  )

  const toggleSection = (id: string) => {
    setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Global Farm Resilience</h1>
          <p className="text-gray-500 mt-1">Diagnostic global et plan d'adaptation - {mockFarm.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Farm Info Bar */}
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{mockFarm.name}</p>
                <p className="text-sm text-gray-600">{mockFarm.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Leaf className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{mockFarm.crop}</p>
                <p className="text-sm text-gray-600">Culture principale</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{mockFarm.area}</p>
                <p className="text-sm text-gray-600">Surface</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{mockFarm.soilType}</p>
                <p className="text-sm text-gray-600">Type de sol</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className={cn('p-3 rounded-xl', getScoreBg(overallScore))}>
                <span className={cn('text-2xl font-bold', getScoreColor(overallScore))}>{overallScore}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Score résilience global</p>
                <p className={cn('font-semibold', getScoreColor(overallScore))}>
                  {overallScore >= 80 ? 'Résilient' : overallScore >= 60 ? 'Modéré' : overallScore >= 40 ? 'Vulnérable' : 'Critique'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
          <TabsTrigger value="strategies">Stratégies d'adaptation</TabsTrigger>
          <TabsTrigger value="report">Rapport complet</TabsTrigger>
        </TabsList>

        {/* Diagnostic Tab */}
        <TabsContent value="diagnostic">
          <div className="mt-6 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {diagnosticSections.map((section) => (
                <Card key={section.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn('p-3 rounded-xl', section.color)}>
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div className={cn('text-2xl font-bold text-right', getScoreColor(section.score))}>
                        {section.score}/100
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{section.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {section.items.filter(i => i.status === 'good').length}/{section.items.length} indicateurs favorables
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => toggleSection(section.id)}
                    >
                      {expandedSections.includes(section.id) ? (
                        <> <ChevronUp className="w-4 h-4 mr-1" /> Masquer détails </>
                      ) : (
                        <> <ChevronDown className="w-4 h-4 mr-1" /> Voir détails </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Expanded Sections */}
            <div className="space-y-4">
              {diagnosticSections.map((section) => (
                expandedSections.includes(section.id) && (
                  <Card key={section.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <section.icon className={cn('w-5 h-5', section.color.replace('bg-', 'text-').replace('100', '600'))} />
                        {section.title} - Détails
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Indicators Table */}
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-gray-500">
                              <th className="pb-2 font-medium w-1/2">Indicateur</th>
                              <th className="pb-2 font-medium w-1/4">Valeur</th>
                              <th className="pb-2 font-medium">Référence / Contexte</th>
                              <th className="pb-2 font-medium w-1/6">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.items.map((item, i) => (
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 text-gray-700">{item.label}</td>
                                <td className="py-3 font-medium text-gray-900">{item.value}</td>
                                <td className="py-3 text-gray-600">{item.unit}</td>
                                <td className="py-3">
                                  {getStatusIcon(item.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Risks */}
                      {section.risks.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            Risques identifiés
                          </h4>
                          {section.risks.map((risk, i) => (
                            <div key={i} className={cn('p-4 rounded-lg border-l-4', risk.type === 'warning' ? 'bg-orange-50 border-orange-400' : 'bg-blue-50 border-blue-400')}>
                              <div className="flex items-start gap-3">
                                {risk.type === 'warning' ? (
                                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{risk.title}</h5>
                                  <p className="text-sm text-gray-600 mt-1">{risk.desc}</p>
                                </div>
                                <Badge variant={risk.type === 'warning' ? 'warning' : 'info'}>
                                  {risk.type === 'warning' ? 'Attention' : 'Information'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies">
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Stratégies d'adaptation recommandées</h2>
              <div className="flex gap-2">
                <Select
                  value="all"
                  onChange={() => {}}
                  options={[
                    { value: 'all', label: 'Toutes' },
                    { value: 'high', label: 'Priorité haute' },
                    { value: 'medium', label: 'Priorité moyenne' },
                    { value: 'low', label: 'Priorité basse' },
                  ]}
                  className="w-40"
                />
              </div>
            </div>

            <div className="space-y-4">
              {adaptationStrategies.map((strategy) => (
                <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{strategy.title}</h3>
                          <Badge variant={strategy.priority === 'high' ? 'danger' : strategy.priority === 'medium' ? 'warning' : 'info'}>
                            {strategy.priority === 'high' ? 'Priorité haute' : strategy.priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse'}
                          </Badge>
                          <Badge variant="default">{strategy.category}</Badge>
                          <div className={cn('ml-auto p-2 rounded-full', getScoreBg(strategy.confidence))}>
                            <span className={cn('font-bold', getScoreColor(strategy.confidence))}>
                              Confiance: {strategy.confidence}%
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4">{strategy.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {strategy.benefits.map((benefit, i) => (
                            <Badge key={i} variant="default" className="bg-green-50 text-green-700 border-green-200">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="lg:w-64 lg:flex-none text-right">
                        <p className="text-xs text-gray-500 mb-2">Sources:</p>
                        <div className="space-y-1 text-xs text-gray-600">
                          {strategy.sources.map((source, i) => (
                            <p key={i} className="flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              {source}
                            </p>
                          ))}
                        </div>
                        <Button variant="secondary" size="sm" className="mt-4 w-full">
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Détails
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report">
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Rapport de diagnostic - {mockFarm.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="font-medium text-gray-900">Date du rapport</p>
                    <p className="text-gray-600">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="font-medium text-gray-900">Période d'analyse</p>
                    <p className="text-gray-600">Janvier 2023 - Janvier 2024</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="font-medium text-gray-900">Sources de données</p>
                    <p className="text-gray-600">NASA POWER, SMAP, Landsat, GPM, OpenET</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50">
                    <p className="font-medium text-gray-900">Résolution spatiale</p>
                    <p className="text-gray-600">30m (Landsat) / 9km (SMAP) / 0.5° (POWER)</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Synthèse exécutive</h4>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <p>
                      L'exploitation <strong>{mockFarm.name}</strong> ({mockFarm.area}, {mockFarm.crop}) présente un niveau de résilience global
                      <strong className={getScoreColor(overallScore)}>{overallScore}/100</strong>
                      ({overallScore >= 80 ? 'résilient' : overallScore >= 60 ? 'modéré' : 'vulnérable'}).
                    </p>
                    <p className="mt-2">
                      Les points forts sont la <strong>végétation</strong> (score 82/100) et les <strong>conditions climatiques</strong> (78/100),
                      indiquant un bon potentiel productif dans les conditions actuelles.
                    </p>
                    <p className="mt-2">
                      Le principal point de vigilance concerne les <strong>ressources en eau</strong> (65/100),
                      avec un déficit pluviométrique récent et une humidité de surface sous les normales saisonnières.
                    </p>
                    <p className="mt-2">
                      <strong>5 stratégies d'adaptation</strong> sont recommandées, dont 2 à priorité haute :
                      rotation culturale diversifiée et cultures de couverture,
                      offrant des bénéfices agronomiques, environnementaux et économiques documentés.
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Limites et incertitudes</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm">
                    <li>Données satellitaires : résolution spatiale variable (30m à 9km), couverture nuageuse possible</li>
                    <li>Données sol : estimées depuis cartes régionales, non basées sur prélèvements locaux</li>
                    <li>Modèles climatiques : basés sur historiques, n'intègrent pas scénarios futurs spécifiques</li>
                    <li>Recommandations : basées sur littérature générale, non adaptées au contexte réglementaire/local spécifique</li>
                    <li>Validation humaine requise pour décisions agronomiques importantes</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => {}}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button onClick={() => {}}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Générer rapport complet
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}