import React, { useRef, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useVirtualization } from '../../hooks/useVirtualization';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T }) => React.ReactNode;
  height: number;
  width?: string | number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  height,
  width = '100%',
  overscan = 5,
  className = '',
  onScroll,
}: VirtualizedListProps<T>) {
  const listRef = useRef<List>(null);
  const { getAverageRenderTime } = usePerformanceMonitor('VirtualizedList');

  const itemData = useMemo(() => ({
    items,
    renderItem,
  }), [items, renderItem]);

  const Row = React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderItem({ index, style, data: item })}
      </div>
    );
  });

  const handleScroll = ({ scrollTop }: { scrollTop: number }) => {
    onScroll?.(scrollTop);
  };

  return (
    <div className={`virtualized-list ${className}`}>
      <List
        ref={listRef}
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={overscan}
        onScroll={handleScroll}
      >
        {Row}
      </List>
    </div>
  );
}

// Memoized wrapper for better performance
export const MemoizedVirtualizedList = React.memo(VirtualizedList) as typeof VirtualizedList;