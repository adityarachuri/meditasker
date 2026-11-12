import { analyzeBundleSize } from '../bundleAnalyzer';

describe('analyzeBundleSize', () => {
  it('skips analysis in development mode without throwing', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => analyzeBundleSize()).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith('Bundle analysis is only available in development mode');

    logSpy.mockRestore();
  });

  describe('in production mode', () => {
    const makeResourceEntry = (name: string, transferSize: number, duration = 10) =>
      ({ name, transferSize, duration } as unknown as PerformanceResourceTiming);

    // jsdom's `performance` object doesn't implement getEntriesByType at
    // all, so jest.spyOn (which requires the property to already exist)
    // can't hook it - assign a plain mock function instead, and delete it
    // afterward to restore jsdom's (lack of) default.
    const originalGetEntriesByType = (performance as { getEntriesByType?: unknown }).getEntriesByType;

    afterEach(() => {
      (performance as { getEntriesByType?: unknown }).getEntriesByType = originalGetEntriesByType;
    });

    it('reports bundle size and warns about chunks over 100KB', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      performance.getEntriesByType = jest.fn().mockReturnValue([
        makeResourceEntry('https://example.com/large-chunk.js', 150 * 1024),
        makeResourceEntry('https://example.com/small-chunk.js', 10 * 1024),
        makeResourceEntry('https://example.com/styles.css', 5 * 1024), // not .js: filtered out
      ]);

      analyzeBundleSize(false);

      expect(tableSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Total bundle size'));
      expect(warnSpy).toHaveBeenCalledWith(
        'Large chunks detected:',
        expect.arrayContaining([expect.objectContaining({ name: 'https://example.com/large-chunk.js' })])
      );

      logSpy.mockRestore();
      tableSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('does not warn when no chunk exceeds 100KB', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const tableSpy = jest.spyOn(console, 'table').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      performance.getEntriesByType = jest.fn().mockReturnValue([
        makeResourceEntry('https://example.com/small-chunk.js', 10 * 1024),
      ]);

      analyzeBundleSize(false);

      expect(warnSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      tableSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
