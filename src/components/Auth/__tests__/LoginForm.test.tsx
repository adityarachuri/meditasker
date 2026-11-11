import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
    configure: jest.fn(),
    getSessionInfo: jest.fn(() => null),
    startSession: jest.fn(),
    endSession: jest.fn(),
  }
}));

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

// jsdom doesn't always cascade a submit-button click into the owning form's
// 'submit' event once the form has gone through a few controlled re-renders
// (observed here after typing into a field before submitting). Submitting
// the form directly is the reliable, widely-used workaround.
const submitForm = (submitButton: HTMLElement) => {
  const form = submitButton.closest('form');
  if (!form) {
    throw new Error('submit button is not inside a form');
  }
  fireEvent.submit(form);
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('renders login form correctly', () => {
    renderWithAuth(<LoginForm />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your MediTasker account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('displays demo credentials', () => {
    renderWithAuth(<LoginForm />);

    expect(screen.getByText('Demo Credentials')).toBeInTheDocument();
    expect(screen.getByText('admin@meditasker.com')).toBeInTheDocument();
    expect(screen.getByText('manager@meditasker.com')).toBeInTheDocument();
    expect(screen.getByText('developer@meditasker.com')).toBeInTheDocument();
    expect(screen.getByText('designer@meditasker.com')).toBeInTheDocument();
    expect(screen.getByText('qa@meditasker.com')).toBeInTheDocument();
  });

  it('displays copyright and disclaimer', () => {
    renderWithAuth(<LoginForm />);

    expect(screen.getByText('© MediTasker 2025. All rights reserved.')).toBeInTheDocument();
    expect(screen.getByText('By accessing this system, you agree to our terms of service and privacy policy.')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized access is prohibited and may be subject to legal action.')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithAuth(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    submitForm(submitButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    const emailInput = screen.getByLabelText('Email address');
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    submitForm(submitButton);

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, '123');

    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    submitForm(submitButton);

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
    submitForm(submitButton);

    expect(screen.getByText('Email is required')).toBeInTheDocument();

    const emailInput = screen.getByLabelText('Email address');
    await user.type(emailInput, 'test@example.com');

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });

  it('fills form when demo credential is clicked', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    const demoButton = screen.getByText('admin@meditasker.com').closest('button');
    await user.click(demoButton!);

    const emailInput = screen.getByLabelText('Email address') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

    expect(emailInput.value).toBe('admin@meditasker.com');
    expect(passwordInput.value).toBe('password123');
  });

  // LoginForm's login flow awaits a real `setTimeout(..., 1000)` to simulate
  // an API call. Racing that against real wall-clock time (via `waitFor`)
  // was flaky under load, so these tests use fake timers and advance past
  // that delay deterministically instead of waiting on it in real time.
  it('handles successful login', async () => {
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const user = userEvent.setup({ delay: null });
    renderWithAuth(<LoginForm />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'admin@meditasker.com');
    await user.type(passwordInput, 'password123');
    submitForm(submitButton);

    expect(screen.getByText('Signing in...')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    // Persisting the session (localStorage, etc.) is sessionService's job, which
    // is mocked here — verify LoginForm hands it a token and the matched user.
    expect(sessionService.startSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ email: 'admin@meditasker.com' })
    );

    jest.useRealTimers();
  });

  it('handles login failure with invalid credentials', async () => {
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const user = userEvent.setup({ delay: null });
    renderWithAuth(<LoginForm />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'invalid@example.com');
    await user.type(passwordInput, 'wrongpassword');
    submitForm(submitButton);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('Login Failed')).toBeInTheDocument();
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('configures session service based on remember me setting', async () => {
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const user = userEvent.setup({ delay: null });
    renderWithAuth(<LoginForm />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const rememberMeCheckbox = screen.getByLabelText('Remember me');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    // Without remember me
    await user.type(emailInput, 'admin@meditasker.com');
    await user.type(passwordInput, 'password123');
    submitForm(submitButton);

    expect(sessionService.configure).toHaveBeenCalledWith(expect.objectContaining({
      timeout: 30 * 60 * 1000, // 30 minutes
      secureStorage: true
    }));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    // With remember me
    jest.clearAllMocks();
    await user.click(rememberMeCheckbox);
    submitForm(submitButton);

    expect(sessionService.configure).toHaveBeenCalledWith(expect.objectContaining({
      timeout: 7 * 24 * 60 * 60 * 1000, // 7 days
      secureStorage: false
    }));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    jest.useRealTimers();
  });

  it('handles login failure with wrong password', async () => {
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const user = userEvent.setup({ delay: null });
    renderWithAuth(<LoginForm />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'admin@meditasker.com');
    await user.type(passwordInput, 'wrongpassword');
    submitForm(submitButton);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('Login Failed')).toBeInTheDocument();
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('disables form during loading', async () => {
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const user = userEvent.setup({ delay: null });
    renderWithAuth(<LoginForm />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'admin@meditasker.com');
    await user.type(passwordInput, 'password123');
    submitForm(submitButton);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    jest.useRealTimers();
  });

  it('clears errors when form data changes', async () => {
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const user = userEvent.setup({ delay: null });
    renderWithAuth(<LoginForm />);

    // Trigger an error first
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(emailInput, 'invalid@example.com');
    await user.type(passwordInput, 'wrongpassword');
    submitForm(submitButton);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByText('Login Failed')).toBeInTheDocument();

    // Clear the error by typing
    await user.clear(emailInput);
    await user.type(emailInput, 'admin@meditasker.com');

    expect(screen.queryByText('Login Failed')).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
