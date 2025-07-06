import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, Project, Task, Notification, Activity } from '../types';

interface GlobalState {
  // Data
  users: User[];
  projects: Project[];
  tasks: Task[];
  notifications: Notification[];
  activities: Activity[];
  
  // UI State
  selectedItems: Set<string>;
  filters: {
    projects: {
      status: string[];
      priority: string[];
      search: string;
    };
    tasks: {
      status: string[];
      priority: string[];
      assignee: string[];
      search: string;
    };
  };
  
  // Performance
  cache: Map<string, any>;
  lastUpdated: Map<string, number>;
  
  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  removeUser: (id: string) => void;
  
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  bulkUpdateTasks: (updates: Array<{ id: string; updates: Partial<Task> }>) => void;
  
  // Selection
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Filters
  updateProjectFilters: (filters: Partial<GlobalState['filters']['projects']>) => void;
  updateTaskFilters: (filters: Partial<GlobalState['filters']['tasks']>) => void;
  clearFilters: () => void;
  
  // Cache
  setCache: (key: string, value: any) => void;
  getCache: (key: string) => any;
  clearCache: () => void;
  
  // Computed selectors
  getFilteredProjects: () => Project[];
  getFilteredTasks: () => Task[];
  getProjectTasks: (projectId: string) => Task[];
  getUserTasks: (userId: string) => Task[];
}

export const useGlobalStore = create<GlobalState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      users: [],
      projects: [],
      tasks: [],
      notifications: [],
      activities: [],
      
      selectedItems: new Set(),
      filters: {
        projects: {
          status: [],
          priority: [],
          search: '',
        },
        tasks: {
          status: [],
          priority: [],
          assignee: [],
          search: '',
        },
      },
      
      cache: new Map(),
      lastUpdated: new Map(),
      
      // User actions
      setUsers: (users) => set((state) => {
        state.users = users;
        state.lastUpdated.set('users', Date.now());
      }),
      
      addUser: (user) => set((state) => {
        state.users.push(user);
        state.lastUpdated.set('users', Date.now());
      }),
      
      updateUser: (id, updates) => set((state) => {
        const index = state.users.findIndex(u => u.id === id);
        if (index !== -1) {
          Object.assign(state.users[index], updates);
          state.lastUpdated.set('users', Date.now());
        }
      }),
      
      removeUser: (id) => set((state) => {
        state.users = state.users.filter(u => u.id !== id);
        state.lastUpdated.set('users', Date.now());
      }),
      
      // Project actions
      setProjects: (projects) => set((state) => {
        state.projects = projects;
        state.lastUpdated.set('projects', Date.now());
      }),
      
      addProject: (project) => set((state) => {
        state.projects.push(project);
        state.lastUpdated.set('projects', Date.now());
      }),
      
      updateProject: (id, updates) => set((state) => {
        const index = state.projects.findIndex(p => p.id === id);
        if (index !== -1) {
          Object.assign(state.projects[index], updates);
          state.lastUpdated.set('projects', Date.now());
        }
      }),
      
      removeProject: (id) => set((state) => {
        state.projects = state.projects.filter(p => p.id !== id);
        state.lastUpdated.set('projects', Date.now());
      }),
      
      // Task actions
      setTasks: (tasks) => set((state) => {
        state.tasks = tasks;
        state.lastUpdated.set('tasks', Date.now());
      }),
      
      addTask: (task) => set((state) => {
        state.tasks.push(task);
        state.lastUpdated.set('tasks', Date.now());
      }),
      
      updateTask: (id, updates) => set((state) => {
        const index = state.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
          Object.assign(state.tasks[index], updates);
          state.lastUpdated.set('tasks', Date.now());
        }
      }),
      
      removeTask: (id) => set((state) => {
        state.tasks = state.tasks.filter(t => t.id !== id);
        state.lastUpdated.set('tasks', Date.now());
      }),
      
      bulkUpdateTasks: (updates) => set((state) => {
        updates.forEach(({ id, updates: taskUpdates }) => {
          const index = state.tasks.findIndex(t => t.id === id);
          if (index !== -1) {
            Object.assign(state.tasks[index], taskUpdates);
          }
        });
        state.lastUpdated.set('tasks', Date.now());
      }),
      
      // Selection actions
      selectItem: (id) => set((state) => {
        state.selectedItems.add(id);
      }),
      
      deselectItem: (id) => set((state) => {
        state.selectedItems.delete(id);
      }),
      
      selectAll: (ids) => set((state) => {
        ids.forEach(id => state.selectedItems.add(id));
      }),
      
      clearSelection: () => set((state) => {
        state.selectedItems.clear();
      }),
      
      // Filter actions
      updateProjectFilters: (filters) => set((state) => {
        Object.assign(state.filters.projects, filters);
      }),
      
      updateTaskFilters: (filters) => set((state) => {
        Object.assign(state.filters.tasks, filters);
      }),
      
      clearFilters: () => set((state) => {
        state.filters.projects = { status: [], priority: [], search: '' };
        state.filters.tasks = { status: [], priority: [], assignee: [], search: '' };
      }),
      
      // Cache actions
      setCache: (key, value) => set((state) => {
        state.cache.set(key, value);
      }),
      
      getCache: (key) => get().cache.get(key),
      
      clearCache: () => set((state) => {
        state.cache.clear();
      }),
      
      // Computed selectors
      getFilteredProjects: () => {
        const { projects, filters } = get();
        const { status, priority, search } = filters.projects;
        
        return projects.filter(project => {
          if (status.length > 0 && !status.includes(project.status)) return false;
          if (priority.length > 0 && !priority.includes(project.priority)) return false;
          if (search && !project.name.toLowerCase().includes(search.toLowerCase()) && 
              !project.description.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        });
      },
      
      getFilteredTasks: () => {
        const { tasks, filters } = get();
        const { status, priority, assignee, search } = filters.tasks;
        
        return tasks.filter(task => {
          if (status.length > 0 && !status.includes(task.status)) return false;
          if (priority.length > 0 && !priority.includes(task.priority)) return false;
          if (assignee.length > 0 && task.assigneeId && !assignee.includes(task.assigneeId)) return false;
          if (search && !task.title.toLowerCase().includes(search.toLowerCase()) && 
              !task.description.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        });
      },
      
      getProjectTasks: (projectId) => {
        return get().tasks.filter(task => task.projectId === projectId);
      },
      
      getUserTasks: (userId) => {
        return get().tasks.filter(task => task.assigneeId === userId);
      },
    }))
  )
);

// Performance monitoring
useGlobalStore.subscribe(
  (state) => state.lastUpdated,
  (lastUpdated) => {
    const now = Date.now();
    lastUpdated.forEach((timestamp, key) => {
      if (now - timestamp > 5000) { // 5 seconds
        console.log(`Data ${key} was last updated ${now - timestamp}ms ago`);
      }
      return Date.now() - timestamp < this.CACHE_TTL;
    });
    
    // Force garbage collection hint
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }
);