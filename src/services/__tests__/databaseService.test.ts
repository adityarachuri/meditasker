import { DatabaseService, databaseService } from '../databaseService';
import { User, Project, Task } from '../../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Alice Smith',
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
  title: 'Fix the bug',
  description: 'Something is broken',
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

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    service = DatabaseService.getInstance();
    service.clearCache();
  });

  it('returns the same singleton instance', () => {
    expect(DatabaseService.getInstance()).toBe(service);
    expect(databaseService).toBe(service);
  });

  describe('loadUsers / getUsers', () => {
    beforeEach(async () => {
      await service.loadUsers([
        makeUser({ id: 'u1', name: 'Alice Smith', email: 'alice@meditasker.com', department: 'Engineering', role: 'developer', isActive: true }),
        makeUser({ id: 'u2', name: 'Bob Jones', email: 'bob@meditasker.com', department: 'Sales', role: 'manager', isActive: false }),
        makeUser({ id: 'u3', name: 'Carol White', email: 'carol@meditasker.com', department: 'Engineering', role: 'manager', isActive: true }),
      ]);
    });

    it('loads and indexes users, retrievable by id', () => {
      expect(service.getUserById('u1')?.name).toBe('Alice Smith');
      expect(service.getUserById('missing')).toBeUndefined();
    });

    it('returns all users paginated when no filters are given', async () => {
      const result = await service.getUsers(1, 50);
      expect(result.total).toBe(3);
      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(false);
    });

    it('paginates results across pages', async () => {
      const page1 = await service.getUsers(1, 2);
      expect(page1.data).toHaveLength(2);
      expect(page1.hasMore).toBe(true);

      const page2 = await service.getUsers(2, 2);
      expect(page2.data).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it('filters by department using the secondary index', async () => {
      const result = await service.getUsers(1, 50, { department: 'Engineering' });
      expect(result.total).toBe(2);
      expect(result.data.every(u => u.department === 'Engineering')).toBe(true);
    });

    it('filters by role using the secondary index', async () => {
      const result = await service.getUsers(1, 50, { role: 'manager' });
      expect(result.total).toBe(2);
      expect(result.data.every(u => u.role === 'manager')).toBe(true);
    });

    it('returns empty results for a department with no users', async () => {
      const result = await service.getUsers(1, 50, { department: 'Nonexistent' });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by search term across name and email', async () => {
      const byName = await service.getUsers(1, 50, { search: 'bob' });
      expect(byName.data.map(u => u.id)).toEqual(['u2']);

      const byEmail = await service.getUsers(1, 50, { search: 'carol@meditasker' });
      expect(byEmail.data.map(u => u.id)).toEqual(['u3']);
    });

    it('filters by isActive flag', async () => {
      const result = await service.getUsers(1, 50, { isActive: false });
      expect(result.data.map(u => u.id)).toEqual(['u2']);
    });

    it('combines department filter with search', async () => {
      const result = await service.getUsers(1, 50, { department: 'Engineering', search: 'carol' });
      expect(result.data.map(u => u.id)).toEqual(['u3']);
    });

    it('serves cached results for identical repeated queries', async () => {
      const first = await service.getUsers(1, 50);
      const second = await service.getUsers(1, 50);
      expect(second).toEqual(first);
    });

    it('clears indexes on reload rather than accumulating stale users', async () => {
      await service.loadUsers([makeUser({ id: 'only' })]);
      const result = await service.getUsers(1, 50);
      expect(result.total).toBe(1);
      expect(service.getUserById('u1')).toBeUndefined();
    });
  });

  describe('loadProjects / getProjects', () => {
    beforeEach(async () => {
      await service.loadProjects([
        makeProject({ id: 'p1', name: 'Alpha', description: 'First project', status: 'active', priority: 'high', managerId: 'u1' }),
        makeProject({ id: 'p2', name: 'Beta', description: 'Second project', status: 'completed', priority: 'low', managerId: 'u2' }),
        makeProject({ id: 'p3', name: 'Gamma', description: 'Third project', status: 'active', priority: 'critical', managerId: 'u1' }),
      ]);
    });

    it('loads and indexes projects, retrievable by id', () => {
      expect(service.getProjectById('p1')?.name).toBe('Alpha');
      expect(service.getProjectById('missing')).toBeUndefined();
    });

    it('returns all projects when no filters are given', async () => {
      const result = await service.getProjects(1, 50);
      expect(result.total).toBe(3);
    });

    it('filters by status using the secondary index', async () => {
      const result = await service.getProjects(1, 50, { status: 'active' });
      expect(result.data.map(p => p.id).sort()).toEqual(['p1', 'p3']);
    });

    it('filters by priority', async () => {
      const result = await service.getProjects(1, 50, { priority: 'critical' });
      expect(result.data.map(p => p.id)).toEqual(['p3']);
    });

    it('filters by managerId', async () => {
      const result = await service.getProjects(1, 50, { managerId: 'u2' });
      expect(result.data.map(p => p.id)).toEqual(['p2']);
    });

    it('filters by search term across name and description', async () => {
      const result = await service.getProjects(1, 50, { search: 'second' });
      expect(result.data.map(p => p.id)).toEqual(['p2']);
    });

    it('combines a status filter with priority and search', async () => {
      const result = await service.getProjects(1, 50, { status: 'active', priority: 'high', search: 'alpha' });
      expect(result.data.map(p => p.id)).toEqual(['p1']);
    });
  });

  describe('loadTasks / getTasks', () => {
    beforeEach(async () => {
      await service.loadTasks([
        makeTask({ id: 't1', title: 'Fix login bug', description: 'Users cannot log in', status: 'todo', priority: 'high', projectId: 'p1', assigneeId: 'u1', tags: ['bug'] }),
        makeTask({ id: 't2', title: 'Write docs', description: 'Document the API', status: 'completed', priority: 'low', projectId: 'p1', assigneeId: 'u2', tags: ['docs'] }),
        makeTask({ id: 't3', title: 'Design review', description: 'Review new designs', status: 'in-progress', priority: 'medium', projectId: 'p2', assigneeId: undefined, tags: [] }),
      ]);
    });

    it('loads and indexes tasks, retrievable by id', () => {
      expect(service.getTaskById('t1')?.title).toBe('Fix login bug');
      expect(service.getTaskById('missing')).toBeUndefined();
    });

    it('returns all tasks when no filters are given', async () => {
      const result = await service.getTasks(1, 50);
      expect(result.total).toBe(3);
    });

    it('filters by projectId using the most selective index', async () => {
      const result = await service.getTasks(1, 50, { projectId: 'p1' });
      expect(result.data.map(t => t.id).sort()).toEqual(['t1', 't2']);
    });

    it('filters by assigneeId', async () => {
      const result = await service.getTasks(1, 50, { assigneeId: 'u2' });
      expect(result.data.map(t => t.id)).toEqual(['t2']);
    });

    it('filters by status', async () => {
      const result = await service.getTasks(1, 50, { status: 'completed' });
      expect(result.data.map(t => t.id)).toEqual(['t2']);
    });

    it('does not index a task without an assignee under any assignee key', async () => {
      const result = await service.getTasks(1, 50, { assigneeId: 'u1' });
      expect(result.data.map(t => t.id)).toEqual(['t1']);
    });

    it('filters by priority', async () => {
      const result = await service.getTasks(1, 50, { priority: 'high' });
      expect(result.data.map(t => t.id)).toEqual(['t1']);
    });

    it('filters by search term across title and description', async () => {
      const result = await service.getTasks(1, 50, { search: 'api' });
      expect(result.data.map(t => t.id)).toEqual(['t2']);
    });

    it('combines projectId filter with priority and search', async () => {
      const result = await service.getTasks(1, 50, { projectId: 'p1', priority: 'high', search: 'login' });
      expect(result.data.map(t => t.id)).toEqual(['t1']);
    });
  });

  describe('getStats', () => {
    it('aggregates counts across users, projects, and tasks', async () => {
      await service.loadUsers([
        makeUser({ id: 'u1', isActive: true }),
        makeUser({ id: 'u2', isActive: false }),
      ]);
      await service.loadProjects([
        makeProject({ id: 'p1', status: 'active' }),
        makeProject({ id: 'p2', status: 'completed' }),
      ]);
      await service.loadTasks([
        makeTask({ id: 't1', status: 'completed' }),
        makeTask({ id: 't2', status: 'todo' }),
      ]);

      const stats = service.getStats();
      expect(stats).toEqual({
        totalUsers: 2,
        totalProjects: 2,
        totalTasks: 2,
        activeUsers: 1,
        activeProjects: 1,
        completedTasks: 1,
      });
    });
  });

  describe('cache management', () => {
    it('clears the pagination cache and performance metrics', async () => {
      await service.loadUsers([makeUser()]);
      await service.getUsers(1, 50);

      expect(Object.keys(service.getPerformanceMetrics())).toContain('user_query_time');

      service.clearCache();

      expect(service.getPerformanceMetrics()).toEqual({});
    });

    it('evicts the oldest cache entries once the cache exceeds its max size', async () => {
      await service.loadUsers([makeUser()]);

      for (let i = 0; i < 1005; i++) {
        await service.getUsers(1, 50, { search: `term-${i}` });
      }

      expect(service.getMemoryUsage().cacheEntries).toBeLessThanOrEqual(1000);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('records avg/min/max/count after repeated queries', async () => {
      await service.loadUsers([makeUser()]);
      await service.getUsers(1, 50, { search: 'a' });
      await service.getUsers(1, 50, { search: 'b' });

      const metrics = service.getPerformanceMetrics();
      expect(metrics.user_query_time.count).toBe(2);
      expect(metrics.user_query_time.avg).toBeGreaterThanOrEqual(0);
      expect(metrics.user_query_time.min).toBeLessThanOrEqual(metrics.user_query_time.max);
    });

    it('records a cache hit metric on a repeated identical query', async () => {
      await service.loadUsers([makeUser()]);
      await service.getUsers(1, 50);
      await service.getUsers(1, 50);

      const metrics = service.getPerformanceMetrics();
      expect(metrics.user_query_cache_hit.count).toBe(1);
    });
  });

  describe('searchGlobal', () => {
    beforeEach(async () => {
      await service.loadUsers([
        makeUser({ id: 'u1', name: 'Search Target', email: 'alice@meditasker.com', department: 'Engineering' }),
      ]);
      await service.loadProjects([
        makeProject({ id: 'p1', name: 'Search Target Project', description: 'desc' }),
      ]);
      await service.loadTasks([
        makeTask({ id: 't1', title: 'Search Target Task', description: 'desc', tags: ['search-tag'] }),
      ]);
    });

    it('searches across users, projects, and tasks by matching text', async () => {
      const result = await service.searchGlobal('search target');
      expect(result.users.map(u => u.id)).toEqual(['u1']);
      expect(result.projects.map(p => p.id)).toEqual(['p1']);
      expect(result.tasks.map(t => t.id)).toEqual(['t1']);
      expect(result.total).toBe(3);
    });

    it('matches tasks by tag', async () => {
      const result = await service.searchGlobal('search-tag');
      expect(result.tasks.map(t => t.id)).toEqual(['t1']);
    });

    it('returns no results for a query matching nothing', async () => {
      const result = await service.searchGlobal('zzz-nonexistent-zzz');
      expect(result.total).toBe(0);
    });

    it('limits results per entity type to roughly a third of the limit', async () => {
      const users = Array.from({ length: 10 }, (_, i) =>
        makeUser({ id: `u-match-${i}`, name: 'Match Me', email: `match${i}@meditasker.com` })
      );
      await service.loadUsers(users);

      const result = await service.searchGlobal('match', 9);
      expect(result.users.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getMemoryUsage', () => {
    it('reports index sizes for all secondary indexes', async () => {
      await service.loadUsers([
        makeUser({ id: 'u1', department: 'Engineering', role: 'developer' }),
      ]);
      await service.loadProjects([makeProject({ id: 'p1', status: 'active' })]);
      await service.loadTasks([makeTask({ id: 't1', projectId: 'p1', assigneeId: 'u1', status: 'todo' })]);

      const usage = service.getMemoryUsage();
      expect(usage.users).toBe(1);
      expect(usage.projects).toBe(1);
      expect(usage.tasks).toBe(1);
      expect(usage.indexSizes.usersByDepartment).toBe(1);
      expect(usage.indexSizes.usersByRole).toBe(1);
      expect(usage.indexSizes.tasksByProject).toBe(1);
      expect(usage.indexSizes.tasksByAssignee).toBe(1);
      expect(usage.indexSizes.tasksByStatus).toBe(1);
      expect(usage.indexSizes.projectsByStatus).toBe(1);
    });
  });

  describe('getHealthStatus', () => {
    it('reports healthy status when indexes are populated and queries are fast', async () => {
      await service.loadUsers([makeUser()]);
      await service.loadProjects([makeProject()]);
      await service.loadTasks([makeTask()]);
      await service.getUsers(1, 50);

      const health = service.getHealthStatus();
      expect(health.metrics.indexHealth).toBe(true);
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
    });

    it('reports unhealthy indexes when a dataset is empty', async () => {
      await service.loadUsers([]);
      await service.loadProjects([]);
      await service.loadTasks([]);

      const health = service.getHealthStatus();
      expect(health.metrics.indexHealth).toBe(false);
      expect(health.status).toBe('critical');
    });
  });
});
