/**
 * React hooks for Data Collection API integration.
 * Connects frontend to backend data collection endpoints.
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { api, type FarmResponse, type DataCollectionResponse as ApiDataCollectionResponse, type CollectionStatus as ApiCollectionStatus, type CollectionSummary as ApiCollectionSummary, type CollectionResult as ApiCollectionResult } from '../lib/api';
import { useFarmStore } from '../stores/farmStore';
import { useUIStore } from '../stores/uiStore';

// Types
export interface Farm {
  id: string;
  name: string;
  crop?: string;
  area?: string;
  location?: string;
  soilType?: string;
  geometry: GeoJSON.Geometry;
  centroid: { lat: number; lon: number };
  description?: string;
  crops_of_interest?: string[];
  createdAt: string;
  updatedAt: string;
  dataStatus?: 'pending' | 'collecting' | 'completed' | 'failed';
  lastCollectionAt?: string;
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

// Re-export API types with consistent naming
export type DataCollectionResponse = ApiDataCollectionResponse;
export type CollectionStatus = ApiCollectionStatus;
export type CollectionSummary = ApiCollectionSummary;
export type CollectionResult = ApiCollectionResult;

function mapFarmResponse(farm: FarmResponse): Farm {
  return {
    id: farm.id,
    name: farm.name,
    crop: farm.crops_of_interest?.[0],
    area: 'Unknown',
    location: farm.description,
    geometry: farm.geometry,
    centroid: farm.centroid,
    description: farm.description,
    crops_of_interest: farm.crops_of_interest,
    createdAt: farm.created_at,
    updatedAt: farm.updated_at,
    dataStatus: 'pending',
  };
}

// Type guards for status checking
export const isCollectionComplete = (status: string): boolean =>
  ['completed', 'partial_failure', 'completed_with_gaps'].includes(status);

export const isCollectionRunning = (status: string): boolean =>
  ['started', 'running', 'processing'].includes(status);

// API functions - using correct backend paths (baseURL already includes /api/v1)
const dataApi = {
  // Farms
  listFarms: () => api.get<FarmResponse[]>('/data/farms'),
  getFarm: (id: string) => api.get<FarmResponse>(`/data/farms/${id}`),
  createFarm: (farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt' | 'crop' | 'area' | 'location' | 'crops_of_interest' | 'description'> & {
    geometry: GeoJSON.Geometry;
    centroid: { lat: number; lon: number };
    crops_of_interest?: string[];
    description?: string;
  }) =>
    api.post<FarmResponse>('/data/farms', farm),
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

/**
 * Hook that syncs farms from backend to local store.
 * Use this on app initialization or when farms might have changed externally.
 */
export function useSyncFarms() {
  return useQuery({
    queryKey: ['farms', 'sync'],
    queryFn: async () => {
      return await dataApi.listFarms();
    },
    staleTime: 0, // Always fetch fresh on mount
  });
}

/**
 * Hook to create a farm and sync with both backend and local store.
 */
export function useCreateFarmWithStore() {
  const queryClient = useQueryClient();
  const createFarmFromAPI = useFarmStore(state => state.createFarmFromAPI);
  const { addToast } = useUIStore();

  // Input type for creating a farm (what the user provides)
  type CreateFarmInput = Omit<Farm, 'id' | 'createdAt' | 'updatedAt' | 'crop' | 'area' | 'location' | 'crops_of_interest' | 'description'> & {
    geometry: GeoJSON.Geometry;
    centroid: { lat: number; lon: number };
    crops_of_interest?: string[];
    description?: string;
  };

  return useMutation({
    mutationFn: async (data: CreateFarmInput) => {
      return await dataApi.createFarm(data);
    },
    onSuccess: (newFarmResponse) => {
      const newFarm = mapFarmResponse(newFarmResponse);
      createFarmFromAPI(newFarm);
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      addToast({ type: 'success', title: 'Farm created', message: `${newFarm.name} has been added` });
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Failed to create farm', message: error.message });
    },
  });
}

/**
 * Hook to delete a farm from both backend and local store.
 */
export function useDeleteFarmWithStore() {
  const queryClient = useQueryClient();
  const deleteFarmStore = useFarmStore(state => state.deleteFarm);
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: async (id: string) => {
      await dataApi.deleteFarm(id);
      return id;
    },
    onSuccess: (id) => {
      deleteFarmStore(id);
      queryClient.invalidateQueries({ queryKey: ['farms'] });
      addToast({ type: 'success', title: 'Farm deleted' });
    },
    onError: (error: any) => {
      addToast({ type: 'error', title: 'Failed to delete farm', message: error.message });
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
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useCollectionStatus(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: ['collectionStatus', collectionId],
    queryFn: () => dataApi.getCollectionStatus(collectionId),
    enabled: enabled && !!collectionId,
    refetchInterval: (query) => {
      const status = query.state.data?.overall_status;
      if (isCollectionComplete(status || '')) {
        return false;
      }
      return 5000;
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

/**
 * Hook for managing a farm's data collection workflow.
 * Returns the selected farm (if farmId provided) and a function to trigger collection.
 */
export function useFarmDataCollection(farmId: string | null) {
  const queryClient = useQueryClient();
  const triggerCollection = useTriggerCollection();

  const startCollection = async (
    startDate: string,
    endDate: string,
    cropsOfInterest?: string[]
  ): Promise<string> => {
    if (!farmId) throw new Error('No farm selected');

    const result = await triggerCollection.mutateAsync({
      farm_id: farmId,
      start_date: startDate,
      end_date: endDate,
      crops_of_interest: cropsOfInterest,
    });

    return result.collection_id;
  };

  return {
    triggerCollection: startCollection,
    triggerLoading: triggerCollection.isPending,
    triggerError: triggerCollection.error,
    isTriggering: triggerCollection.isPending,
  };
}

/**
 * Hook that handles the complete collection workflow:
 * 1. Trigger collection
 * 2. Poll status until complete
 * 3. Return summary when done
 */
export function useCollectionWorkflow() {
  const queryClient = useQueryClient();
  const triggerCollection = useTriggerCollection();

  const executeCollection = async (
    farmId: string,
    startDate: string,
    endDate: string,
    cropsOfInterest?: string[]
  ) => {
    if (!farmId) throw new Error('No farm selected');

    // Step 1: Trigger collection
    const result = await triggerCollection.mutateAsync({
      farm_id: farmId,
      start_date: startDate,
      end_date: endDate,
      crops_of_interest: cropsOfInterest,
    });

    const collectionId = result.collection_id;

    // Step 2: Poll for completion
    let status: CollectionStatus | null = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        status = await dataApi.getCollectionStatus(collectionId);
        if (isCollectionComplete(status.overall_status)) {
          break;
        }
      } catch (error) {
        console.error('Error polling collection status:', error);
      }

      attempts++;
    }

    if (!status || !isCollectionComplete(status.overall_status)) {
      throw new Error('Collection timed out or failed to complete');
    }

    // Step 3: Fetch summary
    const summary = await dataApi.getCollectionSummary(collectionId);

    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['farms'] });

    return { collectionId, status, summary };
  };

  return {
    executeCollection,
    isExecuting: triggerCollection.isPending,
    error: triggerCollection.error,
  };
}

// Hook for polling collection until complete (for UI components)
export function useCollectionPolling(collectionId: string | null) {
  const statusQuery = useCollectionStatus(collectionId || '', !!collectionId);
  const summaryQuery = useCollectionSummary(collectionId || '', !!collectionId);

  const isComplete = statusQuery.data ? isCollectionComplete(statusQuery.data.overall_status) : false;
  const isRunning = statusQuery.data ? isCollectionRunning(statusQuery.data.overall_status) : false;

  return {
    status: statusQuery.data,
    summary: summaryQuery.data,
    isLoading: statusQuery.isLoading || summaryQuery.isLoading,
    isComplete,
    isRunning,
    error: statusQuery.error || summaryQuery.error,
    refetch: () => {
      statusQuery.refetch();
      summaryQuery.refetch();
    },
  };
}

/**
 * Hook to get data source availability for a collection
 */
export function useDataSourceAvailability(collectionId: string | null) {
  const { status } = useCollectionPolling(collectionId);

  const availability = status?.sources ?
    Object.entries(status.sources).reduce((acc, [key, source]) => {
      acc[key] = source.status;
      return acc;
    }, {} as Record<string, string>) :
    {};

  const availableSources = status?.sources ?
    Object.entries(status.sources)
      .filter(([, source]) => source.status === 'success')
      .map(([key]) => key) :
    [];

  const failedSources = status?.sources ?
    Object.entries(status.sources)
      .filter(([, source]) => source.status === 'failed')
      .map(([key, source]) => ({ source: key, error: source.error })) :
    [];

  return {
    availability,
    availableSources,
    failedSources,
    totalSources: status?.summary?.total_sources || 0,
    successfulCount: status?.summary?.successful || 0,
    failedCount: status?.summary?.failed || 0,
    unavailableCount: status?.summary?.unavailable || 0,
  };
}