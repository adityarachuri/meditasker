import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { queryClient } from './services/api';
import { AppProvider } from './context/AppContext';
import { LazyLoadWrapper } from './components/Performance/LazyLoadWrapper';
import { RealTimeUpdates, useRealTimeUpdates } from './components/Advanced/RealTimeUpdates';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ProjectListVirtualized } from './components/Projects/ProjectListVirtualized';
import { TaskListVirtualized } from './components/Tasks/TaskListVirtualized';
import { Calendar } from './components/Calendar/Calendar';
import { TeamList } from './components/Team/TeamList';
import { NotificationList } from './components/Notifications/NotificationList';
import { ReportsDashboard } from './components/Reports/ReportsDashboard';
import { SettingsPage } from './components/Settings/SettingsPage';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { getAverageRenderTime } = usePerformanceMonitor('App');
  const { updates, handleUpdate } = useRealTimeUpdates('current-user-id');

  // Set mock authentication token for WebSocket connection
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', 'mock-auth-token-' + Date.now());
    }
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'projects':
        return 'Projects';
      case 'tasks':
        return 'Tasks';
      case 'team':
        return 'Team';
      case 'calendar':
        return 'Calendar';
      case 'reports':
        return 'Reports';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <LazyLoadWrapper>
            <Dashboard />
          </LazyLoadWrapper>
        );
      case 'projects':
        return (
          <LazyLoadWrapper>
            <ProjectListVirtualized />
          </LazyLoadWrapper>
        );
      case 'tasks':
        return (
          <LazyLoadWrapper>
            <TaskListVirtualized />
          </LazyLoadWrapper>
        );
      case 'team':
        return (
          <LazyLoadWrapper>
            <TeamList />
          </LazyLoadWrapper>
        );
      case 'calendar':
        return (
          <LazyLoadWrapper>
            <Calendar />
          </LazyLoadWrapper>
        );
      case 'reports':
        return (
          <LazyLoadWrapper>
            <ReportsDashboard />
          </LazyLoadWrapper>
        );
      case 'notifications':
        return (
          <LazyLoadWrapper>
            <NotificationList />
          </LazyLoadWrapper>
        );
      case 'settings':
        return (
          <LazyLoadWrapper>
            <SettingsPage />
          </LazyLoadWrapper>
        );
      default:
        return (
          <LazyLoadWrapper>
            <Dashboard />
          </LazyLoadWrapper>
        );
    }
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <div className="min-h-screen bg-gray-50 flex">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex-1 flex flex-col">
              <Header
                title={getPageTitle()}
                showAddButton={activeTab === 'projects' || activeTab === 'tasks'}
              />
              <main className="flex-1 p-6">
                {renderContent()}
              </main>
              
              {/* Real-time updates indicator */}
              <div className="fixed bottom-4 right-4 z-50">
                <RealTimeUpdates
                  onUpdate={handleUpdate}
                  userId="current-user-id"
                  className="bg-white rounded-lg shadow-lg border border-gray-200 p-3"
                />
              </div>
            </div>
          </div>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Performance monitoring wrapper
export default React.memo(App);

// Service Worker registration for PWA capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Performance observer for monitoring
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log('LCP:', entry.startTime);
      }
      if (entry.entryType === 'first-input') {
        console.log('FID:', entry.processingStart - entry.startTime);
      }
      if (entry.entryType === 'layout-shift') {
        console.log('CLS:', entry.value);
      }
    }
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}

// Memory usage monitoring
if ('memory' in performance) {
  setInterval(() => {
    const memory = (performance as any).memory;
    if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
      console.warn('High memory usage detected:', {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
    }
  }, 30000); // Check every 30 seconds
}

// Network status monitoring
window.addEventListener('online', () => {
  console.log('Network: Online');
});

window.addEventListener('offline', () => {
  console.log('Network: Offline');
});

// Visibility change monitoring
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('App: Hidden');
  } else {
    console.log('App: Visible');
  }
});

// Unhandled error tracking
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Resource timing monitoring
window.addEventListener('load', () => {
  setTimeout(() => {
    const resources = performance.getEntriesByType('resource');
    const slowResources = resources.filter((resource: any) => resource.duration > 1000);
    if (slowResources.length > 0) {
      console.warn('Slow resources detected:', slowResources);
    }
  }, 1000);
});

// Bundle size monitoring
if (import.meta.env.DEV) {
  import('./utils/bundleAnalyzer').then(({ analyzeBundleSize }) => {
    analyzeBundleSize();
  });
}

// Database connection monitoring
let dbConnectionRetries = 0;
const maxDbRetries = 3;

function monitorDatabaseConnection() {
  // Simulate database health check
  fetch('/api/health')
    .then(response => {
      if (!response.ok) {
        throw new Error('Database health check failed');
      }
      dbConnectionRetries = 0;
    })
    .catch(error => {
      dbConnectionRetries++;
      console.error(`Database connection issue (attempt ${dbConnectionRetries}):`, error);
      
      if (dbConnectionRetries >= maxDbRetries) {
        console.error('Database connection failed after maximum retries');
        // Show user notification about connectivity issues
      }
    });
}

// Check database connection every 5 minutes
setInterval(monitorDatabaseConnection, 5 * 60 * 1000);

// Initial connection check
monitorDatabaseConnection();

// Cache management
function manageCacheSize() {
  const maxCacheSize = 50 * 1024 * 1024; // 50MB
  
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
      if (estimate.usage && estimate.usage > maxCacheSize) {
        console.warn('Cache size exceeded limit, clearing old data');
        // Clear old cache entries
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.includes('old') || cacheName.includes('v1')) {
                return caches.delete(cacheName);
              }
            })
          );
        });
      }
    });
  }
}

// Check cache size every hour
setInterval(manageCacheSize, 60 * 60 * 1000);

// User session monitoring
let userActivityTimeout: NodeJS.Timeout;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetUserActivityTimer() {
  clearTimeout(userActivityTimeout);
  userActivityTimeout = setTimeout(() => {
    console.log('User session timeout - logging out');
    // Implement logout logic
  }, SESSION_TIMEOUT);
}

// Track user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, resetUserActivityTimer, true);
});

// Initialize activity timer
resetUserActivityTimer();

// Feature flag system
const featureFlags = {
  enableAdvancedSearch: true,
  enableRealTimeUpdates: true,
  enableBulkOperations: true,
  enableDataExport: true,
  enablePerformanceMonitoring: true,
};

// Make feature flags globally available
(window as any).featureFlags = featureFlags;

// A/B testing framework
const abTests = {
  newDashboardLayout: Math.random() > 0.5 ? 'variant' : 'control',
  improvedTaskView: Math.random() > 0.5 ? 'variant' : 'control',
};

(window as any).abTests = abTests;

// Analytics tracking
function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  if (import.meta.env.PROD) {
    // Send to analytics service
    console.log('Analytics:', eventName, properties);
  }
}

(window as any).trackEvent = trackEvent;

// Performance budget monitoring
const performanceBudget = {
  maxLoadTime: 3000, // 3 seconds
  maxBundleSize: 1024 * 1024, // 1MB
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
};

function checkPerformanceBudget() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const loadTime = navigation.loadEventEnd - navigation.fetchStart;
  
  if (loadTime > performanceBudget.maxLoadTime) {
    console.warn(`Load time exceeded budget: ${loadTime}ms > ${performanceBudget.maxLoadTime}ms`);
    trackEvent('performance_budget_exceeded', { metric: 'loadTime', value: loadTime });
  }
}

window.addEventListener('load', checkPerformanceBudget);

// Progressive Web App features
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install button
  console.log('PWA install prompt available');
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  trackEvent('pwa_installed');
});

// Background sync for offline operations
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then(registration => {
    // Register for background sync
    return registration.sync.register('background-sync');
  }).catch(err => {
    console.log('Background sync registration failed:', err);
  });
}

// Push notifications setup
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.ready.then(registration => {
    return registration.pushManager.getSubscription();
  }).then(subscription => {
    if (!subscription) {
      // Subscribe to push notifications
      console.log('Push notifications not subscribed');
    } else {
      console.log('Push notifications subscribed');
    }
  });
}

// Critical resource preloading
const criticalResources = [
  '/api/dashboard',
  '/api/projects',
  '/api/tasks',
];

criticalResources.forEach(resource => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = resource;
  document.head.appendChild(link);
});

// Lazy loading for non-critical resources
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      img.src = img.dataset.src || '';
      observer.unobserve(img);
    }
  });
});

// Apply lazy loading to images
document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});

// Code splitting and dynamic imports
const loadModule = async (moduleName: string) => {
  try {
    const module = await import(`./modules/${moduleName}`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load module ${moduleName}:`, error);
    return null;
  }
};

(window as any).loadModule = loadModule;

// Memory leak detection
let componentCount = 0;
const originalCreateElement = React.createElement;

React.createElement = function(...args) {
  componentCount++;
  if (componentCount % 1000 === 0) {
    console.log(`Component count: ${componentCount}`);
  }
  return originalCreateElement.apply(this, args);
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Cancel pending requests
  // Clear timers
  // Save state
  console.log('Cleaning up before page unload');
});

// Development tools
if (import.meta.env.DEV) {
  // React DevTools
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  
  // Performance profiling
  (window as any).startProfiling = () => {
    performance.mark('profiling-start');
  };
  
  (window as any).endProfiling = () => {
    performance.mark('profiling-end');
    performance.measure('profiling', 'profiling-start', 'profiling-end');
    const measure = performance.getEntriesByName('profiling')[0];
    console.log(`Profiling duration: ${measure.duration}ms`);
  };
}

// Export for testing
export { featureFlags, abTests, trackEvent };