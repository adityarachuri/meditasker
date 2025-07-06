import { renderHook } from '@testing-library/react';
import { useAuth, useRequireAuth, useRequireRole } from '../useAuth';
import * as AuthContext from '../../context/AuthContext';

// Mock the AuthContext
jest.mock('../../context/AuthContext');

const mockUseAuth = AuthContext.useAuth as jest.MockedFunction<typeof AuthContext.useAuth>;

describe('useAuth hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAuth', () => {
    it('returns auth context', () => {
      const mockAuthContext = {
        state: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          token: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useAuth());

      expect(result.current).toBe(mockAuthContext);
    });
  });

  describe('useRequireAuth', () => {
    it('returns auth context when user is authenticated', () => {
      const mockAuthContext = {
        state: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer' as const,
            department: 'Engineering',
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
          token: 'mock-token',
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useRequireAuth());

      expect(result.current).toBe(mockAuthContext);
    });

    it('throws error when user is not authenticated', () => {
      const mockAuthContext = {
        state: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          token: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useRequireAuth());

      expect(result.error).toEqual(new Error('Authentication required'));
    });
  });

  describe('useRequireRole', () => {
    it('returns auth context when user has required role', () => {
      const mockAuthContext = {
        state: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'manager' as const,
            department: 'Engineering',
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
          token: 'mock-token',
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useRequireRole('manager'));

      expect(result.current).toBe(mockAuthContext);
    });

    it('returns auth context when user is admin regardless of required role', () => {
      const mockAuthContext = {
        state: {
          user: {
            id: '1',
            email: 'admin@example.com',
            name: 'Admin User',
            role: 'admin' as const,
            department: 'Administration',
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
          token: 'mock-token',
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useRequireRole('manager'));

      expect(result.current).toBe(mockAuthContext);
    });

    it('throws error when user does not have required role', () => {
      const mockAuthContext = {
        state: {
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'developer' as const,
            department: 'Engineering',
          },
          isAuthenticated: true,
          isLoading: false,
          error: null,
          token: 'mock-token',
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useRequireRole('manager'));

      expect(result.error).toEqual(new Error('Role manager required'));
    });

    it('throws error when user is not authenticated', () => {
      const mockAuthContext = {
        state: {
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          token: null,
        },
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
      };

      mockUseAuth.mockReturnValue(mockAuthContext);

      const { result } = renderHook(() => useRequireRole('manager'));

      expect(result.error).toEqual(new Error('Authentication required'));
    });
  });
});