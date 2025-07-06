import { User, Project, Task, Sprint, Notification, Activity } from '../types';

// Efficient data generation for large-scale datasets (100K+ records)
export class MockDataGenerator {
  private static instance: MockDataGenerator;
  private userPool: User[] = [];
  private projectPool: Project[] = [];
  private taskPool: Task[] = [];
  private departments = ['Engineering', 'Design', 'QA', 'DevOps', 'Product', 'Marketing', 'Sales', 'HR'];
  private roles = ['admin', 'manager', 'developer', 'designer', 'qa'] as const;
  private priorities = ['low', 'medium', 'high', 'critical'] as const;
  private statuses = {
    project: ['planning', 'active', 'on-hold', 'completed', 'cancelled'] as const,
    task: ['todo', 'in-progress', 'review', 'completed', 'blocked'] as const
  };

  static getInstance(): MockDataGenerator {
    if (!MockDataGenerator.instance) {
      MockDataGenerator.instance = new MockDataGenerator();
    }
    return MockDataGenerator.instance;
  }

  // Generate users in optimized batches for large-scale datasets
  generateUsers(count: number): User[] {
    const users: User[] = [];
    const batchSize = 1000;
    
    for (let i = 0; i < count; i += batchSize) {
      const currentBatch = Math.min(batchSize, count - i);
      const batch = this.generateUserBatch(i, currentBatch);
      users.push(...batch);
      
      // Allow garbage collection between batches
      if (i % 5000 === 0) {
        console.log(`Generated ${i + currentBatch} users...`);
      }
    }
    
    this.userPool = users;
    return users;
  }

  private generateUserBatch(startIndex: number, batchSize: number): User[] {
    const batch: User[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const index = startIndex + i;
      batch.push({
        id: `user_${index}`,
        name: this.generateName(index),
        email: `user${index}@softique-health-insure.com`,
        role: this.roles[index % this.roles.length],
        department: this.departments[index % this.departments.length],
        joinDate: this.generateRandomDate(2020, 2024),
        isActive: Math.random() > 0.1, // 90% active
        avatar: `https://images.pexels.com/photos/${774909 + (index % 100)}/pexels-photo-${774909 + (index % 100)}.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop`
      });
    }
    
    return batch;
  }

  generateProjects(count: number): Project[] {
    const projects: Project[] = [];
    const batchSize = 500;
    
    for (let i = 0; i < count; i += batchSize) {
      const currentBatch = Math.min(batchSize, count - i);
      const batch = this.generateProjectBatch(i, currentBatch);
      projects.push(...batch);
      
      if (i % 2500 === 0) {
        console.log(`Generated ${i + currentBatch} projects...`);
      }
    }
    
    this.projectPool = projects;
    return projects;
  }

  private generateProjectBatch(startIndex: number, batchSize: number): Project[] {
    const batch: Project[] = [];
    const projectTypes = [
      'Claims Processing', 'Member Portal', 'Risk Assessment', 'Mobile App',
      'Data Analytics', 'Fraud Detection', 'Payment Gateway', 'Customer Service',
      'Compliance System', 'Reporting Dashboard', 'API Gateway', 'Security Audit'
    ];
    
    for (let i = 0; i < batchSize; i++) {
      const index = startIndex + i;
      const teamSize = Math.floor(Math.random() * 8) + 3; // 3-10 team members
      const teamIds = this.getRandomUserIds(teamSize);
      const managerId = teamIds[0]; // First team member is manager
      
      batch.push({
        id: `project_${index}`,
        name: `${projectTypes[index % projectTypes.length]} ${Math.floor(index / projectTypes.length) + 1}`,
        description: this.generateProjectDescription(index),
        status: this.statuses.project[index % this.statuses.project.length],
        priority: this.priorities[index % this.priorities.length],
        startDate: this.generateRandomDate(2023, 2024),
        endDate: this.generateRandomDate(2024, 2025),
        progress: Math.floor(Math.random() * 101),
        managerId,
        teamIds,
        budget: (Math.floor(Math.random() * 500) + 50) * 1000, // 50k-550k
        spentBudget: Math.floor(Math.random() * 400000),
        color: this.generateRandomColor()
      });
    }
    
    return batch;
  }

  generateTasks(count: number): Task[] {
    const tasks: Task[] = [];
    const batchSize = 2000;
    
    for (let i = 0; i < count; i += batchSize) {
      const currentBatch = Math.min(batchSize, count - i);
      const batch = this.generateTaskBatch(i, currentBatch);
      tasks.push(...batch);
      
      if (i % 10000 === 0) {
        console.log(`Generated ${i + currentBatch} tasks...`);
      }
    }
    
    this.taskPool = tasks;
    return tasks;
  }

  private generateTaskBatch(startIndex: number, batchSize: number): Task[] {
    const batch: Task[] = [];
    const taskTypes = [
      'Implement', 'Design', 'Test', 'Review', 'Deploy', 'Fix', 'Optimize',
      'Research', 'Document', 'Integrate', 'Refactor', 'Validate'
    ];
    const features = [
      'authentication', 'dashboard', 'API endpoint', 'user interface',
      'database schema', 'payment system', 'notification service',
      'search functionality', 'reporting module', 'security feature'
    ];
    
    for (let i = 0; i < batchSize; i++) {
      const index = startIndex + i;
      const projectId = this.getRandomProjectId();
      const assigneeId = this.getRandomUserId();
      const createdBy = this.getRandomUserId();
      
      batch.push({
        id: `task_${index}`,
        title: `${taskTypes[index % taskTypes.length]} ${features[index % features.length]}`,
        description: this.generateTaskDescription(index),
        status: this.statuses.task[index % this.statuses.task.length],
        priority: this.priorities[index % this.priorities.length],
        projectId,
        assigneeId,
        createdBy,
        createdAt: this.generateRandomDate(2023, 2024),
        updatedAt: this.generateRandomDate(2024, 2024),
        dueDate: Math.random() > 0.3 ? this.generateRandomDate(2024, 2025) : undefined,
        estimatedHours: Math.floor(Math.random() * 40) + 1,
        actualHours: Math.floor(Math.random() * 35),
        tags: this.generateRandomTags(),
        dependencies: []
      });
    }
    
    return batch;
  }

  // Utility methods
  private generateName(index: number): string {
    const firstNames = [
      'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'John', 'Jessica', 'Robert',
      'Ashley', 'Christopher', 'Amanda', 'Matthew', 'Jennifer', 'Joshua', 'Michelle'
    ];
    const lastNames = [
      'Johnson', 'Chen', 'Rodriguez', 'Park', 'Thompson', 'Williams', 'Brown',
      'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson'
    ];
    
    return `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
  }

  private generateRandomDate(startYear: number, endYear: number): string {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString();
  }

  private generateProjectDescription(index: number): string {
    const templates = [
      'Advanced system for processing and managing insurance claims with automated workflows',
      'Modern web portal providing members with self-service capabilities and account management',
      'AI-powered engine for assessing risk factors and determining policy pricing',
      'Mobile application with enhanced features for policy management and claims submission',
      'Comprehensive analytics platform for business intelligence and reporting',
      'Machine learning system for detecting fraudulent claims and suspicious activities'
    ];
    
    return templates[index % templates.length];
  }

  private generateTaskDescription(index: number): string {
    const templates = [
      'Develop and implement the core functionality with proper error handling and validation',
      'Create user-friendly interface components with responsive design and accessibility features',
      'Conduct thorough testing including unit tests, integration tests, and user acceptance testing',
      'Perform comprehensive code review and ensure compliance with coding standards',
      'Deploy to production environment with proper monitoring and rollback procedures',
      'Investigate and resolve issues with detailed analysis and documentation'
    ];
    
    return templates[index % templates.length];
  }

  private generateRandomTags(): string[] {
    const allTags = [
      'Frontend', 'Backend', 'API', 'Database', 'Security', 'Performance',
      'UI/UX', 'Testing', 'DevOps', 'Documentation', 'Bug', 'Feature',
      'Critical', 'Enhancement', 'Refactor', 'Integration'
    ];
    
    const tagCount = Math.floor(Math.random() * 4) + 1; // 1-4 tags
    const selectedTags: string[] = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }
    
    return selectedTags;
  }

  private generateRandomColor(): string {
    const colors = [
      '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b',
      '#ef4444', '#ec4899', '#6366f1', '#84cc16', '#f97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getRandomUserId(): string {
    if (this.userPool.length === 0) return 'user_0';
    return this.userPool[Math.floor(Math.random() * this.userPool.length)].id;
  }

  private getRandomUserIds(count: number): string[] {
    if (this.userPool.length === 0) return [`user_0`];
    
    const ids: string[] = [];
    const maxAttempts = count * 2; // Prevent infinite loop
    let attempts = 0;
    
    while (ids.length < count && attempts < maxAttempts) {
      const id = this.getRandomUserId();
      if (!ids.includes(id)) {
        ids.push(id);
      }
      attempts++;
    }
    
    return ids;
  }

  private getRandomProjectId(): string {
    if (this.projectPool.length === 0) return 'project_0';
    return this.projectPool[Math.floor(Math.random() * this.projectPool.length)].id;
  }

  // Memory management
  clearCache(): void {
    this.userPool = [];
    this.projectPool = [];
    this.taskPool = [];
  }

  getMemoryUsage(): { users: number; projects: number; tasks: number } {
    return {
      users: this.userPool.length,
      projects: this.projectPool.length,
      tasks: this.taskPool.length
    };
  }
}

// Export singleton instance
export const mockDataGenerator = MockDataGenerator.getInstance();