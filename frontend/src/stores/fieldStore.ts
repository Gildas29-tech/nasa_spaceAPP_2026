import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Field {
  id: string
  name: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  area_ha: number
  crop_history: string[]
  soil_type?: string
  soil_ph?: number
  organic_matter?: number
  irrigation_type?: 'none' | 'drip' | 'sprinkler' | 'flood' | 'center_pivot'
  created_at: string
  updated_at: string
}

interface FieldState {
  fields: Field[]
  activeFieldId: string | null
  addField: (field: Omit<Field, 'id' | 'created_at' | 'updated_at'>) => Field
  updateField: (id: string, updates: Partial<Field>) => void
  deleteField: (id: string) => void
  setActiveField: (id: string | null) => void
  getActiveField: () => Field | null
}

export const useFieldStore = create<FieldState>()(
  persist(
    (set, get) => ({
      fields: [],
      activeFieldId: null,

      addField: (fieldData) => {
        const newField: Field = {
          ...fieldData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set((state) => ({
          fields: [...state.fields, newField],
          activeFieldId: newField.id,
        }))
        return newField
      },

      updateField: (id, updates) => {
        set((state) => ({
          fields: state.fields.map((f) =>
            f.id === id ? { ...f, ...updates, updated_at: new Date().toISOString() } : f
          ),
        }))
      },

      deleteField: (id) => {
        set((state) => ({
          fields: state.fields.filter((f) => f.id !== id),
          activeFieldId: state.activeFieldId === id ? null : state.activeFieldId,
        }))
      },

      setActiveField: (id) => {
        set({ activeFieldId: id })
      },

      getActiveField: () => {
        const { fields, activeFieldId } = get()
        return fields.find((f) => f.id === activeFieldId) || null
      },
    }),
    {
      name: 'fieldshift-fields',
    }
  )
)