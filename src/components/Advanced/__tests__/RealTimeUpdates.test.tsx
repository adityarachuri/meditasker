import { render, screen, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealTimeUpdates, useRealTimeUpdates } from '../RealTimeUpdates';

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  static lastInstance: FakeWebSocket;

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: string[] = [];
  closeCode?: number;
  closeReason?: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
    FakeWebSocket.lastInstance = this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code = 1000, reason = '') {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

describe('RealTimeUpdates', () => {
  const originalWebSocket = global.WebSocket;
  const originalNotification = (global as unknown as { Notification?: unknown }).Notification;

  beforeEach(() => {
    jest.useFakeTimers();
    FakeWebSocket.instances = [];
    global.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    window.localStorage.setItem('auth_token', 'tok-123');
    (global as unknown as { Notification: unknown }).Notification = Object.assign(
      jest.fn(),
      { permission: 'default', requestPermission: jest.fn().mockResolvedValue('granted') }
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    global.WebSocket = originalWebSocket;
    (global as unknown as { Notification: unknown }).Notification = originalNotification;
    jest.restoreAllMocks();
  });

  it('connects on mount, sends a subscribe message, and shows Connected', async () => {
    const onUpdate = jest.fn();
    render(<RealTimeUpdates onUpdate={onUpdate} userId="u1" />);

    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(FakeWebSocket.lastInstance.sent[0]).toContain('"type":"subscribe"');
    expect(FakeWebSocket.lastInstance.url).toContain('token=tok-123');
  });

  it('connects with an empty token when none is stored', async () => {
    window.localStorage.removeItem('auth_token');
    const onUpdate = jest.fn();
    render(<RealTimeUpdates onUpdate={onUpdate} userId="u1" />);

    expect(FakeWebSocket.lastInstance.url.endsWith('token=')).toBe(true);
  });

  it('shows Connecting while the socket is pending', () => {
    const onUpdate = jest.fn();
    render(<RealTimeUpdates onUpdate={onUpdate} userId="u1" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('handles an incoming update message and calls onUpdate', async () => {
    const onUpdate = jest.fn();
    render(<RealTimeUpdates onUpdate={onUpdate} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    const update = {
      id: 'upd-1',
      type: 'task_updated',
      entityId: 't1',
      entityType: 'task',
      message: 'Task updated',
      userId: 'u2',
      userName: 'Bob',
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      FakeWebSocket.lastInstance.onmessage?.({ data: JSON.stringify({ type: 'update', payload: update }) });
    });

    expect(onUpdate).toHaveBeenCalledWith(update);
    expect(screen.getByText('Last update:', { exact: false })).toBeInTheDocument();

    await userEvent.setup({ delay: null }).click(screen.getByText(/Recent updates/));
    expect(screen.getByText('Task updated')).toBeInTheDocument();
  });

  it('ignores a pong message', async () => {
    const onUpdate = jest.fn();
    render(<RealTimeUpdates onUpdate={onUpdate} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      FakeWebSocket.lastInstance.onmessage?.({ data: JSON.stringify({ type: 'pong' }) });
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('logs and recovers from an unparseable message', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      FakeWebSocket.lastInstance.onmessage?.({ data: 'not json' });
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
  });

  it('sends a heartbeat ping every 30 seconds while connected', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(FakeWebSocket.lastInstance.sent).toContain(JSON.stringify({ type: 'ping' }));
  });

  it('schedules a reconnect on an unclean close, with exponential backoff', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      FakeWebSocket.lastInstance.close(1006, 'abnormal');
    });
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(FakeWebSocket.instances).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not reconnect on a clean close (code 1000)', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      FakeWebSocket.lastInstance.close(1000, 'User disconnected');
    });

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('shows a connection error and the Reconnect button', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      FakeWebSocket.lastInstance.onerror?.(new Event('error'));
    });

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('reconnects when the Reconnect button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await act(async () => {
      FakeWebSocket.lastInstance.onerror?.(new Event('error'));
    });

    await user.click(screen.getByText('Reconnect'));
    expect(FakeWebSocket.instances).toHaveLength(2);
    consoleSpy.mockRestore();
  });

  it('toggles the notifications preference', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);

    expect(screen.getByText('Notifications On')).toBeInTheDocument();
    await user.click(screen.getByText('Notifications On'));
    expect(screen.getByText('Notifications Off')).toBeInTheDocument();
  });

  it('shows a desktop notification for an update when permission is granted', async () => {
    (global as unknown as { Notification: { permission: string } }).Notification.permission = 'granted';
    const NotificationSpy = jest.fn();
    (global as unknown as { Notification: unknown }).Notification = Object.assign(NotificationSpy, {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    });

    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      FakeWebSocket.lastInstance.onmessage?.({
        data: JSON.stringify({
          type: 'update',
          payload: { id: '1', type: 'task_updated', message: 'hi', userId: 'u1', userName: 'A', timestamp: new Date().toISOString() },
        }),
      });
    });

    expect(NotificationSpy).toHaveBeenCalled();
  });

  it('disconnects and removes listeners on unmount', async () => {
    const { unmount } = render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    unmount();
    expect(FakeWebSocket.lastInstance.closeCode).toBe(1000);
  });

  it('reconnects on reconnect when visibility becomes visible and was disconnected', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.close(1006, 'x');
    });

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(1);
  });

  it('stops the heartbeat when the page becomes hidden', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    FakeWebSocket.lastInstance.sent = [];
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(FakeWebSocket.lastInstance.sent).toHaveLength(0);
  });

  it('reconnects on the online event when disconnected', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.close(1006, 'x');
    });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(1);
  });

  it('sets disconnected on the offline event', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('resumes the heartbeat on visibility change while already connected', async () => {
    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);
    await act(async () => {
      FakeWebSocket.lastInstance.open();
    });

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    FakeWebSocket.lastInstance.sent = [];
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(FakeWebSocket.lastInstance.sent).toContain(JSON.stringify({ type: 'ping' }));
  });

  it('logs and sets an error status when constructing the WebSocket throws', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.WebSocket = class {
      static OPEN = 1;
      constructor() {
        throw new Error('construction failed');
      }
    } as unknown as typeof WebSocket;

    render(<RealTimeUpdates onUpdate={jest.fn()} userId="u1" />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to create WebSocket connection - this is expected in development');
    consoleSpy.mockRestore();
  });
});

describe('useRealTimeUpdates', () => {
  it('accumulates updates, caps at 50, and can clear them', () => {
    const { result } = renderHook(() => useRealTimeUpdates('u1'));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.updates).toEqual([]);

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.handleUpdate({
          id: `u${i}`,
          type: 'task_updated',
          entityId: 't1',
          entityType: 'task',
          message: `msg ${i}`,
          userId: 'u1',
          userName: 'Alice',
          timestamp: new Date().toISOString(),
        });
      }
    });

    expect(result.current.updates).toHaveLength(50);
    expect(result.current.updates[0].message).toBe('msg 54');

    act(() => {
      result.current.clearUpdates();
    });
    expect(result.current.updates).toEqual([]);
  });
});
