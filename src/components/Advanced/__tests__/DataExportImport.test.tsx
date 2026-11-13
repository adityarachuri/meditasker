import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataExportImport } from '../DataExportImport';
import { useGlobalStore } from '../../../store/globalStore';
import { Project, Task, User, Activity } from '../../../types';

// jsdom's File/Blob doesn't implement .text() (handleImport reads an upload
// via file.text(), and these tests read the exported Blob the same way);
// polyfill both via FileReader, which jsdom does support.
const textPolyfill = function (this: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(this);
  });
};
if (!Blob.prototype.text) {
  Blob.prototype.text = textPolyfill;
}
if (!File.prototype.text) {
  File.prototype.text = textPolyfill;
}

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1', name: 'Project Alpha', description: 'desc', status: 'active', priority: 'medium',
  startDate: '2024-01-01', endDate: '2024-06-01', progress: 10, managerId: 'u1', teamIds: [],
  budget: 1000, spentBudget: 100, color: '#3b82f6', ...overrides,
});
const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1', title: 'Fix bug', description: 'desc', status: 'todo', priority: 'medium',
  projectId: 'p1', assigneeId: 'u1', createdBy: 'u1', createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z', estimatedHours: 2, actualHours: 0, tags: [], dependencies: [], ...overrides,
});
const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1', name: 'Alice', email: 'alice@meditasker.com', role: 'developer',
  department: 'Engineering', joinDate: '2024-01-01', isActive: true, ...overrides,
});
const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'a1', type: 'task_created', title: 'Created', description: 'desc', userId: 'u1',
  createdAt: '2024-01-01T00:00:00.000Z', ...overrides,
});

describe('DataExportImport', () => {
  // jsdom doesn't implement these, so jest.spyOn (which requires the property
  // to already exist) can't be used - define them as plain mocks instead.
  let createObjectURLSpy: jest.Mock;
  let revokeObjectURLSpy: jest.Mock;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    useGlobalStore.setState({
      projects: [makeProject()],
      tasks: [makeTask()],
      users: [makeUser()],
      activities: [makeActivity()],
    });
    createObjectURLSpy = jest.fn().mockReturnValue('blob:mock');
    revokeObjectURLSpy = jest.fn();
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = revokeObjectURLSpy;
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // Real timers throughout: the export flow's createObjectURL/click/revoke
    // calls all happen synchronously (or on an already-resolved microtask)
    // before the trailing 1s setTimeout that resets the "Exporting..." UI,
    // so nothing here needs that timer to be advanced. Fake timers would only
    // fight findByText/waitFor's own internal (real-timer-based) polling.
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Manual assignments (jsdom lacks these) aren't undone by restoreAllMocks,
    // and would otherwise leak into other test files sharing this worker.
    delete (URL as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it('renders the export tab by default', () => {
    render(<DataExportImport />);
    expect(screen.getByText('Export Options')).toBeInTheDocument();
    expect(screen.getByText('Projects (1 items)')).toBeInTheDocument();
    expect(screen.getByText('Tasks (1 items)')).toBeInTheDocument();
  });

  it('switches to the import tab', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));
    expect(screen.getByText('Import from File')).toBeInTheDocument();
  });

  it('exports JSON including projects and tasks by default', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.click(screen.getAllByText('Export Data')[1]);
    expect(screen.getByText(/Exporting/)).toBeInTheDocument();


    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('resets the exporting state after the post-export delay', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.click(screen.getAllByText('Export Data')[1]);
    expect(screen.getByText(/Exporting/)).toBeInTheDocument();

    // The 1s reset delay is real wall-clock time (this file uses real timers
    // throughout - see the beforeEach comment above), so this needs a longer
    // waitFor window than the default 1000ms, not a shorter test.
    await waitFor(() => {
      expect(screen.queryByText(/Exporting/)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it('includes users (sanitized) and activities when their checkboxes are checked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.click(screen.getByLabelText(/Users/));
    await user.click(screen.getByLabelText(/Activities/));
    await user.click(screen.getAllByText('Export Data')[1]);


    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const text = await blobCall.text();
    const parsed = JSON.parse(text);
    expect(parsed.users[0].id).toBe('u1');
    expect(parsed.users[0].password).toBeUndefined();
    expect(parsed.activities).toHaveLength(1);
  });

  it('exports as CSV', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.selectOptions(screen.getByRole('combobox'), 'csv');
    await user.click(screen.getAllByText('Export Data')[1]);


    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const text = await blobCall.text();
    expect(text).toContain('Type,ID,Name,Status,Priority,Progress,Budget,Start Date,End Date');
    expect(text).toContain('Project,p1');
    expect(text).toContain('Task,t1');
  });

  it('falls back to CSV for the xlsx format', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.selectOptions(screen.getByRole('combobox'), 'xlsx');
    await user.click(screen.getAllByText('Export Data')[1]);

    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('logs and resets state when the export format is unsupported', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.selectOptions(screen.getByRole('combobox'), 'pdf');
    await user.click(screen.getAllByText('Export Data')[1]);

    expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(screen.queryByText(/Exporting/)).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('filters exported data by a date range', async () => {
    useGlobalStore.setState({
      projects: [
        makeProject({ id: 'in-range', startDate: '2024-03-01' }),
        makeProject({ id: 'out-of-range', startDate: '2020-01-01' }),
      ],
      tasks: [],
    });
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    await user.type(dateInputs[0], '2024-01-01');
    await user.type(dateInputs[1], '2024-12-31');
    await user.click(screen.getAllByText('Export Data')[1]);


    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const parsed = JSON.parse(await blobCall.text());
    expect(parsed.projects.map((p: Project) => p.id)).toEqual(['in-range']);
  });

  it('filters exported data using only a start date', async () => {
    useGlobalStore.setState({
      projects: [
        makeProject({ id: 'in-range', startDate: '2024-06-01' }),
        makeProject({ id: 'out-of-range', startDate: '2020-01-01' }),
      ],
      tasks: [],
    });
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    await user.type(dateInputs[0], '2024-01-01');
    await user.click(screen.getAllByText('Export Data')[1]);

    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const parsed = JSON.parse(await blobCall.text());
    expect(parsed.projects.map((p: Project) => p.id)).toEqual(['in-range']);
  });

  it('filters exported data using only an end date', async () => {
    useGlobalStore.setState({
      projects: [
        makeProject({ id: 'in-range', startDate: '2020-06-01' }),
        makeProject({ id: 'out-of-range', startDate: '2030-01-01' }),
      ],
      tasks: [],
    });
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    await user.type(dateInputs[1], '2024-12-31');
    await user.click(screen.getAllByText('Export Data')[1]);

    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const parsed = JSON.parse(await blobCall.text());
    expect(parsed.projects.map((p: Project) => p.id)).toEqual(['in-range']);
  });

  it('filters tasks by date range using their createdAt field', async () => {
    useGlobalStore.setState({
      projects: [],
      tasks: [
        makeTask({ id: 'in-range', createdAt: '2024-06-01T00:00:00.000Z' }),
        makeTask({ id: 'out-of-range', createdAt: '2020-01-01T00:00:00.000Z' }),
      ],
    });
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    await user.type(dateInputs[0], '2024-01-01');
    await user.type(dateInputs[1], '2024-12-31');
    await user.click(screen.getAllByText('Export Data')[1]);

    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const parsed = JSON.parse(await blobCall.text());
    expect(parsed.tasks.map((t: Task) => t.id)).toEqual(['in-range']);
  });

  it('exports an empty assignee field in CSV for a task with no assigneeId', async () => {
    useGlobalStore.setState({
      projects: [],
      tasks: [makeTask({ id: 'unassigned-task', assigneeId: undefined })],
    });
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);

    await user.selectOptions(screen.getByRole('combobox'), 'csv');
    await user.click(screen.getAllByText('Export Data')[1]);

    const blobCall = createObjectURLSpy.mock.calls[0][0] as Blob;
    const text = await blobCall.text();
    const taskLine = text.split('\n').find(l => l.startsWith('Task,unassigned-task'));
    expect(taskLine).toBeDefined();
    const fields = taskLine!.split(',');
    expect(fields[6]).toBe(''); // Assignee ID column
  });

  it('imports a JSON file and reports success', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const file = new File(
      [JSON.stringify({ projects: [{ id: 'new-p', name: 'New' }], tasks: [{ id: 'new-t', title: 'New Task' }] })],
      'data.json',
      { type: 'application/json' }
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText('Import Successful')).toBeInTheDocument();
    expect(screen.getByText('2 items imported successfully')).toBeInTheDocument();
  });

  it('warns and skips projects/tasks with missing required fields or duplicates', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const file = new File(
      [JSON.stringify({
        projects: [{ id: '', name: '' }, { id: 'p1', name: 'Duplicate' }],
        tasks: [{ id: '', title: '' }, { id: 't1', title: 'Duplicate' }],
      })],
      'data.json',
      { type: 'application/json' }
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText('Import Successful')).toBeInTheDocument();
    expect(screen.getByText('0 items imported successfully')).toBeInTheDocument();
    expect(screen.getByText('Warnings:')).toBeInTheDocument();
  });

  it('imports a CSV file', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const csv = [
      'Type,ID,Name,Status,Priority,Progress,Budget,Start Date,End Date',
      'Project,new-p,"New Project",planning,low,0,1000,2024-01-01,2024-06-01',
      '',
      'Type,ID,Title,Status,Priority,Project ID,Assignee ID,Due Date,Estimated Hours,Actual Hours',
      'Task,new-t,"New Task",todo,low,new-p,,,2,0',
    ].join('\n');
    const file = new File([csv], 'data.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText('Import Successful')).toBeInTheDocument();
    expect(screen.getByText('2 items imported successfully')).toBeInTheDocument();
  });

  it('rejects an unsupported import file format', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const file = new File(['hello'], 'data.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // userEvent.upload rejects this file outright (its accept=".json,.csv"
    // doesn't match .txt) without ever firing the change event; fireEvent
    // bypasses that so handleImport's own extension check is what's tested.
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText('Import Failed')).toBeInTheDocument();
    expect(screen.getByText('Unsupported file format')).toBeInTheDocument();
  });

  it('falls back to a generic message when the import file read rejects with a non-Error', async () => {
    const textSpy = jest.spyOn(File.prototype, 'text').mockRejectedValue('boom');
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const file = new File(['{}'], 'data.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText('Import Failed')).toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();

    textSpy.mockRestore();
  });

  it('reports an invalid data format when the imported JSON is not an object', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const file = new File(['"just a plain string"'], 'data.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText('Import Failed')).toBeInTheDocument();
    expect(screen.getByText('Invalid data format')).toBeInTheDocument();
  });

  it('records per-item errors without aborting the import when a project or task throws during validation', async () => {
    const throwingProject = { id: 'bad-project', get name(): string { throw new Error('boom'); } };
    const goodProject = { id: 'good-project', name: 'Good' };
    const throwingTask = { id: 'bad-task', get title(): string { throw new Error('boom'); } };
    const goodTask = { id: 'good-task', title: 'Good task' };
    const parseSpy = jest.spyOn(JSON, 'parse').mockReturnValue({
      projects: [throwingProject, goodProject],
      tasks: [throwingTask, goodTask],
    });

    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const file = new File(['irrelevant - JSON.parse is mocked above'], 'data.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText('Import Failed')).toBeInTheDocument();
    expect(screen.getByText(/Failed to import project bad-project/)).toBeInTheDocument();
    expect(screen.getByText(/Failed to import task bad-task/)).toBeInTheDocument();
    expect(screen.getByText('2 items imported successfully')).toBeInTheDocument();

    parseSpy.mockRestore();
  });

  it('switches back to the export tab via its own tab button', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));
    expect(screen.getByText('Import from File')).toBeInTheDocument();

    await user.click(screen.getByText('Export Data'));
    expect(screen.getByText('Export Options')).toBeInTheDocument();
  });

  it('clicks the hidden file input when the visible "Choose File" button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const inputClickSpy = jest.spyOn(input, 'click');

    await user.click(screen.getByText('Choose File'));
    expect(inputClickSpy).toHaveBeenCalled();
  });

  it('does nothing when no file is selected', async () => {
    const user = userEvent.setup({ delay: null });
    render(<DataExportImport />);
    await user.click(screen.getByText('Import Data'));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(screen.queryByText('Import Successful')).not.toBeInTheDocument();
  });
});
