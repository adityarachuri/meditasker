import { renderHook } from '@testing-library/react';
import { usePerformanceMonitor } from '../usePerformanceMonitor';

describe('usePerformanceMonitor', () => {
  it('records a metric entry after each render', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent'));

    expect(result.current.getMetrics().length).toBeGreaterThanOrEqual(1);

    const countAfterFirst = result.current.getMetrics().length;
    rerender();

    expect(result.current.getMetrics().length).toBeGreaterThan(countAfterFirst);
  });

  it('tags recorded metrics with the given component name', () => {
    const { result } = renderHook(() => usePerformanceMonitor('MyWidget'));

    const metrics = result.current.getMetrics();
    expect(metrics[0].componentName).toBe('MyWidget');
  });

  it('computes an average render time from recent metrics', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent'));

    rerender();
    rerender();

    const average = result.current.getAverageRenderTime();
    expect(typeof average).toBe('number');
    expect(Number.isNaN(average)).toBe(false);
  });

  it('caps stored metrics at 100 entries', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor('TestComponent'));

    for (let i = 0; i < 110; i++) {
      rerender();
    }

    expect(result.current.getMetrics().length).toBeLessThanOrEqual(100);
  });

  it('warns about slow renders exceeding 16ms', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let callCount = 0;
    const nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => {
      // Every call is 100ms apart, so any pair of calls used to measure a
      // render duration reports well over the 16ms slow-render threshold,
      // regardless of how many other performance.now() calls happen elsewhere.
      callCount += 1;
      return callCount * 100;
    });

    renderHook(() => usePerformanceMonitor('SlowComponent'));

    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Slow render detected in SlowComponent'));

    nowSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
