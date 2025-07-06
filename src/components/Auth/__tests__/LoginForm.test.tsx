import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../context/AuthContext';
import { sessionService } from '../../../services/sessionService';

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

// Mock sessionService
jest.mock('../../../services/sessionService', () => ({
  sessionService: {
    configure: jest.fn()
  }
}));

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders login form correctly', () => {
    renderWithAuth(<LoginForm />);
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your Softique Health Insure account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('displays demo credentials', () => {
    renderWithAuth(<LoginForm />);
    
    expect(screen.getByText('Demo Credentials')).toBeInTheDocument();
    expect(screen.getByText('admin@softique-health-insure.com')).toBeInTheDocument();
    expect(screen.getByText('manager@softique-health-insure.com')).toBeInTheDocument();
    expect(screen.getByText('developer@softique-health-insure.com')).toBeInTheDocument();
    expect(screen.getByText('designer@softique-health-insure.com')).toBeInTheDocument();
    expect(screen.getByText('qa@softique-health-insure.com')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email address');
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, '123');
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput.type).toBe('password');
    
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');
    
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('clears validation errors when typing', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitButton);
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    
    const emailInput = screen.getByLabelText('Email address');
    await user.type(emailInput, 'test@example.com');
    
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('fills form when demo credential is clicked', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const demoButton = screen.getByText('admin@softique-health-insure.com').closest('button');
    await user.click(demoButton!);
    
    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    
    expect(emailInput.value).toBe('admin@softique-health-insure.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'admin@softique-health-insure.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', expect.any(String));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_user', expect.any(String));
    });
  });

  it('handles login failure with invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'invalid@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login Failed')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
  
  it('configures session service based on remember me setting', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const rememberMeCheckbox = screen.getByLabelText('Remember me');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    // Without remember me
    await user.type(emailInput, 'admin@softique-health-insure.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(sessionService.configure).toHaveBeenCalledWith(expect.objectContaining({
      timeout: 30 * 60 * 1000, // 30 minutes
      secureStorage: true
    }));
    
    // With remember me
    jest.clearAllMocks();
    await user.click(rememberMeCheckbox);
    await user.click(submitButton);
    
    expect(sessionService.configure).toHaveBeenCalledWith(expect.objectContaining({
      timeout: 7 * 24 * 60 * 60 * 1000, // 7 days
      secureStorage: false
    }));
  });

  it('handles login failure with wrong password', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'admin@softique-health-insure.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login Failed')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('disables form during loading', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'admin@softique-health-insure.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('clears errors when form data changes', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);
    
    // Trigger an error first
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'invalid@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login Failed')).toBeInTheDocument();
    });
    
    // Clear the error by typing
    await user.clear(emailInput);
    await user.type(emailInput, 'admin@softique-health-insure.com');
    
    expect(screen.queryByText('Login Failed')).not.toBeInTheDocument();
  });
});