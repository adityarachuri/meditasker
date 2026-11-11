import { useState, useEffect, useCallback } from 'react';
import { sessionService, SessionInfo } from '../services/sessionService';
import { User } from '../types';

interface UseSessionOptions {
  onExpire?: () => void;
  onRenew?: () => void;
  autoRenew?: boolean;
}

export function useSession(options: UseSessionOptions = {}) {
  const [isActive, setIsActive] = useState<boolean>(sessionService.isSessionActive());
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(sessionService.getSessionInfo());
  const [timeRemaining, setTimeRemaining] = useState<number>(sessionService.getSessionTimeRemaining());

  // Update session info when session changes
  useEffect(() => {
    const handleSessionChange = (active: boolean) => {
      setIsActive(active);
      setSessionInfo(sessionService.getSessionInfo());
      setTimeRemaining(sessionService.getSessionTimeRemaining());
      
      if (!active && options.onExpire) {
        options.onExpire();
      }
    };
    
    // Add listener for session changes
    const removeListener = sessionService.addListener(handleSessionChange);
    
    // Initialize from storage
    sessionService.initializeFromStorage();
    
    // Set up timer to update time remaining
    const timer = setInterval(() => {
      setTimeRemaining(sessionService.getSessionTimeRemaining());
    }, 1000);
    
    return () => {
      removeListener();
      clearInterval(timer);
    };
  }, [options]);

  // Auto-renew session if enabled
  useEffect(() => {
    if (!options.autoRenew) return;
    
    const renewThreshold = 5 * 60 * 1000; // 5 minutes
    
    const checkAndRenew = () => {
      if (isActive && timeRemaining < renewThreshold) {
        renewSession();
        if (options.onRenew) {
          options.onRenew();
        }
      }
    };
    
    const interval = setInterval(checkAndRenew, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
    // renewSession is declared below via useCallback with a stable (empty) dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeRemaining, options.autoRenew, options.onRenew]);

  const startSession = useCallback((token: string, user: User) => {
    sessionService.startSession(token, user);
  }, []);

  const endSession = useCallback(() => {
    sessionService.endSession();
  }, []);

  const renewSession = useCallback(() => {
    sessionService.renewSession();
  }, []);

  return {
    isActive,
    sessionInfo,
    timeRemaining,
    startSession,
    endSession,
    renewSession,
    user: sessionInfo?.user || null,
    token: sessionInfo?.token || null,
    formattedTimeRemaining: formatTimeRemaining(timeRemaining)
  };
}

// Helper function to format time remaining
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}