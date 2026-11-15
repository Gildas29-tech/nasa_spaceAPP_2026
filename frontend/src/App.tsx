import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
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
import { useUIStore } from './stores/uiStore'

function App() {
  const darkMode = useUIStore(state => state.darkMode)

  // Apply dark mode class to document element on mount and when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
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
  )
}

export default App