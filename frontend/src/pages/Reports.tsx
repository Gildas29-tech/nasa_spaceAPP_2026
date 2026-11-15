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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import GlobalFarmResilience from './GlobalFarmResilience'
import AnalysisHistory from './AnalysisHistory'
import { useFarmStore, type Farm } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'

export default function Reports() {
  const { farms, loading: farmsLoading, fetchFarms, selectedFarmId, selectFarm } = useFarmStore()
  const { addToast } = useUIStore()
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeTab, setActiveTab] = useState('diagnostic')

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
    // The child components will handle their own data fetching
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
            <h1 className="text-2xl font-display font-bold text-gray-900">Rapports</h1>
            <p className="text-gray-500 mt-1">Diagnostics globaux et historique des analyses (Global Farm Resilience)</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No farms configured</h3>
            <p className="text-gray-500 mb-4">Create your first farm to start generating reports</p>
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
          <h1 className="text-2xl font-display font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500 mt-1">Diagnostics globaux et historique des analyses (Global Farm Resilience)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={!selectedFarm}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
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
                options={farms.map(f => ({ value: f.id, label: `${f.name} (${f.crops_of_interest?.[0] || 'No crop'}, ${f.area || 'Unknown area'})` }))}
              />
            </div>
            {selectedFarm && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Dernière mise à jour: <strong>{new Date().toLocaleDateString('fr-FR')}</strong></span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="diagnostic">
            <FileText className="w-4 h-4 mr-2" />
            Diagnostic global
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Historique analyses
          </TabsTrigger>
        </TabsList>

        {/* Global Farm Resilience Tab */}
        <TabsContent value="diagnostic">
          {selectedFarm ? (
            <GlobalFarmResilience farmId={selectedFarm.id} farmName={selectedFarm.name} />
          ) : (
            <div className="mt-6 text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Sélectionnez une exploitation pour générer un diagnostic</p>
            </div>
          )}
        </TabsContent>

        {/* Analysis History Tab */}
        <TabsContent value="history">
          <AnalysisHistory farmId={selectedFarm?.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}