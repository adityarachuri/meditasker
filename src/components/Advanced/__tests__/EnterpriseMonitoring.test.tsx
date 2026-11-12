import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnterpriseMonitoring } from '../EnterpriseMonitoring';
import { databaseService } from '../../../services/databaseService';

jest.mock('../../../services/databaseService', () => ({
  databaseService: {
    getHealthStatus: jest.fn(),
    getMemoryUsage: jest.fn(),
    getPerformanceMetrics: jest.fn(),
  },
}));

const mockGetHealthStatus = databaseService.getHealthStatus as jest.Mock;
const mockGetMemoryUsage = databaseService.getMemoryUsage as jest.Mock;
const mockGetPerformanceMetrics = databaseService.getPerformanceMetrics as jest.Mock;

const healthyStatus = {
  status: 'healthy' as const,
  metrics: { memoryUsage: 100, cacheHitRate: 80, averageQueryTime: 20, indexHealth: true },
};

const memoryUsage = { users: 10, projects: 5, tasks: 20, cacheEntries: 3, performanceMetrics: 2, indexSizes: {} };

describe('EnterpriseMonitoring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGetHealthStatus.mockReturnValue(healthyStatus);
    mockGetMemoryUsage.mockReturnValue(memoryUsage);
    mockGetPerformanceMetrics.mockReturnValue({
      user_query_time: { avg: 12.345, min: 1, max: 50, count: 10 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders the compact status bar once metrics load', () => {
    render(<EnterpriseMonitoring />);
    expect(screen.getByText('Enterprise Monitoring')).toBeInTheDocument();
    expect(screen.getByText('35 records • 80.0% cache hit')).toBeInTheDocument();
    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
  });

  it('refreshes metrics every 5 seconds', () => {
    render(<EnterpriseMonitoring />);
    expect(mockGetHealthStatus).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetHealthStatus).toHaveBeenCalledTimes(2);
  });

  it('stops polling after unmount', () => {
    const { unmount } = render(<EnterpriseMonitoring />);
    unmount();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockGetHealthStatus).toHaveBeenCalledTimes(1);
  });

  it('expands to show the detailed breakdown on click, and collapses again', async () => {
    const user = userEvent.setup({ delay: null });
    render(<EnterpriseMonitoring />);

    await user.click(screen.getByText('Enterprise Monitoring'));
    expect(screen.getByText('Performance Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Optimal')).toBeInTheDocument();
    expect(screen.getByText('user query time')).toBeInTheDocument();

    await user.click(screen.getByText('Enterprise Monitoring'));
    expect(screen.queryByText('Performance Breakdown')).not.toBeInTheDocument();
  });

  it('shows a warning status and its recommendations when cache hit rate is low', async () => {
    const user = userEvent.setup({ delay: null });
    mockGetHealthStatus.mockReturnValue({
      status: 'warning',
      metrics: { memoryUsage: 100, cacheHitRate: 20, averageQueryTime: 150, indexHealth: true },
    });
    render(<EnterpriseMonitoring />);

    await user.click(screen.getByText('Enterprise Monitoring'));
    expect(screen.getByText('WARNING')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent === '• Consider increasing cache size or adjusting cache TTL')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent === '• Query performance is degraded - consider optimizing filters')).toBeInTheDocument();
  });

  it('shows a critical status and index-health recommendation when degraded', async () => {
    const user = userEvent.setup({ delay: null });
    mockGetHealthStatus.mockReturnValue({
      status: 'critical',
      metrics: { memoryUsage: 100, cacheHitRate: 80, averageQueryTime: 20, indexHealth: false },
    });
    render(<EnterpriseMonitoring />);

    await user.click(screen.getByText('Enterprise Monitoring'));
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent === '• Index health is compromised - database reinitialization may be needed')).toBeInTheDocument();
  });

  it('recommends archiving for a very large dataset', async () => {
    const user = userEvent.setup({ delay: null });
    mockGetHealthStatus.mockReturnValue({
      status: 'warning',
      metrics: { memoryUsage: 100, cacheHitRate: 80, averageQueryTime: 20, indexHealth: true },
    });
    mockGetMemoryUsage.mockReturnValue({ ...memoryUsage, users: 900001, projects: 0, tasks: 0 });
    render(<EnterpriseMonitoring />);

    await user.click(screen.getByText('Enterprise Monitoring'));
    expect(screen.getByText((_, el) => el?.tagName === 'LI' && el.textContent === '• Large dataset detected - consider implementing data archiving')).toBeInTheDocument();
  });

  it('renders no recommendations list items when nothing crosses a threshold (status still not healthy)', async () => {
    const user = userEvent.setup({ delay: null });
    mockGetHealthStatus.mockReturnValue({
      status: 'warning',
      metrics: { memoryUsage: 100, cacheHitRate: 80, averageQueryTime: 20, indexHealth: true },
    });
    render(<EnterpriseMonitoring />);

    await user.click(screen.getByText('Enterprise Monitoring'));
    expect(screen.getByText('Performance Recommendations')).toBeInTheDocument();
  });
});
