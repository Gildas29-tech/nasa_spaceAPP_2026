import { useState } from 'react'
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

interface Farm {
  id: string
  name: string
  crop: string
  area: string
  location: string
}

const mockFarms: Farm[] = [
  { id: '1', name: 'North Field 1', crop: 'Corn', area: '45 ha', location: 'Iowa, USA' },
  { id: '2', name: 'South Field 3', crop: 'Soybean', area: '32 ha', location: 'Iowa, USA' },
  { id: '3', name: 'East Field 2', crop: 'Wheat', area: '28 ha', location: 'Nebraska, USA' },
  { id: '4', name: 'West Field 1', crop: 'Corn', area: '52 ha', location: 'Kansas, USA' },
  { id: '5', name: 'Central Field 4', crop: 'Alfalfa', area: '18 ha', location: 'Iowa, USA' },
]

export default function Reports() {
  const [selectedFarm, setSelectedFarm] = useState<Farm>(mockFarms[0])
  const [activeTab, setActiveTab] = useState('diagnostic')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500 mt-1">Diagnostics globaux et historique des analyses (Global Farm Resilience)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
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
                value={selectedFarm.id}
                onChange={(e) => {
                  const farm = mockFarms.find(f => f.id === e.target.value)
                  if (farm) setSelectedFarm(farm)
                }}
                options={mockFarms.map(f => ({ value: f.id, label: `${f.name} (${f.crop}, ${f.area})` }))}
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Dernière mise à jour: <strong>{new Date().toLocaleDateString('fr-FR')}</strong></span>
              </div>
            </div>
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
          <GlobalFarmResilience />
        </TabsContent>

        {/* Analysis History Tab */}
        <TabsContent value="history">
          <AnalysisHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}