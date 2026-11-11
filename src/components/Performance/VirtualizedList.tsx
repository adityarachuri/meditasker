import React, { useRef, useCallback } from 'react';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { useVirtualization } from '../../hooks/useVirtualization';

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
  overscan = 10,
  className = '',
  onScroll,
}: VirtualizedListProps<T>) {
  usePerformanceMonitor('VirtualizedList');

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const getScrollElement = useCallback(() => scrollElementRef.current, []);
  const estimateSize = useCallback(() => itemHeight, [itemHeight]);

  const { virtualItems, totalSize } = useVirtualization({
    count: items.length,
    getScrollElement,
    estimateSize,
    overscan,
  });

  return (
    <div
      ref={scrollElementRef}
      className={`virtualized-list ${className}`}
      style={{ height, width, overflow: 'auto' }}
      onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalSize, width: '100%', position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: virtualItem.size,
            transform: `translateY(${virtualItem.start}px)`,
          };
          return (
            <div key={virtualItem.key} style={style}>
              {renderItem({ index: virtualItem.index, style, data: items[virtualItem.index] })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoized wrapper for better performance
export const MemoizedVirtualizedList = React.memo(VirtualizedList) as typeof VirtualizedList;