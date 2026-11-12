import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { ProjectModal } from '../ProjectModal';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Project, Task } from '../../../types';

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

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'pm-t1',
  title: 'Design review',
  description: 'desc',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
  assigneeId: '1',
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  dueDate: '2024-03-01T00:00:00.000Z',
  estimatedHours: 4,
  actualHours: 1,
  tags: [],
  dependencies: [],
  ...overrides,
});

const SeedTasks = ({ tasks }: { tasks: Task[] }) => {
  const { dispatch } = useApp();
  // Dispatching must happen in an effect, not during render: dispatching
  // directly in the render body re-triggers AppProvider's render on every
  // pass, which re-renders this component and dispatches again - an
  // infinite loop that hangs the test run instead of failing it.
  useEffect(() => {
    tasks.forEach(t => dispatch({ type: 'ADD_TASK', payload: t }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);
  return null;
};

const renderModal = (project: Project, tasks: Task[] = [], onClose = jest.fn()) =>
  render(
    <AppProvider>
      <SeedTasks tasks={tasks} />
      <ProjectModal project={project} onClose={onClose} />
    </AppProvider>
  );

describe('ProjectModal', () => {
  it('renders the overview tab by default with manager, timeline, budget, and quick stats', () => {
    const tasks = [
      makeTask({ id: 'pm-1', status: 'completed' }),
      makeTask({ id: 'pm-2', status: 'todo' }),
    ];
    // A single-member team keeps the "Team Members" quick-stat (1) from
    // colliding with the "Total Tasks" stat (2) asserted below.
    renderModal(makeProject({ teamIds: ['1'] }), tasks);

    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument(); // manager (user id "1")
    expect(screen.getByText('$2,500 / $10,000')).toBeInTheDocument();
    expect(screen.getByText('42% Complete')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total tasks stat
  });

  const statuses: Array<Project['status']> = ['active', 'planning', 'on-hold', 'completed', 'cancelled'];
  it.each(statuses)('renders the %s status badge', (status) => {
    renderModal(makeProject({ status }));
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  const priorities: Array<Project['priority']> = ['critical', 'high', 'medium', 'low'];
  it.each(priorities)('renders the %s priority label', (priority) => {
    renderModal(makeProject({ priority }));
    const label = priority.charAt(0).toUpperCase() + priority.slice(1);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('falls back to the default status/priority color for an unrecognized value', () => {
    const project = makeProject({
      status: 'mystery' as Project['status'],
      priority: 'mystery' as Project['priority'],
    });
    renderModal(project);
    expect(screen.getAllByText('Mystery').length).toBeGreaterThan(0);
  });

  it('switches to the Tasks tab and lists tasks with assignee and due date', async () => {
    const user = userEvent.setup();
    const tasks = [
      makeTask({ id: 'pm-due', title: 'Has a due date', dueDate: '2024-03-01T00:00:00.000Z' }),
      makeTask({ id: 'pm-nodue', title: 'Open-ended task', dueDate: undefined }),
    ];
    renderModal(makeProject(), tasks);

    await user.click(screen.getByRole('button', { name: 'Tasks' }));

    expect(screen.getByText('Has a due date')).toBeInTheDocument();
    expect(screen.getByText('Open-ended task')).toBeInTheDocument();
    expect(screen.getByText(/No due date$/)).toBeInTheDocument();
  });

  const taskStatuses: Array<Task['status']> = ['todo', 'in-progress', 'review', 'completed', 'blocked'];
  it.each(taskStatuses)('renders the %s task status badge in the Tasks tab', async (status) => {
    const user = userEvent.setup();
    renderModal(makeProject(), [makeTask({ id: `pm-status-${status}`, status })]);

    await user.click(screen.getByRole('button', { name: 'Tasks' }));

    const label = status.charAt(0).toUpperCase() + status.slice(1);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('switches to the Team tab and lists team members with their task counts', async () => {
    const user = userEvent.setup();
    const tasks = [makeTask({ id: 'pm-team-1', assigneeId: '1' })];
    renderModal(makeProject({ teamIds: ['1', '2'] }), tasks);

    await user.click(screen.getByRole('button', { name: 'Team' }));

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Michael Chen')).toBeInTheDocument();
    expect(screen.getByText('1 tasks')).toBeInTheDocument();
    expect(screen.getByText('0 tasks')).toBeInTheDocument();
  });

  it('switches to the Timeline tab and shows start/end date, duration, and sorted milestones', async () => {
    const user = userEvent.setup();
    const tasks = [
      makeTask({ id: 'pm-m2', title: 'Later milestone', dueDate: '2024-05-01T00:00:00.000Z' }),
      makeTask({ id: 'pm-m1', title: 'Earlier milestone', dueDate: '2024-02-01T00:00:00.000Z' }),
      makeTask({ id: 'pm-nodue', title: 'No milestone', dueDate: undefined }),
    ];
    renderModal(makeProject({ startDate: '2024-01-01', endDate: '2024-02-01' }), tasks);

    await user.click(screen.getByRole('button', { name: 'Timeline' }));

    expect(screen.getByText('31 days')).toBeInTheDocument();
    expect(screen.queryByText('No milestone')).not.toBeInTheDocument();

    const earlier = screen.getByText('Earlier milestone');
    const later = screen.getByText('Later milestone');
    expect(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(makeProject(), [], onClose);

    const closeButton = document.querySelector('button');
    await user.click(closeButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
