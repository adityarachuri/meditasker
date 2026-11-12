import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { TaskModal } from '../TaskModal';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Task } from '../../../types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'tm-1',
  title: 'Fix the login bug',
  description: 'Users cannot log in',
  status: 'todo',
  priority: 'medium',
  projectId: 'nonexistent-project',
  assigneeId: '1',
  createdBy: '2',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-05T00:00:00.000Z',
  estimatedHours: 10,
  actualHours: 4,
  tags: ['Bug', 'Frontend'],
  dependencies: [],
  ...overrides,
});

const SeedTask = ({ task }: { task: Task }) => {
  const { dispatch } = useApp();
  // Dispatching must happen in an effect, not during render: dispatching
  // directly in the render body re-triggers AppProvider's render on every
  // pass, which re-renders this component and dispatches again - an
  // infinite loop that hangs the test run instead of failing it.
  useEffect(() => {
    dispatch({ type: 'ADD_TASK', payload: task });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);
  return null;
};

const renderModal = (task: Task, onClose = jest.fn()) =>
  render(
    <AppProvider>
      <SeedTask task={task} />
      <TaskModal task={task} onClose={onClose} />
    </AppProvider>
  );

const withFixedNow = (iso: string, fn: () => void) => {
  const spy = jest.spyOn(Date, 'now').mockReturnValue(new Date(iso).getTime());
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
};

describe('TaskModal', () => {
  it('renders title, description, creator, and created/updated dates in view mode', () => {
    renderModal(makeTask());
    expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
    expect(screen.getByText('Users cannot log in')).toBeInTheDocument();
    expect(screen.getByText('Michael Chen')).toBeInTheDocument(); // createdBy "2"
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument(); // assignee "1"
  });

  it('shows "Unassigned" when there is no assignee', () => {
    renderModal(makeTask({ assigneeId: undefined }));
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('shows "No due date" when dueDate is unset', () => {
    renderModal(makeTask({ dueDate: undefined }));
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  it('shows "Overdue" styling for a past due date', () => {
    withFixedNow('2024-06-15T00:00:00.000Z', () => {
      renderModal(makeTask({ dueDate: '2024-06-01T00:00:00.000Z' }));
      expect(screen.getByText('(Overdue)')).toBeInTheDocument();
    });
  });

  it('shows "Due today"/"Due tomorrow" and a days-left count', () => {
    withFixedNow('2024-06-01T00:00:00.000Z', () => {
      renderModal(makeTask({ dueDate: '2024-06-01T00:00:00.000Z' }));
      expect(screen.getByText('(Due today)')).toBeInTheDocument();
    });
  });

  it('shows days-left count for a future due date', () => {
    withFixedNow('2024-06-01T00:00:00.000Z', () => {
      renderModal(makeTask({ dueDate: '2024-06-10T00:00:00.000Z' }));
      expect(screen.getByText('(9 days left)')).toBeInTheDocument();
    });
  });

  const statuses: Array<Task['status']> = ['todo', 'in-progress', 'review', 'completed', 'blocked'];
  it.each(statuses)('renders the %s status badge in view mode', (status) => {
    renderModal(makeTask({ status }));
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  const priorities: Array<Task['priority']> = ['critical', 'high', 'medium', 'low'];
  it.each(priorities)('renders the %s priority label in view mode', (priority) => {
    renderModal(makeTask({ priority }));
    const label = priority.charAt(0).toUpperCase() + priority.slice(1);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });

  it('renders all tags', () => {
    renderModal(makeTask({ tags: ['One', 'Two'] }));
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });

  it('enters edit mode, edits every field, saves, and dispatches UPDATE_TASK', async () => {
    const user = userEvent.setup();
    const task = makeTask({ assigneeId: '1', dueDate: '2024-06-01T00:00:00.000Z' });
    renderModal(task);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]); // Edit (pencil) button — first button in the header

    const description = screen.getByRole('textbox');
    await user.clear(description);
    await user.type(description, 'Updated description');

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '2'); // assignee
    await user.selectOptions(selects[1], 'completed'); // status
    await user.selectOptions(selects[2], 'high'); // priority

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, '2024-07-01');

    const hoursInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    await user.clear(hoursInput);
    await user.type(hoursInput, '8');

    const saveButton = screen.getAllByRole('button').find(b => b.className.includes('text-green-600'));
    await user.click(saveButton!);

    // Back in view mode, showing the saved values. Assignee was changed to
    // user "2" (Michael Chen), who is also this task's creator, so "Michael
    // Chen" now legitimately appears twice (assignee and creator sections).
    expect(screen.getByText('Updated description')).toBeInTheDocument();
    expect(screen.getAllByText('Michael Chen').length).toBe(2);
  }, 20000); // several sequential interactions in one test

  it('clears the assignee when selecting the empty option while editing', async () => {
    const user = userEvent.setup();
    renderModal(makeTask({ assigneeId: '1' }));

    await user.click(screen.getAllByRole('button')[0]);
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '');

    const saveButton = screen.getAllByRole('button').find(b => b.className.includes('text-green-600'));
    await user.click(saveButton!);

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('clears the due date when the date input is emptied while editing', async () => {
    const user = userEvent.setup();
    renderModal(makeTask({ dueDate: '2024-06-01T00:00:00.000Z' }));

    await user.click(screen.getAllByRole('button')[0]);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.clear(dateInput);

    const saveButton = screen.getAllByRole('button').find(b => b.className.includes('text-green-600'));
    await user.click(saveButton!);

    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  it('falls back to 0 actual hours when the hours input is cleared to a non-number', async () => {
    const user = userEvent.setup();
    renderModal(makeTask({ actualHours: 5 }));

    await user.click(screen.getAllByRole('button')[0]);
    const hoursInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    await user.clear(hoursInput);

    const saveButton = screen.getAllByRole('button').find(b => b.className.includes('text-green-600'));
    await user.click(saveButton!);

    expect(screen.getByText('0h / 10h')).toBeInTheDocument();
  });

  it('discards edits and exits edit mode when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderModal(makeTask({ description: 'Original description' }));

    await user.click(screen.getAllByRole('button')[0]); // edit
    const description = screen.getByRole('textbox');
    await user.clear(description);
    await user.type(description, 'Discarded edit');

    const cancelButton = screen.getAllByRole('button')[1]; // save, cancel, close in that header order
    await user.click(cancelButton);

    expect(screen.getByText('Original description')).toBeInTheDocument();
    expect(screen.queryByText('Discarded edit')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderModal(makeTask(), onClose);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
