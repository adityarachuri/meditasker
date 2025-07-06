import { sessionService, SessionInfo } from '../sessionService';
import { User } from '../../types';

// Mock localStorage and sessionStorage
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _getStore: () => store
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('SessionService', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'developer',
    department: 'Engineering',
    joinDate: '2023-01-01',
    isActive: true
  };

  const mockToken = 'test-token-123';

  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    
    // Reset session service by ending any active session
    sessionService.endSession();
    
    // Configure with test settings
    sessionService.configure({
      timeout: 1000, // 1 second for faster testing
      secureStorage: false // Use localStorage for testing
    });
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      sessionService.startSession(mockToken, mockUser);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify(mockUser));
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token_expires', expect.any(String));
      
      const sessionInfo = sessionService.getSessionInfo();
      expect(sessionInfo).not.toBeNull();
      expect(sessionInfo?.token).toBe(mockToken);
      expect(sessionInfo?.user).toEqual(mockUser);
    });

    it('should end a session', () => {
      sessionService.startSession(mockToken, mockUser);
      sessionService.endSession();
      
      expect(mockStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('auth_token_expires');
      
      const sessionInfo = sessionService.getSessionInfo();
      expect(sessionInfo).toBeNull();
    });

    it('should check if session is active', () => {
      expect(sessionService.isSessionActive()).toBe(false);
      
      sessionService.startSession(mockToken, mockUser);
      expect(sessionService.isSessionActive()).toBe(true);
      
      // Advance time past expiration
      jest.advanceTimersByTime(1500);
      expect(sessionService.isSessionActive()).toBe(false);
    });

    it('should renew a session', () => {
      sessionService.startSession(mockToken, mockUser);
      
      const originalExpiry = parseInt(mockStorage._getStore()['auth_token_expires'], 10);
      
      // Advance time a bit
      jest.advanceTimersByTime(500);
      
      sessionService.renewSession();
      
      const newExpiry = parseInt(mockStorage._getStore()['auth_token_expires'], 10);
      expect(newExpiry).toBeGreaterThan(originalExpiry);
    });

    it('should get session time remaining', () => {
      sessionService.startSession(mockToken, mockUser);
      
      expect(sessionService.getSessionTimeRemaining()).toBeGreaterThan(0);
      expect(sessionService.getSessionTimeRemaining()).toBeLessThanOrEqual(1000);
      
      // Advance time
      jest.advanceTimersByTime(500);
      
      expect(sessionService.getSessionTimeRemaining()).toBeGreaterThan(0);
      expect(sessionService.getSessionTimeRemaining()).toBeLessThanOrEqual(500);
      
      // Advance past expiration
      jest.advanceTimersByTime(600);
      expect(sessionService.getSessionTimeRemaining()).toBe(0);
    });
  });

  describe('Session Timeout', () => {
    it('should end session after timeout', () => {
      const mockListener = jest.fn();
      sessionService.addListener(mockListener);
      
      sessionService.startSession(mockToken, mockUser);
      expect(sessionService.isSessionActive()).toBe(true);
      
      // Listener should be called with true when session starts
      expect(mockListener).toHaveBeenCalledWith(true);
      mockListener.mockClear();
      
      // Advance time past expiration
      jest.advanceTimersByTime(1100);
      
      // Session should be ended automatically
      expect(sessionService.isSessionActive()).toBe(false);
      
      // Listener should be called with false when session ends
      expect(mockListener).toHaveBeenCalledWith(false);
    });

    it('should reset timeout when session is renewed', () => {
      sessionService.startSession(mockToken, mockUser);
      
      // Advance time
      jest.advanceTimersByTime(500);
      
      // Renew session
      sessionService.renewSession();
      
      // Advance time past original expiration
      jest.advanceTimersByTime(600);
      
      // Session should still be active
      expect(sessionService.isSessionActive()).toBe(true);
      
      // Advance time past new expiration
      jest.advanceTimersByTime(500);
      
      // Session should be ended
      expect(sessionService.isSessionActive()).toBe(false);
    });
  });

  describe('Storage Options', () => {
    it('should use localStorage by default', () => {
      sessionService.configure({ secureStorage: false });
      sessionService.startSession(mockToken, mockUser);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });

    it('should use sessionStorage when secureStorage is enabled', () => {
      // Mock sessionStorage specifically
      const sessionStorageMock = { ...mockStorage };
      Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
      
      sessionService.configure({ secureStorage: true });
      sessionService.startSession(mockToken, mockUser);
      
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockToken);
    });
  });

  describe('Listeners', () => {
    it('should notify listeners when session state changes', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const removeListener1 = sessionService.addListener(listener1);
      const removeListener2 = sessionService.addListener(listener2);
      
      sessionService.startSession(mockToken, mockUser);
      
      expect(listener1).toHaveBeenCalledWith(true);
      expect(listener2).toHaveBeenCalledWith(true);
      
      listener1.mockClear();
      listener2.mockClear();
      
      sessionService.endSession();
      
      expect(listener1).toHaveBeenCalledWith(false);
      expect(listener2).toHaveBeenCalledWith(false);
      
      // Remove first listener
      removeListener1();
      
      listener1.mockClear();
      listener2.mockClear();
      
      sessionService.startSession(mockToken, mockUser);
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(true);
    });

    it('should handle errors in listeners', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      sessionService.addListener(errorListener);
      
      // This should not throw
      sessionService.startSession(mockToken, mockUser);
      
      expect(errorListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted user data', () => {
      // Set up corrupted data
      mockStorage.setItem('auth_token', mockToken);
      mockStorage.setItem('auth_user', 'not-valid-json');
      mockStorage.setItem('auth_token_expires', (Date.now() + 1000).toString());
      
      expect(sessionService.getUser()).toBeNull();
      expect(sessionService.isSessionActive()).toBe(false);
    });

    it('should handle missing expiration time', () => {
      // Set up incomplete data
      mockStorage.setItem('auth_token', mockToken);
      mockStorage.setItem('auth_user', JSON.stringify(mockUser));
      // Missing auth_token_expires
      
      expect(sessionService.getSessionInfo()).toBeNull();
      expect(sessionService.isSessionActive()).toBe(false);
    });
  });
});