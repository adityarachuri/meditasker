import { User, Project, Task } from '../types';

// Database service with indexing and pagination for large datasets
export class DatabaseService {
  private static instance: DatabaseService;
  
  // In-memory indexes for fast lookups
  private userIndex = new Map<string, User>();
  private projectIndex = new Map<string, Project>();
  private taskIndex = new Map<string, Task>();
  
  // Secondary indexes for common queries
  private usersByDepartment = new Map<string, Set<string>>();
  private usersByRole = new Map<string, Set<string>>();
  private tasksByProject = new Map<string, Set<string>>();
  private tasksByAssignee = new Map<string, Set<string>>();
  private tasksByStatus = new Map<string, Set<string>>();
  private projectsByStatus = new Map<string, Set<string>>();
  
  // Pagination cache
  private paginationCache = new Map<string, any[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Bulk data loading with indexing
  async loadUsers(users: User[]): Promise<void> {
    console.time('Loading users');
    
    // Clear existing indexes
    this.userIndex.clear();
    this.usersByDepartment.clear();
    this.usersByRole.clear();
    
    // Build indexes in batches
    const batchSize = 1000;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      batch.forEach(user => {
        // Primary index
        this.userIndex.set(user.id, user);
        
        // Department index
        if (!this.usersByDepartment.has(user.department)) {
          this.usersByDepartment.set(user.department, new Set());
        }
        this.usersByDepartment.get(user.department)!.add(user.id);
        
        // Role index
        if (!this.usersByRole.has(user.role)) {
          this.usersByRole.set(user.role, new Set());
        }
        this.usersByRole.get(user.role)!.add(user.id);
      });
      
      // Allow event loop to process other tasks
      if (i % 1000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(`Indexed ${i + batch.length} users...`);
      }
    }
    
    console.timeEnd('Loading users');
    console.log(`Loaded ${users.length} users with indexes`);
  }

  async loadProjects(projects: Project[]): Promise<void> {
    console.time('Loading projects');
    
    this.projectIndex.clear();
    this.projectsByStatus.clear();
    
    const batchSize = 250;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      batch.forEach(project => {
        this.projectIndex.set(project.id, project);
        
        if (!this.projectsByStatus.has(project.status)) {
          this.projectsByStatus.set(project.status, new Set());
        }
        this.projectsByStatus.get(project.status)!.add(project.id);
      });
      
      if (i % 500 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(`Indexed ${i + batch.length} projects...`);
      }
    }
    
    console.timeEnd('Loading projects');
    console.log(`Loaded ${projects.length} projects with indexes`);
  }

  async loadTasks(tasks: Task[]): Promise<void> {
    console.time('Loading tasks');
    
    this.taskIndex.clear();
    this.tasksByProject.clear();
    this.tasksByAssignee.clear();
    this.tasksByStatus.clear();
    
    const batchSize = 500;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      batch.forEach(task => {
        this.taskIndex.set(task.id, task);
        
        // Project index
        if (!this.tasksByProject.has(task.projectId)) {
          this.tasksByProject.set(task.projectId, new Set());
        }
        this.tasksByProject.get(task.projectId)!.add(task.id);
        
        // Assignee index
        if (task.assigneeId) {
          if (!this.tasksByAssignee.has(task.assigneeId)) {
            this.tasksByAssignee.set(task.assigneeId, new Set());
          }
          this.tasksByAssignee.get(task.assigneeId)!.add(task.id);
        }
        
        // Status index
        if (!this.tasksByStatus.has(task.status)) {
          this.tasksByStatus.set(task.status, new Set());
        }
        this.tasksByStatus.get(task.status)!.add(task.id);
      });
      
      if (i % 2000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(`Indexed ${i + batch.length} tasks...`);
      }
    }
    
    console.timeEnd('Loading tasks');
    console.log(`Loaded ${tasks.length} tasks with indexes`);
  }

  // Paginated queries with caching
  async getUsers(page: number = 1, limit: number = 50, filters?: {
    department?: string;
    role?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<{ data: User[]; total: number; hasMore: boolean }> {
    const cacheKey = `users_${page}_${limit}_${JSON.stringify(filters)}`;
    
    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.paginationCache.get(cacheKey);
    }
    
    let userIds: string[] = [];
    
    // Apply filters using indexes
    if (filters?.department) {
      const departmentUsers = this.usersByDepartment.get(filters.department);
      userIds = departmentUsers ? Array.from(departmentUsers) : [];
    } else if (filters?.role) {
      const roleUsers = this.usersByRole.get(filters.role);
      userIds = roleUsers ? Array.from(roleUsers) : [];
    } else {
      userIds = Array.from(this.userIndex.keys());
    }
    
    // Apply additional filters
    if (filters?.search || filters?.isActive !== undefined) {
      userIds = userIds.filter(id => {
        const user = this.userIndex.get(id)!;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!user.name.toLowerCase().includes(searchLower) &&
              !user.email.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        
        if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
          return false;
        }
        
        return true;
      });
    }
    
    const total = userIds.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedIds = userIds.slice(startIndex, endIndex);
    
    const data = paginatedIds.map(id => this.userIndex.get(id)!);
    const hasMore = endIndex < total;
    
    const result = { data, total, hasMore };
    
    // Cache result
    this.paginationCache.set(cacheKey, result);
    this.cacheTimestamps.set(cacheKey, Date.now());
    
    return result;
  }

  async getTasks(page: number = 1, limit: number = 50, filters?: {
    projectId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<{ data: Task[]; total: number; hasMore: boolean }> {
    const cacheKey = `tasks_${page}_${limit}_${JSON.stringify(filters)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.paginationCache.get(cacheKey);
    }
    
    let taskIds: string[] = [];
    
    // Use most selective index first
    if (filters?.projectId) {
      const projectTasks = this.tasksByProject.get(filters.projectId);
      taskIds = projectTasks ? Array.from(projectTasks) : [];
    } else if (filters?.assigneeId) {
      const assigneeTasks = this.tasksByAssignee.get(filters.assigneeId);
      taskIds = assigneeTasks ? Array.from(assigneeTasks) : [];
    } else if (filters?.status) {
      const statusTasks = this.tasksByStatus.get(filters.status);
      taskIds = statusTasks ? Array.from(statusTasks) : [];
    } else {
      taskIds = Array.from(this.taskIndex.keys());
    }
    
    // Apply remaining filters
    if (filters?.priority || filters?.search) {
      taskIds = taskIds.filter(id => {
        const task = this.taskIndex.get(id)!;
        
        if (filters.priority && task.priority !== filters.priority) {
          return false;
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!task.title.toLowerCase().includes(searchLower) &&
              !task.description.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    const total = taskIds.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedIds = taskIds.slice(startIndex, endIndex);
    
    const data = paginatedIds.map(id => this.taskIndex.get(id)!);
    const hasMore = endIndex < total;
    
    const result = { data, total, hasMore };
    
    this.paginationCache.set(cacheKey, result);
    this.cacheTimestamps.set(cacheKey, Date.now());
    
    return result;
  }

  async getProjects(page: number = 1, limit: number = 50, filters?: {
    status?: string;
    priority?: string;
    managerId?: string;
    search?: string;
  }): Promise<{ data: Project[]; total: number; hasMore: boolean }> {
    const cacheKey = `projects_${page}_${limit}_${JSON.stringify(filters)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.paginationCache.get(cacheKey);
    }
    
    let projectIds: string[] = [];
    
    if (filters?.status) {
      const statusProjects = this.projectsByStatus.get(filters.status);
      projectIds = statusProjects ? Array.from(statusProjects) : [];
    } else {
      projectIds = Array.from(this.projectIndex.keys());
    }
    
    // Apply additional filters
    if (filters?.priority || filters?.managerId || filters?.search) {
      projectIds = projectIds.filter(id => {
        const project = this.projectIndex.get(id)!;
        
        if (filters.priority && project.priority !== filters.priority) {
          return false;
        }
        
        if (filters.managerId && project.managerId !== filters.managerId) {
          return false;
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!project.name.toLowerCase().includes(searchLower) &&
              !project.description.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    const total = projectIds.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedIds = projectIds.slice(startIndex, endIndex);
    
    const data = paginatedIds.map(id => this.projectIndex.get(id)!);
    const hasMore = endIndex < total;
    
    const result = { data, total, hasMore };
    
    this.paginationCache.set(cacheKey, result);
    this.cacheTimestamps.set(cacheKey, Date.now());
    
    return result;
  }

  // Fast lookups by ID
  getUserById(id: string): User | undefined {
    return this.userIndex.get(id);
  }

  getProjectById(id: string): Project | undefined {
    return this.projectIndex.get(id);
  }

  getTaskById(id: string): Task | undefined {
    return this.taskIndex.get(id);
  }

  // Aggregation queries
  getStats(): {
    totalUsers: number;
    totalProjects: number;
    totalTasks: number;
    activeUsers: number;
    activeProjects: number;
    completedTasks: number;
  } {
    const activeUsers = Array.from(this.userIndex.values())
      .filter(user => user.isActive).length;
    
    const activeProjects = this.projectsByStatus.get('active')?.size || 0;
    const completedTasks = this.tasksByStatus.get('completed')?.size || 0;
    
    return {
      totalUsers: this.userIndex.size,
      totalProjects: this.projectIndex.size,
      totalTasks: this.taskIndex.size,
      activeUsers,
      activeProjects,
      completedTasks
    };
  }

  // Cache management
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  clearCache(): void {
    this.paginationCache.clear();
    this.cacheTimestamps.clear();
  }

  // Memory management
  getMemoryUsage(): {
    users: number;
    projects: number;
    tasks: number;
    cacheEntries: number;
  } {
    return {
      users: this.userIndex.size,
      projects: this.projectIndex.size,
      tasks: this.taskIndex.size,
      cacheEntries: this.paginationCache.size
    };
  }
}

export const databaseService = DatabaseService.getInstance();