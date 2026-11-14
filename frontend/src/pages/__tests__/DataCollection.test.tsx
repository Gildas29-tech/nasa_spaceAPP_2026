import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock API server for data collection
const server = setupServer(
  http.get('/api/v1/data/farms', () => {
    return HttpResponse.json([
      {
        id: 'farm-1',
        name: 'Test Farm',
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        centroid: { latitude: 0.5, longitude: 0.5 },
        crops_of_interest: ['corn', 'wheat'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.post('/api/v1/data/collect', () => {
    return HttpResponse.json({
      collection_id: 'collection-123',
      farm_id: 'farm-1',
      farm_name: 'Test Farm',
      period_start: '2024-01-01',
      period_end: '2024-12-31',
      status: 'started',
      message: 'Data collection started in background',
    });
  }),

  http.get('/api/v1/data/collect/:id/status', ({ params }) => {
    return HttpResponse.json({
      collection_id: params.id,
      farm_id: 'farm-1',
      farm_name: 'Test Farm',
      period: { start: '2024-01-01', end: '2024-12-31' },
      overall_status: 'completed',
      sources: {
        nasa_power: { source: 'NASA POWER', status: 'success', has_data: true, error: null },
        sentinel2: { source: 'Sentinel-2', status: 'success', has_data: true, error: null },
        gpm: { source: 'GPM IMERG', status: 'unavailable', has_data: false, error: 'Not implemented' },
        smap: { source: 'SMAP', status: 'unavailable', has_data: false, error: 'Not implemented' },
        landsat: { source: 'Landsat', status: 'success', has_data: true, error: null },
        gaez: { source: 'FAO GAEZ', status: 'unavailable', has_data: false, error: 'Not implemented' },
      },
      summary: {
        total_sources: 6,
        successful: 3,
        failed: 0,
        unavailable: 3,
      },
      collected_at: new Date().toISOString(),
    });
  }),

  http.get('/api/v1/data/collect/:id/summary', ({ params }) => {
    return HttpResponse.json({
      collection_id: params.id,
      farm_name: 'Test Farm',
      period: { start: '2024-01-01', end: '2024-12-31' },
      data_availability: {
        nasa_power: 'success',
        sentinel2: 'success',
        gpm: 'unavailable',
        smap: 'unavailable',
        landsat: 'success',
        gaez: 'unavailable',
      },
      key_metrics: {
        climate: {
          avg_temp_c: 15.5,
          total_precip_mm: 850,
          avg_humidity: 65,
          avg_radiation_mj_m2: 18.5,
        },
        vegetation: {
          latest_acquisition: '2024-11-15',
          cloud_cover: 5,
        },
        landsat: {
          latest_acquisition: '2024-11-10',
          cloud_cover: 10,
        },
      },
    });
  }),

  http.get('/api/v1/data/sources', () => {
    return HttpResponse.json({
      sources: [
        { id: 'nasa_power', name: 'NASA POWER', description: 'Climate data', status: 'operational', auth_required: false },
        { id: 'sentinel2', name: 'Sentinel-2', description: 'Optical imagery', status: 'operational', auth_required: true },
        { id: 'gpm', name: 'GPM IMERG', description: 'Precipitation', status: 'placeholder', auth_required: true },
        { id: 'smap', name: 'SMAP', description: 'Soil moisture', status: 'placeholder', auth_required: true },
        { id: 'landsat', name: 'Landsat 8/9', description: 'Surface reflectance', status: 'operational', auth_required: true },
        { id: 'gaez', name: 'FAO GAEZ', description: 'Crop suitability', status: 'placeholder', auth_required: false },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// We'll test the data collection functionality via a component that uses the API
// Since the actual page components are complex, we test the API hooks directly
import { useFarmsStore } from '../../store/farmsStore';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Data Collection API Integration', () => {
  it('can fetch available data sources', async () => {
    const { result } = renderHook(() => useDataSources(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.sources).toHaveLength(6);
    expect(result.current.data?.sources[0].id).toBe('nasa_power');
  });

  it('can trigger data collection for a farm', async () => {
    const { result } = renderHook(() => useDataCollection(), { wrapper: createWrapper() });

    // First create a farm in the store
    useFarmsStore.getState().setFarms([
      { id: 'farm-1', name: 'Test Farm', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }, centroid: { latitude: 0.5, longitude: 0.5 }, crops_of_interest: ['corn'] }
    ]);

    const collection = await result.current.triggerCollection({
      farm_id: 'farm-1',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    });

    expect(collection.collection_id).toBe('collection-123');
    expect(collection.status).toBe('started');
  });

  it('can poll collection status', async () => {
    const { result } = renderHook(() => useCollectionStatus('collection-123'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.overall_status).toBe('completed');
    expect(result.current.data?.summary.successful).toBe(3);
  });

  it('can fetch collection summary for dashboard', async () => {
    const { result } = renderHook(() => useCollectionSummary('collection-123'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.key_metrics.climate).toBeDefined();
    expect(result.current.data?.key_metrics.vegetation).toBeDefined();
    expect(result.current.data?.data_availability.nasa_power).toBe('success');
  });
});

// Mock hooks for testing - these would be in the actual hooks file
function useDataSources() {
  // This would use useQuery from TanStack Query
  return { data: null, isSuccess: false };
}

function useDataCollection() {
  return { triggerCollection: async () => ({ collection_id: '', status: '' }) };
}

function useCollectionStatus(id: string) {
  return { data: null, isSuccess: false };
}

function useCollectionSummary(id: string) {
  return { data: null, isSuccess: false };
}

// Need to import renderHook
import { renderHook } from '@testing-library/react';