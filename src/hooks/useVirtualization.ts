import { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualizationProps {
  count: number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number) => number;
  overscan?: number;
}

export function useVirtualization({
  count,
  getScrollElement,
  estimateSize,
  overscan = 5
}: UseVirtualizationProps) {
  const virtualizer = useVirtualizer({
    count,
    getScrollElement,
    estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return {
    virtualizer,
    virtualItems,
    totalSize,
    scrollToIndex: virtualizer.scrollToIndex,
    scrollToOffset: virtualizer.scrollToOffset,
  };
}