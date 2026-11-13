import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectListVirtualized } from '../ProjectListVirtualized';
import { AppProvider } from '../../../context/AppContext';
import { databaseService } from '../../../services/databaseService';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import { Project } from '../../../types';

jest.mock('../../../services/databaseService', () => ({
  databaseService: {
    getProjects: jest.fn(),
  },
}));

// Forwards to the real hook by default; individual tests can override its
// return value to deterministically force a state (e.g. loading) that's
// otherwise racy to reach through the real fetch/virtualized-list plumbing.
jest.mock('../../../hooks/usePaginatedData', () => {
  const actual = jest.requireActual('../../../hooks/usePaginatedData');
  return { ...actual, usePaginatedData: jest.fn(actual.usePaginatedData) };
});

const mockGetProjects = databaseService.getProjects as jest.Mock;
const mockUsePaginatedData = usePaginatedData as jest.Mock;
const actualUsePaginatedData = jest.requireActual('../../../hooks/usePaginatedData').usePaginatedData;

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Project Alpha',
  description: 'A sample project',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 42,
  managerId: '1',
  teamIds: ['1', '2'],
  budget: 10000,
  spentBudget: 2500,
  color: '#3b82f6',
  ...overrides,
});

// ProjectCard (rendered in card view) calls useApp(), so every render needs
// the real AppProvider even though this component's own data comes from the
// mocked databaseService via usePaginatedData.
const renderComponent = () => render(<AppProvider><ProjectListVirtualized /></AppProvider>);

describe('ProjectListVirtualized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProjects.mockResolvedValue({ data: [makeProject()], total: 1, hasMore: false });
    mockUsePaginatedData.mockImplementation(actualUsePaginatedData);
  });

  it('loads and renders projects in the table view by default', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());
    expect(screen.getByText('1 projects total')).toBeInTheDocument();
    // "Active"/"Medium" also appear as <option> text in the filter selects,
    // so assert on the status/priority badge elements specifically.
    expect(document.querySelector('.bg-green-100.text-green-800')).toHaveTextContent('Active');
    expect(document.querySelector('.text-yellow-600')).toHaveTextContent('Medium');
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('switches to card view and renders ProjectCard for each item', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());

    await user.click(screen.getByTitle('Card view'));

    // ProjectCard renders the project name as a heading; the table's cell
    // text for the same name is gone once the table unmounts.
    expect(screen.getByRole('heading', { name: 'Project Alpha' })).toBeInTheDocument();

    await user.click(screen.getByTitle('Table view'));
    expect(screen.queryByRole('heading', { name: 'Project Alpha' })).not.toBeInTheDocument();
  });

  it('shows a loading indicator in card view while fetching more', async () => {
    const user = userEvent.setup();
    mockUsePaginatedData.mockReturnValue({
      data: [makeProject()],
      loading: true,
      hasMore: true,
      total: 2,
      loadMore: jest.fn(),
      search: jest.fn(),
    });

    renderComponent();
    await user.click(screen.getByTitle('Card view'));
    expect(screen.getByText('Loading more projects...')).toBeInTheDocument();
  });

  it('hides the card-view loading indicator once fetching more finishes', async () => {
    const user = userEvent.setup();
    mockUsePaginatedData.mockReturnValue({
      data: [makeProject()],
      loading: false,
      hasMore: true,
      total: 2,
      loadMore: jest.fn(),
      search: jest.fn(),
    });

    renderComponent();
    await user.click(screen.getByTitle('Card view'));
    expect(screen.queryByText('Loading more projects...')).not.toBeInTheDocument();
  });

  it('logs a click on a table row and on a card', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    renderComponent();
    await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());

    await user.click(screen.getByText('Project Alpha'));
    expect(consoleSpy).toHaveBeenCalledWith('Project clicked:', 'Project Alpha');

    await user.click(screen.getByTitle('Card view'));
    const heading = await screen.findByRole('heading', { name: 'Project Alpha' });
    consoleSpy.mockClear();
    await user.click(heading);
    expect(consoleSpy).toHaveBeenCalledWith('Project clicked:', 'Project Alpha');

    consoleSpy.mockRestore();
  });

  it('renders filter dropdowns and a search box that call the service with new filters', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Search projects...'), 'alpha');
    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ search: 'alpha' })
      );
    });

    await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'active');
    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ status: 'active' })
      );
    });

    await user.selectOptions(screen.getByDisplayValue('All Priorities'), 'high');
    await waitFor(() => {
      expect(mockGetProjects).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ priority: 'high' })
      );
    });
  }, 15000); // three sequential interactions in one test

  it('shows an empty state when there are no matching projects', async () => {
    mockGetProjects.mockResolvedValue({ data: [], total: 0, hasMore: false });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/No projects found matching your criteria/)).toBeInTheDocument();
    });
  });

  const statusClasses: Record<Project['status'], string> = {
    active: '.bg-green-100.text-green-800',
    planning: '.bg-blue-100.text-blue-800',
    completed: '.bg-gray-100.text-gray-800',
    'on-hold': '.bg-yellow-100.text-yellow-800',
    cancelled: '.bg-red-100.text-red-800',
  };
  const statusValues = Object.keys(statusClasses) as Array<Project['status']>;
  it.each(statusValues)('renders the %s status column style', async (status) => {
    mockGetProjects.mockResolvedValue({ data: [makeProject({ status })], total: 1, hasMore: false });
    renderComponent();
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    await waitFor(() => {
      expect(document.querySelector(statusClasses[status])).toHaveTextContent(label);
    });
  });

  const priorityClasses: Record<Project['priority'], string> = {
    critical: '.text-red-600',
    high: '.text-orange-600',
    medium: '.text-yellow-600',
    low: '.text-green-600',
  };
  const priorityValues = Object.keys(priorityClasses) as Array<Project['priority']>;
  it.each(priorityValues)('renders the %s priority column style', async (priority) => {
    mockGetProjects.mockResolvedValue({ data: [makeProject({ priority })], total: 1, hasMore: false });
    renderComponent();
    const label = priority.charAt(0).toUpperCase() + priority.slice(1);
    await waitFor(() => {
      expect(document.querySelector(priorityClasses[priority])).toHaveTextContent(label);
    });
  });

  it('renders team size and budget columns', async () => {
    mockGetProjects.mockResolvedValue({
      data: [makeProject({ teamIds: ['1', '2', '3'], budget: 20000, spentBudget: 5000 })],
      total: 1,
      hasMore: false,
    });
    renderComponent();
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.getByText('$20,000')).toBeInTheDocument();
    expect(screen.getByText('$5,000 spent')).toBeInTheDocument();
  });
});
