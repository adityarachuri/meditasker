import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { sessionService } from '../../services/sessionService';

// Mock sessionService: AuthContext talks to this abstraction, not storage
// directly, so tests control session state through it rather than trying to
// replicate sessionService's own storage format (which also depends on its
// secureStorage config, defaulting to sessionStorage, not localStorage).
jest.mock('../../services/sessionService', () => ({
  sessionService: {
    getSessionInfo: jest.fn(() => null),
    startSession: jest.fn(),
    endSession: jest.fn(),
    configure: jest.fn(),
    // authService.login() schedules a token refresh via this after startSession.
    getSessionTimeRemaining: jest.fn(() => 0),
  },
}));

const mockSessionService = sessionService as jest.Mocked<typeof sessionService>;

// Test component to access auth context
const TestComponent = () => {
  const { state, login, logout, clearError } = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        {JSON.stringify({
          isAuthenticated: state.isAuthenticated,
          isLoading: state.isLoading,
          error: state.error,
          user: state.user?.email || null,
        })}
      </div>
      <button onClick={() => { login('admin@meditasker.com', 'password123').catch(() => {}); }}>
        Login
      </button>
      <button onClick={() => { login('invalid@example.com', 'wrongpassword').catch(() => {}); }}>
        Login Invalid
      </button>
      <button onClick={() => { login('admin@meditasker.com', 'wrongpassword').catch(() => {}); }}>
        Login Wrong Password
      </button>
      <button onClick={logout}>Logout</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionService.getSessionInfo.mockReturnValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('provides initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // checkAuthStatus runs synchronously to completion (no real async gap)
    // when getSessionInfo resolves synchronously, so isLoading already
    // settles to false by the time render() returns.
    const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
    expect(authState).toEqual({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: null,
    });
  });

  it('restores authentication from localStorage', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@meditasker.com',
      name: 'Admin User',
      role: 'admin' as const,
      department: 'Administration',
      joinDate: '2024-01-01',
      isActive: true,
    };

    mockSessionService.getSessionInfo.mockReturnValue({
      token: 'mock-token',
      user: mockUser,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBe('admin@meditasker.com');
      expect(authState.isLoading).toBe(false);
    });
  });

  it('handles no existing session gracefully', async () => {
    mockSessionService.getSessionInfo.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isLoading).toBe(false);
    });
  });

  it('handles successful login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(false);
    });

    act(() => {
      screen.getByText('Login').click();
    });

    // Check loading state
    const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
    expect(authState.isLoading).toBe(true);

    // Fast-forward the login delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBe('admin@meditasker.com');
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBe(null);
    }, { timeout: 2000 });

    expect(mockSessionService.startSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ email: 'admin@meditasker.com' })
    );
  });

  it('handles login failure with invalid email', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(false);
    });

    act(() => {
      screen.getByText('Login Invalid').click();
    });

    // Fast-forward the login delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.error).toBe('Invalid email or password');
      expect(authState.isLoading).toBe(false);
    }, { timeout: 2000 });
  });

  it('handles login failure with wrong password', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(false);
    });

    act(() => {
      screen.getByText('Login Wrong Password').click();
    });

    // Fast-forward the login delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.error).toBe('Invalid email or password');
      expect(authState.isLoading).toBe(false);
    }, { timeout: 2000 });
  });

  it('handles logout', async () => {
    // Start already logged in
    mockSessionService.getSessionInfo.mockReturnValue({
      token: 'mock-token',
      user: {
        id: '1',
        email: 'admin@meditasker.com',
        name: 'Admin User',
        role: 'admin',
        department: 'Administration',
        joinDate: '2024-01-01',
        isActive: true,
      },
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
    });

    act(() => {
      screen.getByText('Logout').click();
    });

    const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.user).toBe(null);
    expect(authState.error).toBe(null);

    expect(mockSessionService.endSession).toHaveBeenCalled();
  });

  it('clears error', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(false);
    });

    // Trigger an error
    act(() => {
      screen.getByText('Login Invalid').click();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.error).toBe('Invalid email or password');
    }, { timeout: 2000 });

    // Clear the error
    act(() => {
      screen.getByText('Clear Error').click();
    });

    const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
    expect(authState.error).toBe(null);
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    const TestComponentOutsideProvider = () => {
      useAuth();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('generates unique tokens for each login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial loading to complete
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isLoading).toBe(false);
    });

    // First login
    act(() => {
      screen.getByText('Login').click();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
    }, { timeout: 2000 });

    const firstToken = mockSessionService.startSession.mock.calls[0]?.[0];

    // Logout and login again
    act(() => {
      screen.getByText('Logout').click();
    });

    mockSessionService.startSession.mockClear();

    act(() => {
      screen.getByText('Login').click();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
    }, { timeout: 2000 });

    const secondToken = mockSessionService.startSession.mock.calls[0]?.[0];

    expect(firstToken).toBeDefined();
    expect(secondToken).toBeDefined();
    expect(firstToken).not.toBe(secondToken);
  });
});
