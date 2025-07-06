import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { authService } from '../../services/authService';

// Mock the auth service
jest.mock('../../services/authService');

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.onAuthStateChange.mockImplementation((callback) => {
      // Return unsubscribe function
      return () => {};
    });
  });

  it('should initialize with no user when not authenticated', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should initialize with user when authenticated', () => {
    const mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'developer' as const,
      department: 'Engineering',
      joinDate: '2023-01-01',
      isActive: true
    };

    mockAuthService.getCurrentUser.mockReturnValue(mockUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle successful login', async () => {
    mockAuthService.login.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.login({
        email: 'test@example.com',
        password: 'password'
      });
      expect(success).toBe(true);
    });

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle failed login', async () => {
    mockAuthService.login.mockResolvedValue({ 
      success: false, 
      error: 'Invalid credentials' 
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const success = await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      expect(success).toBe(false);
    });

    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should handle login loading state', async () => {
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });
    mockAuthService.login.mockReturnValue(loginPromise);

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.login({
        email: 'test@example.com',
        password: 'password'
      });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveLogin!({ success: true });
      await loginPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle logout', async () => {
    mockAuthService.logout.mockResolvedValue();

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should handle logout error', async () => {
    mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.error).toBe('Logout failed');
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      // Simulate an error state
      result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should subscribe to auth state changes', () => {
    const mockUnsubscribe = jest.fn();
    mockAuthService.onAuthStateChange.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useAuth());

    expect(mockAuthService.onAuthStateChange).toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should update user state when auth state changes', () => {
    let authStateCallback: (user: any) => void;
    mockAuthService.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() => useAuth());

    const newUser = {
      id: '2',
      name: 'New User',
      email: 'newuser@example.com',
      role: 'manager' as const,
      department: 'Management',
      joinDate: '2023-01-01',
      isActive: true
    };

    act(() => {
      authStateCallback!(newUser);
    });

    expect(result.current.user).toEqual(newUser);
    expect(result.current.error).toBeNull();
  });
});