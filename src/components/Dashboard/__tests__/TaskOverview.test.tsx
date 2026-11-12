import { render, screen, act } from '@testing-library/react';
import { TaskOverview } from '../TaskOverview';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Task } from '../../../types';

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

const SeedTasks = ({ tasks }: { tasks: Task[] }) => {
  const { state, dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        state.tasks.forEach(t => dispatch({ type: 'DELETE_TASK', payload: t.id }));
        tasks.forEach(t => dispatch({ type: 'ADD_TASK', payload: t }));
      }}
    >
      seed
    </button>
  );
};

const renderWithTasks = (tasks: Task[]) => {
  const utils = render(
    <AppProvider>
      <SeedTasks tasks={tasks} />
      <TaskOverview />
    </AppProvider>
  );
  act(() => {
    utils.getByTestId('seed').click();
  });
  return utils;
};

describe('TaskOverview', () => {
  it('counts tasks per status correctly', () => {
    renderWithTasks([
      makeTask({ id: 't1', status: 'todo' }),
      makeTask({ id: 't2', status: 'todo' }),
      makeTask({ id: 't3', status: 'in-progress' }),
      makeTask({ id: 't4', status: 'review' }),
      makeTask({ id: 't5', status: 'completed' }),
      makeTask({ id: 't6', status: 'blocked' }),
    ]);

    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders zero counts when there are no tasks', () => {
    renderWithTasks([]);

    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(5);
  });
});
