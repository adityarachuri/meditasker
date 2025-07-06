import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

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
      <button onClick={() => login('admin@softique-health-insure.com', 'password123')}>
        Login
      </button>
      <button onClick={() => login('invalid@example.com', 'wrongpassword')}>
        Login Invalid
      </button>
      <button onClick={() => login('admin@softique-health-insure.com', 'wrongpassword')}>
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
    mockLocalStorage.getItem.mockReturnValue(null);
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

    const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
    expect(authState).toEqual({
      isAuthenticated: false,
      isLoading: true,
      error: null,
      user: null,
    });
  });

  it('restores authentication from localStorage', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@softique-health-insure.com',
      name: 'Admin User',
      role: 'admin',
      department: 'Administration',
    };

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'auth_token') return 'mock-token';
      if (key === 'auth_user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBe('admin@softique-health-insure.com');
      expect(authState.isLoading).toBe(false);
    });
  });

  it('handles corrupted localStorage data', async () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'auth_token') return 'mock-token';
      if (key === 'auth_user') return 'invalid-json';
      return null;
    });

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

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
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
    let authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
    expect(authState.isLoading).toBe(true);

    // Fast-forward the login delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBe('admin@softique-health-insure.com');
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBe(null);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', expect.any(String));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', expect.any(String));
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
    });
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
    });
  });

  it('handles logout', async () => {
    // First login
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'auth_token') return 'mock-token';
      if (key === 'auth_user') return JSON.stringify({
        id: '1',
        email: 'admin@softique-health-insure.com',
        name: 'Admin User',
        role: 'admin',
        department: 'Administration',
      });
      return null;
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

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
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
    });

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
    });

    const firstToken = mockLocalStorage.setItem.mock.calls.find(call => call[0] === 'auth_token')?.[1];

    // Logout and login again
    act(() => {
      screen.getByText('Logout').click();
    });

    mockLocalStorage.setItem.mockClear();

    act(() => {
      screen.getByText('Login').click();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent!);
      expect(authState.isAuthenticated).toBe(true);
    });

    const secondToken = mockLocalStorage.setItem.mock.calls.find(call => call[0] === 'auth_token')?.[1];

    expect(firstToken).toBeDefined();
    expect(secondToken).toBeDefined();
    expect(firstToken).not.toBe(secondToken);
  });
});