import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '../TaskCard';
import { AppProvider } from '../../../context/AppContext';
import { Task } from '../../../types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Fix the bug',
  description: 'Something is broken',
  status: 'todo',
  priority: 'medium',
  projectId: 'nonexistent-project',
  assigneeId: undefined,
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 10,
  actualHours: 4,
  tags: [],
  dependencies: [],
  ...overrides,
});

const withFixedNow = (iso: string, fn: () => void) => {
  const spy = jest.spyOn(Date, 'now').mockReturnValue(new Date(iso).getTime());
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
};

describe('TaskCard', () => {
  const statuses: Array<Task['status']> = ['todo', 'in-progress', 'review', 'completed', 'blocked'];
  it.each(statuses)('renders the %s status badge', (status) => {
    const task = makeTask({ status });
    render(<AppProvider><TaskCard task={task} onClick={jest.fn()} /></AppProvider>);
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('shows an alert icon only when blocked', () => {
    render(<AppProvider><TaskCard task={makeTask({ status: 'blocked' })} onClick={jest.fn()} /></AppProvider>);
    expect(document.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('does not show the alert icon when not blocked', () => {
    render(<AppProvider><TaskCard task={makeTask({ status: 'todo' })} onClick={jest.fn()} /></AppProvider>);
    expect(document.querySelector('.text-red-500')).not.toBeInTheDocument();
  });

  const priorities: Array<Task['priority']> = ['critical', 'high', 'medium', 'low'];
  it.each(priorities)('renders with %s priority without throwing', (priority) => {
    const task = makeTask({ priority });
    render(<AppProvider><TaskCard task={task} onClick={jest.fn()} /></AppProvider>);
    expect(screen.getByText(task.title)).toBeInTheDocument();
  });

  it('falls back to default status/priority styling for unrecognized values', () => {
    const task = makeTask({ status: 'mystery' as Task['status'], priority: 'mystery' as Task['priority'] });
    render(<AppProvider><TaskCard task={task} onClick={jest.fn()} /></AppProvider>);
    expect(screen.getByText('Mystery')).toBeInTheDocument();
  });

  it('shows "Unassigned" when there is no assignee', () => {
    render(<AppProvider><TaskCard task={makeTask({ assigneeId: undefined })} onClick={jest.fn()} /></AppProvider>);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('shows the assignee name when assigned to an existing user', () => {
    render(<AppProvider><TaskCard task={makeTask({ assigneeId: '1' })} onClick={jest.fn()} /></AppProvider>);
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
  });

  it('renders nothing for project name when the project cannot be found', () => {
    render(<AppProvider><TaskCard task={makeTask()} onClick={jest.fn()} /></AppProvider>);
    // No throw, and no due-date block since dueDate is unset.
    expect(screen.queryByText(/Overdue|Due today|Due tomorrow/)).not.toBeInTheDocument();
  });

  it('does not render a due-date row when dueDate is unset', () => {
    render(<AppProvider><TaskCard task={makeTask({ dueDate: undefined })} onClick={jest.fn()} /></AppProvider>);
    expect(screen.queryByText(/Overdue|Due today|Due tomorrow/)).not.toBeInTheDocument();
  });

  it('shows "Overdue" in red for a due date in the past', () => {
    withFixedNow('2024-06-15T00:00:00.000Z', () => {
      render(<AppProvider><TaskCard task={makeTask({ dueDate: '2024-06-01T00:00:00.000Z' })} onClick={jest.fn()} /></AppProvider>);
      const overdue = screen.getByText('Overdue');
      expect(overdue).toBeInTheDocument();
      expect(overdue.className).toContain('text-red-600');
    });
  });

  it('shows "Due today" when the due date is today', () => {
    withFixedNow('2024-06-01T00:00:00.000Z', () => {
      render(<AppProvider><TaskCard task={makeTask({ dueDate: '2024-06-01T00:00:00.000Z' })} onClick={jest.fn()} /></AppProvider>);
      expect(screen.getByText('Due today')).toBeInTheDocument();
    });
  });

  it('shows "Due tomorrow" when the due date is one day away', () => {
    withFixedNow('2024-06-01T00:00:00.000Z', () => {
      render(<AppProvider><TaskCard task={makeTask({ dueDate: '2024-06-02T00:00:00.000Z' })} onClick={jest.fn()} /></AppProvider>);
      expect(screen.getByText('Due tomorrow')).toBeInTheDocument();
    });
  });

  it('shows a near-due date in orange when within the next 2 days (but not tomorrow/today)', () => {
    // 1.5 days away rounds up to 2 via Math.ceil, hitting the "<= 2" orange branch
    // through a date rather than the tomorrow/today special cases.
    withFixedNow('2024-06-01T12:00:00.000Z', () => {
      render(<AppProvider><TaskCard task={makeTask({ dueDate: '2024-06-03T00:00:00.000Z' })} onClick={jest.fn()} /></AppProvider>);
      const dateText = screen.getByText(new Date('2024-06-03T00:00:00.000Z').toLocaleDateString());
      expect(dateText.className).toContain('text-orange-600');
    });
  });

  it('shows a far-future due date in gray, formatted as a date', () => {
    withFixedNow('2024-01-01T00:00:00.000Z', () => {
      render(<AppProvider><TaskCard task={makeTask({ dueDate: '2024-12-25T00:00:00.000Z' })} onClick={jest.fn()} /></AppProvider>);
      const dateText = screen.getByText(new Date('2024-12-25T00:00:00.000Z').toLocaleDateString());
      expect(dateText.className).toContain('text-gray-600');
    });
  });

  it('renders all tags', () => {
    render(<AppProvider><TaskCard task={makeTask({ tags: ['Backend', 'Urgent'] })} onClick={jest.fn()} /></AppProvider>);
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('shows actual/estimated hours and caps the progress bar width at 100%', () => {
    render(<AppProvider><TaskCard task={makeTask({ actualHours: 20, estimatedHours: 10 })} onClick={jest.fn()} /></AppProvider>);
    expect(screen.getByText('20h / 10h')).toBeInTheDocument();
    const bar = document.querySelector('.bg-blue-600.h-2');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('calls onClick when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<AppProvider><TaskCard task={makeTask()} onClick={onClick} /></AppProvider>);
    await user.click(screen.getByText('Fix the bug'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
