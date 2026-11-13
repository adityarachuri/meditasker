import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalSearch } from '../GlobalSearch';
import { databaseService } from '../../../services/databaseService';
import { User, Project, Task } from '../../../types';

jest.mock('../../../services/databaseService', () => ({
  databaseService: {
    searchGlobal: jest.fn(),
    getMemoryUsage: jest.fn(() => ({ users: 1, projects: 1, tasks: 1, cacheEntries: 0, performanceMetrics: 0, indexSizes: {} })),
  },
}));

const mockSearchGlobal = databaseService.searchGlobal as jest.Mock;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1', name: 'Alice Smith', email: 'alice@meditasker.com', role: 'developer',
  department: 'Engineering', joinDate: '2024-01-01', isActive: true, avatar: 'a.png', ...overrides,
});
const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1', name: 'Project Alpha', description: 'desc', status: 'active', priority: 'medium',
  startDate: '2024-01-01', endDate: '2024-06-01', progress: 0, managerId: 'u1', teamIds: [],
  budget: 1000, spentBudget: 0, color: '#3b82f6', ...overrides,
});
const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1', title: 'Fix bug', description: 'desc', status: 'todo', priority: 'medium',
  projectId: 'p1', assigneeId: 'u1', createdBy: 'u1', createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z', estimatedHours: 2, actualHours: 0, tags: [], dependencies: [], ...overrides,
});

describe('GlobalSearch', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSearchGlobal.mockResolvedValue({ users: [], projects: [], tasks: [], total: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Real timers throughout: useDebounce's 300ms delay is real wall-clock time
  // here, and findByText/waitFor's own (real-timer) polling waits it out -
  // mixing in fake timers made those internal polls never fire.
  const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    await user.type(screen.getByPlaceholderText('Search across all data (1M+ records)...'), text);
    // Wait for the full round trip, not just the call: checking only "called"
    // can be satisfied before the awaited searchGlobal() promise - and the
    // state updates after it - have actually settled.
    await waitFor(() => {
      expect(mockSearchGlobal).toHaveBeenCalled();
      expect(screen.queryByText('Searching 1M+ records...')).not.toBeInTheDocument();
    });
  };

  it('renders the input and does not search for an empty query', () => {
    render(<GlobalSearch />);
    expect(screen.getByPlaceholderText('Search across all data (1M+ records)...')).toBeInTheDocument();
    expect(mockSearchGlobal).not.toHaveBeenCalled();
  });

  it('searches after debounce and shows a loading state then results', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchGlobal.mockResolvedValue({
      users: [makeUser()],
      projects: [makeProject()],
      tasks: [makeTask()],
      total: 3,
    });
    render(<GlobalSearch />);

    await user.type(screen.getByPlaceholderText('Search across all data (1M+ records)...'), 'alpha');

    await waitFor(() => expect(mockSearchGlobal).toHaveBeenCalledWith('alpha', 50));
    expect(await screen.findByText('Search Results (3)')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Fix bug')).toBeInTheDocument();
  });

  it('clears the query and results via the clear button', async () => {
    const user = userEvent.setup({ delay: null });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search across all data (1M+ records)...');
    await user.type(input, 'alpha');

    const clearButton = screen.getAllByRole('button').find(b => !b.textContent);
    await user.click(clearButton!);
    expect(input).toHaveValue('');
  });

  it('calls onClose from the results panel', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = jest.fn();
    mockSearchGlobal.mockResolvedValue({ users: [makeUser()], projects: [], tasks: [], total: 1 });
    render(<GlobalSearch onClose={onClose} />);

    await type(user, 'alpha');
    await screen.findByText('Search Results (1)');

    const closeButtons = screen.getAllByRole('button').filter(b => !b.textContent && b.querySelector('svg.lucide-x'));
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('filters results by category: users only', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchGlobal.mockResolvedValue({
      users: [makeUser()], projects: [makeProject()], tasks: [makeTask()], total: 3,
    });
    render(<GlobalSearch />);
    await type(user, 'alpha');
    await screen.findByText('Search Results (3)');

    await user.click(screen.getByText('Users'));
    expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
  });

  it('filters results by category: projects only', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchGlobal.mockResolvedValue({
      users: [makeUser()], projects: [makeProject()], tasks: [makeTask()], total: 3,
    });
    render(<GlobalSearch />);
    await type(user, 'alpha');
    await screen.findByText('Search Results (3)');

    await user.click(screen.getByText('Projects'));
    expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('filters results by category: tasks only', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchGlobal.mockResolvedValue({
      users: [makeUser()], projects: [makeProject()], tasks: [makeTask()], total: 3,
    });
    render(<GlobalSearch />);
    await type(user, 'alpha');
    await screen.findByText('Search Results (3)');

    await user.click(screen.getByText('Tasks'));
    expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('shows the no-results state with the total record count', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchGlobal.mockResolvedValue({ users: [], projects: [], tasks: [], total: 0 });
    render(<GlobalSearch />);
    await type(user, 'zzz');

    expect(await screen.findByText('No results found for "zzz"')).toBeInTheDocument();
    expect(screen.getByText('Searched across 3 records')).toBeInTheDocument();
  });

  it('shows "+N more" when a category has more than 5 results', async () => {
    const user = userEvent.setup({ delay: null });
    const users = Array.from({ length: 7 }, (_, i) => makeUser({ id: `u${i}`, name: `User ${i}` }));
    const projects = Array.from({ length: 6 }, (_, i) => makeProject({ id: `p${i}`, name: `Project ${i}` }));
    const tasks = Array.from({ length: 8 }, (_, i) => makeTask({ id: `t${i}`, title: `Task ${i}` }));
    mockSearchGlobal.mockResolvedValue({ users, projects, tasks, total: 21 });
    render(<GlobalSearch />);
    await type(user, 'alpha');

    expect(await screen.findByText('+2 more users')).toBeInTheDocument();
    expect(screen.getByText('+1 more projects')).toBeInTheDocument();
    expect(screen.getByText('+3 more tasks')).toBeInTheDocument();
  });

  it('loads recent searches from localStorage and lets you re-run one', async () => {
    window.localStorage.setItem('recent_searches', JSON.stringify(['beta', 'gamma']));
    const user = userEvent.setup({ delay: null });
    render(<GlobalSearch />);

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
    await user.click(screen.getByText('beta'));
    expect(screen.getByPlaceholderText('Search across all data (1M+ records)...')).toHaveValue('beta');
  });

  it('persists a new search to recent searches without duplicating it', async () => {
    const user = userEvent.setup({ delay: null });
    render(<GlobalSearch />);

    await type(user, 'alpha');
    const stored = JSON.parse(window.localStorage.getItem('recent_searches') || '[]');
    expect(stored).toEqual(['alpha']);

    await user.clear(screen.getByPlaceholderText('Search across all data (1M+ records)...'));
    await type(user, 'alpha');
    const storedAgain = JSON.parse(window.localStorage.getItem('recent_searches') || '[]');
    expect(storedAgain).toEqual(['alpha']);
  });

  it('renders every project-status and task-priority/status badge color', async () => {
    const user = userEvent.setup({ delay: null });
    mockSearchGlobal.mockResolvedValue({
      users: [],
      projects: [
        makeProject({ id: 'p2', name: 'Project Completed', status: 'completed' }),
        makeProject({ id: 'p3', name: 'Project Planning', status: 'planning' }),
      ],
      tasks: [
        makeTask({ id: 't2', title: 'Critical task', priority: 'critical', status: 'completed' }),
        makeTask({ id: 't3', title: 'High task', priority: 'high', status: 'in-progress' }),
        makeTask({ id: 't4', title: 'Low task', priority: 'low', status: 'blocked' }),
      ],
      total: 5,
    });
    render(<GlobalSearch />);

    await type(user, 'alpha');

    expect(screen.getByText('Project Completed')).toBeInTheDocument();
    expect(screen.getByText('Project Planning')).toBeInTheDocument();
    expect(screen.getByText('Critical task')).toBeInTheDocument();
    expect(screen.getByText('High task')).toBeInTheDocument();
    expect(screen.getByText('Low task')).toBeInTheDocument();
  });

  it('keeps other recent searches when saving a new one on top of them', async () => {
    window.localStorage.setItem('recent_searches', JSON.stringify(['beta']));
    const user = userEvent.setup({ delay: null });
    render(<GlobalSearch />);

    await type(user, 'alpha');

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('recent_searches') || '[]');
      expect(stored).toEqual(['alpha', 'beta']);
    });
  });

  it('logs and clears results when the search fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSearchGlobal.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup({ delay: null });
    render(<GlobalSearch />);

    await type(user, 'alpha');
    expect(consoleSpy).toHaveBeenCalledWith('Search failed:', expect.any(Error));
    expect(screen.queryByText(/Search Results/)).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
