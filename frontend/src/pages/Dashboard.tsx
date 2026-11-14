import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  Leaf,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  Map,
  Settings,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingUp as TrendingUpIcon,
  Cloud,
  Sun,
  Droplet,
  BarChart3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const quickActions = [
  {
    name: 'Soil Health Analysis',
    description: 'Analyze soil moisture, organic matter, and vegetation health using NASA data',
    icon: Leaf,
    href: '/soil-health',
    color: 'text-green-600 bg-green-100',
    badge: 'New',
  },
  {
    name: 'Rotation Planner',
    description: 'Optimize crop rotations for water conservation, soil health, and profitability',
    icon: GitBranch,
    href: '/rotation-planner',
    color: 'text-blue-600 bg-blue-100',
    badge: 'Popular',
  },
  {
    name: 'Yield Predictor',
    description: 'Predict crop yields with confidence intervals using ML models',
    icon: TrendingUp,
    href: '/yield-predictor',
    color: 'text-purple-600 bg-purple-100',
    badge: 'Beta',
  },
  {
    name: 'Water Stress Monitor',
    description: 'Early drought detection and irrigation scheduling alerts',
    icon: AlertTriangle,
    href: '/water-stress',
    color: 'text-orange-600 bg-orange-100',
    badge: 'Alert',
  },
  {
    name: 'Field Map',
    description: 'Visualize NASA Earth observation data on interactive maps',
    icon: Map,
    href: '/field-map',
    color: 'text-indigo-600 bg-indigo-100',
    badge: 'Map',
  },
  {
    name: 'Settings',
    description: 'Configure data sources, units, and preferences',
    icon: Settings,
    href: '/settings',
    color: 'text-gray-600 bg-gray-100',
    badge: null,
  },
]

const stats = [
  { label: 'Fields Monitored', value: '12', icon: Map, color: 'text-blue-600', trend: '+2 this month' },
  { label: 'Soil Health Score', value: '78', icon: Leaf, color: 'text-green-600', trend: '+5 vs last season' },
  { label: 'Water Stress Alerts', value: '3', icon: AlertTriangle, color: 'text-orange-600', trend: '1 critical' },
  { label: 'Yield Predictions', value: '24', icon: TrendingUpIcon, color: 'text-purple-600', trend: '87% accuracy' },
]

const recentActivity = [
  { action: 'Soil health analysis completed', field: 'North Field 1', time: '2 hours ago', type: 'success' },
  { action: 'Water stress alert triggered', field: 'South Field 3', time: '5 hours ago', type: 'warning' },
  { action: 'Rotation plan generated', field: 'East Field 2', time: '1 day ago', type: 'info' },
  { action: 'Yield prediction updated', field: 'West Field 1', time: '2 days ago', type: 'success' },
  { action: 'New field added', field: 'Central Field 4', time: '3 days ago', type: 'info' },
]

const weatherData = [
  { label: 'Temperature', value: '24°C', icon: Sun, unit: 'Feels like 26°C', color: 'text-orange-600' },
  { label: 'Humidity', value: '65%', icon: Droplet, unit: 'Dew point 17°C', color: 'text-blue-600' },
  { label: 'Precipitation (7d)', value: '12mm', icon: Cloud, unit: '30% below normal', color: 'text-green-600' },
  { label: 'Soil Moisture', value: '0.28 m³/m³', icon: Droplet, unit: '45th percentile', color: 'text-cyan-600' },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your fields and NASA Earth observation insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-2">{stat.trend}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.color.replace('text-', 'bg-').replace('600', '100'))}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" onChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fields">My Fields</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <Card key={action.name} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-xl', action.color)}>
                          <action.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{action.name}</h3>
                            {action.badge && (
                              <Badge variant="default" className="text-xs">{action.badge}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                        </div>
                      </div>
                      <Link
                        to={action.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-4 group-hover:underline"
                      >
                        Get Started
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Weather & Recent Activity */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    Current Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {weatherData.map((w) => (
                      <div key={w.label} className="p-4 rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <w.icon className={cn('w-5 h-5', w.color || 'text-gray-600')} />
                          <span className="text-sm text-gray-500">{w.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{w.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{w.unit}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {recentActivity.map((activity, i) => (
                      <div
                        key={i}
                        className="p-4 hover:bg-gray-50 flex items-center gap-4"
                      >
                        <div
                          className={cn(
                            'p-2 rounded-full',
                            activity.type === 'success' && 'bg-green-100 text-green-600',
                            activity.type === 'warning' && 'bg-orange-100 text-orange-600',
                            activity.type === 'info' && 'bg-blue-100 text-blue-600'
                          )}
                        >
                          {activity.type === 'success' && <CheckCircle className="w-5 h-5" />}
                          {activity.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                          {activity.type === 'info' && <BarChart3 className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.field} • {activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fields">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Fields</h2>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'North Field 1', crop: 'Corn', area: '45 ha', health: 82, status: 'Good' },
                { name: 'South Field 3', crop: 'Soybean', area: '32 ha', health: 78, status: 'Warning' },
                { name: 'East Field 2', crop: 'Wheat', area: '28 ha', health: 85, status: 'Good' },
                { name: 'West Field 1', crop: 'Corn', area: '52 ha', health: 72, status: 'Attention' },
                { name: 'Central Field 4', crop: 'Alfalfa', area: '18 ha', health: 90, status: 'Excellent' },
              ].map((field, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{field.name}</h3>
                        <p className="text-sm text-gray-500">{field.crop} • {field.area}</p>
                      </div>
                      <Badge
                        variant={
                          field.status === 'Excellent' ? 'success' :
                          field.status === 'Good' ? 'success' :
                          field.status === 'Warning' ? 'warning' : 'danger'
                        }
                      >
                        {field.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-600">Soil Health</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900">{field.health}</span>
                    </div>
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${field.health}%` }}
                      />
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1">Analyze</Button>
                      <Button variant="ghost" size="sm" className="flex-1">Plan</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <div className="space-y-3">
              {[
                { level: 'critical', title: 'Severe Water Stress', field: 'South Field 3', time: '2 hours ago', desc: 'Root zone moisture at 15th percentile. Irrigation recommended within 24 hours.' },
                { level: 'warning', title: 'Moderate Heat Stress', field: 'North Field 1', time: '5 hours ago', desc: '5 consecutive days >35°C. Monitor for pollination impact.' },
                { level: 'info', title: 'Rotation Window Opening', field: 'East Field 2', time: '1 day ago', desc: 'Optimal planting window for winter wheat in 7-10 days.' },
              ].map((alert, i) => (
                <Card key={i} className="border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-2 rounded-full flex-shrink-0',
                        alert.level === 'critical' && 'bg-red-100 text-red-600',
                        alert.level === 'warning' && 'bg-orange-100 text-orange-600',
                        alert.level === 'info' && 'bg-blue-100 text-blue-600'
                      )}>
                        {alert.level === 'critical' && <AlertTriangle className="w-5 h-5" />}
                        {alert.level === 'warning' && <AlertTriangle className="w-5 h-5" />}
                        {alert.level === 'info' && <CheckCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          <Badge
                            variant={
                              alert.level === 'critical' ? 'danger' :
                              alert.level === 'warning' ? 'warning' : 'info'
                            }
                          >
                            {alert.level}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500 ml-auto">{alert.time}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 ml-9">{alert.desc}</p>
                    <div className="mt-3 flex gap-2 ml-9">
                      <Button variant="ghost" size="sm">View Details</Button>
                      <Button variant="ghost" size="sm">Dismiss</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Need to import Tabs components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { Plus, Download } from 'lucide-react'