import { authService } from '../authService';
import { sessionService } from '../sessionService';

// Mock sessionService
jest.mock('../sessionService', () => ({
  sessionService: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    getSessionInfo: jest.fn(),
    isSessionActive: jest.fn(),
    getSessionTimeRemaining: jest.fn(),
    getUser: jest.fn()
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default mock implementations
    (sessionService.getSessionTimeRemaining as jest.Mock).mockReturnValue(30 * 60 * 1000);
    (sessionService.isSessionActive as jest.Mock).mockReturnValue(true);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('login', () => {
    it('should authenticate valid user', async () => {
      const result = await authService.login('admin@softique-health-insure.com', 'password123');
      
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('admin@softique-health-insure.com');
      expect(sessionService.startSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ email: 'admin@softique-health-insure.com' })
      );
    });

    it('should reject invalid email', async () => {
      await expect(authService.login('invalid@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
      
      expect(sessionService.startSession).not.toHaveBeenCalled();
    });

    it('should reject invalid password', async () => {
      await expect(authService.login('admin@softique-health-insure.com', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
      
      expect(sessionService.startSession).not.toHaveBeenCalled();
    });

    it('should set up token refresh', async () => {
      await authService.login('admin@softique-health-insure.com', 'password123');
      
      // Clear initial calls
      (sessionService.startSession as jest.Mock).mockClear();
      
      // Fast-forward to just before token refresh
      jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes
      
      // Token should not be refreshed yet
      expect(sessionService.startSession).not.toHaveBeenCalled();
      
      // Fast-forward past token refresh threshold
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 more minutes
      
      // Token should be refreshed
      expect(sessionService.startSession).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should end session', () => {
      authService.logout();
      
      expect(sessionService.endSession).toHaveBeenCalled();
    });

    it('should cancel token refresh', async () => {
      await authService.login('admin@softique-health-insure.com', 'password123');
      
      // Clear initial calls
      (sessionService.startSession as jest.Mock).mockClear();
      
      authService.logout();
      
      // Fast-forward past token refresh threshold
      jest.advanceTimersByTime(30 * 60 * 1000);
      
      // Token should not be refreshed after logout
      expect(sessionService.startSession).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token when session exists', async () => {
      (sessionService.getSessionInfo as jest.Mock).mockReturnValue({
        token: 'old-token',
        user: {
          id: '1',
          email: 'admin@softique-health-insure.com',
          name: 'Admin User',
          role: 'admin',
          department: 'Administration',
          joinDate: '2022-11-30',
          isActive: true
        },
        expiresAt: Date.now() + 30 * 60 * 1000
      });
      
      const newToken = await authService.refreshToken();
      
      expect(newToken).not.toBeNull();
      expect(sessionService.startSession).toHaveBeenCalled();
    });

    it('should return null when no session exists', async () => {
      (sessionService.getSessionInfo as jest.Mock).mockReturnValue(null);
      
      const result = await authService.refreshToken();
      
      expect(result).toBeNull();
      expect(sessionService.startSession).not.toHaveBeenCalled();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      (sessionService.getUser as jest.Mock).mockReturnValue({
        id: '3',
        email: 'developer@softique-health-insure.com',
        name: 'Michael Chen',
        role: 'developer',
        department: 'Product Engineering',
        joinDate: '2023-03-20',
        isActive: true
      });
      
      expect(authService.hasRole('developer')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      (sessionService.getUser as jest.Mock).mockReturnValue({
        id: '3',
        email: 'developer@softique-health-insure.com',
        name: 'Michael Chen',
        role: 'developer',
        department: 'Product Engineering',
        joinDate: '2023-03-20',
        isActive: true
      });
      
      expect(authService.hasRole('manager')).toBe(false);
    });

    it('should return true for admin regardless of role', () => {
      (sessionService.getUser as jest.Mock).mockReturnValue({
        id: '1',
        email: 'admin@softique-health-insure.com',
        name: 'Admin User',
        role: 'admin',
        department: 'Administration',
        joinDate: '2022-11-30',
        isActive: true
      });
      
      expect(authService.hasRole('manager')).toBe(true);
      expect(authService.hasRole('developer')).toBe(true);
      expect(authService.hasRole('designer')).toBe(true);
    });

    it('should return false when no user is logged in', () => {
      (sessionService.getUser as jest.Mock).mockReturnValue(null);
      
      expect(authService.hasRole('admin')).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return authenticated status when session is active', () => {
      (sessionService.isSessionActive as jest.Mock).mockReturnValue(true);
      (sessionService.getSessionInfo as jest.Mock).mockReturnValue({
        token: 'test-token',
        user: {
          id: '1',
          email: 'admin@softique-health-insure.com',
          name: 'Admin User',
          role: 'admin',
          department: 'Administration',
          joinDate: '2022-11-30',
          isActive: true
        },
        expiresAt: Date.now() + 30 * 60 * 1000
      });
      
      const status = authService.getAuthStatus();
      
      expect(status.isAuthenticated).toBe(true);
      expect(status.user).not.toBeNull();
      expect(status.token).toBe('test-token');
    });

    it('should return unauthenticated status when session is inactive', () => {
      (sessionService.isSessionActive as jest.Mock).mockReturnValue(false);
      
      const status = authService.getAuthStatus();
      
      expect(status.isAuthenticated).toBe(false);
      expect(status.user).toBeNull();
      expect(status.token).toBeNull();
    });
  });
});