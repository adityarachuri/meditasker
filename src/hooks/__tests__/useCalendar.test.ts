import { renderHook, act } from '@testing-library/react';
import { useCalendar } from '../useCalendar';
import { calendarService } from '../../services/calendarService';

// Mock calendar service
jest.mock('../../services/calendarService');

const mockCalendarService = calendarService as jest.Mocked<typeof calendarService>;

describe('useCalendar Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCalendarService.initialize.mockResolvedValue();
    mockCalendarService.getEventsInRange.mockReturnValue([]);
    mockCalendarService.getEventsForDate.mockReturnValue([]);
    mockCalendarService.getStatistics.mockReturnValue({
      totalEvents: 0,
      eventsByType: {},
      eventsByStatus: {},
      upcomingEvents: 0,
      overdueEvents: 0
    });
    mockCalendarService.createEvent.mockReturnValue({
      id: '1',
      title: 'Test Event',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      allDay: false,
      type: 'meeting',
      priority: 'medium',
      status: 'scheduled',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  it('initializes with default view', () => {
    const { result } = renderHook(() => useCalendar());

    expect(result.current.view.type).toBe('month');
    expect(result.current.view.date).toBeInstanceOf(Date);
  });

  it('initializes calendar service on mount', async () => {
    renderHook(() => useCalendar());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockCalendarService.initialize).toHaveBeenCalled();
  });

  it('changes view type', () => {
    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.changeViewType('week');
    });

    expect(result.current.view.type).toBe('week');
  });

  it('navigates to previous period', () => {
    const { result } = renderHook(() => useCalendar());
    const initialDate = new Date(result.current.view.date);

    act(() => {
      result.current.navigatePrevious();
    });

    expect(result.current.view.date.getMonth()).toBe(initialDate.getMonth() - 1);
  });

  it('navigates to next period', () => {
    const { result } = renderHook(() => useCalendar());
    const initialDate = new Date(result.current.view.date);

    act(() => {
      result.current.navigateNext();
    });

    expect(result.current.view.date.getMonth()).toBe(initialDate.getMonth() + 1);
  });

  it('navigates to today', () => {
    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.navigateToday();
    });

    const today = new Date();
    expect(result.current.view.date.toDateString()).toBe(today.toDateString());
  });

  it('navigates to specific date', () => {
    const { result } = renderHook(() => useCalendar());
    const targetDate = new Date('2024-06-15');

    act(() => {
      result.current.navigateToDate(targetDate);
    });

    expect(result.current.view.date.toDateString()).toBe(targetDate.toDateString());
  });

  it('creates events', async () => {
    const { result } = renderHook(() => useCalendar());

    const eventData = {
      title: 'Test Event',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      allDay: false,
      type: 'meeting' as const,
      priority: 'medium' as const,
      status: 'scheduled' as const,
      color: '#3b82f6',
      createdBy: 'user1'
    };

    await act(async () => {
      const event = result.current.createEvent(eventData);
      expect(event).toBeDefined();
    });

    expect(mockCalendarService.createEvent).toHaveBeenCalledWith(eventData);
  });

  it('updates events', async () => {
    const { result } = renderHook(() => useCalendar());

    mockCalendarService.updateEvent.mockReturnValue({
      id: '1',
      title: 'Updated Event',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      allDay: false,
      type: 'meeting',
      priority: 'medium',
      status: 'scheduled',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await act(async () => {
      const event = result.current.updateEvent('1', { title: 'Updated Event' });
      expect(event).toBeDefined();
    });

    expect(mockCalendarService.updateEvent).toHaveBeenCalledWith('1', { title: 'Updated Event' });
  });

  it('deletes events', async () => {
    const { result } = renderHook(() => useCalendar());

    mockCalendarService.deleteEvent.mockReturnValue(true);

    await act(async () => {
      const success = result.current.deleteEvent('1');
      expect(success).toBe(true);
    });

    expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith('1');
  });

  it('searches events', () => {
    const { result } = renderHook(() => useCalendar());

    mockCalendarService.searchEvents.mockReturnValue([]);

    act(() => {
      const results = result.current.searchEvents('test');
      expect(Array.isArray(results)).toBe(true);
    });

    expect(mockCalendarService.searchEvents).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('updates filters', () => {
    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.updateFilter({ types: ['meeting'] });
    });

    expect(result.current.filter.types).toEqual(['meeting']);
  });

  it('clears filters', () => {
    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.updateFilter({ types: ['meeting'] });
    });

    act(() => {
      result.current.clearFilter();
    });

    expect(result.current.filter.types).toEqual([]);
    expect(result.current.filter.priorities).toEqual([]);
    expect(result.current.filter.statuses).toEqual([]);
  });

  it('checks if date is today', () => {
    const { result } = renderHook(() => useCalendar());

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    expect(result.current.isToday(today)).toBe(true);
    expect(result.current.isToday(tomorrow)).toBe(false);
  });

  it('checks if date is in current month', () => {
    const { result } = renderHook(() => useCalendar());

    const currentMonth = new Date();
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(currentMonth.getMonth() + 1);

    expect(result.current.isCurrentMonth(currentMonth)).toBe(true);
    expect(result.current.isCurrentMonth(nextMonth)).toBe(false);
  });

  it('handles navigation for different view types', () => {
    const { result } = renderHook(() => useCalendar());

    // Test day view navigation
    act(() => {
      result.current.changeViewType('day');
    });

    const initialDate = new Date(result.current.view.date);

    act(() => {
      result.current.navigateNext();
    });

    expect(result.current.view.date.getDate()).toBe(initialDate.getDate() + 1);

    // Test week view navigation
    act(() => {
      result.current.changeViewType('week');
      result.current.navigateToDate(initialDate);
    });

    act(() => {
      result.current.navigateNext();
    });

    expect(result.current.view.date.getDate()).toBe(initialDate.getDate() + 7);
  });

  it('handles errors gracefully', async () => {
    const { result } = renderHook(() => useCalendar());

    // Let mount-time initialization (initialize + loadEvents) fully settle first,
    // otherwise its later setError(null) on success can race with and clobber
    // the error we're about to trigger below.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    mockCalendarService.createEvent.mockImplementation(() => {
      throw new Error('Creation failed');
    });

    await act(async () => {
      const event = result.current.createEvent({
        title: 'Test Event',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1'
      });
      expect(event).toBeNull();
    });

    expect(result.current.error).toBe('Creation failed');
  });

  it('loads events when view changes', async () => {
    const { result } = renderHook(() => useCalendar());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.changeViewType('week');
    });

    expect(mockCalendarService.getEventsInRange).toHaveBeenCalled();
  });

  it('refreshes events', async () => {
    const { result } = renderHook(() => useCalendar());

    await act(async () => {
      result.current.refresh();
    });

    expect(mockCalendarService.getEventsInRange).toHaveBeenCalled();
  });
});