import { render, screen, act } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Task, Project, User } from '../../../types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: `t-${Math.random()}`,
  title: 'A task',
  description: 'desc',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
  assigneeId: '1',
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 1,
  actualHours: 0,
  tags: [],
  dependencies: [],
  ...overrides,
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Sample Project',
  description: 'desc',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 50,
  managerId: '1',
  teamIds: ['1'],
  budget: 1000,
  spentBudget: 0,
  color: '#3b82f6',
  ...overrides,
});

// AppContext has no action to add a brand-new user, only UPDATE_USER (which
// replaces an existing one by id) - so tests that need a named assignee
// overwrite seeded user id '1' rather than inventing a new id.
const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  name: 'Sample User',
  email: 'sample@meditasker.com',
  role: 'developer',
  department: 'Engineering',
  joinDate: '2024-01-01',
  isActive: true,
  ...overrides,
});

const dayOffset = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const Seed = ({ tasks, projects, users }: { tasks: Task[]; projects: Project[]; users: User[] }) => {
  const { state, dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        state.tasks.forEach(t => dispatch({ type: 'DELETE_TASK', payload: t.id }));
        state.projects.forEach(p => dispatch({ type: 'DELETE_PROJECT', payload: p.id }));
        projects.forEach(p => dispatch({ type: 'ADD_PROJECT', payload: p }));
        users.forEach(u => dispatch({ type: 'UPDATE_USER', payload: u }));
        tasks.forEach(t => dispatch({ type: 'ADD_TASK', payload: t }));
      }}
    >
      seed
    </button>
  );
};

const renderWithData = (tasks: Task[], projects: Project[] = [makeProject()], users: User[] = [makeUser()]) => {
  const utils = render(
    <AppProvider>
      <Seed tasks={tasks} projects={projects} users={users} />
      <Dashboard />
    </AppProvider>
  );
  act(() => {
    utils.getByTestId('seed').click();
  });
  return utils;
};

describe('Dashboard', () => {
  it('renders the fixed dashboard metrics', () => {
    render(
      <AppProvider>
        <Dashboard />
      </AppProvider>
    );

    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    // "Active Projects" appears twice: the metric card title and
    // ProjectProgress's own section heading.
    expect(screen.getAllByText('Active Projects').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByText('Budget Overview')).toBeInTheDocument();
    expect(screen.getByText(`$${(550000).toLocaleString()}`)).toBeInTheDocument();
    expect(screen.getByText('47.3% utilized')).toBeInTheDocument();
  });

  it('shows an overdue task with its project and assignee', () => {
    renderWithData([
      makeTask({ id: 't1', title: 'Overdue task', dueDate: dayOffset(-3), projectId: 'p1', assigneeId: '1' }),
    ]);

    expect(screen.getByText('Overdue task')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    const detail = screen.getByText('Overdue task').parentElement?.querySelector('p');
    expect(detail?.textContent).toBe('Sample Project • Sample User');
  });

  it('shows "Due today" for a task due today', () => {
    renderWithData([makeTask({ id: 't1', title: 'Due today task', dueDate: dayOffset(0) })]);

    expect(screen.getByText('Due today')).toBeInTheDocument();
  });

  it('shows "Due tomorrow" for a task due tomorrow', () => {
    renderWithData([makeTask({ id: 't1', title: 'Due tomorrow task', dueDate: dayOffset(1) })]);

    expect(screen.getByText('Due tomorrow')).toBeInTheDocument();
  });

  it('shows "N days" for a task due further in the future', () => {
    renderWithData([makeTask({ id: 't1', title: 'Future task', dueDate: dayOffset(5) })]);

    expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
  });

  it('excludes completed tasks and tasks without a due date from the deadlines list', () => {
    renderWithData([
      makeTask({ id: 't1', title: 'Completed but overdue', dueDate: dayOffset(-1), status: 'completed' }),
      makeTask({ id: 't2', title: 'No due date' }),
    ]);

    expect(screen.queryByText('Completed but overdue')).not.toBeInTheDocument();
    expect(screen.queryByText('No due date')).not.toBeInTheDocument();
  });

  it('shows only the 5 soonest deadlines, sorted ascending', () => {
    const tasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({ id: `t${i}`, title: `Task ${i}`, dueDate: dayOffset(i + 1) })
    );
    renderWithData(tasks);

    expect(screen.getByText('Task 0')).toBeInTheDocument();
    expect(screen.getByText('Task 4')).toBeInTheDocument();
    expect(screen.queryByText('Task 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Task 6')).not.toBeInTheDocument();
  });
});
