import { CalendarService } from '../../../services/calendarService';
import { databaseService } from '../../../services/databaseService';

// Mock database service
jest.mock('../../../services/databaseService');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    calendarService = CalendarService.getInstance();
    calendarService.clearEvents();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes with empty events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.totalEvents).toBe(0);
    });

    it('generates events from tasks and projects', async () => {
      mockDatabaseService.getTasks.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Test Task',
            description: 'Test Description',
            dueDate: new Date().toISOString(),
            priority: 'high',
            status: 'todo',
            createdBy: 'user1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectId: 'project1'
          }
        ],
        total: 1,
        hasMore: false
      });

      mockDatabaseService.getProjects.mockResolvedValue({
        data: [
          {
            id: 'project1',
            name: 'Test Project',
            description: 'Test Description',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            priority: 'medium',
            status: 'active',
            managerId: 'user1',
            teamIds: ['user1', 'user2'],
            color: '#3b82f6'
          }
        ],
        total: 1,
        hasMore: false
      });

      mockDatabaseService.getUsers.mockResolvedValue({
        data: [
          {
            id: 'user1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'developer',
            department: 'Engineering',
            joinDate: new Date().toISOString(),
            isActive: true
          }
        ],
        total: 1,
        hasMore: false
      });

      await calendarService.initialize();

      const stats = calendarService.getStatistics();
      expect(stats.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('event management', () => {
    it('creates new events', () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting' as const,
        priority: 'medium' as const,
        status: 'scheduled' as const,
        color: '#3b82f6',
        createdBy: 'user1'
      };

      const event = calendarService.createEvent(eventData);

      expect(event.id).toBeDefined();
      expect(event.title).toBe(eventData.title);
      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    it('updates existing events', () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting' as const,
        priority: 'medium' as const,
        status: 'scheduled' as const,
        color: '#3b82f6',
        createdBy: 'user1'
      };

      const event = calendarService.createEvent(eventData);
      const updatedEvent = calendarService.updateEvent(event.id, { title: 'Updated Title' });

      expect(updatedEvent?.title).toBe('Updated Title');
      expect(updatedEvent?.updatedAt).not.toBe(event.updatedAt);
    });

    it('deletes events', () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting' as const,
        priority: 'medium' as const,
        status: 'scheduled' as const,
        color: '#3b82f6',
        createdBy: 'user1'
      };

      const event = calendarService.createEvent(eventData);
      const deleted = calendarService.deleteEvent(event.id);

      expect(deleted).toBe(true);
      expect(calendarService.getEventById(event.id)).toBeUndefined();
    });

    it('returns false when deleting non-existent event', () => {
      const deleted = calendarService.deleteEvent('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('event queries', () => {
    beforeEach(() => {
      // Create test events
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      calendarService.createEvent({
        title: 'Today Event',
        startDate: today.toISOString(),
        endDate: today.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'high',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1'
      });

      calendarService.createEvent({
        title: 'Tomorrow Event',
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.toISOString(),
        allDay: true,
        type: 'task',
        priority: 'medium',
        status: 'scheduled',
        color: '#10b981',
        createdBy: 'user1'
      });
    });

    it('gets events for specific date', () => {
      const today = new Date();
      const events = calendarService.getEventsForDate(today);

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Today Event');
    });

    it('gets events in date range', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek);

      expect(events).toHaveLength(2);
    });

    it('filters events by type', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: ['meeting'],
        priorities: [],
        statuses: [],
        attendees: [],
        projects: []
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('meeting');
    });

    it('filters events by priority', () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const events = calendarService.getEventsInRange(today, nextWeek, {
        types: [],
        priorities: ['high'],
        statuses: [],
        attendees: [],
        projects: []
      });

      expect(events).toHaveLength(1);
      expect(events[0].priority).toBe('high');
    });

    it('searches events by title', () => {
      const results = calendarService.searchEvents('Today');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Today Event');
    });

    it('searches events by description', () => {
      calendarService.createEvent({
        title: 'Event with Description',
        description: 'Special meeting description',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'user1'
      });

      const results = calendarService.searchEvents('Special');

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Special');
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Completed event (yesterday)
      calendarService.createEvent({
        title: 'Completed Event',
        startDate: yesterday.toISOString(),
        endDate: yesterday.toISOString(),
        allDay: true,
        type: 'meeting',
        priority: 'high',
        status: 'completed',
        color: '#3b82f6',
        createdBy: 'user1'
      });

      // Upcoming event (tomorrow)
      calendarService.createEvent({
        title: 'Upcoming Event',
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.toISOString(),
        allDay: true,
        type: 'task',
        priority: 'medium',
        status: 'scheduled',
        color: '#10b981',
        createdBy: 'user1'
      });

      // Overdue event (yesterday, still scheduled)
      calendarService.createEvent({
        title: 'Overdue Event',
        startDate: yesterday.toISOString(),
        endDate: yesterday.toISOString(),
        allDay: true,
        type: 'deadline',
        priority: 'critical',
        status: 'scheduled',
        color: '#ef4444',
        createdBy: 'user1'
      });
    });

    it('calculates total events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.totalEvents).toBe(3);
    });

    it('groups events by type', () => {
      const stats = calendarService.getStatistics();
      expect(stats.eventsByType.meeting).toBe(1);
      expect(stats.eventsByType.task).toBe(1);
      expect(stats.eventsByType.deadline).toBe(1);
    });

    it('groups events by status', () => {
      const stats = calendarService.getStatistics();
      expect(stats.eventsByStatus.completed).toBe(1);
      expect(stats.eventsByStatus.scheduled).toBe(2);
    });

    it('counts upcoming events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.upcomingEvents).toBe(1);
    });

    it('counts overdue events', () => {
      const stats = calendarService.getStatistics();
      expect(stats.overdueEvents).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty date ranges', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const events = calendarService.getEventsInRange(today, yesterday);
      expect(events).toHaveLength(0);
    });

    it('handles invalid event updates', () => {
      const result = calendarService.updateEvent('non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('handles empty search queries', () => {
      const results = calendarService.searchEvents('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('handles events spanning multiple days', () => {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 2);

      calendarService.createEvent({
        title: 'Multi-day Event',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allDay: true,
        type: 'project',
        priority: 'medium',
        status: 'scheduled',
        color: '#8b5cf6',
        createdBy: 'user1'
      });

      const middleDate = new Date(startDate);
      middleDate.setDate(startDate.getDate() + 1);

      const events = calendarService.getEventsForDate(middleDate);
      expect(events).toHaveLength(1);
    });
  });
});