import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Input } from '../components/ui/Input'

// Mock field data
const mockFields = [
  { id: 1, name: 'North Field 1', crop: 'Corn', area: 45, coords: [-122.45, 37.78], health: 82, bbox: [-122.47, 37.76, -122.43, 37.80] },
  { id: 2, name: 'South Field 3', crop: 'Soybean', area: 32, coords: [-122.42, 37.75], health: 78, bbox: [-122.44, 37.73, -122.40, 37.77] },
  { id: 3, name: 'East Field 2', crop: 'Wheat', area: 28, coords: [-122.38, 37.79], health: 85, bbox: [-122.40, 37.77, -122.36, 37.81] },
  { id: 4, name: 'West Field 1', crop: 'Corn', area: 52, coords: [-122.48, 37.77], health: 72, bbox: [-122.50, 37.75, -122.46, 37.79] },
  { id: 5, name: 'Central Field 4', crop: 'Alfalfa', area: 18, coords: [-122.44, 37.77], health: 90, bbox: [-122.45, 37.76, -122.43, 37.78] },
]

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
  { id: 'satellite', label: 'Satellite', icon: '🛰️' },
  { id: 'terrain', label: 'Terrain', icon: '🏔️' },
  { id: 'streets', label: 'Streets', icon: '🗺️' },
  { id: 'hybrid', label: 'Hybrid', icon: '🌐' },
]

export default function FieldMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [selectedField, setSelectedField] = useState<typeof mockFields[0] | null>(mockFields[0])
  const [baseMap, setBaseMap] = useState('satellite')
  const [activeLayerGroup, setActiveLayerGroup] = useState('Vegetation')
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(layerOptions.map(l => [l.id, l.visible]))
  )
  const [mapView, setMapView] = useState({ center: [-122.44, 37.77], zoom: 11 })
  const [drawingMode, setDrawingMode] = useState(false)
  const [activeTab, setActiveTab] = useState('layers')
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' })
  const [opacity, setOpacity] = useState(70)

  // Initialize map (placeholder for MapLibre GL)
  useEffect(() => {
    // In real app: initialize MapLibre GL map here
    // const map = new maplibregl.Map({ container: mapContainerRef.current, ... })
    console.log('Map initialized')
  }, [])

  const toggleLayer = (layerId: string) => {
    setVisibleLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const getGroupLayers = (group: string) => layerOptions.filter(l => l.group === group)

  const getVisibleCount = () => Object.values(visibleLayers).filter(v => v).length

  const handleFieldClick = (field: typeof mockFields[0]) => {
    setSelectedField(field)
    setMapView({ center: field.coords, zoom: 13 })
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* Left Panel - Controls */}
      <aside className="w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-100">
              <Layers className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Map Layers</h2>
          </div>
          <Badge variant="info" className="text-xs">{getVisibleCount()} active</Badge>
        </div>

        {/* Base Map Selector */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Base Map</label>
          <div className="grid grid-cols-2 gap-2">
            {baseMaps.map((bm) => (
              <button
                key={bm.id}
                onClick={() => setBaseMap(bm.id)}
                className={cn(
                  'p-3 rounded-lg text-sm font-medium transition-all border-2',
                  baseMap === bm.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                )}
              >
                <span className="block text-xl mb-1">{bm.icon}</span>
                {bm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="layers" onChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="border-b border-gray-100 px-3">
            <TabsTrigger value="layers" className="px-2">Layers</TabsTrigger>
            <TabsTrigger value="fields" className="px-2">Fields</TabsTrigger>
            <TabsTrigger value="legend" className="px-2">Legend</TabsTrigger>
          </TabsList>

          <TabsContent value="layers">
            <div className="p-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-3">
                <Select
                  value={activeLayerGroup}
                  onChange={(e) => setActiveLayerGroup(e.target.value)}
                  options={['Soil Moisture', 'Vegetation', 'Temperature', 'Water', 'Land Cover', 'Elevation'].map(g => ({ value: g, label: g }))}
                  className="w-full max-w-xs"
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

              <div className="space-y-2">
                {getGroupLayers(activeLayerGroup).map((layer) => (
                  <div key={layer.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleLayers[layer.id]}
                            onChange={() => toggleLayer(layer.id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{layer.label}</p>
                            <p className="text-xs text-gray-500">{layer.source} • {layer.resolution} • {layer.temporal}</p>
                          </div>
                        </label>
                      </div>
                      <Badge variant={visibleLayers[layer.id] ? 'success' : 'gray'} size="sm">
                        {visibleLayers[layer.id] ? 'Visible' : 'Hidden'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fields">
            <div className="p-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{mockFields.length} Fields</h3>
                <Button variant="ghost" size="sm" onClick={() => setDrawingMode(!drawingMode)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Field
                </Button>
              </div>

              {drawingMode && (
                <div className="mb-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm text-yellow-800">Click on map to draw field boundary. Press ESC to cancel.</p>
                </div>
              )}

              <div className="space-y-2">
                {mockFields.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => handleFieldClick(field)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      selectedField?.id === field.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{field.name}</p>
                        <p className="text-sm text-gray-500">{field.crop} • {field.area} ha</p>
                      </div>
                      <Badge variant={field.health >= 80 ? 'success' : field.health >= 60 ? 'warning' : 'danger'}>
                        {field.health}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="legend">
            <div className="p-3 overflow-y-auto flex-1">
              {getGroupLayers(activeLayerGroup).filter(l => visibleLayers[l.id]).map((layer) => (
                <div key={layer.id} className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    {layer.label}
                    <Badge variant="gray" size="sm">{layer.source}</Badge>
                  </h4>
                  <div className="flex items-center gap-2 h-6">
                    <div className="flex-1 h-full rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Resolution: {layer.resolution} | Temporal: {layer.temporal}</p>
                </div>
              ))}
              {getGroupLayers(activeLayerGroup).filter(l => visibleLayers[l.id]).length === 0 && (
                <p className="text-gray-500 text-center py-8">No visible layers in this group</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Date Range */}
        <div className="p-4 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              label="Start"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              label="End"
            />
          </div>
        </div>
      </aside>

      {/* Map Container */}
      <div className="flex-1 relative overflow-hidden" ref={mapContainerRef}>
        {/* Map Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-yellow-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <Layers className="w-12 h-12 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Interactive Map</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              MapLibre GL integration ready. Connect to NASA data layers via tile services (WMTS, XYZ, COG).
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export Image
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Map Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Map Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0" aria-label="Zoom in">
            <Plus className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0" aria-label="Zoom out">
            <Minus className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0" aria-label="Fullscreen">
            <Expand className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="sm" className="w-10 h-10 p-0" aria-label="Locate me">
            <MapPin className="w-5 h-5" />
          </Button>
        </div>

        {/* Scale Bar */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm z-10">
          Scale: ~1:50,000
        </div>

        {/* Coordinates */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600 shadow-sm z-10">
          Lon: {mapView.center[0].toFixed(4)}°, Lat: {mapView.center[1].toFixed(4)}°
        </div>
      </div>

      {/* Right Panel - Field Details */}
      {selectedField && (
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Field Details</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedField(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Field Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedField.name}</span>
                    <Badge variant={selectedField.health >= 80 ? 'success' : selectedField.health >= 60 ? 'warning' : 'danger'}>
                      Health: {selectedField.health}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Crop</p>
                      <p className="font-medium">{selectedField.crop}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Area</p>
                      <p className="font-medium">{selectedField.area} ha</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Coordinates</p>
                      <p className="font-medium text-sm font-mono">{selectedField.coords[1].toFixed(4)}, {selectedField.coords[0].toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Bounds</p>
                      <p className="font-medium text-sm font-mono text-xs">
                        [{selectedField.bbox[0].toFixed(3)}, {selectedField.bbox[1].toFixed(3)}, {selectedField.bbox[2].toFixed(3)}, {selectedField.bbox[3].toFixed(3)}]
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${selectedField.health}%` }} />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Leaf className="w-4 h-4 mr-1" />
                    Soil Health
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Yield Predict
                  </Button>
                </CardFooter>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="ghost" size="sm" className="h-auto py-3">
                      <Droplet className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Soil Moisture</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-3">
                      <Leaf className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Vegetation</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-3">
                      <Thermometer className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Temperature</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-3">
                      <Cloud className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Precipitation</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-3">
                      <Wind className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">ET / Stress</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-auto py-3">
                      <Sun className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">ECOSTRESS</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Time Series Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Time Series (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 flex items-end justify-center gap-2 px-2">
                    {[45, 48, 52, 49, 55, 58, 56, 60, 62, 59, 65, 68, 66, 70, 72, 69, 73, 75, 72, 76, 78, 75, 79, 80, 78, 82, 81, 83, 82, 85].map((v, i) => (
                      <div key={i} className="flex-1 max-w-6 h-full bg-primary-500 rounded-t transition-all hover:bg-primary-600" style={{ height: `${v}%` }} title={`Day ${i+1}: ${v}%`} />
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">NDVI Trend (Landsat 30m)</p>
                </CardContent>
              </Card>

              {/* Data Sources Available */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Data Layers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: 'SMAP Soil Moisture', status: 'Available', freq: 'Daily', res: '9 km' },
                      { name: 'MODIS NDVI/EVI', status: 'Available', freq: '16-day', res: '250 m' },
                      { name: 'Landsat 8/9 SR', status: 'Available', freq: '16-day', res: '30 m' },
                      { name: 'GPM Precipitation', status: 'Available', freq: '30-min', res: '0.1°' },
                      { name: 'ECOSTRESS ET/LST', status: 'Available', freq: '~4-day', res: '70 m' },
                      { name: 'OpenET ET', status: 'Requires API Key', freq: 'Monthly', res: '30 m' },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{d.name}</p>
                          <p className="text-xs text-gray-500">{d.freq} • {d.res}</p>
                        </div>
                        <Badge variant={d.status === 'Available' ? 'success' : 'warning'} size="sm">
                          {d.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}