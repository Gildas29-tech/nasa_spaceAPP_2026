import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { AnimatedPage } from '../components/PageTransition'
import { Skeleton, CardSkeleton, TableSkeleton } from '../components/ui/Skeleton'

function ReportsSkeleton() {
  return (
    <AnimatedPage>
      <div className="space-y-6 animate-fade-in">
        <PageHero kicker="Global Farm Resilience" title="Rapports" subtitle="Le diagnostic du champ et l'historique des analyses." />
        <CardSkeleton className="animate-fade-in" style={{ animationDelay: '100ms' }} />
      </div>
    </AnimatedPage>
  )
}

function ChartCard({ title, subtitle, icon, children, className, delay = 0, ...props }: any) {
  return (
    <Card variant="elevated" className={cn('hover-lift animate-fade-in', className)} {...props} style={{ animationDelay: `${delay}ms` }}>
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

function FarmSelector({ farms, selectedFarm, onSelect }: { farms: Farm[]; selectedFarm: Farm | null; onSelect: (farm: Farm) => void }) {
  return (
    <Card variant="elevated" className="hover-lift border-l-4 border-l-primary-500 animate-fade-in" style={{ animationDelay: '50ms' }}>
      <CardContent className="p-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
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
              options={farms.map(f => ({ value: f.id, label: `${f.name} (${f.crops_of_interest?.[0] || 'No crop'}, ${f.area || 'Unknown area'})` }))}
              className="hover-lift"
            />
          </div>
          {selectedFarm && (
            <div className="flex items-center gap-4 text-sm text-gray-600 animate-stagger-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Dernière mise à jour: <strong>{new Date().toLocaleDateString('fr-FR')}</strong></span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, title, message, action }: { icon: any; title: string; message: string; action?: React.ReactNode }) {
  return (
    <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
      <CardContent className="p-12 text-center animate-fade-in" style={{ animationDelay: '50ms' }}>
        <Icon className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-float" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-500 mb-4">{message}</p>
        {action}
      </CardContent>
    </Card>
  )
}

export default function Reports() {
  const navigate = useNavigate()
  const { farms, loading: farmsLoading, fetchFarms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeTab, setActiveTab] = useState('diagnostic')
  const [refreshKey, setRefreshKey] = useState(0)

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
        <PageHero
          kicker="Global Farm Resilience"
          title="Rapports"
          subtitle="Le diagnostic du champ et l'historique des analyses."
        />
        <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardContent className="p-12 text-center animate-fade-in" style={{ animationDelay: '50ms' }}>
            <FileText className="w-12 h-12 text-emerald-700/40 mx-auto mb-4 animate-float" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune exploitation</h3>
            <p className="text-gray-500 mb-4">Posez un champ sur la carte pour ouvrir un rapport.</p>
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

      {/* Farm Selector */}
      <FarmSelector farms={farms} selectedFarm={selectedFarm} onSelect={setSelectedFarm} />

      {/* Quick Stats */}
      {selectedFarm && showResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger-slide-up" style={{ animationDelay: '100ms' }}>
          <StatMetricCard icon={FileText} iconBg="bg-blue-600" label="Rapports Générés" value="12" delay={0} trend={8} />
          <StatMetricCard icon={Shield} iconBg="bg-green-600" label="Score Résilience" value="78/100" delay={80} trend={5} />
          <StatMetricCard icon={Layers} iconBg="bg-purple-600" label="Analyses Complètes" value="5" delay={160} />
          <StatMetricCard icon={Zap} iconBg="bg-orange-600" label="Alertes Actives" value="3" delay={240} trend={-10} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full" animated transition="slide">
        <TabsList className="grid w-full grid-cols-2 animate-fade-in">
          <TabsTrigger value="diagnostic" icon={<FileText className="w-4 h-4" />}>Diagnostic global</TabsTrigger>
          <TabsTrigger value="history" icon={<History className="w-4 h-4" />}>Historique analyses</TabsTrigger>
        </TabsList>

        {/* Global Farm Resilience Tab */}
        <TabsContent value="diagnostic" transition="slide">
          {selectedFarm ? (
            <GlobalFarmResilience farmId={selectedFarm.id} farmName={selectedFarm.name} />
          ) : (
            <EmptyState
              icon={FileText}
              title="Sélectionnez une exploitation"
              message="Pour générer un diagnostic global"
            />
          )}
        </TabsContent>

        {/* Analysis History Tab */}
        <TabsContent value="history" transition="slide">
          <AnalysisHistory farmId={selectedFarm?.id} />
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  )
}