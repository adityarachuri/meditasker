import { renderHook } from '@testing-library/react';
import { useVirtualization } from '../useVirtualization';

describe('useVirtualization', () => {
  it('returns a virtualizer with the expected shape', () => {
    const scrollElement = document.createElement('div');
    const { result } = renderHook(() =>
      useVirtualization({
        count: 100,
        getScrollElement: () => scrollElement,
        estimateSize: () => 40,
      })
    );

    expect(result.current.virtualizer).toBeDefined();
    expect(Array.isArray(result.current.virtualItems)).toBe(true);
    expect(typeof result.current.totalSize).toBe('number');
    expect(typeof result.current.scrollToIndex).toBe('function');
    expect(typeof result.current.scrollToOffset).toBe('function');
  });

  it('computes a total size proportional to item count and estimated size', () => {
    const scrollElement = document.createElement('div');
    const { result } = renderHook(() =>
      useVirtualization({
        count: 50,
        getScrollElement: () => scrollElement,
        estimateSize: () => 20,
      })
    );

    expect(result.current.totalSize).toBe(50 * 20);
  });

  it('accepts a custom overscan value without throwing', () => {
    const scrollElement = document.createElement('div');
    const { result } = renderHook(() =>
      useVirtualization({
        count: 10,
        getScrollElement: () => scrollElement,
        estimateSize: () => 30,
        overscan: 2,
      })
    );

    expect(result.current.virtualizer).toBeDefined();
  });
});
