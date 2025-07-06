import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User, Project, Task, Sprint, Notification, Activity } from '../types';
import { mockUsers, mockProjects, mockTasks, mockSprints, mockNotifications, mockActivities } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';

interface AppState {
  users: User[];
  projects: Project[];
  tasks: Task[];
  sprints: Sprint[];
  notifications: Notification[];
  activities: Activity[];
  settings: {
    theme: 'light' | 'dark' | 'system';
    colorScheme: 'blue' | 'green' | 'purple' | 'orange';
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    sidebarCollapsed: boolean;
    showAvatars: boolean;
    animationsEnabled: boolean;
  };
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> };

const initialState: AppState = {
  users: mockUsers,
  projects: mockProjects,
  tasks: mockTasks,
  sprints: mockSprints,
  notifications: mockNotifications,
  activities: mockActivities,
  settings: {
    theme: 'light',
    colorScheme: 'blue',
    fontSize: 'medium',
    compactMode: false,
    sidebarCollapsed: false,
    showAvatars: true,
    animationsEnabled: true,
  },
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
      };
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
        activities: [
          {
            id: Date.now().toString(),
            type: 'task_created',
            title: 'Task Created',
            description: `Task "${action.payload.title}" was created`,
            userId: action.payload.createdBy,
            projectId: action.payload.projectId,
            taskId: action.payload.id,
            createdAt: new Date().toISOString(),
          },
          ...state.activities,
        ],
      };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
        activities: [
          {
            id: Date.now().toString(),
            type: 'task_updated',
            title: 'Task Updated',
            description: `Task "${action.payload.title}" was updated`,
            userId: action.payload.createdBy,
            projectId: action.payload.projectId,
            taskId: action.payload.id,
            createdAt: new Date().toISOString(),
          },
          ...state.activities,
        ],
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload],
        activities: [
          {
            id: Date.now().toString(),
            type: 'project_created',
            title: 'Project Created',
            description: `Project "${action.payload.name}" was created`,
            userId: action.payload.managerId,
            projectId: action.payload.id,
            createdAt: new Date().toISOString(),
          },
          ...state.activities,
        ],
      };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case 'ADD_ACTIVITY':
      return {
        ...state,
        activities: [action.payload, ...state.activities],
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}