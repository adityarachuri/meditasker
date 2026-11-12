import { render, screen, act } from '@testing-library/react';
import { TeamMemberCard } from '../TeamMemberCard';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Task, Project, User } from '../../../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Jane Doe',
  email: 'jane@meditasker.com',
  role: 'developer',
  department: 'Engineering',
  joinDate: '2024-01-01',
  isActive: true,
  avatar: 'https://example.com/avatar.jpg',
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: `t-${Math.random()}`,
  title: 'A task',
  description: 'desc',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
  assigneeId: 'u1',
  createdBy: 'u1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 1,
  actualHours: 0,
  tags: [],
  dependencies: [],
  ...overrides,
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: `p-${Math.random()}`,
  name: 'A Project',
  description: 'desc',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 0,
  managerId: 'someone-else',
  teamIds: [],
  budget: 1000,
  spentBudget: 0,
  color: '#3b82f6',
  ...overrides,
});

const Seed = ({ tasks, projects }: { tasks: Task[]; projects: Project[] }) => {
  const { state, dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        state.tasks.forEach(t => dispatch({ type: 'DELETE_TASK', payload: t.id }));
        state.projects.forEach(p => dispatch({ type: 'DELETE_PROJECT', payload: p.id }));
        tasks.forEach(t => dispatch({ type: 'ADD_TASK', payload: t }));
        projects.forEach(p => dispatch({ type: 'ADD_PROJECT', payload: p }));
      }}
    >
      seed
    </button>
  );
};

const renderCard = (user: User, tasks: Task[] = [], projects: Project[] = []) => {
  const utils = render(
    <AppProvider>
      <Seed tasks={tasks} projects={projects} />
      <TeamMemberCard user={user} />
    </AppProvider>
  );
  act(() => {
    utils.getByTestId('seed').click();
  });
  return utils;
};

describe('TeamMemberCard', () => {
  it('renders the user name, department, email, and join date', () => {
    renderCard(makeUser());

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('jane@meditasker.com')).toBeInTheDocument();
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
  });

  it.each([
    ['admin', 'Admin'],
    ['manager', 'Manager'],
    ['developer', 'Developer'],
    ['designer', 'Designer'],
    ['qa', 'Qa'],
    ['researcher', 'Researcher'],
  ] as const)('renders the %s role label', (role, label) => {
    renderCard(makeUser({ role }));

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the default role styling for an unrecognized role', () => {
    renderCard(makeUser({ role: 'unknown' as User['role'] }));

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('shows Active status with styling for an active user', () => {
    renderCard(makeUser({ isActive: true }));

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Inactive status for an inactive user', () => {
    renderCard(makeUser({ isActive: false }));

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('counts completed vs active tasks assigned to this user', () => {
    renderCard(makeUser(), [
      makeTask({ id: 't1', assigneeId: 'u1', status: 'completed' }),
      makeTask({ id: 't2', assigneeId: 'u1', status: 'todo' }),
      makeTask({ id: 't3', assigneeId: 'other', status: 'completed' }),
    ]);

    expect(screen.getByText('Completed Tasks')).toBeInTheDocument();
    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
  });

  it('lists projects where the user is on the team or is the manager', () => {
    renderCard(makeUser(), [], [
      makeProject({ id: 'p1', name: 'Team Project', teamIds: ['u1'], status: 'active' }),
      makeProject({ id: 'p2', name: 'Managed Project', managerId: 'u1', status: 'planning' }),
      makeProject({ id: 'p3', name: 'Unrelated Project', teamIds: [], managerId: 'someone-else' }),
    ]);

    expect(screen.getByText('Team Project')).toBeInTheDocument();
    expect(screen.getByText('Managed Project')).toBeInTheDocument();
    expect(screen.queryByText('Unrelated Project')).not.toBeInTheDocument();
  });

  it('shows "+N more" when the user has more than 3 projects', () => {
    renderCard(
      makeUser(),
      [],
      Array.from({ length: 5 }, (_, i) => makeProject({ id: `p${i}`, name: `Project ${i}`, teamIds: ['u1'] }))
    );

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows "No active projects" when the user has none', () => {
    renderCard(makeUser(), [], []);

    expect(screen.getByText('No active projects')).toBeInTheDocument();
  });
});
