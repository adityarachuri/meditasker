import { User } from '../types';
import { sessionService } from './sessionService';

// Constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

// Mock users for authentication
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@softique-health-insure.com',
    name: 'Admin User',
    role: 'admin',
    department: 'Administration',
    joinDate: '2022-11-30',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '2',
    email: 'manager@softique-health-insure.com',
    name: 'Sarah Johnson',
    role: 'manager',
    department: 'Product Engineering',
    joinDate: '2023-01-15',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '3',
    email: 'developer@softique-health-insure.com',
    name: 'Michael Chen',
    role: 'developer',
    department: 'Product Engineering',
    joinDate: '2023-03-20',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '4',
    email: 'designer@softique-health-insure.com',
    name: 'Emily Rodriguez',
    role: 'designer',
    department: 'Product Engineering',
    joinDate: '2023-02-10',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  },
  {
    id: '5',
    email: 'qa@softique-health-insure.com',
    name: 'David Park',
    role: 'qa',
    department: 'Quality Assurance',
    joinDate: '2023-04-05',
    isActive: true,
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
  }
];

class AuthService {
  private static instance: AuthService;
  private refreshTokenTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate a user with email and password
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find user by email
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Simple password validation (in real app, this would be handled by backend)
    if (password !== 'password123') {
      throw new Error('Invalid email or password');
    }

    // Generate mock token
    const token = this.generateToken(user);

    // Start session
    sessionService.startSession(token, user);

    // Set up token refresh
    this.setupTokenRefresh(user);

    return { user, token };
  }

  /**
   * Log out the current user
   */
  logout(): void {
    // Clear token refresh timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }

    // End session
    sessionService.endSession();
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<string | null> {
    const sessionInfo = sessionService.getSessionInfo();
    if (!sessionInfo) return null;

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate new token
    const newToken = this.generateToken(sessionInfo.user);

    // Update session with new token
    sessionService.startSession(newToken, sessionInfo.user);

    // Set up next token refresh
    this.setupTokenRefresh(sessionInfo.user);

    return newToken;
  }

  /**
   * Check if the current user has a specific role
   */
  hasRole(role: string): boolean {
    const user = sessionService.getUser();
    if (!user) return false;

    if (user.role === 'admin') return true; // Admin has all roles
    return user.role === role;
  }

  /**
   * Get the current authentication status
   */
  getAuthStatus(): { isAuthenticated: boolean; user: User | null; token: string | null } {
    const sessionInfo = sessionService.getSessionInfo();
    const isActive = sessionService.isSessionActive();

    return {
      isAuthenticated: isActive && !!sessionInfo,
      user: isActive && sessionInfo ? sessionInfo.user : null,
      token: isActive && sessionInfo ? sessionInfo.token : null
    };
  }

  // Private methods
  private generateToken(user: User): string {
    // In a real app, this would be handled by the backend
    return `mock_token_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private setupTokenRefresh(user: User): void {
    // Clear any existing timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    // Calculate time until refresh
    const timeRemaining = sessionService.getSessionTimeRemaining();
    const refreshTime = Math.max(0, timeRemaining - TOKEN_REFRESH_THRESHOLD);

    // Set timeout to refresh token
    this.refreshTokenTimeout = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }
}

export const authService = AuthService.getInstance();