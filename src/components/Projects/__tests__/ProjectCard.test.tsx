import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from '../ProjectCard';
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
  teamIds: ['1'],
  budget: 10000,
  spentBudget: 2500,
  color: '#3b82f6',
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task One',
  description: 'desc',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
  assigneeId: '1',
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 4,
  actualHours: 1,
  tags: [],
  dependencies: [],
  ...overrides,
});

// ADD_TASK appends to AppContext's real mock-seeded state (24+ existing
// users with ids "1".."25") — ProjectCard reads state.users/state.tasks via
// useApp(), so tasks need seeding this way, but team members just reference
// existing seeded user ids directly (AppContext has no ADD_USER action).
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

describe('ProjectCard', () => {
  const statuses: Array<Project['status']> = ['active', 'planning', 'on-hold', 'completed', 'cancelled'];
  it.each(statuses)('renders the %s status badge', (status) => {
    const project = makeProject({ id: `p-${status}`, status });
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  const priorities: Array<Project['priority']> = ['critical', 'high', 'medium', 'low'];
  it.each(priorities)('renders with %s priority without throwing', (priority) => {
    const project = makeProject({ id: `p-${priority}`, priority });
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    expect(screen.getByText(project.name)).toBeInTheDocument();
  });

  it('falls back to the default status/priority color for an unrecognized value', () => {
    const project = makeProject({
      status: 'mystery' as Project['status'],
      priority: 'mystery' as Project['priority'],
    });
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('Mystery')).toBeInTheDocument();
  });

  it('shows team member avatars and a "+N" overflow badge beyond 4 members', () => {
    const teamIds = ['1', '2', '3', '4', '5', '6'];
    const project = makeProject({ teamIds });
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('6 members')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(4);
  });

  it('counts completed tasks out of total tasks for the project', () => {
    const project = makeProject();
    const tasks = [
      makeTask({ id: 'pc-t1', projectId: 'p1', status: 'completed' }),
      makeTask({ id: 'pc-t2', projectId: 'p1', status: 'todo' }),
      makeTask({ id: 'pc-t3', projectId: 'other-project', status: 'completed' }),
    ];
    render(
      <AppProvider>
        <SeedTasks tasks={tasks} />
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('1/2 tasks completed')).toBeInTheDocument();
  });

  it('calls onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    const project = makeProject();
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={onClick} />
      </AppProvider>
    );
    await user.click(screen.getByText(project.name));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders budget, end date, and description', () => {
    const project = makeProject({ budget: 50000, endDate: '2024-12-25', description: 'Ships gifts' });
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('Ships gifts')).toBeInTheDocument();
    expect(screen.getByText(new Date('2024-12-25').toLocaleDateString())).toBeInTheDocument();
  });

  it('has no team members when teamIds is empty', () => {
    const project = makeProject({ teamIds: [] });
    render(
      <AppProvider>
        <ProjectCard project={project} onClick={jest.fn()} />
      </AppProvider>
    );
    expect(screen.getByText('0 members')).toBeInTheDocument();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});
