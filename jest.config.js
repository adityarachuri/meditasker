export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  transform: {
    // Also matches .js so ts-jest can down-compile the one ESM-only
    // node_modules package (react-error-boundary) let through by
    // transformIgnorePatterns below - allowJs lets ts-jest accept plain JS.
    '^.+\\.(ts|tsx|js)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.jest.json',
      astTransformers: {
        before: [
          {
            path: 'ts-jest-mock-import-meta',
            options: {
              metaObjectReplacement: {
                // VITE_WS_URL is non-empty so RealTimeUpdates's connect() actually
                // exercises its WebSocket path under test instead of early-returning;
                // the global `WebSocket` is mocked per-test where that matters.
                env: { DEV: true, PROD: false, VITE_API_BASE_URL: '', VITE_WS_URL: 'ws://localhost:1234' },
              },
            },
          },
        ],
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // react-error-boundary ships ESM-only ("type": "module", no CJS build),
  // so Jest's default (which ignores all of node_modules) can't transform
  // it to CommonJS. This carves out just that one package.
  transformIgnorePatterns: ['/node_modules/(?!react-error-boundary)'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // The default 5000ms is too tight for userEvent-driven interaction tests
  // once the full suite runs with Jest's default parallelism - individual
  // tests are correct (verified in isolation) but can exceed 5s purely from
  // CPU contention across workers on a full run.
  testTimeout: 15000,
};