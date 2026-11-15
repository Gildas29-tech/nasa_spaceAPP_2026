import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl, { Map, MapMouseEvent, LngLatLike, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '../lib/utils'
import {
  MapPin,
  Layers,
  Plus,
  Minus,
  Expand,
  Download,
  Settings,
  Leaf,
  Droplet,
  Sun,
  Cloud,
  Thermometer,
  Wind,
  BarChart3,
  X,
  Search,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Map as MapIcon,
  Navigation,
  GitBranch,
  ArrowRight,
  Save,
  Globe,
  Moon,
  Mountain,
  MapPin as MapPinIcon,
  FileCheck,
  Zap,
  Database,
  Wifi,
  Eye,
  EyeOff,
  Compass,
  Layers as LayersIcon,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { useCreateFarmWithStore, useTriggerCollection, type Farm } from '../hooks/useDataCollection'
import type { CreateFarmData } from '../stores/farmStore'
import { useToast } from '../hooks/useToast.tsx'
import { useFarmStore } from '../stores/farmStore'
import { api } from '../lib/api'
import { AnimatedPage, RevealOnScroll, StaggeredContainer } from '../components/PageTransition'
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton'

// Mapbox/MapLibre style URLs - using free demo styles from MapLibre
const BASE_MAP_STYLES = {
  'osm-bright': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  'osm-liberty': 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'osm-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'stamen-terrain': 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'stamen-toner': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

// NASA tile layer sources (examples - would need real tile services)
const NASA_TILE_SOURCES = {
  modis_ndvi: {
    name: 'MODIS NDVI',
    tiles: ['https://tiles.example.com/modis/ndvi/{z}/{x}/{y}.pbf'],
    type: 'vector',
    minzoom: 0,
    maxzoom: 12,
  },
  sentinel2: {
    name: 'Sentinel-2',
    tiles: ['https://tiles.example.com/sentinel2/{z}/{x}/{y}.pbf'],
    type: 'vector',
    minzoom: 0,
    maxzoom: 14,
  },
  smap: {
    name: 'SMAP Soil Moisture',
    tiles: ['https://tiles.example.com/smap/{z}/{x}/{y}.pbf'],
    type: 'vector',
    minzoom: 0,
    maxzoom: 10,
  },
}

const layerOptions = [
  // Soil Moisture
  { id: 'smap_surface', group: 'Soil Moisture', label: 'SMAP Surface SM', source: 'SMAP', resolution: '9 km', temporal: 'Daily', visible: false },
  { id: 'smap_rootzone', group: 'Soil Moisture', label: 'SMAP Root Zone SM', source: 'SMAP', resolution: '9 km', temporal: 'Daily', visible: false },
  { id: 'crop_casma', group: 'Soil Moisture', label: 'Crop-CASMA (CONUS)', source: 'NASA-USDA', resolution: '1 km', temporal: 'Daily', visible: false },
  { id: 'nasa_usda', group: 'Soil Moisture', label: 'NASA-USDA Global SM', source: 'NASA-USDA', resolution: '10 km', temporal: 'Daily', visible: false },
  // Vegetation
  { id: 'modis_ndvi', group: 'Vegetation', label: 'MODIS NDVI', source: 'MODIS', resolution: '250 m', temporal: '16-day', visible: true },
  { id: 'modis_evi', group: 'Vegetation', label: 'MODIS EVI', source: 'MODIS', resolution: '250 m', temporal: '16-day', visible: false },
  { id: 'landsat_ndvi', group: 'Vegetation', label: 'Landsat NDVI', source: 'Landsat 8/9', resolution: '30 m', temporal: '16-day', visible: false },
  { id: 'landsat_savi', group: 'Vegetation', label: 'Landsat SAVI', source: 'Landsat 8/9', resolution: '30 m', temporal: '16-day', visible: false },
  // Temperature
  { id: 'modis_lst', group: 'Temperature', label: 'MODIS LST', source: 'MODIS', resolution: '1 km', temporal: '8-day', visible: false },
  { id: 'ecostress_lst', group: 'Temperature', label: 'ECOSTRESS LST', source: 'ECOSTRESS', resolution: '70 m', temporal: '~4-day', visible: false },
  // Water
  { id: 'gpm_precip', group: 'Water', label: 'GPM Precipitation', source: 'GPM/IMERG', resolution: '0.1°', temporal: '30-min', visible: false },
  { id: 'openet_et', group: 'Water', label: 'OpenET ET', source: 'OpenET', resolution: '30 m', temporal: 'Monthly', visible: false },
  { id: 'ecostress_et', group: 'Water', label: 'ECOSTRESS ET', source: 'ECOSTRESS', resolution: '70 m', temporal: '~4-day', visible: false },
  { id: 'ecostress_esi', group: 'Water', label: 'ECOSTRESS ESI', source: 'ECOSTRESS', resolution: '70 m', temporal: '~4-day', visible: false },
  // Land Cover
  { id: 'modis_landcover', group: 'Land Cover', label: 'MODIS Land Cover', source: 'MODIS', resolution: '500 m', temporal: 'Annual', visible: false },
  // Elevation
  { id: 'icesat2', group: 'Elevation', label: 'ICESat-2 ATL24', source: 'ICESat-2', resolution: '~10 m', temporal: 'Continuous', visible: false },
]

const baseMaps = [
  { id: 'osm-bright', label: 'OSM Bright', icon: MapIcon },
  { id: 'osm-liberty', label: 'OSM Liberty', icon: Globe },
  { id: 'osm-dark', label: 'OSM Dark', icon: Moon },
  { id: 'stamen-terrain', label: 'Terrain', icon: Mountain },
  { id: 'stamen-toner', label: 'Toner', icon: LayersIcon },
]

interface Coordinates {
  lng: number
  lat: number
}

interface GeoLocation {
  lat: number
  lng: number
  address?: string | null
  displayName?: string
  country?: string
  region?: string
  state?: string
  county?: string
}

interface StructuredAddress {
  country: string
  countryCode: string
  state: string
  region: string
  county: string
  city: string
  postcode: string
  displayName: string
}

// Loading skeleton
function FieldMapSkeleton() {
  return (
    <AnimatedPage className="h-[calc(100vh-8rem)] flex overflow-hidden">
      <div className="w-80 lg:w-96 bg-white border-r border-gray-200 animate-pulse">
        <div className="p-4 border-b border-gray-100">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className="h-10 bg-gray-200 rounded mb-2" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        </div>
      </div>
    </AnimatedPage>
  )
}

function AnimatedPanel({ children, delay = 0, className, ...props }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay} key={className}>
      <div className={cn('animate-fade-in', className)} style={{ animationDelay: '100ms' }} {...props}>
        {children}
      </div>
    </RevealOnScroll>
  )
}

function LayerToggle({ layer, onToggle, delay = 0 }: { layer: typeof layerOptions[0]; onToggle: (id: string) => void; delay?: number }) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay}>
      <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors animate-fade-in hover-lift">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <label className="flex items-center gap-2 cursor-pointer animate-scale-in hover:scale-105 transition-transform">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onToggle(layer.id)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{layer.label}</p>
                <p className="text-xs text-gray-500">{layer.source} • {layer.resolution} • {layer.temporal}</p>
              </div>
            </label>
          </div>
          <Badge variant={layer.visible ? 'success' : 'gray'} size="sm" className="animate-scale-in">
            {layer.visible ? 'Visible' : 'Hidden'}
          </Badge>
        </div>
      </div>
    </RevealOnScroll>
  )
}

function DataSourceCard({ source, delay = 0 }: { source: any; delay?: number }) {
  return (
    <RevealOnScroll transition="slide-up" delay={delay}>
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 animate-fade-in hover:bg-gray-50 rounded px-2 transition-colors">
        <div>
          <p className="text-sm font-medium text-gray-900">{source.name}</p>
          <p className="text-xs text-gray-500">{source.freq} • {source.res} • {source.sources.join(', ')}</p>
        </div>
        <Badge variant={source.status.includes('Available') ? 'success' : 'warning'} size="sm" className="animate-scale-in">
          {source.status}
        </Badge>
      </div>
    </RevealOnScroll>
  )
}

function QuickActionButton({ icon: Icon, label, onClick, delay = 0, variant = 'ghost', ...props }: any) {
  return (
    <RevealOnScroll transition="scale-in" delay={delay}>
      <Button variant={variant} size="sm" className="h-auto py-3 hover-lift" onClick={onClick} {...props}>
        <Icon className="w-5 h-5 mx-auto mb-1" />
        <span className="text-xs">{label}</span>
      </Button>
    </RevealOnScroll>
  )
}

export default function FieldMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const popupRef = useRef<Popup | null>(null)

  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null)
  const [baseMap, setBaseMap] = useState('osm-bright')
  const [activeLayerGroup, setActiveLayerGroup] = useState('Vegetation')
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(layerOptions.map(l => [l.id, l.visible]))
  )
  const [mapView, setMapView] = useState({ center: { lng: -122.44, lat: 37.77 }, zoom: 11 })
  const [drawingMode, setDrawingMode] = useState(false)
  const [activeTab, setActiveTab] = useState('layers')
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' })
  const [opacity, setOpacity] = useState(70)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  // Farm creation form state
  const [showFarmForm, setShowFarmForm] = useState(false)
  const [farmFormData, setFarmFormData] = useState<Partial<CreateFarmData>>({
    name: '',
    crop: 'Maize',
    area: '1 ha',
    soilType: '',
    description: '',
  })
  const [soilType, setSoilType] = useState<string>('')
  const [isDeterminingSoil, setIsDeterminingSoil] = useState(false)
  const [isSavingFarm, setIsSavingFarm] = useState(false)

  const navigate = useNavigate()
  const { toast } = useToast()
  const createFarmWithStore = useCreateFarmWithStore()
  const triggerCollection = useTriggerCollection()
  const createFarmStore = useFarmStore(state => state.createFarm)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: BASE_MAP_STYLES[baseMap as keyof typeof BASE_MAP_STYLES] || BASE_MAP_STYLES['osm-bright'],
        center: [mapView.center.lng, mapView.center.lat] as LngLatLike,
        zoom: mapView.zoom,
        attributionControl: { compact: true },
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
      map.addControl(new maplibregl.FullscreenControl(), 'top-right')

      let ready = false
      map.on('load', () => {
        ready = true
        setMapLoaded(true)
        setMapError(null)
        map.on('click', handleMapClick)
      })

      map.on('error', (e) => {
        console.error('Map error:', e)
        setMapError(e.error?.message || 'La carte n’a pas pu se charger')
      })

      const timeout = window.setTimeout(() => {
        if (!ready) {
          setMapError('La carte met trop de temps à répondre.')
          setMapLoaded(true)
        }
      }, 12000)

      mapRef.current = map

      return () => {
        window.clearTimeout(timeout)
        map.off('click', handleMapClick)
        map.remove()
        mapRef.current = null
      }
    } catch (error) {
      console.error('Failed to initialize map:', error)
      setMapError(error instanceof Error ? error.message : 'Failed to initialize map')
    }
  }, [])

  // Update map style when base map changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(BASE_MAP_STYLES[baseMap as keyof typeof BASE_MAP_STYLES] || BASE_MAP_STYLES['osm-bright'])
    }
  }, [baseMap, mapLoaded])

  // Handle map click - get coordinates and reverse geocode
  const handleMapClick = useCallback(async (e: MapMouseEvent) => {
    const coords = e.lngLat
    const location: Coordinates = { lng: coords.lng, lat: coords.lat }

    // Update map view
    setMapView({ center: location, zoom: mapRef.current?.getZoom() || 13 })

    // Reverse geocode
    setIsGeocoding(true)
    try {
      const structuredAddress = await reverseGeocode(coords.lat, coords.lng)
      let geoLocation: GeoLocation
      let displayName: string

      if (structuredAddress) {
        geoLocation = {
          lat: coords.lat,
          lng: coords.lng,
          address: structuredAddress.displayName,
          displayName: structuredAddress.displayName,
          country: structuredAddress.country,
          region: structuredAddress.region || structuredAddress.state,
          state: structuredAddress.state,
          county: structuredAddress.county,
        }
        displayName = structuredAddress.displayName
      } else {
        const fallbackName = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
        geoLocation = {
          lat: coords.lat,
          lng: coords.lng,
          displayName: fallbackName,
        }
        displayName = fallbackName
      }

      setSelectedLocation(geoLocation)

      // Auto-determine soil type
      setIsDeterminingSoil(true)
      const determinedSoilType = await determineSoilType(coords.lat, coords.lng)
      setSoilType(determinedSoilType)
      setIsDeterminingSoil(false)

      // Pre-fill farm form with auto-determined values
      setFarmFormData(prev => ({
        ...prev,
        name: `Field at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
        soilType: determinedSoilType,
        description: `${determinedSoilType} | ${structuredAddress?.country || 'Unknown country'}, ${structuredAddress?.state || structuredAddress?.region || 'Unknown region'}`,
      }))

      // Show the farm creation form
      setShowFarmForm(true)

      // Update marker
      updateMarker(location, displayName || 'Selected Location')

      toast({
        title: 'Location Selected',
        description: displayName,
        variant: 'success',
      })
    } catch (error) {
      console.error('Geocoding failed:', error)
      const fallbackName = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      const geoLocation: GeoLocation = {
        lat: coords.lat,
        lng: coords.lng,
        displayName: fallbackName,
      }
      setSelectedLocation(geoLocation)
      updateMarker(location, fallbackName)
      setShowFarmForm(true)
    } finally {
      setIsGeocoding(false)
      setIsDeterminingSoil(false)
    }
  }, [toast])

  // Update marker on map
  const updateMarker = useCallback((location: Coordinates, label: string) => {
    if (!mapRef.current) return

    if (markerRef.current) {
      markerRef.current.remove()
    }

    const el = document.createElement('div')
    el.className = 'w-6 h-6 bg-primary-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-scale-in'
    el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([location.lng, location.lat])
      .addTo(mapRef.current)

    if (popupRef.current) {
      popupRef.current.remove()
    }

    popupRef.current = new maplibregl.Popup({ offset: 25, closeButton: false })
      .setLngLat([location.lng, location.lat])
      .setHTML(`
        <div class="p-2 min-w-[200px]">
          <p class="font-medium text-gray-900">${label}</p>
          <p class="text-sm text-gray-500 font-mono">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
        </div>
      `)
      .addTo(mapRef.current)
  }, [])

  // Enhanced reverse geocode using Nominatim (OpenStreetMap) - returns structured address
  const reverseGeocode = async (lat: number, lng: number): Promise<StructuredAddress | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'FieldShift/1.0' } }
      )
      if (!response.ok) return null
      const data = await response.json()

      const address = data.address || {}
      return {
        country: address.country || '',
        countryCode: address.country_code?.toUpperCase() || '',
        state: address.state || address.region || '',
        region: address.state_district || address.county || address.region || '',
        county: address.county || '',
        city: address.city || address.town || address.village || address.municipality || '',
        postcode: address.postcode || '',
        displayName: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      }
    } catch {
      return null
    }
  }

  // Determine soil type based on location using NASA-USDA or simple lookup
  const determineSoilType = async (lat: number, lng: number): Promise<string> => {
    try {
      const absLat = Math.abs(lat)

      if (absLat < 23.5) {
        return 'Tropical soil (Oxisol/Ultisol) - High weathering, low fertility'
      } else if (absLat < 35) {
        return 'Subtropical soil (Alfisol) - Moderate weathering, good fertility'
      } else if (absLat < 50) {
        return 'Temperate soil (Mollisol/Alfisol) - High organic matter, very fertile'
      } else if (absLat < 66.5) {
        return 'Boreal soil (Spodosol/Histosol) - Acidic, high organic matter'
      } else {
        return 'Polar soil (Gelisol) - Permafrost, low decomposition'
      }
    } catch {
      return 'Unknown - requires soil survey'
    }
  }

  // Save farm without triggering data collection
  const handleSaveFarm = async () => {
    if (!selectedLocation) {
      toast({ title: 'No Location', description: 'Please select a location on the map first', variant: 'warning' })
      return
    }

    // Validate required fields
    if (!farmFormData.name?.trim()) {
      toast({ title: 'Missing Name', description: 'Please enter a farm name', variant: 'warning' })
      return
    }

    setIsSavingFarm(true)
    try {
      // Create a small square polygon (~100m x 100m) around the clicked point
      const offset = 0.001 // ~100m at this latitude
      const farmData: CreateFarmData = {
        name: farmFormData.name,
        crop: farmFormData.crop || 'Maize',
        area: farmFormData.area || '1 ha',
        location: selectedLocation.address || selectedLocation.displayName || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
        soilType: farmFormData.soilType || soilType,
        description: farmFormData.description,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [selectedLocation.lng - offset, selectedLocation.lat + offset],
            [selectedLocation.lng + offset, selectedLocation.lat + offset],
            [selectedLocation.lng + offset, selectedLocation.lat - offset],
            [selectedLocation.lng - offset, selectedLocation.lat - offset],
            [selectedLocation.lng - offset, selectedLocation.lat + offset],
          ]] as [number, number][][],
        },
        centroid: { lat: selectedLocation.lat, lon: selectedLocation.lng },
      }

      // Create farm using the store (which syncs with backend)
      const newFarm = await createFarmWithStore.mutateAsync(farmData)

      if (!newFarm) {
        throw new Error('Failed to create farm')
      }

      setSelectedFarmId(newFarm.id)

      toast({
        title: 'Farm Saved Successfully',
        description: `Farm "${newFarm.name}" created and added to your farms list.`,
        variant: 'success',
      })

      // Close the form and clear selection
      setShowFarmForm(false)
      setSelectedLocation(null)

      // Reset form
      setFarmFormData({
        name: '',
        crop: 'Maize',
        area: '1 ha',
        soilType: '',
        description: '',
      })
      setSoilType('')

      // Auto-navigate to Farms page to show the new farm
      setTimeout(() => {
        navigate('/farms')
      }, 1500)

    } catch (error) {
      toast({
        title: 'Failed to Save Farm',
        description: error instanceof Error ? error.message : 'Failed to create farm',
        variant: 'danger',
      })
    } finally {
      setIsSavingFarm(false)
    }
  }

  // Search for location (forward geocoding)
  const searchLocation = async (query: string) => {
    setIsGeocoding(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'FieldShift/1.0' } }
      )
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      if (data.length > 0) {
        const result = data[0]
        const location: Coordinates = { lng: parseFloat(result.lon), lat: parseFloat(result.lat) }
        const geoLocation: GeoLocation = {
          lat: location.lat,
          lng: location.lng,
          address: result.display_name,
          displayName: result.display_name,
        }
        setSelectedLocation(geoLocation)
        setMapView({ center: location, zoom: 13 })
        mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 })
        updateMarker(location, result.display_name)
        toast({ title: 'Location Found', description: result.display_name, variant: 'success' })
      } else {
        toast({ title: 'Not Found', description: 'No location found for your query', variant: 'warning' })
      }
    } catch (error) {
      toast({ title: 'Search Failed', description: 'Could not search for location', variant: 'danger' })
    } finally {
      setIsGeocoding(false)
    }
  }

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Non supporté', description: 'La géolocalisation n\'est pas supportée par votre navigateur', variant: 'danger' })
      return
    }

    if (!mapRef.current) {
      toast({ title: 'Carte non prête', description: 'Veuillez attendre que la carte soit chargée', variant: 'warning' })
      return
    }

    setIsGeocoding(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Coordinates = { lng: position.coords.longitude, lat: position.coords.latitude }
        setMapView({ center: location, zoom: 13 })
        mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 })
        reverseGeocode(location.lat, location.lng).then(structuredAddress => {
          const displayName = structuredAddress?.displayName || 'Position actuelle'
          const geoLocation: GeoLocation = {
            lat: location.lat,
            lng: location.lng,
            address: structuredAddress?.displayName,
            displayName,
            country: structuredAddress?.country,
            state: structuredAddress?.state,
            region: structuredAddress?.region,
            county: structuredAddress?.county,
          }
          setSelectedLocation(geoLocation)
          updateMarker(location, displayName)
          toast({ title: 'Position trouvée', description: displayName, variant: 'success' })
        }).catch(() => {
          // Even if reverse geocode fails, still set the location
          const displayName = 'Position actuelle'
          const geoLocation: GeoLocation = {
            lat: location.lat,
            lng: location.lng,
            displayName,
          }
          setSelectedLocation(geoLocation)
          updateMarker(location, displayName)
          toast({ title: 'Position trouvée', description: 'Coordonnées obtenues (adresse non disponible)', variant: 'success' })
        })
        setIsGeocoding(false)
      },
      (error) => {
        let message = error.message
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Permission refusée. Autorisez la géolocalisation dans les paramètres du navigateur.'
        } else if (error.code === error.TIMEOUT) {
          message = 'Délai d\'attente dépassé. Réessayez.'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Position non disponible.'
        }
        toast({ title: 'Erreur de géolocalisation', description: message, variant: 'danger' })
        setIsGeocoding(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Trigger data collection for selected location - creates farm then starts collection
  const handleCollectData = async () => {
    if (!selectedLocation) {
      toast({ title: 'No Location', description: 'Please select a location on the map first', variant: 'warning' })
      return
    }

    try {
      // Create a small square polygon (~100m x 100m) around the clicked point
      const offset = 0.001 // ~100m at this latitude
      const farmData = {
        name: `Field at ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
        crop: 'Maize', // default crop
        area: '1 ha',
        location: selectedLocation.address || selectedLocation.displayName || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [selectedLocation.lng - offset, selectedLocation.lat + offset],
            [selectedLocation.lng + offset, selectedLocation.lat + offset],
            [selectedLocation.lng + offset, selectedLocation.lat - offset],
            [selectedLocation.lng - offset, selectedLocation.lat - offset],
            [selectedLocation.lng - offset, selectedLocation.lat + offset],
          ]] as [number, number][][],
        },
        centroid: { lat: selectedLocation.lat, lon: selectedLocation.lng },
      }

      // Create farm using the store (which syncs with backend)
      const newFarm = await createFarmWithStore.mutateAsync(farmData)

      if (!newFarm) {
        throw new Error('Failed to create farm')
      }

      setSelectedFarmId(newFarm.id)

      // Now trigger data collection with the real farm ID
      const result = await triggerCollection.mutateAsync({
        farm_id: newFarm.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        crops_of_interest: ['maize', 'wheat', 'soybean'],
      })

      const collectionId = result.collection_id

      toast({
        title: 'Farm Created & Collection Started',
        description: `Farm "${newFarm.name}" created. Collection ${collectionId.slice(0, 8)}... triggered.`,
        variant: 'success',
      })

      // Auto-navigate to Farms page to show the new farm
      setTimeout(() => {
        navigate('/farms')
      }, 1500)

      // Optionally clear selection after starting collection
      setSelectedLocation(null)
    } catch (error) {
      toast({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to create farm or start collection',
        variant: 'danger',
      })
    }
  }

  const toggleLayer = (layerId: string) => {
    setVisibleLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const getGroupLayers = (group: string) => layerOptions.filter(l => l.group === group)

  const getVisibleCount = () => Object.values(visibleLayers).filter(v => v).length

  return (
    <AnimatedPage className="min-h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* Left Panel - Controls */}
      <aside className="w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <AnimatedPanel delay={50} className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-100 animate-scale-in">
              <Layers className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-900 animate-fade-in">Couches</h2>
          </div>
          <Badge variant="info" className="text-xs animate-scale-in">{getVisibleCount()} actives</Badge>
        </AnimatedPanel>

        {/* Search & Location Tools */}
        <AnimatedPanel delay={100} className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Chercher un lieu..."
              onKeyDown={(e) => e.key === 'Enter' && searchLocation(e.currentTarget.value)}
              className="pl-10 hover-lift"
              disabled={isGeocoding}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 hover-lift"
              onClick={useCurrentLocation}
              disabled={isGeocoding}
            >
              <Target className="w-4 h-4 mr-1" />
              {isGeocoding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : 'Ma position'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover-lift"
              onClick={() => mapRef.current?.flyTo({ center: [-122.44, 37.77], zoom: 11 })}
            >
              <Compass className="w-4 h-4" />
            </Button>
          </div>
        </AnimatedPanel>

        {/* Base Map Selector */}
        <AnimatedPanel delay={150} className="p-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2 animate-fade-in">Fond de carte</label>
          <div className="grid grid-cols-3 gap-2">
            {baseMaps.map((bm, i) => (
              <button
                key={bm.id}
                onClick={() => setBaseMap(bm.id)}
                className={cn(
                  'p-3 rounded-lg text-sm font-medium transition-all border-2 hover-lift animate-scale-in',
                  baseMap === bm.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <bm.icon className="w-5 h-5 mx-auto mb-1" />
                {bm.label}
              </button>
            ))}
          </div>
        </AnimatedPanel>

        {/* Tabs */}
        <AnimatedPanel delay={200} className="flex-1 overflow-hidden">
          <Tabs defaultValue="layers" onChange={setActiveTab} className="w-full h-full" animated transition="fade">
            <TabsList className="border-b border-gray-100 px-3">
              <TabsTrigger value="layers" className="px-2 hover-lift">Couches</TabsTrigger>
              <TabsTrigger value="location" className="px-2 hover-lift">Lieu</TabsTrigger>
              <TabsTrigger value="legend" className="px-2 hover-lift">Légende</TabsTrigger>
            </TabsList>

            <TabsContent value="layers" transition="fade">
              <div className="p-3 overflow-y-auto flex-1 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <Select
                    value={activeLayerGroup}
                    onChange={(e) => setActiveLayerGroup(e.target.value)}
                    options={['Soil Moisture', 'Vegetation', 'Temperature', 'Water', 'Land Cover', 'Elevation'].map(g => ({ value: g, label: g }))}
                    className="w-full max-w-xs hover-lift"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value))}
                      className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <span className="w-10 text-right">{opacity}%</span>
                  </div>
                </div>

                <StaggeredContainer staggerDelay={40} transition="stagger-slide-up" className="space-y-2">
                  {getGroupLayers(activeLayerGroup).map((layer, i) => (
                    <LayerToggle key={layer.id} layer={layer} onToggle={toggleLayer} delay={i * 30} />
                  ))}
                </StaggeredContainer>
              </div>
            </TabsContent>

            <TabsContent value="location" transition="fade">
              <div className="p-3 overflow-y-auto flex-1 animate-fade-in">
                {selectedLocation ? (
                  <StaggeredContainer staggerDelay={60} transition="stagger-slide-up" className="space-y-4">
                    <Card variant="elevated" className="hover-lift border-l-4 border-l-primary-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary-600" />
                          Selected Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 animate-stagger-slide-up">
                          <div className="p-3 rounded-lg bg-gray-50 animate-fade-in">
                            <p className="text-sm text-gray-500">Coordinates</p>
                            <p className="font-mono text-sm">{selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
                          </div>
                          {selectedLocation.address && (
                            <div className="p-3 rounded-lg bg-gray-50 animate-fade-in">
                              <p className="text-sm text-gray-500">Address</p>
                              <p className="text-sm text-gray-900">{selectedLocation.address}</p>
                            </div>
                          )}
                          {/* Auto-determined location details */}
                          {(selectedLocation.country || selectedLocation.state || selectedLocation.region) && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in">
                              <p className="text-sm text-blue-700 font-medium flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                Auto-detected Location Details
                              </p>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm animate-stagger-slide-up">
                                {selectedLocation.country && (
                                  <div className="animate-scale-in">
                                    <p className="text-blue-500">Country</p>
                                    <p className="font-medium text-blue-900">{selectedLocation.country}</p>
                                  </div>
                                )}
                                {selectedLocation.state && (
                                  <div className="animate-scale-in">
                                    <p className="text-blue-500">State/Province</p>
                                    <p className="font-medium text-blue-900">{selectedLocation.state}</p>
                                  </div>
                                )}
                                {selectedLocation.region && (
                                  <div className="animate-scale-in">
                                    <p className="text-blue-500">Region/District</p>
                                    <p className="font-medium text-blue-900">{selectedLocation.region}</p>
                                  </div>
                                )}
                                {selectedLocation.county && (
                                  <div className="animate-scale-in">
                                    <p className="text-blue-500">County</p>
                                    <p className="font-medium text-blue-900">{selectedLocation.county}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-sm animate-stagger-slide-up">
                            <div className="p-2 rounded bg-gray-100 animate-scale-in">
                              <p className="text-gray-500">Lat</p>
                              <p className="font-medium">{selectedLocation.lat.toFixed(6)}°</p>
                            </div>
                            <div className="p-2 rounded bg-gray-100 animate-scale-in">
                              <p className="text-gray-500">Lng</p>
                              <p className="font-medium">{selectedLocation.lng.toFixed(6)}°</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Farm Creation Form - Auto-filled with detected location data */}
                    {showFarmForm && (
                      <Card variant="elevated" className="border-primary-200 bg-primary-50 hover-lift">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-primary-700">
                            <FileCheck className="w-5 h-5" />
                            Create New Farm
                          </CardTitle>
                          <p className="text-sm text-primary-600">Auto-filled from selected location. Review and save.</p>
                        </CardHeader>
                        <CardContent className="space-y-4 animate-stagger-slide-up">
                          <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                            <Input
                              value={farmFormData.name || ''}
                              onChange={(e) => setFarmFormData({...farmFormData, name: e.target.value})}
                              placeholder="e.g., North Field, Section 14"
                              className="hover-lift"
                            />
                          </div>

                          <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Crop</label>
                            <Select
                              value={farmFormData.crop || 'Maize'}
                              onChange={(e) => setFarmFormData({...farmFormData, crop: e.target.value})}
                              options={[
                                { value: 'Maize', label: 'Maize (Corn)' },
                                { value: 'Wheat', label: 'Wheat' },
                                { value: 'Soybean', label: 'Soybean' },
                                { value: 'Rice', label: 'Rice' },
                                { value: 'Barley', label: 'Barley' },
                                { value: 'Cotton', label: 'Cotton' },
                                { value: 'Other', label: 'Other' },
                              ]}
                              className="hover-lift"
                            />
                          </div>

                          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                            <Input
                              value={farmFormData.area || '1 ha'}
                              onChange={(e) => setFarmFormData({...farmFormData, area: e.target.value})}
                              placeholder="e.g., 10 ha, 25 acres"
                              className="hover-lift"
                            />
                          </div>

                          <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                              Soil Type <span className="text-xs text-green-600">(auto-detected)</span>
                            </label>
                            <div className="relative">
                              {isDeterminingSoil && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                                </div>
                              )}
                              <Input
                                value={farmFormData.soilType || soilType}
                                onChange={(e) => setFarmFormData({...farmFormData, soilType: e.target.value})}
                                disabled={isDeterminingSoil}
                                placeholder="Determining soil type..."
                                className="hover-lift"
                              />
                              {soilType && !isDeterminingSoil && (
                                <MapPinIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-bounce-gentle" />
                              )}
                            </div>
                            {soilType && !isDeterminingSoil && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1 animate-fade-in">
                                <CheckCircle className="w-3 h-3" />
                                Based on climate zone for this latitude
                              </p>
                            )}
                          </div>

                          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <Input
                              value={farmFormData.description || ''}
                              onChange={(e) => setFarmFormData({...farmFormData, description: e.target.value})}
                              placeholder="Optional notes about this field"
                              className="min-h-[80px] hover-lift"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2 border-t border-gray-200 animate-fade-in" style={{ animationDelay: '250ms' }}>
                            <Button
                              variant="secondary"
                              className="flex-1 hover-lift"
                              onClick={() => { setShowFarmForm(false); setSelectedLocation(null); }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              variant="secondary"
                              className="flex-1 hover-lift"
                              onClick={handleCollectData}
                              disabled={triggerCollection.isPending}
                            >
                              <RefreshCw className={cn('w-4 h-4 mr-2', triggerCollection.isPending && 'animate-spin')} />
                              {triggerCollection.isPending ? 'Collecting...' : 'Collect NASA Data'}
                            </Button>
                            <Button
                              className="flex-1 hover-lift"
                              onClick={handleSaveFarm}
                              disabled={isSavingFarm}
                            >
                              <Save className={cn('w-4 h-4 mr-2', isSavingFarm && 'animate-spin')} />
                              {isSavingFarm ? 'Saving...' : 'Save Farm'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!showFarmForm && (
                      <>
                        {/* Quick Actions for selected location */}
                        <Card variant="elevated" className="hover-lift">
                          <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 animate-stagger-slide-up">
                            <Button
                              className="w-full justify-start hover-lift"
                              onClick={() => setShowFarmForm(true)}
                            >
                              <FileCheck className="w-4 h-4 mr-2" />
                              Create Farm Here
                            </Button>
                            <Button
                              className="w-full justify-start hover-lift"
                              onClick={handleCollectData}
                              disabled={triggerCollection.isPending}
                            >
                              <RefreshCw className={cn('w-4 h-4 mr-2', triggerCollection.isPending && 'animate-spin')} />
                              {triggerCollection.isPending ? 'Collecting...' : 'Collect NASA Data'}
                            </Button>
                            <Button variant="secondary" className="w-full justify-start hover-lift" onClick={() => setSelectedLocation(null)}>
                              <X className="w-4 h-4 mr-2" />
                              Clear Selection
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Date Range for collection */}
                        <Card variant="elevated" className="hover-lift">
                          <CardHeader>
                            <CardTitle className="text-base">Collection Period</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-2 animate-stagger-slide-up">
                              <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                label="Start"
                                className="hover-lift"
                              />
                              <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                label="End"
                                className="hover-lift"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}

                  </StaggeredContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500 animate-fade-in">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-float" />
                    <p className="font-medium text-gray-900 mb-1">No location selected</p>
                    <p className="text-sm">Click on the map or search for a location</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="legend" transition="fade">
              <div className="p-3 overflow-y-auto flex-1 animate-fade-in">
                {getGroupLayers(activeLayerGroup).filter(l => visibleLayers[l.id]).map((layer, i) => (
                  <RevealOnScroll key={layer.id} transition="slide-up" delay={i * 40}>
                    <div className="mb-4 animate-fade-in">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        {layer.label}
                        <Badge variant="gray" size="sm">{layer.source}</Badge>
                      </h4>
                      <div className="flex items-center gap-2 h-6">
                        <div className="flex-1 h-full rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 animate-slide-right" />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Resolution: {layer.resolution} | Temporal: {layer.temporal}</p>
                    </div>
                  </RevealOnScroll>
                ))}
                {getGroupLayers(activeLayerGroup).filter(l => visibleLayers[l.id]).length === 0 && (
                  <p className="text-gray-500 text-center py-8 animate-fade-in">No visible layers in this group</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </AnimatedPanel>

        {/* Error display */}
        {mapError && (
          <AnimatedPanel delay={0} className="p-4 border-t border-red-200 bg-red-50 text-red-700 text-sm flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4" />
            <span>Map Error: {mapError}</span>
          </AnimatedPanel>
        )}
      </aside>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 min-h-0" ref={mapContainerRef}>
        {!mapLoaded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          </div>
        )}
        {/* Map Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 animate-fade-in">
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0 hover-lift" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            <Plus className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0 hover-lift" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            <Minus className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0 hover-lift" aria-label="My location" onClick={useCurrentLocation}>
            <Target className="w-5 h-5" />
          </Button>
        </div>

        {/* Scale Bar */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm z-10 animate-fade-in">
          Scale: ~1:50,000
        </div>

        {/* Coordinates */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm z-10 animate-fade-in">
          Lon: {mapView.center.lng.toFixed(4)}°, Lat: {mapView.center.lat.toFixed(4)}°
        </div>

        {/* Selected location indicator */}
        {selectedLocation && (
          <RevealOnScroll transition="slide-up" delay={100}>
            <div className="absolute bottom-20 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg z-10 border border-primary-200 animate-fade-in hover-lift">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary-600" />
                <span className="font-medium">Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</span>
              </div>
            </div>
          </RevealOnScroll>
        )}
      </div>

      {/* Right Panel - Data Collection & Analysis (Fixed Overlay) */}
      {selectedLocation && (
        <aside className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-white border-l border-gray-200 flex flex-col overflow-hidden z-40 animate-slide-left lg:static lg:animate-none lg:max-w-none lg:border-l lg:z-auto">
          {/* Header - no AnimatedPanel/RevealOnScroll since panel animates via CSS */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="font-semibold text-gray-900">Data Collection</h2>
            <Button variant="ghost" size="sm" className="hover-lift" onClick={() => setSelectedLocation(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <StaggeredContainer staggerDelay={80} transition="stagger-slide-up" className="space-y-6">
              {/* Location Info */}
              <Card variant="elevated" className="hover-lift border-l-4 border-l-primary-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Selected Field</span>
                    <Badge variant="info" size="sm" className="animate-scale-in">Ready for Analysis</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 animate-stagger-slide-up">
                    <div className="animate-fade-in">
                      <p className="text-sm text-gray-500">Coordinates</p>
                      <p className="font-medium text-sm font-mono">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</p>
                    </div>
                    <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium text-sm truncate">{selectedLocation.address || 'Unknown'}</p>
                    </div>
                  </div>
                  {/* Auto-determined location details */}
                  {(selectedLocation.country || selectedLocation.state || selectedLocation.region) && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in" style={{ animationDelay: '100ms' }}>
                      <p className="text-sm text-blue-700 font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Auto-detected Location Details
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm animate-stagger-slide-up">
                        {selectedLocation.country && (
                          <div className="animate-scale-in">
                            <p className="text-blue-500">Country</p>
                            <p className="font-medium text-blue-900">{selectedLocation.country}</p>
                          </div>
                        )}
                        {selectedLocation.state && (
                          <div className="animate-scale-in">
                            <p className="text-blue-500">State/Province</p>
                            <p className="font-medium text-blue-900">{selectedLocation.state}</p>
                          </div>
                        )}
                        {selectedLocation.region && (
                          <div className="animate-scale-in">
                            <p className="text-blue-500">Region/District</p>
                            <p className="font-medium text-blue-900">{selectedLocation.region}</p>
                          </div>
                        )}
                        {selectedLocation.county && (
                          <div className="animate-scale-in">
                            <p className="text-blue-500">County</p>
                            <p className="font-medium text-blue-900">{selectedLocation.county}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Soil type indicator */}
                  {soilType && (
                    <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 animate-fade-in" style={{ animationDelay: '150ms' }}>
                      <p className="text-sm text-green-700 font-medium flex items-center gap-1">
                        <Leaf className="w-3 h-3" />
                        Soil Type (Auto-detected)
                      </p>
                      <p className="text-sm text-green-900 mt-1">{soilType}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 animate-stagger-slide-up">
                  <Button size="sm" className="flex-1 hover-lift" onClick={handleCollectData} disabled={triggerCollection.isPending}>
                    <RefreshCw className={cn('w-4 h-4 mr-1', triggerCollection.isPending && 'animate-spin')} />
                    {triggerCollection.isPending ? 'Collecting...' : 'Collect NASA Data'}
                  </Button>
                  <Button size="sm" className="flex-1 hover-lift" onClick={() => setShowFarmForm(true)} disabled={isSavingFarm}>
                    <Save className="w-4 h-4 mr-1" />
                    Save Farm
                  </Button>
                </CardFooter>
              </Card>

              {/* Available Data Sources */}
              <Card variant="elevated" className="hover-lift">
                <CardHeader>
                  <CardTitle>Available NASA Data Layers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: 'SMAP Soil Moisture', status: 'Available', freq: 'Daily', res: '9 km', sources: ['SMAP'] },
                      { name: 'MODIS NDVI/EVI', status: 'Available', freq: '16-day', res: '250 m', sources: ['MODIS'] },
                      { name: 'Landsat 8/9 SR', status: 'Available', freq: '16-day', res: '30 m', sources: ['Landsat'] },
                      { name: 'GPM Precipitation', status: 'Available', freq: '30-min', res: '0.1°', sources: ['GPM'] },
                      { name: 'ECOSTRESS ET/LST', status: 'Available', freq: '~4-day', res: '70 m', sources: ['ECOSTRESS'] },
                      { name: 'OpenET ET', status: 'Requires API Key', freq: 'Monthly', res: '30 m', sources: ['OpenET'] },
                      { name: 'Crop-CASMA', status: 'Available (CONUS)', freq: 'Daily', res: '1 km', sources: ['NASA-USDA'] },
                      { name: 'ICESat-2 ATL24', status: 'Available (Coastal)', freq: 'Continuous', res: '~10 m', sources: ['ICESat-2'] },
                    ].map((d, i) => (
                      <DataSourceCard key={i} source={d} delay={i * 30} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ML Analysis Quick Actions */}
              <Card variant="elevated" className="hover-lift">
                <CardHeader>
                  <CardTitle>AI Analysis Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 animate-stagger-slide-up">
                    <QuickActionButton icon={Leaf} label="Soil Health" onClick={() => window.open('/soil-health', '_blank')} delay={0} />
                    <QuickActionButton icon={GitBranch} label="Crop Rotation" onClick={() => window.open('/rotation-planner', '_blank')} delay={1} />
                    <QuickActionButton icon={BarChart3} label="Yield Predictor" onClick={() => window.open('/yield-predictor', '_blank')} delay={2} />
                    <QuickActionButton icon={Droplet} label="Water Stress" onClick={() => window.open('/water-stress', '_blank')} delay={3} />
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-2 animate-fade-in">Opens in new tab with selected coordinates</p>
                </CardContent>
              </Card>

              {/* Collection Status */}
              {triggerCollection.error && (
                <RevealOnScroll transition="shake" delay={0}>
                  <Card variant="outlined" className="border-red-200 bg-red-50 animate-shake">
                    <CardContent className="p-4 text-red-700 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">Collection failed: {triggerCollection.error.message}</span>
                      </div>
                    </CardContent>
                  </Card>
                </RevealOnScroll>
              )}
            </StaggeredContainer>
          </div>
        </aside>
      )}
    </AnimatedPage>
  )
}
