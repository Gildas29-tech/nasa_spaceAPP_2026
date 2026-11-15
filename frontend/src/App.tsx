import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Farms from './pages/Farms'
import Monitoring from './pages/Monitoring'
import Crops from './pages/Crops'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import SoilHealth from './pages/SoilHealth'
import RotationPlanner from './pages/RotationPlanner'
import YieldPredictor from './pages/YieldPredictor'
import WaterStress from './pages/WaterStress'
import FieldMap from './pages/FieldMap'
import { AuthProvider } from './stores/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="farms" element={<Farms />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="crops" element={<Crops />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="soil-health" element={<SoilHealth />} />
            <Route path="rotation-planner" element={<RotationPlanner />} />
            <Route path="yield-predictor" element={<YieldPredictor />} />
            <Route path="water-stress" element={<WaterStress />} />
            <Route path="field-map" element={<FieldMap />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App