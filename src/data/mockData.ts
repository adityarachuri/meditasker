import { User, Project, Task, Sprint, Notification, Activity, DashboardMetrics } from '../types';

export const mockUsers: User[] = [ 
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@softique-health-insure.com',
    role: 'manager',
    department: 'Product Engineering',
    joinDate: '2023-01-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@softique-health-insure.com',
    role: 'developer',
    department: 'Product Engineering',
    joinDate: '2023-03-20',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@softique-health-insure.com',
    role: 'designer',
    department: 'Product Engineering',
    joinDate: '2023-02-10',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '4',
    name: 'David Park',
    email: 'david.park@softique-health-insure.com',
    role: 'qa',
    department: 'Quality Assurance',
    joinDate: '2023-04-05',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa.thompson@softique-health-insure.com',
    role: 'admin',
    department: 'Administration',
    joinDate: '2022-11-30',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '6',
    name: 'Alex Rivera',
    email: 'alex.rivera@softique-health-insure.com',
    role: 'developer',
    department: 'Product Engineering',
    joinDate: '2023-05-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '7',
    name: 'Priya Patel',
    email: 'priya.patel@softique-health-insure.com',
    role: 'qa',
    department: 'Quality Assurance',
    joinDate: '2023-06-01',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '8',
    name: 'James Wilson',
    email: 'james.wilson@softique-health-insure.com',
    role: 'manager',
    department: 'Project Management',
    joinDate: '2022-09-12',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '9',
    name: 'Sophia Lee',
    email: 'sophia.lee@softique-health-insure.com',
    role: 'designer',
    department: 'Product Engineering',
    joinDate: '2023-07-20',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '10',
    name: 'Marcus Johnson',
    email: 'marcus.johnson@softique-health-insure.com',
    role: 'developer',
    department: 'Product Engineering',
    joinDate: '2023-04-10',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '11',
    name: 'Olivia Martinez',
    email: 'olivia.martinez@softique-health-insure.com',
    role: 'qa',
    department: 'Quality Assurance',
    joinDate: '2023-08-05',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '12',
    name: 'Daniel Kim',
    email: 'daniel.kim@softique-health-insure.com',
    role: 'developer',
    department: 'DevOps',
    joinDate: '2023-02-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '13',
    name: 'Emma Thompson',
    email: 'emma.thompson@softique-health-insure.com',
    role: 'manager',
    department: 'Project Management',
    joinDate: '2022-10-18',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '14',
    name: 'Ryan Garcia',
    email: 'ryan.garcia@softique-health-insure.com',
    role: 'developer',
    department: 'Site Reliability Engineering',
    joinDate: '2023-01-20',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '15',
    name: 'Natalie Wong',
    email: 'natalie.wong@softique-health-insure.com',
    role: 'designer',
    department: 'Product Engineering',
    joinDate: '2023-09-01',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '16',
    name: 'Christopher Davis',
    email: 'christopher.davis@softique-health-insure.com',
    role: 'admin',
    department: 'Leadership',
    joinDate: '2022-08-10',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '17',
    name: 'Zoe Williams',
    email: 'zoe.williams@softique-health-insure.com',
    role: 'developer',
    department: 'Product Engineering',
    joinDate: '2023-03-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '18',
    name: 'Benjamin Taylor',
    email: 'benjamin.taylor@softique-health-insure.com',
    role: 'qa',
    department: 'Quality Assurance',
    joinDate: '2023-07-01',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '19',
    name: 'Amara Okafor',
    email: 'amara.okafor@softique-health-insure.com',
    role: 'developer',
    department: 'Research',
    joinDate: '2023-05-22',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '20',
    name: 'Hiroshi Tanaka',
    email: 'hiroshi.tanaka@softique-health-insure.com',
    role: 'developer',
    department: 'DevOps',
    joinDate: '2023-04-05',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '21',
    name: 'Isabella Rossi',
    email: 'isabella.rossi@softique-health-insure.com',
    role: 'designer',
    department: 'Product Engineering',
    joinDate: '2023-08-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '22',
    name: 'Raj Patel',
    email: 'raj.patel@softique-health-insure.com',
    role: 'developer',
    department: 'Site Reliability Engineering',
    joinDate: '2023-02-28',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '23',
    name: 'Grace Chen',
    email: 'grace.chen@softique-health-insure.com',
    role: 'researcher',
    department: 'Research',
    joinDate: '2023-06-10',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1197132/pexels-photo-1197132.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '24',
    name: 'Lucas Fernandez',
    email: 'lucas.fernandez@softique-health-insure.com',
    role: 'manager',
    department: 'Project Management',
    joinDate: '2022-11-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1080213/pexels-photo-1080213.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '25',
    name: 'Aisha Mohammed',
    email: 'aisha.mohammed@softique-health-insure.com',
    role: 'developer',
    department: 'Product Engineering',
    joinDate: '2023-03-01',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1820919/pexels-photo-1820919.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  }
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Claims Processing Automation',
    description: 'Automated system for processing insurance claims with AI-powered fraud detection',
    status: 'active',
    priority: 'high',
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    progress: 65,
    managerId: '1',
    teamIds: ['1', '2', '3', '4'],
    budget: 150000,
    spentBudget: 95000,
    color: '#3b82f6'
  },
  {
    id: '2',
    name: 'Member Portal Redesign',
    description: 'Complete redesign of the member portal with improved UX and accessibility',
    status: 'active',
    priority: 'medium',
    startDate: '2024-02-01',
    endDate: '2024-05-15',
    progress: 40,
    managerId: '1',
    teamIds: ['1', '3', '4'],
    budget: 80000,
    spentBudget: 32000,
    color: '#06b6d4'
  },
  {
    id: '3',
    name: 'Risk Assessment Engine',
    description: 'AI-powered risk assessment engine for policy underwriting',
    status: 'planning',
    priority: 'critical',
    startDate: '2024-03-01',
    endDate: '2024-09-30',
    progress: 10,
    managerId: '1',
    teamIds: ['2', '4'],
    budget: 200000,
    spentBudget: 15000,
    color: '#8b5cf6'
  },
  {
    id: '4',
    name: 'Mobile App Enhancement',
    description: 'Enhanced mobile application with offline capabilities and push notifications',
    status: 'completed',
    priority: 'medium',
    startDate: '2023-10-01',
    endDate: '2024-01-31',
    progress: 100,
    managerId: '1',
    teamIds: ['2', '3'],
    budget: 120000,
    spentBudget: 118000,
    color: '#10b981'
  }
];

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement OCR for document scanning',
    description: 'Develop OCR functionality to automatically extract data from scanned documents',
    status: 'in-progress',
    priority: 'high',
    projectId: '1',
    assigneeId: '2',
    createdBy: '1',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-25T14:30:00Z',
    dueDate: '2024-02-15T17:00:00Z',
    estimatedHours: 40,
    actualHours: 28,
    tags: ['AI', 'OCR', 'Backend'],
    dependencies: []
  },
  {
    id: '2',
    title: 'Design fraud detection dashboard',
    description: 'Create intuitive dashboard for reviewing flagged claims and fraud patterns',
    status: 'review',
    priority: 'medium',
    projectId: '1',
    assigneeId: '3',
    createdBy: '1',
    createdAt: '2024-01-22T10:00:00Z',
    updatedAt: '2024-01-28T16:45:00Z',
    dueDate: '2024-02-20T17:00:00Z',
    estimatedHours: 24,
    actualHours: 22,
    tags: ['UI/UX', 'Dashboard', 'Frontend'],
    dependencies: ['1']
  },
  {
    id: '3',
    title: 'Implement user authentication',
    description: 'Set up secure authentication system with multi-factor authentication',
    status: 'completed',
    priority: 'critical',
    projectId: '2',
    assigneeId: '2',
    createdBy: '1',
    createdAt: '2024-02-01T08:00:00Z',
    updatedAt: '2024-02-10T12:00:00Z',
    dueDate: '2024-02-12T17:00:00Z',
    estimatedHours: 32,
    actualHours: 30,
    tags: ['Security', 'Authentication', 'Backend'],
    dependencies: []
  },
  {
    id: '4',
    title: 'Accessibility audit and improvements',
    description: 'Conduct comprehensive accessibility audit and implement WCAG 2.1 AA compliance',
    status: 'todo',
    priority: 'medium',
    projectId: '2',
    assigneeId: '3',
    createdBy: '1',
    createdAt: '2024-02-05T09:30:00Z',
    updatedAt: '2024-02-05T09:30:00Z',
    dueDate: '2024-03-01T17:00:00Z',
    estimatedHours: 20,
    actualHours: 0,
    tags: ['Accessibility', 'Frontend', 'Compliance'],
    dependencies: ['3']
  },
  {
    id: '5',
    title: 'API performance optimization',
    description: 'Optimize API endpoints for better performance and reduced response times',
    status: 'blocked',
    priority: 'high',
    projectId: '1',
    assigneeId: '2',
    createdBy: '1',
    createdAt: '2024-01-30T11:00:00Z',
    updatedAt: '2024-02-02T15:20:00Z',
    dueDate: '2024-02-25T17:00:00Z',
    estimatedHours: 16,
    actualHours: 8,
    tags: ['Performance', 'API', 'Backend'],
    dependencies: ['1']
  }
];

export const mockSprints: Sprint[] = [
  {
    id: '1',
    name: 'Sprint 1 - Foundation',
    projectId: '1',
    startDate: '2024-01-15',
    endDate: '2024-01-28',
    status: 'completed',
    goal: 'Establish project foundation and core architecture',
    taskIds: ['3'],
    capacity: 80,
    velocity: 75
  },
  {
    id: '2',
    name: 'Sprint 2 - Core Features',
    projectId: '1',
    startDate: '2024-01-29',
    endDate: '2024-02-11',
    status: 'active',
    goal: 'Implement core OCR and fraud detection features',
    taskIds: ['1', '2'],
    capacity: 80,
    velocity: 0
  },
  {
    id: '3',
    name: 'Sprint 3 - Integration',
    projectId: '1',
    startDate: '2024-02-12',
    endDate: '2024-02-25',
    status: 'planning',
    goal: 'Integrate all components and optimize performance',
    taskIds: ['5'],
    capacity: 80,
    velocity: 0
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: 'You have been assigned to "Implement OCR for document scanning"',
    userId: '2',
    createdAt: '2024-01-20T09:00:00Z',
    read: false,
    actionUrl: '/tasks/1'
  },
  {
    id: '2',
    type: 'deadline_approaching',
    title: 'Deadline Approaching',
    message: 'Task "Design fraud detection dashboard" is due in 2 days',
    userId: '3',
    createdAt: '2024-01-26T10:00:00Z',
    read: false,
    actionUrl: '/tasks/2'
  },
  {
    id: '3',
    type: 'task_completed',
    title: 'Task Completed',
    message: 'Michael Chen completed "Implement user authentication"',
    userId: '1',
    createdAt: '2024-02-10T12:00:00Z',
    read: true,
    actionUrl: '/tasks/3'
  }
];

export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'task_created',
    title: 'Task Created',
    description: 'Sarah Johnson created "Implement OCR for document scanning"',
    userId: '1',
    projectId: '1',
    taskId: '1',
    createdAt: '2024-01-20T09:00:00Z'
  },
  {
    id: '2',
    type: 'task_updated',
    title: 'Task Updated',
    description: 'Michael Chen updated status of "Implement OCR for document scanning" to In Progress',
    userId: '2',
    projectId: '1',
    taskId: '1',
    createdAt: '2024-01-25T14:30:00Z'
  },
  {
    id: '3',
    type: 'task_completed',
    title: 'Task Completed',
    description: 'Michael Chen completed "Implement user authentication"',
    userId: '2',
    projectId: '2',
    taskId: '3',
    createdAt: '2024-02-10T12:00:00Z'
  },
  {
    id: '4',
    type: 'project_created',
    title: 'Project Created',
    description: 'Sarah Johnson created "Risk Assessment Engine" project',
    userId: '1',
    projectId: '3',
    createdAt: '2024-03-01T08:00:00Z'
  }
];

export const mockDashboardMetrics: DashboardMetrics = {
  totalProjects: 4,
  activeProjects: 2,
  completedTasks: 1,
  teamMembers: 5,
  upcomingDeadlines: 3,
  averageProjectProgress: 53.75,
  totalBudget: 550000,
  spentBudget: 260000
};