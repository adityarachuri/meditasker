import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { useSession } from '../../../hooks/useSession';

// Mock the useAuth hook
jest.mock('../../../context/AuthContext', () => ({
  ...jest.requireActual('../../../context/AuthContext'),
  useAuth: jest.fn(),
}));

// Mock the useSession hook
jest.mock('../../../hooks/useSession', () => ({
  useSession: jest.fn()
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for useSession
    mockUseSession.mockReturnValue({
      isActive: true,
      sessionInfo: null,
      timeRemaining: 0,
      formattedTimeRemaining: '00:00',
      startSession: jest.fn(),
      endSession: jest.fn(),
      renewSession: jest.fn(),
      user: null,
      token: null
    });
  });

  it('shows loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        token: null,
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows login form when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
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
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows login form when session is inactive', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'developer',
          department: 'Engineering',
          joinDate: '2024-01-01',
          isActive: true,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });
    
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      isActive: false
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows custom fallback when provided and user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
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
    });

    const CustomFallback = () => <div>Custom Login</div>;

    render(
      <ProtectedRoute fallback={<CustomFallback />}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Login')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'developer',
          department: 'Engineering',
          joinDate: '2024-01-01',
          isActive: true,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('allows access when user has required role', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'manager',
          department: 'Engineering',
          joinDate: '2024-01-01',
          isActive: true,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('allows access when user is admin regardless of required role', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          department: 'Administration',
          joinDate: '2024-01-01',
          isActive: true,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('denies access when user does not have required role', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'developer',
          department: 'Engineering',
          joinDate: '2024-01-01',
          isActive: true,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText((_, element) =>
      element?.textContent === "You don't have permission to access this resource. Required role: manager"
    )).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Your current role: developer')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('handles missing user object when authenticated', () => {
    mockUseAuth.mockReturnValue({
      state: {
        user: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        token: 'mock-token',
      },
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});