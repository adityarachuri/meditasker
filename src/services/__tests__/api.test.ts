import { apiClient, queryClient } from '../api';
import { sessionService } from '../sessionService';

// Mock fetch
global.fetch = jest.fn();

// Mock sessionService
jest.mock('../sessionService', () => ({
  sessionService: {
    getToken: jest.fn(() => 'mock-token')
  }
}));

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should make GET requests with auth token', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    });

    await apiClient.get('/test-endpoint');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token'
        })
      })
    );
  });

  it('should make POST requests with correct body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    });

    const testData = { name: 'Test', value: 123 };
    await apiClient.post('/test-endpoint', testData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(testData),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        })
      })
    );
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(apiClient.get('/not-found')).rejects.toThrow('HTTP 404: Not Found');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(apiClient.get('/test')).rejects.toThrow('Network error');
  });

  it('should handle request timeouts', async () => {
    jest.useFakeTimers();
    
    // Mock AbortController
    const mockAbort = jest.fn();
    global.AbortController = jest.fn().mockImplementation(() => ({
      signal: {},
      abort: mockAbort
    }));
    
    // Start a request that will never resolve
    const promise = apiClient.get('/test');
    
    // Advance timers to trigger timeout
    jest.advanceTimersByTime(30000);
    
    expect(mockAbort).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should retry failed requests', async () => {
    // First call fails, second succeeds
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' })
      });
    
    const result = await apiClient.get('/test-with-retry');
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: 'test' });
  });

  it('should get auth token from session service', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    });

    await apiClient.get('/test-auth');

    expect(sessionService.getToken).toHaveBeenCalled();
  });

  it('should include request ID in headers', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    });

    await apiClient.get('/test-headers');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Request-ID': expect.any(String)
        })
      })
    );
  });
});

describe('Query Client', () => {
  it('should be configured with default options', () => {
    expect(queryClient.getDefaultOptions()).toEqual(
      expect.objectContaining({
        queries: expect.objectContaining({
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000
        })
      })
    );
  });
});