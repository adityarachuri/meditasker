import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../hooks/useSession';
import { LoginForm } from './LoginForm';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'developer' | 'designer' | 'qa';
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { state } = useAuth();
  const { isActive } = useSession({
    onExpire: () => {
      // Session expired, will be handled by AuthContext
    }
  });

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!state.isAuthenticated || !state.user || !isActive) {
    return fallback || <LoginForm />;
  }

  // Check role-based access if required
  if (requiredRole && state.user.role !== requiredRole && state.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this resource. Required role: {requiredRole}
          </p>
          <p className="text-sm text-gray-500">
            Your current role: {state.user.role}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}