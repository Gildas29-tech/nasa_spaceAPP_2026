import { useState } from 'react'
import { cn } from '../lib/utils'
import {
  FileText,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Eye,
  Trash2,
  MoreVertical,
  X,
  Leaf,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  Map,
  BarChart3,
  Globe,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

interface AnalysisRecord {
  id: string
  farmName: string
  farmId: string
  type: 'soil-health' | 'rotation' | 'yield' | 'water-stress' | 'vegetation' | 'diagnostic'
  typeLabel: string
  typeIcon: any
  typeColor: string
  date: string
  period: string
  status: 'completed' | 'processing' | 'failed'
  score?: number
  summary: string
  dataSources: string[]
}

const mockAnalyses: AnalysisRecord[] = [
  {
    id: 'ANL-2024-001',
    farmName: 'North Field 1',
    farmId: '1',
    type: 'diagnostic',
    typeLabel: 'Diagnostic global',
    typeIcon: FileText,
    typeColor: 'text-blue-600 bg-blue-100',
    date: '2024-01-15',
    period: 'Jan 2023 - Jan 2024',
    status: 'completed',
    score: 78,
    summary: 'Résilience modérée. Points forts: végétation, climat. Vigilance: ressources en eau.',
    dataSources: ['NASA POWER', 'SMAP', 'Landsat 8', 'GPM IMERG', 'OpenET'],
  },
  {
    id: 'ANL-2024-002',
    farmName: 'South Field 3',
    farmId: '2',
    type: 'water-stress',
    typeLabel: 'Stress hydrique',
    typeIcon: AlertTriangle,
    typeColor: 'text-orange-600 bg-orange-100',
    date: '2024-01-14',
    period: 'Déc 2023 - Jan 2024',
    status: 'completed',
    score: 45,
    summary: 'Stress hydrique modéré détecté. Humidité surface au 15e percentile. Irrigation recommandée.',
    dataSources: ['SMAP', 'GPM IMERG', 'NASA POWER', 'OpenET'],
  },
  {
    id: 'ANL-2024-003',
    farmName: 'East Field 2',
    farmId: '3',
    type: 'vegetation',
    typeLabel: 'Végétation (NDVI)',
    typeIcon: Leaf,
    typeColor: 'text-green-600 bg-green-100',
    date: '2024-01-13',
    period: 'Avr 2023 - Jan 2024',
    status: 'completed',
    score: 82,
    summary: 'Excellente dynamique végétative. NDVI max 0.85 en juillet. Démarrage précoce saison.',
    dataSources: ['Landsat 8', 'Sentinel-2', 'MODIS'],
  },
  {
    id: 'ANL-2024-004',
    farmName: 'North Field 1',
    farmId: '1',
    type: 'rotation',
    typeLabel: 'Planification rotation',
    typeIcon: GitBranch,
    typeColor: 'text-purple-600 bg-purple-100',
    date: '2024-01-12',
    period: 'Saison 2024-2025',
    status: 'completed',
    summary: 'Rotation maïs-soja-blé recommandée. Score: 87/100. Économie N estimée 15%.',
    dataSources: ['FAO GAEZ', 'NASA POWER', 'USDA NASS', 'Literature'],
  },
  {
    id: 'ANL-2024-005',
    farmName: 'West Field 1',
    farmId: '4',
    type: 'yield',
    typeLabel: 'Prédiction rendement',
    typeIcon: TrendingUp,
    typeColor: 'text-indigo-600 bg-indigo-100',
    date: '2024-01-11',
    period: 'Saison 2024',
    status: 'completed',
    score: 87,
    summary: 'Rendement maïs prévu: 11.2 t/ha (IC95%: 10.5-11.9). Confiance 87%.',
    dataSources: ['NASA POWER', 'USDA NASS', 'SoilGrids', 'Historical yields'],
  },
  {
    id: 'ANL-2024-006',
    farmName: 'Central Field 4',
    farmId: '5',
    type: 'soil-health',
    typeLabel: 'Santé du sol',
    typeIcon: Leaf,
    typeColor: 'text-emerald-600 bg-emerald-100',
    date: '2024-01-10',
    period: 'Échantillonnage Oct 2023',
    status: 'completed',
    score: 85,
    summary: 'Score santé sol: 85/100. MO 3.8%, pH 6.5, structure favorable. Aucune carence majeure.',
    dataSources: ['SoilGrids', 'ISRIC', 'Local samples', 'NASA SMAP'],
  },
  {
    id: 'ANL-2024-007',
    farmName: 'South Field 3',
    farmId: '2',
    type: 'diagnostic',
    typeLabel: 'Diagnostic global',
    typeIcon: FileText,
    typeColor: 'text-blue-600 bg-blue-100',
    date: '2024-01-08',
    period: 'Jan 2023 - Jan 2024',
    status: 'completed',
    score: 62,
    summary: 'Résilience modérée-faible. Stress hydrique récurrent. Rotation recommandée.',
    dataSources: ['NASA POWER', 'SMAP', 'Landsat 8', 'GPM IMERG'],
  },
  {
    id: 'ANL-2024-008',
    farmName: 'East Field 2',
    farmId: '3',
    type: 'rotation',
    typeLabel: 'Planification rotation',
    typeIcon: GitBranch,
    typeColor: 'text-purple-600 bg-purple-100',
    date: '2024-01-05',
    period: 'Saison 2024-2025',
    status: 'processing',
    summary: 'Analyse en cours...',
    dataSources: ['FAO GAEZ', 'NASA POWER'],
  },
  {
    id: 'ANL-2024-009',
    farmName: 'North Field 1',
    farmId: '1',
    type: 'vegetation',
    typeLabel: 'Végétation (NDVI)',
    typeIcon: Leaf,
    typeColor: 'text-green-600 bg-green-100',
    date: '2024-01-03',
    period: 'Oct 2023 - Jan 2024',
    status: 'completed',
    score: 78,
    summary: 'Sénescence normale. Couverture résiduelle 0.35. Préparation labour printemps.',
    dataSources: ['Landsat 8', 'Sentinel-2'],
  },
  {
    id: 'ANL-2024-010',
    farmName: 'West Field 1',
    farmId: '4',
    type: 'water-stress',
    typeLabel: 'Stress hydrique',
    typeIcon: AlertTriangle,
    typeColor: 'text-orange-600 bg-orange-100',
    date: '2023-12-28',
    period: 'Nov - Déc 2023',
    status: 'completed',
    score: 70,
    summary: 'Conditions hydriques acceptables. Réserve utile 65%. Aucune irrigation requise.',
    dataSources: ['SMAP', 'GPM IMERG', 'NASA POWER'],
  },
]

const typeFilters = [
  { value: 'all', label: 'Tous les types' },
  { value: 'diagnostic', label: 'Diagnostic global' },
  { value: 'vegetation', label: 'Végétation (NDVI)' },
  { value: 'water-stress', label: 'Stress hydrique' },
  { value: 'rotation', label: 'Rotation culturale' },
  { value: 'yield', label: 'Prédiction rendement' },
  { value: 'soil-health', label: 'Santé du sol' },
]

const statusFilters = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'completed', label: 'Terminés' },
  { value: 'processing', label: 'En cours' },
  { value: 'failed', label: 'Échoués' },
]

export default function AnalysisHistory() {
  const [activeTab, setActiveTab] = useState('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('last-month')
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const filteredAnalyses = mockAnalyses
    .filter(a => {
      if (searchQuery && !a.farmName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !a.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !a.typeLabel.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => sortOrder === 'desc'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime()
    )

  const getStatusBadge = (status: AnalysisRecord['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Terminé</Badge>
      case 'processing': return <Badge variant="warning">En cours</Badge>
      case 'failed': return <Badge variant="danger">Échoué</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Historique des analyses</h1>
          <p className="text-gray-500 mt-1">Consultez, comparez et retrouvez vos analyses précédentes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Exporter liste
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher exploitation, ID, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Type d'analyse"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={typeFilters}
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Statut"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusFilters}
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
                  { value: 'all', label: 'Toutes' },
                ]}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="self-end"
            >
              {sortOrder === 'desc' ? (
                <> <ChevronDown className="w-4 h-4 mr-1" /> Plus récent </>
              ) : (
                <> <ChevronUp className="w-4 h-4 mr-1" /> Plus ancien </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Liste ({filteredAnalyses.length})</TabsTrigger>
          <TabsTrigger value="timeline">Chronologie</TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list">
          <div className="mt-6">
            {filteredAnalyses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune analyse trouvée</h3>
                  <p className="text-gray-500">Essayez de modifier vos filtres ou votre recherche.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAnalyses.map((analysis) => (
                  <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Type & ID */}
                        <div className="flex items-center gap-4 min-w-[280px]">
                          <div className={cn('p-3 rounded-xl', analysis.typeColor)}>
                            <analysis.typeIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{analysis.typeLabel}</span>
                              {getStatusBadge(analysis.status)}
                            </div>
                            <p className="text-sm text-gray-500">{analysis.farmName} • {analysis.id}</p>
                          </div>
                        </div>

                        {/* Date & Period */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 min-w-[200px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(analysis.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{analysis.period}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-4 min-w-[120px]">
                          {analysis.score !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className={cn('font-bold text-lg', analysis.score >= 80 ? 'text-green-600' : analysis.score >= 60 ? 'text-yellow-600' : analysis.score >= 40 ? 'text-orange-600' : 'text-red-600')}>
                                {analysis.score}/100
                              </span>
                              <BarChart3 className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 truncate">{analysis.summary}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAnalysis(analysis)}>
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Voir</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {}}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {}}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Data Sources */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500">Sources:</span>
                        {analysis.dataSources.map((source, i) => (
                          <Badge key={i} variant="default" className="text-xs bg-gray-100 text-gray-600">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline">
          <div className="mt-6">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              {filteredAnalyses.map((analysis, index) => (
                <div key={analysis.id} className="relative pl-16 pb-8 last:pb-0">
                  <div className="absolute left-0 top-1 w-16 text-right pr-3 text-xs text-gray-500">
                    {formatDate(analysis.date)}
                  </div>
                  <div className="absolute left-4 top-2 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white z-10"
                    style={{ backgroundColor: analysis.typeColor.replace('bg-', '').replace('100', '500').replace('600', '500').replace('text-', '') }}>
                    <analysis.typeIcon className="w-5 h-5" style={{ color: analysis.typeColor.replace('bg-', 'text-') }} />
                  </div>
                  <Card className="ml-4">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{analysis.farmName}</span>
                            <Badge variant="default" className={analysis.typeColor}>{analysis.typeLabel}</Badge>
                            {getStatusBadge(analysis.status)}
                          </div>
                          <p className="text-sm text-gray-600">{analysis.summary}</p>
                          {analysis.score !== undefined && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className={cn('font-medium', analysis.score >= 80 ? 'text-green-600' : analysis.score >= 60 ? 'text-yellow-600' : 'text-orange-600')}>
                                Score: {analysis.score}/100
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{analysis.period}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAnalysis(analysis)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {}}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn('p-3 rounded-xl', selectedAnalysis.typeColor)}>
                    <selectedAnalysis.typeIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedAnalysis.typeLabel}</h2>
                    <p className="text-sm text-gray-500">{selectedAnalysis.farmName} • {selectedAnalysis.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(selectedAnalysis.date)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedAnalysis.period}</span>
                  {getStatusBadge(selectedAnalysis.status)}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedAnalysis(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="p-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">Résumé</h3>
                <p className="text-gray-700">{selectedAnalysis.summary}</p>
              </div>

              {/* Score */}
              {selectedAnalysis.score !== undefined && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-500">Score global</p>
                    <p className={cn('text-3xl font-bold', selectedAnalysis.score >= 80 ? 'text-green-600' : selectedAnalysis.score >= 60 ? 'text-yellow-600' : selectedAnalysis.score >= 40 ? 'text-orange-600' : 'text-red-600')}>
                      {selectedAnalysis.score}/100
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-500">Sources de données</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedAnalysis.dataSources.length}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-500">Statut</p>
                    <p className="text-lg font-bold text-gray-900 capitalize">{selectedAnalysis.status}</p>
                  </div>
                </div>
              )}

              {/* Data Sources */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Sources de données utilisées</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.dataSources.map((source, i) => (
                    <Badge key={i} variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={() => {}}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger rapport
                </Button>
                <Button onClick={() => {}}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir détails complets
                </Button>
                <Button variant="secondary" onClick={() => setSelectedAnalysis(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}