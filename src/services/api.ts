import { QueryClient } from '@tanstack/react-query';
import { sessionService } from './sessionService';
import { sessionService } from './sessionService';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.meditasker.com';
const API_VERSION = 'v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Request interceptor for authentication and logging
class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;

  constructor(baseURL: string, timeout: number = REQUEST_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseURL}/${API_VERSION}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Client-Version': '2.0.0',
          'X-Request-ID': this.generateRequestId(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && retryCount < this.retryAttempts) {
          await this.delay(this.retryDelay * Math.pow(2, retryCount));
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.logRequest(url, options, response.status, Date.now());
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private getAuthToken(): string {
    return sessionService.getToken() || '';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logRequest(url: string, options: RequestInit, status: number, timestamp: number): void {
    if (import.meta.env.DEV) {
      console.log(`[API] ${options.method || 'GET'} ${url} - ${status} (${Date.now() - timestamp}ms)`);
    }
  }

  // CRUD Operations
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Batch operations
  async batchUpdate<T>(endpoint: string, operations: Array<{ id: string; data: any }>): Promise<T> {
    return this.request<T>(`${endpoint}/batch`, {
      method: 'PATCH',
      body: JSON.stringify({ operations }),
    });
  }

  // File upload with progress
  async uploadFile(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseURL}/${API_VERSION}${endpoint}`);
      xhr.setRequestHeader('Authorization', `Bearer ${this.getAuthToken()}`);
      xhr.send(formData);
    });
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Query client configuration for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('timeout')) {
          return failureCount < 2;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// API endpoints
export const API_ENDPOINTS = {
  // Users
  USERS: '/users',
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_PROFILE: '/users/profile',
  
  // Projects
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id: string) => `/projects/${id}`,
  PROJECT_TASKS: (id: string) => `/projects/${id}/tasks`,
  PROJECT_MEMBERS: (id: string) => `/projects/${id}/members`,
  
  // Tasks
  TASKS: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  TASK_COMMENTS: (id: string) => `/tasks/${id}/comments`,
  TASK_ATTACHMENTS: (id: string) => `/tasks/${id}/attachments`,
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_BY_ID: (id: string) => `/notifications/${id}`,
  MARK_READ: (id: string) => `/notifications/${id}/read`,
  
  // Analytics
  ANALYTICS_DASHBOARD: '/analytics/dashboard',
  ANALYTICS_PROJECTS: '/analytics/projects',
  ANALYTICS_TASKS: '/analytics/tasks',
  ANALYTICS_TEAM: '/analytics/team',
  
  // Search
  SEARCH: '/search',
  SEARCH_PROJECTS: '/search/projects',
  SEARCH_TASKS: '/search/tasks',
  SEARCH_USERS: '/search/users',
  
  // Reports
  REPORTS: '/reports',
  EXPORT_REPORT: '/reports/export',
  
  // File uploads
  UPLOAD_AVATAR: '/upload/avatar',
  UPLOAD_ATTACHMENT: '/upload/attachment',
  UPLOAD_BULK: '/upload/bulk',
} as const;

// Type-safe API functions
export const userApi = {
  getAll: () => apiClient.get(API_ENDPOINTS.USERS),
  getById: (id: string) => apiClient.get(API_ENDPOINTS.USER_BY_ID(id)),
  create: (data: any) => apiClient.post(API_ENDPOINTS.USERS, data),
  update: (id: string, data: any) => apiClient.put(API_ENDPOINTS.USER_BY_ID(id), data),
  delete: (id: string) => apiClient.delete(API_ENDPOINTS.USER_BY_ID(id)),
  getProfile: () => apiClient.get(API_ENDPOINTS.USER_PROFILE),
  updateProfile: (data: any) => apiClient.patch(API_ENDPOINTS.USER_PROFILE, data),
};

export const projectApi = {
  getAll: (params?: any) => apiClient.get(`${API_ENDPOINTS.PROJECTS}${params ? `?${new URLSearchParams(params)}` : ''}`),
  getById: (id: string) => apiClient.get(API_ENDPOINTS.PROJECT_BY_ID(id)),
  create: (data: any) => apiClient.post(API_ENDPOINTS.PROJECTS, data),
  update: (id: string, data: any) => apiClient.put(API_ENDPOINTS.PROJECT_BY_ID(id), data),
  delete: (id: string) => apiClient.delete(API_ENDPOINTS.PROJECT_BY_ID(id)),
  getTasks: (id: string) => apiClient.get(API_ENDPOINTS.PROJECT_TASKS(id)),
  getMembers: (id: string) => apiClient.get(API_ENDPOINTS.PROJECT_MEMBERS(id)),
  batchUpdate: (operations: Array<{ id: string; data: any }>) => 
    apiClient.batchUpdate(API_ENDPOINTS.PROJECTS, operations),
};

export const taskApi = {
  getAll: (params?: any) => apiClient.get(`${API_ENDPOINTS.TASKS}${params ? `?${new URLSearchParams(params)}` : ''}`),
  getById: (id: string) => apiClient.get(API_ENDPOINTS.TASK_BY_ID(id)),
  create: (data: any) => apiClient.post(API_ENDPOINTS.TASKS, data),
  update: (id: string, data: any) => apiClient.put(API_ENDPOINTS.TASK_BY_ID(id), data),
  delete: (id: string) => apiClient.delete(API_ENDPOINTS.TASK_BY_ID(id)),
  getComments: (id: string) => apiClient.get(API_ENDPOINTS.TASK_COMMENTS(id)),
  addComment: (id: string, data: any) => apiClient.post(API_ENDPOINTS.TASK_COMMENTS(id), data),
  getAttachments: (id: string) => apiClient.get(API_ENDPOINTS.TASK_ATTACHMENTS(id)),
  batchUpdate: (operations: Array<{ id: string; data: any }>) => 
    apiClient.batchUpdate(API_ENDPOINTS.TASKS, operations),
};

export const searchApi = {
  global: (query: string) => apiClient.get(`${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`),
  projects: (query: string, filters?: any) => 
    apiClient.get(`${API_ENDPOINTS.SEARCH_PROJECTS}?q=${encodeURIComponent(query)}${filters ? `&${new URLSearchParams(filters)}` : ''}`),
  tasks: (query: string, filters?: any) => 
    apiClient.get(`${API_ENDPOINTS.SEARCH_TASKS}?q=${encodeURIComponent(query)}${filters ? `&${new URLSearchParams(filters)}` : ''}`),
  users: (query: string) => apiClient.get(`${API_ENDPOINTS.SEARCH_USERS}?q=${encodeURIComponent(query)}`),
};

export const analyticsApi = {
  getDashboard: () => apiClient.get(API_ENDPOINTS.ANALYTICS_DASHBOARD),
  getProjects: (params?: any) => apiClient.get(`${API_ENDPOINTS.ANALYTICS_PROJECTS}${params ? `?${new URLSearchParams(params)}` : ''}`),
  getTasks: (params?: any) => apiClient.get(`${API_ENDPOINTS.ANALYTICS_TASKS}${params ? `?${new URLSearchParams(params)}` : ''}`),
  getTeam: (params?: any) => apiClient.get(`${API_ENDPOINTS.ANALYTICS_TEAM}${params ? `?${new URLSearchParams(params)}` : ''}`),
};