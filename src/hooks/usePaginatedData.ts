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
  filters?: Record<string, any>;
  enableCaching?: boolean;
  optimizeForLargeDatasets?: boolean;
}

export function usePaginatedData<T>(
  dataType: 'users' | 'projects' | 'tasks',
  options: UsePaginatedDataOptions = {}
) {
  const {
    pageSize = 200, // Larger page size for enterprise
    initialLoad = true,
    filters = {},
    enableCaching = true,
    optimizeForLargeDatasets = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const filtersRef = useRef(filters);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset data when filters change
  useEffect(() => {
    if (JSON.stringify(filters) !== JSON.stringify(filtersRef.current)) {
      filtersRef.current = filters;
      setData([]);
      setCurrentPage(1);
      setHasMore(true);
      setTotal(0);
      
      if (initialLoad) {
        loadPage(1, true);
      }
    }
  }, [filters, initialLoad]);

  // Initial load
  useEffect(() => {
    if (initialLoad && data.length === 0) {
      loadPage(1, true);
    }
  }, [initialLoad]);

  const loadPage = useCallback(async (page: number, reset: boolean = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    // Enterprise: Add performance timing
    const startTime = performance.now();

    try {
      let result: PaginatedResult<T>;

      switch (dataType) {
        case 'users':
          result = await databaseService.getUsers(page, pageSize, filters) as PaginatedResult<T>;
          break;
        case 'projects':
          result = await databaseService.getProjects(page, pageSize, filters) as PaginatedResult<T>;
          break;
        case 'tasks':
          result = await databaseService.getTasks(page, pageSize, filters) as PaginatedResult<T>;
          break;
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
  }, [dataType, pageSize, filters]);

  const loadMore = useCallback(() => {
    // Enterprise: Throttle load more for large datasets
    if (!loading && hasMore && (!optimizeForLargeDatasets || data.length < 50000)) {
      loadPage(currentPage + 1, false);
    }
  }, [loading, hasMore, currentPage, loadPage]);

  const refresh = useCallback(() => {
    if (enableCaching) {
      databaseService.clearCache();
    }
    setData([]);
    setCurrentPage(1);
    setHasMore(true);
    loadPage(1, true);
  }, [loadPage]);

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
  }, [filters, loadPage]);

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
  };
}