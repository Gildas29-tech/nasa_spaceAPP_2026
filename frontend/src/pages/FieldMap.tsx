import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import maplibregl, { Map, MapMouseEvent, LngLatLike, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cn } from '../lib/utils'
import {
  Layers,
  MapPin,
  Search,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Leaf,
  Globe,
  FileCheck,
  Map as MapIcon,
  Moon,
  Sun,
  Navigation,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Input, Textarea } from '../components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { useCreateFarmWithStore, useTriggerCollection } from '../hooks/useDataCollection'
import { useToast } from '../hooks/useToast'

// ---------------------------------------------------------------------------
// Base map styles — free CartoCDN styles (no API key required)
// ---------------------------------------------------------------------------
const BASE_MAP_STYLES: Record<string, string> = {
  'osm-bright': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  'osm-liberty': 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'osm-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

const baseMaps = [
  { id: 'osm-bright', label: 'Clair', icon: Sun },
  { id: 'osm-liberty', label: 'Routier', icon: MapIcon },
  { id: 'osm-dark', label: 'Sombre', icon: Moon },
]

// ---------------------------------------------------------------------------
// NASA data layer catalogue (metadata only — used for the layer picker/legend)
// ---------------------------------------------------------------------------
interface LayerOption {
  id: string
  group: string
  label: string
  source: string
  resolution: string
  temporal: string
  visible: boolean
}

const layerOptions: LayerOption[] = [
  // Soil Moisture
  { id: 'smap_surface', group: 'Humidité du sol', label: 'SMAP Surface', source: 'SMAP', resolution: '9 km', temporal: 'Journalier', visible: false },
  { id: 'smap_rootzone', group: 'Humidité du sol', label: 'SMAP Zone racinaire', source: 'SMAP', resolution: '9 km', temporal: 'Journalier', visible: false },
  { id: 'crop_casma', group: 'Humidité du sol', label: 'Crop-CASMA (CONUS)', source: 'NASA-USDA', resolution: '1 km', temporal: 'Journalier', visible: false },
  { id: 'nasa_usda', group: 'Humidité du sol', label: 'NASA-USDA Global', source: 'NASA-USDA', resolution: '10 km', temporal: 'Journalier', visible: false },
  // Vegetation
  { id: 'modis_ndvi', group: 'Végétation', label: 'MODIS NDVI', source: 'MODIS', resolution: '250 m', temporal: '16 jours', visible: true },
  { id: 'modis_evi', group: 'Végétation', label: 'MODIS EVI', source: 'MODIS', resolution: '250 m', temporal: '16 jours', visible: false },
  { id: 'landsat_ndvi', group: 'Végétation', label: 'Landsat NDVI', source: 'Landsat 8/9', resolution: '30 m', temporal: '16 jours', visible: false },
  { id: 'landsat_savi', group: 'Végétation', label: 'Landsat SAVI', source: 'Landsat 8/9', resolution: '30 m', temporal: '16 jours', visible: false },
  // Temperature
  { id: 'modis_lst', group: 'Température', label: 'MODIS LST', source: 'MODIS', resolution: '1 km', temporal: '8 jours', visible: false },
  { id: 'ecostress_lst', group: 'Température', label: 'ECOSTRESS LST', source: 'ECOSTRESS', resolution: '70 m', temporal: '~4 jours', visible: false },
  // Water
  { id: 'gpm_precip', group: 'Eau', label: 'GPM Précipitations', source: 'GPM/IMERG', resolution: '0.1°', temporal: '30 min', visible: false },
  { id: 'openet_et', group: 'Eau', label: 'OpenET ET', source: 'OpenET', resolution: '30 m', temporal: 'Mensuel', visible: false },
  { id: 'ecostress_et', group: 'Eau', label: 'ECOSTRESS ET', source: 'ECOSTRESS', resolution: '70 m', temporal: '~4 jours', visible: false },
  { id: 'ecostress_esi', group: 'Eau', label: 'ECOSTRESS ESI', source: 'ECOSTRESS', resolution: '70 m', temporal: '~4 jours', visible: false },
  // Land Cover
  { id: 'modis_landcover', group: 'Occupation du sol', label: 'MODIS Land Cover', source: 'MODIS', resolution: '500 m', temporal: 'Annuel', visible: false },
  // Elevation
  { id: 'icesat2', group: 'Élévation', label: 'ICESat-2 ATL24', source: 'ICESat-2', resolution: '~10 m', temporal: 'Continu', visible: false },
]

const layerGroups = ['Humidité du sol', 'Végétation', 'Température', 'Eau', 'Occupation du sol', 'Élévation']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Module-level helpers (pure — no component state)
// ---------------------------------------------------------------------------
async function reverseGeocode(lat: number, lng: number): Promise<StructuredAddress | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: 'application/json', 'User-Agent': 'FieldShift/1.0' } },
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

async function determineSoilType(lat: number): Promise<string> {
  const absLat = Math.abs(lat)
  if (absLat < 23.5) return 'Sol tropical (Oxisol/Ultisol) — forte altération, faible fertilité'
  if (absLat < 35) return 'Sol subtropical (Alfisol) — altération modérée, bonne fertilité'
  if (absLat < 50) return 'Sol tempéré (Mollisol/Alfisol) — riche en matière organique'
  if (absLat < 66.5) return 'Sol boréal (Spodosol/Histosol) — acide, riche en matière organique'
  return 'Sol polaire (Gelisol) — pergélisol, décomposition lente'
}

function coordsLabel(lat: number, lng: number) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthsAgoISO(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return toLocalDateString(d)
}

// Reference "today" (local) used to constrain the collection period.
const TODAY = toLocalDateString(new Date())

// Extract a human-readable message from an Axios/API error.
function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { detail?: unknown } } }).response
    const detail = resp?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0] === 'object') {
      const first = detail[0] as { msg?: string }
      if (first.msg) return first.msg
    }
  }
  return err instanceof Error ? err.message : fallback
}

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------
function LayerToggle({
  layer,
  onToggle,
  delay = 0,
}: {
  layer: LayerOption
  onToggle: (id: string) => void
  delay?: number
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5 transition-colors hover:bg-gray-100 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={layer.visible}
          onChange={() => onToggle(layer.id)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{layer.label}</p>
          <p className="truncate text-xs text-gray-500">
            {layer.source} • {layer.resolution} • {layer.temporal}
          </p>
        </div>
      </label>
      <Badge variant={layer.visible ? 'success' : 'gray'} size="sm" className="shrink-0">
        {layer.visible ? 'Visible' : 'Masqué'}
      </Badge>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function FieldMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const popupRef = useRef<Popup | null>(null)

  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null)
  const [baseMap, setBaseMap] = useState('osm-bright')
  const [activeLayerGroup, setActiveLayerGroup] = useState('Végétation')
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(layerOptions.map((l) => [l.id, l.visible])),
  )
  const [mapView, setMapView] = useState({ center: { lng: -122.44, lat: 37.77 }, zoom: 4 })
  const [activeTab, setActiveTab] = useState('layers')
  const [dateRange, setDateRange] = useState({ start: monthsAgoISO(6), end: TODAY })
  const [formError, setFormError] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // Farm form state
  const [farmFormData, setFarmFormData] = useState<{
    name: string
    crop: string
    area: string
    soilType: string
    description: string
  }>({
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

  // Update marker on the map
  const updateMarker = useCallback((location: Coordinates, label: string) => {
    if (!mapRef.current) return

    if (markerRef.current) markerRef.current.remove()
    if (popupRef.current) popupRef.current.remove()

    const el = document.createElement('div')
    el.className =
      'h-6 w-6 rounded-full border-2 border-white bg-primary-600 shadow-lg flex items-center justify-center animate-scale-in'
    el.innerHTML = '<div class="h-2 w-2 rounded-full bg-white"></div>'

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([location.lng, location.lat])
      .addTo(mapRef.current)

    popupRef.current = new maplibregl.Popup({ offset: 25, closeButton: false })
      .setLngLat([location.lng, location.lat])
      .setHTML(
        `<div class="p-2 min-w-[200px]">
           <p class="font-medium text-gray-900">${label}</p>
           <p class="text-sm font-mono text-gray-500">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
         </div>`,
      )
      .addTo(mapRef.current)
  }, [])

  // Initialize the map once the container is mounted.
  // NOTE: the container is ALWAYS rendered (see the return below); this effect
  // only waits for the ref, so the map actually initialises.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let map: Map
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: BASE_MAP_STYLES[baseMap] || BASE_MAP_STYLES['osm-bright'],
        center: [mapView.center.lng, mapView.center.lat] as LngLatLike,
        zoom: mapView.zoom,
        attributionControl: { compact: true },
      })

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    } catch (error) {
      console.error('Failed to initialize map:', error)
      setMapError(error instanceof Error ? error.message : 'Impossible d’initialiser la carte')
      return
    }

    mapRef.current = map

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
    }, 15000)

    return () => {
      window.clearTimeout(timeout)
      map.off('click', handleMapClick)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update the map style when the base map changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(BASE_MAP_STYLES[baseMap] || BASE_MAP_STYLES['osm-bright'])
    }
  }, [baseMap, mapLoaded])

  // Handle a click on the map — reverse geocode + auto-fill the form
  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      const location: Coordinates = { lng: e.lngLat.lng, lat: e.lngLat.lat }
      setMapView({ center: location, zoom: mapRef.current?.getZoom() || 13 })

      setIsGeocoding(true)
      setIsDeterminingSoil(true)
      try {
        const structured = await reverseGeocode(location.lat, location.lng)
        const displayName = structured?.displayName || coordsLabel(location.lat, location.lng)

        const geoLocation: GeoLocation = structured
          ? {
              lat: location.lat,
              lng: location.lng,
              address: structured.displayName,
              displayName,
              country: structured.country,
              region: structured.region || structured.state,
              state: structured.state,
              county: structured.county,
            }
          : { lat: location.lat, lng: location.lng, displayName }

        const soil = await determineSoilType(location.lat)

        setSelectedLocation(geoLocation)
        setSoilType(soil)
        setFarmFormData((prev) => ({
          ...prev,
          name: `Champ ${coordsLabel(location.lat, location.lng)}`,
          soilType: soil,
          description: `${soil} | ${structured?.country || 'Pays inconnu'}, ${structured?.state || structured?.region || 'Région inconnue'}`,
        }))
        updateMarker(location, displayName)

        toast({ title: 'Lieu sélectionné', description: displayName, variant: 'success' })
      } catch (error) {
        console.error('Geocoding failed:', error)
        const fallback = coordsLabel(location.lat, location.lng)
        setSelectedLocation({ lat: location.lat, lng: location.lng, displayName: fallback })
        updateMarker(location, fallback)
        toast({ title: 'Lieu sélectionné', description: fallback, variant: 'success' })
      } finally {
        setIsGeocoding(false)
        setIsDeterminingSoil(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, updateMarker],
  )

  // Search for a place (forward geocoding)
  const searchLocation = async (query: string) => {
    const q = query.trim()
    if (!q) return
    setIsGeocoding(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`,
        { headers: { Accept: 'application/json', 'User-Agent': 'FieldShift/1.0' } },
      )
      if (!response.ok) throw new Error('Search failed')
      const data = await response.json()
      if (data.length > 0) {
        const result = data[0]
        const location: Coordinates = { lng: parseFloat(result.lon), lat: parseFloat(result.lat) }
        const soil = await determineSoilType(location.lat)

        setSelectedLocation({
          lat: location.lat,
          lng: location.lng,
          address: result.display_name,
          displayName: result.display_name,
        })
        setSoilType(soil)
        setFarmFormData({
          name: `Champ ${coordsLabel(location.lat, location.lng)}`,
          crop: farmFormData.crop || 'Maize',
          area: farmFormData.area || '1 ha',
          soilType: soil,
          description: `${soil} | ${result.display_name}`,
        })
        setMapView({ center: location, zoom: 13 })
        mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 })
        updateMarker(location, result.display_name)
        toast({ title: 'Lieu trouvé', description: result.display_name, variant: 'success' })
      } else {
        toast({ title: 'Introuvable', description: 'Aucun lieu ne correspond à votre recherche', variant: 'warning' })
      }
    } catch {
      toast({ title: 'Recherche impossible', description: 'La recherche de lieu a échoué', variant: 'danger' })
    } finally {
      setIsGeocoding(false)
    }
  }

  // Use the browser geolocation
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Non supporté',
        description: 'La géolocalisation n’est pas supportée par votre navigateur',
        variant: 'danger',
      })
      return
    }
    if (!mapRef.current) {
      toast({ title: 'Carte non prête', description: 'Veuillez attendre que la carte soit chargée', variant: 'warning' })
      return
    }

    setIsGeocoding(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: Coordinates = { lng: position.coords.longitude, lat: position.coords.latitude }
        setMapView({ center: location, zoom: 13 })
        mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 })

        try {
          const structured = await reverseGeocode(location.lat, location.lng)
          const displayName = structured?.displayName || 'Position actuelle'
          const soil = await determineSoilType(location.lat)

          setSelectedLocation({
            lat: location.lat,
            lng: location.lng,
            address: structured?.displayName,
            displayName,
            country: structured?.country,
            state: structured?.state,
            region: structured?.region,
            county: structured?.county,
          })
          setSoilType(soil)
          setFarmFormData({
            name: `Champ ${coordsLabel(location.lat, location.lng)}`,
            crop: farmFormData.crop || 'Maize',
            area: farmFormData.area || '1 ha',
            soilType: soil,
            description: `${soil} | ${structured?.country || 'Pays inconnu'}, ${structured?.state || structured?.region || 'Région inconnue'}`,
          })
          updateMarker(location, displayName)
          toast({
            title: 'Position trouvée',
            description: 'Les champs sont pré-remplis : sauvegardez ou lancez la collecte.',
            variant: 'success',
          })
        } catch (error) {
          console.error('Geocoding failed:', error)
          const soil = await determineSoilType(location.lat)
          setSelectedLocation({ lat: location.lat, lng: location.lng, displayName: 'Position actuelle' })
          setSoilType(soil)
          setFarmFormData({
            name: `Champ ${coordsLabel(location.lat, location.lng)}`,
            crop: farmFormData.crop || 'Maize',
            area: farmFormData.area || '1 ha',
            soilType: soil,
            description: soil,
          })
          updateMarker(location, 'Position actuelle')
          toast({
            title: 'Position trouvée',
            description: 'Coordonnées obtenues (adresse indisponible).',
            variant: 'success',
          })
        } finally {
          setIsGeocoding(false)
        }
      },
      (error) => {
        let message = error.message
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Permission refusée. Autorisez la géolocalisation dans les paramètres du navigateur.'
        } else if (error.code === error.TIMEOUT) {
          message = 'Délai d’attente dépassé. Réessayez.'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Position non disponible.'
        }
        toast({ title: 'Erreur de géolocalisation', description: message, variant: 'danger' })
        setIsGeocoding(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Build the farm payload from the selected location + form
  const buildFarmData = () => {
    const loc = selectedLocation!
    const offset = 0.001 // ~100 m square around the point
    return {
      name: farmFormData.name.trim() || `Champ ${coordsLabel(loc.lat, loc.lng)}`,
      crop: farmFormData.crop || 'Maize',
      area: farmFormData.area || '1 ha',
      soilType: farmFormData.soilType || soilType,
      description: farmFormData.description,
        geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [loc.lng - offset, loc.lat - offset],
          [loc.lng + offset, loc.lat - offset],
          [loc.lng + offset, loc.lat + offset],
          [loc.lng - offset, loc.lat + offset],
          [loc.lng - offset, loc.lat - offset],
        ]] as [number, number][][],
      },
      centroid: { lat: loc.lat, lon: loc.lng },
    }
  }

  // Save the farm without triggering data collection
  const handleSaveFarm = async () => {
    if (!selectedLocation) {
      toast({ title: 'Aucun lieu', description: 'Sélectionnez d’abord un lieu sur la carte', variant: 'warning' })
      return
    }
    if (!farmFormData.name.trim()) {
      toast({ title: 'Nom manquant', description: 'Veuillez saisir un nom de champ', variant: 'warning' })
      return
    }

    setIsSavingFarm(true)
    try {
      const farmData = buildFarmData()
      const newFarm = await createFarmWithStore.mutateAsync({
        name: farmData.name,
        geometry: farmData.geometry,
        centroid: farmData.centroid,
        description: farmData.description || `${farmData.crop} (${farmData.area}) — ${farmData.soilType}`,
        crops_of_interest: [farmData.crop],
      })

      if (!newFarm) throw new Error('Échec de la création du champ')

      toast({
        title: 'Champ sauvegardé',
        description: `« ${newFarm.name} » a été ajouté à votre liste de champs.`,
        variant: 'success',
      })

      setSelectedLocation(null)
      setFarmFormData({ name: '', crop: 'Maize', area: '1 ha', soilType: '', description: '' })
      setSoilType('')

      setTimeout(() => navigate('/farms'), 1200)
    } catch (error) {
      toast({
        title: 'Échec de la sauvegarde',
        description: apiErrorMessage(error, 'Impossible de créer le champ'),
        variant: 'danger',
      })
    } finally {
      setIsSavingFarm(false)
    }
  }

  // Create the farm and immediately start NASA data collection
  const handleCollectData = async () => {
    if (!selectedLocation) {
      toast({ title: 'Aucun lieu', description: 'Sélectionnez d’abord un lieu sur la carte', variant: 'warning' })
      return
    }

    // Validate the collection period before hitting the API.
    if (!dateRange.start || !dateRange.end) {
      setFormError('Renseignez les dates de début et de fin.')
      toast({ title: 'Période incomplète', description: 'Renseignez les dates de début et de fin.', variant: 'warning' })
      return
    }
    if (dateRange.end < dateRange.start) {
      setFormError('La date de fin doit être postérieure ou égale à la date de début.')
      toast({ title: 'Période invalide', description: 'La date de fin doit être postérieure ou égale à la date de début.', variant: 'warning' })
      return
    }
    if (dateRange.end > TODAY) {
      setFormError('La date de fin ne peut pas être dans le futur.')
      toast({ title: 'Période invalide', description: 'La date de fin ne peut pas être dans le futur.', variant: 'warning' })
      return
    }

    setFormError('')
    try {
      const farmData = buildFarmData()
      const newFarm = await createFarmWithStore.mutateAsync({
        name: farmData.name,
        geometry: farmData.geometry,
        centroid: farmData.centroid,
        description: farmData.description || `${farmData.crop} (${farmData.area}) — ${farmData.soilType}`,
        crops_of_interest: [farmData.crop],
      })

      if (!newFarm) throw new Error('Échec de la création du champ')

      const result = await triggerCollection.mutateAsync({
        farm_id: newFarm.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        crops_of_interest: [farmData.crop, 'wheat', 'soybean'],
      })

      toast({
        title: 'Champ créé et collecte lancée',
        description: `Collecte ${result.collection_id.slice(0, 8)}… démarrée pour « ${newFarm.name} ».`,
        variant: 'success',
      })

      setSelectedLocation(null)
      setFarmFormData({ name: '', crop: 'Maize', area: '1 ha', soilType: '', description: '' })
      setSoilType('')

      setTimeout(() => navigate('/farms'), 1200)
    } catch (error) {
      const message = apiErrorMessage(error, 'Impossible de créer le champ ou de lancer la collecte')
      setFormError(message)
      toast({
        title: 'Échec',
        description: message,
        variant: 'danger',
      })
    }
  }

  const toggleLayer = (layerId: string) => {
    setVisibleLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const groupLayers = (group: string) => layerOptions.filter((l) => l.group === group)
  const visibleCount = Object.values(visibleLayers).filter(Boolean).length

  return (
    <div className="flex min-h-[calc(100vh-8rem)] overflow-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* Left sidebar — layer controls                                   */}
      {/* ---------------------------------------------------------------- */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white lg:w-80">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary-100 p-2">
              <Layers className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Couches de données</h2>
          </div>
          <Badge variant="info" className="text-xs">{visibleCount} active{visibleCount > 1 ? 's' : ''}</Badge>
        </div>

        {/* Search + location */}
        <div className="space-y-3 border-b border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Chercher un lieu…"
              onKeyDown={(e) => e.key === 'Enter' && searchLocation(e.currentTarget.value)}
              className="pl-10"
              disabled={isGeocoding}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={useCurrentLocation} disabled={isGeocoding}>
              {isGeocoding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Target className="mr-1 h-4 w-4" />}
              Ma position
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Recentrer la carte"
              onClick={() => mapRef.current?.flyTo({ center: [-122.44, 37.77], zoom: 4 })}
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Base map selector */}
        <div className="border-b border-gray-100 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Fond de carte</label>
          <div className="grid grid-cols-3 gap-2">
            {baseMaps.map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => setBaseMap(bm.id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-xs font-medium transition-all',
                  baseMap === bm.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <bm.icon className="h-5 w-5" />
                {bm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs: layers / legend */}
        <div className="flex min-h-0 flex-1 flex-col">
          <Tabs value={activeTab} defaultValue="layers" onChange={setActiveTab} className="flex min-h-0 flex-1 flex-col" variant="underline" animated transition="fade">
            <TabsList className="shrink-0 px-3">
              <TabsTrigger value="layers" className="px-3">Couches</TabsTrigger>
              <TabsTrigger value="legend" className="px-3">Légende</TabsTrigger>
            </TabsList>

            <TabsContent value="layers" transition="fade" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
                <Select
                  value={activeLayerGroup}
                  onChange={(e) => setActiveLayerGroup(e.target.value)}
                  options={layerGroups.map((g) => ({ value: g, label: g }))}
                  className="mb-3"
                />
                <div className="space-y-2">
                  {groupLayers(activeLayerGroup).map((layer, i) => (
                    <LayerToggle key={layer.id} layer={layer} onToggle={toggleLayer} delay={i * 30} />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="legend" transition="fade" className="min-h-0 flex-1 overflow-y-auto p-3">
              {groupLayers(activeLayerGroup)
                .filter((l) => visibleLayers[l.id])
                .map((layer) => (
                  <div key={layer.id} className="mb-4">
                    <h4 className="mb-2 flex items-center gap-2 font-medium text-gray-900">
                      {layer.label}
                      <Badge variant="gray" size="sm">{layer.source}</Badge>
                    </h4>
                    <div className="h-2.5 w-full rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>Faible</span>
                      <span>Moyen</span>
                      <span>Élevé</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Résolution : {layer.resolution} • Temporel : {layer.temporal}
                    </p>
                  </div>
                ))}
              {groupLayers(activeLayerGroup).filter((l) => visibleLayers[l.id]).length === 0 && (
                <p className="py-8 text-center text-gray-500">Aucune couche visible dans ce groupe</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {mapError && (
          <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Erreur carte : {mapError}</span>
          </div>
        )}
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Map                                                              */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-gray-100">
        {/* The map container is always mounted so MapLibre can initialise. */}
        <div ref={mapContainerRef} className="absolute inset-0" />

        {!mapLoaded && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-gray-50">
            <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            <p className="text-sm text-gray-500">Chargement de la carte…</p>
          </div>
        )}

        {/* My-location floating button */}
        <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-11 w-11 rounded-full"
            aria-label="Ma position"
            onClick={useCurrentLocation}
            disabled={isGeocoding}
          >
            {isGeocoding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Target className="h-5 w-5" />}
          </Button>
        </div>

        {/* Coordinates readout */}
        <div className="absolute bottom-6 left-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur-sm">
          Lon {mapView.center.lng.toFixed(4)}° • Lat {mapView.center.lat.toFixed(4)}°
        </div>

        {/* Hint when nothing is selected */}
        {!selectedLocation && mapLoaded && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-gray-900/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
            Cliquez sur la carte pour sélectionner un champ
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Right panel — field creation (appears once a place is selected) */}
      {/* ---------------------------------------------------------------- */}
      {selectedLocation && (
        <aside className="absolute right-0 top-0 z-40 flex h-full w-80 max-w-[90vw] flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl animate-slide-left lg:static lg:shadow-none">
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <FileCheck className="h-5 w-5 text-primary-600" />
              Nouveau champ
            </h2>
            <Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setSelectedLocation(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {/* Location summary */}
            <Card variant="elevated" className="border-l-4 border-l-primary-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  Lieu sélectionné
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Coordonnées</p>
                    <p className="font-mono text-sm">
                      {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                    </p>
                  </div>
                  {selectedLocation.address && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-sm text-gray-500">Adresse</p>
                      <p className="text-sm text-gray-900">{selectedLocation.address}</p>
                    </div>
                  )}
                  {(selectedLocation.country || selectedLocation.state || selectedLocation.region) && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="flex items-center gap-1 text-sm font-medium text-blue-700">
                        <Globe className="h-3 w-3" />
                        Détails détectés
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        {selectedLocation.country && (
                          <div>
                            <p className="text-blue-500">Pays</p>
                            <p className="font-medium text-blue-900">{selectedLocation.country}</p>
                          </div>
                        )}
                        {selectedLocation.state && (
                          <div>
                            <p className="text-blue-500">Région</p>
                            <p className="font-medium text-blue-900">{selectedLocation.state}</p>
                          </div>
                        )}
                        {selectedLocation.region && (
                          <div>
                            <p className="text-blue-500">District</p>
                            <p className="font-medium text-blue-900">{selectedLocation.region}</p>
                          </div>
                        )}
                        {selectedLocation.county && (
                          <div>
                            <p className="text-blue-500">Comté</p>
                            <p className="font-medium text-blue-900">{selectedLocation.county}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {soilType && (
                    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                      <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Type de sol (auto-détecté)</p>
                        <p className="text-sm text-green-900">{soilType}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Farm form */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nom du champ</label>
                <Input
                  value={farmFormData.name}
                  onChange={(e) => setFarmFormData({ ...farmFormData, name: e.target.value })}
                  placeholder="ex. Champ Nord, Parcelle 14"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Culture principale</label>
                <Select
                  value={farmFormData.crop}
                  onChange={(e) => setFarmFormData({ ...farmFormData, crop: e.target.value })}
                  options={[
                    { value: 'Maize', label: 'Maïs' },
                    { value: 'Wheat', label: 'Blé' },
                    { value: 'Soybean', label: 'Soja' },
                    { value: 'Rice', label: 'Riz' },
                    { value: 'Barley', label: 'Orge' },
                    { value: 'Cotton', label: 'Coton' },
                    { value: 'Other', label: 'Autre' },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Superficie</label>
                <Input
                  value={farmFormData.area}
                  onChange={(e) => setFarmFormData({ ...farmFormData, area: e.target.value })}
                  placeholder="ex. 10 ha, 25 acres"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                  Type de sol
                  <span className="text-xs text-green-600">(auto-détecté)</span>
                </label>
                <div className="relative">
                  {isDeterminingSoil && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                    </div>
                  )}
                  <Input
                    value={farmFormData.soilType || soilType}
                    onChange={(e) => setFarmFormData({ ...farmFormData, soilType: e.target.value })}
                    disabled={isDeterminingSoil}
                    placeholder="Détermination du type de sol…"
                  />
                  {soilType && !isDeterminingSoil && (
                    <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={farmFormData.description}
                  onChange={(e) => setFarmFormData({ ...farmFormData, description: e.target.value })}
                  placeholder="Notes optionnelles sur ce champ"
                  className="min-h-[70px]"
                />
              </div>

              {/* Collection period */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  label="Début"
                  max={dateRange.end || TODAY}
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, start: e.target.value })
                    setFormError('')
                  }}
                />
                <Input
                  type="date"
                  label="Fin"
                  min={dateRange.start || undefined}
                  max={TODAY}
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange({ ...dateRange, end: e.target.value })
                    setFormError('')
                  }}
                />
              </div>
              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {formError}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 space-y-2 border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleSaveFarm} disabled={isSavingFarm}>
                <Save className={cn('mr-1.5 h-4 w-4', isSavingFarm && 'animate-spin')} />
                {isSavingFarm ? 'Sauvegarde…' : 'Sauvegarder'}
              </Button>
              <Button className="flex-1" onClick={handleCollectData} disabled={triggerCollection.isPending || createFarmWithStore.isPending}>
                <RefreshCw className={cn('mr-1.5 h-4 w-4', (triggerCollection.isPending || createFarmWithStore.isPending) && 'animate-spin')} />
                {triggerCollection.isPending ? 'Collecte…' : 'Collecter'}
              </Button>
            </div>
            {triggerCollection.error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Échec : {triggerCollection.error.message}</span>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
