import React, { useState, useCallback } from 'react'
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
  MapPin as MapPinLucide,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, StatCard, MetricCard } from '../components/ui/Card'
import { PageHero } from '../components/PageHero'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Input, Textarea } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../components/ui/Dialog'
import { useFarmDataCollection, useCollectionPolling, useDataSourceAvailability, type Farm, type DataCollectionRequest } from '../hooks/useDataCollection'
import { downloadCsv, formatDate } from '../lib/utils'
import { useFarmStore } from '../stores/farmStore'
import { useUIStore } from '../stores/uiStore'
import { useCreateFarmWithStore, useDeleteFarmWithStore } from '../hooks/useDataCollection'
import maplibregl from 'maplibre-gl'
import { Skeleton, CardSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import { AnimatedPage, StaggeredContainer } from '../components/PageTransition'

const getDataSourceStatusBadge = (status: string) => {
  switch (status) {
    case 'success': return <Badge variant="success">Available</Badge>
    case 'unavailable': return <Badge variant="default">○ Unavailable</Badge>
    case 'failed': return <Badge variant="danger">Failed</Badge>
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
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [lookingUpPlace, setLookingUpPlace] = useState(false)
  const [placeMessage, setPlaceMessage] = useState('')
  const [coordinates, setCoordinates] = useState({ lat: 40.7128, lng: -74.0060 })
  const [area, setArea] = useState('1')
  const [soilType, setSoilType] = useState('')
  const [cropsOfInterest, setCropsOfInterest] = useState('maize, wheat, soybean')
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const applyPlace = async (lat: number, lng: number) => {
    setCoordinates({ lat, lng })
    setLookingUpPlace(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      )
      if (!response.ok) return
      const data = await response.json()
      const address = data.address || {}
      if (address.country) setCountry(address.country)
      const place = address.state || address.region || address.state_district || address.county || address.city || ''
      if (place) setRegion(place)
      setPlaceMessage(
        address.country
          ? `Validated: ${address.country}${place ? ` · ${place}` : ''}`
          : 'No place found for these coordinates'
      )
    } catch {
      setPlaceMessage('Could not validate this location')
    } finally {
      setLookingUpPlace(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const offset = 0.001
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
      setName(''); setDescription(''); setRegion(''); setArea('1'); setSoilType(''); setCropsOfInterest('maize, wheat, soybean')
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to create farm', message: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden animate-modal-enter">
          <DialogHeader>
            <DialogTitle>Create New Farm</DialogTitle>
            <DialogDescription>Add a new farm to your portfolio for analysis</DialogDescription>
            <DialogClose onClick={() => onOpenChange(false)} />
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-8rem)] flex-col overflow-hidden">
            {!showMapPicker ? (
              <div className="overflow-y-auto p-4 space-y-4 animate-fade-in">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="animate-slide-up">
                    <label className="block text-sm font-medium mb-1">Farm Name *</label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., North Field 1" />
                  </div>
                  <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <Input value={country} onChange={e => setCountry(e.target.value)} placeholder={lookingUpPlace ? 'Looking up…' : 'Filled from the map'} />
                  </div>
                  <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <label className="block text-sm font-medium mb-1">Region / State</label>
                    <Input value={region} onChange={e => setRegion(e.target.value)} placeholder={lookingUpPlace ? 'Looking up…' : 'e.g., Iowa'} />
                  </div>
                  <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <label className="block text-sm font-medium mb-1">Area (ha)</label>
                    <Input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., 45" />
                  </div>
                  <div className="sm:col-span-2 animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description of the farm" rows={3} />
                  </div>
                  <div className="sm:col-span-2 animate-slide-up" style={{ animationDelay: '250ms' }}>
                    <label className="block text-sm font-medium mb-1">Coordinates (Lat, Lng) *</label>
                    <div className="flex gap-2">
                      <Input type="number" step="0.0001" value={coordinates.lat} onChange={e => setCoordinates({ ...coordinates, lat: parseFloat(e.target.value) || 0 })} onBlur={() => applyPlace(coordinates.lat, coordinates.lng)} placeholder="Latitude" className="flex-1" />
                      <Input type="number" step="0.0001" value={coordinates.lng} onChange={e => { setPlaceMessage(''); setCoordinates({ ...coordinates, lng: parseFloat(e.target.value) || 0 }) }} onBlur={() => applyPlace(coordinates.lat, coordinates.lng)} placeholder="Longitude" className="flex-1" />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowMapPicker(true)}>
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        Pick on Map
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => applyPlace(pos.coords.latitude, pos.coords.longitude))
                        }
                      }}>
                        <Target className="w-4 h-4 mr-1" />
                        Use My Location
                      </Button>
                      <Button type="button" size="sm" onClick={() => applyPlace(coordinates.lat, coordinates.lng)} disabled={lookingUpPlace}>
                        {lookingUpPlace ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                        Valider
                      </Button>
                    </div>
                    {placeMessage && (
                      <p className={`mt-2 text-sm animate-fade-in ${placeMessage.startsWith('Validated') ? 'text-green-700' : 'text-red-700'}`}>{placeMessage}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2 animate-slide-up" style={{ animationDelay: '300ms' }}>
                    <label className="block text-sm font-medium mb-1">Soil Type</label>
                    <Input value={soilType} onChange={e => setSoilType(e.target.value)} placeholder="e.g., Loam, Clay Loam, Sandy Loam" />
                  </div>
                  <div className="sm:col-span-2 animate-slide-up" style={{ animationDelay: '350ms' }}>
                    <label className="block text-sm font-medium mb-1">Crops of Interest (comma-separated)</label>
                    <Input value={cropsOfInterest} onChange={e => setCropsOfInterest(e.target.value)} placeholder="e.g., corn, wheat, soybean" />
                    <p className="text-xs text-gray-500 mt-1">Used for crop suitability analysis (GAEZ)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium animate-slide-up">Click on map to select location</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowMapPicker(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Back to Form
                  </Button>
                </div>
                <div className="h-96 rounded-lg overflow-hidden bg-gray-100 relative animate-scale-in">
                  <FieldMapPicker initialCoordinates={coordinates} onSelect={(coords) => { setShowMapPicker(false); applyPlace(coords.lat, coords.lng); }} />
                </div>
                <p className="text-sm text-gray-500 text-center animate-fade-in">Click anywhere on the map to select the farm location</p>
              </div>
            )}
            <DialogFooter className="shrink-0 animate-slide-up">
              <Button type="button" onClick={() => applyPlace(coordinates.lat, coordinates.lng)} disabled={lookingUpPlace || showMapPicker}>
                {lookingUpPlace ? 'Validation…' : 'Valider'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (<> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating... </>) : ('Create Farm')}
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
      const el = document.createElement('div')
      el.className = 'w-6 h-6 bg-primary-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-marker-drop'
      el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([initialCoordinates.lng, initialCoordinates.lat]).addTo(map)
      map.on('click', (e) => {
        const coords = e.lngLat
        if (markerRef.current) markerRef.current.setLngLat([coords.lng, coords.lat])
        onSelect({ lat: coords.lat, lng: coords.lng })
      })
      mapRef.current = map
      return () => { map.remove(); mapRef.current = null }
    } catch (error) { console.error('Failed to initialize map picker:', error) }
  }, [initialCoordinates, onSelect])

  return <div ref={mapContainerRef} className="w-full h-full min-h-0" />
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
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0] })
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
      addToast({ type: 'error', title: 'Failed to start collection', message: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  if (!farm) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <DialogContent className="sm:max-w-[600px] animate-modal-enter">
          <DialogHeader>
            <DialogTitle>Collecter les données for {farm.name}</DialogTitle>
            <DialogDescription>Trigger NASA data collection for this farm</DialogDescription>
            <DialogClose onClick={() => onOpenChange(false)} />
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 p-4 animate-fade-in">
            {triggerError && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4" />
                <span>Failed to start collection: {triggerError.message}</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="animate-slide-up">
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required max={endDate} />
              </div>
              <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
                <label className="block text-sm font-medium mb-1">End Date *</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="sm:col-span-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <label className="block text-sm font-medium mb-1">Crops of Interest (for GAEZ analysis)</label>
                <Input value={cropsOfInterest} onChange={e => setCropsOfInterest(e.target.value)} placeholder="e.g., maize, wheat, soybean, rice, sorghum" />
                <p className="text-xs text-gray-500 mt-1">Optional: Override farm's default crops for suitability analysis</p>
              </div>
            </div>
            <div className="p-3 rounded bg-blue-50 text-blue-700 text-sm animate-fade-in" style={{ animationDelay: '150ms' }}>
              <p className="font-medium">Data sources to be collected:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>NASA POWER - Climate data</li>
                <li>Sentinel-2 - Optical imagery & vegetation indices</li>
                <li>Landsat 8/9 - Surface reflectance</li>
                <li>GPM IMERG - Precipitation data</li>
                <li>SMAP - Soil moisture</li>
                <li>FAO GAEZ - Crop suitability</li>
              </ul>
              <p className="text-xs mt-2 opacity-80">Some sources require authentication. Unavailable sources will be marked in results.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={triggerLoading}>Cancel</Button>
              <Button type="submit" disabled={triggerLoading}>
                {triggerLoading ? (<> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting Collection... </>) : ('Start Data Collection')}
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
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] animate-modal-enter">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <StatusIcon className={cn('w-5 h-5', statusColor, isRunning && 'animate-spin')} />
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
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto animate-fade-in">
            {error && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4" />
                <span>Error: {error.message}</span>
              </div>
            )}

            {/* Overall Progress */}
            <Card variant="elevated" className="hover-lift">
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
                        className={cn('h-full transition-all duration-500 ease-out-cubic', isComplete ? 'bg-green-600' : 'bg-blue-600')}
                        style={{ width: totalSources > 0 ? `${(successfulCount / totalSources) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Source Status */}
            <Card variant="elevated" className="hover-lift">
              <CardHeader>
                <CardTitle className="text-base">Data Source Availability</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {Object.entries(availability).map(([source, status]) => (
                    <div key={source} className="p-4 flex items-center justify-between hover:bg-gray-50 animate-slide-up" style={{ animationDelay: '50ms' }}>
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center animate-scale-in',
                          status === 'success' ? 'bg-green-100 text-green-600' :
                          status === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {status === 'success' ? <CheckCircle className="w-5 h-5" /> :
                           status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                           <Loader2 className="w-5 h-5 animate-spin" />}
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
              <Card variant="elevated" className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-base">Key Metrics Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggeredContainer staggerDelay={60} transition="stagger-scale">
                    {summary.key_metrics.climate && (
                      <div className="p-3 rounded-lg bg-blue-50 animate-scale-in">
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
                      <div className="p-3 rounded-lg bg-green-50 animate-scale-in">
                        <h4 className="font-medium text-green-900 mb-2">Vegetation (Sentinel-2)</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-500">Latest:</span> <span className="font-medium">{summary.key_metrics.vegetation.latest_acquisition ? new Date(summary.key_metrics.vegetation.latest_acquisition).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-gray-500">Cloud Cover:</span> <span className="font-medium">{summary.key_metrics.vegetation.cloud_cover !== undefined ? summary.key_metrics.vegetation.cloud_cover + '%' : 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                    {summary.key_metrics.landsat && (
                      <div className="p-3 rounded-lg bg-amber-50 animate-scale-in">
                        <h4 className="font-medium text-amber-900 mb-2">Landsat</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-500">Latest:</span> <span className="font-medium">{summary.key_metrics.landsat.latest_acquisition ? new Date(summary.key_metrics.landsat.latest_acquisition).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-gray-500">Cloud Cover:</span> <span className="font-medium">{summary.key_metrics.landsat.cloud_cover !== undefined ? summary.key_metrics.landsat.cloud_cover + '%' : 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                  </StaggeredContainer>
                </CardContent>
              </Card>
            )}

            {/* Failed sources details */}
            {failedSources.length > 0 && (
              <Card variant="outlined" className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-base text-red-700">Failed Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {failedSources.map(({ source, error }) => (
                      <div key={source} className="p-3 rounded bg-red-50 text-red-700 text-sm animate-fade-in">
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
  const [searchQuery, setSearchQuery] = useState('')
  const [cropFilter, setCropFilter] = useState('all')
  const [showMap, setShowMap] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [collectDialogOpen, setCollectDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)

  const { farms, loading: farmsLoading, error: farmsError, fetchFarms } = useFarmStore()
  const { addToast } = useUIStore()
  const deleteFarmWithStore = useDeleteFarmWithStore()

  React.useEffect(() => { fetchFarms() }, [fetchFarms])

  const handleDeleteFarm = async (farmId: string) => {
    if (!confirm(`Supprimer la parcelle « ${farms.find((farm) => farm.id === farmId)?.name || ''} » ? Cette action est irréversible.`)) return
    try {
      await deleteFarmWithStore.mutateAsync(farmId)
      addToast({ type: 'success', title: 'Parcelle supprimée' })
    } catch (error) {
      console.error('Échec de la suppression de la parcelle :', error)
      addToast({ type: 'error', title: 'Suppression impossible', message: 'Réessayez dans quelques instants.' })
    }
  }

  const handleCollectionStarted = (collectionId: string) => {
    setActiveCollectionId(collectionId)
    setStatusDialogOpen(true)
  }

  const crops = farms ? [...new Set(farms.flatMap((farm) => farm.crops_of_interest || []).filter(Boolean))] : []

  const filteredFarms = farms?.filter((farm) => {
    const query = searchQuery.trim().toLocaleLowerCase('fr')
    const matchesQuery = !query || farm.name.toLocaleLowerCase('fr').includes(query) ||
      farm.crops_of_interest?.some((crop) => crop.toLocaleLowerCase('fr').includes(query))
    const matchesCrop = cropFilter === 'all' || farm.crops_of_interest?.includes(cropFilter)
    return Boolean(matchesQuery && matchesCrop)
  }) || []

  const exportFilteredFarms = () => {
    downloadCsv(
      'parcelles.csv',
      ['Nom', 'Cultures déclarées', 'Description', 'Latitude', 'Longitude', 'Créée le', 'Mise à jour'],
      filteredFarms.map((farm) => [
        farm.name,
        farm.crops_of_interest?.join(', ') || '',
        farm.description || '',
        farm.centroid?.lat ?? '',
        farm.centroid?.lon ?? '',
        farm.createdAt ? formatDate(farm.createdAt) : '',
        farm.updatedAt ? formatDate(farm.updatedAt) : '',
      ]),
    )
  }

  const stats = [
    { label: 'Parcelles', value: farms?.length || 0, icon: MapIcon, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Cultures représentées', value: crops.length, icon: Leaf, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Cultures déclarées', value: farms?.reduce((sum, farm) => sum + (farm.crops_of_interest?.length || 0), 0), icon: GitBranch, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { label: 'Parcelles avec culture', value: farms?.filter((farm) => (farm.crops_of_interest?.length || 0) > 0).length || 0, icon: CheckCircle, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  ]

  // Loading skeleton
  if (farmsLoading || (farms === undefined)) {
    return (
      <AnimatedPage>
        <PageHero kicker="GESTION DES PARCELLES" title="Mes exploitations" subtitle="Parcelles enregistrées, cultures déclarées et état des collectes de données." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCardSkeleton key={stat.label} className="animate-stagger-slide-up stagger-1" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <CardSkeleton className="animate-stagger-slide-up stagger-5" />
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className="space-y-6">
      {/* Header */}
      <PageHero
        kicker="GESTION DES PARCELLES"
        title="Mes exploitations"
        subtitle="Parcelles enregistrées, cultures déclarées et état des collectes de données."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportFilteredFarms} disabled={filteredFarms.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter la liste
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowMap(!showMap)}>
              <MapIcon className="w-4 h-4 mr-2" />
              {showMap ? 'Masquer la carte' : 'Afficher la carte'}
            </Button>
            <CreateFarmDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onSuccess={() => fetchFarms()}
            />
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle parcelle
            </Button>
          </>
        }
      />

      {/* Stats with animated cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: '100ms' }}>
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={<stat.icon className="w-6 h-6" />}
            className="hover-lift animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* Error display */}
      {farmsError && (
        <Card variant="outlined" className="border-red-200 bg-red-50 animate-shake animate-fade-in">
          <CardContent className="p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>Impossible de charger les exploitations : {farmsError}</span>
            <Button variant="ghost" size="sm" onClick={() => fetchFarms()} className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Map View */}
      {showMap && (
        <Card variant="elevated" className="mb-6 overflow-hidden hover-lift animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-blue-600" />
                Carte des parcelles
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{filteredFarms.length} parcelle{filteredFarms.length > 1 ? 's' : ''}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 animate-fade-in">
            <FarmMapView farms={filteredFarms} />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card variant="elevated" className="hover-lift animate-fade-in" style={{ animationDelay: '200ms' }}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 sm:w-80 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input placeholder="Rechercher une parcelle ou une culture" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex-1 sm:w-48">
              <Select label="Filtrer par culture" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}
                options={[{ value: 'all', label: 'Toutes les cultures' }, ...crops.map((crop) => ({ value: crop, label: crop }))]} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farms List */}
      <Tabs defaultValue="list" className="w-full" variant="segments" animated transition="fade">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="list" icon={<MapPinLucide className="w-4 h-4" />}>Liste ({filteredFarms.length})</TabsTrigger>
          <TabsTrigger value="details" icon={<FileText className="w-4 h-4" />}>Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="list" transition="slide">
          <div className="space-y-3 mt-6">
            {filteredFarms.length === 0 ? (
              <Card variant="elevated" className="animate-fade-in">
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-float" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">
                    {farms.length === 0 ? 'Aucune parcelle enregistrée' : 'Aucun résultat'}
                  </h3>
                  <p className="mb-4 text-gray-500">
                    {farms.length === 0 ? 'Ajoutez une parcelle pour commencer le suivi.' : 'Modifiez votre recherche ou effacez les filtres.'}
                  </p>
                  {farms.length === 0 ? (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle parcelle
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => { setSearchQuery(''); setCropFilter('all') }}>
                      Effacer les filtres
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredFarms.map((farm, index) => (
                <Card
                  key={farm.id}
                  variant="interactive"
                  hover
                  className="overflow-hidden animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-4 min-w-[280px] flex-1">
                        <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 animate-scale-in">
                          <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                          <p className="text-sm text-gray-500">{farm.crops_of_interest?.[0] || 'Culture non précisée'}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            ({farm.centroid?.lat.toFixed(2)}, {farm.centroid?.lon.toFixed(2)})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 min-w-[200px] hidden lg:flex">
                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>Créée le {farm.createdAt ? formatDate(farm.createdAt) : 'Date inconnue'}</span></div>
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>Mise à jour : {farm.updatedAt ? formatDate(farm.updatedAt) : 'Date inconnue'}</span></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/monitoring?farm=${farm.id}`}><Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-1" />Surveillance</Button></Link>
                        <Link to={`/crops?farm=${farm.id}`}><Button variant="ghost" size="sm"><GitBranch className="w-4 h-4 mr-1" />Rotation</Button></Link>
                        <Link to={`/reports?farm=${farm.id}`}><Button variant="ghost" size="sm"><FileText className="w-4 h-4 mr-1" />Rapport</Button></Link>
                        <CollectDataDialog open={collectDialogOpen && selectedFarm?.id === farm.id} onOpenChange={setCollectDialogOpen} farm={farm} onCollectionStarted={handleCollectionStarted} />
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedFarm(farm); setCollectDialogOpen(true); }}><RefreshCw className="w-4 h-4 mr-1" />Collecter les données</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteFarm(farm.id)}><Trash className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-earth-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="details" transition="slide">
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFarms.map((farm, index) => (
              <Card key={farm.id} variant="elevated" hover className="h-full overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                      <p className="text-sm text-gray-500">Coordonnées : ({farm.centroid?.lat.toFixed(3)}, {farm.centroid?.lon.toFixed(3)})</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm animate-slide-up">
                    <div><p className="text-gray-500">Cultures déclarées</p><p className="font-medium text-gray-900">{farm.crops_of_interest?.join(', ') || 'Non renseignées'}</p></div>
                    <div><p className="text-gray-500">Description</p><p className="font-medium text-gray-900">{farm.description || 'Aucune description'}</p></div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-sm animate-fade-in">
                    <p className="text-gray-500">Créée le {farm.createdAt ? formatDate(farm.createdAt) : 'Date inconnue'}</p>
                    <p className="text-gray-500">Mise à jour : {farm.updatedAt ? formatDate(farm.updatedAt) : 'Date inconnue'}</p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100 animate-fade-in">
                    <Link to={`/monitoring?farm=${farm.id}`} className="flex-1"><Button variant="secondary" size="sm" className="w-full"><Eye className="w-4 h-4 mr-1" />Surveillance</Button></Link>
                    <Link to={`/crops?farm=${farm.id}`} className="flex-1"><Button variant="secondary" size="sm" className="w-full"><GitBranch className="w-4 h-4 mr-1" />Rotation</Button></Link>
                    <CollectDataDialog open={collectDialogOpen && selectedFarm?.id === farm.id} onOpenChange={setCollectDialogOpen} farm={farm} onCollectionStarted={handleCollectionStarted} />
                    <Button variant="primary" size="sm" className="w-full" onClick={() => { setSelectedFarm(farm); setCollectDialogOpen(true); }}><RefreshCw className="w-4 h-4 mr-1" />Collecter les données</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CollectionStatusDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen} collectionId={activeCollectionId} />
    </AnimatedPage>
  )
}

function createFarmPopup(farm: Farm) {
  const content = document.createElement('div')
  content.className = 'min-w-[180px] p-2'
  const title = document.createElement('p')
  title.className = 'font-medium text-gray-900'
  title.textContent = farm.name
  const crops = document.createElement('p')
  crops.className = 'text-sm text-gray-500'
  crops.textContent = farm.crops_of_interest?.join(', ') || 'Culture non précisée'
  const coordinates = document.createElement('p')
  coordinates.className = 'font-mono text-xs text-gray-400'
  coordinates.textContent = `${farm.centroid.lat.toFixed(4)}, ${farm.centroid.lon.toFixed(4)}`
  content.append(title, crops, coordinates)
  return new maplibregl.Popup({ offset: 25, closeButton: true })
    .setLngLat([farm.centroid.lon, farm.centroid.lat])
    .setDOMContent(content)
}

// Carte des parcelles
function FarmMapView({ farms }: { farms: Farm[] }) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const markersRef = React.useRef<Map<Farm['id'], maplibregl.Marker>>(new Map() as Map<Farm['id'], maplibregl.Marker>)

  React.useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    try {
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
      farms.forEach(farm => {
        if (!farm.centroid) return
        const el = document.createElement('div')
        el.className = 'w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 animate-marker-drop'
        el.style.animationDelay = `${Math.random() * 200}ms`
        el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'
        el.title = farm.name
        const marker = new maplibregl.Marker({ element: el }).setLngLat([farm.centroid.lon, farm.centroid.lat]).addTo(map)
        const popup = createFarmPopup(farm)
        el.addEventListener('click', (event) => { event.stopPropagation(); popup.addTo(map) })

        markersRef.current.set(farm.id, marker)
      })
      if (farms.length > 1) {
        const bounds = new (maplibregl as any).LngLatBounds()
        farms.forEach(farm => { if (farm.centroid) bounds.extend([farm.centroid.lon, farm.centroid.lat]) })
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50, maxZoom: 13 })
      }
      mapRef.current = map
      return () => { markersRef.current.forEach(marker => marker.remove()); markersRef.current.clear(); map.remove(); mapRef.current = null }
    } catch (error) { console.error('Failed to initialize farm map:', error) }
  }, [farms])

  React.useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach((marker, id) => {
      if (!farms.find(f => f.id === id)) { marker.remove(); markersRef.current.delete(id) }
    })
    farms.forEach(farm => {
      if (!markersRef.current.has(farm.id) && farm.centroid) {
        const el = document.createElement('div')
        el.className = 'w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 animate-marker-drop'
        el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'
        el.title = farm.name
        const marker = new maplibregl.Marker({ element: el }).setLngLat([farm.centroid.lon, farm.centroid.lat]).addTo(mapRef.current!)
        const popup = createFarmPopup(farm)
        el.addEventListener('click', (event) => { event.stopPropagation(); popup.addTo(mapRef.current!) })

        markersRef.current.set(farm.id, marker)
      }
    })
  }, [farms])

  return <div ref={mapContainerRef} className="w-full h-96" />
}