import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Map as MapLucide,
  Leaf,
  Droplet,
  Sun,
  Settings,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  FileText,
  Calendar,
  Clock,
  GitBranch,
  Trash,
  Map as MapIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  MapPin as MapPinIcon,
  X,
  Target,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Input, Textarea } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../components/ui/Dialog'
import { useFarmDataCollection, useCollectionPolling, useDataSourceAvailability, type Farm, type DataCollectionRequest } from '../hooks/useDataCollection'
import { formatDate } from '../lib/utils'
import { useFarmStore } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { useCreateFarmWithStore, useDeleteFarmWithStore } from '../hooks/useDataCollection'
import maplibregl from 'maplibre-gl'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return <Badge variant="success">Active</Badge>
    case 'monitoring': return <Badge variant="warning">Monitoring</Badge>
    case 'fallow': return <Badge variant="default">Fallow</Badge>
    case 'harvested': return <Badge variant="info">Harvested</Badge>
    default: return <Badge variant="default">{status}</Badge>
  }
}

const getDataSourceStatusBadge = (status: string) => {
  switch (status) {
    case 'success': return <Badge variant="success">✓ Available</Badge>
    case 'unavailable': return <Badge variant="default">○ Unavailable</Badge>
    case 'failed': return <Badge variant="danger">✗ Failed</Badge>
    default: return <Badge variant="default">{status}</Badge>
  }
}

// Farm creation dialog with map picker
interface CreateFarmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function CreateFarmDialog({ open, onOpenChange, onSuccess }: CreateFarmDialogProps) {
  const { addToast } = useUIStore()
  const createFarmWithStore = useCreateFarmWithStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('USA')
  const [region, setRegion] = useState('')
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 }) // Default to NYC
  const [area, setArea] = useState('1')
  const [soilType, setSoilType] = useState('')
  const [cropsOfInterest, setCropsOfInterest] = useState('maize, wheat, soybean')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      // Create a small square polygon (~100m x 100m) around the coordinates
      const offset = 0.001 // ~100m
      const farmData = {
        name,
        crop: cropsOfInterest.split(',')[0]?.trim() || 'Maize',
        area: `${area} ha`,
        location: `${region}, ${country}`,
        description: description || undefined,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [coordinates.lng - offset, coordinates.lat + offset],
            [coordinates.lng + offset, coordinates.lat + offset],
            [coordinates.lng + offset, coordinates.lat - offset],
            [coordinates.lng - offset, coordinates.lat - offset],
            [coordinates.lng - offset, coordinates.lat + offset],
          ]] as [number, number][][],
        },
        centroid: { lat: coordinates.lat, lon: coordinates.lng },
      }

      await createFarmWithStore.mutateAsync(farmData)

      addToast({ type: 'success', title: 'Farm Created', message: `${name} has been added` })
      onSuccess()
      onOpenChange(false)
      // Reset form
      setName('')
      setDescription('')
      setRegion('')
      setArea('1')
      setSoilType('')
      setCropsOfInterest('maize, wheat, soybean')
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to create farm', message: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Farm</DialogTitle>
            <DialogDescription>Add a new farm to your portfolio for analysis</DialogDescription>
            <DialogClose onClick={() => onOpenChange(false)} />
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            {!showMapPicker ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Farm Name *</label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., North Field 1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <Select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      options={[
                        { value: 'USA', label: 'United States' },
                        { value: 'France', label: 'France' },
                        { value: 'Argentina', label: 'Argentina' },
                        { value: 'Brazil', label: 'Brazil' },
                        { value: 'Canada', label: 'Canada' },
                        { value: 'Australia', label: 'Australia' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Region / State</label>
                    <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g., Iowa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Area (ha)</label>
                    <Input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., 45" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Optional description of the farm"
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Coordinates (Lat, Lng) *</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.0001"
                        value={coordinates.lat}
                        onChange={e => setCoordinates({ ...coordinates, lat: parseFloat(e.target.value) || 0 })}
                        placeholder="Latitude"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.0001"
                        value={coordinates.lng}
                        onChange={e => setCoordinates({ ...coordinates, lng: parseFloat(e.target.value) || 0 })}
                        placeholder="Longitude"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowMapPicker(true)}>
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        Pick on Map
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                          )
                        }
                      }}>
                        <Target className="w-4 h-4 mr-1" />
                        Use My Location
                      </Button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Soil Type</label>
                    <Input value={soilType} onChange={e => setSoilType(e.target.value)} placeholder="e.g., Loam, Clay Loam, Sandy Loam" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Crops of Interest (comma-separated)</label>
                    <Input
                      value={cropsOfInterest}
                      onChange={e => setCropsOfInterest(e.target.value)}
                      placeholder="e.g., corn, wheat, soybean"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for crop suitability analysis (GAEZ)</p>
                  </div>
                </div>
              </>
            ) : (
              // Map picker view
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Click on map to select location</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowMapPicker(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Back to Form
                  </Button>
                </div>
                <div className="h-96 rounded-lg overflow-hidden bg-gray-100 relative">
                  <FieldMapPicker
                    initialCoordinates={coordinates}
                    onSelect={(coords) => {
                      setCoordinates(coords)
                      setShowMapPicker(false)
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">Click anywhere on the map to select the farm location</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Farm'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogTrigger>
    </Dialog>
  )
}

// Simple map picker component for the dialog
function FieldMapPicker({ initialCoordinates, onSelect }: { initialCoordinates: { lat: number; lng: number }; onSelect: (coords: { lat: number; lng: number }) => void }) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const markerRef = React.useRef<maplibregl.Marker | null>(null)

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center: [initialCoordinates.lng, initialCoordinates.lat],
        zoom: 12,
        attributionControl: { compact: true },
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')

      // Add initial marker
      const el = document.createElement('div')
      el.className = 'w-6 h-6 bg-primary-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center'
      el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([initialCoordinates.lng, initialCoordinates.lat])
        .addTo(map)

      map.on('click', (e) => {
        const coords = e.lngLat
        if (markerRef.current) {
          markerRef.current.setLngLat([coords.lng, coords.lat])
        }
        onSelect({ lat: coords.lat, lng: coords.lng })
      })

      mapRef.current = map

      return () => {
        map.remove()
        mapRef.current = null
      }
    } catch (error) {
      console.error('Failed to initialize map picker:', error)
    }
  }, [initialCoordinates, onSelect])

  return <div ref={mapContainerRef} className="w-full h-full" />
}

// Data collection trigger dialog
interface CollectDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  farm: Farm | null
  onCollectionStarted: (collectionId: string) => void
}

function CollectDataDialog({ open, onOpenChange, farm, onCollectionStarted }: CollectDataDialogProps) {
  const { triggerCollection, triggerLoading, triggerError } = useFarmDataCollection(farm?.id || null)
  const { addToast } = useUIStore()
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [cropsOfInterest, setCropsOfInterest] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!farm) return
    try {
      const result = await triggerCollection(startDate, endDate, cropsOfInterest ? cropsOfInterest.split(',').map(c => c.trim()) : undefined)
      onCollectionStarted(result)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to trigger collection:', error)
      addToast({ type: 'error', title: 'Failed to start collection', message: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  if (!farm) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Collect Data for {farm.name}</DialogTitle>
            <DialogDescription>Trigger NASA data collection for this farm</DialogDescription>
            <DialogClose onClick={() => onOpenChange(false)} />
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            {triggerError && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Failed to start collection: {triggerError.message}</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required max={endDate} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date *</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Crops of Interest (for GAEZ analysis)</label>
                <Input
                  value={cropsOfInterest}
                  onChange={e => setCropsOfInterest(e.target.value)}
                  placeholder="e.g., maize, wheat, soybean, rice, sorghum"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Override farm's default crops for suitability analysis</p>
              </div>
            </div>
            <div className="p-3 rounded bg-blue-50 text-blue-700 text-sm">
              <p className="font-medium">Data sources to be collected:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>NASA POWER - Climate data (temperature, precipitation, humidity, radiation)</li>
                <li>Sentinel-2 - Optical imagery & vegetation indices (NDVI, EVI, SAVI)</li>
                <li>Landsat 8/9 - Surface reflectance & spectral indices</li>
                <li>GPM IMERG - Precipitation data</li>
                <li>SMAP - Soil moisture (surface & root zone)</li>
                <li>FAO GAEZ - Crop suitability & yield potential</li>
              </ul>
              <p className="text-xs mt-2 opacity-80">Some sources require authentication. Unavailable sources will be marked in results.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={triggerLoading}>Cancel</Button>
              <Button type="submit" disabled={triggerLoading}>
                {triggerLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Collection...
                  </>
                ) : (
                  'Start Data Collection'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogTrigger>
    </Dialog>
  )
}

// Collection status dialog
interface CollectionStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string | null
}

function CollectionStatusDialog({ open, onOpenChange, collectionId }: CollectionStatusDialogProps) {
  const { status, summary, isLoading, isComplete, isRunning, error, refetch } = useCollectionPolling(collectionId)
  const { availability, availableSources, failedSources, successfulCount, totalSources } = useDataSourceAvailability(collectionId)

  const statusColor = isComplete ? 'text-green-600' : isRunning ? 'text-blue-600' : 'text-gray-600'
  const StatusIcon = isComplete ? CheckCircle : isRunning ? Loader2 : AlertCircle

  if (!collectionId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <StatusIcon className={cn('w-5 h-5', statusColor)} />
                  Collection Status
                </DialogTitle>
                <DialogDescription>Monitoring data collection progress for collection {collectionId.slice(0, 8)}...</DialogDescription>
                <DialogClose onClick={() => onOpenChange(false)} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading}>
                  <RefreshCw className={cn('w-4 h-4', isLoading ? 'animate-spin' : '')} />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Error: {error.message}</span>
              </div>
            )}

            {/* Overall Progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Overall Status</h3>
                  <Badge className={cn(
                    isComplete ? 'bg-green-100 text-green-800' :
                    isRunning ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {status?.overall_status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Sources completed</span>
                      <span>{successfulCount} / {totalSources}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all', isComplete ? 'bg-green-600' : 'bg-blue-600')}
                        style={{ width: totalSources > 0 ? `${(successfulCount / totalSources) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Source Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Source Availability</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {Object.entries(availability).map(([source, status]) => (
                    <div key={source} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                          status === 'success' ? 'bg-green-100 text-green-600' :
                          status === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {status === 'success' ? <CheckCircle className="w-5 h-5" /> :
                           status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                           <Loader2 className="w-5 h-5" />}
                        </div>
                        <span className="font-medium capitalize">{source.replace('_', ' ')}</span>
                      </div>
                      {getDataSourceStatusBadge(status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary Metrics */}
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Metrics Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {summary.key_metrics.climate && (
                      <div className="p-3 rounded-lg bg-blue-50">
                        <h4 className="font-medium text-blue-900 mb-2">Climate (NASA POWER)</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Avg Temp:</span> <span className="font-medium">{summary.key_metrics.climate.avg_temp_c?.toFixed(1)}°C</span></div>
                          <div><span className="text-gray-500">Total Precip:</span> <span className="font-medium">{summary.key_metrics.climate.total_precip_mm?.toFixed(0)} mm</span></div>
                          <div><span className="text-gray-500">Avg Humidity:</span> <span className="font-medium">{summary.key_metrics.climate.avg_humidity?.toFixed(0)}%</span></div>
                          <div><span className="text-gray-500">Radiation:</span> <span className="font-medium">{summary.key_metrics.climate.avg_radiation_mj_m2?.toFixed(1)} MJ/m²</span></div>
                        </div>
                      </div>
                    )}
                    {summary.key_metrics.vegetation && (
                      <div className="p-3 rounded-lg bg-green-50">
                        <h4 className="font-medium text-green-900 mb-2">Vegetation (Sentinel-2)</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-500">Latest:</span> <span className="font-medium">{summary.key_metrics.vegetation.latest_acquisition ? new Date(summary.key_metrics.vegetation.latest_acquisition).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-gray-500">Cloud Cover:</span> <span className="font-medium">{summary.key_metrics.vegetation.cloud_cover !== undefined ? summary.key_metrics.vegetation.cloud_cover + '%' : 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                    {summary.key_metrics.landsat && (
                      <div className="p-3 rounded-lg bg-amber-50">
                        <h4 className="font-medium text-amber-900 mb-2">Landsat</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-500">Latest:</span> <span className="font-medium">{summary.key_metrics.landsat.latest_acquisition ? new Date(summary.key_metrics.landsat.latest_acquisition).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-gray-500">Cloud Cover:</span> <span className="font-medium">{summary.key_metrics.landsat.cloud_cover !== undefined ? summary.key_metrics.landsat.cloud_cover + '%' : 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Failed sources details */}
            {failedSources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-700">Failed Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {failedSources.map(({ source, error }) => (
                      <div key={source} className="p-3 rounded bg-red-50 text-red-700 text-sm">
                        <div className="font-medium">{source}</div>
                        <div className="text-xs opacity-80">{error}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {isComplete ? 'Close' : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogTrigger>
    </Dialog>
  )
}

export default function Farms() {
  const [activeTab, setActiveTab] = useState('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [showMap, setShowMap] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [collectDialogOpen, setCollectDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)

  // Use farm store
  const { farms, loading: farmsLoading, error: farmsError, fetchFarms, deleteFarm: deleteFarmStore } = useFarmStore()
  const { addToast } = useUIStore()
  const createFarmWithStore = useCreateFarmWithStore()
  const deleteFarmWithStore = useDeleteFarmWithStore()

  // Fetch farms on mount
  React.useEffect(() => {
    fetchFarms()
  }, [fetchFarms])

  const handleDeleteFarm = async (farmId: string) => {
    if (!confirm('Are you sure you want to delete this farm? This action cannot be undone.')) return
    try {
      await deleteFarmWithStore.mutateAsync(farmId)
      addToast({ type: 'success', title: 'Farm deleted' })
    } catch (error) {
      console.error('Failed to delete farm:', error)
      addToast({ type: 'error', title: 'Failed to delete farm', message: 'Please try again' })
    }
  }

  const handleCollectionStarted = (collectionId: string) => {
    setActiveCollectionId(collectionId)
    setStatusDialogOpen(true)
  }

  // Extract unique countries from farm data for filter
  const countries = farms ? [...new Set(farms.flatMap(f => f.crops_of_interest || []).filter(Boolean))] : []

  // Filter farms
  const filteredFarms = farms?.filter(f => {
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !f.crops_of_interest?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false
    }
    if (countryFilter !== 'all' && f.crops_of_interest?.[0] !== countryFilter) return false
    return true
  }) || []

  const stats = [
    { label: 'Total Farms', value: farms?.length || 0, icon: MapIcon, color: 'text-blue-600' },
    { label: 'Crop Types', value: countries.length, icon: Leaf, color: 'text-green-600' },
    { label: 'Total Crops', value: farms?.reduce((sum, f) => sum + (f.crops_of_interest?.length || 0), 0), icon: GitBranch, color: 'text-orange-600' },
    { label: 'Active Collections', value: 0, icon: RefreshCw, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">My Farms</h1>
          <p className="text-gray-500 mt-1">Manage and visualize your agricultural fields (AgriTwin)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowMap(!showMap)}>
            <MapIcon className="w-4 h-4 mr-2" />
            {showMap ? 'List' : 'Map'}
          </Button>
          <CreateFarmDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSuccess={() => fetchFarms()}
          />
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Farm
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.color.replace('text-', 'bg-').replace('600', '100'))}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error display */}
      {farmsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load farms: {farmsError}</span>
            <Button variant="ghost" size="sm" onClick={() => fetchFarms()} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {farmsLoading && !farms && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading farms...</p>
          </CardContent>
        </Card>
      )}

      {/* Map View */}
      {showMap && !farmsLoading && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-blue-600" />
                Farm Map View
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{filteredFarms.length} farms</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <FarmMapView farms={filteredFarms} onFarmClick={setSelectedFarm} />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search name, crops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex-1 sm:w-48">
              <Select
                label="Crop Filter"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Crops' },
                  ...countries.map(c => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farms List */}
      <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">List ({filteredFarms.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="mt-6">
            {farmsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredFarms.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No farms found</h3>
                  <p className="text-gray-500 mb-4">Try adjusting your filters or search.</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Farm
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredFarms.map((farm) => (
                  <Card key={farm.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Main Info */}
                        <div className="flex items-center gap-4 min-w-[280px] flex-1">
                          <div className="p-3 rounded-xl bg-green-100">
                            <Leaf className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                            <p className="text-sm text-gray-500">
                              {farm.crops_of_interest?.[0] || 'No crop specified'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              ({farm.centroid?.lat.toFixed(2)}, {farm.centroid?.lon.toFixed(2)})
                            </p>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 min-w-[200px] hidden lg:flex">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Created: {farm.createdAt ? formatDate(farm.createdAt) : 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Updated: {farm.updatedAt ? formatDate(farm.updatedAt) : 'Unknown'}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link to={`/monitoring?farm=${farm.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Monitor
                            </Button>
                          </Link>
                          <Link to={`/crops?farm=${farm.id}`}>
                            <Button variant="ghost" size="sm">
                              <GitBranch className="w-4 h-4 mr-1" />
                              Rotation
                            </Button>
                          </Link>
                          <Link to={`/reports?farm=${farm.id}`}>
                            <Button variant="ghost" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              Report
                            </Button>
                          </Link>
                          <CollectDataDialog
                            open={collectDialogOpen && selectedFarm?.id === farm.id}
                            onOpenChange={setCollectDialogOpen}
                            farm={farm}
                            onCollectionStarted={handleCollectionStarted}
                          />
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedFarm(farm); setCollectDialogOpen(true); }}>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Collect Data
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFarm(farm.id)}>
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFarms.map((farm) => (
              <Card key={farm.id} className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                      <p className="text-sm text-gray-500">Coordinates: ({farm.centroid?.lat.toFixed(3)}, {farm.centroid?.lon.toFixed(3)})</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Crop(s) of Interest</p>
                      <p className="font-medium text-gray-900">{farm.crops_of_interest?.join(', ') || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Description</p>
                      <p className="font-medium text-gray-900">{farm.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-sm">
                    <p className="text-gray-500">Created: {farm.createdAt ? formatDate(farm.createdAt) : 'Unknown'}</p>
                    <p className="text-gray-500">Updated: {farm.updatedAt ? formatDate(farm.updatedAt) : 'Unknown'}</p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Link to={`/monitoring?farm=${farm.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-1" />
                        Monitor
                      </Button>
                    </Link>
                    <Link to={`/crops?farm=${farm.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        <GitBranch className="w-4 h-4 mr-1" />
                        Rotation
                      </Button>
                    </Link>
                    <CollectDataDialog
                      open={collectDialogOpen && selectedFarm?.id === farm.id}
                      onOpenChange={setCollectDialogOpen}
                      farm={farm}
                      onCollectionStarted={handleCollectionStarted}
                    />
                    <Button variant="primary" size="sm" className="w-full" onClick={() => { setSelectedFarm(farm); setCollectDialogOpen(true); }}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Collect Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CollectionStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        collectionId={activeCollectionId}
      />
    </div>
  )
}

// Farm Map View Component
function FarmMapView({ farms, onFarmClick }: { farms: Farm[]; onFarmClick: (farm: Farm) => void }) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const markersRef = React.useRef<Map<Farm['id'], maplibregl.Marker>>(new Map() as Map<Farm['id'], maplibregl.Marker>)

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    try {
      // Calculate center from farms or use default
      let center: [number, number] = [-122.44, 37.77]
      let zoom = 4

      if (farms.length > 0) {
        const coords = farms.map(f => f.centroid).filter(Boolean) as { lat: number; lon: number }[]
        if (coords.length > 0) {
          const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length
          const avgLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length
          center = [avgLon, avgLat]
          zoom = farms.length === 1 ? 13 : 6
        }
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center,
        zoom,
        attributionControl: { compact: true },
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

      // Add farm markers
      farms.forEach(farm => {
        if (!farm.centroid) return

        const el = document.createElement('div')
        el.className = 'w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110'
        el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'
        el.title = farm.name

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([farm.centroid.lon, farm.centroid.lat])
          .addTo(map)

        // Add click handler
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onFarmClick(farm)
        })

        // Add popup
        const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
          .setLngLat([farm.centroid.lon, farm.centroid.lat])
          .setHTML(`
            <div class="p-2 min-w-[180px]">
              <p class="font-medium text-gray-900">${farm.name}</p>
              <p class="text-sm text-gray-500">${farm.crops_of_interest?.join(', ') || 'No crop'}</p>
              <p class="text-xs text-gray-400 font-mono">${farm.centroid.lat.toFixed(4)}, ${farm.centroid.lon.toFixed(4)}</p>
            </div>
          `)

        el.addEventListener('mouseenter', () => popup.addTo(map))
        el.addEventListener('mouseleave', () => popup.remove())

        markersRef.current.set(farm.id, marker)
      })

      // Fit bounds if multiple farms
      if (farms.length > 1) {
        const bounds = new (maplibregl as any).LngLatBounds()
        farms.forEach(farm => {
          if (farm.centroid) bounds.extend([farm.centroid.lon, farm.centroid.lat])
        })
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 13 })
        }
      }

      mapRef.current = map

      return () => {
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current.clear()
        map.remove()
        mapRef.current = null
      }
    } catch (error) {
      console.error('Failed to initialize farm map:', error)
    }
  }, [farms, onFarmClick])

  // Update markers when farms change
  React.useEffect(() => {
    if (!mapRef.current) return

    // Remove markers for farms that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!farms.find(f => f.id === id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add new markers
    farms.forEach(farm => {
      if (!markersRef.current.has(farm.id) && farm.centroid) {
        const el = document.createElement('div')
        el.className = 'w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110'
        el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'
        el.title = farm.name

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([farm.centroid.lon, farm.centroid.lat])
          .addTo(mapRef.current!)

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onFarmClick(farm)
        })

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
          .setLngLat([farm.centroid.lon, farm.centroid.lat])
          .setHTML(`
            <div class="p-2 min-w-[180px]">
              <p class="font-medium text-gray-900">${farm.name}</p>
              <p class="text-sm text-gray-500">${farm.crops_of_interest?.join(', ') || 'No crop'}</p>
              <p class="text-xs text-gray-400 font-mono">${farm.centroid.lat.toFixed(4)}, ${farm.centroid.lon.toFixed(4)}</p>
            </div>
          `)

        el.addEventListener('mouseenter', () => popup.addTo(mapRef.current!))
        el.addEventListener('mouseleave', () => popup.remove())

        markersRef.current.set(farm.id, marker)
      }
    })
  }, [farms, onFarmClick])

  return (
    <div ref={mapContainerRef} className="w-full h-96" />
  )
}