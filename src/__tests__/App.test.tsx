import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionService } from '../services/sessionService';

// ReportsDashboard (reachable via the Reports tab) pulls in jspdf, which
// ships an ESM-only build Jest can't transform; mock it out rather than
// extend the shared transform config further (matches the existing
// ReportsDashboard test's own approach).
jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('jspdf-autotable', () => jest.fn());

jest.mock('../services/databaseService', () => ({
  databaseService: {
    loadUsers: jest.fn().mockResolvedValue(undefined),
    loadProjects: jest.fn().mockResolvedValue(undefined),
    loadTasks: jest.fn().mockResolvedValue(undefined),
    getUsers: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    getProjects: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    getTasks: jest.fn().mockResolvedValue({ data: [], total: 0, hasMore: false }),
    clearCache: jest.fn(),
    // Read by EnterpriseMonitoring and GlobalSearch, both rendered inside
    // the real Header this test exercises.
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

// RealTimeUpdates simulates its own connection/timers independently and is
// already covered by its own test suite; stub it here so App's tests focus
// on App's own orchestration instead of re-exercising that component.
jest.mock('../components/Advanced/RealTimeUpdates', () => {
  const actual = jest.requireActual('../components/Advanced/RealTimeUpdates');
  return {
    ...actual,
    RealTimeUpdates: () => null,
  };
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
// module loads (a latent gap that simply never ran before App.tsx had any
// tests at all). A static `import '../App'` would be hoisted above any
// plain statement in this file - including a `global.fetch = ...` written
// textually before it - so App is imported dynamically instead, after the
// stub is in place.
global.fetch = jest.fn().mockResolvedValue({ ok: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- App's own default export type is awkward to re-derive here; this module is only used within this test file
let App: any;
let ErrorFallback: typeof import('../App').ErrorFallback;
let DataViewModeToggle: typeof import('../App').DataViewModeToggle;

beforeAll(async () => {
  const mod = await import('../App');
  App = mod.default;
  ErrorFallback = mod.ErrorFallback;
  DataViewModeToggle = mod.DataViewModeToggle;
});

const mockSessionService = sessionService as jest.Mocked<typeof sessionService>;

const renderApp = () => render(<App />);

// Clears the data-init gate by advancing through DataInitializer's real
// (fake-timed) step delays, the same total used in its own test file.
const clearDataInitGate = async () => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3500);
  });
};

const loginAsAdmin = async (user: ReturnType<typeof userEvent.setup>) => {
  const demoButton = screen.getByText('admin@meditasker.com').closest('button')!;
  await user.click(demoButton);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
};

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the data initializer first, then the login form once initialized', async () => {
    renderApp();

    expect(screen.getByText('Initializing Application')).toBeInTheDocument();

    await clearDataInitGate();

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('seeds a mock auth_token into localStorage on mount if none exists', async () => {
    renderApp();
    await clearDataInitGate();

    expect(localStorage.getItem('auth_token')).toMatch(/^mock-auth-token-/);
  });

  it('does not overwrite an existing auth_token', async () => {
    localStorage.setItem('auth_token', 'already-set');
    renderApp();
    await clearDataInitGate();

    expect(localStorage.getItem('auth_token')).toBe('already-set');
  });

  it('logs in and shows the Dashboard by default, with sidebar navigation to every tab', async () => {
    const user = userEvent.setup({ delay: null });
    renderApp();
    await clearDataInitGate();
    await loginAsAdmin(user);

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();

    const tabs: Array<[string | RegExp, string]> = [
      ['Projects', 'Projects'],
      ['Tasks', 'Tasks'],
      ['Team', 'Team'],
      ['Calendar', 'Calendar'],
      ['Reports', 'Reports'],
      // The Notifications nav button's accessible name includes the unread
      // count badge (e.g. "Notifications 2"), hence the regex match.
      [/^Notifications/, 'Notifications'],
      ['Settings', 'Settings'],
      ['Dashboard', 'Dashboard'],
    ];

    for (const [navLabel, expectedTitle] of tabs) {
      await user.click(screen.getByRole('button', { name: navLabel }));
      expect(screen.getByRole('heading', { name: expectedTitle, level: 1 })).toBeInTheDocument();
    }
  });

  it('shows the Enterprise/Manage toggle on Projects and Tasks, and switches views', async () => {
    const user = userEvent.setup({ delay: null });
    renderApp();
    await clearDataInitGate();
    await loginAsAdmin(user);

    await user.click(screen.getByRole('button', { name: 'Projects' }));
    expect(screen.getByText('Enterprise (1M+ records)')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();

    await user.click(screen.getByText('Manage'));
    // Manage mode reads real seeded mock data (4 projects) via AppContext,
    // unlike Enterprise mode which reads the (here, empty-mocked) databaseService.
    expect(screen.getByText('4 projects')).toBeInTheDocument();

    await user.click(screen.getByText('Enterprise (1M+ records)'));
    expect(screen.getByText(/projects total/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tasks' }));
    await user.click(screen.getByText('Manage'));
    // Manage mode reads real seeded mock data via AppContext, unlike
    // Enterprise mode which reads the (here, empty-mocked) databaseService.
    expect(screen.getByText(/\d+ tasks?$/)).toBeInTheDocument();
  });

  it('invokes the onLogout callback when "Logout Now" is clicked on the session-expiry warning', async () => {
    const user = userEvent.setup({ delay: null });
    renderApp();
    await clearDataInitGate();
    await loginAsAdmin(user);

    // Drop the mocked time-remaining below SessionManager's default 5-minute
    // warning threshold; useSession's 1s interval picks this up and shows
    // the expiry warning modal.
    mockSessionService.getSessionTimeRemaining.mockReturnValue(4 * 60 * 1000);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Logout Now'));

    expect(mockSessionService.endSession).toHaveBeenCalled();
  });

});

describe('ErrorFallback', () => {
  it('renders the error message and calls resetErrorBoundary on click', () => {
    const resetErrorBoundary = jest.fn();
    render(<ErrorFallback error={new Error('Something broke')} resetErrorBoundary={resetErrorBoundary} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try again'));
    expect(resetErrorBoundary).toHaveBeenCalled();
  });

  it('stringifies a non-Error thrown value', () => {
    render(<ErrorFallback error={'a plain string was thrown' as unknown as Error} resetErrorBoundary={jest.fn()} />);

    expect(screen.getByText('a plain string was thrown')).toBeInTheDocument();
  });
});

describe('DataViewModeToggle', () => {
  it('highlights the active mode and calls onChange when the other is clicked', () => {
    const onChange = jest.fn();
    render(<DataViewModeToggle mode="enterprise" onChange={onChange} />);

    fireEvent.click(screen.getByText('Manage'));
    expect(onChange).toHaveBeenCalledWith('manage');

    fireEvent.click(screen.getByText('Enterprise (1M+ records)'));
    expect(onChange).toHaveBeenCalledWith('enterprise');
  });
});
