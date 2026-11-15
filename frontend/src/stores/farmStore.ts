import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, type FarmResponse } from '../lib/api'

// Export Farm type for use in components
export interface Farm {
  id: string
  name: string
  crop?: string
  area?: string
  location?: string
  soilType?: string
  geometry: GeoJSON.Geometry
  centroid: { lat: number; lon: number }
  description?: string
  crops_of_interest?: string[]
  createdAt: string
  updatedAt: string
  dataStatus?: 'pending' | 'collecting' | 'completed' | 'failed'
  lastCollectionAt?: string
}

export interface CreateFarmData {
  name: string
  crop: string
  area: string
  location: string
  soilType?: string
  description?: string
  geometry: GeoJSON.Polygon
  centroid: { lat: number; lon: number }
}

// Type for createFarm that accepts the mapped Farm type from API
export type CreateFarmInput = CreateFarmData | Farm

function mapFarmResponse(farm: FarmResponse): Farm {
  // Handle both backend (latitude/longitude) and frontend (lat/lon) formats
  const centroid = farm.centroid
  const lat = 'latitude' in centroid ? centroid.latitude : centroid.lat
  const lon = 'longitude' in centroid ? centroid.longitude : centroid.lon

  return {
    id: farm.id,
    name: farm.name,
    crop: farm.crops_of_interest?.[0],
    area: 'Unknown',
    location: farm.description,
    geometry: farm.geometry,
    centroid: { lat, lon },
    description: farm.description,
    crops_of_interest: farm.crops_of_interest,
    createdAt: farm.created_at,
    updatedAt: farm.updated_at,
    dataStatus: 'pending',
  }
}

interface FarmState {
  farms: Farm[]
  selectedFarmId: string | null
  loading: boolean
  error: string | null

  // Actions
  fetchFarms: () => Promise<void>
  createFarm: (data: CreateFarmInput) => Promise<Farm | null>
  createFarmFromAPI: (farm: Farm) => void // For adding farm from API response
  updateFarm: (id: string, data: Partial<Farm>) => Promise<Farm | null>
  deleteFarm: (id: string) => Promise<boolean>
  selectFarm: (id: string | null) => void
  getSelectedFarm: () => Farm | null
  setFarmDataStatus: (id: string, status: Farm['dataStatus']) => void
  clearError: () => void
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      farms: [],
      selectedFarmId: null,
      loading: false,
      error: null,

      fetchFarms: async () => {
        set({ loading: true, error: null })
        try {
          const farms = await api.get<FarmResponse[]>('/data/farms')
          set({ farms: farms.map(mapFarmResponse), loading: false })
        } catch (err: any) {
          set({ error: err.response?.data?.detail || 'Failed to fetch farms', loading: false })
        }
      },

      createFarm: async (data) => {
        // If data is already a Farm (from API response), just add it to state
        if ('id' in data && 'createdAt' in data) {
          const farm = data as Farm
          set(state => ({
            farms: [...state.farms, farm],
            selectedFarmId: farm.id,
            loading: false
          }))
          return farm
        }

        // Otherwise, it's CreateFarmData - call the API
        set({ loading: true, error: null })
        try {
          // Transform CreateFarmData to backend format
          const backendData = {
            name: data.name,
            geometry: data.geometry,
            centroid: { latitude: data.centroid.lat, longitude: data.centroid.lon },
            description: data.description || `${data.crop} farm at ${data.location}`,
            crops_of_interest: [data.crop, ...(data.crop !== 'maize' ? ['maize'] : []), 'wheat', 'soybean'].filter(Boolean),
          }
          const farm = await api.post<FarmResponse>('/data/farms', backendData)
          const newFarm = mapFarmResponse(farm)
          set(state => ({
            farms: [...state.farms, newFarm],
            selectedFarmId: newFarm.id,
            loading: false
          }))
          return newFarm
        } catch (err: any) {
          set({ error: err.response?.data?.detail || 'Failed to create farm', loading: false })
          return null
        }
      },

      createFarmFromAPI: (farm) => {
        set(state => ({
          farms: [...state.farms, farm],
          selectedFarmId: farm.id,
        }))
      },

      updateFarm: async (id, data) => {
        set({ loading: true, error: null })
        try {
          const farm = await api.put<FarmResponse>(`/data/farms/${id}`, data)
          const updatedFarm = mapFarmResponse(farm)
          set(state => ({
            farms: state.farms.map(f => f.id === id ? updatedFarm : f),
            loading: false
          }))
          return updatedFarm
        } catch (err: any) {
          set({ error: err.response?.data?.detail || 'Failed to update farm', loading: false })
          return null
        }
      },

      deleteFarm: async (id) => {
        set({ loading: true, error: null })
        try {
          await api.delete(`/data/farms/${id}`)
          set(state => ({
            farms: state.farms.filter(f => f.id !== id),
            selectedFarmId: state.selectedFarmId === id ? null : state.selectedFarmId,
            loading: false
          }))
          return true
        } catch (err: any) {
          set({ error: err.response?.data?.detail || 'Failed to delete farm', loading: false })
          return false
        }
      },

      selectFarm: (id) => {
        set({ selectedFarmId: id })
      },

      getSelectedFarm: () => {
        const { farms, selectedFarmId } = get()
        return farms.find(f => f.id === selectedFarmId) || farms[0] || null
      },

      setFarmDataStatus: (id, status) => {
        set(state => ({
          farms: state.farms.map(f =>
            f.id === id ? { ...f, dataStatus: status, lastCollectionAt: status === 'completed' ? new Date().toISOString() : f.lastCollectionAt } : f
          )
        }))
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'farm-store',
      partialize: (state) => ({
        selectedFarmId: state.selectedFarmId
      }),
    }
  )
)