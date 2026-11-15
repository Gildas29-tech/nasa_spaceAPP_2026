import { useState, useEffect } from 'react'
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
import { api, type FarmResponse } from '../lib/api'
import { useFarmStore } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'

interface AnalysisRecord {
  id: string
  farm_id: string
  farm_name: string
  type: 'soil-health' | 'rotation' | 'yield' | 'water-stress' | 'vegetation' | 'diagnostic'
  type_label: string
  type_icon: string
  type_color: string
  date: string
  period: string
  status: 'completed' | 'processing' | 'failed'
  score?: number
  summary: string
  data_sources: string[]
}

const typeIconMap: Record<string, any> = {
  'diagnostic': FileText,
  'vegetation': Leaf,
  'water-stress': AlertTriangle,
  'rotation': GitBranch,
  'yield': TrendingUp,
  'soil-health': Leaf,
}

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

export default function AnalysisHistory({ farmId }: { farmId?: string }) {
  const { farms } = useFarmStore()
  const { addToast } = useUIStore()
  const [activeTab, setActiveTab] = useState('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('last-month')
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build params for API call
  const buildParams = () => {
    const params: Record<string, string> = {}
    if (farmId) params.farm_id = farmId
    if (typeFilter !== 'all') params.type = typeFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (dateRange !== 'all') params.period = dateRange
    return params
  }

  // Fetch analyses on mount and when filters change
  useEffect(() => {
    const fetchAnalyses = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.get<AnalysisRecord[]>(`/api/v1/reports/history`, {
          params: buildParams()
        })
        setAnalyses(data)
      } catch (err: any) {
        console.error('Failed to fetch analysis history:', err)
        setError('Failed to load analysis history')
        setAnalyses([])
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyses()
  }, [farmId, typeFilter, statusFilter, dateRange])

  const handleRefresh = async () => {
    addToast({ type: 'info', title: 'Refreshing', message: 'Fetching latest analyses...' })
    try {
      const data = await api.get<AnalysisRecord[]>(`/api/v1/reports/history`, {
        params: buildParams()
      })
      setAnalyses(data)
      addToast({ type: 'success', title: 'Updated', message: 'Analysis history refreshed' })
    } catch {
      addToast({ type: 'error', title: 'Failed to refresh', message: 'Please try again' })
    }
  }

  const handleExport = () => {
    addToast({ type: 'info', title: 'Exporting', message: 'Preparing export...' })
    // TODO: Implement export
  }

  const filteredAnalyses = analyses
    .filter(a => {
      if (searchQuery && !a.farm_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !a.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !a.type_label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
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

  const getTypeIcon = (type: string) => {
    const Icon = typeIconMap[type] || FileText
    return Icon
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Historique des analyses</h1>
            <p className="text-gray-500 mt-1">Consultez, comparez et retrouvez vos analyses précédentes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Actualiser
            </Button>
            <Button variant="secondary" size="sm" disabled>
              <Download className="w-4 h-4 mr-2" />
              Exporter liste
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-4 animate-pulse">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="h-10 bg-gray-200 rounded flex-1 sm:w-80" />
              <div className="h-10 bg-gray-200 rounded flex-1 sm:w-48" />
              <div className="h-10 bg-gray-200 rounded flex-1 sm:w-48" />
              <div className="h-10 bg-gray-200 rounded flex-1 sm:w-48" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Historique des analyses</h1>
            <p className="text-gray-500 mt-1">Consultez, comparez et retrouvez vos analyses précédentes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exporter liste
            </Button>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-700">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4" />
            <p className="mb-2">{error}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
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
          <h1 className="text-2xl font-display font-bold text-gray-900">Historique des analyses</h1>
          <p className="text-gray-500 mt-1">Consultez, comparez et retrouvez vos analyses précédentes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
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
                {filteredAnalyses.map((analysis) => {
                  const TypeIcon = getTypeIcon(analysis.type)
                  return (
                    <Card key={analysis.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Type & ID */}
                          <div className="flex items-center gap-4 min-w-[280px]">
                            <div className={cn('p-3 rounded-xl', analysis.type_color)}>
                              <TypeIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{analysis.type_label}</span>
                                {getStatusBadge(analysis.status)}
                              </div>
                              <p className="text-sm text-gray-500">{analysis.farm_name} • {analysis.id}</p>
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
                            <Button variant="ghost" size="sm" onClick={() => handleExport}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Data Sources */}
                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                          <span className="text-xs text-gray-500">Sources:</span>
                          {analysis.data_sources.map((source, i) => (
                            <Badge key={i} variant="default" className="text-xs bg-gray-100 text-gray-600">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline">
          <div className="mt-6">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              {filteredAnalyses.map((analysis, index) => {
                const TypeIcon = getTypeIcon(analysis.type)
                return (
                  <div key={analysis.id} className="relative pl-16 pb-8 last:pb-0">
                    <div className="absolute left-0 top-1 w-16 text-right pr-3 text-xs text-gray-500">
                      {formatDate(analysis.date)}
                    </div>
                    <div className="absolute left-4 top-2 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white z-10"
                      style={{ backgroundColor: analysis.type_color.replace('bg-', '').replace('100', '500').replace('600', '500').replace('text-', '') }}>
                      <TypeIcon className="w-5 h-5" style={{ color: analysis.type_color.replace('bg-', 'text-') }} />
                    </div>
                    <Card className="ml-4">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{analysis.farm_name}</span>
                              <Badge variant="default" className={analysis.type_color}>{analysis.type_label}</Badge>
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
                            <Button variant="ghost" size="sm" onClick={() => handleExport}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
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
                  <div className={cn('p-3 rounded-xl', selectedAnalysis.type_color)}>
                    {(() => {
                      const Icon = getTypeIcon(selectedAnalysis.type);
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedAnalysis.type_label}</h2>
                    <p className="text-sm text-gray-500">{selectedAnalysis.farm_name} • {selectedAnalysis.id}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{selectedAnalysis.data_sources.length}</p>
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
                  {selectedAnalysis.data_sources.map((source, i) => (
                    <Badge key={i} variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={() => handleExport}>
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