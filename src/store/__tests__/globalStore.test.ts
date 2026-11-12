import { useGlobalStore } from '../globalStore';
import { User, Project, Task } from '../../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Alice',
  email: 'alice@meditasker.com',
  role: 'developer',
  department: 'Engineering',
  joinDate: '2024-01-01',
  isActive: true,
  ...overrides,
});

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Project Alpha',
  description: 'A sample project',
  status: 'active',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 0,
  managerId: 'u1',
  teamIds: ['u1'],
  budget: 1000,
  spentBudget: 0,
  color: '#3b82f6',
  ...overrides,
});

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

const initialState = useGlobalStore.getState();

describe('useGlobalStore', () => {
  beforeEach(() => {
    useGlobalStore.setState(
      {
        users: [],
        projects: [],
        tasks: [],
        notifications: [],
        activities: [],
        selectedItems: new Set(),
        filters: {
          projects: { status: [], priority: [], search: '' },
          tasks: { status: [], priority: [], assignee: [], search: '' },
        },
        cache: new Map(),
        lastUpdated: new Map(),
      },
      false
    );
  });

  afterAll(() => {
    useGlobalStore.setState(initialState, true);
  });

  describe('users', () => {
    it('sets the full user list', () => {
      useGlobalStore.getState().setUsers([makeUser()]);
      expect(useGlobalStore.getState().users).toHaveLength(1);
    });

    it('adds a user', () => {
      useGlobalStore.getState().addUser(makeUser());
      expect(useGlobalStore.getState().users).toHaveLength(1);
    });

    it('updates an existing user', () => {
      useGlobalStore.getState().addUser(makeUser());
      useGlobalStore.getState().updateUser('u1', { name: 'Alice Updated' });
      expect(useGlobalStore.getState().users[0].name).toBe('Alice Updated');
    });

    it('does nothing when updating a user that does not exist', () => {
      useGlobalStore.getState().addUser(makeUser());
      useGlobalStore.getState().updateUser('nonexistent', { name: 'Ghost' });
      expect(useGlobalStore.getState().users[0].name).toBe('Alice');
    });

    it('removes a user', () => {
      useGlobalStore.getState().addUser(makeUser());
      useGlobalStore.getState().removeUser('u1');
      expect(useGlobalStore.getState().users).toHaveLength(0);
    });
  });

  describe('projects', () => {
    it('sets, adds, updates, and removes projects', () => {
      useGlobalStore.getState().setProjects([makeProject()]);
      expect(useGlobalStore.getState().projects).toHaveLength(1);

      useGlobalStore.getState().addProject(makeProject({ id: 'p2', name: 'Beta' }));
      expect(useGlobalStore.getState().projects).toHaveLength(2);

      useGlobalStore.getState().updateProject('p1', { status: 'completed' });
      expect(useGlobalStore.getState().projects.find(p => p.id === 'p1')?.status).toBe('completed');

      useGlobalStore.getState().removeProject('p2');
      expect(useGlobalStore.getState().projects).toHaveLength(1);
    });
  });

  describe('tasks', () => {
    it('sets, adds, updates, and removes tasks', () => {
      useGlobalStore.getState().setTasks([makeTask()]);
      expect(useGlobalStore.getState().tasks).toHaveLength(1);

      useGlobalStore.getState().addTask(makeTask({ id: 't2', title: 'Task Two' }));
      expect(useGlobalStore.getState().tasks).toHaveLength(2);

      useGlobalStore.getState().updateTask('t1', { status: 'completed' });
      expect(useGlobalStore.getState().tasks.find(t => t.id === 't1')?.status).toBe('completed');

      useGlobalStore.getState().removeTask('t2');
      expect(useGlobalStore.getState().tasks).toHaveLength(1);
    });

    it('bulk-updates multiple tasks at once', () => {
      useGlobalStore.getState().setTasks([
        makeTask({ id: 't1' }),
        makeTask({ id: 't2' }),
      ]);

      useGlobalStore.getState().bulkUpdateTasks([
        { id: 't1', updates: { status: 'in-progress' } },
        { id: 't2', updates: { status: 'completed' } },
      ]);

      const tasks = useGlobalStore.getState().tasks;
      expect(tasks.find(t => t.id === 't1')?.status).toBe('in-progress');
      expect(tasks.find(t => t.id === 't2')?.status).toBe('completed');
    });
  });

  describe('selection', () => {
    it('selects, deselects, selects all, and clears selection', () => {
      useGlobalStore.getState().selectItem('t1');
      expect(useGlobalStore.getState().selectedItems.has('t1')).toBe(true);

      useGlobalStore.getState().deselectItem('t1');
      expect(useGlobalStore.getState().selectedItems.has('t1')).toBe(false);

      useGlobalStore.getState().selectAll(['t1', 't2']);
      expect(useGlobalStore.getState().selectedItems.size).toBe(2);

      useGlobalStore.getState().clearSelection();
      expect(useGlobalStore.getState().selectedItems.size).toBe(0);
    });
  });

  describe('filters', () => {
    it('updates project filters', () => {
      useGlobalStore.getState().updateProjectFilters({ status: ['active'] });
      expect(useGlobalStore.getState().filters.projects.status).toEqual(['active']);
    });

    it('updates task filters', () => {
      useGlobalStore.getState().updateTaskFilters({ search: 'urgent' });
      expect(useGlobalStore.getState().filters.tasks.search).toBe('urgent');
    });

    it('clears all filters back to defaults', () => {
      useGlobalStore.getState().updateProjectFilters({ status: ['active'] });
      useGlobalStore.getState().updateTaskFilters({ search: 'urgent' });

      useGlobalStore.getState().clearFilters();

      expect(useGlobalStore.getState().filters.projects).toEqual({ status: [], priority: [], search: '' });
      expect(useGlobalStore.getState().filters.tasks).toEqual({ status: [], priority: [], assignee: [], search: '' });
    });
  });

  describe('cache', () => {
    it('sets, gets, and clears cached values', () => {
      useGlobalStore.getState().setCache('key1', { foo: 'bar' });
      expect(useGlobalStore.getState().getCache('key1')).toEqual({ foo: 'bar' });

      useGlobalStore.getState().clearCache();
      expect(useGlobalStore.getState().getCache('key1')).toBeUndefined();
    });
  });

  describe('computed selectors', () => {
    beforeEach(() => {
      useGlobalStore.getState().setProjects([
        makeProject({ id: 'p1', name: 'Alpha', status: 'active', priority: 'high' }),
        makeProject({ id: 'p2', name: 'Beta', status: 'completed', priority: 'low' }),
      ]);
      useGlobalStore.getState().setTasks([
        makeTask({ id: 't1', title: 'Fix bug', status: 'todo', priority: 'high', assigneeId: 'u1', projectId: 'p1' }),
        makeTask({ id: 't2', title: 'Write docs', status: 'completed', priority: 'low', assigneeId: 'u2', projectId: 'p2' }),
      ]);
    });

    it('filters projects by status', () => {
      useGlobalStore.getState().updateProjectFilters({ status: ['active'] });
      const filtered = useGlobalStore.getState().getFilteredProjects();
      expect(filtered.map(p => p.id)).toEqual(['p1']);
    });

    it('filters projects by priority', () => {
      useGlobalStore.getState().updateProjectFilters({ priority: ['high'] });
      const filtered = useGlobalStore.getState().getFilteredProjects();
      expect(filtered.map(p => p.id)).toEqual(['p1']);
    });

    it('filters projects by search term across name and description', () => {
      useGlobalStore.getState().updateProjectFilters({ search: 'alpha' });
      const filtered = useGlobalStore.getState().getFilteredProjects();
      expect(filtered.map(p => p.id)).toEqual(['p1']);
    });

    it('filters tasks by status, priority, and assignee', () => {
      useGlobalStore.getState().updateTaskFilters({ assignee: ['u1'] });
      const filtered = useGlobalStore.getState().getFilteredTasks();
      expect(filtered.map(t => t.id)).toEqual(['t1']);
    });

    it('filters tasks by status', () => {
      useGlobalStore.getState().updateTaskFilters({ status: ['todo'] });
      const filtered = useGlobalStore.getState().getFilteredTasks();
      expect(filtered.map(t => t.id)).toEqual(['t1']);
    });

    it('filters tasks by priority', () => {
      useGlobalStore.getState().updateTaskFilters({ priority: ['high'] });
      const filtered = useGlobalStore.getState().getFilteredTasks();
      expect(filtered.map(t => t.id)).toEqual(['t1']);
    });

    it('filters tasks by search term across title and description', () => {
      useGlobalStore.getState().updateTaskFilters({ search: 'docs' });
      const filtered = useGlobalStore.getState().getFilteredTasks();
      expect(filtered.map(t => t.id)).toEqual(['t2']);
    });

    it('returns all tasks for a given project', () => {
      expect(useGlobalStore.getState().getProjectTasks('p1').map(t => t.id)).toEqual(['t1']);
    });

    it('returns all tasks assigned to a given user', () => {
      expect(useGlobalStore.getState().getUserTasks('u2').map(t => t.id)).toEqual(['t2']);
    });
  });

  describe('lastUpdated subscriber (module-level performance monitor)', () => {
    it('invokes the window.gc hint when available', () => {
      const gcSpy = jest.fn();
      (window as unknown as { gc: () => void }).gc = gcSpy;

      useGlobalStore.getState().addUser(makeUser());

      expect(gcSpy).toHaveBeenCalled();
      delete (window as unknown as { gc?: () => void }).gc;
    });

    it('logs when a lastUpdated entry is stale by more than 5 seconds', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const nowSpy = jest.spyOn(Date, 'now');
      let current = 1_000_000;
      nowSpy.mockImplementation(() => current);

      useGlobalStore.getState().addUser(makeUser());
      current += 6000; // jump forward so the next action's subscriber sees a stale prior entry

      useGlobalStore.getState().addProject(makeProject());

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('was last updated'));

      nowSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
