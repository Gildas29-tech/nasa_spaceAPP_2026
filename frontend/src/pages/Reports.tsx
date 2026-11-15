import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import {
  FileText,
  History,
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
  Calendar,
  Clock,
  Eye,
  Trash2,
  MoreVertical,
  BarChart3,
  Layers,
  BookOpen,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHero } from '../components/PageHero'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import GlobalFarmResilience from './GlobalFarmResilience'
import AnalysisHistory from './AnalysisHistory'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'
import { AnimatedPage, RevealOnScroll, StaggeredContainer } from '../components/PageTransition'
import { Skeleton, CardSkeleton, TableSkeleton } from '../components/ui/Skeleton'

function ReportsSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="Global Farm Resilience" title="Rapports" subtitle="Le diagnostic du champ et l'historique des analyses." />

        <RevealOnScroll transition="slide-up" delay={100}>
          <CardSkeleton className="animate-stagger-slide-up" />
        </RevealOnScroll>
      </div>
    </AnimatedPage>
  )
}

function ChartCard({ title, subtitle, icon, children, className, delay = 0, ...props }: any) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay} key={title}>
      <Card variant="elevated" className={cn('hover-lift', className)} {...props}>
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
    </RevealOnScroll>
  )
}

function StatMetricCard({ icon: Icon, iconBg, label, value, delay = 0, trend }: any) {
  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <Card variant="elevated" className="hover-lift">
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
    </RevealOnScroll>
  )
}

function FarmSelector({ farms, selectedFarm, onSelect }: { farms: Farm[]; selectedFarm: Farm | null; onSelect: (farm: Farm) => void }) {
  return (
    <RevealOnScroll transition="slide-up" delay={50}>
      <Card variant="elevated" className="hover-lift border-l-4 border-l-primary-500">
        <CardContent className="p-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-64">
              <Select
                label="Exploitation"
                placeholder="Sélectionner une exploitation"
                value={selectedFarm?.id || ''}
                onChange={(e) => {
                  const farm = farms.find(f => f.id === e.target.value)
                  if (farm) onSelect(farm)
                }}
                options={farms.map(f => ({ value: f.id, label: `${f.name} (${f.crops_of_interest?.[0] || 'No crop'}, ${f.area || 'Unknown area'})` }))}
                className="hover-lift"
              />
            </div>
            {selectedFarm && (
              <div className="flex items-center gap-4 text-sm text-gray-600 animate-stagger-slide-up">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Dernière mise à jour: <strong>{new Date().toLocaleDateString('fr-FR')}</strong></span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

function EmptyState({ icon: Icon, title, message, action }: { icon: any; title: string; message: string; action?: React.ReactNode }) {
  return (
    <RevealOnScroll transition="slide-up" delay={100}>
      <Card variant="elevated" className="hover-lift">
        <CardContent className="p-12 text-center animate-fade-in">
          <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-500 mb-4">{message}</p>
          {action}
        </CardContent>
      </Card>
    </RevealOnScroll>
  )
}

export default function Reports() {
  const { farms, loading: farmsLoading, fetchFarms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeTab, setActiveTab] = useState('diagnostic')
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

  const handleRefresh = () => {
    if (!selectedFarm) return
    addToast({ type: 'info', title: 'Refreshing', message: 'Fetching latest report data...' })
    setShowResults(false)
    // Trigger refresh in child components
    setTimeout(() => setShowResults(true), 100)
  }

  if (farmsLoading) {
    return <ReportsSkeleton />
  }

  if (farms.length === 0) {
    return (
      <AnimatedPage className="space-y-6">
        <RevealOnScroll transition="slide-up" delay={50}>
          <PageHero
            kicker="Global Farm Resilience"
            title="Rapports"
            subtitle="Le diagnostic du champ et l'historique des analyses."
          />
        </RevealOnScroll>
        <RevealOnScroll transition="slide-up" delay={150}>
          <Card variant="elevated" className="hover-lift">
            <CardContent className="p-12 text-center animate-fade-in">
              <FileText className="w-12 h-12 text-emerald-700/40 mx-auto mb-4 animate-float" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune exploitation</h3>
              <p className="text-gray-500 mb-4">Posez un champ sur la carte pour ouvrir un rapport.</p>
              <Button onClick={() => window.location.href = '/field-map'} className="hover-lift">
                <Plus className="w-4 h-4 mr-2" />
                Créer sur la carte
              </Button>
            </CardContent>
          </Card>
        </RevealOnScroll>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <RevealOnScroll transition="slide-up" delay={50}>
        <PageHero
          kicker="Global Farm Resilience"
          title="Rapports"
          subtitle="Le diagnostic du champ et l'historique des analyses."
          actions={
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={!selectedFarm} className="hover-lift">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          }
        />
      </RevealOnScroll>

      {/* Farm Selector */}
      <FarmSelector farms={farms} selectedFarm={selectedFarm} onSelect={setSelectedFarm} />

      {/* Quick Stats */}
      {selectedFarm && showResults && (
        <RevealOnScroll transition="slide-up" delay={100}>
          <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatMetricCard icon={FileText} iconBg="bg-blue-600" label="Rapports Générés" value="12" delay={0} trend={8} />
            <StatMetricCard icon={Shield} iconBg="bg-green-600" label="Score Résilience" value="78/100" delay={80} trend={5} />
            <StatMetricCard icon={Layers} iconBg="bg-purple-600" label="Analyses Complètes" value="5" delay={160} />
            <StatMetricCard icon={Zap} iconBg="bg-orange-600" label="Alertes Actives" value="3" delay={240} trend={-10} />
          </StaggeredContainer>
        </RevealOnScroll>
      )}

      {/* Tabs */}
      <RevealOnScroll transition="slide-up" delay={showResults ? 150 : 200}>
        <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full" animated transition="fade">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diagnostic" icon={<FileText className="w-4 h-4" />}>Diagnostic global</TabsTrigger>
            <TabsTrigger value="history" icon={<History className="w-4 h-4" />}>Historique analyses</TabsTrigger>
          </TabsList>

          {/* Global Farm Resilience Tab */}
          <TabsContent value="diagnostic" transition="fade">
            {selectedFarm ? (
              <RevealOnScroll transition="slide-up" delay={50}>
                <GlobalFarmResilience farmId={selectedFarm.id} farmName={selectedFarm.name} />
              </RevealOnScroll>
            ) : (
              <EmptyState
                icon={FileText}
                title="Sélectionnez une exploitation"
                message="Pour générer un diagnostic global"
              />
            )}
          </TabsContent>

          {/* Analysis History Tab */}
          <TabsContent value="history" transition="fade">
            <RevealOnScroll transition="slide-up" delay={50}>
              <AnalysisHistory farmId={selectedFarm?.id} />
            </RevealOnScroll>
          </TabsContent>
        </Tabs>
      </RevealOnScroll>
    </AnimatedPage>
  )
}