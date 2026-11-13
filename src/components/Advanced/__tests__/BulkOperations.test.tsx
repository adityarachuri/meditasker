import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkOperations, ItemSelector } from '../BulkOperations';
import { useGlobalStore } from '../../../store/globalStore';
import { Task } from '../../../types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task One',
  description: 'A sample task',
  status: 'todo',
  priority: 'medium',
  projectId: 'p1',
  assigneeId: 'u1',
  createdBy: 'u1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 4,
  actualHours: 0,
  tags: [],
  dependencies: [],
  ...overrides,
});

describe('BulkOperations', () => {
  beforeEach(() => {
    useGlobalStore.setState({ selectedItems: new Set() });
  });

  it('renders nothing when there are no items', () => {
    const { container } = render(
      <BulkOperations type="tasks" items={[]} onBulkUpdate={jest.fn()} onBulkDelete={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('selects and deselects all items', async () => {
    const user = userEvent.setup();
    const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={jest.fn()} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Select All'));
    expect(useGlobalStore.getState().selectedItems.size).toBe(2);
    expect(screen.getByText('2 items selected')).toBeInTheDocument();

    await user.click(screen.getByText('Deselect All'));
    expect(useGlobalStore.getState().selectedItems.size).toBe(0);
  });

  it('shows a partially-selected indicator when only some items are selected', async () => {
    const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={jest.fn()} onBulkDelete={jest.fn()} />);

    expect(screen.getByText('1 item selected')).toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('opens the bulk menu and updates status for tasks', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'completed');

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { status: 'completed' } }]);
    expect(useGlobalStore.getState().selectedItems.size).toBe(0);
  });

  it('updates priority for selected items', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'high');

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { priority: 'high' } }]);
  });

  it('sets a due date for tasks', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, '2024-06-15');

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { dueDate: '2024-06-15' } }]);
  });

  it('adds a tag to tasks via Enter key and clears the input', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1', tags: ['existing'] })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    const tagInput = screen.getByPlaceholderText('Enter tag name...');
    await user.type(tagInput, 'urgent{Enter}');

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { tags: ['existing', 'urgent'] } }]);
    expect(tagInput).toHaveValue('');
  });

  it('does not add a tag on Enter with an empty value', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    const tagInput = screen.getByPlaceholderText('Enter tag name...');
    await user.type(tagInput, '{Enter}');

    expect(onBulkUpdate).not.toHaveBeenCalled();
  });

  it('creates a tags array for a task with no existing tags', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1', tags: [] })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.type(screen.getByPlaceholderText('Enter tag name...'), 'first{Enter}');

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { tags: ['first'] } }]);
  });

  it('creates a tags array for a task whose tags field is undefined', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1', tags: undefined })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.type(screen.getByPlaceholderText('Enter tag name...'), 'first{Enter}');

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { tags: ['first'] } }]);
  });

  it('archives selected items', async () => {
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByText('Archive Selected'));

    expect(onBulkUpdate).toHaveBeenCalledWith([{ id: 't1', updates: { archived: true } }]);
  });

  it('deletes selected items', async () => {
    const user = userEvent.setup();
    const onBulkDelete = jest.fn().mockResolvedValue(undefined);
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={jest.fn()} onBulkDelete={onBulkDelete} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByText('Delete Selected'));

    expect(onBulkDelete).toHaveBeenCalledWith(['t1']);
  });

  it('does nothing when a bulk action is triggered with no selection', async () => {
    const onBulkUpdate = jest.fn();
    const tasks = [makeTask({ id: 't1' })];
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    expect(screen.queryByText('Bulk Actions')).not.toBeInTheDocument();
  });

  it('shows project-specific status options and clears selection via Clear', async () => {
    const user = userEvent.setup();
    const projects = [
      { id: 'p1', name: 'P', description: '', status: 'active' as const, priority: 'medium' as const, startDate: '', endDate: '', progress: 0, managerId: 'u1', teamIds: [], budget: 0, spentBudget: 0, color: '#fff' },
    ];
    act(() => {
      useGlobalStore.getState().selectItem('p1');
    });
    render(<BulkOperations type="projects" items={projects} onBulkUpdate={jest.fn()} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    expect(screen.getByText('On-hold')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter tag name...')).not.toBeInTheDocument();

    await user.click(screen.getByText('Clear'));
    expect(useGlobalStore.getState().selectedItems.size).toBe(0);
  });

  it('shows a processing indicator while a delete is in flight', async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void = () => {};
    const onBulkDelete = jest.fn(() => new Promise<void>(resolve => { resolveDelete = resolve; }));
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={jest.fn()} onBulkDelete={onBulkDelete} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByText('Delete Selected'));

    expect(screen.getByText('Deleting...')).toBeInTheDocument();

    await act(async () => {
      resolveDelete();
      await Promise.resolve();
    });
  });

  it('logs and recovers when a bulk action throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const onBulkUpdate = jest.fn().mockRejectedValue(new Error('boom'));
    const tasks = [makeTask({ id: 't1' })];
    act(() => {
      useGlobalStore.getState().selectItem('t1');
    });
    render(<BulkOperations type="tasks" items={tasks} onBulkUpdate={onBulkUpdate} onBulkDelete={jest.fn()} />);

    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByText('Archive Selected'));

    expect(consoleSpy).toHaveBeenCalledWith('Bulk operation failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});

describe('ItemSelector', () => {
  it('renders unselected and selected states, and calls onSelect without bubbling', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onParentClick = jest.fn();

    const { rerender } = render(
      <div onClick={onParentClick}>
        <ItemSelector id="t1" selected={false} onSelect={onSelect} />
      </div>
    );

    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('t1');
    expect(onParentClick).not.toHaveBeenCalled();

    rerender(
      <div onClick={onParentClick}>
        <ItemSelector id="t1" selected={true} onSelect={onSelect} className="extra-class" />
      </div>
    );
    expect(screen.getByRole('button').className).toContain('extra-class');
  });
});
