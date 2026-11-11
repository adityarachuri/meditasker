import { analyzeBundleSize } from '../bundleAnalyzer';

describe('analyzeBundleSize', () => {
  it('skips analysis in development mode without throwing', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => analyzeBundleSize()).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith('Bundle analysis is only available in development mode');

    logSpy.mockRestore();
  });
});
