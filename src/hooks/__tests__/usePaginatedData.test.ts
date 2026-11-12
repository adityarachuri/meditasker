import { renderHook, waitFor, act } from '@testing-library/react';
import { usePaginatedData } from '../usePaginatedData';
import { databaseService } from '../../services/databaseService';

jest.mock('../../services/databaseService', () => ({
  databaseService: {
    getUsers: jest.fn(),
    getProjects: jest.fn(),
    getTasks: jest.fn(),
    clearCache: jest.fn(),
  },
}));

// databaseService's real methods return fully-typed User[]/Project[]/Task[],
// but usePaginatedData is generic over T and these tests only care about
// pagination plumbing, so the mocks intentionally return minimal fixtures.
const mockGetUsers = databaseService.getUsers as jest.Mock;
const mockGetProjects = databaseService.getProjects as jest.Mock;
const mockGetTasks = databaseService.getTasks as jest.Mock;
const mockClearCache = databaseService.clearCache as jest.Mock;

describe('usePaginatedData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUsers.mockResolvedValue({ data: [{ id: '1' }], total: 1, hasMore: false });
    mockGetProjects.mockResolvedValue({ data: [{ id: 'p1' }], total: 1, hasMore: false });
    mockGetTasks.mockResolvedValue({ data: [{ id: 't1' }], total: 1, hasMore: false });
  });

  it('loads the first page of users on mount by default', async () => {
    const { result } = renderHook(() => usePaginatedData('users'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetUsers).toHaveBeenCalledWith(1, 200, {});
    expect(result.current.data).toEqual([{ id: '1' }]);
    expect(result.current.total).toBe(1);
    expect(result.current.hasMore).toBe(false);
  });

  it('routes to the correct service method per data type', async () => {
    const { result: projectsResult } = renderHook(() => usePaginatedData('projects'));
    await waitFor(() => expect(projectsResult.current.loading).toBe(false));
    expect(mockGetProjects).toHaveBeenCalled();

    const { result: tasksResult } = renderHook(() => usePaginatedData('tasks'));
    await waitFor(() => expect(tasksResult.current.loading).toBe(false));
    expect(mockGetTasks).toHaveBeenCalled();
  });

  it('does not load on mount when initialLoad is false', () => {
    renderHook(() => usePaginatedData('users', { initialLoad: false }));

    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  it('sets an error message when the service call fails', async () => {
    mockGetUsers.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => usePaginatedData('users'));

    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(result.current.loading).toBe(false);
  });

  it('appends subsequent pages via loadMore instead of replacing data', async () => {
    mockGetUsers
      .mockResolvedValueOnce({ data: [{ id: '1' }], total: 2, hasMore: true })
      .mockResolvedValueOnce({ data: [{ id: '2' }], total: 2, hasMore: false });

    const { result } = renderHook(() => usePaginatedData('users'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: '1' }]);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not loadMore when there is no next page', async () => {
    const { result } = renderHook(() => usePaginatedData('users'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetUsers.mockClear();

    act(() => {
      result.current.loadMore();
    });

    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  it('clears the cache and resets to page 1 on refresh', async () => {
    const { result } = renderHook(() => usePaginatedData('users'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetUsers.mockClear();

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockClearCache).toHaveBeenCalled();
    expect(mockGetUsers).toHaveBeenCalledWith(1, 200, {});
  });

  it('does not clear the cache on refresh when caching is disabled', async () => {
    const { result } = renderHook(() => usePaginatedData('users', { enableCaching: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockClearCache).not.toHaveBeenCalled();
  });

  it('debounces search when optimizing for large datasets', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => usePaginatedData('users'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Mount fires two effects that can each kick off a load (one gets
    // aborted), so snapshot the settled call count rather than assuming 0.
    const hasSearchCall = () =>
      mockGetUsers.mock.calls.some(call => (call[2] as { search?: string })?.search === 'alice');

    act(() => {
      result.current.search('alice');
    });

    // Still debouncing: the search-specific call hasn't fired yet (mount's own
    // load effects may independently produce extra calls with empty filters;
    // what matters here is specifically the debounced search call).
    expect(hasSearchCall()).toBe(false);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });

    expect(hasSearchCall()).toBe(true);
    jest.useRealTimers();
  });

  it('searches immediately when not optimizing for large datasets', async () => {
    const { result } = renderHook(() =>
      usePaginatedData('users', { optimizeForLargeDatasets: false })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetUsers.mockClear();

    act(() => {
      result.current.search('bob');
    });

    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledWith(
        1,
        200,
        expect.objectContaining({ search: 'bob' })
      );
    });
  });

  it('reloads when the filters object changes', async () => {
    const { result, rerender } = renderHook(
      ({ filters }) => usePaginatedData('users', { filters }),
      { initialProps: { filters: { role: 'admin' } } }
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetUsers.mockClear();

    rerender({ filters: { role: 'manager' } });

    await waitFor(() => {
      expect(mockGetUsers).toHaveBeenCalledWith(1, 200, { role: 'manager' });
    });
  });

  it('caps its internal query-time history at 20 entries', async () => {
    mockGetUsers.mockResolvedValue({ data: [{ id: '1' }], total: 9999, hasMore: true });
    const { result } = renderHook(() => usePaginatedData('users'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // One page is already loaded on mount; 20 more pushes the internal
    // queryTimeRef history (capped at 20) past its limit, exercising the trim.
    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.loadMore();
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
    }

    expect(mockGetUsers).toHaveBeenCalledTimes(21);
  }, 15000);

  it('warns about a slow data load when optimizing for large datasets', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nowSpy = jest.spyOn(performance, 'now');
    let current = 0;
    nowSpy.mockImplementation(() => {
      current += 1100; // each call 1100ms after the last -> well past both warning thresholds
      return current;
    });

    renderHook(() => usePaginatedData('users', { optimizeForLargeDatasets: true }));
    await waitFor(() => expect(warnSpy).toHaveBeenCalled());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Slow data load detected'));

    nowSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
