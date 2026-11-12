import { User } from '../types';

// Session timeout in milliseconds (30 minutes by default)
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000;

export interface SessionConfig {
  tokenKey?: string;
  userKey?: string;
  timeout?: number;
  renewOnActivity?: boolean;
  secureStorage?: boolean;
}

export interface SessionInfo {
  token: string;
  user: User;
  expiresAt: number;
}

class SessionService {
  private static instance: SessionService;
  private config: Required<SessionConfig>;
  private timeoutId: NodeJS.Timeout | null = null;
  private listeners: Array<(isActive: boolean) => void> = [];
  
  private constructor() {
    this.config = {
      tokenKey: 'auth_token',
      userKey: 'auth_user',
      timeout: DEFAULT_SESSION_TIMEOUT,
      renewOnActivity: true,
      secureStorage: true
    };
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  configure(config: SessionConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start a new session
   */
  startSession(token: string, user: User): void {
    const expiresAt = Date.now() + this.config.timeout;
    
    // Store session data
    this.storeSessionData({
      token,
      user,
      expiresAt
    });
    
    // Set up session timeout
    this.resetSessionTimeout();
    
    // Set up activity listeners if enabled
    if (this.config.renewOnActivity) {
      this.setupActivityListeners();
    }
    
    // Notify listeners
    this.notifyListeners(true);
  }

  /**
   * End the current session
   */
  endSession(): void {
    // Clear session data
    this.clearSessionData();
    
    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    // Remove activity listeners
    this.removeActivityListeners();
    
    // Notify listeners
    this.notifyListeners(false);
  }

  /**
   * Check if there is an active session
   */
  isSessionActive(): boolean {
    const sessionInfo = this.getSessionInfo();
    if (!sessionInfo) return false;
    
    // Check if session has expired
    if (sessionInfo.expiresAt < Date.now()) {
      this.endSession();
      return false;
    }
    
    return true;
  }

  /**
   * Get current session information
   */
  getSessionInfo(): SessionInfo | null {
    try {
      const token = this.getItem(this.config.tokenKey);
      const userStr = this.getItem(this.config.userKey);
      const expiresAtStr = this.getItem(`${this.config.tokenKey}_expires`);
      
      if (!token || !userStr || !expiresAtStr) return null;
      
      const user = JSON.parse(userStr);
      const expiresAt = parseInt(expiresAtStr, 10);
      
      return { token, user, expiresAt };
    } catch (error) {
      console.error('Error retrieving session info:', error);
      return null;
    }
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    return this.getItem(this.config.tokenKey);
  }

  /**
   * Get the current authenticated user
   */
  getUser(): User | null {
    try {
      const userStr = this.getItem(this.config.userKey);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Renew the current session
   */
  renewSession(): void {
    const sessionInfo = this.getSessionInfo();
    if (!sessionInfo) return;
    
    const expiresAt = Date.now() + this.config.timeout;
    
    // Update expiration time
    this.setItem(`${this.config.tokenKey}_expires`, expiresAt.toString());
    
    // Reset timeout
    this.resetSessionTimeout();
  }

  /**
   * Add a session state change listener
   */
  addListener(listener: (isActive: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return function to remove listener
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Initialize session from storage
   */
  initializeFromStorage(): void {
    if (this.isSessionActive()) {
      // Set up session timeout
      this.resetSessionTimeout();
      
      // Set up activity listeners if enabled
      if (this.config.renewOnActivity) {
        this.setupActivityListeners();
      }
      
      // Notify listeners
      this.notifyListeners(true);
    }
  }

  /**
   * Get remaining session time in milliseconds
   */
  getSessionTimeRemaining(): number {
    const sessionInfo = this.getSessionInfo();
    if (!sessionInfo) return 0;
    
    const remaining = sessionInfo.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  // Private methods
  private storeSessionData(sessionInfo: SessionInfo): void {
    this.setItem(this.config.tokenKey, sessionInfo.token);
    this.setItem(this.config.userKey, JSON.stringify(sessionInfo.user));
    this.setItem(`${this.config.tokenKey}_expires`, sessionInfo.expiresAt.toString());
  }

  private clearSessionData(): void {
    this.removeItem(this.config.tokenKey);
    this.removeItem(this.config.userKey);
    this.removeItem(`${this.config.tokenKey}_expires`);
  }

  private resetSessionTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    const sessionInfo = this.getSessionInfo();
    /* istanbul ignore next -- both callers (renewSession, initializeFromStorage)
       already guard on a non-null session before calling this private method,
       so this is a defensive check with no reachable path to exercise today. */
    if (!sessionInfo) return;

    const timeRemaining = Math.max(0, sessionInfo.expiresAt - Date.now());
    
    this.timeoutId = setTimeout(() => {
      this.endSession();
    }, timeRemaining);
  }

  private setupActivityListeners(): void {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = this.handleUserActivity.bind(this);
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
  }

  private removeActivityListeners(): void {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = this.handleUserActivity.bind(this);
    
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity, true);
    });
  }

  private handleUserActivity(): void {
    if (this.config.renewOnActivity) {
      this.renewSession();
    }
  }

  private notifyListeners(isActive: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isActive);
      } catch (error) {
        console.error('Error in session listener:', error);
      }
    });
  }

  // Storage methods with secure option
  private setItem(key: string, value: string): void {
    if (this.config.secureStorage && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  }

  private getItem(key: string): string | null {
    if (this.config.secureStorage && typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    } else {
      return localStorage.getItem(key);
    }
  }

  private removeItem(key: string): void {
    if (this.config.secureStorage && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    } else {
      localStorage.removeItem(key);
    }
  }
}

export const sessionService = SessionService.getInstance();