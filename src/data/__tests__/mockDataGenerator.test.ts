import { MockDataGenerator, mockDataGenerator } from '../mockDataGenerator';

describe('MockDataGenerator', () => {
  let generator: MockDataGenerator;

  beforeEach(() => {
    generator = new MockDataGenerator();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the same singleton instance via getInstance', () => {
    expect(MockDataGenerator.getInstance()).toBe(MockDataGenerator.getInstance());
    expect(mockDataGenerator).toBe(MockDataGenerator.getInstance());
  });

  describe('generateUsers', () => {
    it('generates the requested number of users with expected shape', () => {
      const users = generator.generateUsers(5);

      expect(users).toHaveLength(5);
      users.forEach((user, index) => {
        expect(user.id).toBe(`user_${index}`);
        expect(user.email).toBe(`user${index}@meditasker.com`);
        expect(typeof user.name).toBe('string');
        expect(user.name.length).toBeGreaterThan(0);
        expect(['admin', 'manager', 'developer', 'designer', 'qa', 'researcher']).toContain(user.role);
        expect(typeof user.department).toBe('string');
        expect(() => new Date(user.joinDate).toISOString()).not.toThrow();
        expect(typeof user.isActive).toBe('boolean');
        expect(user.avatar).toContain('pexels');
      });
    });

    it('generates unique, deterministic ids and names across batch boundaries', () => {
      const users = generator.generateUsers(2500);

      expect(users).toHaveLength(2500);
      const ids = new Set(users.map(u => u.id));
      expect(ids.size).toBe(2500);

      const again = generator.generateUsers(5);
      expect(again.map(u => u.name)).toEqual(users.slice(0, 5).map(u => u.name));
    });

    it('invokes the window.gc hint when available', () => {
      const gcSpy = jest.fn();
      (window as unknown as { gc: () => void }).gc = gcSpy;

      generator.generateUsers(3);

      expect(gcSpy).toHaveBeenCalled();
      delete (window as unknown as { gc?: () => void }).gc;
    });
  });

  describe('generateProjects', () => {
    it('generates projects with valid shape and team assignment from the user pool', () => {
      generator.generateUsers(10);
      const projects = generator.generateProjects(2500);

      expect(projects).toHaveLength(2500);
      projects.forEach((project, index) => {
        expect(project.id).toBe(`project_${index}`);
        expect(typeof project.name).toBe('string');
        expect(typeof project.description).toBe('string');
        expect(['planning', 'active', 'on-hold', 'completed', 'cancelled']).toContain(project.status);
        expect(['low', 'medium', 'high', 'critical']).toContain(project.priority);
        expect(project.progress).toBeGreaterThanOrEqual(0);
        expect(project.progress).toBeLessThanOrEqual(100);
        expect(project.teamIds.length).toBeGreaterThan(0);
        expect(project.managerId).toBe(project.teamIds[0]);
        expect(project.budget).toBeGreaterThanOrEqual(50000);
        expect(project.spentBudget).toBeGreaterThanOrEqual(0);
        expect(project.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('falls back to a default user when no user pool exists yet', () => {
      const projects = generator.generateProjects(1);

      expect(projects[0].teamIds).toEqual(['user_0']);
      expect(projects[0].managerId).toBe('user_0');
    });

    it('reuses cached descriptions for the same index across calls', () => {
      const first = generator.generateProjects(3);
      const second = generator.generateProjects(3);

      expect(second.map(p => p.description)).toEqual(first.map(p => p.description));
    });
  });

  describe('generateTasks', () => {
    it('generates tasks with valid shape drawing from user and project pools', () => {
      generator.generateUsers(10);
      generator.generateProjects(10);
      const tasks = generator.generateTasks(12000);

      expect(tasks).toHaveLength(12000);
      tasks.forEach((task, index) => {
        expect(task.id).toBe(`task_${index}`);
        expect(typeof task.title).toBe('string');
        expect(typeof task.description).toBe('string');
        expect(['todo', 'in-progress', 'review', 'completed', 'blocked']).toContain(task.status);
        expect(['low', 'medium', 'high', 'critical']).toContain(task.priority);
        expect(task.projectId).toMatch(/^project_\d+$/);
        expect(task.assigneeId).toMatch(/^user_\d+$/);
        expect(task.createdBy).toMatch(/^user_\d+$/);
        expect(task.estimatedHours).toBeGreaterThanOrEqual(1);
        expect(task.actualHours).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(task.tags)).toBe(true);
        expect(task.tags.length).toBeGreaterThanOrEqual(1);
        expect(task.tags.length).toBeLessThanOrEqual(4);
        expect(task.dependencies).toEqual([]);
      });
    });

    it('falls back to default ids when no user or project pool exists yet', () => {
      const tasks = generator.generateTasks(1);

      expect(tasks[0].projectId).toBe('project_0');
      expect(tasks[0].assigneeId).toBe('user_0');
      expect(tasks[0].createdBy).toBe('user_0');
    });

    it('may omit the optional due date', () => {
      const tasks = generator.generateTasks(50);
      const withoutDueDate = tasks.filter(t => t.dueDate === undefined);
      const withDueDate = tasks.filter(t => typeof t.dueDate === 'string');

      expect(withoutDueDate.length + withDueDate.length).toBe(50);
    });
  });

  describe('memory management', () => {
    it('reports memory usage reflecting generated pool sizes', () => {
      generator.generateUsers(3);
      generator.generateProjects(2);
      generator.generateTasks(4);

      expect(generator.getMemoryUsage()).toEqual({ users: 3, projects: 2, tasks: 4 });
    });

    it('clears all pools and caches', () => {
      generator.generateUsers(3);
      generator.generateProjects(2);
      generator.generateTasks(4);

      generator.clearCache();

      expect(generator.getMemoryUsage()).toEqual({ users: 0, projects: 0, tasks: 0 });
    });

    it('invokes the window.gc hint on clearCache when available', () => {
      const gcSpy = jest.fn();
      (window as unknown as { gc: () => void }).gc = gcSpy;

      generator.clearCache();

      expect(gcSpy).toHaveBeenCalled();
      delete (window as unknown as { gc?: () => void }).gc;
    });
  });

  describe('optimizeForLargeDatasets', () => {
    it('pre-populates name and description caches without throwing', () => {
      expect(() => generator.optimizeForLargeDatasets()).not.toThrow();

      const users = generator.generateUsers(5);
      expect(users.every(u => typeof u.name === 'string')).toBe(true);
    });
  });
});
