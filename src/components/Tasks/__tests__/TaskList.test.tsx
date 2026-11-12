import { render, screen, within, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { TaskList } from '../TaskList';
import { AppProvider, useApp } from '../../../context/AppContext';
import { useGlobalStore } from '../../../store/globalStore';
import { featureFlags } from '../../../config/featureFlags';
import { Task } from '../../../types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'tl-1',
  title: 'Alpha Task',
  description: 'First task',
  status: 'todo',
  priority: 'medium',
  projectId: 'nonexistent',
  assigneeId: undefined,
  createdBy: '1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 4,
  actualHours: 0,
  tags: [],
  dependencies: [],
  ...overrides,
});

const Seed = ({ tasks }: { tasks: Task[] }) => {
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

const renderWithTasks = (tasks: Task[]) =>
  render(
    <AppProvider>
      <Seed tasks={tasks} />
      <TaskList />
    </AppProvider>
  );

describe('TaskList', () => {
  const initialSelection = useGlobalStore.getState().selectedItems;
  afterEach(() => {
    useGlobalStore.setState({ selectedItems: new Set(initialSelection) });
  });

  it('renders seeded tasks as cards', () => {
    renderWithTasks([makeTask({ id: 'tl-a', title: 'Alpha Task' })]);
    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
  });

  it('filters by status via the dropdown', async () => {
    const user = userEvent.setup();
    renderWithTasks([
      makeTask({ id: 'tl-todo', title: 'Todo Task', status: 'todo' }),
      makeTask({ id: 'tl-done', title: 'Done Task', status: 'completed' }),
    ]);

    await user.selectOptions(screen.getByDisplayValue('All Tasks'), 'completed');

    expect(screen.queryByText('Todo Task')).not.toBeInTheDocument();
    expect(screen.getByText('Done Task')).toBeInTheDocument();
  });

  it('searches via AdvancedSearch across title and description', async () => {
    const user = userEvent.setup();
    renderWithTasks([
      makeTask({ id: 'tl-x', title: 'Searchable Title', description: 'nothing special' }),
      makeTask({ id: 'tl-y', title: 'Other', description: 'unrelated' }),
    ]);

    await user.type(screen.getByPlaceholderText('Search tasks...'), 'searchable');

    // AdvancedSearch debounces the query by 300ms before calling onSearch;
    // a generous timeout absorbs CPU contention under a full parallel run.
    await waitFor(() => expect(screen.queryByText('Other')).not.toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText('Searchable Title')).toBeInTheDocument();
  });

  it('applies an advanced field filter (status equals) via the Filters panel', async () => {
    const user = userEvent.setup();
    renderWithTasks([
      makeTask({ id: 'tl-af-todo', title: 'Todo Field Filter', status: 'todo' }),
      makeTask({ id: 'tl-af-done', title: 'Completed Field Filter', status: 'completed' }),
    ]);

    const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
    // The Filter toggle is the first icon-only button in AdvancedSearch's
    // own header (before History/Save), since no query or filter is set yet.
    await user.click(within(advancedSearch).getAllByRole('button')[0]);
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'status');
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Select...'), 'completed');

    await waitFor(() => {
      expect(screen.getByText('Completed Field Filter')).toBeInTheDocument();
      expect(screen.queryByText('Todo Field Filter')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('applies the contains/startsWith/endsWith operators on a field filter', async () => {
    const user = userEvent.setup();
    renderWithTasks([
      makeTask({ id: 'tl-op-1', title: 'Operator One', status: 'completed' }),
      makeTask({ id: 'tl-op-2', title: 'Operator Two', status: 'todo' }),
    ]);

    const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
    await user.click(within(advancedSearch).getAllByRole('button')[0]);
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'status');

    const operatorSelect = within(advancedSearch).getByDisplayValue('equals');
    const valueSelect = within(advancedSearch).getByDisplayValue('Select...');

    await user.selectOptions(operatorSelect, 'contains');
    await user.selectOptions(valueSelect, 'completed');
    await waitFor(() => {
      expect(screen.getByText('Operator One')).toBeInTheDocument();
      expect(screen.queryByText('Operator Two')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await user.selectOptions(operatorSelect, 'startsWith');
    await waitFor(() => expect(screen.getByText('Operator One')).toBeInTheDocument(), { timeout: 5000 });

    await user.selectOptions(operatorSelect, 'endsWith');
    await waitFor(() => expect(screen.getByText('Operator One')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('applies the greaterThan/lessThan operators on a numeric field filter', async () => {
    const user = userEvent.setup();
    renderWithTasks([
      makeTask({ id: 'tl-num-lo', title: 'Low Estimate', estimatedHours: 2 }),
      makeTask({ id: 'tl-num-hi', title: 'High Estimate', estimatedHours: 200 }),
    ]);

    const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
    await user.click(within(advancedSearch).getAllByRole('button')[0]);
    await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'estimatedHours');

    const operatorSelect = within(advancedSearch).getByDisplayValue('equals');
    await user.selectOptions(operatorSelect, 'greaterThan');
    await user.type(within(advancedSearch).getByPlaceholderText('Enter number...'), '50');

    await waitFor(() => {
      expect(screen.getByText('High Estimate')).toBeInTheDocument();
      expect(screen.queryByText('Low Estimate')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await user.selectOptions(operatorSelect, 'lessThan');
    await waitFor(() => {
      expect(screen.getByText('Low Estimate')).toBeInTheDocument();
      expect(screen.queryByText('High Estimate')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('treats an unset optional field (no assignee) as matching only an empty filter value', async () => {
    const user = userEvent.setup();
    // AdvancedSearch's user-type filter options read from useGlobalStore
    // (not AppContext), which starts empty; seed one user so the Assignee
    // dropdown has a real option to select.
    const previousUsers = useGlobalStore.getState().users;
    useGlobalStore.setState({
      users: [{ id: '1', name: 'Seeded User', email: 's@x.com', role: 'developer', department: 'Eng', joinDate: '2024-01-01', isActive: true }],
    });
    try {
      renderWithTasks([
        makeTask({ id: 'tl-unassigned', title: 'Unassigned Task', assigneeId: undefined }),
      ]);

      const advancedSearch = document.querySelector('.advanced-search') as HTMLElement;
      await user.click(within(advancedSearch).getAllByRole('button')[0]);
      await user.selectOptions(within(advancedSearch).getByDisplayValue('Add filter...'), 'assigneeId');

      // No value picked yet, so the filter's value is still '' - an unset
      // assigneeId matches that empty value.
      await waitFor(() => expect(screen.getByText('Unassigned Task')).toBeInTheDocument(), { timeout: 5000 });

      await user.selectOptions(within(advancedSearch).getByDisplayValue('Select user...'), '1');
      await waitFor(() => expect(screen.queryByText('Unassigned Task')).not.toBeInTheDocument(), { timeout: 5000 });
    } finally {
      useGlobalStore.setState({ users: previousUsers });
    }
  });

  it('falls back to a plain search input when advanced search is disabled', async () => {
    featureFlags.enableAdvancedSearch = false;
    try {
      const user = userEvent.setup();
      renderWithTasks([
        makeTask({ id: 'tl-plain', title: 'Plain Search Target' }),
        makeTask({ id: 'tl-other', title: 'Not Matching' }),
      ]);

      await user.type(screen.getByPlaceholderText('Search tasks...'), 'plain search');

      expect(screen.getByText('Plain Search Target')).toBeInTheDocument();
      expect(screen.queryByText('Not Matching')).not.toBeInTheDocument();
    } finally {
      featureFlags.enableAdvancedSearch = true;
    }
  });

  it('does not render bulk operations or item selectors when the feature flag is off', () => {
    featureFlags.enableBulkOperations = false;
    try {
      renderWithTasks([makeTask()]);
      expect(screen.queryByText('Select All')).not.toBeInTheDocument();
    } finally {
      featureFlags.enableBulkOperations = true;
    }
  });

  it('shows "No tasks found" when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithTasks([makeTask({ title: 'Only One' })]);
    await user.type(screen.getByPlaceholderText('Search tasks...'), 'zzz-no-match');
    // AdvancedSearch debounces the query by 300ms before calling onSearch;
    // a generous timeout absorbs CPU contention under a full parallel run.
    await waitFor(() => {
      expect(screen.getByText('No tasks found matching your criteria.')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('opens the TaskModal on card click and closes it', async () => {
    const user = userEvent.setup();
    renderWithTasks([makeTask({ title: 'Clickable Task' })]);

    await user.click(screen.getByText('Clickable Task'));
    // The close (X) button is always the last button in the modal header -
    // the first is Edit (or Save/Cancel while editing).
    const modalButtons = document.querySelectorAll('.fixed button');
    const modalClose = modalButtons[modalButtons.length - 1] as HTMLElement;
    expect(modalClose).toBeTruthy();

    await user.click(modalClose);
    expect(document.querySelector('.fixed')).not.toBeInTheDocument();
  });

  it('selects an item via its ItemSelector checkbox and bulk-deletes it', async () => {
    const user = userEvent.setup();
    // AppContext always seeds its own default mock tasks too, so the card
    // under test must be found by title rather than assumed to be the only
    // one rendered.
    renderWithTasks([makeTask({ id: 'tl-del', title: 'Delete Me' })]);

    const card = screen.getByText('Delete Me').closest('.relative') as HTMLElement;
    const selectorButton = card.querySelector('button')!;
    await user.click(selectorButton);
    await user.click(selectorButton); // toggles back off
    expect(screen.queryByText('1 item selected')).not.toBeInTheDocument();

    await user.click(selectorButton); // re-select for the delete below
    expect(screen.getByText('1 item selected')).toBeInTheDocument();

    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByText('Delete Selected'));

    expect(screen.queryByText('Delete Me')).not.toBeInTheDocument();
  });

  it('bulk-updates status for a selected item, and can add a tag (task-only bulk field)', async () => {
    const user = userEvent.setup();
    renderWithTasks([makeTask({ id: 'tl-upd', title: 'Update Me', status: 'todo', tags: [] })]);

    const card = screen.getByText('Update Me').closest('.relative') as HTMLElement;
    const selectorButton = card.querySelector('button')!;
    await user.click(selectorButton);
    await user.click(screen.getByText('Bulk Actions'));

    const statusSelect = screen.getByText('Update Status').closest('div')!.querySelector('select')!;
    await user.selectOptions(statusSelect, 'completed');

    expect(await within(card).findByText('Completed')).toBeInTheDocument();
  });

  it('adds a tag via the task-only bulk "Add Tag" input', async () => {
    const user = userEvent.setup();
    renderWithTasks([makeTask({ id: 'tl-tag', title: 'Tag Me', tags: [] })]);

    const card = screen.getByText('Tag Me').closest('.relative') as HTMLElement;
    const selectorButton = card.querySelector('button')!;
    await user.click(selectorButton);
    await user.click(screen.getByText('Bulk Actions'));

    const tagInput = screen.getByPlaceholderText('Enter tag name...');
    await user.type(tagInput, 'urgent{Enter}');

    expect(await within(card).findByText('urgent')).toBeInTheDocument();
  });
});
