import { useState, useEffect } from 'react';
import { authService, AuthUser, LoginCredentials } from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((newUser) => {
      setUser(newUser);
      setError(null);
    });

    return unsubscribe;
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.login(credentials);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
        return false;
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authService.logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    user,
    isAuthenticated: authService.isAuthenticated(),
    isLoading,
    error,
    login,
    logout,
    clearError
  };
}