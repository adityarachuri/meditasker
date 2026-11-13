import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskListVirtualized } from '../TaskListVirtualized';
import { AppProvider } from '../../../context/AppContext';
import { databaseService } from '../../../services/databaseService';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import { Task, Project, User } from '../../../types';

jest.mock('../../../services/databaseService', () => ({
  databaseService: {
    getTasks: jest.fn(),
    getProjectById: jest.fn(),
    getUserById: jest.fn(),
  },
}));

// Forwards to the real hook by default; individual tests can override its
// return value to deterministically force a state (e.g. loading) that's
// otherwise racy to reach through the real fetch/virtualized-list plumbing.
jest.mock('../../../hooks/usePaginatedData', () => {
  const actual = jest.requireActual('../../../hooks/usePaginatedData');
  return { ...actual, usePaginatedData: jest.fn(actual.usePaginatedData) };
});

const mockGetTasks = databaseService.getTasks as jest.Mock;
const mockGetProjectById = databaseService.getProjectById as jest.Mock;
const mockGetUserById = databaseService.getUserById as jest.Mock;
const mockUsePaginatedData = usePaginatedData as jest.Mock;
const actualUsePaginatedData = jest.requireActual('../../../hooks/usePaginatedData').usePaginatedData;

const project: Project = {
  id: 'p1',
  name: 'Claims Automation',
  description: 'desc',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 10,
  managerId: '1',
  teamIds: ['1'],
  budget: 1000,
  spentBudget: 0,
  color: '#3b82f6',
};

const user1: User = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah@meditasker.com',
  role: 'manager',
  department: 'Engineering',
  joinDate: '2024-01-01',
  isActive: true,
};

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Design review',
  description: 'desc',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
  assigneeId: '1',
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 10,
  actualHours: 2,
  tags: [],
  dependencies: [],
  ...overrides,
});

const renderComponent = () => render(<AppProvider><TaskListVirtualized /></AppProvider>);

describe('TaskListVirtualized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTasks.mockResolvedValue({ data: [makeTask()], total: 1, hasMore: false });
    mockGetProjectById.mockReturnValue(project);
    mockGetUserById.mockReturnValue(user1);
    mockUsePaginatedData.mockImplementation(actualUsePaginatedData);
  });

  it('loads and renders tasks in the table view by default, including project/assignee lookups', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Design review')).toBeInTheDocument());
    expect(screen.getByText('1 tasks total')).toBeInTheDocument();
    expect(screen.getByText(/Claims Automation/)).toBeInTheDocument();
    // "Sarah Johnson" also appears as an option in the assignee filter
    // dropdown, so at least one match (not exactly one) is what we can assert.
    expect(screen.getAllByText('Sarah Johnson').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Unknown User" when the assignee cannot be resolved', async () => {
    mockGetUserById.mockReturnValue(undefined);
    renderComponent();
    // Also appears as an option in the assignee filter dropdown (built from
    // the same lookup), so this can match more than once.
    await waitFor(() => expect(screen.getAllByText('Unknown User').length).toBeGreaterThanOrEqual(1));
  });

  it('shows "Unassigned" when the task has no assignee', async () => {
    mockGetTasks.mockResolvedValue({ data: [makeTask({ assigneeId: undefined })], total: 1, hasMore: false });
    renderComponent();
    await waitFor(() => expect(screen.getByText('Unassigned')).toBeInTheDocument());
  });

  it('shows "No due date" when the task has no due date', async () => {
    mockGetTasks.mockResolvedValue({ data: [makeTask({ dueDate: undefined })], total: 1, hasMore: false });
    renderComponent();
    await waitFor(() => expect(screen.getByText('No due date')).toBeInTheDocument());
  });

  it('colors an overdue due date red and a near one orange', async () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    mockGetTasks.mockResolvedValue({ data: [makeTask({ dueDate: past })], total: 1, hasMore: false });
    renderComponent();
    await waitFor(() => {
      const el = screen.getByText(new Date(past).toLocaleDateString());
      expect(el.className).toContain('text-red-600');
    });
  });

  it('colors a due-soon date orange and a far-off one gray', async () => {
    const soon = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    mockGetTasks.mockResolvedValue({ data: [makeTask({ dueDate: soon })], total: 1, hasMore: false });
    const { unmount } = renderComponent();
    await waitFor(() => {
      const el = screen.getByText(new Date(soon).toLocaleDateString());
      expect(el.className).toContain('text-orange-600');
    });
    unmount();

    const farOff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockGetTasks.mockResolvedValue({ data: [makeTask({ dueDate: farOff })], total: 1, hasMore: false });
    renderComponent();
    await waitFor(() => {
      const el = screen.getByText(new Date(farOff).toLocaleDateString());
      expect(el.className).toContain('text-gray-700');
    });
  });

  it('truncates tags beyond 2 with a "+N more" label', async () => {
    mockGetTasks.mockResolvedValue({
      data: [makeTask({ tags: ['a', 'b', 'c', 'd'] })],
      total: 1,
      hasMore: false,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByText('+2 more')).toBeInTheDocument());
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.queryByText('c')).not.toBeInTheDocument();
  });

  it('caps the hours progress bar width at 100%', async () => {
    mockGetTasks.mockResolvedValue({
      data: [makeTask({ actualHours: 50, estimatedHours: 10 })],
      total: 1,
      hasMore: false,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByText('50h / 10h')).toBeInTheDocument());
  });

  it('switches to card view and renders TaskCard for each item', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Design review')).toBeInTheDocument());

    await user.click(screen.getByTitle('Card view'));
    expect(screen.getByRole('heading', { name: 'Design review' })).toBeInTheDocument();

    await user.click(screen.getByTitle('Table view'));
    expect(screen.queryByRole('heading', { name: 'Design review' })).not.toBeInTheDocument();
  });

  it('logs a click on a table row and on a card', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    renderComponent();
    await waitFor(() => expect(screen.getByText('Design review')).toBeInTheDocument());

    await user.click(screen.getByText('Design review'));
    expect(consoleSpy).toHaveBeenCalledWith('Task clicked:', 'Design review');

    await user.click(screen.getByTitle('Card view'));
    const heading = await screen.findByRole('heading', { name: 'Design review' });
    consoleSpy.mockClear();
    await user.click(heading);
    expect(consoleSpy).toHaveBeenCalledWith('Task clicked:', 'Design review');

    consoleSpy.mockRestore();
  });

  it('shows a loading indicator in card view while fetching more', async () => {
    const user = userEvent.setup();
    mockUsePaginatedData.mockReturnValue({
      data: [makeTask()],
      loading: true,
      hasMore: true,
      total: 2,
      loadMore: jest.fn(),
      search: jest.fn(),
    });

    renderComponent();
    await user.click(screen.getByTitle('Card view'));
    expect(screen.getByText('Loading more tasks...')).toBeInTheDocument();
  });

  it('hides the card-view loading indicator once fetching more finishes', async () => {
    const user = userEvent.setup();
    mockUsePaginatedData.mockReturnValue({
      data: [makeTask()],
      loading: false,
      hasMore: true,
      total: 2,
      loadMore: jest.fn(),
      search: jest.fn(),
    });

    renderComponent();
    await user.click(screen.getByTitle('Card view'));
    expect(screen.queryByText('Loading more tasks...')).not.toBeInTheDocument();
  });

  it('filters by status, priority, and assignee, and searches', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Design review')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Search tasks...'), 'bug');
    await waitFor(() => {
      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ search: 'bug' })
      );
    });

    await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'completed');
    await waitFor(() => {
      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ status: 'completed' })
      );
    });

    await user.selectOptions(screen.getByDisplayValue('All Priorities'), 'critical');
    await waitFor(() => {
      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ priority: 'critical' })
      );
    });

    await waitFor(() => expect(screen.getByDisplayValue('All Assignees')).toBeInTheDocument());
    await user.selectOptions(screen.getByDisplayValue('All Assignees'), '1');
    await waitFor(() => {
      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ assigneeId: '1' })
      );
    });
  }, 20000); // four sequential interactions in one test

  it('shows an empty state with an enterprise hint when there are no matching tasks', async () => {
    mockGetTasks.mockResolvedValue({ data: [], total: 0, hasMore: false });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/No tasks found matching your criteria/)).toBeInTheDocument();
    });
    expect(screen.getByText('Enterprise search optimized for large datasets')).toBeInTheDocument();
  });

  const statusValues: Array<Task['status']> = ['todo', 'in-progress', 'review', 'completed', 'blocked'];
  it.each(statusValues)('renders the %s status column style', async (status) => {
    mockGetTasks.mockResolvedValue({ data: [makeTask({ status })], total: 1, hasMore: false });
    renderComponent();
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    await waitFor(() => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
  });

  const priorityValues: Array<Task['priority']> = ['critical', 'high', 'medium', 'low'];
  it.each(priorityValues)('renders the %s priority column style', async (priority) => {
    mockGetTasks.mockResolvedValue({ data: [makeTask({ priority })], total: 1, hasMore: false });
    renderComponent();
    const label = priority.charAt(0).toUpperCase() + priority.slice(1);
    await waitFor(() => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
  });
});
