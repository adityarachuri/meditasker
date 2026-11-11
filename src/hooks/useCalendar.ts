import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarEvent, CalendarView, CalendarFilter } from '../types/calendar';
import { calendarService } from '../services/calendarService';

export function useCalendar(initialView: CalendarView = { type: 'month', date: new Date() }) {
  const [view, setView] = useState<CalendarView>(initialView);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>({
    types: [],
    priorities: [],
    statuses: [],
    attendees: [],
    projects: []
  });

  // Initialize calendar service
  useEffect(() => {
    const initializeCalendar = async () => {
      try {
        setLoading(true);
        await calendarService.initialize();
        loadEvents();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize calendar');
      } finally {
        setLoading(false);
      }
    };

    initializeCalendar();
    // Run exactly once on mount; loadEvents is recreated from view/filter below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load events when view or filter changes. Skip while there's an
  // initialization error — otherwise this effect's success path (loadEvents
  // calls setError(null)) immediately clears the error that initialization
  // just set, since `loading` still flips to false on failure via `finally`.
  useEffect(() => {
    if (!loading && !error) {
      loadEvents();
    }
    // loadEvents's own deps (view, filter) are already tracked here; adding it
    // directly isn't possible without reordering since it's declared below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filter, loading, error]);

  const loadEvents = useCallback(() => {
    try {
      const { startDate, endDate } = getDateRange(view);
      const filteredEvents = calendarService.getEventsInRange(startDate, endDate, filter);
      setEvents(filteredEvents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    }
  }, [view, filter]);

  // Navigation functions
  const navigateToDate = useCallback((date: Date) => {
    setView(prev => ({ ...prev, date }));
  }, []);

  const navigatePrevious = useCallback(() => {
    setView(prev => {
      const newDate = new Date(prev.date);
      switch (prev.type) {
        case 'day':
          newDate.setDate(newDate.getDate() - 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case 'agenda':
          newDate.setDate(newDate.getDate() - 7);
          break;
      }
      return { ...prev, date: newDate };
    });
  }, []);

  const navigateNext = useCallback(() => {
    setView(prev => {
      const newDate = new Date(prev.date);
      switch (prev.type) {
        case 'day':
          newDate.setDate(newDate.getDate() + 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case 'agenda':
          newDate.setDate(newDate.getDate() + 7);
          break;
      }
      return { ...prev, date: newDate };
    });
  }, []);

  const navigateToday = useCallback(() => {
    setView(prev => ({ ...prev, date: new Date() }));
  }, []);

  // View type changes
  const changeViewType = useCallback((type: CalendarView['type']) => {
    setView(prev => ({ ...prev, type }));
  }, []);

  // Event management
  const createEvent = useCallback((eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newEvent = calendarService.createEvent(eventData);
      loadEvents();
      return newEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      return null;
    }
  }, [loadEvents]);

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    try {
      const updatedEvent = calendarService.updateEvent(id, updates);
      if (updatedEvent) {
        loadEvents();
      }
      return updatedEvent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
      return null;
    }
  }, [loadEvents]);

  const deleteEvent = useCallback((id: string) => {
    try {
      const success = calendarService.deleteEvent(id);
      if (success) {
        loadEvents();
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      return false;
    }
  }, [loadEvents]);

  // Search functionality
  const searchEvents = useCallback((query: string) => {
    try {
      const results = calendarService.searchEvents(query, filter);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search events');
      return [];
    }
  }, [filter]);

  // Filter management
  const updateFilter = useCallback((newFilter: Partial<CalendarFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({
      types: [],
      priorities: [],
      statuses: [],
      attendees: [],
      projects: []
    });
  }, []);

  // Statistics
  const statistics = useMemo(() => {
    return calendarService.getStatistics();
    // calendarService's statistics are derived from events internally; recompute
    // whenever events changes even though the callback itself reads no closure var.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  // Get events for specific date
  const getEventsForDate = useCallback((date: Date) => {
    return calendarService.getEventsForDate(date, filter);
  }, [filter]);

  // Utility functions
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  const isCurrentMonth = useCallback((date: Date) => {
    return date.getMonth() === view.date.getMonth() && 
           date.getFullYear() === view.date.getFullYear();
  }, [view.date]);

  return {
    // State
    view,
    events,
    loading,
    error,
    filter,
    statistics,

    // Navigation
    navigateToDate,
    navigatePrevious,
    navigateNext,
    navigateToday,
    changeViewType,

    // Event management
    createEvent,
    updateEvent,
    deleteEvent,
    searchEvents,
    getEventsForDate,

    // Filter management
    updateFilter,
    clearFilter,

    // Utilities
    isToday,
    isCurrentMonth,
    refresh: loadEvents
  };
}

// Helper function to get date range for view
function getDateRange(view: CalendarView): { startDate: Date; endDate: Date } {
  const { type, date } = view;
  let startDate: Date;
  let endDate: Date;

  switch (type) {
    case 'day':
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'week':
      startDate = new Date(date);
      startDate.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'month':
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Include previous month days
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // Include next month days
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'agenda':
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setDate(date.getDate() + 30); // Next 30 days
      endDate.setHours(23, 59, 59, 999);
      break;

    default:
      startDate = new Date(date);
      endDate = new Date(date);
  }

  return { startDate, endDate };
}