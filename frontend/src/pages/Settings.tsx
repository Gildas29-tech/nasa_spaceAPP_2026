import { useState } from 'react'
import { cn } from '../lib/utils'
import {
  User,
  Key,
  Globe,
  Layers,
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Database,
  Cloud,
  Cpu,
  HardDrive,
  MapPin,
  Calendar,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    name: 'John Farmer',
    email: 'john.farmer@example.com',
    farmName: 'Green Valley Farm',
    timezone: 'America/Los_Angeles',
    language: 'en',
    units: 'imperial',
    dateFormat: 'MM/DD/YYYY',
  })

  const [nasaCredentials, setNasaCredentials] = useState({
    earthdataUsername: '',
    earthdataPassword: '',
    openetApiKey: '',
    meteomaticsUsername: '',
    meteomaticsPassword: '',
    awsAccessKey: '',
    awsSecretKey: '',
    awsRegion: 'us-west-2',
  })

  const [dataSettings, setDataSettings] = useState({
    defaultBbox: [-122.5, 37.5, -121.5, 38.5],
    defaultStartDate: '2024-01-01',
    defaultEndDate: '2024-12-31',
    cacheEnabled: true,
    cacheDuration: 24,
    autoRefresh: false,
    refreshInterval: 6,
    maxConcurrentDownloads: 3,
    preferredResolution: 'native',
  })

  const [mapSettings, setMapSettings] = useState({
    defaultBasemap: 'satellite',
    defaultZoom: 11,
    defaultCenter: [-122.44, 37.77],
    showFieldBoundaries: true,
    showLabels: true,
    layerOpacity: 70,
    enableClustering: true,
    maxFeatures: 10000,
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    waterStressAlerts: true,
    heatStressAlerts: true,
    frostAlerts: true,
    pestAlerts: false,
    marketAlerts: false,
    weeklySummary: true,
    alertThreshold: 'warning',
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00',
  })

  const [advancedSettings, setAdvancedSettings] = useState({
    debugMode: false,
    logLevel: 'info',
    enableTelemetry: true,
    enableOfflineMode: false,
    maxCacheSize: 5,
    workerThreads: 4,
    tileCacheSize: 200,
    apiTimeout: 30,
    retryAttempts: 3,
  })

  const handleSave = async (section: string) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    // In real app: save to localStorage or backend
    console.log(`Saved ${section} settings`)
  }

  const testConnection = async (service: string) => {
    // In real app: test API connection
    console.log(`Testing ${service} connection...`)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'credentials', label: 'NASA Credentials', icon: Key },
    { id: 'data', label: 'Data & Cache', icon: Database },
    { id: 'map', label: 'Map', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'advanced', label: 'Advanced', icon: Shield },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure your preferences, data sources, and application behavior</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" onChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-2 px-3 py-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={generalSettings.name}
                  onChange={(e) => setGeneralSettings({...generalSettings, name: e.target.value})}
                  placeholder="John Farmer"
                />
                <Input
                  label="Email"
                  type="email"
                  value={generalSettings.email}
                  onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                  placeholder="john@example.com"
                />
                <Input
                  label="Farm Name"
                  value={generalSettings.farmName}
                  onChange={(e) => setGeneralSettings({...generalSettings, farmName: e.target.value})}
                  placeholder="Green Valley Farm"
                />
                <Select
                  label="Timezone"
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                  options={[
                    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
                    { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
                    { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
                    { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
                    { value: 'UTC', label: 'UTC' },
                  ]}
                />
                <Select
                  label="Language"
                  value={generalSettings.language}
                  onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'pt', label: 'Português' },
                  ]}
                />
                <Select
                  label="Units"
                  value={generalSettings.units}
                  onChange={(e) => setGeneralSettings({...generalSettings, units: e.target.value})}
                  options={[
                    { value: 'imperial', label: 'Imperial (acres, inches, °F)' },
                    { value: 'metric', label: 'Metric (hectares, mm, °C)' },
                  ]}
                />
                <Select
                  label="Date Format"
                  value={generalSettings.dateFormat}
                  onChange={(e) => setGeneralSettings({...generalSettings, dateFormat: e.target.value})}
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSave('general')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save General Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NASA Credentials */}
        <TabsContent value="credentials">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary-600" />
                NASA Earthdata & API Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">NASA Earthdata Login Required</p>
                    <p>Most NASA datasets require authentication via <a href="https://urs.earthdata.nasa.gov" target="_blank" rel="noopener noreferrer" className="underline">Earthdata Login</a>. Create an account and authorize the required applications (LP DAAC, GES DISC, NSIDC DAAC, PO.DAAC, ORNL DAAC).</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-600" />
                  NASA Earthdata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    type="text"
                    value={nasaCredentials.earthdataUsername}
                    onChange={(e) => setNasaCredentials({...nasaCredentials, earthdataUsername: e.target.value})}
                    placeholder="your_earthdata_username"
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={nasaCredentials.earthdataPassword}
                    onChange={(e) => setNasaCredentials({...nasaCredentials, earthdataPassword: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => testConnection('Earthdata')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Connection
                  </Button>
                  <Button variant="ghost" onClick={() => window.open('https://urs.earthdata.nasa.gov', '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Account
                  </Button>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-gray-600" />
                    OpenET API
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Input
                      label="API Key"
                      type="password"
                      value={nasaCredentials.openetApiKey}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, openetApiKey: e.target.value})}
                      placeholder="your_openet_api_key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => testConnection('OpenET')}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Connection
                    </Button>
                    <Button variant="ghost" onClick={() => window.open('https://openetdata.org', '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get API Key
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-gray-600" />
                    Meteomatics Weather API
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <Input
                      label="Username"
                      type="text"
                      value={nasaCredentials.meteomaticsUsername}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, meteomaticsUsername: e.target.value})}
                      placeholder="your_meteomatics_username"
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={nasaCredentials.meteomaticsPassword}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, meteomaticsPassword: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => testConnection('Meteomatics')}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-gray-600" />
                    AWS Credentials (for S3 Direct Access)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <Input
                      label="Access Key ID"
                      type="text"
                      value={nasaCredentials.awsAccessKey}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, awsAccessKey: e.target.value})}
                      placeholder="AKIA..."
                    />
                    <Input
                      label="Secret Access Key"
                      type="password"
                      value={nasaCredentials.awsSecretKey}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, awsSecretKey: e.target.value})}
                      placeholder="••••••••"
                    />
                    <Select
                      label="Region"
                      value={nasaCredentials.awsRegion}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, awsRegion: e.target.value})}
                      options={[
                        { value: 'us-west-2', label: 'US West (Oregon)' },
                        { value: 'us-east-1', label: 'US East (N. Virginia)' },
                        { value: 'eu-west-1', label: 'EU (Ireland)' },
                      ]}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => testConnection('AWS')}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={() => handleSave('credentials')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Credentials
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Cache Settings */}
        <TabsContent value="data">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                Data & Cache Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    Default Analysis Area
                  </h3>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <Input label="West" type="number" step="0.001" value={dataSettings.defaultBbox[0]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [parseFloat(e.target.value), dataSettings.defaultBbox[1], dataSettings.defaultBbox[2], dataSettings.defaultBbox[3]]})} />
                    <Input label="South" type="number" step="0.001" value={dataSettings.defaultBbox[1]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [dataSettings.defaultBbox[0], parseFloat(e.target.value), dataSettings.defaultBbox[2], dataSettings.defaultBbox[3]]})} />
                    <Input label="East" type="number" step="0.001" value={dataSettings.defaultBbox[2]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [dataSettings.defaultBbox[0], dataSettings.defaultBbox[1], parseFloat(e.target.value), dataSettings.defaultBbox[3]]})} />
                    <Input label="North" type="number" step="0.001" value={dataSettings.defaultBbox[3]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [dataSettings.defaultBbox[0], dataSettings.defaultBbox[1], dataSettings.defaultBbox[2], parseFloat(e.target.value)]})} />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    Default Date Range
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Start Date" type="date" value={dataSettings.defaultStartDate} onChange={(e) => setDataSettings({...dataSettings, defaultStartDate: e.target.value})} />
                    <Input label="End Date" type="date" value={dataSettings.defaultEndDate} onChange={(e) => setDataSettings({...dataSettings, defaultEndDate: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-gray-600" />
                  Cache Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dataSettings.cacheEnabled}
                      onChange={(e) => setDataSettings({...dataSettings, cacheEnabled: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Enable Caching</span>
                  </label>
                  <Input
                    label="Cache Duration (hours)"
                    type="number"
                    min="1"
                    max="168"
                    value={dataSettings.cacheDuration}
                    onChange={(e) => setDataSettings({...dataSettings, cacheDuration: parseInt(e.target.value)})}
                  />
                  <Input
                    label="Max Cache Size (GB)"
                    type="number"
                    min="1"
                    max="50"
                    value={advancedSettings.maxCacheSize}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, maxCacheSize: parseInt(e.target.value)})}
                  />
                  <Input
                    label="Max Concurrent Downloads"
                    type="number"
                    min="1"
                    max="10"
                    value={dataSettings.maxConcurrentDownloads}
                    onChange={(e) => setDataSettings({...dataSettings, maxConcurrentDownloads: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                  Auto Refresh
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dataSettings.autoRefresh}
                      onChange={(e) => setDataSettings({...dataSettings, autoRefresh: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Enable Auto Refresh</span>
                  </label>
                  <Input
                    label="Refresh Interval (hours)"
                    type="number"
                    min="1"
                    max="24"
                    value={dataSettings.refreshInterval}
                    onChange={(e) => setDataSettings({...dataSettings, refreshInterval: parseInt(e.target.value)})}
                    disabled={!dataSettings.autoRefresh}
                  />
                  <Select
                    label="Preferred Resolution"
                    value={dataSettings.preferredResolution}
                    onChange={(e) => setDataSettings({...dataSettings, preferredResolution: e.target.value})}
                    options={[
                      { value: 'native', label: 'Native (highest)' },
                      { value: '1km', label: '1 km' },
                      { value: '500m', label: '500 m' },
                      { value: '250m', label: '250 m' },
                      { value: '30m', label: '30 m (Landsat)' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={() => handleSave('data')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Data Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Settings */}
        <TabsContent value="map">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-600" />
                Map Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Default Basemap"
                  value={mapSettings.defaultBasemap}
                  onChange={(e) => setMapSettings({...mapSettings, defaultBasemap: e.target.value})}
                  options={[
                    { value: 'satellite', label: 'Satellite' },
                    { value: 'terrain', label: 'Terrain' },
                    { value: 'streets', label: 'Streets' },
                    { value: 'hybrid', label: 'Hybrid' },
                  ]}
                />
                <Input
                  label="Default Zoom Level"
                  type="number"
                  min="1"
                  max="20"
                  value={mapSettings.defaultZoom}
                  onChange={(e) => setMapSettings({...mapSettings, defaultZoom: parseInt(e.target.value)})}
                />
                <Input
                  label="Default Center Lon"
                  type="number"
                  step="0.001"
                  value={mapSettings.defaultCenter[0]}
                  onChange={(e) => setMapSettings({...mapSettings, defaultCenter: [parseFloat(e.target.value), mapSettings.defaultCenter[1]]})}
                />
                <Input
                  label="Default Center Lat"
                  type="number"
                  step="0.001"
                  value={mapSettings.defaultCenter[1]}
                  onChange={(e) => setMapSettings({...mapSettings, defaultCenter: [mapSettings.defaultCenter[0], parseFloat(e.target.value)]})}
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">Display Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapSettings.showFieldBoundaries}
                      onChange={(e) => setMapSettings({...mapSettings, showFieldBoundaries: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Show Field Boundaries</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapSettings.showLabels}
                      onChange={(e) => setMapSettings({...mapSettings, showLabels: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Show Labels</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mapSettings.enableClustering}
                      onChange={(e) => setMapSettings({...mapSettings, enableClustering: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Enable Clustering</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={mapSettings.layerOpacity}
                        onChange={(e) => setMapSettings({...mapSettings, layerOpacity: parseInt(e.target.value)})}
                        className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                      <span className="text-sm">Layer Opacity: {mapSettings.layerOpacity}%</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Max Features Rendered"
                    type="number"
                    min="1000"
                    max="50000"
                    value={mapSettings.maxFeatures}
                    onChange={(e) => setMapSettings({...mapSettings, maxFeatures: parseInt(e.target.value)})}
                  />
                  <Input
                    label="Tile Cache Size (MB)"
                    type="number"
                    min="50"
                    max="1000"
                    value={advancedSettings.tileCacheSize}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, tileCacheSize: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={() => handleSave('map')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Map Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-600" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailAlerts}
                    onChange={(e) => setNotificationSettings({...notificationSettings, emailAlerts: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Enable Email Alerts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklySummary}
                    onChange={(e) => setNotificationSettings({...notificationSettings, weeklySummary: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Weekly Summary Email</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">Alert Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.waterStressAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, waterStressAlerts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Water Stress Alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.heatStressAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, heatStressAlerts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Heat Stress Alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.frostAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, frostAlerts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Frost Alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.pestAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, pestAlerts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Pest/Disease Alerts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.marketAlerts}
                      onChange={(e) => setNotificationSettings({...notificationSettings, marketAlerts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Market Price Alerts</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">Alert Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Minimum Alert Level"
                    value={notificationSettings.alertThreshold}
                    onChange={(e) => setNotificationSettings({...notificationSettings, alertThreshold: e.target.value})}
                    options={[
                      { value: 'info', label: 'Info (All)' },
                      { value: 'warning', label: 'Warning & Critical' },
                      { value: 'critical', label: 'Critical Only' },
                    ]}
                  />
                  <Input
                    label="Quiet Hours Start"
                    type="time"
                    value={notificationSettings.quietHoursStart}
                    onChange={(e) => setNotificationSettings({...notificationSettings, quietHoursStart: e.target.value})}
                  />
                  <Input
                    label="Quiet Hours End"
                    type="time"
                    value={notificationSettings.quietHoursEnd}
                    onChange={(e) => setNotificationSettings({...notificationSettings, quietHoursEnd: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={() => handleSave('notifications')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedSettings.debugMode}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, debugMode: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Debug Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedSettings.enableTelemetry}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, enableTelemetry: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Enable Telemetry</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={advancedSettings.enableOfflineMode}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, enableOfflineMode: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">Enable Offline Mode</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">Performance Tuning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label="Log Level"
                    value={advancedSettings.logLevel}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, logLevel: e.target.value})}
                    options={[
                      { value: 'debug', label: 'Debug' },
                      { value: 'info', label: 'Info' },
                      { value: 'warn', label: 'Warning' },
                      { value: 'error', label: 'Error' },
                    ]}
                  />
                  <Input
                    label="Worker Threads"
                    type="number"
                    min="1"
                    max="16"
                    value={advancedSettings.workerThreads}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, workerThreads: parseInt(e.target.value)})}
                  />
                  <Input
                    label="API Timeout (seconds)"
                    type="number"
                    min="5"
                    max="120"
                    value={advancedSettings.apiTimeout}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, apiTimeout: parseInt(e.target.value)})}
                  />
                  <Input
                    label="Retry Attempts"
                    type="number"
                    min="0"
                    max="10"
                    value={advancedSettings.retryAttempts}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, retryAttempts: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">Data Management</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => {}}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Settings
                  </Button>
                  <Button variant="secondary" onClick={() => {}}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Settings
                  </Button>
                  <Button variant="ghost" onClick={() => {}} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-4">About</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Field Shift</p>
                    <p className="text-gray-500">Version 1.0.0 (Beta)</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">NASA Space Apps 2026</p>
                    <p className="text-gray-500">Challenge: Field Shift</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Tech Stack</p>
                    <p className="text-gray-500">React + FastAPI + NASA Earthdata</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">License</p>
                    <p className="text-gray-500">MIT</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button onClick={() => handleSave('advanced')} loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Advanced Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}