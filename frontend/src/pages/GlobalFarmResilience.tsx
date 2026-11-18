import { useState, useEffect } from 'react'
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
import { api } from '../lib/api'
import { useUIStore } from '../stores/uiStore'
import { AnimatedPage } from '../components/PageTransition'
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton'

interface DiagnosticSection {
  id: string
  title: string
  icon: any
  color: string
  status: 'good' | 'warning' | 'info'
  score: number
  items: Array<{
    label: string
    value: string
    unit: string
    status: 'good' | 'warning' | 'info'
  }>
  risks: Array<{
    type: 'warning' | 'info'
    title: string
    desc: string
    value?: string
  }>
}

interface AdaptationStrategy {
  id: string
  title: string
  category: string
  priority: 'high' | 'medium' | 'low'
  description: string
  benefits: string[]
  confidence: number
  sources: string[]
}

interface DiagnosticData {
  farm_name: string
  location: string
  area: string
  crop: string
  soil_type: string
  overall_score: number
  sections: DiagnosticSection[]
  strategies: AdaptationStrategy[]
  assessment_date: string
  data_sources: string[]
  spatial_resolution: string
}

const sectionIcons: Record<string, typeof Sun> = {
  Sun,
  Leaf,
  Droplet,
  Target,
  Shield,
  Cloud,
  Info,
}

function withSectionIcons(sections: DiagnosticSection[]): DiagnosticSection[] {
  return sections.map(section => ({
    ...section,
    icon: sectionIcons[section.icon as unknown as string] || Info,
  }))
}

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

// Loading skeleton
function GlobalFarmResilienceSkeleton() {
  return (
    <AnimatedPage className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse" style={{ animationDelay: '50ms' }}>
        <div>
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded px-4" />
          <div className="h-10 bg-gray-200 rounded px-4" />
        </div>
      </div>
      <CardSkeleton className="bg-primary-50 border-primary-200 animate-fade-in" style={{ animationDelay: '100ms' }} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger-slide-up" style={{ animationDelay: '150ms' }}>
        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} className="hover-lift" />)}
      </div>
      <CardSkeleton className="animate-fade-in" style={{ animationDelay: '200ms' }} />
    </AnimatedPage>
  )
}

function AnimatedSectionCard({ children, delay = 0, className, ...props }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <Card className={cn('hover-lift animate-fade-in', className)} {...props} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </Card>
  )
}

function RiskCard({ risk, delay = 0 }: { risk: DiagnosticSection['risks'][0]; delay?: number }) {
  return (
    <div className={cn('p-4 rounded-lg border-l-4 animate-fade-in', risk.type === 'warning' ? 'bg-orange-50 border-orange-400' : 'bg-blue-50 border-blue-400')} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start gap-3">
        {risk.type === 'warning' ? (
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5 animate-scale-in" />
        ) : (
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-scale-in" />
        )}
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 animate-fade-in">{risk.title}</h5>
          <p className="text-sm text-gray-600 mt-1 animate-fade-in" style={{ animationDelay: '50ms' }}>{risk.desc}</p>
          {risk.value && <p className="text-sm font-mono text-gray-500 mt-1 animate-fade-in" style={{ animationDelay: '100ms' }}>{risk.value}</p>}
        </div>
        <Badge variant={risk.type === 'warning' ? 'warning' : 'info'} className="animate-scale-in flex-shrink-0" style={{ animationDelay: '150ms' }}>
          {risk.type === 'warning' ? 'Attention' : 'Information'}
        </Badge>
      </div>
    </div>
  )
}

function StrategyCard({ strategy, delay = 0 }: { strategy: AdaptationStrategy; delay?: number }) {
  const priorityColors: Record<'high' | 'medium' | 'low', 'danger' | 'warning' | 'info'> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  }

  return (
    <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 animate-stagger-slide-up">
              <h3 className="text-lg font-semibold text-gray-900">{strategy.title}</h3>
              <Badge variant={priorityColors[strategy.priority]} className="animate-scale-in">
                {strategy.priority === 'high' ? 'Priorité haute' : strategy.priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse'}
              </Badge>
              <Badge variant="default" className="animate-scale-in" style={{ animationDelay: '50ms' }}>{strategy.category}</Badge>
              <div className={cn('ml-auto p-2 rounded-full animate-scale-in', getScoreBg(strategy.confidence))} style={{ animationDelay: '100ms' }}>
                <span className={cn('font-bold', getScoreColor(strategy.confidence))}>
                  Confiance: {strategy.confidence}%
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-4 animate-fade-in" style={{ animationDelay: '150ms' }}>{strategy.description}</p>
            <div className="flex flex-wrap gap-2 animate-stagger-slide-up" style={{ animationDelay: '200ms' }}>
              {strategy.benefits.map((benefit, i) => (
                <Badge key={i} variant="default" className="bg-green-50 text-green-700 border-green-200 animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>
          <div className="lg:w-64 lg:flex-none text-right animate-stagger-slide-up" style={{ animationDelay: '250ms' }}>
            <p className="text-xs text-gray-500 mb-2">Sources:</p>
            <div className="space-y-1 text-xs text-gray-600">
              {strategy.sources.map((source, i) => (
                <p key={i} className="flex items-center gap-1 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <ExternalLink className="w-3 h-3" />
                  {source}
                </p>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-4 w-full hover-lift">
              <ArrowRight className="w-4 h-4 mr-1" />
              Détails
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GlobalFarmResilience({ farmId, farmName }: { farmId: string; farmName: string }) {
  const { addToast } = useUIStore()
  const [activeTab, setActiveTab] = useState('diagnostic')
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDiagnostic = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.get<DiagnosticData>(`/reports/diagnostic/${farmId}`)
        setDiagnosticData({ ...data, sections: withSectionIcons(data.sections) })
        // Expand first section by default
        if (data.sections.length > 0) {
          setExpandedSections([data.sections[0].id])
        }
      } catch (err: any) {
        console.error('Failed to fetch diagnostic:', err)
        setError('Failed to load diagnostic data')
      } finally {
        setLoading(false)
      }
    }

    fetchDiagnostic()
  }, [farmId])

  const handleRefresh = async () => {
    addToast({ type: 'info', title: 'Refreshing', message: 'Fetching latest diagnostic...' })
    try {
      const data = await api.get<DiagnosticData>(`/reports/diagnostic/${farmId}`)
      setDiagnosticData({ ...data, sections: withSectionIcons(data.sections) })
      addToast({ type: 'success', title: 'Updated', message: 'Diagnostic refreshed' })
    } catch {
      addToast({ type: 'error', title: 'Failed to refresh', message: 'Please try again' })
    }
  }

  const handleExportPdf = () => {
    addToast({ type: 'info', title: 'Exporting', message: 'PDF generation started...' })
    // TODO: Implement PDF export
  }

  const toggleSection = (id: string) => {
    setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const overallScore = diagnosticData?.overall_score || 0
  const sections = diagnosticData?.sections || []
  const strategies = diagnosticData?.strategies || []

  if (loading) {
    return <GlobalFarmResilienceSkeleton />
  }

  if (error || !diagnosticData) {
    return (
      <AnimatedPage className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div>
            <p className="text-sm font-medium text-gray-500">Diagnostic</p>
            <p className="text-lg font-semibold text-gray-900">{farmName}</p>
          </div>
          <div className="flex gap-2 animate-stagger-slide-up">
            <Button variant="secondary" size="sm" onClick={handleExportPdf} className="hover-lift">
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRefresh} className="hover-lift">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
        <Card variant="outlined" className="border-red-200 bg-red-50 animate-shake animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardContent className="p-6 text-center text-red-700 animate-fade-in">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 animate-bounce-gentle" />
            <p className="mb-2">{error || 'No diagnostic data available'}</p>
            <Button onClick={handleRefresh} className="hover-lift">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div>
          <p className="text-sm font-medium text-gray-500">Diagnostic</p>
          <p className="text-lg font-semibold text-gray-900">{diagnosticData.farm_name}</p>
        </div>
        <div className="flex gap-2 animate-stagger-slide-up">
          <Button variant="secondary" size="sm" onClick={handleExportPdf} className="hover-lift">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRefresh} className="hover-lift">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Farm Info Bar */}
      <Card variant="elevated" className="bg-primary-50 border-primary-200 hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6 animate-stagger-slide-up">
            <div className="flex items-center gap-3 animate-scale-in">
              <MapPin className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{diagnosticData.farm_name}</p>
                <p className="text-sm text-gray-600">{diagnosticData.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 animate-scale-in" style={{ animationDelay: '50ms' }}>
              <Leaf className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{diagnosticData.crop}</p>
                <p className="text-sm text-gray-600">Culture principale</p>
              </div>
            </div>
            <div className="flex items-center gap-3 animate-scale-in" style={{ animationDelay: '100ms' }}>
              <Target className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{diagnosticData.area}</p>
                <p className="text-sm text-gray-600">Surface</p>
              </div>
            </div>
            <div className="flex items-center gap-3 animate-scale-in" style={{ animationDelay: '150ms' }}>
              <Shield className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">{diagnosticData.soil_type}</p>
                <p className="text-sm text-gray-600">Type de sol</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto animate-scale-in" style={{ animationDelay: '200ms' }}>
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
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full" animated transition="slide">
        <TabsList className="grid w-full grid-cols-3 animate-fade-in">
          <TabsTrigger value="diagnostic" className="hover-lift">Diagnostic</TabsTrigger>
          <TabsTrigger value="strategies" className="hover-lift">Stratégies d'adaptation</TabsTrigger>
          <TabsTrigger value="report" className="hover-lift">Rapport complet</TabsTrigger>
        </TabsList>

        {/* Diagnostic Tab */}
        <TabsContent value="diagnostic" transition="slide">
          <div className="mt-6 space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger-slide-up">
              {sections.map((section, i) => (
                <AnimatedSectionCard key={section.id} delay={i * 40}>
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
                      className="w-full hover-lift"
                      onClick={() => toggleSection(section.id)}
                    >
                      {expandedSections.includes(section.id) ? (
                        <> <ChevronUp className="w-4 h-4 mr-1" /> Masquer détails </>
                      ) : (
                        <> <ChevronDown className="w-4 h-4 mr-1" /> Voir détails </>
                      )}
                    </Button>
                  </CardContent>
                </AnimatedSectionCard>
              ))}
            </div>

            {/* Expanded Sections */}
            <div className="space-y-4 animate-stagger-slide-up">
              {sections.map((section, sectionIndex) => (
                expandedSections.includes(section.id) && (
                  <AnimatedSectionCard key={section.id} delay={sectionIndex * 60}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <section.icon className={cn('w-5 h-5', section.color.replace('bg-', 'text-').replace('100', '600'))} />
                        {section.title} - Détails
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Indicators Table */}
                      <div className="overflow-x-auto mb-6 animate-fade-in">
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
                              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 animate-fade-in hover-lift" style={{ animationDelay: `${i * 30}ms` }}>
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
                        <div className="space-y-3 animate-stagger-slide-up">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-orange-600 animate-bounce-gentle" />
                            Risques identifiés
                          </h4>
                          {section.risks.map((risk, i) => (
                            <RiskCard key={i} risk={risk} delay={i * 40} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </AnimatedSectionCard>
                )
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" transition="slide">
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4 animate-fade-in">
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
                  className="w-40 hover-lift"
                />
              </div>
            </div>

            <div className="space-y-4 animate-stagger-slide-up">
              {strategies.map((strategy, i) => (
                <StrategyCard key={strategy.id} strategy={strategy} delay={i * 60} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" transition="slide">
          <div className="mt-6 space-y-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <AnimatedSectionCard delay={0}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Rapport de diagnostic - {diagnosticData.farm_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-stagger-slide-up">
                  <div className="p-4 rounded-lg bg-gray-50 animate-fade-in hover-lift" style={{ animationDelay: '0ms' }}>
                    <p className="font-medium text-gray-900">Date du rapport</p>
                    <p className="text-gray-600">{new Date(diagnosticData.assessment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 animate-fade-in hover-lift" style={{ animationDelay: '50ms' }}>
                    <p className="font-medium text-gray-900">Période d'analyse</p>
                    <p className="text-gray-600">{diagnosticData.assessment_date.split('-')[0]} - {new Date().getFullYear()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 animate-fade-in hover-lift" style={{ animationDelay: '100ms' }}>
                    <p className="font-medium text-gray-900">Sources de données</p>
                    <p className="text-gray-600">{diagnosticData.data_sources.join(', ')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 animate-fade-in hover-lift" style={{ animationDelay: '150ms' }}>
                    <p className="font-medium text-gray-900">Résolution spatiale</p>
                    <p className="text-gray-600">{diagnosticData.spatial_resolution}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <h4 className="font-semibold text-gray-900 mb-4">Synthèse exécutive</h4>
                  <div className="prose prose-sm max-w-none text-gray-700 animate-stagger-slide-up">
                    <p>
                      L'exploitation <strong>{diagnosticData.farm_name}</strong> ({diagnosticData.area}, {diagnosticData.crop}) présente un niveau de résilience global
                      <strong className={getScoreColor(overallScore)}>{overallScore}/100</strong>
                      ({overallScore >= 80 ? 'résilient' : overallScore >= 60 ? 'modéré' : 'vulnérable'}).
                    </p>
                    {sections.length > 0 && (
                      <>
                        <p className="mt-2">
                          Les points forts sont la <strong>{sections.find(s => s.id === 'vegetation')?.title || 'végétation'}</strong>
                          ({sections.find(s => s.id === 'vegetation')?.score || 'N/A'}/100) et les <strong>{sections.find(s => s.id === 'climate')?.title || 'conditions climatiques'}</strong>
                          ({sections.find(s => s.id === 'climate')?.score || 'N/A'}/100),
                          indiquant un bon potentiel productif dans les conditions actuelles.
                        </p>
                        <p className="mt-2">
                          Le principal point de vigilance concerne les <strong>{sections.find(s => s.id === 'water')?.title || 'ressources en eau'}</strong>
                          ({sections.find(s => s.id === 'water')?.score || 'N/A'}/100),
                          avec un déficit pluviométrique récent et une humidité de surface sous les normales saisonnières.
                        </p>
                        <p className="mt-2">
                          <strong>{strategies.length} stratégies d'adaptation</strong> sont recommandées, dont {strategies.filter(s => s.priority === 'high').length} à priorité haute :
                          {strategies.filter(s => s.priority === 'high').map(s => s.title).join(', ')},
                          offrant des bénéfices agronomiques, environnementaux et économiques documentés.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
                  <h4 className="font-semibold text-gray-900 mb-4">Limites et incertitudes</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm animate-stagger-slide-up">
                    <li>Données satellitaires : résolution spatiale variable (30m à 9km), couverture nuageuse possible</li>
                    <li>Données sol : estimées depuis cartes régionales, non basées sur prélèvements locaux</li>
                    <li>Modèles climatiques : basés sur historiques, n'intègrent pas scénarios futurs spécifiques</li>
                    <li>Recommandations : basées sur littérature générale, non adaptées au contexte réglementaire/local spécifique</li>
                    <li>Validation humaine requise pour décisions agronomiques importantes</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 animate-stagger-slide-up" style={{ animationDelay: '300ms' }}>
                <Button variant="secondary" onClick={handleExportPdf} className="hover-lift">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button onClick={handleRefresh} className="hover-lift">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Régénérer rapport
                </Button>
              </CardFooter>
            </AnimatedSectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  )
}