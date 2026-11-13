import { useState, useEffect, useCallback, useRef } from 'react';
import { databaseService } from '../services/databaseService';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

interface UsePaginatedDataOptions {
  pageSize?: number;
  initialLoad?: boolean;
  enableCaching?: boolean;
  optimizeForLargeDatasets?: boolean;
  filters?: Record<string, unknown>;
}

export function usePaginatedData<T>(
  dataType: 'users' | 'projects' | 'tasks',
  options: UsePaginatedDataOptions = {}
) {
  const {
    pageSize = 200, // Larger page size for enterprise
    initialLoad = true,
    enableCaching = true,
    optimizeForLargeDatasets = true,
    filters = {}
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // filtersRef holds the *active* filters used for the next query, which
  // search() also mutates directly (to add a search term) without going
  // through the `filters` prop. propFiltersRef tracks only the caller-supplied
  // `filters` prop, purely to detect when it actually changes - keeping it
  // separate means search()'s mutation of filtersRef doesn't get mistaken for
  // (and immediately reverted as) a prop change on the next render.
  const filtersRef = useRef(filters);
  const propFiltersRef = useRef(filters);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Enterprise: Track performance metrics
  const queryTimeRef = useRef<number[]>([]);

  // Reset data when the filters prop changes
  useEffect(() => {
    if (JSON.stringify(filters) !== JSON.stringify(propFiltersRef.current)) {
      propFiltersRef.current = filters;
      filtersRef.current = filters;
      setData([]);
      setCurrentPage(1);
      setHasMore(true);
      setTotal(0);

      if (initialLoad) {
        loadPage(1, true);
      }
    }
    // loadPage is declared below via useCallback with deps [dataType, pageSize, optimizeForLargeDatasets].
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, initialLoad]);

  // Initial load
  useEffect(() => {
    if (initialLoad && data.length === 0) {
      loadPage(1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoad]);

  const loadPage = useCallback(async (page: number, reset: boolean) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Enterprise: Log aborted requests
      console.log(`Enterprise: Aborted previous ${dataType} query due to new request`);
      abortControllerRef.current = null;
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Enterprise: Track query time
      const startTime = performance.now();
      
      let result: PaginatedResult<T>;

      switch (dataType) {
        case 'users':
          result = await databaseService.getUsers(page, pageSize, filtersRef.current) as PaginatedResult<T>;
          break;
        case 'projects':
          result = await databaseService.getProjects(page, pageSize, filtersRef.current) as PaginatedResult<T>;
          break;
        case 'tasks':
          result = await databaseService.getTasks(page, pageSize, filtersRef.current) as PaginatedResult<T>;
          break;
        /* istanbul ignore next -- dataType is typed as 'users' | 'projects' |
           'tasks'; this guards a value TypeScript doesn't allow callers to pass. */
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      if (reset) {
        setData(result.data);
      } else {
        setData(prev => [...prev, ...result.data]);
      }

      setHasMore(result.hasMore);
      setTotal(result.total);
      setCurrentPage(page);
      
      // Enterprise: Record query performance
      const queryTime = performance.now() - startTime;
      queryTimeRef.current.push(queryTime);
      if (queryTimeRef.current.length > 20) queryTimeRef.current.shift();
      
      // Enterprise: Log slow queries
      if (queryTime > 500) console.warn(`Enterprise: Slow ${dataType} query detected: ${queryTime.toFixed(2)}ms`);
      
      // Enterprise: Log performance metrics for large datasets
      if (optimizeForLargeDatasets) {
        const loadTime = performance.now() - startTime;
        if (loadTime > 1000) {
          console.warn(`Slow data load detected: ${loadTime}ms for ${result.data.length} ${dataType}`);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        console.error(`Error loading ${dataType}:`, err);
      }
    } finally {
      setLoading(false);
    }
  }, [dataType, pageSize, optimizeForLargeDatasets]);

  const loadMore = useCallback(() => {
    // Enterprise: Throttle load more for large datasets
    if (!loading && hasMore && (!optimizeForLargeDatasets || data.length < 50000)) {
      loadPage(currentPage + 1, false);
    }
  }, [loading, hasMore, currentPage, loadPage, data.length, optimizeForLargeDatasets]);

  const refresh = useCallback(() => {
    if (enableCaching) {
      databaseService.clearCache();
    }
    setCurrentPage(1);
    // Enterprise: Reset performance metrics
    queryTimeRef.current = [];
    setData([]);
    setCurrentPage(1);
    setHasMore(true);
    loadPage(1, true);
  }, [loadPage, enableCaching]);

  const search = useCallback((searchTerm: string) => {
    const newFilters = { ...filters, search: searchTerm };
    filtersRef.current = newFilters;
    setData([]);
    setCurrentPage(1);
    setHasMore(true);

    // Enterprise: Debounce search for large datasets
    if (optimizeForLargeDatasets) {
      setTimeout(() => {
        loadPage(1, true);
      }, 300);
    } else {
      loadPage(1, true);
    }
  }, [filters, loadPage, optimizeForLargeDatasets]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    total,
    currentPage,
    loadMore,
    refresh,
    search,
    pageSize
    
    // Enterprise metrics (commented out to avoid breaking interface)
    // getPerformanceMetrics: () => {
    //   const times = queryTimeRef.current;
    //   return {
    //     avgQueryTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    //     totalQueries: times.length
    //   };
    // }
  };
}