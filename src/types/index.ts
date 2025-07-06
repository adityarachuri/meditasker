export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'developer' | 'designer' | 'qa';
  avatar?: string;
  department: string;
  joinDate: string;
  isActive: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  progress: number;
  managerId: string;
  teamIds: string[];
  budget: number;
  spentBudget: number;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectId: string;
  assigneeId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  dependencies: string[];
}

export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  goal: string;
  taskIds: string[];
  capacity: number;
  velocity: number;
}

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'project_updated' | 'deadline_approaching' | 'system';
  title: string;
  message: string;
  userId: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export interface Activity {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'project_created' | 'user_joined';
  title: string;
  description: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedTasks: number;
  teamMembers: number;
  upcomingDeadlines: number;
  averageProjectProgress: number;
  totalBudget: number;
  spentBudget: number;
}