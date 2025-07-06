export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'developer' | 'designer' | 'qa';
  avatar?: string;
  department: string;
  joinDate: string;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;
  private authToken: string | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  constructor() {
    // Check for existing session on initialization
    this.initializeFromStorage();
  }

  private initializeFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    
    if (token && userData) {
      try {
        this.authToken = token;
        this.currentUser = JSON.parse(userData);
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        this.clearStorage();
      }
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.authToken = null;
    this.currentUser = null;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication - in production, this would call your API
      const mockUsers: AuthUser[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@softique-health-insure.com',
          role: 'manager',
          department: 'Product Engineering',
          joinDate: '2023-01-15',
          isActive: true,
          avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
        },
        {
          id: '2',
          name: 'Michael Chen',
          email: 'michael.chen@softique-health-insure.com',
          role: 'developer',
          department: 'Product Engineering',
          joinDate: '2023-03-20',
          isActive: true,
          avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
        },
        {
          id: '3',
          name: 'Emily Rodriguez',
          email: 'emily.rodriguez@softique-health-insure.com',
          role: 'designer',
          department: 'Product Engineering',
          joinDate: '2023-02-10',
          isActive: true,
          avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
        },
        {
          id: 'admin',
          name: 'Admin User',
          email: 'admin@softique-health-insure.com',
          role: 'admin',
          department: 'Administration',
          joinDate: '2022-01-01',
          isActive: true,
          avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
        }
      ];

      // Find user by email
      const user = mockUsers.find(u => u.email === credentials.email);
      
      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Mock password validation (in production, this would be handled securely on the server)
      const validPasswords = ['password', 'admin123', 'user123'];
      if (!validPasswords.includes(credentials.password)) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Generate mock token
      const token = `token_${user.id}_${Date.now()}`;
      
      // Store authentication data
      this.authToken = token;
      this.currentUser = user;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async logout(): Promise<void> {
    try {
      // In production, you might want to invalidate the token on the server
      this.clearStorage();
      this.notifyListeners();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local data
      this.clearStorage();
      this.notifyListeners();
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.authToken !== null;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async refreshToken(): Promise<boolean> {
    try {
      if (!this.authToken) return false;
      
      // In production, this would refresh the token with the server
      // For now, just validate the current token
      const userData = localStorage.getItem('auth_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearStorage();
      this.notifyListeners();
      return false;
    }
  }
}

export const authService = AuthService.getInstance();