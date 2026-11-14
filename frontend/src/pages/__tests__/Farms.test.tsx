import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFarmsStore } from '../../store/farmsStore';
import Farms from '../Farms';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock API server
const server = setupServer(
  http.get('/api/v1/data/farms', () => {
    return HttpResponse.json([
      {
        id: 'farm-1',
        name: 'Test Farm 1',
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        centroid: { latitude: 0.5, longitude: 0.5 },
        description: 'A test farm',
        crops_of_interest: ['corn', 'wheat'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'farm-2',
        name: 'Test Farm 2',
        geometry: { type: 'Polygon', coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]] },
        centroid: { latitude: 2.5, longitude: 2.5 },
        description: 'Another test farm',
        crops_of_interest: ['soybean'],
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ]);
  }),

  http.post('/api/v1/data/farms', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'new-farm-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.delete('/api/v1/data/farms/:id', () => {
    return new HttpResponse(null, { status: 204 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test wrapper with providers
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

describe('Farms Page', () => {
  it('renders farm list', async () => {
    render(<Farms />, { wrapper: createWrapper() });

    // Wait for farms to load
    await waitFor(() => {
      expect(screen.getByText(/test farm 1/i)).toBeInTheDocument();
      expect(screen.getByText(/test farm 2/i)).toBeInTheDocument();
    });
  });

  it('shows farm details', async () => {
    render(<Farms />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/test farm 1/i)).toBeInTheDocument();
    });

    // Click on farm to see details
    fireEvent.click(screen.getByText(/test farm 1/i));

    await waitFor(() => {
      expect(screen.getByText(/a test farm/i)).toBeInTheDocument();
    });
  });

  it('can create new farm', async () => {
    render(<Farms />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/test farm 1/i)).toBeInTheDocument();
    });

    // Click add farm button
    fireEvent.click(screen.getByRole('button', { name: /add farm/i }));

    // Fill form
    fireEvent.change(screen.getByLabelText(/farm name/i), {
      target: { value: 'New Farm' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/new farm/i)).toBeInTheDocument();
    });
  });

  it('can delete farm', async () => {
    render(<Farms />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/test farm 1/i)).toBeInTheDocument();
    });

    // Click delete on first farm
    fireEvent.click(screen.getByRole('button', { name: /delete farm-1/i }));

    await waitFor(() => {
      expect(screen.queryByText(/test farm 1/i)).not.toBeInTheDocument();
    });
  });

  it('switches between map and list view', async () => {
    render(<Farms />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/test farm 1/i)).toBeInTheDocument();
    });

    // Switch to map view
    fireEvent.click(screen.getByRole('button', { name: /map view/i }));

    await waitFor(() => {
      expect(screen.getByTestId('farm-map')).toBeInTheDocument();
    });

    // Switch back to list view
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));

    await waitFor(() => {
      expect(screen.getByText(/test farm 1/i)).toBeInTheDocument();
    });
  });
});