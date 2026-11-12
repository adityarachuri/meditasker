// isDev defaults to the real environment flag; accepting it as a parameter
// lets tests exercise the production-only analysis branch below, since
// Jest's import.meta shim otherwise hardcodes DEV to true for every test.
export function analyzeBundleSize(isDev: boolean = import.meta.env.DEV) {
  if (isDev) {
    console.log('Bundle analysis is only available in development mode');
    return;
  }

  // Analyze bundle size and report large chunks
  const chunks = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .filter((resource) => resource.name.includes('.js'))
    .map((resource) => ({
      name: resource.name,
      size: resource.transferSize,
      duration: resource.duration,
    }))
    .sort((a, b) => b.size - a.size);

  console.table(chunks);

  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  console.log(`Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);

  // Warn about large chunks
  const largeChunks = chunks.filter(chunk => chunk.size > 100 * 1024); // > 100KB
  if (largeChunks.length > 0) {
    console.warn('Large chunks detected:', largeChunks);
  }
}