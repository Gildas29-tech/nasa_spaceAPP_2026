# Field Shift - Major Refactoring Plan

## Goal
Remove ALL mock data, connect map→farm→monitoring workflow, implement real NASA data integration, global crop database, rotation planning, PDF/DOC reports, fix broken buttons, worldwide support, auto-refresh.

---

## Phase 1: Core Infrastructure & State Management

### 1.1 Create Farms Store (Zustand) - Connect to Backend API
- [ ] Create `src/stores/farmStore.ts` with Zustand
- [ ] Integrate with existing `useDataCollection.ts` hooks
- [ ] CRUD operations: create, read, update, delete farms
- [ ] Auto-fetch farms on app load
- [ ] Real-time sync with backend

### 1.2 Create Auth/Dark Mode Store
- [ ] Create `src/stores/uiStore.ts` for UI state
- [ ] Dark mode toggle with localStorage persistence
- [ ] Theme application to document.documentElement

### 1.3 Update API Hooks
- [ ] Extend `useDataCollection.ts` with farm management
- [ ] Add polling/auto-refresh for monitoring data
- [ ] Error handling and retry logic

---

## Phase 2: FieldMap → Farm Creation Workflow

### 2.1 Fix FieldMap Farm Creation
- [ ] Use Polygon geometry (not Point) for backend compatibility
- [ ] Call backend API to create farm on map click
- [ ] Show toast confirmation
- [ ] Auto-navigate to Farms page after creation

### 2.2 Integrate FieldMap into Farms Page
- [ ] Replace manual coordinate entry with map picker
- [ ] Show existing farms on map
- [ ] Click farm on map → view details

---

## Phase 3: Remove Mock Data - Page by Page

### 3.1 Dashboard.tsx
- [ ] Replace static stats with real farm data from store
- [ ] Real weather from NASA POWER API
- [ ] Recent activity from analysis history API
- [ ] Quick actions link to real pages

### 3.2 Farms.tsx
- [ ] Use farmStore for farm list
- [ ] Real data collection status from backend
- [ ] Map integration for location selection
- [ ] Remove all mockFarms array

### 3.3 Monitoring.tsx
- [ ] Use farmStore for farm selector
- [ ] Real alerts from NASA data (SMAP, MODIS, etc.)
- [ ] Real charts from collected data
- [ ] Auto-refresh polling

### 3.4 Crops.tsx
- [ ] Use farmStore for farm selector
- [ ] Global crop database from FAO/GAEZ
- [ ] Rotation planner uses real soil data

### 3.5 Reports.tsx
- [ ] Real diagnostic from GlobalFarmResilience (backend)
- [ ] Real analysis history from API
- [ ] PDF/DOC export implementation

### 3.6 SoilHealth.tsx
- [ ] Replace mockSoilHealthResult with real API call
- [ ] Use form data to call backend soil health endpoint

### 3.7 RotationPlanner.tsx
- [ ] Connect to backend rotation optimizer
- [ ] Use real soil data from NASA APIs
- [ ] Global crop database integration

### 3.8 YieldPredictor.tsx
- [ ] Connect to backend yield predictor
- [ ] Real ML model predictions

### 3.9 WaterStress.tsx
- [ ] Connect to backend water stress detector
- [ ] Real SMAP, OpenET, GPM data

### 3.10 GlobalFarmResilience.tsx
- [ ] Replace mock diagnostic with real backend call
- [ ] Real adaptation strategies based on data

### 3.11 AnalysisHistory.tsx
- [ ] Fetch from backend API
- [ ] Real analysis records

---

## Phase 4: Global Crop Database & Rotation Planning

### 4.1 Backend: Extend Crop Database
- [ ] Integrate FAO GAEZ crop data
- [ ] Add 100+ crops with global suitability
- [ ] Soil/climate requirements per crop

### 4.2 Frontend: Crop Database UI
- [ ] Searchable crop selector
- [ ] Filter by climate zone, soil type, water needs
- [ ] Suitability scoring based on real farm data

### 4.3 Rotation Planner Enhancement
- [ ] Use real soil data from NASA APIs
- [ ] Climate data from NASA POWER
- [ ] FAO GAEZ suitability matrices

---

## Phase 5: Report Generation (PDF/DOC)

### 5.1 Install PDF Library
- [ ] Add `jspdf` and `jspdf-autotable` or `pdfmake`
- [ ] Add `docx` for Word documents

### 5.2 Report Templates
- [ ] Diagnostic report template
- [ ] Soil health report template
- [ ] Yield prediction report template
- [ ] Water stress report template
- [ ] Rotation plan report template

### 5.3 Export Buttons
- [ ] Connect all "Export" buttons to real generation
- [ ] Support PDF and DOC formats
- [ ] Include charts as images

---

## Phase 6: Fix Broken Buttons & UI

### 6.1 Dark Mode Toggle
- [ ] Implement in Layout.tsx
- [ ] Persist to localStorage
- [ ] Apply Tailwind dark class

### 6.2 Filter Buttons
- [ ] Implement real filtering on all pages
- [ ] Connect to API query parameters

### 6.3 Export Buttons
- [ ] Connect to report generation
- [ ] Support multiple formats

### 6.4 Refresh/Actualiser Buttons
- [ ] Connect to real data refresh
- [ ] Show loading states

---

## Phase 7: Worldwide Support & Auto-Refresh

### 7.1 Worldwide Data Sources
- [ ] NASA-USDA SMAP (global) vs Crop-CASMA (CONUS only)
- [ ] OpenET (global via API)
- [ ] NASA POWER (global)
- [ ] MODIS/Landsat (global)
- [ ] GPM IMERG (global)
- [ ] ECOSTRESS (global)
- [ ] ICESat-2 (global)

### 7.2 Auto-Refresh System
- [ ] Configurable polling intervals
- [ ] Background data collection
- [ ] WebSocket or Server-Sent Events for real-time updates
- [ ] Cache invalidation on data change

---

## Phase 8: Testing & Verification

### 8.1 End-to-End Workflow Test
- [ ] Click map → create farm → appears in Farms → monitored in Monitoring
- [ ] Data collection triggers real NASA API calls
- [ ] Results appear in Monitoring charts/alerts
- [ ] Reports generate with real data

### 8.2 Cross-Browser/Device Testing
- [ ] MapLibre GL on mobile
- [ ] Dark mode persistence
- [ ] Offline mode handling

---

## Implementation Order

1. **Farms Store + UI Store** (foundation)
2. **FieldMap → Farm Creation** (core workflow)
3. **Farms Page + Map Integration** (central hub)
4. **Monitoring Page + Auto-refresh** (surveillance)
5. **Dashboard** (overview)
6. **Soil Health + Yield + Water Stress** (analysis pages)
7. **Rotation Planner + Crops** (planning)
8. **Reports + PDF/DOC Export** (output)
9. **Global Crop Database** (data)
10. **Dark Mode + Broken Buttons** (polish)
11. **Worldwide Support + Auto-refresh** (scale)
12. **E2E Testing** (verification)