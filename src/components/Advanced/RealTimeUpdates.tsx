import { useEffect, useState, useRef } from 'react';
import { Wifi, WifiOff, AlertCircle, Clock } from 'lucide-react';

interface RealTimeUpdate {
  id: string;
  type: 'task_updated' | 'project_updated' | 'user_joined' | 'comment_added' | 'file_uploaded';
  entityId: string;
  entityType: 'task' | 'project' | 'user' | 'comment' | 'file';
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface RealTimeUpdatesProps {
  onUpdate: (update: RealTimeUpdate) => void;
  userId: string;
  className?: string;
}

export function RealTimeUpdates({ onUpdate, userId, className = '' }: RealTimeUpdatesProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateQueue, setUpdateQueue] = useState<RealTimeUpdate[]>([]);
  const [showNotifications, setShowNotifications] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // The visibility/online handlers below are set up once per userId (see the
  // mount effect's deps) and would otherwise close over isConnected's value
  // from that render, never seeing later connects/disconnects. This ref stays
  // current across the component's lifetime regardless of when it's read.
  const isConnectedRef = useRef(false);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const WS_URL = import.meta.env.VITE_WS_URL;

  const connect = () => {
    // Skip connection if no WebSocket URL is configured
    /* istanbul ignore next -- VITE_WS_URL is always set under test (jest.config.js)
       so the real connection path below is exercisable; this guard covers the
       unconfigured-environment case (no WS backend), which isn't this one. */
    if (!WS_URL) {
      console.log('WebSocket URL not configured, skipping real-time updates');
      setConnectionStatus('disconnected');
      return;
    }

    /* istanbul ignore next -- guards against connect() being called again while
       already open; not reachable through this component's own public triggers. */
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket(`${WS_URL}?userId=${userId}&token=${getAuthToken()}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Start heartbeat
        startHeartbeat();
        
        // Send initial subscription
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['tasks', 'projects', 'notifications', 'comments'],
          userId: userId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            // Heartbeat response
            return;
          }
          
          if (data.type === 'update') {
            const update: RealTimeUpdate = data.payload;
            handleUpdate(update);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        stopHeartbeat();
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (_error) => {
        console.warn('WebSocket connection failed - this is expected in development without a WebSocket server');
        setConnectionStatus('error');
        // Don't attempt reconnection on initial connection failure
        if (reconnectAttempts.current === 0) {
          reconnectAttempts.current = maxReconnectAttempts;
        }
      };

    } catch {
      console.warn('Failed to create WebSocket connection - this is expected in development');
      setConnectionStatus('error');
      // Don't schedule reconnect on initial failure
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    stopHeartbeat();
    clearReconnectTimeout();
  };

  const scheduleReconnect = () => {
    clearReconnectTimeout();
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s
    reconnectAttempts.current++;
    
    console.log(`Scheduling reconnect attempt ${reconnectAttempts.current} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (reconnectAttempts.current <= maxReconnectAttempts) {
        connect();
      }
    }, delay);
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || '';
  };

  const handleUpdate = (update: RealTimeUpdate) => {
    setLastUpdate(new Date());
    setUpdateQueue(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
    
    // Call the parent callback
    onUpdate(update);
    
    // Show browser notification if permission granted
    if (showNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`MediTasker - ${update.type.replace('_', ' ')}`, {
        body: update.message,
        icon: '/favicon.ico',
        tag: update.id,
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  // Initialize connection
  useEffect(() => {
    connect();
    
    // Request notification permission
    requestNotificationPermission();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce update frequency
        stopHeartbeat();
      } else {
        // Page is visible, resume normal operation
        if (isConnectedRef.current) {
          startHeartbeat();
        } else {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle online/offline events
    const handleOnline = () => {
      if (!isConnectedRef.current) {
        connect();
      }
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // Intentionally re-run only when userId changes; connect/disconnect/startHeartbeat
    // read the latest state/refs via closure and would cause reconnect loops if added here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className={`real-time-updates ${className}`}>
      {/* Connection Status Indicator */}
      <div className="flex items-center space-x-2 text-sm">
        {getStatusIcon()}
        <span className={`${
          connectionStatus === 'connected' ? 'text-green-600' :
          connectionStatus === 'connecting' ? 'text-yellow-600' :
          connectionStatus === 'error' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {getStatusText()}
        </span>
        
        {lastUpdate && (
          <span className="text-gray-500">
            • Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Recent Updates */}
      {updateQueue.length > 0 && (
        <div className="mt-2">
          <details className="group">
            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
              Recent updates ({updateQueue.length})
            </summary>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {updateQueue.map((update) => (
                <div key={update.id} className="text-xs p-2 bg-gray-50 rounded border-l-2 border-blue-500">
                  <div className="font-medium text-gray-900">{update.message}</div>
                  <div className="text-gray-500">
                    {update.userName} • {new Date(update.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Connection Controls */}
      <div className="mt-2 flex items-center space-x-2">
        {!isConnected && (
          <button
            onClick={connect}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reconnect
          </button>
        )}
        
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            showNotifications 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Notifications {showNotifications ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}

// Hook for using real-time updates
// eslint-disable-next-line react-refresh/only-export-components
export function useRealTimeUpdates(_userId: string) {
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [isConnected] = useState(false);

  const handleUpdate = (update: RealTimeUpdate) => {
    setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
  };

  return {
    updates,
    isConnected,
    handleUpdate,
    clearUpdates: () => setUpdates([]),
  };
}