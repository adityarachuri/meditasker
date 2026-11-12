import {
  apiClient,
  queryClient,
  API_ENDPOINTS,
  userApi,
  projectApi,
  taskApi,
  searchApi,
  analyticsApi,
} from '../api';
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
    const originalAbortController = global.AbortController;

    try {
      // Mock AbortController
      const mockAbort = jest.fn();
      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: {},
        abort: mockAbort
      })) as unknown as typeof AbortController;

      // Start a request that will never resolve
      (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
      apiClient.get('/test');

      // Advance timers to trigger timeout
      jest.advanceTimersByTime(30000);

      expect(mockAbort).toHaveBeenCalled();
    } finally {
      global.AbortController = originalAbortController;
      jest.useRealTimers();
    }
  });

  it('should convert a real AbortError into a "Request timeout" error', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    await expect(apiClient.get('/test-abort')).rejects.toThrow('Request timeout');
  });

  it('should retry failed requests on a 5xx server error', async () => {
    // First call returns a retryable 5xx response, second succeeds
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })
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

  it('should send an empty bearer token when there is no session token', async () => {
    (sessionService.getToken as jest.Mock).mockReturnValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    });

    await apiClient.get('/test-no-token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer ' })
      })
    );
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

  it('retries fewer times for a timeout error than other errors', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown
    ) => boolean;

    expect(retry(1, new Error('Request timeout'))).toBe(true);
    expect(retry(2, new Error('Request timeout'))).toBe(false);
    expect(retry(2, new Error('something else'))).toBe(true);
    expect(retry(3, new Error('something else'))).toBe(false);
  });

  it('caps retry delay at 30 seconds with exponential backoff', () => {
    const retryDelay = queryClient.getDefaultOptions().queries?.retryDelay as (
      attemptIndex: number
    ) => number;

    expect(retryDelay(0)).toBe(1000);
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(10)).toBe(30000);
  });
});

describe('ApiClient write/delete/batch methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('makes PUT requests with a JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ updated: true }),
    });

    const result = await apiClient.put('/items/1', { name: 'Renamed' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/items/1'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Renamed' }) })
    );
    expect(result).toEqual({ updated: true });
  });

  it('makes PATCH requests with a JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ patched: true }),
    });

    await apiClient.patch('/items/1', { status: 'done' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/items/1'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'done' }) })
    );
  });

  it('makes DELETE requests', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
    });

    await apiClient.delete('/items/1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/items/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('sends batch update operations to a /batch sub-path', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const operations = [{ id: '1', data: { status: 'done' } }];
    await apiClient.batchUpdate('/tasks', operations);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tasks/batch'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ operations }),
      })
    );
  });
});

describe('ApiClient.uploadFile', () => {
  class FakeXHR {
    static lastInstance: FakeXHR;
    upload = { addEventListener: jest.fn() };
    listeners: Record<string, Array<() => void>> = {};
    status = 200;
    statusText = 'OK';
    responseText = '{"uploaded":true}';
    open = jest.fn();
    send = jest.fn();
    setRequestHeader = jest.fn();

    constructor() {
      FakeXHR.lastInstance = this;
    }

    addEventListener(event: string, callback: () => void) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(callback);
    }

    trigger(event: string) {
      (this.listeners[event] || []).forEach(cb => cb());
    }
  }

  const originalXHR = global.XMLHttpRequest;

  beforeEach(() => {
    global.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
  });

  it('resolves with the parsed response on a successful upload', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const promise = apiClient.uploadFile('/upload/avatar', file);

    FakeXHR.lastInstance.trigger('load');

    await expect(promise).resolves.toEqual({ uploaded: true });
    expect(FakeXHR.lastInstance.open).toHaveBeenCalledWith('POST', expect.stringContaining('/upload/avatar'));
  });

  it('reports upload progress when the event is length-computable', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const onProgress = jest.fn();
    const promise = apiClient.uploadFile('/upload/avatar', file, onProgress);

    const progressHandler = FakeXHR.lastInstance.upload.addEventListener.mock.calls[0][1];
    progressHandler({ lengthComputable: true, loaded: 50, total: 100 });

    FakeXHR.lastInstance.trigger('load');
    await promise;

    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('rejects when the upload responds with a non-2xx status', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const promise = apiClient.uploadFile('/upload/avatar', file);

    FakeXHR.lastInstance.status = 500;
    FakeXHR.lastInstance.statusText = 'Server Error';
    FakeXHR.lastInstance.trigger('load');

    await expect(promise).rejects.toThrow('Upload failed: Server Error');
  });

  it('rejects when the upload fires an error event', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const promise = apiClient.uploadFile('/upload/avatar', file);

    FakeXHR.lastInstance.trigger('error');

    await expect(promise).rejects.toThrow('Upload failed');
  });
});

describe('API_ENDPOINTS', () => {
  it('builds id-scoped endpoint paths', () => {
    expect(API_ENDPOINTS.USER_BY_ID('u1')).toBe('/users/u1');
    expect(API_ENDPOINTS.PROJECT_BY_ID('p1')).toBe('/projects/p1');
    expect(API_ENDPOINTS.PROJECT_TASKS('p1')).toBe('/projects/p1/tasks');
    expect(API_ENDPOINTS.PROJECT_MEMBERS('p1')).toBe('/projects/p1/members');
    expect(API_ENDPOINTS.TASK_BY_ID('t1')).toBe('/tasks/t1');
    expect(API_ENDPOINTS.TASK_COMMENTS('t1')).toBe('/tasks/t1/comments');
    expect(API_ENDPOINTS.TASK_ATTACHMENTS('t1')).toBe('/tasks/t1/attachments');
    expect(API_ENDPOINTS.NOTIFICATION_BY_ID('n1')).toBe('/notifications/n1');
    expect(API_ENDPOINTS.MARK_READ('n1')).toBe('/notifications/n1/read');
  });
});

describe('typed API helpers', () => {
  beforeEach(() => {
    jest.spyOn(apiClient, 'get').mockResolvedValue({});
    jest.spyOn(apiClient, 'post').mockResolvedValue({});
    jest.spyOn(apiClient, 'put').mockResolvedValue({});
    jest.spyOn(apiClient, 'patch').mockResolvedValue({});
    jest.spyOn(apiClient, 'delete').mockResolvedValue({});
    jest.spyOn(apiClient, 'batchUpdate').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('userApi delegates to the matching apiClient calls', async () => {
    await userApi.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/users');

    await userApi.getById('u1');
    expect(apiClient.get).toHaveBeenCalledWith('/users/u1');

    await userApi.create({ name: 'New' });
    expect(apiClient.post).toHaveBeenCalledWith('/users', { name: 'New' });

    await userApi.update('u1', { name: 'Renamed' });
    expect(apiClient.put).toHaveBeenCalledWith('/users/u1', { name: 'Renamed' });

    await userApi.delete('u1');
    expect(apiClient.delete).toHaveBeenCalledWith('/users/u1');

    await userApi.getProfile();
    expect(apiClient.get).toHaveBeenCalledWith('/users/profile');

    await userApi.updateProfile({ theme: 'dark' });
    expect(apiClient.patch).toHaveBeenCalledWith('/users/profile', { theme: 'dark' });
  });

  it('projectApi delegates to the matching apiClient calls, including query params and batch updates', async () => {
    await projectApi.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/projects');

    await projectApi.getAll({ status: 'active' });
    expect(apiClient.get).toHaveBeenCalledWith('/projects?status=active');

    await projectApi.getById('p1');
    expect(apiClient.get).toHaveBeenCalledWith('/projects/p1');

    await projectApi.create({ name: 'New Project' });
    expect(apiClient.post).toHaveBeenCalledWith('/projects', { name: 'New Project' });

    await projectApi.update('p1', { status: 'completed' });
    expect(apiClient.put).toHaveBeenCalledWith('/projects/p1', { status: 'completed' });

    await projectApi.delete('p1');
    expect(apiClient.delete).toHaveBeenCalledWith('/projects/p1');

    await projectApi.getTasks('p1');
    expect(apiClient.get).toHaveBeenCalledWith('/projects/p1/tasks');

    await projectApi.getMembers('p1');
    expect(apiClient.get).toHaveBeenCalledWith('/projects/p1/members');

    const operations = [{ id: 'p1', data: { status: 'on-hold' } }];
    await projectApi.batchUpdate(operations);
    expect(apiClient.batchUpdate).toHaveBeenCalledWith('/projects', operations);
  });

  it('taskApi delegates to the matching apiClient calls, including query params and batch updates', async () => {
    await taskApi.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/tasks');

    await taskApi.getAll({ status: 'todo' });
    expect(apiClient.get).toHaveBeenCalledWith('/tasks?status=todo');

    await taskApi.getById('t1');
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/t1');

    await taskApi.create({ title: 'New Task' });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks', { title: 'New Task' });

    await taskApi.update('t1', { status: 'completed' });
    expect(apiClient.put).toHaveBeenCalledWith('/tasks/t1', { status: 'completed' });

    await taskApi.delete('t1');
    expect(apiClient.delete).toHaveBeenCalledWith('/tasks/t1');

    await taskApi.getComments('t1');
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/t1/comments');

    await taskApi.addComment('t1', { text: 'Looks good' });
    expect(apiClient.post).toHaveBeenCalledWith('/tasks/t1/comments', { text: 'Looks good' });

    await taskApi.getAttachments('t1');
    expect(apiClient.get).toHaveBeenCalledWith('/tasks/t1/attachments');

    const operations = [{ id: 't1', data: { status: 'completed' } }];
    await taskApi.batchUpdate(operations);
    expect(apiClient.batchUpdate).toHaveBeenCalledWith('/tasks', operations);
  });

  it('searchApi encodes query terms and merges optional filters', async () => {
    await searchApi.global('urgent bug');
    expect(apiClient.get).toHaveBeenCalledWith('/search?q=urgent%20bug');

    await searchApi.projects('alpha');
    expect(apiClient.get).toHaveBeenCalledWith('/search/projects?q=alpha');

    await searchApi.projects('alpha', { status: 'active' });
    expect(apiClient.get).toHaveBeenCalledWith('/search/projects?q=alpha&status=active');

    await searchApi.tasks('bug', { priority: 'high' });
    expect(apiClient.get).toHaveBeenCalledWith('/search/tasks?q=bug&priority=high');

    await searchApi.tasks('bug');
    expect(apiClient.get).toHaveBeenCalledWith('/search/tasks?q=bug');

    await searchApi.users('alice');
    expect(apiClient.get).toHaveBeenCalledWith('/search/users?q=alice');
  });

  it('analyticsApi delegates to the matching apiClient calls with optional params', async () => {
    await analyticsApi.getDashboard();
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/dashboard');

    await analyticsApi.getProjects();
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/projects');

    await analyticsApi.getProjects({ range: '30d' });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/projects?range=30d');

    await analyticsApi.getTasks({ range: '7d' });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/tasks?range=7d');

    await analyticsApi.getTasks();
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/tasks');

    await analyticsApi.getTeam({ range: '90d' });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/team?range=90d');

    await analyticsApi.getTeam();
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/team');
  });
});