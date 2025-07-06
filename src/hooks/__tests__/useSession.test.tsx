import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSession } from '../useSession';
import { sessionService } from '../../services/sessionService';
import { User } from '../../types';

// Mock sessionService
jest.mock('../../services/sessionService', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'developer',
    department: 'Engineering',
    joinDate: '2023-01-01',
    isActive: true
  };
  
  return {
    sessionService: {
      isSessionActive: jest.fn(() => true),
      getSessionInfo: jest.fn(() => ({
        token: 'test-token',
        user: mockUser,
        expiresAt: Date.now() + 30 * 60 * 1000
      })),
      getSessionTimeRemaining: jest.fn(() => 30 * 60 * 1000),
      startSession: jest.fn(),
      endSession: jest.fn(),
      renewSession: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      initializeFromStorage: jest.fn()
    }
  };
});

describe('useSession Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with session state', () => {
    const { result } = renderHook(() => useSession());
    
    expect(result.current.isActive).toBe(true);
    expect(result.current.user).not.toBeNull();
    expect(result.current.token).toBe('test-token');
    expect(sessionService.initializeFromStorage).toHaveBeenCalled();
  });

  it('should start a session', () => {
    const { result } = renderHook(() => useSession());
    
    const mockUser: User = {
      id: '2',
      name: 'New User',
      email: 'new@example.com',
      role: 'manager',
      department: 'Management',
      joinDate: '2023-02-01',
      isActive: true
    };
    
    act(() => {
      result.current.startSession('new-token', mockUser);
    });
    
    expect(sessionService.startSession).toHaveBeenCalledWith('new-token', mockUser);
  });

  it('should end a session', () => {
    const { result } = renderHook(() => useSession());
    
    act(() => {
      result.current.endSession();
    });
    
    expect(sessionService.endSession).toHaveBeenCalled();
  });

  it('should renew a session', () => {
    const { result } = renderHook(() => useSession());
    
    act(() => {
      result.current.renewSession();
    });
    
    expect(sessionService.renewSession).toHaveBeenCalled();
  });

  it('should call onExpire when session expires', () => {
    const onExpire = jest.fn();
    renderHook(() => useSession({ onExpire }));
    
    // Get the listener callback
    const listenerCallback = (sessionService.addListener as jest.Mock).mock.calls[0][0];
    
    // Simulate session expiry
    act(() => {
      listenerCallback(false);
    });
    
    expect(onExpire).toHaveBeenCalled();
  });

  it('should auto-renew session when enabled', () => {
    // Mock time remaining to be low
    (sessionService.getSessionTimeRemaining as jest.Mock).mockReturnValue(4 * 60 * 1000); // 4 minutes
    
    const onRenew = jest.fn();
    
    jest.useFakeTimers();
    
    renderHook(() => useSession({ autoRenew: true, onRenew }));
    
    // Fast-forward 1 minute
    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });
    
    expect(sessionService.renewSession).toHaveBeenCalled();
    expect(onRenew).toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('should format time remaining correctly', () => {
    // 10 minutes and 30 seconds
    (sessionService.getSessionTimeRemaining as jest.Mock).mockReturnValue(10 * 60 * 1000 + 30 * 1000);
    
    const { result } = renderHook(() => useSession());
    
    expect(result.current.formattedTimeRemaining).toBe('10:30');
    
    // 59 seconds
    (sessionService.getSessionTimeRemaining as jest.Mock).mockReturnValue(59 * 1000);
    
    const { result: result2 } = renderHook(() => useSession());
    
    expect(result2.current.formattedTimeRemaining).toBe('00:59');
    
    // 0 seconds
    (sessionService.getSessionTimeRemaining as jest.Mock).mockReturnValue(0);
    
    const { result: result3 } = renderHook(() => useSession());
    
    expect(result3.current.formattedTimeRemaining).toBe('00:00');
  });
});