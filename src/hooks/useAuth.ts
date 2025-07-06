import { useAuth as useAuthContext } from '../context/AuthContext';

// Re-export the useAuth hook for convenience
export const useAuth = useAuthContext;

// Additional auth-related hooks can be added here
export function useRequireAuth() {
  const auth = useAuthContext();
  
  if (!auth.state.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

export function useRequireRole(requiredRole: string) {
  const auth = useRequireAuth();
  
  if (auth.state.user?.role !== requiredRole && auth.state.user?.role !== 'admin') {
    throw new Error(`Role ${requiredRole} required`);
  }
  
  return auth;
}