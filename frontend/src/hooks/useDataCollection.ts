/**
 * React hooks for Data Collection API integration.
 * Connects frontend to backend data collection endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Types
export interface Farm {
  id: string;
  name: string;
  geometry: GeoJSON.Geometry;
  centroid: { latitude: number; longitude: number };
  description?: string;
  crops_of_interest?: string[];
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  temporal_resolution?: string;
  spatial_resolution?: string;
  parameters?: string[];
  bands?: string[];
  indices?: string[];
  products?: string[];
  crops?: number;
  layers?: string[];
  auth_required: boolean;
  status: string;
}

export interface DataCollectionRequest {
  farm_id: string;
  start_date: string;
  end_date: string;
  crops_of_interest?: string[];
}

export interface DataCollectionResponse {
  collection_id: string;
  farm_id: string;
  farm_name: string;
  period_start: string;
  period_end: string;
  status: string;
  message: string;
}

export interface CollectionStatus {
  collection_id: string;
  farm_id: string;
  farm_name: string;
  period: { start: string; end: string };
  overall_status: string;
  sources: Record<string, {
    source: string;
    status: string;
    has_data: boolean;
    error: string | null;
  }>;
  summary: {
    total_sources: number;
    successful: number;
    failed: number;
    unavailable: number;
  };
  collected_at: string;
}

export interface CollectionSummary {
  collection_id: string;
  farm_name: string;
  period: { start: string; end: string };
  data_availability: Record<string, string>;
  key_metrics: {
    climate?: {
      avg_temp_c?: number;
      total_precip_mm?: number;
      avg_humidity?: number;
      avg_radiation_mj_m2?: number;
    };
    vegetation?: {
      latest_acquisition?: string;
      cloud_cover?: number;
    };
    precipitation?: { source: string; note: string };
    soil_moisture?: { source: string; note: string };
    landsat?: {
      latest_acquisition?: string;
      cloud_cover?: number;
    };
    crop_suitability?: { top_crops: string[]; note: string };
  };
}

export interface CollectionResult {
  farm_id: string;
  farm_name: string;
  geometry: GeoJSON.Geometry;
  period: { start: string; end: string };
  sources: Record<string, {
    source: string;
    status: string;
    data: any;
    error: string | null;
    metadata: Record<string, any>;
    collected_at: string;
  }>;
  summary: {
    total_sources: number;
    successful: number;
    failed: number;
    unavailable: number;
  };
  collected_at: string;
}

// API functions
const dataApi = {
  // Farms
  listFarms: () => api.get<Farm[]>('/data/farms'),
  getFarm: (id: string) => api.get<Farm>(`/data/farms/${id}`),
  createFarm: (farm: Omit<Farm, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<Farm>('/data/farms', farm),
  deleteFarm: (id: string) => api.delete(`/data/farms/${id}`),

  // Data Sources
  getDataSources: () => api.get<{ sources: DataSource[] }>('/data/sources'),

  // Data Collection
  triggerCollection: (request: DataCollectionRequest) =>
    api.post<DataCollectionResponse>('/data/collect', request),
  getCollectionStatus: (id: string) => api.get<CollectionStatus>(`/data/collect/${id}/status`),
  getCollectionResult: (id: string) => api.get<CollectionResult>(`/data/collect/${id}`),
  getCollectionSummary: (id: string) => api.get<CollectionSummary>(`/data/collect/${id}/summary`),
};

// Hooks

export function useFarms() {
  return useQuery({
    queryKey: ['farms'],
    queryFn: dataApi.listFarms,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFarm(id: string) {
  return useQuery({
    queryKey: ['farm', id],
    queryFn: () => dataApi.getFarm(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dataApi.createFarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useDeleteFarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dataApi.deleteFarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
  });
}

export function useDataSources() {
  return useQuery({
    queryKey: ['dataSources'],
    queryFn: dataApi.getDataSources,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useTriggerCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dataApi.triggerCollection,
    onSuccess: (data) => {
      // Invalidate collections list if we have one
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      // Optionally start polling for status
      return data;
    },
  });
}

export function useCollectionStatus(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: ['collectionStatus', collectionId],
    queryFn: () => dataApi.getCollectionStatus(collectionId),
    enabled: enabled && !!collectionId,
    refetchInterval: (query) => {
      // Poll every 5 seconds while status is not final
      const status = query.state.data?.overall_status;
      if (status === 'completed' || status === 'partial_failure' || status === 'completed_with_gaps') {
        return false; // Stop polling
      }
      return 5000; // Poll every 5 seconds
    },
    staleTime: 0,
  });
}

export function useCollectionResult(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: ['collectionResult', collectionId],
    queryFn: () => dataApi.getCollectionResult(collectionId),
    enabled: enabled && !!collectionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollectionSummary(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: ['collectionSummary', collectionId],
    queryFn: () => dataApi.getCollectionSummary(collectionId),
    enabled: enabled && !!collectionId,
    staleTime: 5 * 60 * 1000,
  });
}

// Combined hook for full collection workflow
export function useDataCollection(farmId: string | null) {
  const queryClient = useQueryClient();
  const triggerCollection = useTriggerCollection();
  const farms = useFarms();

  const startCollection = async (startDate: string, endDate: string, cropsOfInterest?: string[]) => {
    if (!farmId) throw new Error('No farm selected');

    const result = await triggerCollection.mutateAsync({
      farm_id: farmId,
      start_date: startDate,
      end_date: endDate,
      crops_of_interest: cropsOfInterest,
    });

    // Return collection ID for polling
    return result.collection_id;
  };

  return {
    farms: farms.data || [],
    farmsLoading: farms.isLoading,
    triggerCollection: startCollection,
    triggerLoading: triggerCollection.isPending,
    triggerError: triggerCollection.error,
  };
}

// Hook for polling collection until complete
export function useCollectionPolling(collectionId: string | null) {
  const statusQuery = useCollectionStatus(collectionId || '', !!collectionId);
  const summaryQuery = useCollectionSummary(collectionId || '', !!collectionId);

  const isComplete = statusQuery.data?.overall_status === 'completed' ||
                     statusQuery.data?.overall_status === 'partial_failure' ||
                     statusQuery.data?.overall_status === 'completed_with_gaps';

  return {
    status: statusQuery.data,
    summary: summaryQuery.data,
    isLoading: statusQuery.isLoading || summaryQuery.isLoading,
    isComplete,
    error: statusQuery.error || summaryQuery.error,
    refetch: () => {
      statusQuery.refetch();
      summaryQuery.refetch();
    },
  };
}