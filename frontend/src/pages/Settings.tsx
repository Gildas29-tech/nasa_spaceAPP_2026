import { useEffect, useRef, useState } from 'react'
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
  SlidersHorizontal,
  Wifi,
  Mail,
  Moon,
  Sun,
  Zap,
  Cog,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHero } from '../components/PageHero'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { AnimatedPage } from '../components/PageTransition'
import { useUIStore } from '../stores/uiStore'
import { api } from '../lib/api'

export default function Settings() {
  const { addToast } = useUIStore()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState<string | null>(null)

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    name: '',
    email: '',
    farmName: '',
    timezone: 'UTC',
    language: 'fr',
    units: 'metric',
    dateFormat: 'DD/MM/YYYY',
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

  const [dataSettings, setDataSettings] = useState(() => {
    const end = new Date()
    const start = new Date(end)
    start.setFullYear(start.getFullYear() - 1)
    return {
      defaultBbox: [-122.5, 37.5, -121.5, 38.5],
      defaultStartDate: start.toISOString().slice(0, 10),
      defaultEndDate: end.toISOString().slice(0, 10),
      cacheEnabled: true,
      cacheDuration: 24,
      autoRefresh: false,
      refreshInterval: 6,
      maxConcurrentDownloads: 3,
      preferredResolution: 'native',
    }
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

  interface NotificationSettings {
    emailAlerts: boolean
    waterStressAlerts: boolean
    heatStressAlerts: boolean
    frostAlerts: boolean
    pestAlerts: boolean
    marketAlerts: boolean
    weeklySummary: boolean
    alertThreshold: 'info' | 'warning' | 'critical'
    quietHoursStart: string
    quietHoursEnd: string
  }

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
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

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('field-shift-settings') || '{}')
      if (saved.generalSettings) setGeneralSettings((current) => ({ ...current, ...saved.generalSettings }))
      if (saved.dataSettings) setDataSettings((current) => ({ ...current, ...saved.dataSettings }))
      if (saved.mapSettings) setMapSettings((current) => ({ ...current, ...saved.mapSettings }))
      if (saved.notificationSettings) setNotificationSettings((current) => ({ ...current, ...saved.notificationSettings }))
      if (saved.advancedSettings) setAdvancedSettings((current) => ({ ...current, ...saved.advancedSettings }))
    } catch {
      addToast({ type: 'warning', title: 'Réglages sauvegardés illisibles', message: 'Les valeurs par défaut restent actives.' })
    }
  }, [addToast])

  const handleSave = async (section: string) => {
    if (section === 'credentials') {
      addToast({ type: 'warning', title: 'Identifiants non enregistrés', message: 'Pour des raisons de sécurité, les secrets ne sont pas stockés dans le navigateur. Configurez-les côté serveur.' })
      return
    }
    const sectionKey: Record<string, string> = {
      general: 'generalSettings',
      data: 'dataSettings',
      map: 'mapSettings',
      notifications: 'notificationSettings',
      advanced: 'advancedSettings',
    }
    const values: Record<string, unknown> = {
      generalSettings,
      dataSettings,
      mapSettings,
      notificationSettings,
      advancedSettings,
    }
    const key = sectionKey[section]
    if (!key) return
    setSaving(section)
    try {
      const saved = JSON.parse(localStorage.getItem('field-shift-settings') || '{}')
      saved[key] = values[key]
      localStorage.setItem('field-shift-settings', JSON.stringify(saved))
      addToast({ type: 'success', title: 'Réglages enregistrés', message: 'Les préférences sont conservées dans ce navigateur.' })
    } catch {
      addToast({ type: 'error', title: 'Enregistrement impossible', message: 'Le stockage local du navigateur est indisponible.' })
    } finally {
      setSaving(null)
    }
  }

  const testConnection = async (service: string) => {
    try {
      const result = await api.get<{ sources: Array<{ name: string; status: string }> }>('/data/sources')
      const query = service.toLocaleLowerCase('fr').replace('earthdata', 'nasa')
      const matches = result.sources.filter((source) => source.name.toLocaleLowerCase('fr').includes(query))
      if (matches.length === 0) {
        addToast({ type: 'info', title: 'Source non répertoriée', message: `${service} n’est pas exposé par le catalogue de sources du serveur.` })
        return
      }
      const available = matches.some((source) => ['available', 'online', 'success'].includes(source.status.toLowerCase()))
      addToast({ type: available ? 'success' : 'warning', title: available ? 'Source disponible' : 'Source à vérifier', message: matches.map((source) => `${source.name} : ${source.status}`).join(' · ') })
    } catch {
      addToast({ type: 'error', title: 'Serveur inaccessible', message: 'Impossible de charger le catalogue des sources.' })
    }
  }

  const exportSettings = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      generalSettings,
      dataSettings,
      mapSettings,
      notificationSettings,
      advancedSettings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'field-shift-settings.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = JSON.parse(await file.text())
      if (imported.generalSettings) setGeneralSettings((current) => ({ ...current, ...imported.generalSettings }))
      if (imported.dataSettings) setDataSettings((current) => ({ ...current, ...imported.dataSettings }))
      if (imported.mapSettings) setMapSettings((current) => ({ ...current, ...imported.mapSettings }))
      if (imported.notificationSettings) setNotificationSettings((current) => ({ ...current, ...imported.notificationSettings }))
      if (imported.advancedSettings) setAdvancedSettings((current) => ({ ...current, ...imported.advancedSettings }))
      localStorage.setItem('field-shift-settings', JSON.stringify({
        generalSettings: imported.generalSettings,
        dataSettings: imported.dataSettings,
        mapSettings: imported.mapSettings,
        notificationSettings: imported.notificationSettings,
        advancedSettings: imported.advancedSettings,
      }))
      addToast({ type: 'success', title: 'Réglages importés', message: 'Pensez à enregistrer chaque section modifiée.' })
    } catch {
      addToast({ type: 'error', title: 'Fichier invalide', message: 'Sélectionnez un fichier JSON de réglages Field Shift.' })
    }
  }

  const resetSettings = () => {
    if (!window.confirm('Réinitialiser les préférences locales ? Les réglages enregistrés seront supprimés.')) return
    localStorage.removeItem('field-shift-settings')
    window.location.reload()
  }

  const tabs = [
    { id: 'general', label: 'Général', icon: User },
    { id: 'credentials', label: 'NASA API', icon: Key },
    { id: 'data', label: 'Données', icon: Database },
    { id: 'map', label: 'Carte', icon: Globe },
    { id: 'notifications', label: 'Alertes', icon: Bell },
    { id: 'advanced', label: 'Avancé', icon: Shield },
  ]

  function SettingsCard({ title, icon, children, delay = 0, className, ...props }: { title: string; icon: any; children: React.ReactNode; delay?: number; className?: string }) {
    return (
      <Card variant="elevated" className={cn('hover-lift border-l-4 border-l-primary-500 animate-fade-in', className)} {...props} style={{ animationDelay: `${delay}ms` }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-100 text-primary-600">{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {children}
        </CardContent>
      </Card>
    )
  }

  function SectionHeader({ title, icon: Icon, delay = 0 }: { title: string; icon: any; delay?: number }) {
    return (
      <div className="flex items-center gap-2 mb-4 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
        <Icon className="w-5 h-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
    )
  }

  function SettingRow({ label, children, delay = 0 }: { label?: string; children: React.ReactNode; delay?: number }) {
    return (
      <div className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
        {label && <label className="label mb-2">{label}</label>}
        {children}
      </div>
    )
  }

  function ActionButton({ children, onClick, variant = 'primary', disabled, loading, delay = 0, ...props }: any) {
    return (
      <Button variant={variant} onClick={onClick} disabled={disabled} loading={loading} className={cn('hover-lift animate-slide-up', props.className)} {...props} style={{ animationDelay: `${delay}ms` }}>
        {children}
      </Button>
    )
  }

  function InfoBanner({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <AnimatedPage className="space-y-6 max-w-4xl">
      {/* Header */}
      <PageHero
        kicker="Field Shift"
        title="Réglages"
        subtitle="Sources, unités et préférences de l'application."
      />

      {/* Tabs */}
      <Tabs defaultValue="general" onChange={setActiveTab} className="w-full" animated transition="slide">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 animate-fade-in">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-2 px-3 py-2 hover-lift">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" transition="slide">
          <SettingsCard title="Paramètres Généraux" icon={<User className="w-5 h-5" />} delay={0}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-stagger-slide-up" style={{ animationDelay: '50ms' }}>
              <SettingRow label="Nom complet" delay={0}>
                <Input
                  value={generalSettings.name}
                  onChange={(e) => setGeneralSettings({...generalSettings, name: e.target.value})}
                  placeholder="John Farmer"
                  className="hover-lift"
                />
              </SettingRow>
              <SettingRow label="Email" delay={60}>
                <Input
                  type="email"
                  value={generalSettings.email}
                  onChange={(e) => setGeneralSettings({...generalSettings, email: e.target.value})}
                  placeholder="john@example.com"
                  className="hover-lift"
                />
              </SettingRow>
              <SettingRow label="Nom de la ferme" delay={120}>
                <Input
                  value={generalSettings.farmName}
                  onChange={(e) => setGeneralSettings({...generalSettings, farmName: e.target.value})}
                  placeholder="Green Valley Farm"
                  className="hover-lift"
                />
              </SettingRow>
              <SettingRow label="Fuseau horaire" delay={180}>
                <Select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                  options={[
                    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
                    { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
                    { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
                    { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
                    { value: 'Africa/Lome', label: 'Afrique de l’Ouest (UTC+0)' },
                    { value: 'Europe/Paris', label: 'Europe centrale' },
                    { value: 'UTC', label: 'UTC' },
                  ]}
                  className="hover-lift"
                />
              </SettingRow>
              <SettingRow label="Langue" delay={240}>
                <Select
                  value={generalSettings.language}
                  onChange={(e) => setGeneralSettings({...generalSettings, language: e.target.value})}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'pt', label: 'Português' },
                  ]}
                  className="hover-lift"
                />
              </SettingRow>
              <SettingRow label="Unités" delay={300}>
                <Select
                  value={generalSettings.units}
                  onChange={(e) => setGeneralSettings({...generalSettings, units: e.target.value})}
                  options={[
                    { value: 'imperial', label: 'Impérial (acres, pouces, °F)' },
                    { value: 'metric', label: 'Métrique (hectares, mm, °C)' },
                  ]}
                  className="hover-lift"
                />
              </SettingRow>
              <SettingRow label="Format de date" delay={360}>
                <Select
                  value={generalSettings.dateFormat}
                  onChange={(e) => setGeneralSettings({...generalSettings, dateFormat: e.target.value})}
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                  className="hover-lift"
                />
              </SettingRow>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 animate-fade-in" style={{ animationDelay: '420ms' }}>
              <ActionButton
                onClick={() => handleSave('general')}
                loading={saving === 'general'}
                delay={0}
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres généraux
              </ActionButton>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* NASA Credentials */}
        <TabsContent value="credentials" transition="slide">
          <SettingsCard title="Identifiants NASA & API" icon={<Key className="w-5 h-5" />} delay={0}>
            <InfoBanner delay={0}>
              <p className="font-medium mb-1">Connexion NASA Earthdata Requise</p>
              <p>La plupart des jeux de données NASA nécessitent un compte <a href="https://urs.earthdata.nasa.gov" target="_blank" rel="noopener noreferrer" className="underline">Earthdata Login</a>. Les identifiants saisis ici restent dans cette session et ne sont pas transmis au serveur. Configurez les secrets côté backend pour activer les connecteurs.</p>
            </InfoBanner>

            <div className="space-y-6 animate-stagger-slide-up" style={{ animationDelay: '50ms' }}>
              <SectionHeader title="NASA Earthdata" icon={<Globe className="w-5 h-5" />} delay={0} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SettingRow label="Nom d'utilisateur" delay={60}>
                  <Input
                    type="text"
                    value={nasaCredentials.earthdataUsername}
                    onChange={(e) => setNasaCredentials({...nasaCredentials, earthdataUsername: e.target.value})}
                    placeholder="votre_nom_utilisateur"
                    className="hover-lift"
                  />
                </SettingRow>
                <SettingRow label="Mot de passe" delay={120}>
                  <Input
                    type="password"
                    value={nasaCredentials.earthdataPassword}
                    onChange={(e) => setNasaCredentials({...nasaCredentials, earthdataPassword: e.target.value})}
                    placeholder="••••••••"
                    className="hover-lift"
                  />
                </SettingRow>
              </div>
              <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '180ms' }}>
                <ActionButton variant="secondary" onClick={() => testConnection('Earthdata')} delay={0}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Voir l’état des sources
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => window.open('https://urs.earthdata.nasa.gov', '_blank')} delay={60}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Gérer le compte
                </ActionButton>
              </div>

              <div className="pt-4 border-t border-gray-100 animate-slide-up" style={{ animationDelay: '240ms' }}>
                <SectionHeader title="OpenET API" icon={<Cloud className="w-5 h-5" />} delay={0} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <SettingRow label="Clé API" delay={60}>
                    <Input
                      type="password"
                      value={nasaCredentials.openetApiKey}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, openetApiKey: e.target.value})}
                      placeholder="votre_cle_api_openet"
                      className="hover-lift"
                    />
                  </SettingRow>
                </div>
                <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '120ms' }}>
                  <ActionButton variant="secondary" onClick={() => testConnection('OpenET')} delay={0}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Voir l’état des sources
                  </ActionButton>
                  <ActionButton variant="ghost" onClick={() => window.open('https://openetdata.org', '_blank')} delay={60}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Obtenir une clé API
                  </ActionButton>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <SectionHeader title="API Météo Meteomatics" icon={<Cpu className="w-5 h-5" />} delay={0} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <SettingRow label="Nom d'utilisateur" delay={60}>
                    <Input
                      type="text"
                      value={nasaCredentials.meteomaticsUsername}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, meteomaticsUsername: e.target.value})}
                      placeholder="votre_nom_utilisateur"
                      className="hover-lift"
                    />
                  </SettingRow>
                  <SettingRow label="Mot de passe" delay={120}>
                    <Input
                      type="password"
                      value={nasaCredentials.meteomaticsPassword}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, meteomaticsPassword: e.target.value})}
                      placeholder="••••••••"
                      className="hover-lift"
                    />
                  </SettingRow>
                </div>
                <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '180ms' }}>
                  <ActionButton variant="secondary" onClick={() => testConnection('Meteomatics')} delay={0}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Voir l’état des sources
                  </ActionButton>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 animate-slide-up" style={{ animationDelay: '360ms' }}>
                <SectionHeader title="Identifiants AWS (Accès S3 Direct)" icon={<HardDrive className="w-5 h-5" />} delay={0} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <SettingRow label="Access Key ID" delay={60}>
                    <Input
                      type="text"
                      value={nasaCredentials.awsAccessKey}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, awsAccessKey: e.target.value})}
                      placeholder="AKIA..."
                      className="hover-lift"
                    />
                  </SettingRow>
                  <SettingRow label="Secret Access Key" delay={120}>
                    <Input
                      type="password"
                      value={nasaCredentials.awsSecretKey}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, awsSecretKey: e.target.value})}
                      placeholder="••••••••"
                      className="hover-lift"
                    />
                  </SettingRow>
                  <SettingRow label="Région" delay={180}>
                    <Select
                      value={nasaCredentials.awsRegion}
                      onChange={(e) => setNasaCredentials({...nasaCredentials, awsRegion: e.target.value})}
                      options={[
                        { value: 'us-west-2', label: 'US West (Oregon)' },
                        { value: 'us-east-1', label: 'US East (N. Virginia)' },
                        { value: 'eu-west-1', label: 'EU (Ireland)' },
                      ]}
                      className="hover-lift"
                    />
                  </SettingRow>
                </div>
                <div className="flex gap-2 animate-slide-up" style={{ animationDelay: '240ms' }}>
                  <ActionButton variant="secondary" onClick={() => testConnection('AWS')} delay={0}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Voir l’état des sources
                  </ActionButton>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 animate-fade-in" style={{ animationDelay: '420ms' }}>
              <ActionButton onClick={() => handleSave('credentials')} loading={saving === 'credentials'} delay={0}>
                <Save className="w-4 h-4 mr-2" />
                Identifiants temporaires
              </ActionButton>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Data & Cache Settings */}
        <TabsContent value="data" transition="slide">
          <SettingsCard title="Données & Cache" icon={<Database className="w-5 h-5" />} delay={0}>
            <div className="space-y-6 animate-stagger-slide-up" style={{ animationDelay: '50ms' }}>
              <SectionHeader title="Zone d'Analyse par Défaut" icon={<MapPin className="w-5 h-5" />} delay={0} />
              <div className="grid grid-cols-4 gap-2 animate-slide-up" style={{ animationDelay: '60ms' }}>
                <SettingRow label="Ouest" delay={0}>
                  <Input type="number" step="0.001" value={dataSettings.defaultBbox[0]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [parseFloat(e.target.value), dataSettings.defaultBbox[1], dataSettings.defaultBbox[2], dataSettings.defaultBbox[3]]})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Sud" delay={60}>
                  <Input type="number" step="0.001" value={dataSettings.defaultBbox[1]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [dataSettings.defaultBbox[0], parseFloat(e.target.value), dataSettings.defaultBbox[2], dataSettings.defaultBbox[3]]})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Est" delay={120}>
                  <Input type="number" step="0.001" value={dataSettings.defaultBbox[2]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [dataSettings.defaultBbox[0], dataSettings.defaultBbox[1], parseFloat(e.target.value), dataSettings.defaultBbox[3]]})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Nord" delay={180}>
                  <Input type="number" step="0.001" value={dataSettings.defaultBbox[3]} onChange={(e) => setDataSettings({...dataSettings, defaultBbox: [dataSettings.defaultBbox[0], dataSettings.defaultBbox[1], dataSettings.defaultBbox[2], parseFloat(e.target.value)]})} className="hover-lift" />
                </SettingRow>
              </div>

              <SectionHeader title="Plage de Dates par Défaut" icon={<Calendar className="w-5 h-5" />} delay={240} />
              <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <SettingRow label="Date de début" delay={0}>
                  <Input type="date" value={dataSettings.defaultStartDate} onChange={(e) => setDataSettings({...dataSettings, defaultStartDate: e.target.value})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Date de fin" delay={60}>
                  <Input type="date" value={dataSettings.defaultEndDate} onChange={(e) => setDataSettings({...dataSettings, defaultEndDate: e.target.value})} className="hover-lift" />
                </SettingRow>
              </div>

              <SectionHeader title="Configuration du Cache" icon={<HardDrive className="w-5 h-5" />} delay={360} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '420ms' }}>
                <SettingRow delay={0}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input
                      type="checkbox"
                      checked={dataSettings.cacheEnabled}
                      onChange={(e) => setDataSettings({...dataSettings, cacheEnabled: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Activer le cache</span>
                  </label>
                </SettingRow>
                <SettingRow label="Durée du cache (heures)" delay={60}>
                  <Input type="number" min="1" max="168" value={dataSettings.cacheDuration} onChange={(e) => setDataSettings({...dataSettings, cacheDuration: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Taille max cache (Go)" delay={120}>
                  <Input type="number" min="1" max="50" value={advancedSettings.maxCacheSize} onChange={(e) => setAdvancedSettings({...advancedSettings, maxCacheSize: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Téléchargements max simultanés" delay={180}>
                  <Input type="number" min="1" max="10" value={dataSettings.maxConcurrentDownloads} onChange={(e) => setDataSettings({...dataSettings, maxConcurrentDownloads: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
              </div>

              <SectionHeader title="Actualisation Automatique" icon={<RefreshCw className="w-5 h-5" />} delay={480} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '540ms' }}>
                <SettingRow delay={0}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input
                      type="checkbox"
                      checked={dataSettings.autoRefresh}
                      onChange={(e) => setDataSettings({...dataSettings, autoRefresh: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Activer l'actualisation auto</span>
                  </label>
                </SettingRow>
                <SettingRow label="Intervalle (heures)" delay={60}>
                  <Input type="number" min="1" max="24" value={dataSettings.refreshInterval} onChange={(e) => setDataSettings({...dataSettings, refreshInterval: parseInt(e.target.value)})} disabled={!dataSettings.autoRefresh} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Résolution préférée" delay={120}>
                  <Select
                    value={dataSettings.preferredResolution}
                    onChange={(e) => setDataSettings({...dataSettings, preferredResolution: e.target.value})}
                    options={[
                      { value: 'native', label: 'Native (plus haute)' },
                      { value: '1km', label: '1 km' },
                      { value: '500m', label: '500 m' },
                      { value: '250m', label: '250 m' },
                      { value: '30m', label: '30 m (Landsat)' },
                    ]}
                    className="hover-lift"
                  />
                </SettingRow>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 animate-fade-in" style={{ animationDelay: '600ms' }}>
              <ActionButton onClick={() => handleSave('data')} loading={saving === 'data'} delay={0}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres de données
              </ActionButton>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Map Settings */}
        <TabsContent value="map" transition="slide">
          <SettingsCard title="Paramètres de la Carte" icon={<Globe className="w-5 h-5" />} delay={0}>
            <div className="space-y-6 animate-stagger-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '60ms' }}>
                <SettingRow label="Fond de carte par défaut" delay={0}>
                  <Select
                    value={mapSettings.defaultBasemap}
                    onChange={(e) => setMapSettings({...mapSettings, defaultBasemap: e.target.value})}
                    options={[
                      { value: 'satellite', label: 'Satellite' },
                      { value: 'terrain', label: 'Relief' },
                      { value: 'streets', label: 'Rues' },
                      { value: 'hybrid', label: 'Hybride' },
                    ]}
                    className="hover-lift"
                  />
                </SettingRow>
                <SettingRow label="Niveau de zoom par défaut" delay={60}>
                  <Input type="number" min="1" max="20" value={mapSettings.defaultZoom} onChange={(e) => setMapSettings({...mapSettings, defaultZoom: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Centre par défaut (Lon)" delay={120}>
                  <Input type="number" step="0.001" value={mapSettings.defaultCenter[0]} onChange={(e) => setMapSettings({...mapSettings, defaultCenter: [parseFloat(e.target.value), mapSettings.defaultCenter[1]]})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Centre par défaut (Lat)" delay={180}>
                  <Input type="number" step="0.001" value={mapSettings.defaultCenter[1]} onChange={(e) => setMapSettings({...mapSettings, defaultCenter: [mapSettings.defaultCenter[0], parseFloat(e.target.value)]})} className="hover-lift" />
                </SettingRow>
              </div>

              <SectionHeader title="Options d'Affichage" icon={<Layers className="w-5 h-5" />} delay={240} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <SettingRow delay={0}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={mapSettings.showFieldBoundaries} onChange={(e) => setMapSettings({...mapSettings, showFieldBoundaries: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Afficher les limites des champs</span>
                  </label>
                </SettingRow>
                <SettingRow delay={60}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={mapSettings.showLabels} onChange={(e) => setMapSettings({...mapSettings, showLabels: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Afficher les étiquettes</span>
                  </label>
                </SettingRow>
                <SettingRow delay={120}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={mapSettings.enableClustering} onChange={(e) => setMapSettings({...mapSettings, enableClustering: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Activer le regroupement</span>
                  </label>
                </SettingRow>
                <SettingRow label={`Opacité des couches: ${mapSettings.layerOpacity}%`} delay={180}>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="range" min="0" max="100" value={mapSettings.layerOpacity} onChange={(e) => setMapSettings({...mapSettings, layerOpacity: parseInt(e.target.value)})} className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                  </div>
                </SettingRow>
              </div>

              <SectionHeader title="Performance" icon={<Zap className="w-5 h-5" />} delay={360} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '420ms' }}>
                <SettingRow label="Max éléments affichés" delay={0}>
                  <Input type="number" min="1000" max="50000" value={mapSettings.maxFeatures} onChange={(e) => setMapSettings({...mapSettings, maxFeatures: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Taille cache tuiles (Mo)" delay={60}>
                  <Input type="number" min="50" max="1000" value={advancedSettings.tileCacheSize} onChange={(e) => setAdvancedSettings({...advancedSettings, tileCacheSize: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 animate-fade-in" style={{ animationDelay: '480ms' }}>
              <ActionButton onClick={() => handleSave('map')} loading={saving === 'map'} delay={0}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres carte
              </ActionButton>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" transition="slide">
          <SettingsCard title="Paramètres de Notification" icon={<Bell className="w-5 h-5" />} delay={0}>
            <div className="space-y-6 animate-stagger-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '60ms' }}>
                <SettingRow delay={0}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={notificationSettings.emailAlerts} onChange={(e) => setNotificationSettings({...notificationSettings, emailAlerts: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Activer les alertes par email</span>
                  </label>
                </SettingRow>
                <SettingRow delay={60}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={notificationSettings.weeklySummary} onChange={(e) => setNotificationSettings({...notificationSettings, weeklySummary: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Résumé hebdomadaire par email</span>
                  </label>
                </SettingRow>
              </div>

              <SectionHeader title="Types d'Alertes" icon={<AlertCircle className="w-5 h-5" />} delay={120} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '180ms' }}>
                {[
                  { key: 'waterStressAlerts', label: 'Alertes Stress Hydrique', icon: <Wifi className="w-4 h-4" /> },
                  { key: 'heatStressAlerts', label: 'Alertes Stress Thermique', icon: <Sun className="w-4 h-4" /> },
                  { key: 'frostAlerts', label: 'Alertes Gel', icon: <Moon className="w-4 h-4" /> },
                  { key: 'pestAlerts', label: 'Alertes Ravageurs/Maladies', icon: <AlertCircle className="w-4 h-4" /> },
                  { key: 'marketAlerts', label: 'Alertes Prix Marché', icon: <Mail className="w-4 h-4" /> },
                ].map((alert, idx) => (
                  <SettingRow key={alert.key} delay={idx * 60}>
                    <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                      <input type="checkbox" checked={notificationSettings[alert.key as keyof NotificationSettings] as boolean} onChange={(e) => setNotificationSettings({...notificationSettings, [alert.key]: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      <span className="text-sm flex items-center gap-1">{alert.icon}{alert.label}</span>
                    </label>
                  </SettingRow>
                ))}
              </div>

              <SectionHeader title="Seuils d'Alerte" icon={<SlidersHorizontal className="w-5 h-5" />} delay={360} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '420ms' }}>
                <SettingRow label="Niveau d'alerte minimum" delay={0}>
                  <Select
                    value={notificationSettings.alertThreshold}
                    onChange={(e) => setNotificationSettings({...notificationSettings, alertThreshold: e.target.value as NotificationSettings['alertThreshold']})}
                    options={[
                      { value: 'info', label: 'Info (Tous)' },
                      { value: 'warning', label: 'Avertissement & Critique' },
                      { value: 'critical', label: 'Critique seulement' },
                    ]}
                    className="hover-lift"
                  />
                </SettingRow>
                <SettingRow label="Heures calmes début" delay={60}>
                  <Input type="time" value={notificationSettings.quietHoursStart} onChange={(e) => setNotificationSettings({...notificationSettings, quietHoursStart: e.target.value})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Heures calmes fin" delay={120}>
                  <Input type="time" value={notificationSettings.quietHoursEnd} onChange={(e) => setNotificationSettings({...notificationSettings, quietHoursEnd: e.target.value})} className="hover-lift" />
                </SettingRow>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 animate-fade-in" style={{ animationDelay: '480ms' }}>
              <ActionButton onClick={() => handleSave('notifications')} loading={saving === 'notifications'} delay={0}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les notifications
              </ActionButton>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" transition="slide">
          <SettingsCard title="Paramètres Avancés" icon={<Shield className="w-5 h-5" />} delay={0}>
            <div className="space-y-6 animate-stagger-slide-up" style={{ animationDelay: '50ms' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '60ms' }}>
                <SettingRow delay={0}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={advancedSettings.debugMode} onChange={(e) => setAdvancedSettings({...advancedSettings, debugMode: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Mode Debug</span>
                  </label>
                </SettingRow>
                <SettingRow delay={60}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={advancedSettings.enableTelemetry} onChange={(e) => setAdvancedSettings({...advancedSettings, enableTelemetry: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Activer la télémétrie</span>
                  </label>
                </SettingRow>
                <SettingRow delay={120}>
                  <label className="flex items-center gap-2 cursor-pointer animate-fade-in hover-lift">
                    <input type="checkbox" checked={advancedSettings.enableOfflineMode} onChange={(e) => setAdvancedSettings({...advancedSettings, enableOfflineMode: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm">Activer le mode hors ligne</span>
                  </label>
                </SettingRow>
              </div>

              <SectionHeader title="Réglages de Performance" icon={<Cog className="w-5 h-5" />} delay={180} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '240ms' }}>
                <SettingRow label="Niveau de log" delay={0}>
                  <Select
                    value={advancedSettings.logLevel}
                    onChange={(e) => setAdvancedSettings({...advancedSettings, logLevel: e.target.value})}
                    options={[
                      { value: 'debug', label: 'Debug' },
                      { value: 'info', label: 'Info' },
                      { value: 'warn', label: 'Avertissement' },
                      { value: 'error', label: 'Erreur' },
                    ]}
                    className="hover-lift"
                  />
                </SettingRow>
                <SettingRow label="Threads workers" delay={60}>
                  <Input type="number" min="1" max="16" value={advancedSettings.workerThreads} onChange={(e) => setAdvancedSettings({...advancedSettings, workerThreads: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Timeout API (secondes)" delay={120}>
                  <Input type="number" min="5" max="120" value={advancedSettings.apiTimeout} onChange={(e) => setAdvancedSettings({...advancedSettings, apiTimeout: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
                <SettingRow label="Tentatives de retry" delay={180}>
                  <Input type="number" min="0" max="10" value={advancedSettings.retryAttempts} onChange={(e) => setAdvancedSettings({...advancedSettings, retryAttempts: parseInt(e.target.value)})} className="hover-lift" />
                </SettingRow>
              </div>

              <SectionHeader title="Gestion des Données" icon={<Database className="w-5 h-5" />} delay={300} />
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="secondary" onClick={exportSettings}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter les réglages
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => importInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer un fichier JSON
                </ActionButton>
                <input ref={importInputRef} type="file" accept="application/json,.json" onChange={importSettings} className="hidden" aria-label="Importer un fichier de réglages JSON" />
                <ActionButton variant="ghost" onClick={resetSettings} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Réinitialiser les préférences
                </ActionButton>
              </div>

              <SectionHeader title="À propos" icon={<Info className="w-5 h-5" />} delay={420} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-stagger-slide-up" style={{ animationDelay: '480ms' }}>
                <div className="p-3 rounded-lg bg-gray-50 animate-fade-in">
                  <p className="font-medium text-gray-900">Field Shift</p>
                  <p className="text-gray-500">Version 1.0.0 (Beta)</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 animate-fade-in" style={{ animationDelay: '50ms' }}>
                  <p className="font-medium text-gray-900">NASA Space Apps 2026</p>
                  <p className="text-gray-500">Challenge: Field Shift</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <p className="font-medium text-gray-900">Stack Technique</p>
                  <p className="text-gray-500">React + FastAPI + NASA Earthdata</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 animate-fade-in" style={{ animationDelay: '150ms' }}>
                  <p className="font-medium text-gray-900">Licence</p>
                  <p className="text-gray-500">MIT</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 animate-fade-in" style={{ animationDelay: '540ms' }}>
              <ActionButton onClick={() => handleSave('advanced')} loading={saving === 'advanced'} delay={0}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder les paramètres avancés
              </ActionButton>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </AnimatedPage>
  )
}