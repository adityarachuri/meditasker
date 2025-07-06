import { authService, LoginCredentials } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset auth service state
    authService.logout();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUser()).toBeTruthy();
      expect(authService.getCurrentUser()?.email).toBe(credentials.email);
    });

    it('should fail login with invalid email', async () => {
      const credentials: LoginCredentials = {
        email: 'invalid@example.com',
        password: 'password'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should fail login with invalid password', async () => {
      const credentials: LoginCredentials = {
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'wrongpassword'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should store auth data in localStorage on successful login', async () => {
      const credentials: LoginCredentials = {
        email: 'admin@softique-health-insure.com',
        password: 'password'
      };

      await authService.login(credentials);

      expect(localStorage.getItem('auth_token')).toBeTruthy();
      expect(localStorage.getItem('auth_user')).toBeTruthy();
      
      const storedUser = JSON.parse(localStorage.getItem('auth_user')!);
      expect(storedUser.email).toBe(credentials.email);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // First login
      await authService.login({
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      });

      expect(authService.isAuthenticated()).toBe(true);

      // Then logout
      await authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('authentication state', () => {
    it('should restore authentication state from localStorage', () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'developer' as const,
        department: 'Engineering',
        joinDate: '2023-01-01',
        isActive: true
      };

      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // Create new instance to test initialization
      const newAuthService = new (authService.constructor as any)();
      newAuthService.initializeFromStorage();

      expect(newAuthService.isAuthenticated()).toBe(true);
      expect(newAuthService.getCurrentUser()).toEqual(mockUser);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', 'invalid-json');

      // Create new instance to test initialization
      const newAuthService = new (authService.constructor as any)();
      newAuthService.initializeFromStorage();

      expect(newAuthService.isAuthenticated()).toBe(false);
      expect(newAuthService.getCurrentUser()).toBeNull();
    });
  });

  describe('auth state listeners', () => {
    it('should notify listeners on login', async () => {
      const listener = jest.fn();
      const unsubscribe = authService.onAuthStateChange(listener);

      await authService.login({
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        email: 'sarah.johnson@softique-health-insure.com'
      }));

      unsubscribe();
    });

    it('should notify listeners on logout', async () => {
      const listener = jest.fn();
      
      // First login
      await authService.login({
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      });

      // Then add listener and logout
      const unsubscribe = authService.onAuthStateChange(listener);
      await authService.logout();

      expect(listener).toHaveBeenCalledWith(null);

      unsubscribe();
    });

    it('should allow unsubscribing from auth state changes', async () => {
      const listener = jest.fn();
      const unsubscribe = authService.onAuthStateChange(listener);

      unsubscribe();

      await authService.login({
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('token management', () => {
    it('should return auth token after login', async () => {
      await authService.login({
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      });

      const token = authService.getAuthToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should return null token when not authenticated', () => {
      const token = authService.getAuthToken();
      expect(token).toBeNull();
    });

    it('should refresh token successfully when authenticated', async () => {
      await authService.login({
        email: 'sarah.johnson@softique-health-insure.com',
        password: 'password'
      });

      const refreshResult = await authService.refreshToken();
      expect(refreshResult).toBe(true);
    });

    it('should fail to refresh token when not authenticated', async () => {
      const refreshResult = await authService.refreshToken();
      expect(refreshResult).toBe(false);
    });
  });
});