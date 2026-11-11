import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

// A distributive mapped type: for each key K of T, the matching Column shape
// pairs `key: K` with a `render` whose `value` param is precisely `T[K]` (not
// the union of every possible field type), so each column can declare a
// narrow, specific render function instead of handling every possible type.
type Column<T> = {
  [K in keyof T]: {
    key: K;
    header: string;
    width: number;
    render?: (value: T[K], item: T) => React.ReactNode;
  };
}[keyof T];

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height: number;
  rowHeight: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  loading?: boolean;
  enableVirtualization?: boolean;
  optimizeForLargeDatasets?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function VirtualizedTable<T extends { id: string }>({
  data,
  columns,
  height,
  rowHeight,
  onRowClick,
  className = '',
  loading = false,
  onLoadMore,
  hasMore = false,
  enableVirtualization: _enableVirtualization = true,
  optimizeForLargeDatasets = true
}: VirtualizedTableProps<T>) {
  const totalWidth = useMemo(() => 
    columns.reduce((sum, col) => sum + col.width, 0), 
    [columns]
  );

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index];
    
    // Enterprise: Load more when approaching end (larger buffer for 1M records)
    // Enterprise: Use larger buffer for smoother loading with large datasets
    const loadBuffer = optimizeForLargeDatasets ? 20 : 5;
    if (onLoadMore && hasMore && !loading && index >= data.length - loadBuffer) {
      onLoadMore();
    }

    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div
        style={style}
        className={`flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        }`}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex items-center px-4 py-2 text-sm text-gray-900 truncate"
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.render 
              ? column.render(item[column.key], item)
              : String(item[column.key] || '')
            }
          </div>
        ))}
      </div>
    );
  }, [data, columns, onRowClick, onLoadMore, hasMore, loading, optimizeForLargeDatasets]);

  const itemCount = hasMore ? data.length + 1 : data.length;

  return (
    <div className={`virtualized-table ${className}`}>
      {/* Header */}
      <div 
        className="flex bg-gray-100 border-b-2 border-gray-200 font-medium text-sm text-gray-700"
        style={{ width: totalWidth }}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex items-center px-4 py-3 truncate"
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual List */}
      <List
        height={height}
        itemCount={itemCount}
        itemSize={rowHeight}
        width={totalWidth}
        overscanCount={optimizeForLargeDatasets ? 20 : 5}
      >
        {Row}
      </List>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading more data from 1M+ records...</span>
        </div>
      )}
    </div>
  );
}

// Memoized version for better performance
export const MemoizedVirtualizedTable = React.memo(VirtualizedTable) as typeof VirtualizedTable;