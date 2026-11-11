import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const DefaultErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Try again
    </button>
  </div>
);

export function LazyLoadWrapper({
  children,
  fallback = <DefaultFallback />,
  errorFallback = DefaultErrorFallback,
}: LazyLoadWrapperProps) {
  return (
    <ErrorBoundary FallbackComponent={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// HOC for lazy loading components
// eslint-disable-next-line react-refresh/only-export-components
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ref type is genuinely generic across arbitrary wrapped components
  return React.forwardRef<any, P>((props, ref) => (
    <LazyLoadWrapper fallback={fallback}>
      <Component {...(props as P)} ref={ref} />
    </LazyLoadWrapper>
  ));
}

// Utility for creating lazy components with better error handling
// eslint-disable-next-line react-refresh/only-export-components, @typescript-eslint/no-explicit-any -- React.ComponentProps<T> requires the `any`-bounded constraint to resolve the wrapped component's real prop type
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn) as unknown as React.ComponentType<React.ComponentProps<T>>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ref type is genuinely generic across arbitrary wrapped components
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <LazyLoadWrapper fallback={fallback}>
      <LazyComponent {...(props as React.ComponentProps<T>)} ref={ref} />
    </LazyLoadWrapper>
  ));
}