import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { AppProvider, useApp } from '../AppContext';
import { mockUsers, mockProjects, mockTasks } from '../../data/mockData';
import { Project, Task } from '../../types';

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>;

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'new-project',
  name: 'New Project',
  description: 'Freshly created',
  status: 'planning',
  priority: 'medium',
  startDate: '2024-01-01',
  endDate: '2024-06-01',
  progress: 0,
  managerId: mockUsers[0].id,
  teamIds: [mockUsers[0].id],
  budget: 5000,
  spentBudget: 0,
  color: '#22c55e',
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'new-task',
  title: 'New Task',
  description: 'Freshly created task',
  status: 'todo',
  priority: 'medium',
  projectId: mockProjects[0].id,
  assigneeId: mockUsers[0].id,
  createdBy: mockUsers[0].id,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  estimatedHours: 2,
  actualHours: 0,
  tags: [],
  dependencies: [],
  ...overrides,
});

describe('AppContext', () => {
  it('throws when useApp is used outside an AppProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useApp())).toThrow('useApp must be used within an AppProvider');
    consoleErrorSpy.mockRestore();
  });

  it('provides seeded initial state from mock data', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.state.currentUser).toEqual(mockUsers[0]);
    expect(result.current.state.users).toEqual(mockUsers);
    expect(result.current.state.projects).toEqual(mockProjects);
    expect(result.current.state.tasks).toEqual(mockTasks);
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('sets the current user', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_USER', payload: mockUsers[1] });
    });

    expect(result.current.state.currentUser).toEqual(mockUsers[1]);
  });

  it('sets loading and error flags', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_LOADING', payload: true });
      result.current.dispatch({ type: 'SET_ERROR', payload: 'Something failed' });
    });

    expect(result.current.state.loading).toBe(true);
    expect(result.current.state.error).toBe('Something failed');
  });

  it('updates a user in the list and currentUser if it matches', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const updatedUser = { ...mockUsers[0], name: 'Renamed User' };

    act(() => {
      result.current.dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    });

    expect(result.current.state.users.find(u => u.id === updatedUser.id)?.name).toBe('Renamed User');
    expect(result.current.state.currentUser?.name).toBe('Renamed User');
  });

  it('adds a task and records an activity for it', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const newTask = makeTask();
    const tasksBefore = result.current.state.tasks.length;
    const activitiesBefore = result.current.state.activities.length;

    act(() => {
      result.current.dispatch({ type: 'ADD_TASK', payload: newTask });
    });

    expect(result.current.state.tasks).toHaveLength(tasksBefore + 1);
    expect(result.current.state.activities).toHaveLength(activitiesBefore + 1);
    expect(result.current.state.activities[0].type).toBe('task_created');
    expect(result.current.state.activities[0].taskId).toBe(newTask.id);
  });

  it('updates a task and records an activity for it', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const existing = result.current.state.tasks[0];
    const updated = { ...existing, title: 'Updated title' };

    act(() => {
      result.current.dispatch({ type: 'UPDATE_TASK', payload: updated });
    });

    expect(result.current.state.tasks.find(t => t.id === existing.id)?.title).toBe('Updated title');
    expect(result.current.state.activities[0].type).toBe('task_updated');
  });

  it('deletes a task', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const existing = result.current.state.tasks[0];

    act(() => {
      result.current.dispatch({ type: 'DELETE_TASK', payload: existing.id });
    });

    expect(result.current.state.tasks.find(t => t.id === existing.id)).toBeUndefined();
  });

  it('adds a project and records an activity for it', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const newProject = makeProject();
    const projectsBefore = result.current.state.projects.length;

    act(() => {
      result.current.dispatch({ type: 'ADD_PROJECT', payload: newProject });
    });

    expect(result.current.state.projects).toHaveLength(projectsBefore + 1);
    expect(result.current.state.activities[0].type).toBe('project_created');
  });

  it('updates and deletes a project', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const existing = result.current.state.projects[0];

    act(() => {
      result.current.dispatch({
        type: 'UPDATE_PROJECT',
        payload: { ...existing, status: 'on-hold' },
      });
    });
    expect(result.current.state.projects.find(p => p.id === existing.id)?.status).toBe('on-hold');

    act(() => {
      result.current.dispatch({ type: 'DELETE_PROJECT', payload: existing.id });
    });
    expect(result.current.state.projects.find(p => p.id === existing.id)).toBeUndefined();
  });

  it('marks a notification as read', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const existing = result.current.state.notifications[0];

    act(() => {
      result.current.dispatch({ type: 'MARK_NOTIFICATION_READ', payload: existing.id });
    });

    expect(result.current.state.notifications.find(n => n.id === existing.id)?.read).toBe(true);
  });

  it('adds a notification to the front of the list', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const newNotification = {
      id: 'notif-new',
      type: 'system' as const,
      title: 'Heads up',
      message: 'Something happened',
      userId: mockUsers[0].id,
      createdAt: new Date().toISOString(),
      read: false,
    };

    act(() => {
      result.current.dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
    });

    expect(result.current.state.notifications[0]).toEqual(newNotification);
  });

  it('adds an activity to the front of the list', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const newActivity = {
      id: 'activity-new',
      type: 'user_joined' as const,
      title: 'Welcome',
      description: 'A new user joined',
      userId: mockUsers[0].id,
      createdAt: new Date().toISOString(),
    };

    act(() => {
      result.current.dispatch({ type: 'ADD_ACTIVITY', payload: newActivity });
    });

    expect(result.current.state.activities[0]).toEqual(newActivity);
  });

  it('merges partial settings updates', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: 'dark' } });
    });

    expect(result.current.state.settings.theme).toBe('dark');
    // Unrelated settings are preserved.
    expect(result.current.state.settings.fontSize).toBe('medium');
  });

  it('returns the current state unchanged for an unrecognized action type', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const stateBefore = result.current.state;

    act(() => {
      // @ts-expect-error intentionally dispatching an action type outside the known union
      result.current.dispatch({ type: 'NOT_A_REAL_ACTION' });
    });

    expect(result.current.state).toBe(stateBefore);
  });

  describe('settings persistence', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('seeds settings from localStorage on mount', () => {
      window.localStorage.setItem('app-settings', JSON.stringify({ theme: 'dark', colorScheme: 'blue', fontSize: 'medium', compactMode: false, sidebarCollapsed: true, showAvatars: true, animationsEnabled: true }));

      const { result } = renderHook(() => useApp(), { wrapper });

      expect(result.current.state.settings.theme).toBe('dark');
      expect(result.current.state.settings.sidebarCollapsed).toBe(true);
    });

    it('persists settings updates to localStorage', () => {
      const { result } = renderHook(() => useApp(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: 'dark' } });
      });

      const stored = JSON.parse(window.localStorage.getItem('app-settings') || '{}');
      expect(stored.theme).toBe('dark');
    });
  });
});
