import { User, Project, Task } from '../types';

// Enterprise-grade database service with advanced indexing, caching, and optimization for 1M+ records
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
  private paginationCache = new Map<string, { data: any[]; total: number; hasMore: boolean }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes for enterprise
  private cacheTimestamps = new Map<string, number>();
  
  // Enterprise features
  private queryOptimizer = new Map<string, any>();
  private performanceMetrics = new Map<string, number[]>();
  private readonly MAX_CACHE_SIZE = 1000; // Limit cache size
  private readonly BATCH_SIZE_MULTIPLIER = 2; // Larger batches for enterprise

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Bulk data loading with indexing
  async loadUsers(users: User[]): Promise<void> {
    console.time('Enterprise User Loading');
    
    // Clear existing indexes
    this.userIndex.clear();
    this.usersByDepartment.clear();
    this.usersByRole.clear();
    
    // Build indexes in batches
    const batchSize = 2000 * this.BATCH_SIZE_MULTIPLIER; // Larger batches for enterprise
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
      if (i % 10000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(`Indexed ${i + batch.length} users...`);
      }
    }
    
    console.timeEnd('Enterprise User Loading');
    console.log(`Enterprise: Loaded ${users.length} users with optimized indexes`);
    this.recordPerformanceMetric('user_load_time', performance.now());
  }

  async loadProjects(projects: Project[]): Promise<void> {
    console.time('Enterprise Project Loading');
    
    this.projectIndex.clear();
    this.projectsByStatus.clear();
    
    const batchSize = 1000 * this.BATCH_SIZE_MULTIPLIER;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      batch.forEach(project => {
        this.projectIndex.set(project.id, project);
        
        if (!this.projectsByStatus.has(project.status)) {
          this.projectsByStatus.set(project.status, new Set());
        }
        this.projectsByStatus.get(project.status)!.add(project.id);
      });
      
      if (i % 5000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(`Indexed ${i + batch.length} projects...`);
      }
    }
    
    console.timeEnd('Enterprise Project Loading');
    console.log(`Enterprise: Loaded ${projects.length} projects with optimized indexes`);
    this.recordPerformanceMetric('project_load_time', performance.now());
  }

  async loadTasks(tasks: Task[]): Promise<void> {
    console.time('Enterprise Task Loading');
    
    this.taskIndex.clear();
    this.tasksByProject.clear();
    this.tasksByAssignee.clear();
    this.tasksByStatus.clear();
    
    const batchSize = 5000 * this.BATCH_SIZE_MULTIPLIER; // Much larger batches for 890k tasks
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
      
      if (i % 50000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log(`Indexed ${i + batch.length} tasks...`);
      }
    }
    
    console.timeEnd('Enterprise Task Loading');
    console.log(`Enterprise: Loaded ${tasks.length} tasks with optimized indexes`);
    this.recordPerformanceMetric('task_load_time', performance.now());
    
    // Trigger garbage collection hint for large datasets
    this.optimizeMemory();
  }

  // Paginated queries with caching
  async getUsers(page: number = 1, limit: number = 50, filters?: {
    department?: string;
    role?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<{ data: User[]; total: number; hasMore: boolean }> {
    const startTime = performance.now();
    const cacheKey = `users_${page}_${limit}_${JSON.stringify(filters)}`;
    
    // Check cache
    if (this.isCacheValid(cacheKey)) {
      this.recordPerformanceMetric('user_query_cache_hit', performance.now() - startTime);
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
    this.manageCacheSize();
    
    this.recordPerformanceMetric('user_query_time', performance.now() - startTime);
    
    return result;
  }

  async getTasks(page: number = 1, limit: number = 50, filters?: {
    projectId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<{ data: Task[]; total: number; hasMore: boolean }> {
    const startTime = performance.now();
    const cacheKey = `tasks_${page}_${limit}_${JSON.stringify(filters)}`;
    
    if (this.isCacheValid(cacheKey)) {
      this.recordPerformanceMetric('task_query_cache_hit', performance.now() - startTime);
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
    this.manageCacheSize();
    
    this.recordPerformanceMetric('task_query_time', performance.now() - startTime);
    
    return result;
  }

  async getProjects(page: number = 1, limit: number = 50, filters?: {
    status?: string;
    priority?: string;
    managerId?: string;
    search?: string;
  }): Promise<{ data: Project[]; total: number; hasMore: boolean }> {
    const startTime = performance.now();
    const cacheKey = `projects_${page}_${limit}_${JSON.stringify(filters)}`;
    
    if (this.isCacheValid(cacheKey)) {
      this.recordPerformanceMetric('project_query_cache_hit', performance.now() - startTime);
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
    this.manageCacheSize();
    
    this.recordPerformanceMetric('project_query_time', performance.now() - startTime);
    
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
    this.performanceMetrics.clear();
    console.log('Enterprise: Cache cleared and memory optimized');
  }

  // Enterprise performance monitoring
  private recordPerformanceMetric(metric: string, value: number): void {
    if (!this.performanceMetrics.has(metric)) {
      this.performanceMetrics.set(metric, []);
    }
    const metrics = this.performanceMetrics.get(metric)!;
    metrics.push(value);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }
  
  getPerformanceMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.performanceMetrics.forEach((values, metric) => {
      if (values.length > 0) {
        result[metric] = {
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });
    
    return result;
  }
  
  // Enterprise cache management
  private manageCacheSize(): void {
    if (this.paginationCache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cacheTimestamps.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, this.paginationCache.size - this.MAX_CACHE_SIZE);
      
      entries.forEach(([key]) => {
        this.paginationCache.delete(key);
        this.cacheTimestamps.delete(key);
      });
    }
  }
  
  // Enterprise memory optimization
  private optimizeMemory(): void {
    // Force garbage collection hint
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
    
    // Clear old performance metrics
    this.performanceMetrics.forEach((values, metric) => {
      if (values.length > 50) {
        this.performanceMetrics.set(metric, values.slice(-50));
      }
    });
  }
  
  // Enterprise search with full-text capabilities
  async searchGlobal(query: string, limit: number = 100): Promise<{
    users: User[];
    projects: Project[];
    tasks: Task[];
    total: number;
  }> {
    const startTime = performance.now();
    const searchLower = query.toLowerCase();
    
    const users = Array.from(this.userIndex.values())
      .filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department.toLowerCase().includes(searchLower)
      )
      .slice(0, Math.floor(limit / 3));
    
    const projects = Array.from(this.projectIndex.values())
      .filter(project => 
        project.name.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      )
      .slice(0, Math.floor(limit / 3));
    
    const tasks = Array.from(this.taskIndex.values())
      .filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
      .slice(0, Math.floor(limit / 3));
    
    this.recordPerformanceMetric('global_search_time', performance.now() - startTime);
    
    return {
      users,
      projects,
      tasks,
      total: users.length + projects.length + tasks.length
    };
  }

  // Memory management
  getMemoryUsage(): {
    users: number;
    projects: number;
    tasks: number;
    cacheEntries: number;
    performanceMetrics: number;
    indexSizes: {
      usersByDepartment: number;
      usersByRole: number;
      tasksByProject: number;
      tasksByAssignee: number;
      tasksByStatus: number;
      projectsByStatus: number;
    };
  } {
    return {
      users: this.userIndex.size,
      projects: this.projectIndex.size,
      tasks: this.taskIndex.size,
      cacheEntries: this.paginationCache.size,
      performanceMetrics: this.performanceMetrics.size,
      indexSizes: {
        usersByDepartment: this.usersByDepartment.size,
        usersByRole: this.usersByRole.size,
        tasksByProject: this.tasksByProject.size,
        tasksByAssignee: this.tasksByAssignee.size,
        tasksByStatus: this.tasksByStatus.size,
        projectsByStatus: this.projectsByStatus.size,
      }
    };
  }
  
  // Enterprise health check
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      memoryUsage: number;
      cacheHitRate: number;
      averageQueryTime: number;
      indexHealth: boolean;
    };
  } {
    const memoryUsage = this.getMemoryUsage();
    const performanceMetrics = this.getPerformanceMetrics();
    
    const totalQueries = (performanceMetrics.user_query_time?.count || 0) + 
                        (performanceMetrics.task_query_time?.count || 0) + 
                        (performanceMetrics.project_query_time?.count || 0);
    
    const cacheHits = (performanceMetrics.user_query_cache_hit?.count || 0) + 
                     (performanceMetrics.task_query_cache_hit?.count || 0) + 
                     (performanceMetrics.project_query_cache_hit?.count || 0);
    
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
    
    const avgQueryTime = totalQueries > 0 ? 
      ((performanceMetrics.user_query_time?.avg || 0) + 
       (performanceMetrics.task_query_time?.avg || 0) + 
       (performanceMetrics.project_query_time?.avg || 0)) / 3 : 0;
    
    const indexHealth = memoryUsage.users > 0 && memoryUsage.projects > 0 && memoryUsage.tasks > 0;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (avgQueryTime > 100 || cacheHitRate < 30) status = 'warning';
    if (avgQueryTime > 500 || cacheHitRate < 10 || !indexHealth) status = 'critical';
    
    return {
      status,
      metrics: {
        memoryUsage: memoryUsage.users + memoryUsage.projects + memoryUsage.tasks,
        cacheHitRate,
        averageQueryTime: avgQueryTime,
        indexHealth
      }
    };
  }
}

export const databaseService = DatabaseService.getInstance();