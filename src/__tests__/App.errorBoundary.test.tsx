import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// A dedicated file so the Dashboard mock can be declared at module scope
// (hoisted by Jest) instead of via jest.resetModules()+require() mid-test,
// which would otherwise risk loading a second React instance alongside the
// one the top-level import already bound.
jest.mock('../components/Dashboard/Dashboard', () => ({
  Dashboard: () => {
    throw new Error('Dashboard exploded');
  },
}));

// ReportsDashboard (reachable via the Reports tab) pulls in jspdf, which
// ships an ESM-only build Jest can't transform without further config.
jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('jspdf-autotable', () => jest.fn());

jest.mock('../services/databaseService', () => ({
  databaseService: {
    loadUsers: jest.fn().mockResolvedValue(undefined),
    loadProjects: jest.fn().mockResolvedValue(undefined),
    loadTasks: jest.fn().mockResolvedValue(undefined),
    getHealthStatus: jest.fn().mockReturnValue({
      status: 'healthy',
      metrics: { memoryUsage: 0, cacheHitRate: 0, averageQueryTime: 0, indexHealth: true },
    }),
    getMemoryUsage: jest.fn().mockReturnValue({
      users: 0, projects: 0, tasks: 0, cacheEntries: 0, performanceMetrics: 0,
      indexSizes: { usersByDepartment: 0, usersByRole: 0, tasksByProject: 0, tasksByAssignee: 0, tasksByStatus: 0, projectsByStatus: 0 },
    }),
    getPerformanceMetrics: jest.fn().mockReturnValue({}),
    searchGlobal: jest.fn().mockResolvedValue({ users: [], projects: [], tasks: [], total: 0 }),
  },
}));

jest.mock('../data/mockDataGenerator', () => ({
  mockDataGenerator: {
    generateUsers: jest.fn().mockReturnValue([]),
    generateProjects: jest.fn().mockReturnValue([]),
    generateTasks: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('../components/Advanced/RealTimeUpdates', () => {
  const actual = jest.requireActual('../components/Advanced/RealTimeUpdates');
  return { ...actual, RealTimeUpdates: () => null };
});

jest.mock('../services/sessionService', () => ({
  sessionService: {
    getSessionInfo: jest.fn(() => null),
    startSession: jest.fn(),
    endSession: jest.fn(),
    configure: jest.fn(),
    getSessionTimeRemaining: jest.fn(() => 30 * 60 * 1000),
    isSessionActive: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn()),
    initializeFromStorage: jest.fn(),
  },
}));

// jsdom's performance object doesn't implement getEntriesByType at all; it's
// read by App.tsx's window.addEventListener('load', ...) handlers, which
// jsdom fires automatically, so this must be in place before App loads too.
performance.getEntriesByType = jest.fn().mockReturnValue([{ loadEventEnd: 100, fetchStart: 0, duration: 0 }]);

// jsdom doesn't provide a global fetch, but App.tsx's module-level
// monitorDatabaseConnection() calls it unconditionally as soon as the
// module loads. A static `import '../App'` would be hoisted above any
// plain statement in this file, so App is imported dynamically instead,
// after the stub is in place.
global.fetch = jest.fn().mockResolvedValue({ ok: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- App's own default export type is awkward to re-derive here; this module is only used within this test file
let App: any;

beforeAll(async () => {
  App = (await import('../App')).default;
});

describe('App error boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('catches a render error from the active page and shows the error fallback, with a working retry button', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup({ delay: null });

    render(<App />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(3500);
    });

    const demoButton = screen.getByText('admin@meditasker.com').closest('button')!;
    await user.click(demoButton);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Dashboard exploded')).toBeInTheDocument();

    await user.click(screen.getByText('Try again'));

    consoleErrorSpy.mockRestore();
  });
});
